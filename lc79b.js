// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC GOD AI - FULL 100+ THUẬT TOÁN - KHÔNG CẮT BỚT          ║
// ║  Tích hợp: Markov + RSI + Bollinger + MACD + Pattern Detectors    ║
// ║  Server luôn trả về dự đoán, kèm thống kê thắng thua              ║
// ╚══════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== CẤU HÌNH ====================
const API_URL_HU = 'https://wtx.tele68.com/v1/tx/sessions';
const API_URL_MD5 = 'https://wtxmd52.tele68.com/v1/txmd5/sessions';
const SESSIONS_FILE = path.join(__dirname, 'vuaoccac_sessions.json');
const LEARNING_FILE = path.join(__dirname, 'vuaoccac_learning.json');
const HISTORY_FILE = path.join(__dirname, 'vuaoccac_history.json');

const MIN_SESSIONS = 100;
const FETCH_PER_REQUEST = 100;
const FETCH_INTERVAL = 2000;
const AUTO_SAVE_INTERVAL = 30000;

// ==================== 1. TOÀN BỘ THUẬT TOÁN ====================

// ---------- Các hàm Markov & thống kê ----------
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

class MarkovXucXac {
    constructor(bac = 3) {
        this.bac = Math.min(4, Math.max(1, bac));
        this.transitions = new Map();
        this.history = [];
        this.maxHistory = 60;
    }
    static chuyenLoai(diem) { return diem <= 2 ? 1 : diem <= 4 ? 2 : 3; }
    themDuLieu(daySo) {
        const filtered = daySo.map(x => MarkovXucXac.chuyenLoai(x));
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
    duDoan() {
        if (this.history.length < 2) return 2;
        const dem = { 1: 0, 2: 0, 3: 0 };
        this.history.forEach(v => dem[v]++);
        return dem[1] > dem[3] ? 1 : 3;
    }
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
        if (recent[i].result === "Tài") wTai += w;
        else wXiu += w;
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
    if (t > x) return 'T';
    if (x > t) return 'X';
    return null;
}

function cumulativeImbalance(history, window = 25) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const imbalance = recent.filter(r => r === 'T').length - recent.filter(r => r === 'X').length;
    if (imbalance > 7) return 'X';
    if (imbalance < -7) return 'T';
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
    if (last6.length >= 5 && last6[0] === last6[1] && last6[2] === last6[3] && last6[1] !== last6[2]) return { prediction: last6[3] === "Tài" ? "Xỉu" : "Tài", confidence: 68 };
    const tai = last6.filter(r => r === "Tài").length;
    const xiu = 6 - tai;
    if (tai !== xiu) return { prediction: tai > xiu ? "Tài" : "Xỉu", confidence: Math.min(75, 55 + Math.abs(tai - xiu) * 3) };
    return null;
}

function movingAverageCross(history, short = 5, long = 13) {
    if (history.length < long) return null;
    const shortT = history.slice(-short).filter(r => r === 'T').length / short;
    const longT = history.slice(-long).filter(r => r === 'T').length / long;
    if (shortT > longT + 0.12) return 'T';
    if (longT > shortT + 0.12) return 'X';
    return null;
}

function predictStreak(history) {
    if (history.length < 5) return null;
    let streakLen = 1;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === history[history.length - 1].result) streakLen++;
        else break;
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
            if (seq[i + 3] === 'T') taiCount++;
            else xiuCount++;
        }
    }
    if (taiCount + xiuCount < 3) return null;
    return { prediction: taiCount > xiuCount ? "Tài" : "Xỉu", confidence: Math.min(90, 55 + Math.min(30, Math.abs(taiCount - xiuCount) * 4)) };
}

function naiveBayes(history, window = 15) {
    if (history.length < window) return null;
    const p_t = history.filter(r => r === 'T').length / history.length;
    const p_x = 1 - p_t;
    const last5 = history.slice(-5);
    let cond_t = 0, cond_x = 0, tCount = 0, xCount = 0;
    for (let i = 0; i < history.length - 5; i++) {
        if (history.slice(i, i + 5).join('') === last5.join('')) {
            const next = history[i + 5];
            if (next === 'T') { cond_t++; tCount++; }
            else { cond_x++; xCount++; }
        }
    }
    if (tCount === 0 && xCount === 0) return null;
    const post_t = p_t * (cond_t / Math.max(1, tCount));
    const post_x = p_x * (cond_x / Math.max(1, xCount));
    return post_t > post_x ? 'T' : 'X';
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

function fibonacciFractal(history) {
    const fibs = [1, 1, 2, 3, 5, 8, 13];
    let countMatch = 0;
    for (let f of fibs) if (history.length > f && history[history.length - f] === history[history.length - 1]) countMatch++;
    if (countMatch >= Math.floor(fibs.length / 2)) return history[history.length - 1];
    return history[history.length - 1] === 'T' ? 'X' : 'T';
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
            if (item.result === "Tài") tai++;
            else xiu++;
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
    if (rsi > 65) return 'X';
    if (rsi < 35) return 'T';
    return null;
}

function bollingerPredict(history, period = 12) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const variance = nums.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    const last = nums[nums.length - 1];
    if (last > mean + 2 * std) return 'X';
    if (last < mean - 2 * std) return 'T';
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
    if (macd > signalLine + 0.05) return 'T';
    if (macd < signalLine - 0.05) return 'X';
    return null;
}

function stochasticPredict(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums), lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const k = (nums[nums.length - 1] - lowest) / (highest - lowest) * 100;
    if (k > 80) return 'X';
    if (k < 20) return 'T';
    return null;
}

function williamsR(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums), lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const wr = (highest - nums[nums.length - 1]) / (highest - lowest) * -100;
    if (wr < -80) return 'T';
    if (wr > -20) return 'X';
    return null;
}

