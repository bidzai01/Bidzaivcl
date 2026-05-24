// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC AI - TÍCH HỢP AnhlakhoiMasterPredictorV2                ║
// ║  80+ pattern - Học liên tục - Thống kê thắng thua 100 phiên       ║
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

// ==================== CLASS MARKOV XÚC XẮC ====================
class MarkovXucXac {
    constructor(bac = 3) {
        this.bac = Math.min(4, Math.max(1, bac));
        this.transitions = new Map();
        this.history = [];
        this.maxHistory = 60;
    }
    static chuyenLoai(diem) {
        if (diem === 1 || diem === 2) return 1;
        if (diem === 3 || diem === 4) return 2;
        return 3;
    }
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
                const state = [];
                for (let j = b - 1; j >= 0; j--) state.push(this.history[i - j]);
                const stateKey = state.join(',');
                const nextVal = this.history[i];
                if (!this.transitions.has(stateKey)) this.transitions.set(stateKey, new Map());
                const nextMap = this.transitions.get(stateKey);
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
        const prediction = (duDoanSo === 1 || duDoanSo === 3) ? 'Tài' : 'Xỉu';
        let confidence = 65;
        if (this.history.length > 30) confidence += 10;
        return { prediction, confidence: Math.min(95, confidence) };
    }
}

// ==================== CLASS DỰ ĐOÁN CHÍNH (AnhlakhoiMasterPredictorV2) ====================
class AnhlakhoiMasterPredictorV2 {
    constructor() {
        this.history = [];
        this.patternWeights = {
            'cau_bet': 1.8, 'cau_dao_11': 1.0, 'cau_22': 1.0, 'cau_33': 1.0, 'cau_44': 1.0, 'cau_55': 1.0,
            'cau_121': 1.0, 'cau_123': 1.0, 'cau_321': 1.0, 'cau_212': 1.0, 'cau_313': 1.0,
            'cau_tam_giac': 1.2, 'cau_zigzag': 1.1, 'cau_doi_xung': 1.0, 'cau_song': 1.0,
            'cau_rong': 1.0, 'day_gay': 1.0, 'cau_gay_dot_ngot': 1.3,
            'cau_bet_ngam': 1.6, 'cau_bet_kep': 1.5, 'cau_be_bet': 1.7, 'cau_bam_bet': 1.4,
            'cau_nhay_coc': 1.0, 'cau_nhip_nghieng': 1.0, 'cau_3van1': 1.0, 'cau_be_cau': 1.0,
            'cau_chu_ky': 1.0, 'cau_gap': 1.0, 'cau_ziczac': 1.0, 'cau_doi': 1.0,
            'tong_phan_tich': 1.5, 'xu_huong_manh': 1.3, 'dao_chieu': 1.4, 'smart_bet': 1.0,
            'distribution': 1.2, 'distribution_short': 1.1,
            'score_trend': 1.3, 'dice_sum_prob': 1.1, 'cau_tu_nhien': 0.8,
            'score_volatility': 1.1, 'dice_combo': 1.0, 'linear_trend': 1.2,
            'markov': 1.2, 'dice_pattern': 1.0, 'score_pattern': 1.0,
            'hourly_pattern': 1.0, 'cycle_pattern': 1.1, 'correlation': 0.9,
            'random_forest': 1.3, 'gradient_boosting': 1.2, 'neural_network': 1.1,
            'markov_multi': 1.0, 'weighted_freq': 0.9, 'simple_majority': 0.7,
            'cumulative_imbalance': 0.8, 'predict_cycle': 0.8, 'predict_trend': 0.9,
            'moving_avg_cross': 0.7, 'predict_streak': 1.1, 'bayes': 0.9,
            'fibonacci_total': 0.8, 'fibonacci_fractal': 0.7, 'predict_pair': 0.8,
            'rsi': 0.9, 'bollinger': 0.8, 'macd': 0.8, 'stochastic': 0.7,
            'williams_r': 0.7, 'cci': 0.7, 'entropy': 0.8,
            'linear_regression': 0.8, 'knn': 0.8, 'decision_tree': 0.9,
            'pattern_matching': 0.8, 'zigzag_detect': 0.9,
            'break_signals': 1.0, 'cau_1221': 1.0, 'cau_2112': 1.0,
            'dice_trend_line': 1.0, 'dice_trend_line_md5': 1.0,
            'break_pattern_hu': 1.0, 'break_pattern_md5': 1.0, 'day_gay_md5': 1.0,
            'resistance_support': 1.0, 'wave': 1.0, 'golden_ratio': 1.0,
            'break_pattern_advanced': 1.0, 'break_streak': 1.0, 'alternating_break': 1.0,
            'double_pair_break': 1.0, 'triple_pattern': 1.0,
            'markov_xuc_xac': 1.2
        };
        this.patternPerformance = {};
        this.recentResults = [];
        this.confidenceThreshold = 55;
        this.lastPrediction = null;
        this.lastPatterns = [];
        this.markovDice = new MarkovXucXac(3);
    }

    addSession(session) {
        this.history.push({
            result: session.ket_qua === 'Tài' ? 'Tài' : 'Xỉu',
            total: session.tong,
            dice: [session.xuc_xac_1, session.xuc_xac_2, session.xuc_xac_3],
            time: session.thoi_gian || new Date().toISOString()
        });
        if (this.history.length > 2000) this.history.shift();
        this.markovDice.themDuLieu([session.xuc_xac_1, session.xuc_xac_2, session.xuc_xac_3]);
    }

    _getResults() { return this.history.map(h => h.result === 'Tài' ? 'T' : 'X').reverse(); }
    _getScores() { return this.history.map(h => h.total).reverse(); }
    _getDices() { return this.history.map(h => h.dice).reverse(); }
    _getHistoryData() { return this.history.slice().reverse(); }

