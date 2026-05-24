// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC ULTIMATE AI - 100+ PATTERN - SIÊU CHUẨN - ÍT THUA NHẤT  ║
// ║  Tích hợp: Cầu + Xúc xắc + Kỹ thuật + AI + Tự học liên tục        ║
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
    static chuyenLoai(diem) { return diem <= 2 ? 1 : diem <= 4 ? 2 : 3; }
    themDuLieu(daySo) {
        this.history.push(...daySo.map(x => MarkovXucXac.chuyenLoai(x)));
        if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory);
        this._build();
    }
    _build() {
        this.transitions.clear();
        for (let i = this.bac; i < this.history.length; i++) {
            for (let b = 1; b <= this.bac; b++) {
                const state = this.history.slice(i-b, i).join(',');
                if (!this.transitions.has(state)) this.transitions.set(state, new Map());
                this.transitions.get(state).set(this.history[i], (this.transitions.get(state).get(this.history[i]) || 0) + 1);
            }
        }
    }
    duDoan() {
        if (this.history.length < 2) return 2;
        const dem = { 1:0, 2:0, 3:0 };
        this.history.forEach(v => dem[v]++);
        return dem[1] > dem[3] ? 1 : 3;
    }
    phanTich() {
        const so = this.duDoan();
        return { prediction: (so === 1 || so === 3) ? 'Tài' : 'Xỉu', confidence: this.history.length > 30 ? 75 : 65 };
    }
}

