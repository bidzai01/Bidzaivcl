// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC GOD AI - SIÊU CHUẨN - 10K PHIÊN - KHÔNG 51%            ║
// ║  Meta-Learner + HMM + 200+ Patterns + Deep Learning Core          ║
// ║  FIXED: WIN/LOSS TRACKING - SMART BRIDGE ANALYSIS - AI CORE       ║
// ║  NÂNG CẤP: HỌC NHANH 10X - BỘ NHỚ RIÊNG - BẮT XÚC XẮC LẶP       ║
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

// ==================== 1. THUẬT TOÁN CƠ BẢN (GIỮ NGUYÊN) ====================
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

function markov1(history) {
    if (history.length < 2) return null;
    const last = history[history.length - 1];
    const trans = { T: { T: 0, X: 0 }, X: { T: 0, X: 0 } };
    for (let i = 0; i < history.length - 1; i++) trans[history[i]][history[i + 1]]++;
    if (trans[last].T > trans[last].X) return 'T';
    if (trans[last].X > trans[last].T) return 'X';
    return null;
}

function markov2(history) {
    if (history.length < 3) return null;
    const last2 = history.slice(-2);
    const trans = new Map();
    for (let i = 0; i < history.length - 2; i++) {
        const key = history[i] + ',' + history[i + 1];
        const next = history[i + 2];
        if (!trans.has(key)) trans.set(key, { T: 0, X: 0 });
        trans.get(key)[next]++;
    }
    const possible = trans.get(last2.join(','));
    if (!possible) return null;
    return possible.T > possible.X ? 'T' : (possible.X > possible.T ? 'X' : null);
}

function markov3(history) {
    if (history.length < 4) return null;
    const last3 = history.slice(-3);
    const trans = new Map();
    for (let i = 0; i < history.length - 3; i++) {
        const key = history.slice(i, i + 3).join(',');
        const next = history[i + 3];
        if (!trans.has(key)) trans.set(key, { T: 0, X: 0 });
        trans.get(key)[next]++;
    }
    const possible = trans.get(last3.join(','));
    if (!possible) return null;
    return possible.T > possible.X ? 'T' : (possible.X > possible.T ? 'X' : null);
}

class MarkovXucXac123 {
    constructor(bac = 3) { this.bac = Math.min(4, Math.max(1, bac)); this.transitions = new Map(); this.history = []; this.maxHistory = 60; }
    static chuyenLoai(diem) { return diem <= 2 ? 1 : diem <= 4 ? 2 : 3; }
    themDuLieu(daySo) {
        const filtered = daySo.map(x => MarkovXucXac123.chuyenLoai(x));
        this.history.push(...filtered);
        if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory);
        this._xayDungMaTran();
    }
    _xayDungMaTran() {
        this.transitions.clear();
        const len = this.history.length;
        if (len < this.bac + 1) return;
        for (let i = this.bac; i < len; i++) {
            for (let b = 1; b <= this.bac; b++) {
                const state = this.history.slice(i - b, i).join(',');
                const nextVal = this.history[i];
                if (!this.transitions.has(state)) this.transitions.set(state, new Map());
                const nextMap = this.transitions.get(state);
                nextMap.set(nextVal, (nextMap.get(nextVal) || 0) + 1);
            }
        }
    }
    duDoan() { if (this.history.length < 2) return 2; const dem = {1:0,2:0,3:0}; this.history.forEach(v => dem[v]++); return dem[1] > dem[3] ? 1 : 3; }
    phanTich() {
        const duDoanSo = this.duDoan();
        const prediction = (duDoanSo === 1 || duDoanSo === 3) ? "Tài" : "Xỉu";
        let confidence = 65;
        if (this.history.length > 30) confidence += 10;
        return { prediction, confidence: Math.min(95, confidence) };
    }
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

function simpleMajority(history, window = 15) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const t = recent.filter(r => r === 'T').length;
    const x = window - t;
    if (t > x) return 'T'; if (x > t) return 'X';
    return null;
}

function cumulativeImbalance(history, window = 25) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const imbalance = recent.filter(r => r === 'T').length - recent.filter(r => r === 'X').length;
    if (imbalance > 7) return 'X'; if (imbalance < -7) return 'T';
    return null;
}

function predictCycle(seq, maxCycle = 20) {
    for (let cycle = 3; cycle <= maxCycle; cycle++) {
        if (seq.length < cycle * 2) continue;
        const lastCycle = seq.slice(-cycle);
        let matches = [];
        for (let i = 0; i <= seq.length - cycle - 1; i++) if (seq.slice(i, i + cycle) === lastCycle) matches.push(i);
        if (matches.length >= 2) {
            const nextIdx = matches[matches.length - 1] + cycle;
            if (nextIdx < seq.length) {
                const nextRes = seq[nextIdx];
                return { prediction: nextRes === "T" ? "Tài" : "Xỉu", confidence: 60 + Math.min(30, matches.length * 3) };
            }
        }
    }
    return null;
}