function cciPredict(history, period = 10) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const mad = nums.reduce((sum, x) => sum + Math.abs(x - mean), 0) / period;
    if (mad === 0) return null;
    const cci = (nums[nums.length - 1] - mean) / (0.015 * mad);
    if (cci > 100) return 'X';
    if (cci < -100) return 'T';
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
    if (t5 >= 4) return 'X';
    if (t5 <= 1) return 'T';
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
    detect_1_2_3: (history) => {
        if (history.length >= 6 && history.slice(-6).join('') === "TXXTTT") return { pred: 'X', conf: 77, name: "Cầu 1-2-3" };
        if (history.length >= 6 && history.slice(-6).join('') === "XTTXXX") return { pred: 'T', conf: 77, name: "Cầu 1-2-3" };
        return null;
    },
    detect_triangle: (history) => {
        const last5 = history.slice(-5).join('');
        if (last5 === "TXTXT") return { pred: 'X', conf: 80, name: "Cầu tam giác" };
        if (last5 === "XTXTX") return { pred: 'T', conf: 80, name: "Cầu tam giác" };
        return null;
    },
    detect_zigzag: (history) => {
        if (history.length >= 5 && history.slice(-5).join('') === "TXTXT") return { pred: 'X', conf: 80, name: "Cầu Zigzag 5" };
        if (history.length >= 5 && history.slice(-5).join('') === "XTXTX") return { pred: 'T', conf: 80, name: "Cầu Zigzag 5" };
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
    },
    detect_4_4: (history) => {
        if (history.length >= 8 && history.slice(-8).join('') === "TTTTXXXX") return { pred: 'X', conf: 79, name: "Cầu 4-4" };
        if (history.length >= 8 && history.slice(-8).join('') === "XXXXTTTT") return { pred: 'T', conf: 79, name: "Cầu 4-4" };
        return null;
    },
    detect_5_5: (history) => {
        if (history.length >= 10 && history.slice(-10).join('') === "TTTTTXXXXX") return { pred: 'X', conf: 77, name: "Cầu 5-5" };
        if (history.length >= 10 && history.slice(-10).join('') === "XXXXXTTTTT") return { pred: 'T', conf: 77, name: "Cầu 5-5" };
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
        () => {
            if (history.length < 10) return false;
            const nums = history.slice(-10).map(c => c === 'T' ? 1 : 0);
            const priceTrend = nums[nums.length - 1] - nums[0];
            let rsiValues = [];
            for (let i = 7; i < nums.length; i++) {
                const sub = nums.slice(i - 6, i + 1);
                let gains = 0, losses = 0;
                for (let j = 1; j < sub.length; j++) { const diff = sub[j] - sub[j - 1]; if (diff > 0) gains += diff; else losses -= diff; }
                rsiValues.push(losses === 0 ? 100 : 100 - (100 / (1 + gains / losses)));
            }
            if (rsiValues.length >= 2) {
                const rsiTrend = rsiValues[rsiValues.length - 1] - rsiValues[0];
                return (priceTrend > 0 && rsiTrend < 0) || (priceTrend < 0 && rsiTrend > 0);
            }
            return false;
        },
        () => {
            if (history.length < 10) return false;
            let changes = 0;
            for (let i = 1; i < Math.min(10, history.length); i++) if (history[history.length - i] !== history[history.length - i - 1]) changes++;
            return changes >= 7;
        }
    ];
    detectors.forEach(d => { if (d()) count++; });
    return count;
}

// ==================== LỚP AnhlakhoiGodAI (ĐẦY ĐỦ) ====================
class AnhlakhoiGodAI {
    constructor() {
        this.history = []; this.diceHistory = [];
        this.weights = {
            'score_low':2.0,'score_high':1.8,'triple':1.7,'pair1':1.6,'pair6':1.5,'bet_2':1.2,'bet_3':1.3,'bet_4':1.4,'bet_5':1.6,'bet_6':1.8,'bet_7':2.0,
            'c11':1.0,'c11_long':1.2,'c22':1.0,'c33':1.0,'c44':1.0,'c55':1.0,'c121':1.0,'c123':1.0,'c321':1.0,'c212':1.0,'tamgiac':1.2,'zigzag':1.1,'doixung':1.0,
            'rong':1.5,'daygay':1.4,'nhaycoc':1.0,'nhipnghieng':1.0,'3van1':1.0,'becau':1.1,'chuky':1.0,'gap':1.0,'ziczac':1.0,'doi':1.0,'c1221':1.0,'c2112':1.0,
            'face_hot':1.2,'face_cold':1.1,'face_trans':1.3,'dice_pair':1.4,'dice_triple':1.6,'dice_score':1.2,'dice_trend_line':1.0,'day_gay_dice':1.0,
            'sum_trend':1.3,'markov':1.2,'distribution':1.1,'smartbet':1.0,'edge_cases':1.0,'momentum':1.0,'fibonacci':1.0,'resistance_support':1.0,'wave':1.0,'golden_ratio':1.0,'break_pattern':1.0,
            'markov_chain':1.2,'moving_avg_drift':1.1,'sum_pressure':1.1,'volatility':1.0,'cau_tu_nhien':1.0,
            'markov_multi':1.0,'markov1':0.9,'markov2':0.9,'markov3':1.0,'weighted_freq':0.9,'simple_majority':0.7,'cumulative_imbalance':0.8,
            'predict_cycle':0.8,'predict_trend':0.9,'moving_avg_cross':0.7,'predict_streak':1.1,'bayes':0.9,'naive_bayes':0.8,
            'fibonacci_total':0.8,'fibonacci_fractal':0.7,'predict_pair':0.8,'rsi':0.9,'bollinger':0.8,'macd':0.8,'stochastic':0.7,'williams_r':0.7,'cci':0.7,'entropy':0.8,
            'linear_regression':0.8,'knn':0.8,'decision_tree':0.9,'pattern_matching':0.8,'zigzag_detect':0.9,'break_signals':1.0,
            'pattern_11':0.8,'pattern_22':0.8,'pattern_33':0.8,'pattern_123':0.8,'pattern_triangle':0.9,'pattern_zigzag':0.8,'pattern_dragon':0.9,'pattern_tiger':0.9,'pattern_44':0.8,'pattern_55':0.8
        };
        this.performance = {}; this.recentResults = []; this.threshold = 55; this.lastPred = null; this.lastPatterns = [];
        this.faceFreq={1:0,2:0,3:0,4:0,5:0,6:0}; this.faceTrans={}; this.pairStats={}; this.tripleStats={}; this.scorePatterns={};
        this.markovChain={'T->T':0,'T->X':0,'X->T':0,'X->X':0}; this.betStats={}; this.transitionMatrix={}; this.cycleStats={};
        this.winStreak=0; this.loseStreak=0; this.REVERSAL_THRESHOLD=3; this.reversalState={active:false,consecutiveLosses:0,reversalCount:0};
        this.markovDice = new MarkovXucXac(3);
    }

