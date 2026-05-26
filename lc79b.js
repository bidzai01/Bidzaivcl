// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC MASTER AI - ADAPTIVE ENSEMBLE - SIÊU CHUẨN XÁC         ║
// ║  Tự động chọn lọc pattern mạnh - Chống gãy thông minh            ║
// ╚══════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== CẤU HÌNH ====================
const API_URL_HU  = 'https://wtx.tele68.com/v1/tx/sessions';
const API_URL_MD5 = 'https://wtxmd52.tele68.com/v1/txmd5/sessions';
const SESSIONS_FILE  = path.join(__dirname, 'vuaoccac_sessions.json');
const LEARNING_FILE  = path.join(__dirname, 'vuaoccac_learning.json');
const HISTORY_FILE   = path.join(__dirname, 'vuaoccac_history.json');

const MIN_SESSIONS       = 100;
const FETCH_PER_REQUEST  = 100;
const FETCH_INTERVAL     = 2000;
const AUTO_SAVE_INTERVAL = 30000;
const MAX_STORED_SESSIONS = 10000;

const RECENT_WINDOW       = 30;   // Số phiên gần nhất để đánh giá pattern
const STRONG_TREND        = 5;    // Ngưỡng bệt mạnh
const SAFE_MODE_LOSSES    = 3;    // Số lần thua liên tiếp để vào chế độ an toàn
const MIN_ACCURACY        = 0.45; // Tỉ lệ thắng tối thiểu gần đây

// ==================== 1. CÁC HÀM PHÂN TÍCH CƠ BẢN ====================
function predictMarkov(seq) {
    if (seq.length < 4) return null;
    let best = null, bestConf = 0;
    for (let order = 3; order <= Math.min(5, seq.length - 1); order++) {
        const last = seq.slice(-order);
        const trans = {};
        for (let i = 0; i <= seq.length - order - 1; i++) {
            const pat = seq.slice(i, i + order);
            const next = seq[i + order];
            if (!trans[pat]) trans[pat] = { T: 0, X: 0 };
            trans[pat][next]++;
        }
        const possible = trans[last];
        if (!possible) continue;
        const total = possible.T + possible.X;
        const probTai = possible.T / total;
        const conf = (Math.max(possible.T, possible.X) / total) * 100;
        if (conf > bestConf) { bestConf = conf; best = probTai > 0.5 ? "T" : "X"; }
    }
    return best ? { prediction: best, confidence: Math.round(bestConf) } : null;
}

function predictWeightedFrequency(history, window = 50) {
    const recent = history.slice(-window);
    let wTai = 0, wXiu = 0;
    for (let i = 0; i < recent.length; i++) {
        const w = Math.pow(0.93, recent.length - 1 - i);
        if (recent[i].result === "Tài") wTai += w; else wXiu += w;
    }
    if (wTai + wXiu === 0) return null;
    const probTai = wTai / (wTai + wXiu);
    return { prediction: probTai > 0.5 ? "Tài" : "Xỉu", confidence: Math.min(95, Math.max(50, Math.round(Math.abs(probTai - 0.5) * 2 * 100))) };
}

function predictStreak(history) {
    if (history.length < 5) return null;
    let streakLen = 1;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === history[history.length - 1].result) streakLen++; else break;
    }
    if (streakLen >= 3) return { prediction: history[history.length - 1].result === "Tài" ? "Xỉu" : "Tài", confidence: Math.min(85, 60 + streakLen * 4) };
    if (streakLen <= 2) return { prediction: history[history.length - 1].result, confidence: Math.min(75, 55 + streakLen * 5) };
    return null;
}

function predictFibonacciByTotal(history) {
    if (history.length < 12) return null;
    const totals = history.slice(-12).map(h => h.total);
    const diffs = [];
    for (let i = 1; i < totals.length; i++) diffs.push(totals[i] - totals[i - 1]);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    let nextTotal = totals[totals.length - 1] + avgDiff;
    nextTotal = Math.min(18, Math.max(3, Math.round(nextTotal)));
    return { prediction: nextTotal > 10 ? "Tài" : "Xỉu", confidence: Math.min(85, 55 + Math.min(30, Math.abs(avgDiff) * 2.5)) };
}