// ==================== CLASS DỰ ĐOÁN CHÍNH (AnhlakhoiUltimateAI) ====================
class AnhlakhoiUltimateAI {
    constructor() {
        this.history = [];
        this.diceHistory = [];
        
        this.patternWeights = {
            'cau_bet': 1.8, 'cau_bet_2': 1.5, 'cau_bet_3': 1.6, 'cau_bet_4': 1.7,
            'cau_dao_11': 1.0, 'cau_dao_11_dai': 1.2, 'cau_dao_11_sieu_dai': 1.4,
            'cau_22': 1.0, 'cau_22_dai': 1.2, 'cau_33': 1.0, 'cau_33_dai': 1.2,
            'cau_44': 1.0, 'cau_55': 1.0, 'cau_66': 1.0,
            'cau_121': 1.0, 'cau_123': 1.0, 'cau_321': 1.0, 'cau_212': 1.0,
            'cau_313': 1.0, 'cau_414': 1.0, 'cau_1221': 1.0, 'cau_2112': 1.0,
            'cau_tam_giac': 1.2, 'cau_tam_giac_nguoc': 1.1,
            'cau_zigzag': 1.1, 'cau_zigzag_dai': 1.3,
            'cau_doi_xung': 1.0, 'cau_doi_xung_dai': 1.1,
            'cau_song': 1.0, 'cau_song_nguoc': 1.0,
            'cau_rong': 1.0, 'cau_rong_dai': 1.3, 'cau_ho': 1.0,
            'day_gay': 1.0, 'day_gay_som': 1.2, 'cau_gay_dot_ngot': 1.3,
            'cau_bet_ngam': 1.6, 'cau_bet_kep': 1.5, 'cau_be_bet': 1.7, 'cau_bam_bet': 1.4,
            'cau_nhay_coc': 1.0, 'cau_nhay_coc_dai': 1.1,
            'cau_nhip_nghieng': 1.0, 'cau_nhip_nghieng_manh': 1.2,
            'cau_3van1': 1.0, 'cau_3van1_nguoc': 1.0,
            'cau_be_cau': 1.0, 'cau_be_cau_som': 1.2,
            'cau_chu_ky': 1.0, 'cau_chu_ky_dai': 1.1,
            'cau_gap': 1.0, 'cau_gap_dai': 1.0,
            'cau_ziczac': 1.0, 'cau_doi': 1.0,
            'cau_nen': 1.1, 'cau_bung': 1.1, 'cau_vai_dau_vai': 1.0,
            'cau_bac_thang_len': 1.0, 'cau_bac_thang_xuong': 1.0,
            'dice_face_freq': 1.3, 'dice_face_freq_hot': 1.4, 'dice_face_freq_cold': 1.3,
            'dice_face_transition': 1.4, 'dice_face_transition_pos1': 1.2, 'dice_face_transition_pos2': 1.2, 'dice_face_transition_pos3': 1.2,
            'dice_pair_repeat': 1.5, 'dice_pair_repeat_strong': 1.7,
            'dice_triple_repeat': 1.8, 'dice_triple_repeat_rare': 2.0,
            'dice_score_pattern': 1.2, 'dice_score_pattern_strong': 1.4,
            'dice_sum_analysis': 1.1, 'dice_sum_extreme': 1.5,
            'dice_even_odd': 1.0, 'dice_high_low': 1.1,
            'dice_prime': 0.9, 'dice_consecutive': 1.2,
            'tong_phan_tich': 1.5, 'tong_phan_tich_manh': 1.7,
            'xu_huong_manh': 1.3, 'xu_huong_rat_manh': 1.6,
            'dao_chieu': 1.4, 'dao_chieu_manh': 1.6,
            'smart_bet': 1.0, 'smart_bet_nguoc': 1.0,
            'distribution': 1.2, 'distribution_short': 1.1,
            'score_trend': 1.3, 'score_trend_manh': 1.5,
            'score_volatility': 1.1, 'score_volatility_cao': 1.3,
            'linear_trend': 1.2, 'linear_trend_manh': 1.4,
            'markov': 1.2, 'markov_2': 1.1, 'markov_3': 1.3, 'markov_4': 1.4,
            'dice_pattern': 1.0, 'dice_pattern_rare': 1.3,
            'markov_multi': 1.0, 'weighted_freq': 0.9, 'predict_streak': 1.1,
            'bayes': 0.9, 'bayes_strong': 1.1,
            'rsi': 0.9, 'rsi_extreme': 1.1,
            'bollinger': 0.8, 'bollinger_break': 1.0,
            'macd': 0.8, 'macd_cross': 1.0,
            'decision_tree': 0.9, 'decision_tree_agree': 1.2,
            'random_forest': 1.3, 'gradient_boosting': 1.2,
            'neural_network': 1.1, 'neural_network_deep': 1.3,
            'markov_xuc_xac': 1.2, 'markov_xuc_xac_dai': 1.4,
            'ensemble_vote': 1.5, 'ensemble_weighted': 1.6,
            'meta_learner': 1.8
        };
        
        this.patternPerformance = {};
        this.recentResults = [];
        this.confidenceThreshold = 55;
        this.lastPrediction = null;
        this.lastPatterns = [];
        this.winStreak = 0;
        this.loseStreak = 0;
        this.totalCorrect = 0;
        this.totalPredictions = 0;
        
        this.faceFrequency = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
        this.faceTransition = {};
        this.pairStats = {};
        this.tripleStats = {};
        this.scorePatterns = {};
        this.markovChain = { 1:{}, 2:{}, 3:{}, 4:{}, 5:{} };
        this.betStats = {};
        this.diceSumStats = {};
        this.markovDice = new MarkovXucXac(3);
    }

    addSession(session) {
        const d1 = session.xuc_xac_1, d2 = session.xuc_xac_2, d3 = session.xuc_xac_3;
        const total = d1 + d2 + d3;
        const result = session.ket_qua === 'Tài' ? 'T' : 'X';
        this.history.push({ result, total, dice: [d1, d2, d3], time: session.thoi_gian || new Date().toISOString() });
        this.diceHistory.push([d1, d2, d3]);
        
        this._learnFaces(d1, d2, d3);
        this._learnTransitions(d1, d2, d3);
        this._learnPairsAndTriples(d1, d2, d3, result);
        this._learnScorePatterns(total);
        this._learnMarkovChains(result);
        this._learnBetStats(result);
        this._learnDiceSums(total, result);
        this.markovDice.themDuLieu([d1, d2, d3]);
        
        if (this.history.length > 2000) {
            this.history.shift();
            this.diceHistory.shift();
        }
    }