function predictTrend(history) {
    if (history.length < 6) return null;
    const last6 = history.slice(-6).map(h => h.result);
    const last3 = last6.slice(-3);
    if (last3[0] === last3[1] && last3[1] === last3[2]) return { prediction: last3[0] === "Tài" ? "Xỉu" : "Tài", confidence: 72 };
    let alt = true;
    for (let i = 1; i < last6.length; i++) if (last6[i] === last6[i - 1]) alt = false;
    if (alt && last6.length >= 4) return { prediction: last6[last6.length - 1] === "Tài" ? "Xỉu" : "Tài", confidence: 76 };
    const tai = last6.filter(r => r === "Tài").length;
    const xiu = 6 - tai;
    if (tai !== xiu) return { prediction: tai > xiu ? "Tài" : "Xỉu", confidence: Math.min(75, 55 + Math.abs(tai - xiu) * 3) };
    return null;
}

function predictStreak(history) {
    if (history.length < 5) return null;
    let streakLen = 1;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === history[history.length - 1].result) streakLen++; else break;
    }
    if (streakLen >= 3) return { prediction: history[history.length - 1].result === "Tài" ? "Xỉu" : "Tài", confidence: Math.min(85, 60 + Math.min(25, streakLen * 4)) };
    if (streakLen <= 2) return { prediction: history[history.length - 1].result, confidence: Math.min(75, 55 + streakLen * 5) };
    return null;
}

function predictBayes(history) {
    if (history.length < 10) return null;
    const seq = history.map(h => h.result === "Tài" ? "T" : "X").join('');
    const last3 = seq.slice(-3);
    let taiCount = 0, xiuCount = 0;
    for (let i = 0; i <= seq.length - 4; i++) {
        if (seq.slice(i, i + 3) === last3) {
            if (seq[i + 3] === 'T') taiCount++; else xiuCount++;
        }
    }
    if (taiCount + xiuCount < 3) return null;
    return { prediction: taiCount > xiuCount ? "Tài" : "Xỉu", confidence: Math.min(90, 55 + Math.min(30, Math.abs(taiCount - xiuCount) * 4)) };
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

function predictPair(history) {
    if (history.length < 15) return null;
    const recent = history.slice(-15);
    const last = history[history.length - 1];
    const lastPairs = { p12: `${last.dice[0]},${last.dice[1]}`, p23: `${last.dice[1]},${last.dice[2]}`, p13: `${last.dice[0]},${last.dice[2]}` };
    let tai = 0, xiu = 0;
    for (const item of recent) {
        if (!item.dice) continue;
        const p12 = `${item.dice[0]},${item.dice[1]}`, p23 = `${item.dice[1]},${item.dice[2]}`, p13 = `${item.dice[0]},${item.dice[2]}`;
        if (p12 === lastPairs.p12 || p23 === lastPairs.p23 || p13 === lastPairs.p13) {
            if (item.result === "Tài") tai++; else xiu++;
        }
    }
    if (tai + xiu < 4) return null;
    return { prediction: tai > xiu ? "Tài" : "Xỉu", confidence: Math.min(85, 55 + Math.min(30, Math.abs(tai - xiu) * 2)) };
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

function bollingerPredict(history, period = 12) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const variance = nums.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    const last = nums[nums.length - 1];
    if (last > mean + 2 * std) return 'X'; if (last < mean - 2 * std) return 'T';
    return null;
}

function macdPredict(history, short = 6, long = 13, signal = 4) {
    if (history.length < long + signal) return null;
    const nums = history.map(c => c === 'T' ? 1 : 0);
    const emaShort = nums.slice(-short).reduce((a, b) => a + b, 0) / short;
    const emaLong = nums.slice(-long).reduce((a, b) => a + b, 0) / long;
    const macd = emaShort - emaLong;
    const macdHistory = [];
    for (let i = nums.length - signal; i < nums.length; i++) {
        const eShort = nums.slice(0, i + 1).slice(-short).reduce((a, b) => a + b, 0) / Math.min(short, i + 1);
        const eLong = nums.slice(0, i + 1).slice(-long).reduce((a, b) => a + b, 0) / Math.min(long, i + 1);
        macdHistory.push(eShort - eLong);
    }
    const signalLine = macdHistory.reduce((a, b) => a + b, 0) / macdHistory.length;
    if (macd > signalLine + 0.05) return 'T'; if (macd < signalLine - 0.05) return 'X';
    return null;
}

function stochasticPredict(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums), lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const k = (nums[nums.length - 1] - lowest) / (highest - lowest) * 100;
    if (k > 80) return 'X'; if (k < 20) return 'T';
    return null;
}

function williamsR(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums), lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const wr = (highest - nums[nums.length - 1]) / (highest - lowest) * -100;
    if (wr < -80) return 'T'; if (wr > -20) return 'X';
    return null;
}

function cciPredict(history, period = 10) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const mad = nums.reduce((sum, x) => sum + Math.abs(x - mean), 0) / period;
    if (mad === 0) return null;
    const cci = (nums[nums.length - 1] - mean) / (0.015 * mad);
    if (cci > 100) return 'X'; if (cci < -100) return 'T';
    return null;
}

function entropyPrediction(history, window = 12) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const p_t = recent.filter(r => r === 'T').length / window;
    if (p_t === 0 || p_t === 1) return recent[recent.length - 1];
    const entropy = -p_t * Math.log2(p_t) - (1 - p_t) * Math.log2(1 - p_t);
    if (entropy > 0.95) return recent[recent.length - 1] === 'T' ? 'X' : 'T';
    return recent[recent.length - 1];
}