function rsiPredict(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    let gains = 0, losses = 0;
    for (let i = 1; i < nums.length; i++) { const diff = nums[i] - nums[i - 1]; if (diff > 0) gains += diff; else losses -= diff; }
    const avgGain = gains / period, avgLoss = losses / period;
    if (avgLoss === 0) return 'T';
    const rsi = 100 - (100 / (1 + avgGain / avgLoss));
    if (rsi > 75) return history[history.length - 1] === 'T' ? 'X' : 'T';
    if (rsi < 25) return history[history.length - 1] === 'T' ? 'X' : 'T';
    if (rsi > 65) return 'X'; if (rsi < 35) return 'T';
    return null;
}

function decisionTree(history) {
    if (history.length < 10) return null;
    const last1 = history[history.length - 1], last2 = history.length > 1 ? history[history.length - 2] : null, last3 = history.length > 2 ? history[history.length - 3] : null;
    const t5 = history.slice(-5).filter(c => c === 'T').length;
    if (last1 === 'T' && last2 === 'T' && last3 === 'T') return 'X';
    if (last1 === 'X' && last2 === 'X' && last3 === 'X') return 'T';
    if (t5 >= 4) return 'X'; if (t5 <= 1) return 'T';
    return last1;
}

const PatternDetectors = {
    detect_1_1: (history) => {
        if (history.length >= 4 && history.slice(-4).join('') === "TXTX") return { pred: 'X', conf: 88, name: "Cầu 1-1" };
        if (history.length >= 4 && history.slice(-4).join('') === "XTXT") return { pred: 'T', conf: 88, name: "Cầu 1-1" };
        return null;
    },
    detect_2_2: (history) => {
        if (history.length >= 4 && history.slice(-4).join('') === "TTXX") return { pred: 'X', conf: 82, name: "Cầu 2-2" };
        if (history.length >= 4 && history.slice(-4).join('') === "XXTT") return { pred: 'T', conf: 82, name: "Cầu 2-2" };
        return null;
    },
    detect_3_3: (history) => {
        if (history.length >= 6 && history.slice(-6).join('') === "TTTXXX") return { pred: 'X', conf: 78, name: "Cầu 3-3" };
        if (history.length >= 6 && history.slice(-6).join('') === "XXXTTT") return { pred: 'T', conf: 78, name: "Cầu 3-3" };
        return null;
    },
    detect_dragon: (history) => {
        let tRun = 0;
        for (let i = history.length - 1; i >= 0; i--) { if (history[i] === 'T') tRun++; else break; }
        if (tRun >= 6) return { pred: 'X', conf: 82, name: `Rồng ${tRun}` };
        if (tRun >= 4) return { pred: 'T', conf: 72, name: `Rồng ${tRun}` };
        return null;
    },
    detect_tiger: (history) => {
        let xRun = 0;
        for (let i = history.length - 1; i >= 0; i--) { if (history[i] === 'X') xRun++; else break; }
        if (xRun >= 6) return { pred: 'T', conf: 82, name: `Hổ ${xRun}` };
        if (xRun >= 4) return { pred: 'X', conf: 72, name: `Hổ ${xRun}` };
        return null;
    },
    detect_day_gay: (history) => {
        let streak = 1;
        const first = history[history.length - 1];
        for (let i = history.length - 2; i >= 0; i--) {
            if (history[i] === first) streak++; else break;
        }
        if (streak >= 5 && history[history.length - streak] && history[history.length - streak] !== first) {
            return { pred: history[history.length - streak], conf: 70 + streak, name: `Dây gãy ${streak}` };
        }
        return null;
    }
};

// ==================== 2. LỚP DỰ ĐOÁN CHÍNH (MASTER PREDICTOR) ====================
class MasterPredictor {
    constructor() {
        this.history = [];               // { result, total, dice }
        this.patterns = {};              // id -> { recent: { correct, total }, global: { correct, total } }
        this.recentResults = [];         // kết quả đúng/sai 30 phiên gần nhất
        this.consecutiveLosses = 0;
        this.safeMode = false;
        this.threshold = 55;             // ngưỡng confidence tối thiểu
        this.lastPred = null;
        this.lastPatterns = [];
    }

