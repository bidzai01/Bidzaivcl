// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC ADAPTIVE AI - HỌC TỪ SAI LẦM - SIÊU ỔN ĐỊNH            ║
// ║  Follow Trend + Memory Bank + Smart Recovery                      ║
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

// ==================== THUẬT TOÁN ADAPTIVE (HỌC TỪ SAI LẦM) ====================
class AdaptiveAI {
    constructor() {
        this.history = [];               // { result, total, dice }
        this.consecutiveLosses = 0;
        this.lastPred = null;
        
        // Bộ nhớ tình huống (Memory Bank)
        // Key: mã hash của hoàn cảnh (tổng điểm, xúc xắc, streak)
        // Value: { T: count, X: count }
        this.memoryBank = new Map();
        
        // Danh sách các tình huống đã gây thua (Blacklist Memory)
        // Key: mã hash của hoàn cảnh
        // Value: { lastPred: 'T'|'X', count: số lần thua liên tiếp }
        this.blacklist = new Map();
        
        // Đếm số lần thắng/thua gần đây
        this.recentResults = [];
    }

    addSession(s) {
        this.history.push({
            result: s.ket_qua === 'Tài' ? 'T' : 'X',
            total: s.tong,
            dice: [s.xuc_xac_1, s.xuc_xac_2, s.xuc_xac_3]
        });
        if (this.history.length > MAX_STORED_SESSIONS) this.history.shift();
    }