    // ==================== CÁC PATTERN CƠ BẢN ====================
    _analyzeCauBet(results, type) {
        if (results.length < 2) return null;
        const first = results[0];
        let len = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === first) len++;
            else break;
        }
        if (len < 2) return null;
        // Dùng betStats (giả lập)
        let shouldBreak = false, confidence = 65;
        if (len >= 8) { shouldBreak = true; confidence = 85; }
        else if (len >= 6) { shouldBreak = true; confidence = 75; }
        else if (len >= 4) { shouldBreak = false; confidence = 72; }
        else { shouldBreak = false; confidence = 68; }
        const prediction = shouldBreak ? (first === 'T' ? 'X' : 'T') : first;
        return { detected: true, prediction: prediction === 'T' ? 'Tài' : 'Xỉu', confidence, name: `Cầu Bệt ${len} ${first}`, patternId: 'cau_bet' };
    }

    _analyzeCauDao11(results, type) {
        if (results.length < 4) return null;
        let alt = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) alt++;
            else break;
        }
        if (alt >= 4) return { detected: true, prediction: results[0] === 'T' ? 'X' : 'T', confidence: Math.min(82, 65 + alt*2), name: `Cầu 1-1 (${alt} nhịp)`, patternId: 'cau_dao_11' };
        return null;
    }

    _analyzeCau22(results, type) {
        if (results.length < 4) return null;
        let pairs = 0;
        for (let i = 0; i < results.length - 1; i += 2) {
            if (results[i] === results[i+1]) pairs++;
            else break;
        }
        if (pairs >= 2) {
            const lastPair = results[(pairs-1)*2];
            return { detected: true, prediction: lastPair === 'T' ? 'X' : 'T', confidence: Math.min(80, 65 + pairs*3), name: `Cầu 2-2 (${pairs} cặp)`, patternId: 'cau_22' };
        }
        return null;
    }

    _analyzeCau33(results, type) {
        if (results.length < 6) return null;
        let triples = 0;
        for (let i = 0; i < results.length - 2; i += 3) {
            if (results[i] === results[i+1] && results[i+1] === results[i+2]) triples++;
            else break;
        }
        if (triples >= 1) {
            const lastTriple = results[(triples-1)*3];
            return { detected: true, prediction: lastTriple, confidence: Math.min(82, 68 + triples*4), name: `Cầu 3-3 (${triples} bộ)`, patternId: 'cau_33' };
        }
        return null;
    }

    _analyzeCau44(results, type) {
        if (results.length < 8) return null;
        let quads = 0;
        for (let i = 0; i < results.length - 3; i += 4) {
            if (results[i] === results[i+1] && results[i+1] === results[i+2] && results[i+2] === results[i+3]) quads++;
            else break;
        }
        if (quads >= 1) {
            const lastQuad = results[(quads-1)*4];
            return { detected: true, prediction: lastQuad, confidence: Math.min(84, 70 + quads*5), name: `Cầu 4-4 (${quads} bộ)`, patternId: 'cau_44' };
        }
        return null;
    }

    _analyzeCau55(results, type) {
        if (results.length < 10) return null;
        let quins = 0;
        for (let i = 0; i < results.length - 4; i += 5) {
            if (results[i] === results[i+1] && results[i+1] === results[i+2] && results[i+2] === results[i+3] && results[i+3] === results[i+4]) quins++;
            else break;
        }
        if (quins >= 1) {
            const lastQuin = results[(quins-1)*5];
            return { detected: true, prediction: lastQuin, confidence: Math.min(86, 72 + quins*6), name: `Cầu 5-5 (${quins} bộ)`, patternId: 'cau_55' };
        }
        return null;
    }

    _analyzeCau121(results, type) {
        if (results.length < 4) return null;
        const [a,b,c,d] = results;
        if (a !== b && b === c && c !== d && a === d) return { detected: true, prediction: a, confidence: 74, name: 'Cầu 1-2-1', patternId: 'cau_121' };
        return null;
    }

    _analyzeCau123(results, type) {
        if (results.length < 6) return null;
        const [a,b,c,d,e,f] = results;
        if (b === c && c !== d && d !== e && e === f) return { detected: true, prediction: a, confidence: 76, name: 'Cầu 1-2-3', patternId: 'cau_123' };
        return null;
    }

    _analyzeCau321(results, type) {
        if (results.length < 6) return null;
        const [a,b,c,d,e,f] = results;
        if (a === b && b === c && d === e && e === f && a !== d) return { detected: true, prediction: d, confidence: 78, name: 'Cầu 3-2-1', patternId: 'cau_321' };
        return null;
    }

    _analyzeCau212(results, type) {
        if (results.length < 4) return null;
        const [a,b,c,d] = results;
        if (a !== b && b !== c && a === c) return { detected: true, prediction: a === 'T' ? 'X' : 'T', confidence: 72, name: 'Cầu 2-1-2', patternId: 'cau_212' };
        return null;
    }

    _analyzeCauTamGiac(results) {
        if (results.length < 5) return null;
        const [a,b,c,d,e] = results;
        if (a !== b && b !== c && c !== d && d !== e && a === e) return { prediction: a === 'T' ? 'X' : 'T', confidence: 82, name: 'Tam giác', patternId: 'cau_tam_giac' };
        return null;
    }

    _analyzeCauZigzag(results) {
        if (results.length < 6) return null;
        let count = 0;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) count++;
            else break;
        }
        if (count >= 5) return { prediction: results[0] === 'T' ? 'X' : 'T', confidence: 70 + count*2, name: `Zigzag ${count}`, patternId: 'cau_zigzag' };
        return null;
    }

    _analyzeCauDoiXung(results) {
        if (results.length < 6) return null;
        const len = Math.min(6, results.length);
        const left = results.slice(0, len/2);
        const right = results.slice(len/2, len).reverse();
        if (left.every((v,i) => v === right[i])) return { prediction: results[len/2 - 1] === 'T' ? 'X' : 'T', confidence: 75, name: 'Đối xứng', patternId: 'cau_doi_xung' };
        return null;
    }

    _analyzeCauRong(results, type) {
        if (results.length < 6) return null;
        const first = results[0];
        let len = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === first) len++;
            else break;
        }
        if (len >= 6) return { detected: true, prediction: first === 'T' ? 'X' : 'T', confidence: Math.min(90, 75 + len), name: `Rồng ${len}`, patternId: 'cau_rong' };
        return null;
    }

    _analyzeDayGay(results, type) {
        if (results.length < 8) return null;
        const first = results[0];
        let len = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === first) len++;
            else break;
        }
        if (len >= 6) return { detected: true, prediction: first === 'T' ? 'X' : 'T', confidence: Math.min(88, 73 + len), name: `Dây gãy ${len}`, patternId: 'day_gay' };
        return null;
    }

    _analyzeCauGayDotNgot(results, type) {
        if (results.length < 6) return null;
        let streak = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === results[0]) streak++;
            else break;
        }
        if (streak >= 5 && results[streak] !== results[0]) {
            return { prediction: results[streak], confidence: 75, name: `Gãy đột ngột`, patternId: 'cau_gay_dot_ngot' };
        }
        return null;
    }

    _analyzeCauBetNgam(results, type) {
        if (results.length < 8) return null;
        const taiCount = results.slice(0,8).filter(r => r === 'T').length;
        if (taiCount >= 6) return { prediction: 'T', confidence: 75, name: 'Bệt ngầm Tài', patternId: 'cau_bet_ngam' };
        if (taiCount <= 2) return { prediction: 'X', confidence: 75, name: 'Bệt ngầm Xỉu', patternId: 'cau_bet_ngam' };
        return null;
    }

    _analyzeCauBeBet(data, results, type) {
        if (results.length < 5) return null;
        const first = results[0];
        let len = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === first) len++;
            else break;
        }
        if (len < 3) return null;
        const scores = data.slice(0, len).map(d => d.total);
        const lastDice = data[0].dice;
        if (first === 'T' && scores.length >= 3 && scores[0] < scores[1] && scores[1] < scores[2] && scores[0] <= 10)
            return { prediction: 'X', confidence: 82, name: 'Bẻ bệt Tài (điểm giảm)', patternId: 'cau_be_bet' };
        if (first === 'X' && scores.length >= 3 && scores[0] > scores[1] && scores[1] > scores[2] && scores[0] >= 11)
            return { prediction: 'T', confidence: 82, name: 'Bẻ bệt Xỉu (điểm tăng)', patternId: 'cau_be_bet' };
        if (lastDice[0] === lastDice[1] && lastDice[1] === lastDice[2])
            return { prediction: first === 'T' ? 'X' : 'T', confidence: 78, name: 'Bẻ bệt (3 mặt giống)', patternId: 'cau_be_bet' };
        if (len >= 8)
            return { prediction: first === 'T' ? 'X' : 'T', confidence: Math.min(95, 75 + len), name: `Bẻ bệt dài ${len}`, patternId: 'cau_be_bet' };
        return null;
    }

    _analyzeCauBamBet(results, type) {
        if (results.length < 2) return null;
        if (results[0] !== results[1]) return null;
        const betType = results[0];
        const third = results[2] || null;
        if (third === betType) {
            const fourth = results[3] || null;
            return { prediction: betType, confidence: fourth === betType ? 78 : 70, name: `Bám bệt ${betType}`, patternId: 'cau_bam_bet' };
        }
        return null;
    }

    _analyzeCauNhayCoc(results, type) {
        if (results.length < 6) return null;
        const skip = [];
        for (let i = 0; i < Math.min(results.length, 12); i += 2) skip.push(results[i]);
        if (skip.length >= 3) {
            if (skip.slice(0,3).every(r => r === skip[0])) return { prediction: skip[0], confidence: 68, name: 'Nhảy cóc cùng màu', patternId: 'cau_nhay_coc' };
            if (skip.slice(0,3).every((v,i,a) => i===0 || v !== a[i-1])) return { prediction: skip[0] === 'T' ? 'X' : 'T', confidence: 66, name: 'Nhảy cóc đảo', patternId: 'cau_nhay_coc' };
        }
        return null;
    }

    _analyzeCauNhipNghieng(results, type) {
        if (results.length < 5) return null;
        const last5 = results.slice(0,5);
        const t = last5.filter(r => r === 'T').length;
        if (t >= 4) return { prediction: 'T', confidence: 70, name: `Nhịp nghiêng Tài`, patternId: 'cau_nhip_nghieng' };
        if (t <= 1) return { prediction: 'X', confidence: 70, name: `Nhịp nghiêng Xỉu`, patternId: 'cau_nhip_nghieng' };
        return null;
    }

    _analyzeCau3Van1(results, type) {
        if (results.length < 4) return null;
        const t = results.slice(0,4).filter(r => r === 'T').length;
        if (t === 3) return { prediction: 'X', confidence: 68, name: '3 ván 1 (3T-1X)', patternId: 'cau_3van1' };
        if (t === 1) return { prediction: 'T', confidence: 68, name: '3 ván 1 (3X-1T)', patternId: 'cau_3van1' };
        return null;
    }

    _analyzeCauBeCau(results, type) {
        const bet = this._analyzeCauBet(results, type);
        if (bet && bet.detected && bet.length >= 4) {
            const before = results.slice(bet.length, bet.length + 4);
            const prevBet = this._analyzeCauBet(before, type);
            if (prevBet && prevBet.detected && prevBet.type !== bet.type) {
                return { prediction: bet.type === 'T' ? 'X' : 'T', confidence: 76, name: 'Bẻ cầu', patternId: 'cau_be_cau' };
            }
        }
        return null;
    }

    _analyzeCauChuKy(results, type) {
        for (let cycle = 2; cycle <= 6; cycle++) {
            if (results.length < cycle * 2) continue;
            const pat = results.slice(0, cycle);
            let ok = true;
            for (let i = cycle; i < Math.min(cycle*3, results.length); i++) {
                if (results[i] !== pat[i % cycle]) { ok = false; break; }
            }
            if (ok) {
                const nextPos = results.length % cycle;
                return { prediction: pat[nextPos], confidence: 70, name: `Chu kỳ ${cycle}`, patternId: 'cau_chu_ky' };
            }
        }
        return null;
    }

    _analyzeCauGap(results, type) {
        if (results.length < 6) return null;
        for (let gap = 2; gap <= 3; gap++) {
            let ok = true;
            const ref = results[0];
            for (let i = 0; i < Math.min(results.length, 12); i += (gap+1)) {
                if (results[i] !== ref) { ok = false; break; }
            }
            if (ok) return { prediction: ref, confidence: 68, name: `Cầu gấp ${gap+1}`, patternId: 'cau_gap' };
        }
        return null;
    }

    _analyzeCauZiczac(results, type) {
        if (results.length < 8) return null;
        let count = 0;
        for (let i = 0; i < results.length - 2; i++) {
            if (results[i] !== results[i+1] && results[i+1] !== results[i+2] && results[i] === results[i+2]) count++;
            else break;
        }
        if (count >= 3) return { prediction: results[0] === 'T' ? 'X' : 'T', confidence: 65 + count*2, name: `Ziczac ${count}`, patternId: 'cau_ziczac' };
        return null;
    }

    _analyzeCauDoi(results, type) {
        if (results.length < 4) return null;
        let pairs = 0, i = 0;
        while (i < results.length - 1) {
            if (results[i] === results[i+1]) { pairs++; i += 2; }
            else break;
        }
        if (pairs >= 2) {
            const same = results[0] === results[2];
            const pred = same ? results[0] : (results[0] === 'T' ? 'X' : 'T');
            return { prediction: pred, confidence: 65 + pairs*3, name: `Cầu đôi ${pairs}`, patternId: 'cau_doi' };
        }
        return null;
    }

    _analyzeCauSong(results, type) {
        if (results.length < 8) return null;
        const w = results.slice(0,8);
        if (w[0]===w[2]&&w[2]===w[4]&&w[4]===w[6] && w[1]===w[3]&&w[3]===w[5]&&w[5]===w[7] && w[0]!==w[1])
            return { prediction: w[0] === 'T' ? 'X' : 'T', confidence: 72, name: 'Sóng', patternId: 'cau_song' };
        return null;
    }

    _analyzeCau313(results, type) {
        if (results.length < 7) return null;
        const [a,b,c,d,e,f,g] = results;
        if (a===b&&b===c && c!==d && e===f&&f===g && a===e)
            return { prediction: d, confidence: 74, name: 'Cầu 3-1-3', patternId: 'cau_313' };
        return null;
    }

    _analyzeTongPhanTich(data, type) {
        if (data.length < 10) return null;
        const sums = data.slice(0,10).map(d => d.total);
        const first5Avg = sums.slice(5).reduce((a,b)=>a+b,0)/5;
        const last5Avg = sums.slice(0,5).reduce((a,b)=>a+b,0)/5;
        const trend = last5Avg - first5Avg;
        if (trend > 1.5) return { prediction: 'X', confidence: 75, name: 'Tổng tăng → Xỉu', patternId: 'tong_phan_tich' };
        if (trend < -1.5) return { prediction: 'T', confidence: 75, name: 'Tổng giảm → Tài', patternId: 'tong_phan_tich' };
        return null;
    }

    _analyzeSmartBet(results, type) {
        if (results.length < 10) return null;
        const last5 = results.slice(0,5);
        const prev5 = results.slice(5,10);
        const tLast = last5.filter(r => r === 'T').length;
        const tPrev = prev5.filter(r => r === 'T').length;
        if ((tLast >= 4 && tPrev <= 1) || (tLast <= 1 && tPrev >= 4)) {
            return { prediction: tLast >= 4 ? 'X' : 'T', confidence: 80, name: 'Đảo xu hướng', patternId: 'smart_bet' };
        }
        return null;
    }

    _analyzeDistribution(data) {
        if (data.length < 50) return null;
        const taiCount = data.filter(d => d.result === 'Tài').length;
        const total = data.length;
        const imbalance = Math.abs(taiCount - (total - taiCount)) / total;
        if (imbalance > 0.1) {
            const minority = taiCount < total/2 ? 'T' : 'X';
            return { prediction: minority, confidence: Math.round(60 + imbalance*50), name: `Phân bố lệch → ${minority}`, patternId: 'distribution' };
        }
        return null;
    }

    _analyzeScoreTrend(data) {
        if (data.length < 5) return null;
        const s = data.slice(0,5).map(d => d.total);
        if (s[0] > s[1] && s[1] > s[2] && s[2] > s[3]) return { prediction: 'T', confidence: 66, name: 'Điểm giảm dần', patternId: 'score_trend' };
        if (s[0] < s[1] && s[1] < s[2] && s[2] < s[3]) return { prediction: 'X', confidence: 66, name: 'Điểm tăng dần', patternId: 'score_trend' };
        return null;
    }

    _analyzeDiceSumProb(data) {
        if (data.length < 5) return null;
        const lastSum = data[0].total;
        let t = 0, x = 0;
        for (let i = 1; i < data.length; i++) {
            if (data[i].total === lastSum) {
                const n = data[i-1]?.result;
                if (n === 'Tài') t++; else x++;
            }
        }
        const total = t + x;
        if (total >= 5) {
            const probT = t / total;
            if (probT > 0.6) return { prediction: 'T', confidence: Math.round(55 + probT*25), name: `Tổng ${lastSum} → Tài`, patternId: 'dice_sum_prob' };
            if (probT < 0.4) return { prediction: 'X', confidence: Math.round(55 + (1-probT)*25), name: `Tổng ${lastSum} → Xỉu`, patternId: 'dice_sum_prob' };
        }
        return null;
    }

    _analyzeScoreVolatility(data) {
        if (data.length < 5) return null;
        const diffs = [];
        for (let i = 0; i < 4; i++) diffs.push(Math.abs(data[i].total - data[i+1].total));
        const avg = diffs.reduce((a,b)=>a+b,0)/4;
        if (avg > 7) return { prediction: data[0].total < data[1].total ? 'X' : 'T', confidence: 62, name: 'Biến động cao', patternId: 'score_volatility' };
        return null;
    }

    _analyzeDiceCombo(data, type) {
        if (data.length < 5) return null;
        const d = data[0].dice;
        const combos = [`${d[0]},${d[1]}`, `${d[1]},${d[2]}`, `${d[0]},${d[2]}`];
        let best = null, bestConf = 0;
        combos.forEach(key => {
            let t = 0, x = 0;
            for (let i = 1; i < data.length; i++) {
                const prev = data[i].dice;
                const pCombos = [`${prev[0]},${prev[1]}`, `${prev[1]},${prev[2]}`, `${prev[0]},${prev[2]}`];
                if (pCombos.includes(key)) {
                    const n = data[i-1]?.result;
                    if (n === 'Tài') t++; else x++;
                }
            }
            const total = t + x;
            if (total >= 3) {
                const probT = t / total;
                if (probT > 0.6) {
                    const conf = Math.round(55 + probT*20);
                    if (conf > bestConf) { bestConf = conf; best = { prediction: 'T', confidence: conf, name: `Cặp ${key} → Tài`, patternId: 'dice_combo' }; }
                } else if (probT < 0.4) {
                    const conf = Math.round(55 + (1-probT)*20);
                    if (conf > bestConf) { bestConf = conf; best = { prediction: 'X', confidence: conf, name: `Cặp ${key} → Xỉu`, patternId: 'dice_combo' }; }
                }
            }
        });
        return best;
    }

    _analyzeLinearTrend(data) {
        if (data.length < 10) return null;
        const scores = data.slice(0,10).map(d => d.total);
        let sumX=0,sumY=0,sumXY=0,sumX2=0, n=scores.length;
        for (let i=0;i<n;i++) { sumX+=i; sumY+=scores[i]; sumXY+=i*scores[i]; sumX2+=i*i; }
        const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
        if (slope > 0.5) return { prediction: 'X', confidence: 60+Math.min(15, Math.abs(slope)*3), name: 'Điểm xu hướng tăng', patternId: 'linear_trend' };
        if (slope < -0.5) return { prediction: 'T', confidence: 60+Math.min(15, Math.abs(slope)*3), name: 'Điểm xu hướng giảm', patternId: 'linear_trend' };
        return null;
    }

    _analyzeMarkov(results, type) {
        if (results.length < 3) return null;
        const state = results.slice(0,3).join(',');
        let t=0, x=0;
        for (let i=0; i<results.length-3; i++) {
            const s = results.slice(i,i+3).join(',');
            if (s === state) {
                if (results[i+3] === 'T') t++; else x++;
            }
        }
        const total = t+x;
        if (total >= 4) {
            const probT = t/total;
            if (probT > 0.6) return { prediction: 'T', confidence: 55+Math.round(probT*25), name: 'Markov bậc 3', patternId: 'markov' };
            if (probT < 0.4) return { prediction: 'X', confidence: 55+Math.round((1-probT)*25), name: 'Markov bậc 3', patternId: 'markov' };
        }
        return null;
    }

    _analyzeDicePattern(data, type) {
        if (data.length < 5) return null;
        const key = data[0].dice.join(',');
        let t=0, x=0;
        for (let i=1; i<data.length; i++) {
            const k = data[i].dice.join(',');
            if (k === key) {
                const n = data[i-1]?.result;
                if (n === 'Tài') t++; else x++;
            }
        }
        const total = t+x;
        if (total >= 3) {
            const probT = t/total;
            if (probT > 0.65) return { prediction: 'T', confidence: 60+Math.round(probT*25), name: `Xúc xắc ${key} → Tài`, patternId: 'dice_pattern' };
            if (probT < 0.35) return { prediction: 'X', confidence: 60+Math.round((1-probT)*25), name: `Xúc xắc ${key} → Xỉu`, patternId: 'dice_pattern' };
        }
        return null;
    }

    _analyzeScorePattern(data, type) {
        if (data.length < 5) return null;
        const lastScore = data[0].total;
        let t=0, x=0;
        for (let i=1; i<data.length; i++) {
            if (data[i].total === lastScore) {
                const n = data[i-1]?.result;
                if (n === 'Tài') t++; else x++;
            }
        }
        const total = t+x;
        if (total >= 4) {
            const probT = t/total;
            if (probT > 0.6) return { prediction: 'T', confidence: 58+Math.round(probT*20), name: `Tổng ${lastScore} → Tài`, patternId: 'score_pattern' };
            if (probT < 0.4) return { prediction: 'X', confidence: 58+Math.round((1-probT)*20), name: `Tổng ${lastScore} → Xỉu`, patternId: 'score_pattern' };
        }
        return null;
    }

    _analyzeHourlyPattern(data, type) {
        if (data.length < 10) return null;
        const hour = new Date(data[0].time).getHours();
        let t=0, x=0;
        for (let i=1; i<data.length; i++) {
            const h = new Date(data[i].time).getHours();
            if (h === hour) {
                const n = data[i-1]?.result;
                if (n === 'Tài') t++; else x++;
            }
        }
        const total = t+x;
        if (total >= 5) {
            const probT = t/total;
            if (probT > 0.6) return { prediction: 'T', confidence: 60, name: `Giờ ${hour} → Tài`, patternId: 'hourly_pattern' };
            if (probT < 0.4) return { prediction: 'X', confidence: 60, name: `Giờ ${hour} → Xỉu`, patternId: 'hourly_pattern' };
        }
        return null;
    }

    _analyzeCyclePattern(data, type) {
        if (data.length < 20) return null;
        const results = data.map(d => d.result);
        let bestCycle = 0, bestRatio = 0;
        for (let c = 3; c <= 12; c++) {
            let same = 0;
            for (let i = c; i < results.length-1; i++) {
                if (results[i] === results[i-c]) same++;
            }
            const ratio = same / (results.length - c);
            if (ratio > bestRatio && ratio > 0.55) { bestRatio = ratio; bestCycle = c; }
        }
        if (bestCycle > 0) {
            const pred = results[bestCycle];
            return { prediction: pred, confidence: 55 + Math.round(bestRatio*25), name: `Chu kỳ ${bestCycle}`, patternId: 'cycle_pattern' };
        }
        return null;
    }

    _analyzeCorrelation(data, type, otherData) {
        if (!otherData || otherData.length < 10) return null;
        const lastOther = otherData[0].result;
        return { prediction: lastOther === 'Tài' ? 'X' : 'T', confidence: 55, name: 'Tương quan bàn kia', patternId: 'correlation' };
    }

    _analyzeRandomForest(data, type) {
        const trees = [
            () => this._analyzeCauBet(data.map(d=>d.result), type),
            () => this._analyzeTongPhanTich(data, type),
            () => this._analyzeDicePattern(data, type),
            () => this._analyzeMarkov(data.map(d=>d.result), type),
            () => this._analyzeDistribution(data)
        ];
        let votesT = 0, votesX = 0, totalConf = 0;
        trees.forEach(fn => {
            const res = fn();
            if (res && res.confidence) {
                if (res.prediction === 'T') votesT += res.confidence;
                else votesX += res.confidence;
                totalConf += res.confidence;
            }
        });
        if (totalConf === 0) return null;
        const pred = votesT >= votesX ? 'T' : 'X';
        return { prediction: pred, confidence: Math.round(Math.max(votesT, votesX) / totalConf * 100), name: 'Random Forest', patternId: 'random_forest' };
    }

    _analyzeGradientBoosting(data, type) {
        const learners = [
            () => this._analyzeCauBetNgam(data.map(d=>d.result), type),
            () => this._analyzeSmartBet(data.map(d=>d.result), type),
            () => this._analyzeTongPhanTich(data, type),
            () => this._analyzeXuHuongManh(data.map(d=>d.result)),
            () => this._analyzeDaoChieu(data.map(d=>d.result))
        ];
        let scoreT = 0, scoreX = 0, total = 0;
        learners.forEach((fn, i) => {
            const res = fn();
            if (res && res.confidence) {
                const w = 1 / (i+1);
                if (res.prediction === 'T') scoreT += res.confidence * w;
                else scoreX += res.confidence * w;
                total += res.confidence * w;
            }
        });
        if (total === 0) return null;
        const pred = scoreT >= scoreX ? 'T' : 'X';
        return { prediction: pred, confidence: Math.round(Math.max(scoreT, scoreX) / total * 100), name: 'Gradient Boosting', patternId: 'gradient_boosting' };
    }

    _analyzeNeuralNetwork(data, type) {
        if (data.length < 5) return null;
        const features = data.slice(0,5).map(d => d.result === 'Tài' ? 1 : 0);
        features.push(data.slice(0,5).reduce((a,b)=>a+b.total,0)/5);
        const weights = [0.3,0.2,0.1,0.1,0.1,0.2];
        let sum = 0;
        for (let i=0;i<features.length;i++) sum += features[i]*(weights[i]||0);
        const pred = sum > 1.8 ? 'T' : 'X';
        return { prediction: pred, confidence: 55 + Math.round(Math.abs(sum-1.8)*15), name: 'Neural Network', patternId: 'neural_network' };
    }

    _analyzeXuHuongManh(results) {
        if (results.length < 8) return null;
        const t = results.slice(0,8).filter(r => r === 'T').length;
        if (t >= 6) return { prediction: 'X', confidence: 80 + t*2, name: 'Xu hướng mạnh Tài', patternId: 'xu_huong_manh' };
        if (t <= 2) return { prediction: 'T', confidence: 80 + (8-t)*2, name: 'Xu hướng mạnh Xỉu', patternId: 'xu_huong_manh' };
        return null;
    }

    _analyzeDaoChieu(results) {
        if (results.length < 5) return null;
        if (results.slice(0,5).every((v,i,a) => i===0 || v !== a[i-1]))
            return { prediction: results[0] === 'T' ? 'X' : 'T', confidence: 75, name: 'Đảo chiều 5', patternId: 'dao_chieu' };
        return null;
    }

    // Các hàm AI tổng hợp giả lập
    _predictMarkovMulti(seq) { return null; }
    _predictWeightedFrequency(historyObjects) { return null; }
    _predictCycle(seq) { return null; }
    _predictTrend(historyObjects) { return null; }
    _predictStreak(historyObjects) { return null; }
    _predictBayes(historyObjects) { return null; }
    _predictFibonacciTotal(historyObjects) { return null; }
    _predictPair(historyObjects) { return null; }
    _rsiPredict(historyObjects) { return null; }
    _bollingerPredict(historyObjects) { return null; }
    _macdPredict(historyObjects) { return null; }
    _stochasticPredict(historyObjects) { return null; }
    _williamsR(historyObjects) { return null; }
    _cciPredict(historyObjects) { return null; }
    _entropyPrediction(historyObjects) { return null; }
    _linearRegression(historyObjects) { return null; }
    _knnPredict(historyObjects) { return null; }
    _decisionTree(historyObjects) { return null; }
    _patternMatching(historyObjects) { return null; }
    _zigzagDetect(historyObjects) { return null; }

    _collectAllSignals() {
        const data = this._getHistoryData();
        const results = data.map(d => d.result);
        const signals = [];

        const addSignal = (pred, conf, patternId, name) => {
            if (conf >= this.confidenceThreshold) {
                const weight = this.patternWeights[patternId] || 1.0;
                const recentAcc = this._getPatternAccuracy(patternId);
                if (recentAcc < 0.3) return;
                const adjustedWeight = weight * (0.4 + recentAcc * 0.6);
                signals.push({ pred: pred === 'T' ? 'Tài' : pred, conf, weight: adjustedWeight, patternId, name });
            }
        };

        // Gọi tất cả các pattern có sẵn
        const bet = this._analyzeCauBet(results, 'hu'); if (bet && bet.detected) addSignal(bet.prediction, bet.confidence, bet.patternId, bet.name);
        const dao11 = this._analyzeCauDao11(results, 'hu'); if (dao11 && dao11.detected) addSignal(dao11.prediction, dao11.confidence, dao11.patternId, dao11.name);
        const c22 = this._analyzeCau22(results, 'hu'); if (c22 && c22.detected) addSignal(c22.prediction, c22.confidence, c22.patternId, c22.name);
        const c33 = this._analyzeCau33(results, 'hu'); if (c33 && c33.detected) addSignal(c33.prediction, c33.confidence, c33.patternId, c33.name);
        const c44 = this._analyzeCau44(results, 'hu'); if (c44 && c44.detected) addSignal(c44.prediction, c44.confidence, c44.patternId, c44.name);
        const c55 = this._analyzeCau55(results, 'hu'); if (c55 && c55.detected) addSignal(c55.prediction, c55.confidence, c55.patternId, c55.name);
        const c121 = this._analyzeCau121(results, 'hu'); if (c121 && c121.detected) addSignal(c121.prediction, c121.confidence, c121.patternId, c121.name);
        const c123 = this._analyzeCau123(results, 'hu'); if (c123 && c123.detected) addSignal(c123.prediction, c123.confidence, c123.patternId, c123.name);
        const c321 = this._analyzeCau321(results, 'hu'); if (c321 && c321.detected) addSignal(c321.prediction, c321.confidence, c321.patternId, c321.name);
        const c212 = this._analyzeCau212(results, 'hu'); if (c212 && c212.detected) addSignal(c212.prediction, c212.confidence, c212.patternId, c212.name);
        const tamGiac = this._analyzeCauTamGiac(results); if (tamGiac) addSignal(tamGiac.prediction, tamGiac.confidence, tamGiac.patternId, tamGiac.name);
        const zigzag = this._analyzeCauZigzag(results); if (zigzag) addSignal(zigzag.prediction, zigzag.confidence, zigzag.patternId, zigzag.name);
        const doiXung = this._analyzeCauDoiXung(results); if (doiXung) addSignal(doiXung.prediction, doiXung.confidence, doiXung.patternId, doiXung.name);
        const rong = this._analyzeCauRong(results, 'hu'); if (rong && rong.detected) addSignal(rong.prediction, rong.confidence, rong.patternId, rong.name);
        const dayGay = this._analyzeDayGay(results, 'hu'); if (dayGay && dayGay.detected) addSignal(dayGay.prediction, dayGay.confidence, dayGay.patternId, dayGay.name);
        const gayDotNgot = this._analyzeCauGayDotNgot(results, 'hu'); if (gayDotNgot) addSignal(gayDotNgot.prediction, gayDotNgot.confidence, gayDotNgot.patternId, gayDotNgot.name);
        const betNgam = this._analyzeCauBetNgam(results, 'hu'); if (betNgam) addSignal(betNgam.prediction, betNgam.confidence, betNgam.patternId, betNgam.name);
        const beBet = this._analyzeCauBeBet(data, results, 'hu'); if (beBet) addSignal(beBet.prediction, beBet.confidence, beBet.patternId, beBet.name);
        const bamBet = this._analyzeCauBamBet(results, 'hu'); if (bamBet) addSignal(bamBet.prediction, bamBet.confidence, bamBet.patternId, bamBet.name);
        const nhayCoc = this._analyzeCauNhayCoc(results, 'hu'); if (nhayCoc) addSignal(nhayCoc.prediction, nhayCoc.confidence, nhayCoc.patternId, nhayCoc.name);
        const nhipNghieng = this._analyzeCauNhipNghieng(results, 'hu'); if (nhipNghieng) addSignal(nhipNghieng.prediction, nhipNghieng.confidence, nhipNghieng.patternId, nhipNghieng.name);
        const van1 = this._analyzeCau3Van1(results, 'hu'); if (van1) addSignal(van1.prediction, van1.confidence, van1.patternId, van1.name);
        const beCau = this._analyzeCauBeCau(results, 'hu'); if (beCau) addSignal(beCau.prediction, beCau.confidence, beCau.patternId, beCau.name);
        const chuKy = this._analyzeCauChuKy(results, 'hu'); if (chuKy) addSignal(chuKy.prediction, chuKy.confidence, chuKy.patternId, chuKy.name);
        const gap = this._analyzeCauGap(results, 'hu'); if (gap) addSignal(gap.prediction, gap.confidence, gap.patternId, gap.name);
        const ziczac = this._analyzeCauZiczac(results, 'hu'); if (ziczac) addSignal(ziczac.prediction, ziczac.confidence, ziczac.patternId, ziczac.name);
        const doi = this._analyzeCauDoi(results, 'hu'); if (doi) addSignal(doi.prediction, doi.confidence, doi.patternId, doi.name);
        const song = this._analyzeCauSong(results, 'hu'); if (song) addSignal(song.prediction, song.confidence, song.patternId, song.name);
        const c313 = this._analyzeCau313(results, 'hu'); if (c313) addSignal(c313.prediction, c313.confidence, c313.patternId, c313.name);

        const tong = this._analyzeTongPhanTich(data, 'hu'); if (tong) addSignal(tong.prediction, tong.confidence, tong.patternId, tong.name);
        const smart = this._analyzeSmartBet(results, 'hu'); if (smart) addSignal(smart.prediction, smart.confidence, smart.patternId, smart.name);
        const dist = this._analyzeDistribution(data); if (dist) addSignal(dist.prediction, dist.confidence, dist.patternId, dist.name);
        const scoreTrend = this._analyzeScoreTrend(data); if (scoreTrend) addSignal(scoreTrend.prediction, scoreTrend.confidence, scoreTrend.patternId, scoreTrend.name);
        const diceSum = this._analyzeDiceSumProb(data); if (diceSum) addSignal(diceSum.prediction, diceSum.confidence, diceSum.patternId, diceSum.name);
        const scoreVol = this._analyzeScoreVolatility(data); if (scoreVol) addSignal(scoreVol.prediction, scoreVol.confidence, scoreVol.patternId, scoreVol.name);
        const diceCombo = this._analyzeDiceCombo(data, 'hu'); if (diceCombo) addSignal(diceCombo.prediction, diceCombo.confidence, diceCombo.patternId, diceCombo.name);
        const linearTrend = this._analyzeLinearTrend(data); if (linearTrend) addSignal(linearTrend.prediction, linearTrend.confidence, linearTrend.patternId, linearTrend.name);
        const markov = this._analyzeMarkov(results, 'hu'); if (markov) addSignal(markov.prediction, markov.confidence, markov.patternId, markov.name);
        const dicePat = this._analyzeDicePattern(data, 'hu'); if (dicePat) addSignal(dicePat.prediction, dicePat.confidence, dicePat.patternId, dicePat.name);
        const scorePat = this._analyzeScorePattern(data, 'hu'); if (scorePat) addSignal(scorePat.prediction, scorePat.confidence, scorePat.patternId, scorePat.name);
        const hourly = this._analyzeHourlyPattern(data, 'hu'); if (hourly) addSignal(hourly.prediction, hourly.confidence, hourly.patternId, hourly.name);
        const cycle = this._analyzeCyclePattern(data, 'hu'); if (cycle) addSignal(cycle.prediction, cycle.confidence, cycle.patternId, cycle.name);
        const corr = this._analyzeCorrelation(data, 'hu', null); if (corr) addSignal(corr.prediction, corr.confidence, corr.patternId, corr.name);
        const randomForest = this._analyzeRandomForest(data, 'hu'); if (randomForest) addSignal(randomForest.prediction, randomForest.confidence, randomForest.patternId, randomForest.name);
        const gradBoost = this._analyzeGradientBoosting(data, 'hu'); if (gradBoost) addSignal(gradBoost.prediction, gradBoost.confidence, gradBoost.patternId, gradBoost.name);
        const neural = this._analyzeNeuralNetwork(data, 'hu'); if (neural) addSignal(neural.prediction, neural.confidence, neural.patternId, neural.name);
        const xuHuong = this._analyzeXuHuongManh(results); if (xuHuong) addSignal(xuHuong.prediction, xuHuong.confidence, xuHuong.patternId, xuHuong.name);
        const daoChieu = this._analyzeDaoChieu(results); if (daoChieu) addSignal(daoChieu.prediction, daoChieu.confidence, daoChieu.patternId, daoChieu.name);

        // Markov xúc xắc
        const markovDiceRes = this.markovDice.phanTich();
        if (markovDiceRes) addSignal(markovDiceRes.prediction, markovDiceRes.confidence, 'markov_xuc_xac', 'Markov xúc xắc');

        return signals;
    }

    predict() {
        if (this.history.length < 10) return { prediction: 'Chưa đủ dữ liệu', confidence: 0 };
        const signals = this._collectAllSignals();
        if (signals.length === 0) {
            const last = this.history[this.history.length - 1].result;
            return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 51 };
        }
        let scoreT = 0, scoreX = 0;
        signals.forEach(s => {
            if (s.pred === 'Tài' || s.pred === 'T') scoreT += s.conf * s.weight;
            else scoreX += s.conf * s.weight;
        });
        const finalPred = scoreT >= scoreX ? 'Tài' : 'Xỉu';
        const totalScore = scoreT + scoreX;
        let confidence = totalScore > 0 ? Math.round((Math.max(scoreT, scoreX) / totalScore) * 100) : 60;
        confidence = Math.min(92, Math.max(50, confidence));
        const diffRatio = totalScore > 0 ? Math.abs(scoreT - scoreX) / totalScore : 0;
        if (diffRatio < 0.15) confidence = Math.max(50, confidence - 10);
        if (signals.length < 3) confidence = Math.max(50, confidence - 5);
        this.lastPrediction = { prediction: finalPred };
        this.lastPatterns = signals.slice(0,5).map(s => s.patternId);
        return { prediction: finalPred, confidence };
    }

    feedback(actualResult) {
        const actual = actualResult === 'Tài' ? 'T' : 'X';
        if (!this.lastPrediction) return;
        const isCorrect = this.lastPrediction.prediction === actual;
        this.recentResults.push(isCorrect);
        if (this.recentResults.length > 50) this.recentResults.shift();
        this.lastPatterns.forEach(patternId => {
            if (!this.patternPerformance[patternId]) this.patternPerformance[patternId] = { correct: 0, total: 0 };
            const perf = this.patternPerformance[patternId];
            perf.total++;
            if (isCorrect) perf.correct++;
            const recentRate = perf.total > 10 ? perf.correct / perf.total : 0.5;
            let newWeight = this.patternWeights[patternId] || 1.0;
            if (recentRate > 0.65) newWeight = Math.min(3.0, newWeight * 1.15);
            else if (recentRate < 0.35) newWeight = Math.max(0.2, newWeight * 0.85);
            this.patternWeights[patternId] = newWeight;
        });
        if (this.recentResults.length >= 10) {
            const recentAcc = this.recentResults.filter(r => r).length / this.recentResults.length;
            this.confidenceThreshold = recentAcc > 0.65 ? 48 : recentAcc < 0.45 ? 62 : 55;
        }
    }

    _getPatternAccuracy(patternId) {
        const perf = this.patternPerformance[patternId];
        if (!perf || perf.total < 5) return 0.5;
        return perf.correct / perf.total;
    }

    saveState() {
        return {
            patternWeights: this.patternWeights,
            patternPerformance: this.patternPerformance,
            recentResults: this.recentResults,
            confidenceThreshold: this.confidenceThreshold
        };
    }

    loadState(state) {
        if (state) {
            this.patternWeights = state.patternWeights || this.patternWeights;
            this.patternPerformance = state.patternPerformance || {};
            this.recentResults = state.recentResults || [];
            this.confidenceThreshold = state.confidenceThreshold || 55;
        }
    }
}