    addSession(session) {
        const result = session.ket_qua === 'Tài' ? 'T' : 'X';
        this.history.push({
            result,
            total: session.tong,
            dice: [session.xuc_xac_1, session.xuc_xac_2, session.xuc_xac_3]
        });
        if (this.history.length > MAX_STORED_SESSIONS) this.history.shift();
    }

    _getResults() {
        return this.history.map(h => h.result).reverse();
    }

    _getPatternScore(id) {
        const perf = this.patterns[id];
        if (!perf || !perf.recent || perf.recent.total < 5) {
            // Nếu chưa có recent, dùng global hoặc trả về điểm mặc định
            if (perf && perf.global && perf.global.total >= 10) {
                return perf.global.correct / perf.global.total;
            }
            return 1.0; // mặc định
        }
        const recentAcc = perf.recent.correct / perf.recent.total;
        if (recentAcc < 0.4) return 0; // loại bỏ nếu gần đây quá kém
        // Kết hợp global (nếu có) với tỉ lệ 70% recent, 30% global
        if (perf.global && perf.global.total >= 10) {
            const globalAcc = perf.global.correct / perf.global.total;
            return recentAcc * 0.7 + globalAcc * 0.3;
        }
        return recentAcc;
    }

    _collectSignals() {
        const R = this._getResults();
        const data = this.history.slice().reverse();
        const lastDice = this.history.length > 0 ? this.history[this.history.length - 1].dice : [0,0,0];
        const lastTotal = data[0]?.total || 0;
        const signals = [];

        const add = (pred, conf, id, name) => {
            const effectiveThreshold = this.safeMode ? 70 : this.threshold;
            if (conf >= effectiveThreshold) {
                const score = this._getPatternScore(id);
                if (score === 0) return;
                signals.push({ pred, conf, weight: score, id, name });
            }
        };

        // 1. Tín hiệu mạnh từ tổng điểm
        if (lastTotal <= 4) add('T', 82, 'score_low', `Tổng ${lastTotal} → Tài`);
        if (lastTotal >= 17) add('X', 80, 'score_high', `Tổng ${lastTotal} → Xỉu`);

        // 2. Xúc xắc đặc biệt
        const [d1, d2, d3] = lastDice;
        if (d1 === d2 && d2 === d3) {
            const pred = d1 >= 4 ? 'X' : 'T';
            add(pred, 72, 'triple', `3 mặt ${d1}`);
        }
        if (lastDice.filter(x => x === 1).length >= 2) add('T', 70, 'pair1', 'Cặp 1 → Tài');
        if (lastDice.filter(x => x === 6).length >= 2) add('X', 68, 'pair6', 'Cặp 6 → Xỉu');

        // 3. Bệt
        let streak = 1;
        for (let i = 1; i < R.length; i++) { if (R[i] === R[0]) streak++; else break; }
        if (streak >= STRONG_TREND) {
            // Xu hướng mạnh: theo bệt
            add(R[0], 78, 'strong_trend', `Bệt ${streak} → Tiếp`);
            // Cũng thêm tín hiệu gãy nhưng trọng số thấp hơn
            add(R[0] === 'T' ? 'X' : 'T', 65, 'trend_reversal', `Bệt ${streak} → Gãy?`);
        } else if (streak >= 2) {
            if (streak <= 3) add(R[0], 60, 'bet_short', `Bệt ${streak} → Tiếp`);
            else if (streak <= 5) {
                const shouldBreak = streak >= 5;
                add(shouldBreak ? (R[0] === 'T' ? 'X' : 'T') : R[0], shouldBreak ? 68 : 64, 'bet_mid', `Bệt ${streak} → ${shouldBreak ? 'Gãy' : 'Tiếp'}`);
            } else {
                add(R[0] === 'T' ? 'X' : 'T', 75 + streak, 'bet_long', `Bệt ${streak} → Gãy`);
            }
        }

        // 4. Cầu 1-1
        let alt = 1;
        for (let i = 1; i < R.length; i++) { if (R[i] !== R[i-1]) alt++; else break; }
        if (alt >= 4 && alt <= 6) add(R[0] === 'T' ? 'X' : 'T', 62 + alt, 'c11', `Cầu 1-1 (${alt})`);
        else if (alt >= 7) add(R[0] === 'T' ? 'X' : 'T', 70 + alt, 'c11_long', `Cầu 1-1 DÀI (${alt})`);

        // 5. Rồng, Hổ, Dây gãy
        if (streak >= 6) add(R[0] === 'T' ? 'X' : 'T', 75 + streak, 'rong', `Rồng ${streak} → GÃY`);
        if (streak >= 5 && R[streak] && R[streak] !== R[0]) add(R[streak], 70 + streak, 'daygay', `Dây gãy ${streak} → Theo mới`);

        // 6. Pattern detectors
        for (const [name, detector] of Object.entries(PatternDetectors)) {
            const res = detector(R);
            if (res) add(res.pred, res.conf, 'pattern_' + name, res.name);
        }

        // 7. Thuật toán bổ sung
        const histObj = data.map(d => ({ result: d.result, total: d.total, dice: d.dice }));
        const seq = R.join('');

        const markovRes = predictMarkov(seq);
        if (markovRes) add(markovRes.prediction === 'T' ? 'T' : 'X', markovRes.confidence, 'markov', 'Markov');

        const freqRes = predictWeightedFrequency(histObj);
        if (freqRes) add(freqRes.prediction === 'Tài' ? 'T' : 'X', freqRes.confidence, 'weighted_freq', 'Tần suất');

        const streakRes = predictStreak(histObj);
        if (streakRes) add(streakRes.prediction === 'Tài' ? 'T' : 'X', streakRes.confidence, 'streak', 'Streak');

        const fibRes = predictFibonacciByTotal(histObj);
        if (fibRes) add(fibRes.prediction === 'Tài' ? 'T' : 'X', fibRes.confidence, 'fibonacci', 'Fibonacci');

        const rsiRes = rsiPredict(R);
        if (rsiRes) add(rsiRes, 65, 'rsi', 'RSI');

        const dtRes = decisionTree(R);
        if (dtRes) add(dtRes, 60, 'decision_tree', 'Decision Tree');

        // Nếu không có tín hiệu, dùng cầu tự nhiên an toàn
        if (signals.length === 0) {
            const naturalPred = R[0] === 'T' ? 'X' : 'T';
            add(naturalPred, 51, 'cau_tu_nhien', 'Cầu tự nhiên');
        }

        // Sắp xếp tín hiệu theo điểm (weight * confidence) giảm dần, lấy top 7
        signals.sort((a, b) => (b.conf * b.weight) - (a.conf * a.weight));
        return signals.slice(0, 7);
    }