    _learnFaces(d1, d2, d3) {
        this.faceFrequency[d1]++; this.faceFrequency[d2]++; this.faceFrequency[d3]++;
    }

    _learnTransitions(d1, d2, d3) {
        if (this.history.length < 2) return;
        const prevDice = this.diceHistory[this.diceHistory.length - 2];
        [d1, d2, d3].forEach((to, pos) => {
            const from = prevDice[pos];
            if (!this.faceTransition[pos]) this.faceTransition[pos] = {};
            if (!this.faceTransition[pos][from]) this.faceTransition[pos][from] = {};
            this.faceTransition[pos][from][to] = (this.faceTransition[pos][from][to] || 0) + 1;
        });
    }

    _learnPairsAndTriples(d1, d2, d3, result) {
        if (d1 === d2 || d2 === d3 || d1 === d3) {
            const key = d1 === d2 ? `1-2:${d1}` : d2 === d3 ? `2-3:${d2}` : `1-3:${d1}`;
            if (!this.pairStats[key]) this.pairStats[key] = { T: 0, X: 0, total: 0 };
            result === 'T' ? this.pairStats[key].T++ : this.pairStats[key].X++;
            this.pairStats[key].total++;
        }
        if (d1 === d2 && d2 === d3) {
            const key = `${d1},${d2},${d3}`;
            if (!this.tripleStats[key]) this.tripleStats[key] = { T: 0, X: 0, total: 0 };
            result === 'T' ? this.tripleStats[key].T++ : this.tripleStats[key].X++;
            this.tripleStats[key].total++;
        }
    }

    _learnScorePatterns(total) {
        if (this.history.length < 2) return;
        const prevTotal = this.history[this.history.length - 2].total;
        const key = `${prevTotal}->${total}`;
        if (!this.scorePatterns[key]) this.scorePatterns[key] = { count: 0, nextT: 0, nextX: 0 };
        this.scorePatterns[key].count++;
        const nextResult = this.history[this.history.length - 3]?.result;
        if (nextResult === 'T') this.scorePatterns[key].nextT++;
        else if (nextResult === 'X') this.scorePatterns[key].nextX++;
    }

    _learnMarkovChains(result) {
        const results = this._getResults();
        for (let order = 1; order <= 5; order++) {
            if (results.length > order) {
                const state = results.slice(0, order).join(',');
                if (!this.markovChain[order][state]) this.markovChain[order][state] = { T: 0, X: 0, total: 0 };
                if (results.length > order) {
                    const next = results[order];
                    next === 'T' ? this.markovChain[order][state].T++ : this.markovChain[order][state].X++;
                    this.markovChain[order][state].total++;
                }
            }
        }
    }