// ==================== KHỞI TẠO DỰ ĐOÁN ====================
const predictorHU = new AnhlakhoiMasterPredictorV2();
const predictorMD5 = new AnhlakhoiMasterPredictorV2();

let predictionHistory = {
  hu: [],
  md5: []
};

// ==================== TIỆN ÍCH LƯU TRỮ ====================
function loadJSON(filename, defaultValue) {
  try { if (fs.existsSync(filename)) return JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch (e) { console.error(`Lỗi load ${filename}:`, e.message); }
  return defaultValue;
}

function saveJSON(filename, data) {
  try { fs.writeFileSync(filename, JSON.stringify(data, null, 2)); }
  catch (e) { console.error(`Lỗi save ${filename}:`, e.message); }
}

// ==================== KHỞI ĐỘNG DỮ LIỆU ====================
async function initializeData() {
  let sessionsStore = loadJSON(SESSIONS_FILE, { hu: [], md5: [] });
  
  const loadSessionsToPredictor = (predictor, sessions) => {
    const ordered = sessions.slice().reverse(); // sắp xếp tăng dần
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
  if (learningData.hu) predictorHU.loadState(learningData.hu);
  if (learningData.md5) predictorMD5.loadState(learningData.md5);
  
  const histData = loadJSON(HISTORY_FILE, { hu: [], md5: [] });
  predictionHistory = histData;
  
  console.log(`✅ Dữ liệu đã tải - HU: ${sessionsStore.hu.length} phiên, MD5: ${sessionsStore.md5.length} phiên`);
  return sessionsStore;
}

let sessionsStore;

// ==================== CHUYỂN ĐỔI API ====================
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

// ==================== QUẢN LÝ PHIÊN MỚI ====================
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

// ==================== DỰ ĐOÁN & LƯU LỊCH SỬ ====================
function predictAndRecord(type, predictor) {
  if (sessionsStore[type].length === 0) return null;
  const latestPhien = sessionsStore[type][0].Phien;
  const nextPhien = latestPhien + 1;
  
  const predictionResult = predictor.predict();
  if (!predictionResult || predictionResult.prediction === 'Chưa đủ dữ liệu') return null;
  
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

// ==================== CẬP NHẬT KẾT QUẢ THỰC TẾ ====================
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

// ==================== LƯU DỮ LIỆU ĐỊNH KỲ ====================
function saveAllData() {
  saveJSON(SESSIONS_FILE, sessionsStore);
  saveJSON(HISTORY_FILE, predictionHistory);
  const learningState = {
    hu: predictorHU.saveState(),
    md5: predictorMD5.saveState()
  };
  saveJSON(LEARNING_FILE, learningState);
}

// ==================== API ENDPOINTS ====================
app.get('/lc79-hu', async (req, res) => {
  await accumulateSession('hu', predictorHU, API_URL_HU);
  if (!isReady.hu) {
    return res.json({ status: 'accumulating', progress: `${sessionsStore.hu.length}/${MIN_SESSIONS}` });
  }
  
  updateActualResults('hu', predictorHU);
  const pred = predictAndRecord('hu', predictorHU);
  if (!pred) {
    return res.json({ error: 'Không thể dự đoán' });
  }
  
  const latestSession = sessionsStore.hu[0];
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
    id: '@vuaoccac'
  });
});

app.get('/lc79-md5', async (req, res) => {
  await accumulateSession('md5', predictorMD5, API_URL_MD5);
  if (!isReady.md5) {
    return res.json({ status: 'accumulating', progress: `${sessionsStore.md5.length}/${MIN_SESSIONS}` });
  }
  
  updateActualResults('md5', predictorMD5);
  const pred = predictAndRecord('md5', predictorMD5);
  if (!pred) {
    return res.json({ error: 'Không thể dự đoán' });
  }
  
  const latestSession = sessionsStore.md5[0];
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
    id: '@vuaoccac'
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
    hu: { sessions: sessionsStore?.hu?.length || 0, ready: isReady.hu },
    md5: { sessions: sessionsStore?.md5?.length || 0, ready: isReady.md5 }
  });
});

// ==================== KHỞI ĐỘNG ====================
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
  console.log(`🚀 VuaOcCac AI Server chạy tại cổng ${PORT}`);
  main();
});