    predict() {
        if (this.history.length < 10) {
            const last = this.history[this.history.length - 1];
            const pred = last ? (last.result === 'T' ? 'Xỉu' : 'Tài') : 'Tài';
            return { action: 'CÂN NHẮC', prediction: pred, confidence: 51 };
        }

        // Kiểm tra safe mode
        this.safeMode = this.consecutiveLosses >= SAFE_MODE_LOSSES;

        const signals = this._collectSignals();
        if (signals.length === 0) {
            const last = this.history[this.history.length - 1].result;
            return { action: 'CÂN NHẮC', prediction: last === 'T' ? 'Xỉu' : 'Tài', confidence: 51 };
        }

        let sT = 0, sX = 0;
        signals.forEach(s => {
            if (s.pred === 'T') sT += s.conf * s.weight;
            else sX += s.conf * s.weight;
        });

        // Chống kẹt 50%
        if (sT === sX && sT === 0) {
            sT = 0.001; sX = 0;
        } else if (sT === sX) {
            const totalT = this.history.filter(h => h.result === 'T').length;
            const totalX = this.history.length - totalT;
            if (totalT > totalX) sT += 0.001; else sX += 0.001;
        }

        const pred = sT >= sX ? 'Tài' : 'Xỉu';
        let conf = Math.round(Math.max(sT, sX) / (sT + sX) * 100);
        conf = Math.max(51, Math.min(92, conf));

        this.lastPred = pred;
        this.lastPatterns = signals.map(s => s.id);

        return {
            action: conf >= 65 ? 'ĐẶT' : 'CÂN NHẮC',
            prediction: pred,
            confidence: conf,
            safeMode: this.safeMode
        };
    }