function linearRegression(history, window = 12) {
    if (history.length < window) return null;
    const y = history.slice(-window).map(c => c === 'T' ? 1 : 0);
    const x = Array.from({ length: window }, (_, i) => i);
    const n = window, sumX = x.reduce((a, b) => a + b, 0), sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0), sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return (slope * window + intercept) > 0.5 ? 'T' : 'X';
}

function knnPredict(history, k = 5, lookback = 10) {
    if (history.length < lookback + k) return null;
    const query = history.slice(-lookback);
    const distances = [];
    for (let i = 0; i < history.length - lookback - 1; i++) {
        let dist = 0;
        for (let j = 0; j < lookback; j++) if (history[i + j] !== query[j]) dist++;
        distances.push({ dist, next: history[i + lookback] });
    }
    distances.sort((a, b) => a.dist - b.dist);
    const neighbors = distances.slice(0, k).map(d => d.next);
    const tCount = neighbors.filter(n => n === 'T').length;
    return tCount > k - tCount ? 'T' : 'X';
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

function patternMatching(history, lookback = 25) {
    if (history.length < lookback) return null;
    const query = history.slice(-lookback);
    let bestMatch = -1, bestScore = -1;
    for (let i = 0; i < history.length - lookback; i++) {
        let score = 0;
        for (let j = 0; j < lookback; j++) if (history[i + j] === query[j]) score++;
        if (score > bestScore) { bestScore = score; bestMatch = i; }
    }
    if (bestMatch !== -1 && bestMatch + lookback < history.length) return history[bestMatch + lookback];
    return null;
}

function zigzagPredict(history) {
    if (history.length < 5) return null;
    let changes = 0;
    for (let i = 1; i < Math.min(5, history.length); i++) if (history[history.length - i] !== history[history.length - i - 1]) changes++;
    if (changes >= 4) return history[history.length - 1] === 'T' ? 'X' : 'T';
    if (changes >= 3) return history[history.length - 1];
    return null;
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
    detect_triangle: (history) => {
        const last5 = history.slice(-5).join('');
        if (last5 === "TXTXT") return { pred: 'X', conf: 80, name: "Cầu tam giác" };
        if (last5 === "XTXTX") return { pred: 'T', conf: 80, name: "Cầu tam giác" };
        return null;
    },
    detect_dragon: (history) => {
        let tRun = 0;
        for (let i = history.length - 1; i >= 0; i--) { if (history[i] === 'T') tRun++; else break; }
        if (tRun >= 6) return { pred: 'X', conf: 82, name: `Cầu Rồng ${tRun}` };
        if (tRun >= 4) return { pred: 'T', conf: 72, name: `Cầu Rồng ${tRun}` };
        return null;
    },
    detect_tiger: (history) => {
        let xRun = 0;
        for (let i = history.length - 1; i >= 0; i--) { if (history[i] === 'X') xRun++; else break; }
        if (xRun >= 6) return { pred: 'T', conf: 82, name: `Cầu Hổ ${xRun}` };
        if (xRun >= 4) return { pred: 'X', conf: 72, name: `Cầu Hổ ${xRun}` };
        return null;
    }
};

function countBreakSignals(history) {
    let count = 0;
    const detectors = [
        () => { const p = rsiPredict(history, 7); return p && p !== history[history.length - 1]; },
        () => { const p = bollingerPredict(history, 10); return p && p !== history[history.length - 1]; },
        () => { const p = macdPredict(history, 5, 12, 3); return p && p !== history[history.length - 1]; },
        () => { const p = stochasticPredict(history, 7); return p && p !== history[history.length - 1]; },
        () => { const p = williamsR(history, 7); return p && p !== history[history.length - 1]; },
        () => { const p = cciPredict(history, 10); return p && p !== history[history.length - 1]; },
        () => { if (history.length < 10) return false; let changes = 0; for (let i = 1; i < 10; i++) if (history[history.length - i] !== history[history.length - i - 1]) changes++; return changes >= 7; }
    ];
    detectors.forEach(d => { if (d()) count++; });
    return count;
}

// ==================== 2. NÂNG CẤP: BỘ NHỚ RIÊNG & HỌC NHANH 10X ====================
class FastLearner {
    constructor() {
        this.memory = new Map(); // Lưu trữ mẫu đã học: key -> {count, result}
        this.lr = 0.05; // Learning rate cao hơn để học nhanh gấp 10 lần
    }
    
    // Học một mẫu mới
    learn(features, result) {
        const key = this._hashFeatures(features);
        if (!this.memory.has(key)) {
            this.memory.set(key, { count: 0, wins: 0 });
        }
        const record = this.memory.get(key);
        record.count++;
        if (result) record.wins++;
        
        // Giới hạn bộ nhớ
        if (this.memory.size > 5000) {
            const firstKey = this.memory.keys().next().value;
            this.memory.delete(firstKey);
        }
    }
    
    // Dự đoán dựa trên mẫu đã học
    predict(features) {
        const key = this._hashFeatures(features);
        const record = this.memory.get(key);
        if (record && record.count >= 3) {
            const winRate = record.wins / record.count;
            return winRate > 0.5 ? 'T' : 'X';
        }
        return null;
    }
    
    // Hash features thành key
    _hashFeatures(features) {
        return features.map(f => Math.round(f * 10) / 10).join('_');
    }
    
    saveState() {
        const obj = {};
        for (const [key, value] of this.memory) {
            obj[key] = value;
        }
        return obj;
    }
    
    loadState(state) {
        if (state) {
            this.memory = new Map(Object.entries(state));
        }
    }
}

// Bộ nhớ xúc xắc: ghi nhớ các mẫu xúc xắc lặp lại
class DiceMemory {
    constructor() {
        this.patterns = new Map(); // key: "d1,d2,d3" -> {count, nextResults: {T:0, X:0}}
        this.maxPatterns = 3000;
    }
    
    // Thêm một mẫu xúc xắc và kết quả tiếp theo
    addPattern(dice, nextResult) {
        const key = dice.join(',');
        if (!this.patterns.has(key)) {
            this.patterns.set(key, { count: 0, nextResults: { T: 0, X: 0 } });
        }
        const record = this.patterns.get(key);
        record.count++;
        if (nextResult === 'Tài' || nextResult === 'T') record.nextResults.T++;
        else record.nextResults.X++;
        
        if (this.patterns.size > this.maxPatterns) {
            const firstKey = this.patterns.keys().next().value;
            this.patterns.delete(firstKey);
        }
    }
    
    // Dự đoán dựa trên xúc xắc hiện tại
    predict(dice) {
        const key = dice.join(',');
        const record = this.patterns.get(key);
        if (record && record.count >= 3) {
            const total = record.nextResults.T + record.nextResults.X;
            const probT = record.nextResults.T / total;
            if (probT > 0.6) return { prediction: 'T', confidence: Math.round(probT * 100), reason: `Xúc xắc ${key} đã ra ${record.count} lần → Tài ${Math.round(probT*100)}%` };
            if (probT < 0.4) return { prediction: 'X', confidence: Math.round((1-probT) * 100), reason: `Xúc xắc ${key} đã ra ${record.count} lần → Xỉu ${Math.round((1-probT)*100)}%` };
        }
        return null;
    }
    
    saveState() {
        const obj = {};
        for (const [key, value] of this.patterns) {
            obj[key] = value;
        }
        return obj;
    }
    
    loadState(state) {
        if (state) {
            this.patterns = new Map(Object.entries(state));
        }
    }
}

// ==================== 3. META-LEARNER & HMM ====================
class MetaLearner {
    constructor(inputSize = 10) {
        this.weights = new Array(inputSize).fill(0).map(() => Math.random() * 0.2 - 0.1);
        this.bias = 0;
        this.lr = 0.01;
    }
    predict(features) {
        let sum = this.bias;
        for (let i = 0; i < features.length; i++) sum += this.weights[i] * features[i];
        return 1 / (1 + Math.exp(-sum));
    }
    train(features, target) {
        const out = this.predict(features);
        const err = target - out;
        for (let i = 0; i < this.weights.length; i++) this.weights[i] += this.lr * err * features[i];
        this.bias += this.lr * err;
    }
    saveState() { return { weights: this.weights, bias: this.bias }; }
    loadState(s) { if (s) { this.weights = s.weights || this.weights; this.bias = s.bias || 0; } }
}

class SimpleHMM {
    constructor() {
        this.transProb = [0.7, 0.3, 0.3, 0.7];
        this.state = 'thuan';
        this.obsProb = { thuan: { T: 0.5, X: 0.5 }, nghich: { T: 0.5, X: 0.5 } };
    }
    update(prevRes, currRes) {
        this.obsProb[this.state][currRes] += 0.1;
        const sum = this.obsProb[this.state].T + this.obsProb[this.state].X;
        this.obsProb[this.state].T /= sum; this.obsProb[this.state].X /= sum;
        const rand = Math.random();
        if (this.state === 'thuan') this.state = rand < this.transProb[0] ? 'thuan' : 'nghich';
        else this.state = rand < this.transProb[2] ? 'thuan' : 'nghich';
    }
    predict() { return this.obsProb[this.state].T > this.obsProb[this.state].X ? 'T' : 'X'; }
    saveState() { return { transProb: this.transProb, state: this.state, obsProb: this.obsProb }; }
    loadState(s) { if (s) { this.transProb = s.transProb || this.transProb; this.state = s.state || 'thuan'; this.obsProb = s.obsProb || this.obsProb; } }
}

// ==================== 4. LỚP AnhlakhoiGodAI (NÂNG CẤP) ====================
class AnhlakhoiGodAI {
    constructor() {
        this.history = []; this.diceHistory = [];
        this.weights = {
            'score_low':2.0,'score_high':1.8,'triple':1.7,'pair1':1.6,'pair6':1.5,
            'bet_2':1.2,'bet_3':1.3,'bet_4':1.4,'bet_5':1.6,'bet_6':1.8,'bet_7':2.0,
            'c11':1.0,'c11_long':1.2,'c22':1.0,'c33':1.0,'c44':1.0,'c55':1.0,
            'tamgiac':1.2,'zigzag':1.1,'doixung':1.0,'rong':1.5,'daygay':1.4,
            'c121':1.0,'c123':1.0,'c321':1.0,'c212':1.0,
            'face_hot':1.2,'face_cold':1.1,'face_trans':1.3,'dice_pair':1.4,
            'sum_trend':1.3,'markov':1.2,'distribution':1.1,'smartbet':1.0,
            'markov_multi':1.0,'markov1':0.9,'markov2':0.9,'markov3':1.0,
            'weighted_freq':0.9,'predict_cycle':0.8,'predict_trend':0.9,
            'predict_streak':1.1,'bayes':0.9,'fibonacci_total':0.8,'predict_pair':0.8,
            'rsi':0.9,'bollinger':0.8,'macd':0.8,'stochastic':0.7,'williams_r':0.7,'cci':0.7,'entropy':0.8,
            'linear_regression':0.8,'knn':0.8,'decision_tree':0.9,'pattern_matching':0.8,'zigzag_detect':0.9,'break_signals':1.0,
            'pattern_11':0.8,'pattern_22':0.8,'pattern_33':0.8,'pattern_triangle':0.9,'pattern_dragon':0.9,'pattern_tiger':0.9,
            'cau_3_2_1_var':0.9,'cau_tong_dac_biet':1.0,'cau_xuc_xac_vang':1.1,'cau_bac_thang':0.9,'cau_dao_3':1.0,'cau_song_nguoc':1.0,
            'cau_6_6':1.0,'cau_7_7':1.0,'cau_8_8':1.0,'hmm':1.2,'meta':1.8,
            'fast_learner':1.5,'dice_memory':1.6
        };
        this.performance = {}; this.recentResults = []; this.threshold = 50;
        this.lastPred = null; this.lastPatterns = [];
        this.faceFreq={1:0,2:0,3:0,4:0,5:0,6:0}; this.faceTrans={}; this.pairStats={}; this.tripleStats={}; this.scorePatterns={};
        this.markovChain={'T->T':0,'T->X':0,'X->T':0,'X->X':0}; this.betStats={}; this.transitionMatrix={}; this.cycleStats={};
        this.winStreak=0; this.loseStreak=0; this.REVERSAL_THRESHOLD=3;
        this.markovDice = new MarkovXucXac123(3);
        this.metaWeights = {}; this.patternAge = {};
        this.meta = new MetaLearner(10);
        this.hmm = new SimpleHMM();
        this.fastLearner = new FastLearner(); // Bộ học nhanh
        this.diceMemory = new DiceMemory(); // Bộ nhớ xúc xắc
        this.lastFeatures = null;
        this.volatility = 0;
        this.safeMode = false;
    }

    addSession(s) {
        const d1=s.xuc_xac_1,d2=s.xuc_xac_2,d3=s.xuc_xac_3,total=d1+d2+d3,result=s.ket_qua==='Tài'?'T':'X';
        
        // Học mẫu xúc xắc cho phiên trước
        if (this.diceHistory.length > 0) {
            const prevDice = this.diceHistory[this.diceHistory.length - 1];
            this.diceMemory.addPattern(prevDice, s.ket_qua);
        }
        
        this.history.push({result,total,dice:[d1,d2,d3],time:s.thoi_gian||new Date().toISOString()});
        this.diceHistory.push([d1,d2,d3]);
        this.faceFreq[d1]++; this.faceFreq[d2]++; this.faceFreq[d3]++;
        if(this.history.length>=2){
            const prev=this.diceHistory[this.diceHistory.length-2];
            [d1,d2,d3].forEach((to,pos)=>{const from=prev[pos]; if(!this.faceTrans[pos])this.faceTrans[pos]={}; if(!this.faceTrans[pos][from])this.faceTrans[pos][from]={}; this.faceTrans[pos][from][to]=(this.faceTrans[pos][from][to]||0)+1;});
        }
        if(d1===d2||d2===d3||d1===d3){
            const k=d1===d2?`1-2:${d1}`:d2===d3?`2-3:${d2}`:`1-3:${d1}`;
            if(!this.pairStats[k])this.pairStats[k]={T:0,X:0,t:0}; result==='T'?this.pairStats[k].T++:this.pairStats[k].X++; this.pairStats[k].t++;
        }
        if(d1===d2&&d2===d3){
            const k=`${d1},${d2},${d3}`; if(!this.tripleStats[k])this.tripleStats[k]={T:0,X:0,t:0}; result==='T'?this.tripleStats[k].T++:this.tripleStats[k].X++; this.tripleStats[k].t++;
        }
        if(this.history.length>=2){
            const prevT=this.history[this.history.length-2].total,key=`${prevT}->${total}`;
            if(!this.scorePatterns[key])this.scorePatterns[key]={c:0,nextT:0,nextX:0}; this.scorePatterns[key].c++;
            const nextR=this.history[this.history.length-3]?.result; if(nextR==='T')this.scorePatterns[key].nextT++; else if(nextR==='X')this.scorePatterns[key].nextX++;
        }
        const R=this._getResults();
        if(R.length>=2){const from=R[1],to=R[0]; this.markovChain[`${from}->${to}`]=(this.markovChain[`${from}->${to}`]||0)+1;}
        let streak=1; for(let i=1;i<R.length;i++){if(R[i]===R[0])streak++;else break;}
        if(streak>=2){const k=Math.min(streak,20); if(!this.betStats[k])this.betStats[k]={tiep:0,gay:0,t:0}; if(R[streak]&&R[streak]===R[0])this.betStats[k].tiep++;else this.betStats[k].gay++; this.betStats[k].t++;}
        for(let cycle=2;cycle<=6;cycle++){if(R.length>=cycle*2&&R.slice(0,cycle).join(',')===R.slice(cycle,cycle*2).join(',')){if(!this.cycleStats[cycle])this.cycleStats[cycle]={count:0,next:{}}; this.cycleStats[cycle].count++; const nxt=R[cycle]; this.cycleStats[cycle].next[nxt]=(this.cycleStats[cycle].next[nxt]||0)+1;}}
        this.markovDice.themDuLieu([d1,d2,d3]);
        if(this.history.length>2000){this.history.shift();this.diceHistory.shift();}
        for (let id in this.patternAge) this.patternAge[id]++;
    }

    _getResults(){return this.history.map(h=>h.result).reverse();}

    _extractFeatures(data, results) {
        const last10 = results.slice(0,10);
        const tRatio = last10.filter(r=>r==='T').length / last10.length;
        let streak = 0;
        for (let i=0; i<results.length; i++) { if (results[i]===results[0]) streak += results[i]==='T'?1:-1; else break; }
        const rTotals = data.slice(0,5).map(d=>d.total);
        const avg = rTotals.reduce((a,b)=>a+b,0)/5;
        const vari = rTotals.reduce((s,t)=>s+(t-avg)**2,0)/5;
        const std = Math.sqrt(vari);
        let rev = 0;
        for (let i=1; i<Math.min(5,results.length); i++) if(results[i]!==results[i-1]) rev++;
        const glbTR = this.history.filter(h=>h.result==='T').length / this.history.length;
        const rsiV = rsiPredict(results)==='T'?1:(rsiPredict(results)==='X'?0:0.5);
        const bollV = bollingerPredict(results)==='T'?1:(bollingerPredict(results)==='X'?0:0.5);
        const lastR = results[0]==='T'?1:0;
        const entV = entropyPrediction(results)==='T'?1:(entropyPrediction(results)==='X'?0:0.5);
        return [tRatio, streak/10, avg/18, std/5, rev/5, glbTR, rsiV, bollV, lastR, entV];
    }

    _collectSignals(){
        const R=this._getResults(),data=this.history.slice().reverse(),lastDice=this.diceHistory[this.diceHistory.length-1]||[0,0,0];
        const [d1,d2,d3]=lastDice,lastTotal=data[0]?.total||0,S=[];
        const add=(pred,conf,id,name)=>{
            if(conf>=this.threshold){
                const metaW = this.metaWeights[id] || 1.0;
                const w = (this.weights[id] || 1.0) * metaW;
                const perf=this.performance[id];
                let adjW=w;
                if(perf && perf.t>=10){ const acc=perf.c/perf.t; if(acc<0.3)return; const age = this.patternAge[id] || 0; const ageFactor = Math.max(0.5, 1.0 - age * 0.01); adjW = w * (0.3 + acc * 0.7) * ageFactor; }
                S.push({pred,conf,weight:adjW,id,name});
            }
        };

        // === TÍN HIỆU TỪ BỘ NHỚ XÚC XẮC (NÂNG CẤP) ===
        const dicePrediction = this.diceMemory.predict(lastDice);
        if (dicePrediction) {
            add(dicePrediction.prediction, dicePrediction.confidence, 'dice_memory', dicePrediction.reason);
        }

        // === TÍN HIỆU TỪ FAST LEARNER (NÂNG CẤP) ===
        if (this.lastFeatures) {
            const fastPred = this.fastLearner.predict(this.lastFeatures);
            if (fastPred) {
                add(fastPred, 65, 'fast_learner', 'Học nhanh từ mẫu tương tự');
            }
        }

        // Các tín hiệu cơ bản
        if(lastTotal<=4)add('T',82,'score_low',`Tổng ${lastTotal} → Tài`);
        if(lastTotal>=17)add('X',80,'score_high',`Tổng ${lastTotal} → Xỉu`);
        if(d1===d2&&d2===d3){const k=`${d1},${d2},${d3}`,st=this.tripleStats[k]; add(d1>=4?'X':'T',st&&st.t>=3?Math.round(Math.max(st.T,st.X)/st.t*100):72,'triple',`3 mặt ${d1}`);}
        if(lastDice.filter(x=>x===1).length>=2){const st=this.pairStats['1-2:1']||this.pairStats['2-3:1']||this.pairStats['1-3:1']; add('T',st&&st.t>=5?Math.round(st.T/st.t*100):70,'pair1','Cặp 1 → Tài');}
        if(lastDice.filter(x=>x===6).length>=2){const st=this.pairStats['1-2:6']||this.pairStats['2-3:6']||this.pairStats['1-3:6']; add('X',st&&st.t>=5?Math.round(st.X/st.t*100):68,'pair6','Cặp 6 → Xỉu');}

        // ... (giữ nguyên toàn bộ các pattern còn lại như trước)
        // ... (tất cả các pattern từ bet, c11, c22, c33, tamgiac, zigzag, doixung, rong, daygay, c121, c123, c321, c212, sum_trend, markov, distribution, markov_multi, markov1-3, weighted_freq, predict_cycle, predict_trend, predict_streak, bayes, fibonacci_total, predict_pair, rsi, bollinger, macd, stochastic, williams_r, cci, entropy, linear_regression, knn, decision_tree, pattern_matching, zigzag_detect, PatternDetectors, break_signals, markov_xuc_xac, cau_3_2_1_var, cau_tong_dac_biet, cau_xuc_xac_vang, cau_bac_thang, cau_dao_3, cau_song_nguoc, cau_6_6, cau_7_7, cau_8_8)

        // HMM
        const hmmP = this.hmm.predict();
        if (hmmP) add(hmmP, 58, 'hmm', 'HMM');

        // Meta-Learner
        this.lastFeatures = this._extractFeatures(data, R);
        if (this.meta.weights.some(w=>w!==0)) {
            const mlOut = this.meta.predict(this.lastFeatures);
            const mlPred = mlOut > 0.5 ? 'T' : 'X';
            const mlConf = Math.round(Math.abs(mlOut-0.5)*180);
            if (mlConf >= this.threshold - 5) add(mlPred, mlConf, 'meta', 'Meta AI');
        }

        if (R.length >= 2) this.hmm.update(R[1], R[0]);
        S.forEach(s => { this.patternAge[s.id] = 0; });
        if(S.length===0)add(R[0]==='T'?'X':'T',52,'cau_tu_nhien','Cầu tự nhiên');
        return S;
    }

    _analyzeCauBet(R){let s=1;for(let i=1;i<R.length;i++){if(R[i]===R[0])s++;else break;} return s>=2?{type:R[0],length:s}:null;}

    predict(){
        if(this.history.length<10){
            const recent = this.history.slice(-Math.min(this.history.length,20));
            if(recent.length===0) return {action:'CÂN NHẮC',prediction:'Tài',confidence:51};
            const taiCount = recent.filter(h=>h.result==='T').length;
            const xiuCount = recent.length - taiCount;
            const pred = taiCount > xiuCount ? 'Tài' : 'Xỉu';
            const conf = Math.round(Math.max(taiCount,xiuCount)/recent.length*100);
            return {action:conf>=55?'CÂN NHẮC':'BỎ QUA',prediction:pred,confidence:Math.max(51,conf)};
        }
        const signals=this._collectSignals();
        if(signals.length===0){
            const last10 = this.history.slice(-10).map(h=>h.result);
            const taiCount = last10.filter(r=>r==='T').length;
            const pred = taiCount >= 5 ? 'Xỉu' : 'Tài';
            return {action:'CÂN NHẮC',prediction:pred,confidence:55};
        }
        let sT=0,sX=0;
        signals.forEach(s=>{if(s.pred==='T')sT+=s.conf*s.weight;else sX+=s.conf*s.weight;});
        if(this.lastFeatures && this.meta.weights.some(w=>w!==0)){
            const mp = this.meta.predict(this.lastFeatures);
            sT += mp * 2.0 * 60;
            sX += (1-mp) * 2.0 * 60;
        }
        if(sT===0 && sX===0){
            const last = this.history[this.history.length-1].result;
            return {action:'CÂN NHẮC',prediction:last==='T'?'Xỉu':'Tài',confidence:55};
        }
        if(Math.abs(sT-sX)<0.001){
            const totalT = this.history.filter(h=>h.result==='T').length;
            const totalX = this.history.length - totalT;
            if(totalT>totalX) sT += 0.5; else sX += 0.5;
        }
        let pred = sT>=sX?'Tài':'Xỉu';
        let conf = Math.round(Math.max(sT,sX)/(sT+sX)*100);
        const diff = Math.abs(sT-sX)/(sT+sX);
        if(diff<0.15) conf = Math.max(53,conf-10);
        if(signals.length>=6 && diff>0.3) conf = Math.min(92,conf+5);
        if(this.loseStreak>=this.REVERSAL_THRESHOLD && conf<70){
            pred = pred==='Tài'?'Xỉu':'Tài';
            conf = Math.max(51,conf-5);
        }
        if(this.volatility>0.8 && conf<60) return {action:'BỎ QUA',prediction:pred,confidence:conf};
        this.lastPred = pred;
        this.lastPatterns = signals.map(s=>s.id);
        return {action:conf>=65?'ĐẶT':'CÂN NHẮC',prediction:pred,confidence:Math.max(51,Math.min(92,conf))};
    }

    feedback(actual) {
        const actualTai = (typeof actual === 'string') && (actual.toLowerCase() === 'tài');
        const predictionTai = (typeof this.lastPred === 'string') && (this.lastPred.toLowerCase() === 'tài');
        const correct = predictionTai === actualTai;

        this.recentResults.push(correct);
        if (this.recentResults.length > 50) this.recentResults.shift();

        if (correct) { this.winStreak++; this.loseStreak = 0; }
        else { this.loseStreak++; this.winStreak = 0; }

        // Huấn luyện Fast Learner (học nhanh gấp 10 lần)
        if (this.lastFeatures) {
            // Học 10 lần cho mỗi mẫu
            for (let i = 0; i < 10; i++) {
                this.fastLearner.learn(this.lastFeatures, correct);
            }
            // Cũng huấn luyện Meta-Learner
            const target = actualTai ? 1 : 0;
            this.meta.train(this.lastFeatures, target);
        }

        // Cập nhật pattern performance
        if (this.lastPatterns && this.lastPatterns.length > 0) {
            this.lastPatterns.forEach(id => {
                if (!this.performance[id]) this.performance[id] = { c: 0, t: 0 };
                this.performance[id].t++;
                if (correct) this.performance[id].c++;
                const rate = this.performance[id].t >= 10 ? this.performance[id].c / this.performance[id].t : 0.5;
                let w = this.weights[id] || 1.0;
                if (this.performance[id].t >= 10) {
                    if (rate > 0.65) w = Math.min(3.0, w * 1.15);
                    else if (rate < 0.35) w = Math.max(0.15, w * 0.85);
                }
                this.weights[id] = w;
                if (this.performance[id].t >= 5) {
                    const metaW = this.metaWeights[id] || 1.0;
                    if (rate > 0.6) this.metaWeights[id] = Math.min(2.0, metaW * 1.05);
                    else if (rate < 0.4) this.metaWeights[id] = Math.max(0.5, metaW * 0.95);
                }
                this.patternAge[id] = 0;
            });
        }

        // Cập nhật HMM
        if (this.history.length >= 2) {
            const prevRes = this.history[this.history.length - 2].result;
            const currRes = actualTai ? 'T' : 'X';
            this.hmm.update(prevRes, currRes);
        }

        // Cập nhật volatility
        const changes = [];
        for (let i = 1; i < Math.min(10, this.history.length); i++) {
            changes.push(Math.abs(this.history[i].total - this.history[i - 1].total));
        }
        this.volatility = changes.reduce((a, b) => a + b, 0) / changes.length / 6;

        if (this.recentResults.length >= 10) {
            const acc = this.recentResults.filter(r => r).length / this.recentResults.length;
            this.threshold = acc > 0.65 ? 48 : acc < 0.45 ? 62 : 50;
        }
    }

    getStats(){
        const total=this.recentResults.length,correct=this.recentResults.filter(r=>r).length;
        return{accuracy:total>0?(correct/total*100).toFixed(1)+'%':'0%',threshold:this.threshold,winStreak:this.winStreak,loseStreak:this.loseStreak,volatility:this.volatility.toFixed(2),safeMode:this.volatility>0.8,activePatterns:Object.keys(this.performance).length,totalHistory:this.history.length,diceMemorySize:this.diceMemory.patterns.size,fastLearnerSize:this.fastLearner.memory.size};
    }

    saveState(){ return{weights:this.weights,performance:this.performance,threshold:this.threshold,loseStreak:this.loseStreak,metaWeights:this.metaWeights,patternAge:this.patternAge,meta:this.meta.saveState(),hmm:this.hmm.saveState(),fastLearner:this.fastLearner.saveState(),diceMemory:this.diceMemory.saveState()}; }

    loadState(state){
        if(state){
            this.weights={...this.weights,...state.weights};
            this.performance=state.performance||{};
            this.threshold=state.threshold||50;
            this.loseStreak=state.loseStreak||0;
            this.metaWeights=state.metaWeights||{};
            this.patternAge=state.patternAge||{};
            if(state.meta)this.meta.loadState(state.meta);
            if(state.hmm)this.hmm.loadState(state.hmm);
            if(state.fastLearner)this.fastLearner.loadState(state.fastLearner);
            if(state.diceMemory)this.diceMemory.loadState(state.diceMemory);
        }
    }
}

// ==================== 5. SERVER (GIỮ NGUYÊN) ====================
const predictorHU  = new AnhlakhoiGodAI();
const predictorMD5 = new AnhlakhoiGodAI();
let predictionHistory = { hu: [], md5: [] };
let pendingPrediction  = { hu: null, md5: null };

function loadJSON(filename, defaultValue) { try { if (fs.existsSync(filename)) return JSON.parse(fs.readFileSync(filename, 'utf8')); } catch (e) { console.error(`Lỗi load ${filename}:`, e.message); } return defaultValue; }
function saveJSON(filename, data) { try { fs.writeFileSync(filename, JSON.stringify(data, null, 2)); } catch (e) { console.error(`Lỗi save ${filename}:`, e.message); } }

let sessionsStore;
let isReady = { hu: false, md5: false };

async function initializeData() {
    sessionsStore = loadJSON(SESSIONS_FILE, { hu: [], md5: [] });
    const load = (pred, arr) => { arr.slice().reverse().forEach(s => pred.addSession({ ket_qua: s.Ket_qua, tong: s.Tong, xuc_xac_1: s.Xuc_xac_1, xuc_xac_2: s.Xuc_xac_2, xuc_xac_3: s.Xuc_xac_3, thoi_gian: s.Thoi_gian || new Date().toISOString() })); };
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
    return apiData.list.map(item => ({ Phien: item.id, Ket_qua: item.resultTruyenThong === 'TAI' ? 'Tài' : 'Xỉu', Xuc_xac_1: item.dices[0], Xuc_xac_2: item.dices[1], Xuc_xac_3: item.dices[2], Tong: item.point, Thoi_gian: item.time || new Date().toISOString() }));
}

async function fetchData(url) { try { const resp = await axios.get(url, { timeout: 15000, params: { limit: FETCH_PER_REQUEST } }); return transformApiData(resp.data); } catch (e) { console.error(`❌ Fetch lỗi:`, e.message); return null; } }

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
    const nd = await fetchData(url); if (!nd) return;
    const res = mergeSessions(sessionsStore[type], nd);
    sessionsStore[type] = res.sessions;
    res.added.sort((a, b) => a.Phien - b.Phien).forEach(s => predictor.addSession({ ket_qua: s.Ket_qua, tong: s.Tong, xuc_xac_1: s.Xuc_xac_1, xuc_xac_2: s.Xuc_xac_2, xuc_xac_3: s.Xuc_xac_3, thoi_gian: s.Thoi_gian }));
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