    _learnBetStats(result) {
        const results = this._getResults();
        let streak = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === results[0]) streak++;
            else break;
        }
        if (streak >= 2) {
            const key = Math.min(streak, 30);
            if (!this.betStats[key]) this.betStats[key] = { tiep: 0, gay: 0, total: 0 };
            if (results[streak] && results[streak] === results[0]) this.betStats[key].tiep++;
            else this.betStats[key].gay++;
            this.betStats[key].total++;
        }
    }

    _learnDiceSums(total, result) {
        if (!this.diceSumStats[total]) this.diceSumStats[total] = { T: 0, X: 0, total: 0 };
        const nextResult = this.history[this.history.length - 2]?.result;
        if (nextResult === 'T') this.diceSumStats[total].T++;
        else if (nextResult === 'X') this.diceSumStats[total].X++;
        this.diceSumStats[total].total++;
    }

    _getResults() {
        return this.history.map(h => h.result).reverse();
    }

    _collectAllSignals() {
        const results = this._getResults();
        const data = this.history.slice().reverse();
        const signals = [];
        const add = (pred, conf, id, name) => {
            if (conf >= this.confidenceThreshold && conf >= 50) {
                const weight = this.patternWeights[id] || 1.0;
                const perf = this.patternPerformance[id];
                let adjustedWeight = weight;
                if (perf && perf.total >= 10) {
                    const acc = perf.correct / perf.total;
                    if (acc < 0.3) return;
                    adjustedWeight = weight * (0.3 + acc * 0.7);
                }
                signals.push({ pred, conf, weight: adjustedWeight, patternId: id, name });
            }
        };

        const lastDice = this.diceHistory[this.diceHistory.length - 1] || [0,0,0];
        const [d1, d2, d3] = lastDice;

        // Cầu bệt & biến thể
        let streak = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === results[0]) streak++;
            else break;
        }
        
        if (streak >= 2) {
            const betKey = Math.min(streak, 30);
            const betData = this.betStats[betKey];
            if (streak >= 2 && streak <= 3) {
                add(results[0], 60, 'cau_bet_2', `Bệt ${streak} → Tiếp`);
            } else if (streak >= 4 && streak <= 5) {
                const shouldBreak = betData && betData.total >= 5 ? betData.gay / betData.total > 0.5 : streak >= 5;
                add(shouldBreak ? (results[0] === 'T' ? 'X' : 'T') : results[0], shouldBreak ? 68 : 64, 'cau_bet_3', `Bệt ${streak} → ${shouldBreak ? 'Gãy' : 'Tiếp'}`);
            } else if (streak >= 6) {
                const shouldBreak = betData && betData.total >= 5 ? betData.gay / betData.total > 0.6 : true;
                add(shouldBreak ? (results[0] === 'T' ? 'X' : 'T') : results[0], shouldBreak ? 75 + streak : 68, 'cau_bet_4', `Bệt ${streak} → ${shouldBreak ? 'GÃY' : 'Tiếp'}`);
            }
        }

        // Cầu đảo 1-1
        let altLen = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) altLen++;
            else break;
        }
        if (altLen >= 3 && altLen <= 5) {
            add(results[0] === 'T' ? 'X' : 'T', 62 + altLen, 'cau_dao_11', `Cầu 1-1 (${altLen} nhịp)`);
        } else if (altLen >= 6 && altLen <= 8) {
            add(results[0] === 'T' ? 'X' : 'T', 68 + altLen, 'cau_dao_11_dai', `Cầu 1-1 DÀI (${altLen} nhịp)`);
        } else if (altLen >= 9) {
            add(results[0], 70, 'cau_dao_11_sieu_dai', `Cầu 1-1 SIÊU DÀI (${altLen}) → GÃY`);
        }

        // Cầu 2-2, 3-3, 4-4, 5-5
        for (const [size, id, name] of [[2, 'cau_22', '2-2'], [3, 'cau_33', '3-3'], [4, 'cau_44', '4-4'], [5, 'cau_55', '5-5']]) {
            let count = 0;
            for (let i = 0; i < results.length - size + 1; i += size) {
                const block = results.slice(i, i + size);
                if (block.every(r => r === block[0])) count++;
                else break;
            }
            if (count >= 1) {
                const pred = count >= 2 ? (results[(count-1)*size] === 'T' ? 'X' : 'T') : results[(count-1)*size];
                add(pred, 65 + count * 5, id, `Cầu ${name} (${count} bộ)`);
            }
        }

        // Tam giác, zigzag, đối xứng
        if (results.length >= 5) {
            const l5 = results.slice(0, 5);
            if (l5[0] !== l5[1] && l5[1] !== l5[2] && l5[2] !== l5[3] && l5[3] !== l5[4] && l5[0] === l5[4]) {
                add(l5[0] === 'T' ? 'X' : 'T', 80, 'cau_tam_giac', 'Tam giác');
            }
        }

        let zig = 0;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) zig++;
            else break;
        }
        if (zig >= 5 && zig <= 7) add(results[0] === 'T' ? 'X' : 'T', 65 + zig * 2, 'cau_zigzag', `Zigzag ${zig}`);
        else if (zig >= 8) add(results[0] === 'T' ? 'X' : 'T', 75 + zig, 'cau_zigzag_dai', `Zigzag DÀI ${zig}`);

        if (results.length >= 8) {
            const left = results.slice(0, 4);
            const right = results.slice(4, 8).reverse();
            if (left.every((v, i) => v === right[i]) && left[0] !== left[1]) {
                add(left[3] === 'T' ? 'X' : 'T', 68, 'cau_doi_xung', 'Đối xứng');
            }
        }

        // Rồng, hổ, dây gãy
        if (streak >= 7) {
            add(results[0] === 'T' ? 'X' : 'T', 75 + streak, 'cau_rong_dai', `Rồng ${streak} → GÃY`);
        }
        if (streak >= 5 && results[streak] && results[streak] !== results[0]) {
            add(results[streak], 70 + streak, 'day_gay', `Dây gãy ${streak} → Theo mới`);
        }

        // Cầu 1-2-1, 1-2-3, 3-2-1, 2-1-2
        if (results.length >= 4 && results[0] !== results[1] && results[1] === results[2] && results[2] !== results[3] && results[0] === results[3]) {
            add(results[0], 68, 'cau_121', 'Cầu 1-2-1');
        }
        if (results.length >= 6) {
            const [a,b,c,d,e,f] = results;
            if (b === c && c !== d && d !== e && e === f) add(a, 70, 'cau_123', 'Cầu 1-2-3');
            if (a === b && b === c && d === e && e === f && a !== d) add(d, 72, 'cau_321', 'Cầu 3-2-1');
            if (a === b && b !== c && c !== d && d === e && e === f && a !== d) add(d, 66, 'cau_212', 'Cầu 2-1-2');
        }

        // Phân tích xúc xắc
        const totalFaces = Object.values(this.faceFrequency).reduce((a,b) => a+b, 0);
        if (totalFaces > 20) {
            let hot = 1, hotC = 0, cold = 1, coldC = Infinity;
            for (let f = 1; f <= 6; f++) {
                if (this.faceFrequency[f] > hotC) { hotC = this.faceFrequency[f]; hot = f; }
                if (this.faceFrequency[f] < coldC) { coldC = this.faceFrequency[f]; cold = f; }
            }
            if (hot >= 4) add('T', 62, 'dice_face_freq_hot', `Mặt nóng ${hot}`);
            if (cold <= 3) add('X', 60, 'dice_face_freq_cold', `Mặt lạnh ${cold}`);
        }

        for (let pos = 0; pos < 3; pos++) {
            const from = lastDice[pos];
            const trans = this.faceTransition[pos]?.[from];
            if (trans) {
                let best = 1, bestC = 0, total = 0;
                for (let t = 1; t <= 6; t++) {
                    const c = trans[t] || 0;
                    total += c;
                    if (c > bestC) { bestC = c; best = t; }
                }
                if (total >= 10 && bestC / total > 0.35) {
                    add(best >= 4 ? 'T' : 'X', Math.round(55 + (bestC/total)*25), `dice_face_transition_pos${pos+1}`, `Mặt ${pos+1}: ${from}→${best}`);
                }
            }
        }

        const pairs = [];
        if (d1 === d2) pairs.push(`1-2:${d1}`);
        if (d2 === d3) pairs.push(`2-3:${d2}`);
        if (d1 === d3) pairs.push(`1-3:${d1}`);
        pairs.forEach(key => {
            const stats = this.pairStats[key];
            if (stats && stats.total >= 5) {
                const probT = stats.T / stats.total;
                if (probT > 0.6) add('T', Math.round(probT*100), 'dice_pair_repeat', `Cặp ${key} → Tài`);
                else if (probT < 0.4) add('X', Math.round((1-probT)*100), 'dice_pair_repeat', `Cặp ${key} → Xỉu`);
            }
        });

        if (d1 === d2 && d2 === d3) {
            const key = `${d1},${d2},${d3}`;
            const stats = this.tripleStats[key];
            if (stats && stats.total >= 3) {
                const probT = stats.T / stats.total;
                if (probT > 0.6) add('T', Math.round(probT*100), 'dice_triple_repeat', `Bộ ba ${key} → Tài`);
                else if (probT < 0.4) add('X', Math.round((1-probT)*100), 'dice_triple_repeat', `Bộ ba ${key} → Xỉu`);
            }
        }

        const lastTotal = data[0]?.total || 0;
        if (lastTotal <= 4) add('T', 82, 'dice_sum_extreme', `Tổng ${lastTotal} → Tài`);
        if (lastTotal >= 17) add('X', 80, 'dice_sum_extreme', `Tổng ${lastTotal} → Xỉu`);
        
        const sumStats = this.diceSumStats[lastTotal];
        if (sumStats && sumStats.total >= 10) {
            const probT = sumStats.T / sumStats.total;
            if (probT > 0.55) add('T', Math.round(55 + probT*20), 'dice_sum_analysis', `Tổng ${lastTotal} → Tài ${Math.round(probT*100)}%`);
            else if (probT < 0.45) add('X', Math.round(55 + (1-probT)*20), 'dice_sum_analysis', `Tổng ${lastTotal} → Xỉu ${Math.round((1-probT)*100)}%`);
        }

        const mdRes = this.markovDice.phanTich();
        if (mdRes) add(mdRes.prediction === 'Tài' ? 'T' : 'X', mdRes.confidence, 'markov_xuc_xac', 'Markov xúc xắc');

        // Kỹ thuật
        if (data.length >= 10) {
            const sums = data.slice(0, 10).map(d => d.total);
            const avg5 = sums.slice(0, 5).reduce((a,b) => a+b, 0) / 5;
            const avg10 = sums.reduce((a,b) => a+b, 0) / 10;
            if (avg5 > avg10 + 1.5) add('X', 68, 'tong_phan_tich', 'Tổng tăng → Xỉu');
            if (avg5 < avg10 - 1.5) add('T', 68, 'tong_phan_tich', 'Tổng giảm → Tài');
        }

        for (let order = 5; order >= 2; order--) {
            if (results.length > order) {
                const state = results.slice(0, order).join(',');
                const chain = this.markovChain[order][state];
                if (chain && chain.total >= 5) {
                    const probT = chain.T / chain.total;
                    if (probT > 0.6) { add('T', Math.round(55+probT*25), `markov_${order}`, `Markov bậc ${order} → Tài`); break; }
                    if (probT < 0.4) { add('X', Math.round(55+(1-probT)*25), `markov_${order}`, `Markov bậc ${order} → Xỉu`); break; }
                }
            }
        }

        // Ensemble vote
        if (signals.length >= 5) {
            const tVotes = signals.filter(s => s.pred === 'T').length;
            const xVotes = signals.filter(s => s.pred === 'X').length;
            const total = tVotes + xVotes;
            const agree = Math.max(tVotes, xVotes) / total;
            if (agree >= 0.7) {
                add(tVotes >= xVotes ? 'T' : 'X', Math.round(60 + agree * 25), 'ensemble_vote', `Đồng thuận ${Math.round(agree*100)}%`);
            }
        }

        return signals;
    }

    predict() {
        if (this.history.length < 10) return { prediction: 'Chưa đủ dữ liệu', confidence: 0 };
        
        const signals = this._collectAllSignals();
        
        if (signals.length === 0) {
            return {
                prediction: this.history[this.history.length-1].result === 'T' ? 'Xỉu' : 'Tài',
                confidence: 51,
                signals: [],
                action: 'BỎ QUA'
            };
        }

        let scoreT = 0, scoreX = 0;
        signals.forEach(s => {
            if (s.pred === 'T') scoreT += s.conf * s.weight;
            else scoreX += s.conf * s.weight;
        });

        const finalPred = scoreT >= scoreX ? 'Tài' : 'Xỉu';
        let confidence = Math.round(Math.max(scoreT, scoreX) / (scoreT + scoreX) * 100);
        
        const diffRatio = Math.abs(scoreT - scoreX) / (scoreT + scoreX);
        if (diffRatio < 0.15) confidence = Math.max(50, confidence - 10);
        if (signals.length >= 8 && diffRatio > 0.3) confidence = Math.min(92, confidence + 5);
        
        if (this.winStreak >= 3) confidence = Math.min(92, confidence + 3);
        if (this.loseStreak >= 3) confidence = Math.max(50, confidence - 5);

        this.lastPrediction = finalPred;
        this.lastPatterns = signals.map(s => s.patternId);

        return {
            prediction: finalPred,
            confidence: Math.max(50, Math.min(92, confidence)),
            signals: signals.slice(0, 5).map(s => s.name),
            totalSignals: signals.length,
            action: confidence >= 65 ? 'ĐẶT' : confidence >= 55 ? 'CÂN NHẮC' : 'BỎ QUA'
        };
    }

    feedback(actualResult) {
        const actual = actualResult === 'Tài' ? 'T' : 'X';
        if (!this.lastPrediction) return;

        const isCorrect = this.lastPrediction === actual;
        this.recentResults.push(isCorrect);
        if (this.recentResults.length > 50) this.recentResults.shift();

        if (isCorrect) {
            this.winStreak++;
            this.loseStreak = 0;
            this.totalCorrect++;
        } else {
            this.loseStreak++;
            this.winStreak = 0;
        }
        this.totalPredictions++;

        this.lastPatterns.forEach(id => {
            if (!this.patternPerformance[id]) this.patternPerformance[id] = { correct: 0, total: 0 };
            const perf = this.patternPerformance[id];
            perf.total++;
            if (isCorrect) perf.correct++;
            
            const rate = perf.total > 10 ? perf.correct / perf.total : 0.5;
            let w = this.patternWeights[id] || 1.0;
            if (rate > 0.65) w = Math.min(3.0, w * 1.15);
            else if (rate < 0.35) w = Math.max(0.15, w * 0.85);
            this.patternWeights[id] = w;
        });

        if (this.recentResults.length >= 10) {
            const acc = this.recentResults.filter(r => r).length / this.recentResults.length;
            this.confidenceThreshold = acc > 0.65 ? 48 : acc < 0.45 ? 62 : 55;
        }
    }

    getStats() {
        return {
            totalPredictions: this.totalPredictions,
            totalCorrect: this.totalCorrect,
            accuracy: this.totalPredictions > 0 ? (this.totalCorrect / this.totalPredictions * 100).toFixed(1) + '%' : '0%',
            winStreak: this.winStreak,
            loseStreak: this.loseStreak,
            activePatterns: Object.keys(this.patternPerformance).length,
            threshold: this.confidenceThreshold
        };
    }
}