    feedback(actual) {
        const predictedTai = this.lastPred === 'Tài';
        const actualTai = actual === 'Tài';
        const correct = predictedTai === actualTai;

        // Cập nhật recent results
        this.recentResults.push(correct);
        if (this.recentResults.length > RECENT_WINDOW) this.recentResults.shift();

        // Cập nhật streak
        if (correct) {
            this.consecutiveLosses = 0;
            this.safeMode = false;
        } else {
            this.consecutiveLosses++;
        }

        // Cập nhật hiệu suất pattern
        this.lastPatterns.forEach(id => {
            if (!this.patterns[id]) {
                this.patterns[id] = { recent: { correct: 0, total: 0 }, global: { correct: 0, total: 0 } };
            }
            const p = this.patterns[id];
            // Global
            p.global.total++;
            if (correct) p.global.correct++;
            // Recent (giới hạn cửa sổ)
            if (p.recent.total >= RECENT_WINDOW) {
                // Reset recent để chỉ giữ dữ liệu mới
                p.recent = { correct: 0, total: 0 };
            }
            p.recent.total++;
            if (correct) p.recent.correct++;
        });

        // Điều chỉnh threshold động
        if (this.recentResults.length >= 10) {
            const recentAcc = this.recentResults.filter(r => r).length / this.recentResults.length;
            this.threshold = recentAcc > 0.6 ? 52 : recentAcc < 0.45 ? 60 : 55;
        }
    }

    getStats() {
        const recentAcc = this.recentResults.length > 0
            ? (this.recentResults.filter(r => r).length / this.recentResults.length * 100).toFixed(1) + '%'
            : '0%';
        return {
            totalHistory: this.history.length,
            activePatterns: Object.keys(this.patterns).length,
            recentAccuracy: recentAcc,
            consecutiveLosses: this.consecutiveLosses,
            safeMode: this.safeMode,
            threshold: this.threshold
        };
    }
}

// ==================== 3. SERVER ====================
const predictorHU = new MasterPredictor();
const predictorMD5 = new MasterPredictor();
let predictionHistory = { hu: [], md5: [] };
let pendingPrediction = { hu: null, md5: null };

function loadJSON(filename, defaultValue) {
    try { if (fs.existsSync(filename)) return JSON.parse(fs.readFileSync(filename, 'utf8')); }
    catch (e) { console.error(`Lỗi load ${filename}:`, e.message); }
    return defaultValue;
}

function saveJSON(filename, data) {
    try { fs.writeFileSync(filename, JSON.stringify(data, null, 2)); }
    catch (e) { console.error(`Lỗi save ${filename}:`, e.message); }
}

let sessionsStore;
let isReady = { hu: false, md5: false };

async function initializeData() {
    sessionsStore = loadJSON(SESSIONS_FILE, { hu: [], md5: [] });
    const load = (pred, arr) => {
        arr.slice().reverse().forEach(s => pred.addSession({
            ket_qua: s.Ket_qua, tong: s.Tong,
            xuc_xac_1: s.Xuc_xac_1, xuc_xac_2: s.Xuc_xac_2, xuc_xac_3: s.Xuc_xac_3,
            thoi_gian: s.Thoi_gian || new Date().toISOString()
        }));
    };
    load(predictorHU, sessionsStore.hu);
    load(predictorMD5, sessionsStore.md5);

    predictionHistory = loadJSON(HISTORY_FILE, { hu: [], md5: [] });
    console.log(`✅ Dữ liệu đã tải - HU: ${sessionsStore.hu.length}, MD5: ${sessionsStore.md5.length}`);
}

function transformApiData(apiData) {
    if (!apiData?.list?.length) return null;
    return apiData.list.map(item => ({
        Phien: item.id,
        Ket_qua: item.resultTruyenThong === 'TAI' ? 'Tài' : 'Xỉu',
        Xuc_xac_1: item.dices[0], Xuc_xac_2: item.dices[1], Xuc_xac_3: item.dices[2],
        Tong: item.point, Thoi_gian: item.time || new Date().toISOString()
    }));
}

async function fetchData(url) {
    try {
        const resp = await axios.get(url, { timeout: 15000, params: { limit: FETCH_PER_REQUEST } });
        return transformApiData(resp.data);
    } catch (e) { console.error(`❌ Fetch lỗi:`, e.message); return null; }
}