    addSession(s) {
        const d1=s.xuc_xac_1,d2=s.xuc_xac_2,d3=s.xuc_xac_3,total=d1+d2+d3,result=s.ket_qua==='Tài'?'T':'X';
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
        if(R.length>=3){const state=`${R[2]},${R[1]}`,next=R[0]; if(!this.transitionMatrix[state])this.transitionMatrix[state]={T:0,X:0}; next==='T'?this.transitionMatrix[state].T++:this.transitionMatrix[state].X++;}
        let streak=1; for(let i=1;i<R.length;i++){if(R[i]===R[0])streak++;else break;}
        if(streak>=2){const k=Math.min(streak,20); if(!this.betStats[k])this.betStats[k]={tiep:0,gay:0,t:0}; if(R[streak]&&R[streak]===R[0])this.betStats[k].tiep++;else this.betStats[k].gay++; this.betStats[k].t++;}
        for(let cycle=2;cycle<=6;cycle++){if(R.length>=cycle*2&&R.slice(0,cycle).join(',')===R.slice(cycle,cycle*2).join(',')){if(!this.cycleStats[cycle])this.cycleStats[cycle]={count:0,next:{}}; this.cycleStats[cycle].count++; const nxt=R[cycle]; this.cycleStats[cycle].next[nxt]=(this.cycleStats[cycle].next[nxt]||0)+1;}}
        this.markovDice.themDuLieu([d1,d2,d3]);
        if(this.history.length>2000){this.history.shift();this.diceHistory.shift();}
    }

    _getResults(){return this.history.map(h=>h.result).reverse();}