// ==================== KHỞI TẠO ====================
const predictorHU = new AnhlakhoiUltimateAI();
const predictorMD5 = new AnhlakhoiUltimateAI();

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
    predictorHU.patternWeights = learningData.hu.patternWeights || predictorHU.patternWeights;
    predictorHU.patternPerformance = learningData.hu.patternPerformance || {};
    predictorHU.confidenceThreshold = learningData.hu.confidenceThreshold || 55;
  }
  if (learningData.md5) {
    predictorMD5.patternWeights = learningData.md5.patternWeights || predictorMD5.patternWeights;
    predictorMD5.patternPerformance = learningData.md5.patternPerformance || {};
    predictorMD5.confidenceThreshold = learningData.md5.confidenceThreshold || 55;
  }
  
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
    hu: {
      patternWeights: predictorHU.patternWeights,
      patternPerformance: predictorHU.patternPerformance,
      confidenceThreshold: predictorHU.confidenceThreshold
    },
    md5: {
      patternWeights: predictorMD5.patternWeights,
      patternPerformance: predictorMD5.patternPerformance,
      confidenceThreshold: predictorMD5.confidenceThreshold
    }
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
  console.log(`🚀 VuaOcCac Ultimate AI Server chạy tại cổng ${PORT}`);
  main();
});