    // Tạo mã hash cho hoàn cảnh hiện tại
    _getContextHash() {
        const results = this.history.map(h => h.result).reverse();
        const totals = this.history.map(h => h.total).reverse();
        const lastDice = this.history[this.history.length - 1].dice;
        const lastTotal = totals[0];
        
        // Tính streak
        let streak = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === results[0]) streak++;
            else break;
        }
        
        // Phân loại tổng điểm: thấp (3-7), trung bình (8-13), cao (14-18)
        let totalCategory = 'M';
        if (lastTotal <= 7) totalCategory = 'L';
        else if (lastTotal >= 14) totalCategory = 'H';
        
        // Phân loại xúc xắc: có cặp, có bộ ba, hay không
        const [d1, d2, d3] = lastDice;
        let diceCategory = 'N'; // bình thường
        if (d1 === d2 && d2 === d3) diceCategory = 'T'; // triple
        else if (d1 === d2 || d2 === d3 || d1 === d3) diceCategory = 'P'; // pair
        
        // Tạo hash duy nhất
        return `${totalCategory}_${diceCategory}_S${Math.min(streak, 10)}_${results[0]}`;
    }

    // Học từ kết quả thực tế
    _learn(actual) {
        const hash = this._getContextHash();
        const actualTai = actual === 'Tài';
        
        // Cập nhật Memory Bank
        if (!this.memoryBank.has(hash)) {
            this.memoryBank.set(hash, { T: 0, X: 0 });
        }
        const mem = this.memoryBank.get(hash);
        if (actualTai) mem.T++;
        else mem.X++;
        
        // Cập nhật Blacklist nếu thua
        const predTai = this.lastPred === 'Tài';
        const correct = predTai === actualTai;
        
        if (!correct) {
            // Tăng số lần thua liên tiếp cho tình huống này
            if (!this.blacklist.has(hash)) {
                this.blacklist.set(hash, { lastPred: this.lastPred === 'Tài' ? 'T' : 'X', count: 1 });
            } else {
                const bl = this.blacklist.get(hash);
                if (bl.lastPred === (this.lastPred === 'Tài' ? 'T' : 'X')) {
                    bl.count++;
                } else {
                    // Đổi hướng dự đoán cho tình huống này
                    bl.lastPred = this.lastPred === 'Tài' ? 'X' : 'T';
                    bl.count = 1;
                }
            }
        } else {
            // Nếu thắng, xóa tình huống khỏi blacklist
            this.blacklist.delete(hash);
        }
        
        // Giới hạn kích thước bộ nhớ
        if (this.memoryBank.size > 2000) {
            const firstKey = this.memoryBank.keys().next().value;
            this.memoryBank.delete(firstKey);
        }
        if (this.blacklist.size > 500) {
            const firstKey = this.blacklist.keys().next().value;
            this.blacklist.delete(firstKey);
        }
        
        // Cập nhật recentResults
        this.recentResults.push(correct);
        if (this.recentResults.length > 50) this.recentResults.shift();
        
        if (correct) {
            this.consecutiveLosses = 0;
        } else {
            this.consecutiveLosses++;
        }
    }

    predict() {
        if (this.history.length < 10) {
            return { action: 'CÂN NHẮC', prediction: 'Tài', confidence: 51 };
        }

        const results = this.history.map(h => h.result).reverse();
        const totals = this.history.map(h => h.total).reverse();
        const lastDice = this.history[this.history.length - 1].dice;
        const lastTotal = totals[0];
        const hash = this._getContextHash();

        let taiScore = 0, xiuScore = 0;
        const isSafeMode = this.consecutiveLosses >= 3;

        // --- Kiểm tra Blacklist ---
        const bl = this.blacklist.get(hash);
        if (bl && bl.count >= 3) {
            // Tình huống này đã thua ít nhất 3 lần -> làm ngược lại
            if (bl.lastPred === 'T') {
                xiuScore += 100; // Rất mạnh, bắt buộc đổi
            } else {
                taiScore += 100;
            }
        }

        // --- Kiểm tra Memory Bank ---
        const mem = this.memoryBank.get(hash);
        if (mem && (mem.T + mem.X) >= 5) {
            const probT = mem.T / (mem.T + mem.X);
            if (probT >= 0.7) {
                taiScore += 70;
            } else if (probT <= 0.3) {
                xiuScore += 70;
            }
        }

        // --- Tín hiệu mạnh từ tổng điểm ---
        if (lastTotal <= 4) {
            taiScore += 85;
        } else if (lastTotal >= 17) {
            xiuScore += 85;
        }

        // --- Tín hiệu từ xúc xắc ---
        const [d1, d2, d3] = lastDice;
        if (d1 === d2 && d2 === d3) {
            if (d1 >= 4) xiuScore += 80;
            else taiScore += 80;
        }
        if (lastDice.filter(x => x === 1).length >= 2) taiScore += 70;
        if (lastDice.filter(x => x === 6).length >= 2) xiuScore += 70;

        // --- Tín hiệu từ xu hướng ---
        let streak = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === results[0]) streak++;
            else break;
        }

        if (streak >= 5) {
            if (results[0] === 'T') xiuScore += (75 + streak * 2);
            else taiScore += (75 + streak * 2);
        } else if (streak >= 3) {
            if (results[0] === 'T') taiScore += (55 + streak * 3);
            else xiuScore += (55 + streak * 3);
        }

        // Đảo 1-1
        let alt = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) alt++;
            else break;
        }
        if (alt >= 4) {
            if (results[0] === 'T') xiuScore += (60 + alt * 2);
            else taiScore += (60 + alt * 2);
        }

        // --- Phân phối 30 phiên ---
        const recent30 = results.slice(0, 30);
        const countT = recent30.filter(r => r === 'T').length;
        if (countT >= 20) xiuScore += 65;
        else if (countT <= 10) taiScore += 65;

        // --- Safe Mode ---
        if (isSafeMode) {
            taiScore *= 0.6;
            xiuScore *= 0.6;
            const countT50 = results.slice(0, 50).filter(r => r === 'T').length;
            if (countT50 > 30) xiuScore += 50;
            else if (countT50 < 20) taiScore += 50;
        }

        // --- Quyết định cuối cùng ---
        let finalPred;
        let confidence;

        if (taiScore === 0 && xiuScore === 0) {
            finalPred = results[0] === 'T' ? 'X' : 'T';
            confidence = 51;
        } else if (taiScore === xiuScore) {
            const totalT = this.history.filter(h => h.result === 'T').length;
            const totalX = this.history.length - totalT;
            finalPred = totalT > totalX ? 'Tài' : 'Xỉu';
            confidence = 52;
        } else {
            finalPred = taiScore > xiuScore ? 'Tài' : 'Xỉu';
            const maxScore = Math.max(taiScore, xiuScore);
            const totalScore = taiScore + xiuScore;
            confidence = Math.round((maxScore / totalScore) * 100);
            confidence = Math.min(92, Math.max(55, confidence));
        }

        this.lastPred = finalPred;
        return {
            action: confidence >= 65 ? 'ĐẶT' : 'CÂN NHẮC',
            prediction: finalPred,
            confidence: confidence,
            safeMode: isSafeMode,
            memorySize: this.memoryBank.size,
            blacklistSize: this.blacklist.size
        };
    }

    feedback(actual) {
        this._learn(actual);
    }

    getStats() {
        const recentAcc = this.recentResults.length > 0
            ? (this.recentResults.filter(r => r).length / this.recentResults.length * 100).toFixed(1) + '%'
            : '0%';
        return {
            totalHistory: this.history.length,
            consecutiveLosses: this.consecutiveLosses,
            recentAccuracy: recentAcc,
            memoryBankSize: this.memoryBank.size,
            blacklistSize: this.blacklist.size
        };
    }
    
    saveState() {
        const memObj = {};
        for (const [key, value] of this.memoryBank) {
            memObj[key] = value;
        }
        const blObj = {};
        for (const [key, value] of this.blacklist) {
            blObj[key] = value;
        }
        return {
            memoryBank: memObj,
            blacklist: blObj,
            consecutiveLosses: this.consecutiveLosses,
            recentResults: this.recentResults
        };
    }
    
    loadState(state) {
        if (state) {
            if (state.memoryBank) {
                this.memoryBank = new Map(Object.entries(state.memoryBank));
            }
            if (state.blacklist) {
                this.blacklist = new Map(Object.entries(state.blacklist));
            }
            this.consecutiveLosses = state.consecutiveLosses || 0;
            this.recentResults = state.recentResults || [];
        }
    }
}

// ==================== 3. SERVER ====================
const predictorHU  = new AdaptiveAI();
const predictorMD5 = new AdaptiveAI();
let predictionHistory = { hu: [], md5: [] };
let pendingPrediction  = { hu: null, md5: null };

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

    const lrn = loadJSON(LEARNING_FILE, {});
    if (lrn.hu) predictorHU.loadState(lrn.hu);
    if (lrn.md5) predictorMD5.loadState(lrn.md5);

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
    saveJSON(LEARNING_FILE, { hu: predictorHU.saveState(), md5: predictorMD5.saveState() });
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