    _collectSignals(){
        const R=this._getResults(),data=this.history.slice().reverse(),lastDice=this.diceHistory[this.diceHistory.length-1]||[0,0,0];
        const [d1,d2,d3]=lastDice,lastTotal=data[0]?.total||0,S=[];
        const add=(pred,conf,id,name)=>{if(conf>=this.threshold){const w=this.weights[id]||1.0,perf=this.performance[id];let adjW=w; if(perf&&perf.t>=10){const acc=perf.c/perf.t; if(acc<0.3)return; adjW=w*(0.3+acc*0.7);} S.push({pred,conf,weight:adjW,id,name});}};

        // Tín hiệu mạnh từ tổng điểm
        if(lastTotal<=4)add('T',82,'score_low',`Tổng ${lastTotal} → Tài`);
        if(lastTotal>=17)add('X',80,'score_high',`Tổng ${lastTotal} → Xỉu`);
        if(d1===d2&&d2===d3){const k=`${d1},${d2},${d3}`,st=this.tripleStats[k]; add(d1>=4?'X':'T',st&&st.t>=3?Math.round(Math.max(st.T,st.X)/st.t*100):72,'triple',`3 mặt ${d1}`);}
        if(lastDice.filter(x=>x===1).length>=2){const st=this.pairStats['1-2:1']||this.pairStats['2-3:1']||this.pairStats['1-3:1']; add('T',st&&st.t>=5?Math.round(st.T/st.t*100):70,'pair1','Cặp 1 → Tài');}
        if(lastDice.filter(x=>x===6).length>=2){const st=this.pairStats['1-2:6']||this.pairStats['2-3:6']||this.pairStats['1-3:6']; add('X',st&&st.t>=5?Math.round(st.X/st.t*100):68,'pair6','Cặp 6 → Xỉu');}

        let streak=1; for(let i=1;i<R.length;i++){if(R[i]===R[0])streak++;else break;}
        if(streak>=2){const bk=Math.min(streak,20),bd=this.betStats[bk];
            if(streak<=3)add(R[0],60,`bet_${streak}`,`Bệt ${streak} → Tiếp`);
            else if(streak<=5){const g=bd&&bd.t>=5?bd.gay/bd.t>0.5:false; add(g?(R[0]==='T'?'X':'T'):R[0],g?68:64,`bet_${streak}`,`Bệt ${streak} → ${g?'Gãy':'Tiếp'}`);}
            else{const g=bd&&bd.t>=3?bd.gay/bd.t>0.6:true; const p=g?(R[0]==='T'?'X':'T'):R[0]; add(p,g?75+streak:66,`bet_${streak}`,`Bệt ${streak} → ${g?'GÃY':'Tiếp'}`);}
        }

        let alt=1; for(let i=1;i<R.length;i++){if(R[i]!==R[i-1])alt++;else break;}
        if(alt>=4&&alt<=6)add(R[0]==='T'?'X':'T',62+alt,'c11',`Cầu 1-1 (${alt})`);
        else if(alt>=7)add(R[0]==='T'?'X':'T',70+alt,'c11_long',`Cầu 1-1 DÀI (${alt})`);

        for(const [sz,id] of [[2,'c22'],[3,'c33'],[4,'c44'],[5,'c55']]){
            let cnt=0; for(let i=0;i<R.length-sz+1;i+=sz){if(R.slice(i,i+sz).every(r=>r===R[i]))cnt++;else break;}
            if(cnt>=1){const pred=cnt>=2?(R[(cnt-1)*sz]==='T'?'X':'T'):R[(cnt-1)*sz]; add(pred,65+cnt*5,id,`Cầu ${sz}-${sz} (${cnt} bộ)`);}
        }

        if(R.length>=5){const l5=R.slice(0,5); if(l5[0]!==l5[1]&&l5[1]!==l5[2]&&l5[2]!==l5[3]&&l5[3]!==l5[4]&&l5[0]===l5[4])add(l5[0]==='T'?'X':'T',80,'tamgiac','Tam giác');}
        let zig=0; for(let i=1;i<R.length;i++){if(R[i]!==R[i-1])zig++;else break;}
        if(zig>=5)add(R[0]==='T'?'X':'T',65+zig*2,'zigzag',`Zigzag ${zig}`);
        if(R.length>=6){const l=R.slice(0,3),r=R.slice(3,6).reverse(); if(l.every((v,i)=>v===r[i])&&l[0]!==l[1])add(l[2]==='T'?'X':'T',66,'doixung','Đối xứng');}

        if(streak>=6)add(R[0]==='T'?'X':'T',75+streak,'rong',`Rồng ${streak} → GÃY`);
        if(streak>=5&&R[streak]&&R[streak]!==R[0])add(R[streak],70+streak,'daygay',`Dây gãy ${streak} → Theo mới`);

        if(R.length>=4&&R[0]!==R[1]&&R[1]===R[2]&&R[2]!==R[3]&&R[0]===R[3])add(R[0],68,'c121','1-2-1');
        if(R.length>=6){const[a,b,c,d,e,f]=R; if(b===c&&c!==d&&d!==e&&e===f)add(a,70,'c123','1-2-3'); if(a===b&&b===c&&d===e&&e===f&&a!==d)add(d,72,'c321','3-2-1'); if(a===b&&b!==c&&c!==d&&d===e&&e===f&&a!==d)add(d,66,'c212','2-1-2'); if(a!==b&&b===c&&c===d&&d!==e&&e===f)add(a,68,'c1221','1-2-2-1'); if(a===b&&b!==c&&c===d&&d!==e&&e===f&&a!==d)add(a,68,'c2112','2-1-1-2');}

        if(R.length>=6){const skip=[]; for(let i=0;i<Math.min(R.length,12);i+=2)skip.push(R[i]); if(skip.length>=3){if(skip.slice(0,3).every(r=>r===skip[0]))add(skip[0],68,'nhaycoc','Nhảy cóc cùng màu'); else if(skip.slice(0,3).every((v,i,a)=>i===0||v!==a[i-1]))add(skip[0]==='T'?'X':'T',66,'nhaycoc','Nhảy cóc đảo');}}
        if(R.length>=5){const t5=R.slice(0,5).filter(r=>r==='T').length; if(t5>=4)add('T',70,'nhipnghieng',`Nhịp nghiêng Tài (${t5}/5)`); else if(t5<=1)add('X',70,'nhipnghieng',`Nhịp nghiêng Xỉu (${5-t5}/5)`);}
        if(R.length>=4){const t4=R.slice(0,4).filter(r=>r==='T').length; if(t4===3)add('X',68,'3van1','3 ván 1 (3T-1X)'); else if(t4===1)add('T',68,'3van1','3 ván 1 (3X-1T)');}
        const betPat=this._analyzeCauBet(R); if(betPat&&betPat.length>=4){const before=R.slice(betPat.length,betPat.length+4),prevBet=this._analyzeCauBet(before); if(prevBet&&prevBet.type!==betPat.type)add(betPat.type==='T'?'X':'T',76,'becau','Bẻ cầu');}
        for(let cycle=2;cycle<=6;cycle++){const st=this.cycleStats[cycle]; if(st&&st.count>=3){const next=st.next,total=Object.values(next).reduce((a,b)=>a+b,0); if(total>0){const pred=next['T']>next['X']?'T':'X',conf=Math.round(Math.max(next['T']||0,next['X']||0)/total*100); if(conf>=60){add(pred,conf,'chuky',`Chu kỳ ${cycle}`);break;}}}}
        if(R.length>=6){for(let gap=2;gap<=3;gap++){let ok=true;const ref=R[0]; for(let i=0;i<Math.min(R.length,12);i+=(gap+1)){if(R[i]!==ref){ok=false;break;}} if(ok){add(ref,68,'gap',`Cầu gấp ${gap+1}`);break;}}}
        let zz=0; for(let i=0;i<R.length-2;i++){if(R[i]!==R[i+1]&&R[i+1]!==R[i+2]&&R[i]===R[i+2])zz++;else break;} if(zz>=3)add(R[0]==='T'?'X':'T',65+zz*2,'ziczac',`Ziczac ${zz}`);
        let pc=0; for(let i=0;i<R.length-1;i+=2){if(R[i]===R[i+1])pc++;else break;} if(pc>=2){const same=R[0]===R[2];add(same?R[0]:(R[0]==='T'?'X':'T'),65+pc*3,'doi',`Cầu đôi ${pc}`);}

        const totalFaces=Object.values(this.faceFreq).reduce((a,b)=>a+b,0);
        if(totalFaces>20){let hot=1,hc=0,cold=1,cc=Infinity; for(let f=1;f<=6;f++){if(this.faceFreq[f]>hc){hc=this.faceFreq[f];hot=f;} if(this.faceFreq[f]<cc){cc=this.faceFreq[f];cold=f;}} if(hot>=4)add('T',60,'face_hot',`Mặt nóng ${hot}`); if(cold<=3)add('X',58,'face_cold',`Mặt lạnh ${cold}`);}
        for(let pos=0;pos<3;pos++){const from=lastDice[pos],trans=this.faceTrans[pos]?.[from]; if(trans){let best=1,bc=0,tot=0; for(let t=1;t<=6;t++){const c=trans[t]||0;tot+=c;if(c>bc){bc=c;best=t;}} if(tot>=10&&bc/tot>0.35)add(best>=4?'T':'X',Math.round(55+(bc/tot)*25),'face_trans',`Mặt ${pos+1}: ${from}→${best}`);}}
        const pairs=[]; if(d1===d2)pairs.push(`1-2:${d1}`); if(d2===d3)pairs.push(`2-3:${d2}`); if(d1===d3)pairs.push(`1-3:${d1}`);
        pairs.forEach(k=>{const st=this.pairStats[k]; if(st&&st.t>=5){const p=st.T/st.t; if(p>0.6)add('T',Math.round(p*100),'dice_pair',`Cặp ${k} → Tài`); else if(p<0.4)add('X',Math.round((1-p)*100),'dice_pair',`Cặp ${k} → Xỉu`);}});
        if(data.length>=2){const prevT=data[1].total,key=`${prevT}->${lastTotal}`,sp=this.scorePatterns[key]; if(sp&&sp.c>=3){const tn=sp.nextT+sp.nextX; if(tn>=3){const p=sp.nextT/tn; if(p>0.6)add('T',Math.round(p*100),'dice_score',`Tổng ${key} → Tài`); else if(p<0.4)add('X',Math.round((1-p)*100),'dice_score',`Tổng ${key} → Xỉu`);}}}

        if(data.length>=10){const sums=data.slice(0,10).map(d=>d.total),a5=sums.slice(0,5).reduce((a,b)=>a+b,0)/5,a10=sums.reduce((a,b)=>a+b,0)/10; if(a5>a10+1.5)add('X',68,'sum_trend','Tổng tăng → Xỉu'); if(a5<a10-1.5)add('T',68,'sum_trend','Tổng giảm → Tài');}
        const currR=R[0],t2t=this.markovChain['T->T']||0,t2x=this.markovChain['T->X']||0,x2t=this.markovChain['X->T']||0,x2x=this.markovChain['X->X']||0;
        if(currR==='T'){const tot=t2t+t2x; if(tot>=10){const prob=t2t/tot; if(prob>0.55)add('T',Math.round(55+prob*20),'markov',`Markov: T→T ${Math.round(prob*100)}%`); else if(prob<0.45)add('X',Math.round(55+(1-prob)*20),'markov',`Markov: T→X ${Math.round((1-prob)*100)}%`);}}
        else{const tot=x2t+x2x; if(tot>=10){const prob=x2x/tot; if(prob>0.55)add('X',Math.round(55+prob*20),'markov',`Markov: X→X ${Math.round(prob*100)}%`); else if(prob<0.45)add('T',Math.round(55+(1-prob)*20),'markov',`Markov: X→T ${Math.round((1-prob)*100)}%`);}}
        const tC=R.filter(r=>r==='T').length,imb=Math.abs(tC-(R.length-tC))/R.length;
        if(imb>0.12)add(tC<R.length/2?'T':'X',Math.round(58+imb*40),'distribution','Phân bố lệch');
        if(R.length>=10){const l5=R.slice(0,5),p5=R.slice(5,10),tL=l5.filter(r=>r==='T').length,tP=p5.filter(r=>r==='T').length; if((tL>=4&&tP<=1)||(tL<=1&&tP>=4))add(tL>=4?'X':'T',78,'smartbet','Đảo xu hướng');}

        // Tích hợp tất cả thuật toán bổ sung
        const histObj = data.map(d=>({result:d.Ket_qua,total:d.Tong,dice:[d.Xuc_xac_1,d.Xuc_xac_2,d.Xuc_xac_3]}));
        const seq = R.join('');
        const mkMulti = predictMarkov(seq); if(mkMulti) add(mkMulti.prediction==='T'?'T':'X',mkMulti.confidence,'markov_multi','Markov đa bậc');
        const m1=markov1(R); if(m1)add(m1,60,'markov1','Markov bậc 1');
        const m2=markov2(R); if(m2)add(m2,62,'markov2','Markov bậc 2');
        const m3=markov3(R); if(m3)add(m3,64,'markov3','Markov bậc 3');
        const freq= predictWeightedFrequency(histObj); if(freq)add(freq.prediction==='Tài'?'T':'X',freq.confidence,'weighted_freq','Tần suất có trọng số');
        const cycle= predictCycle(seq); if(cycle)add(cycle.prediction==='Tài'?'T':'X',cycle.confidence,'predict_cycle','Chu kỳ');
        const trend= predictTrend(histObj); if(trend)add(trend.prediction==='Tài'?'T':'X',trend.confidence,'predict_trend','Xu hướng');
        const streakAI= predictStreak(histObj); if(streakAI)add(streakAI.prediction==='Tài'?'T':'X',streakAI.confidence,'predict_streak','Streak AI');
        const bayes= predictBayes(histObj); if(bayes)add(bayes.prediction==='Tài'?'T':'X',bayes.confidence,'bayes','Bayes');
        const fib= predictFibonacciByTotal(histObj); if(fib)add(fib.prediction==='Tài'?'T':'X',fib.confidence,'fibonacci_total','Fibonacci');
        const pair= predictPair(histObj); if(pair)add(pair.prediction==='Tài'?'T':'X',pair.confidence,'predict_pair','Cặp xúc xắc');
        const rsi= rsiPredict(R); if(rsi)add(rsi,65,'rsi','RSI');
        const bollinger= bollingerPredict(R); if(bollinger)add(bollinger,60,'bollinger','Bollinger');
        const macd= macdPredict(R); if(macd)add(macd,60,'macd','MACD');
        const stoch= stochasticPredict(R); if(stoch)add(stoch,60,'stochastic','Stochastic');
        const wr= williamsR(R); if(wr)add(wr,60,'williams_r','Williams %R');
        const cci= cciPredict(R); if(cci)add(cci,60,'cci','CCI');
        const entropy= entropyPrediction(R); if(entropy)add(entropy,60,'entropy','Entropy');
        const lr= linearRegression(R); if(lr)add(lr,55,'linear_regression','Linear Regression');
        const knn= knnPredict(R); if(knn)add(knn,55,'knn','KNN');
        const dt= decisionTree(R); if(dt)add(dt,55,'decision_tree','Decision Tree');
        const pm= patternMatching(R); if(pm)add(pm,55,'pattern_matching','Pattern Matching');
        const zigzag= zigzagPredict(R); if(zigzag)add(zigzag,60,'zigzag_detect','Zigzag Detect');
        for(const [name,detector] of Object.entries(PatternDetectors)){
            const res=detector(R); if(res){const id=name.replace('detect_','pattern_'); add(res.pred,res.conf,id,res.name);}
        }
        const breakCount= countBreakSignals(R);
        if(breakCount>=3)add(R[0]==='T'?'X':'T',60+breakCount*2,'break_signals',`Tín hiệu bẻ cầu (${breakCount})`);
        const mdRes=this.markovDice.phanTich(); if(mdRes)add(mdRes.prediction==='Tài'?'T':'X',mdRes.confidence,'markov_xuc_xac','Markov xúc xắc');

        if(S.length===0)add(R[0]==='T'?'X':'T',52,'cau_tu_nhien','Cầu tự nhiên');
        return S;
    }