function mergeSessions(existing, newData) {
    if (!newData?.length) return { sessions: existing, added: [] };
    const ids = new Set(existing.map(s => s.Phien));
    const added = newData.filter(s => !ids.has(s.Phien));
    existing.unshift(...added);
    existing.sort((a, b) => b.Phien - a.Phien);
    if (existing.length > MAX_STORED_SESSIONS) existing = existing.slice(0, MAX_STORED_SESSIONS);
    return { sessions: existing, added };
}

async function accumulateSession(type, predictor, url) {
    const nd = await fetchData(url);
    if (!nd) return;
    const res = mergeSessions(sessionsStore[type], nd);
    sessionsStore[type] = res.sessions;
    res.added.sort((a, b) => a.Phien - b.Phien).forEach(s => predictor.addSession({
        ket_qua: s.Ket_qua, tong: s.Tong, xuc_xac_1: s.Xuc_xac_1, xuc_xac_2: s.Xuc_xac_2, xuc_xac_3: s.Xuc_xac_3, thoi_gian: s.Thoi_gian
    }));
    if (res.added.length > 0) { console.log(`📥 [${type}] +${res.added.length}`); saveAllData(); }
    if (sessionsStore[type].length >= MIN_SESSIONS && !isReady[type]) { isReady[type] = true; console.log(`🎉 [${type}] sẵn sàng`); }
}

function predictAndRecord(type, predictor) {
    if (pendingPrediction[type]) return pendingPrediction[type];
    if (sessionsStore[type].length === 0) return null;
    const latest = sessionsStore[type][0].Phien;
    const next = latest + 1;
    const result = predictor.predict();
    if (!result || result.action === 'BỎ QUA') return null;
    const entry = { phien: next, du_doan: result.prediction.toLowerCase(), ket_qua: null, danh_gia: null };
    predictionHistory[type].unshift(entry);
    if (predictionHistory[type].length > 100) predictionHistory[type] = predictionHistory[type].slice(0, 100);
    pendingPrediction[type] = { nextPhien: next, prediction: result.prediction, confidence: result.confidence, entry };
    return pendingPrediction[type];
}

function updateActualResults(type, predictor) {
    const data = sessionsStore[type];
    if (!data || !data.length) return;
    for (let i = 0; i < predictionHistory[type].length; i++) {
        const entry = predictionHistory[type][i];
        if (entry.ket_qua !== null && entry.ket_qua !== undefined && entry.ket_qua !== '') continue;
        const actualSession = data.find(s => s.Phien === entry.phien);
        if (!actualSession) continue;
        entry.ket_qua = actualSession.Ket_qua.toLowerCase();
        const duDoan = entry.du_doan ? entry.du_doan.toLowerCase().trim() : '';
        const ketQua = entry.ket_qua ? entry.ket_qua.toLowerCase().trim() : '';
        entry.danh_gia = (duDoan === ketQua) ? 'thang' : 'thua';
        predictor.feedback(actualSession.Ket_qua);
        if (pendingPrediction[type] && pendingPrediction[type].entry === entry) pendingPrediction[type] = null;
    }
    if (predictionHistory[type].length > 100) predictionHistory[type] = predictionHistory[type].slice(0, 100);
}

function saveAllData() {
    saveJSON(SESSIONS_FILE, sessionsStore);
    saveJSON(HISTORY_FILE, predictionHistory);
    saveJSON(LEARNING_FILE, {});
}

app.get('/lc79-hu', async (req, res) => {
    await accumulateSession('hu', predictorHU, API_URL_HU);
    if (!isReady.hu) return res.json({ status: 'accumulating', progress: `${sessionsStore.hu.length}/${MIN_SESSIONS}` });
    updateActualResults('hu', predictorHU);
    let pred = predictAndRecord('hu', predictorHU) || { nextPhien: (sessionsStore.hu[0]?.Phien || 0) + 1, prediction: 'Tài', confidence: 51 };
    const latestSession = sessionsStore.hu[0] || {};
    const stats = predictorHU.getStats();
    const recentHistory = predictionHistory.hu.filter(e => e.ket_qua !== null).slice(0, 10).map(e => ({ phien: e.phien, du_doan: e.du_doan, ket_qua: e.ket_qua, danh_gia: e.danh_gia }));
    res.json({ phien_truoc: { Phien: latestSession.Phien, Xuc_xac_1: latestSession.Xuc_xac_1, Xuc_xac_2: latestSession.Xuc_xac_2, Xuc_xac_3: latestSession.Xuc_xac_3, Tong: latestSession.Tong, Ket_qua: latestSession.Ket_qua }, phien_hien_tai: { Phien: pred.nextPhien, Du_doan: pred.prediction, Do_tin_cay: `${pred.confidence}%` }, id: '@vuaoccac', stats, win_loss_table: recentHistory, full_history_count: predictionHistory.hu.length });
});