    _analyzeCauBet(R){let s=1;for(let i=1;i<R.length;i++){if(R[i]===R[0])s++;else break;} return s>=2?{type:R[0],length:s}:null;}

    predict(){
        if(this.history.length<10){
            const last = this.history[this.history.length-1];
            return {
                action: 'CÂN NHẮC',
                prediction: last ? (last.result==='T'?'Xỉu':'Tài') : 'Tài',
                confidence: 50,
                signals: [],
                total: 0
            };
        }
        const signals=this._collectSignals();
        if(signals.length===0){
            const last = this.history[this.history.length-1];
            return {
                action: 'CÂN NHẮC',
                prediction: last ? (last.result==='T'?'Xỉu':'Tài') : 'Tài',
                confidence: 50,
                signals: [],
                total: 0
            };
        }
        let sT=0,sX=0; signals.forEach(s=>{if(s.pred==='T')sT+=s.conf*s.weight;else sX+=s.conf*s.weight;});
        let pred=sT>=sX?'Tài':'Xỉu',conf=Math.round(Math.max(sT,sX)/(sT+sX)*100);
        const diff=Math.abs(sT-sX)/(sT+sX); if(diff<0.15)conf=Math.max(50,conf-10); if(signals.length>=6&&diff>0.3)conf=Math.min(92,conf+5);
        if(this.loseStreak>=this.REVERSAL_THRESHOLD){pred=pred==='Tài'?'Xỉu':'Tài';conf=Math.max(50,conf-10);}
        this.lastPred=pred; this.lastPatterns=signals.map(s=>s.id);
        return{action:conf>=65?'ĐẶT':'CÂN NHẮC',prediction:pred,confidence:Math.max(50,Math.min(92,conf)),signals:signals.slice(0,5).map(s=>s.name),total:signals.length};
    }

    feedback(actual){
        const act=actual==='Tài'?'T':'X'; if(!this.lastPred)return;
        const correct=this.lastPred===act;
        this.recentResults.push(correct); if(this.recentResults.length>50)this.recentResults.shift();
        if(correct){this.winStreak++;this.loseStreak=0;}else{this.loseStreak++;this.winStreak=0;}
        this.lastPatterns.forEach(id=>{
            if(!this.performance[id])this.performance[id]={c:0,t:0};
            this.performance[id].t++; if(correct)this.performance[id].c++;
            const rate=this.performance[id].t>=10?this.performance[id].c/this.performance[id].t:0.5;
            let w=this.weights[id]||1.0; if(rate>0.65)w=Math.min(3.0,w*1.15);else if(rate<0.35)w=Math.max(0.15,w*0.85);
            this.weights[id]=w;
        });
        if(this.recentResults.length>=10){const acc=this.recentResults.filter(r=>r).length/this.recentResults.length; this.threshold=acc>0.65?48:acc<0.45?62:55;}
    }

    getStats(){
        const total=this.recentResults.length,correct=this.recentResults.filter(r=>r).length;
        return{accuracy:total>0?(correct/total*100).toFixed(1)+'%':'0%',threshold:this.threshold,winStreak:this.winStreak,loseStreak:this.loseStreak,activePatterns:Object.keys(this.performance).length,totalHistory:this.history.length};
    }
}

// ==================== 2. KHỞI TẠO DỰ ĐOÁN ====================
const predictorHU = new AnhlakhoiGodAI();
const predictorMD5 = new AnhlakhoiGodAI();

let predictionHistory = { hu: [], md5: [] };