app.get('/lc79-md5', async (req, res) => {
    await accumulateSession('md5', predictorMD5, API_URL_MD5);
    if (!isReady.md5) return res.json({ status: 'accumulating', progress: `${sessionsStore.md5.length}/${MIN_SESSIONS}` });
    updateActualResults('md5', predictorMD5);
    let pred = predictAndRecord('md5', predictorMD5) || { nextPhien: (sessionsStore.md5[0]?.Phien || 0) + 1, prediction: 'Tài', confidence: 51 };
    const latestSession = sessionsStore.md5[0] || {};
    const stats = predictorMD5.getStats();
    const recentHistory = predictionHistory.md5.filter(e => e.ket_qua !== null).slice(0, 10).map(e => ({ phien: e.phien, du_doan: e.du_doan, ket_qua: e.ket_qua, danh_gia: e.danh_gia }));
    res.json({ phien_truoc: { Phien: latestSession.Phien, Xuc_xac_1: latestSession.Xuc_xac_1, Xuc_xac_2: latestSession.Xuc_xac_2, Xuc_xac_3: latestSession.Xuc_xac_3, Tong: latestSession.Tong, Ket_qua: latestSession.Ket_qua }, phien_hien_tai: { Phien: pred.nextPhien, Du_doan: pred.prediction, Do_tin_cay: `${pred.confidence}%` }, id: '@vuaoccac', stats, win_loss_table: recentHistory, full_history_count: predictionHistory.md5.length });
});

app.get('/lc79-hu/history', (req, res) => { updateActualResults('hu', predictorHU); res.json(predictionHistory.hu); });
app.get('/lc79-md5/history', (req, res) => { updateActualResults('md5', predictorMD5); res.json(predictionHistory.md5); });
app.get('/status', (req, res) => res.json({ hu: { sessions: sessionsStore?.hu?.length || 0, ready: isReady.hu, stats: predictorHU.getStats() }, md5: { sessions: sessionsStore?.md5?.length || 0, ready: isReady.md5, stats: predictorMD5.getStats() } }));

async function main() {
    await initializeData();
    isReady.hu = sessionsStore.hu.length >= MIN_SESSIONS;
    isReady.md5 = sessionsStore.md5.length >= MIN_SESSIONS;
    console.log(`HU: ${isReady.hu ? 'Sẵn sàng' : 'Tích luỹ'}, MD5: ${isReady.md5 ? 'Sẵn sàng' : 'Tích luỹ'}`);
    if (!isReady.hu || !isReady.md5) {
        while (!isReady.hu || !isReady.md5) {
            const tasks = [];
            if (!isReady.hu) tasks.push(accumulateSession('hu', predictorHU, API_URL_HU));
            if (!isReady.md5) tasks.push(accumulateSession('md5', predictorMD5, API_URL_MD5));
            await Promise.all(tasks);
            if (!isReady.hu || !isReady.md5) {
                console.log(`Tiến độ: HU=${sessionsStore.hu.length}/${MIN_SESSIONS} MD5=${sessionsStore.md5.length}/${MIN_SESSIONS}`);
                await new Promise(r => setTimeout(r, FETCH_INTERVAL));
            }
        }
    }
    setInterval(async () => {
        await accumulateSession('hu', predictorHU, API_URL_HU);
        await accumulateSession('md5', predictorMD5, API_URL_MD5);
        updateActualResults('hu', predictorHU);
        updateActualResults('md5', predictorMD5);
        saveAllData();
    }, AUTO_SAVE_INTERVAL);
}

app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 VuaOcCac AI chạy tại cổng ${PORT}`); main(); });