// ==================== 3. TIỆN ÍCH LƯU TRỮ ====================
function loadJSON(filename, defaultValue) {
  try { if (fs.existsSync(filename)) return JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch (e) { console.error(`Lỗi load ${filename}:`, e.message); }
  return defaultValue;
}

function saveJSON(filename, data) {
  try { fs.writeFileSync(filename, JSON.stringify(data, null, 2)); }
  catch (e) { console.error(`Lỗi save ${filename}:`, e.message); }
}

async function initializeData() {
  let sessionsStore = loadJSON(SESSIONS_FILE, { hu: [], md5: [] });
  
  const loadSessionsToPredictor = (predictor, sessions) => {
    const ordered = sessions.slice().reverse();
    ordered.forEach(s => {
      predictor.addSession({
        ket_qua: s.Ket_qua,
        tong: s.Tong,
        xuc_xac_1: s.Xuc_xac_1,
        xuc_xac_2: s.Xuc_xac_2,
        xuc_xac_3: s.Xuc_xac_3,
        thoi_gian: s.Thoi_gian || new Date().toISOString()
      });
    });
  };
  
  loadSessionsToPredictor(predictorHU, sessionsStore.hu);
  loadSessionsToPredictor(predictorMD5, sessionsStore.md5);
  
  const learningData = loadJSON(LEARNING_FILE, {});
  if (learningData.hu) {
    predictorHU.weights = { ...predictorHU.weights, ...learningData.hu.weights };
    predictorHU.performance = learningData.hu.performance || {};
    predictorHU.threshold = learningData.hu.threshold || 55;
    predictorHU.loseStreak = learningData.hu.loseStreak || 0;
  }
  if (learningData.md5) {
    predictorMD5.weights = { ...predictorMD5.weights, ...learningData.md5.weights };
    predictorMD5.performance = learningData.md5.performance || {};
    predictorMD5.threshold = learningData.md5.threshold || 55;
    predictorMD5.loseStreak = learningData.md5.loseStreak || 0;
  }
  
  const histData = loadJSON(HISTORY_FILE, { hu: [], md5: [] });
  predictionHistory = histData;
  
  console.log(`✅ Dữ liệu đã tải - HU: ${sessionsStore.hu.length} phiên, MD5: ${sessionsStore.md5.length} phiên`);
  return sessionsStore;
}

let sessionsStore;

// ==================== 4. CHUYỂN ĐỔI API ====================
function transformApiData(apiData) {
  if (!apiData?.list?.length) return null;
  return apiData.list.map(item => ({
    Phien: item.id,
    Ket_qua: item.resultTruyenThong === 'TAI' ? 'Tài' : 'Xỉu',
    Xuc_xac_1: item.dices[0],
    Xuc_xac_2: item.dices[1],
    Xuc_xac_3: item.dices[2],
    Tong: item.point,
    Thoi_gian: item.time || new Date().toISOString()
  }));
}

async function fetchData(url) {
  try {
    const response = await axios.get(url, { timeout: 15000, params: { limit: FETCH_PER_REQUEST } });
    return transformApiData(response.data);
  } catch (e) {
    console.error(`❌ Fetch lỗi:`, e.message);
    return null;
  }
}

// ==================== 5. QUẢN LÝ PHIÊN ====================
function mergeSessions(existing, newData) {
  if (!newData?.length) return { sessions: existing, added: [] };
  const existingIds = new Set(existing.map(s => s.Phien));
  const added = newData.filter(s => !existingIds.has(s.Phien));
  existing.unshift(...added);
  existing.sort((a, b) => b.Phien - a.Phien);
  if (existing.length > 5000) existing = existing.slice(0, 5000);
  return { sessions: existing, added };
}

async function accumulateSession(type, predictor, url) {
  const newData = await fetchData(url);
  if (!newData) return;
  
  const result = mergeSessions(sessionsStore[type], newData);
  sessionsStore[type] = result.sessions;
  
  result.added.sort((a, b) => a.Phien - b.Phien).forEach(s => {
    predictor.addSession({
      ket_qua: s.Ket_qua,
      tong: s.Tong,
      xuc_xac_1: s.Xuc_xac_1,
      xuc_xac_2: s.Xuc_xac_2,
      xuc_xac_3: s.Xuc_xac_3,
      thoi_gian: s.Thoi_gian
    });
  });
  
  if (result.added.length > 0) {
    console.log(`📥 [${type.toUpperCase()}] +${result.added.length} phiên mới | Tổng: ${sessionsStore[type].length}`);
    saveAllData();
  }
  
  if (sessionsStore[type].length >= MIN_SESSIONS && !isReady[type]) {
    isReady[type] = true;
    console.log(`🎉 [${type.toUpperCase()}] ĐÃ ĐỦ PHIÊN! Bắt đầu dự đoán.`);
  }
}

let isReady = { hu: false, md5: false };

// ==================== 6. DỰ ĐOÁN & LƯU LỊCH SỬ ====================
function predictAndRecord(type, predictor) {
  if (sessionsStore[type].length === 0) return null;
  const latestPhien = sessionsStore[type][0].Phien;
  const nextPhien = latestPhien + 1;
  
  const predictionResult = predictor.predict();
  if (!predictionResult) return null; // sẽ không xảy ra vì predict luôn trả về
  
  predictionHistory[type].unshift({
    phien: nextPhien,
    du_doan: predictionResult.prediction.toLowerCase(),
    ket_qua: null,
    danh_gia: null
  });
  
  if (predictionHistory[type].length > 100) {
    predictionHistory[type] = predictionHistory[type].slice(0, 100);
  }
  
  return {
    nextPhien,
    prediction: predictionResult.prediction,
    confidence: predictionResult.confidence
  };
}

// ==================== 7. CẬP NHẬT KẾT QUẢ THỰC TẾ ====================
function updateActualResults(type, predictor) {
  const data = sessionsStore[type];
  if (!data.length) return;
  
  predictionHistory[type].forEach(entry => {
    if (entry.ket_qua !== null) return;
    const actualSession = data.find(s => s.Phien === entry.phien);
    if (actualSession) {
      entry.ket_qua = actualSession.Ket_qua.toLowerCase();
      entry.danh_gia = entry.du_doan === entry.ket_qua ? 'thang' : 'thua';
      predictor.feedback(actualSession.Ket_qua);
    }
  });
  
  if (predictionHistory[type].length > 100) {
    predictionHistory[type] = predictionHistory[type].slice(0, 100);
  }
}

// ==================== 8. LƯU DỮ LIỆU ====================
function saveAllData() {
  saveJSON(SESSIONS_FILE, sessionsStore);
  saveJSON(HISTORY_FILE, predictionHistory);
  const learningState = {
    hu: {
      weights: predictorHU.weights,
      performance: predictorHU.performance,
      threshold: predictorHU.threshold,
      loseStreak: predictorHU.loseStreak
    },
    md5: {
      weights: predictorMD5.weights,
      performance: predictorMD5.performance,
      threshold: predictorMD5.threshold,
      loseStreak: predictorMD5.loseStreak
    }
  };
  saveJSON(LEARNING_FILE, learningState);
}

// ==================== 9. API ENDPOINTS ====================
app.get('/lc79-hu', async (req, res) => {
  await accumulateSession('hu', predictorHU, API_URL_HU);
  if (!isReady.hu) {
    return res.json({ status: 'accumulating', progress: `${sessionsStore.hu.length}/${MIN_SESSIONS}` });
  }
  
  updateActualResults('hu', predictorHU);
  let pred = predictAndRecord('hu', predictorHU);
  // Dự phòng nếu predictor lỗi (không thể xảy ra)
  if (!pred) {
    const latest = sessionsStore.hu[0];
    pred = {
      nextPhien: latest ? latest.Phien + 1 : 0,
      prediction: latest ? (latest.Ket_qua === 'Tài' ? 'Xỉu' : 'Tài') : 'Tài',
      confidence: 51
    };
    predictionHistory.hu.unshift({
      phien: pred.nextPhien,
      du_doan: pred.prediction.toLowerCase(),
      ket_qua: null,
      danh_gia: null
    });
    if (predictionHistory.hu.length > 100) predictionHistory.hu = predictionHistory.hu.slice(0, 100);
  }
  
  const latestSession = sessionsStore.hu[0];
  const stats = predictorHU.getStats();
  res.json({
    phien_truoc: {
      Phien: latestSession.Phien,
      Xuc_xac_1: latestSession.Xuc_xac_1,
      Xuc_xac_2: latestSession.Xuc_xac_2,
      Xuc_xac_3: latestSession.Xuc_xac_3,
      Tong: latestSession.Tong,
      Ket_qua: latestSession.Ket_qua
    },
    phien_hien_tai: {
      Phien: pred.nextPhien,
      Du_doan: pred.prediction,
      Do_tin_cay: `${pred.confidence}%`
    },
    id: '@vuaoccac',
    stats: stats,
    history: predictionHistory.hu.slice(0, 10) // 10 phiên gần nhất
  });
});

app.get('/lc79-md5', async (req, res) => {
  await accumulateSession('md5', predictorMD5, API_URL_MD5);
  if (!isReady.md5) {
    return res.json({ status: 'accumulating', progress: `${sessionsStore.md5.length}/${MIN_SESSIONS}` });
  }
  
  updateActualResults('md5', predictorMD5);
  let pred = predictAndRecord('md5', predictorMD5);
  if (!pred) {
    const latest = sessionsStore.md5[0];
    pred = {
      nextPhien: latest ? latest.Phien + 1 : 0,
      prediction: latest ? (latest.Ket_qua === 'Tài' ? 'Xỉu' : 'Tài') : 'Tài',
      confidence: 51
    };
    predictionHistory.md5.unshift({
      phien: pred.nextPhien,
      du_doan: pred.prediction.toLowerCase(),
      ket_qua: null,
      danh_gia: null
    });
    if (predictionHistory.md5.length > 100) predictionHistory.md5 = predictionHistory.md5.slice(0, 100);
  }
  
  const latestSession = sessionsStore.md5[0];
  const stats = predictorMD5.getStats();
  res.json({
    phien_truoc: {
      Phien: latestSession.Phien,
      Xuc_xac_1: latestSession.Xuc_xac_1,
      Xuc_xac_2: latestSession.Xuc_xac_2,
      Xuc_xac_3: latestSession.Xuc_xac_3,
      Tong: latestSession.Tong,
      Ket_qua: latestSession.Ket_qua
    },
    phien_hien_tai: {
      Phien: pred.nextPhien,
      Du_doan: pred.prediction,
      Do_tin_cay: `${pred.confidence}%`
    },
    id: '@vuaoccac',
    stats: stats,
    history: predictionHistory.md5.slice(0, 10)
  });
});

app.get('/lc79-hu/history', (req, res) => {
  updateActualResults('hu', predictorHU);
  res.json(predictionHistory.hu);
});

app.get('/lc79-md5/history', (req, res) => {
  updateActualResults('md5', predictorMD5);
  res.json(predictionHistory.md5);
});

app.get('/status', (req, res) => {
  res.json({
    hu: { 
      sessions: sessionsStore?.hu?.length || 0, 
      ready: isReady.hu,
      stats: predictorHU.getStats()
    },
    md5: { 
      sessions: sessionsStore?.md5?.length || 0, 
      ready: isReady.md5,
      stats: predictorMD5.getStats()
    }
  });
});

// ==================== 10. KHỞI ĐỘNG ====================
async function main() {
  sessionsStore = await initializeData();
  
  isReady.hu = sessionsStore.hu.length >= MIN_SESSIONS;
  isReady.md5 = sessionsStore.md5.length >= MIN_SESSIONS;
  
  console.log(`Trạng thái - HU: ${isReady.hu ? 'Sẵn sàng' : 'Đang tích lũy'}, MD5: ${isReady.md5 ? 'Sẵn sàng' : 'Đang tích lũy'}`);
  
  if (!isReady.hu || !isReady.md5) {
    console.log('Bắt đầu tích lũy phiên để đạt 100...');
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
    console.log('Đã đủ 100 phiên! Bắt đầu dự đoán tự động.');
  }
  
  setInterval(async () => {
    await accumulateSession('hu', predictorHU, API_URL_HU);
    await accumulateSession('md5', predictorMD5, API_URL_MD5);
    updateActualResults('hu', predictorHU);
    updateActualResults('md5', predictorMD5);
    saveAllData();
  }, AUTO_SAVE_INTERVAL);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VuaOcCac God AI Server chạy tại cổng ${PORT}`);
  main();
});
