// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC GOD AI - PHÂN TÁN & HỌC SÂU - 40+ PATTERN               ║
// ║  Tích hợp: Auto-Reversal + Markov + MA Drift + Volatility           ║
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

// ==================== CLASS AnhlakhoiGodAI ====================
class AnhlakhoiGodAI {
    constructor() {
        this.history = [];
        this.diceHistory = [];
        
        this.weights = {
            'cau_bet': 1.0, 'cau_dao_11': 1.0, 'cau_22': 1.0, 'cau_33': 1.0,
            'cau_121': 1.0, 'cau_123': 1.0, 'cau_321': 1.0,
            'cau_nhay_coc': 1.0, 'cau_nhip_nghieng': 1.0, 'cau_3van1': 1.0,
            'cau_be_cau': 1.0, 'cau_chu_ky': 1.0,
            'distribution': 1.0, 'dice_pattern': 1.0, 'sum_trend': 1.0,
            'edge_cases': 1.0, 'momentum': 1.0, 'cau_tu_nhien': 1.0,
            'dice_trend_line': 1.0, 'break_pattern': 1.0, 'fibonacci': 1.0,
            'resistance_support': 1.0, 'wave': 1.0, 'golden_ratio': 1.0,
            'day_gay': 1.0, 'cau_44': 1.0, 'cau_55': 1.0,
            'cau_212': 1.0, 'cau_1221': 1.0, 'cau_2112': 1.0,
            'cau_gap': 1.0, 'cau_ziczac': 1.0, 'cau_doi': 1.0,
            'cau_rong': 1.0, 'smart_bet': 1.0,
            'markov_chain': 1.2, 'moving_avg_drift': 1.1,
            'sum_pressure': 1.1, 'volatility': 1.0,
            'score_4': 1.5, 'score_17': 1.5, 'triple': 1.3,
            'pair1': 1.2, 'pair6': 1.2,
            'bet_2': 1.1, 'bet_3': 1.2, 'bet_4': 1.3, 'bet_5': 1.4,
            'c11': 1.0, 'c11_long': 1.2,
            'c22': 1.0, 'c33': 1.0, 'c44': 1.0,
            'tamgiac': 1.2, 'zigzag': 1.1, 'doixung': 1.0,
            'rong': 1.3, 'daygay': 1.2,
            'c121': 1.0, 'c123': 1.0, 'c321': 1.0, 'c212': 1.0,
            'face_hot': 1.1, 'face_cold': 1.1,
            'face_trans': 1.3, 'dice_pair': 1.2, 'dice_score': 1.1,
            'markov': 1.2
        };
        
        this.performance = {};
        this.recentResults = [];
        this.threshold = 55;
        this.lastPred = null;
        this.lastPatterns = [];
        
        this.faceFreq = {1:0,2:0,3:0,4:0,5:0,6:0};
        this.faceTrans = {};
        this.pairStats = {};
        this.tripleStats = {};
        this.scorePatterns = {};
        this.markovChain = {};
        this.betStats = {};
        
        this.reversalState = { active: false, consecutiveLosses: 0, reversalCount: 0 };
        this.REVERSAL_THRESHOLD = 3;
        this.winStreak = 0;
        this.loseStreak = 0;
    }

    addSession(s) {
        const d1 = s.xuc_xac_1, d2 = s.xuc_xac_2, d3 = s.xuc_xac_3;
        const total = d1 + d2 + d3;
        const result = s.ket_qua === 'Tài' ? 'T' : 'X';
        
        this.history.push({ result, total, dice: [d1,d2,d3] });
        this.diceHistory.push([d1,d2,d3]);
        
        this.faceFreq[d1]++; this.faceFreq[d2]++; this.faceFreq[d3]++;
        
        if (this.history.length >= 2) {
            const prev = this.diceHistory[this.diceHistory.length-2];
            [d1,d2,d3].forEach((to, pos) => {
                const from = prev[pos];
                if (!this.faceTrans[pos]) this.faceTrans[pos] = {};
                if (!this.faceTrans[pos][from]) this.faceTrans[pos][from] = {};
                this.faceTrans[pos][from][to] = (this.faceTrans[pos][from][to] || 0) + 1;
            });
        }
        
        if (d1===d2||d2===d3||d1===d3) {
            const k = d1===d2?`1-2:${d1}`:d2===d3?`2-3:${d2}`:`1-3:${d1}`;
            if (!this.pairStats[k]) this.pairStats[k] = {T:0,X:0,t:0};
            result==='T'?this.pairStats[k].T++:this.pairStats[k].X++;
            this.pairStats[k].t++;
        }
        if (d1===d2&&d2===d3) {
            const k = `${d1},${d2},${d3}`;
            if (!this.tripleStats[k]) this.tripleStats[k] = {T:0,X:0,t:0};
            result==='T'?this.tripleStats[k].T++:this.tripleStats[k].X++;
            this.tripleStats[k].t++;
        }
        
        if (this.history.length >= 2) {
            const prevT = this.history[this.history.length-2].total;
            const key = `${prevT}->${total}`;
            if (!this.scorePatterns[key]) this.scorePatterns[key] = {c:0,nextT:0,nextX:0};
            this.scorePatterns[key].c++;
            const nextR = this.history[this.history.length-3]?.result;
            if (nextR==='T') this.scorePatterns[key].nextT++;
            else if (nextR==='X') this.scorePatterns[key].nextX++;
        }
        
        const results = this._getResults();
        if (!this.markovChain['T->T']) this.markovChain = {'T->T':0,'T->X':0,'X->T':0,'X->X':0};
        if (results.length >= 2) {
            const from = results[1], to = results[0];
            this.markovChain[`${from}->${to}`]++;
        }
        
        let streak = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i]===results[0]) streak++;
            else break;
        }
        if (streak >= 2) {
            const k = Math.min(streak, 20);
            if (!this.betStats[k]) this.betStats[k] = {tiep:0,gay:0,t:0};
            if (results[streak]&&results[streak]===results[0]) this.betStats[k].tiep++;
            else this.betStats[k].gay++;
            this.betStats[k].t++;
        }
        
        if (this.history.length > 2000) { this.history.shift(); this.diceHistory.shift(); }
    }

    _getResults() { return this.history.map(h=>h.result).reverse(); }

    _collectSignals() {
        const R = this._getResults();
        const data = this.history.slice().reverse();
        const lastDice = this.diceHistory[this.diceHistory.length-1] || [0,0,0];
        const [d1,d2,d3] = lastDice;
        const S = [];
        const add = (pred, conf, id, name) => {
            if (conf >= this.threshold) {
                const w = this.weights[id] || 1.0;
                const perf = this.performance[id];
                let adjW = w;
                if (perf && perf.t >= 10) {
                    const acc = perf.c / perf.t;
                    if (acc < 0.3) return;
                    adjW = w * (0.3 + acc * 0.7);
                }
                S.push({ pred, conf, weight: adjW, id, name });
            }
        };

        const lastTotal = data[0]?.total || 0;
        if (lastTotal <= 4) add('T', 82, 'score_4', `Tổng ${lastTotal} → Tài`);
        if (lastTotal >= 17) add('X', 80, 'score_17', `Tổng ${lastTotal} → Xỉu`);
        if (d1===d2&&d2===d3) {
            const k = `${d1},${d2},${d3}`;
            const st = this.tripleStats[k];
            add(d1>=4?'X':'T', st&&st.t>=3?Math.round(Math.max(st.T,st.X)/st.t*100):72, 'triple', `3 mặt ${d1}`);
        }
        if (lastDice.filter(x=>x===1).length>=2) {
            const st = this.pairStats['1-2:1']||this.pairStats['2-3:1']||this.pairStats['1-3:1'];
            add('T', st&&st.t>=5?Math.round(st.T/st.t*100):70, 'pair1', 'Cặp 1 → Tài');
        }
        if (lastDice.filter(x=>x===6).length>=2) {
            const st = this.pairStats['1-2:6']||this.pairStats['2-3:6']||this.pairStats['1-3:6'];
            add('X', st&&st.t>=5?Math.round(st.X/st.t*100):68, 'pair6', 'Cặp 6 → Xỉu');
        }

        let streak = 1;
        for (let i = 1; i < R.length; i++) { if (R[i]===R[0]) streak++; else break; }
        if (streak >= 2) {
            const betK = Math.min(streak, 20);
            const betD = this.betStats[betK];
            if (streak <= 3) add(R[0], 60, `bet_${streak}`, `Bệt ${streak} → Tiếp`);
            else if (streak <= 5) {
                const gay = betD && betD.t >= 5 ? betD.gay/betD.t > 0.5 : false;
                add(gay ? (R[0]==='T'?'X':'T') : R[0], gay ? 68 : 64, `bet_${streak}`, `Bệt ${streak} → ${gay?'Gãy':'Tiếp'}`);
            } else {
                const gay = betD && betD.t >= 3 ? betD.gay/betD.t > 0.6 : true;
                add(gay ? (R[0]==='T'?'X':'T') : R[0], gay ? 75+streak : 66, `bet_${streak}`, `Bệt ${streak} → ${gay?'GÃY':'Tiếp'}`);
            }
        }

        let alt = 1;
        for (let i = 1; i < R.length; i++) { if (R[i]!==R[i-1]) alt++; else break; }
        if (alt >= 4 && alt <= 6) add(R[0]==='T'?'X':'T', 62+alt, 'c11', `Cầu 1-1 (${alt})`);
        else if (alt >= 7) add(R[0]==='T'?'X':'T', 70+alt, 'c11_long', `Cầu 1-1 DÀI (${alt})`);

        for (const [sz, id] of [[2,'c22'],[3,'c33'],[4,'c44']]) {
            let cnt = 0;
            for (let i = 0; i < R.length-sz+1; i+=sz) {
                if (R.slice(i,i+sz).every(r=>r===R[i])) cnt++;
                else break;
            }
            if (cnt >= 1) {
                const pred = cnt >= 2 ? (R[(cnt-1)*sz]==='T'?'X':'T') : R[(cnt-1)*sz];
                add(pred, 65+cnt*5, id, `Cầu ${sz}-${sz} (${cnt} bộ)`);
            }
        }

        if (R.length >= 5) {
            const l5 = R.slice(0,5);
            if (l5[0]!==l5[1]&&l5[1]!==l5[2]&&l5[2]!==l5[3]&&l5[3]!==l5[4]&&l5[0]===l5[4]) {
                add(l5[0]==='T'?'X':'T', 80, 'tamgiac', 'Tam giác');
            }
        }
        let zig = 0;
        for (let i = 1; i < R.length; i++) { if (R[i]!==R[i-1]) zig++; else break; }
        if (zig >= 5) add(R[0]==='T'?'X':'T', 65+zig*2, 'zigzag', `Zigzag ${zig}`);
        if (R.length >= 6) {
            const l = R.slice(0,3), r = R.slice(3,6).reverse();
            if (l.every((v,i)=>v===r[i]) && l[0]!==l[1]) add(l[2]==='T'?'X':'T', 66, 'doixung', 'Đối xứng');
        }

        if (streak >= 6) add(R[0]==='T'?'X':'T', 75+streak, 'rong', `Rồng ${streak} → GÃY`);
        if (streak >= 5 && R[streak] && R[streak]!==R[0]) add(R[streak], 70+streak, 'daygay', `Dây gãy ${streak}`);

        if (R.length>=4 && R[0]!==R[1] && R[1]===R[2] && R[2]!==R[3] && R[0]===R[3]) add(R[0], 68, 'c121', '1-2-1');
        if (R.length>=6) {
            const [a,b,c,d,e,f] = R;
            if (b===c&&c!==d&&d!==e&&e===f) add(a, 70, 'c123', '1-2-3');
            if (a===b&&b===c&&d===e&&e===f&&a!==d) add(d, 72, 'c321', '3-2-1');
            if (a===b&&b!==c&&c!==d&&d===e&&e===f&&a!==d) add(d, 66, 'c212', '2-1-2');
        }

        const totalF = Object.values(this.faceFreq).reduce((a,b)=>a+b,0);
        if (totalF > 20) {
            let hot=1, hc=0, cold=1, cc=Infinity;
            for (let f=1; f<=6; f++) {
                if (this.faceFreq[f]>hc) { hc=this.faceFreq[f]; hot=f; }
                if (this.faceFreq[f]<cc) { cc=this.faceFreq[f]; cold=f; }
            }
            if (hot>=4) add('T', 60, 'face_hot', `Mặt nóng ${hot}`);
            if (cold<=3) add('X', 58, 'face_cold', `Mặt lạnh ${cold}`);
        }
        for (let pos=0; pos<3; pos++) {
            const from = lastDice[pos];
            const trans = this.faceTrans[pos]?.[from];
            if (trans) {
                let best=1, bc=0, tot=0;
                for (let t=1; t<=6; t++) { const c=trans[t]||0; tot+=c; if(c>bc){bc=c;best=t;} }
                if (tot>=10 && bc/tot>0.35) add(best>=4?'T':'X', Math.round(55+(bc/tot)*25), 'face_trans', `Mặt ${pos+1}: ${from}→${best}`);
            }
        }
        const pairs = [];
        if (d1===d2) pairs.push(`1-2:${d1}`);
        if (d2===d3) pairs.push(`2-3:${d2}`);
        if (d1===d3) pairs.push(`1-3:${d1}`);
        pairs.forEach(k => {
            const st = this.pairStats[k];
            if (st && st.t >= 5) {
                const p = st.T/st.t;
                if (p>0.6) add('T', Math.round(p*100), 'dice_pair', `Cặp ${k} → Tài`);
                else if (p<0.4) add('X', Math.round((1-p)*100), 'dice_pair', `Cặp ${k} → Xỉu`);
            }
        });
        if (data.length >= 2) {
            const prevT = data[1].total;
            const key = `${prevT}->${lastTotal}`;
            const sp = this.scorePatterns[key];
            if (sp && sp.c >= 3) {
                const totN = sp.nextT + sp.nextX;
                if (totN >= 3) {
                    const p = sp.nextT/totN;
                    if (p>0.6) add('T', Math.round(p*100), 'dice_score', `Tổng ${key} → Tài`);
                    else if (p<0.4) add('X', Math.round((1-p)*100), 'dice_score', `Tổng ${key} → Xỉu`);
                }
            }
        }

        if (data.length >= 10) {
            const sums = data.slice(0,10).map(d=>d.total);
            const a5 = sums.slice(0,5).reduce((a,b)=>a+b,0)/5;
            const a10 = sums.reduce((a,b)=>a+b,0)/10;
            if (a5 > a10 + 1.5) add('X', 68, 'sum_trend', 'Tổng tăng → Xỉu');
            if (a5 < a10 - 1.5) add('T', 68, 'sum_trend', 'Tổng giảm → Tài');
        }
        
        const currR = R[0];
        const t2t = this.markovChain['T->T'] || 0;
        const t2x = this.markovChain['T->X'] || 0;
        const x2t = this.markovChain['X->T'] || 0;
        const x2x = this.markovChain['X->X'] || 0;
        if (currR === 'T') {
            const tot = t2t + t2x;
            if (tot >= 10) {
                const prob = t2t / tot;
                if (prob > 0.55) add('T', Math.round(55+prob*20), 'markov', `Markov: T→T ${Math.round(prob*100)}%`);
                else if (prob < 0.45) add('X', Math.round(55+(1-prob)*20), 'markov', `Markov: T→X ${Math.round((1-prob)*100)}%`);
            }
        } else {
            const tot = x2t + x2x;
            if (tot >= 10) {
                const prob = x2x / tot;
                if (prob > 0.55) add('X', Math.round(55+prob*20), 'markov', `Markov: X→X ${Math.round(prob*100)}%`);
                else if (prob < 0.45) add('T', Math.round(55+(1-prob)*20), 'markov', `Markov: X→T ${Math.round((1-prob)*100)}%`);
            }
        }

        const tC = R.filter(r=>r==='T').length;
        const imb = Math.abs(tC-(R.length-tC))/R.length;
        if (imb > 0.12) add(tC<R.length/2?'T':'X', Math.round(58+imb*40), 'distribution', 'Phân bố lệch');

        return S;
    }

    predict() {
        if (this.history.length < 10) return { action: 'BỎ QUA', reason: 'Cần ≥10 phiên' };
        
        const signals = this._collectSignals();
        if (signals.length === 0) return { action: 'BỎ QUA', reason: 'Không tín hiệu' };
        
        let sT = 0, sX = 0;
        signals.forEach(s => { if (s.pred==='T') sT += s.conf*s.weight; else sX += s.conf*s.weight; });
        
        let pred = sT >= sX ? 'Tài' : 'Xỉu';
        let conf = Math.round(Math.max(sT,sX)/(sT+sX)*100);
        const diff = Math.abs(sT-sX)/(sT+sX);
        if (diff < 0.15) conf = Math.max(50, conf-10);
        if (signals.length >= 6 && diff > 0.3) conf = Math.min(92, conf+5);
        
        if (this.loseStreak >= this.REVERSAL_THRESHOLD) {
            pred = pred === 'Tài' ? 'Xỉu' : 'Tài';
            conf = Math.max(50, conf - 10);
        }
        
        this.lastPred = pred;
        this.lastPatterns = signals.map(s => s.id);
        
        return {
            action: conf >= 65 ? 'ĐẶT' : conf >= 55 ? 'CÂN NHẮC' : 'BỎ QUA',
            prediction: pred,
            confidence: Math.max(50, Math.min(92, conf)),
            signals: signals.slice(0,5).map(s => s.name),
            total: signals.length
        };
    }

    feedback(actual) {
        const act = actual === 'Tài' ? 'T' : 'X';
        if (!this.lastPred) return;
        const correct = this.lastPred === act;
        this.recentResults.push(correct);
        if (this.recentResults.length > 50) this.recentResults.shift();
        
        if (correct) {
            this.winStreak++;
            this.loseStreak = 0;
        } else {
            this.loseStreak++;
            this.winStreak = 0;
        }
        
        this.lastPatterns.forEach(id => {
            if (!this.performance[id]) this.performance[id] = { c:0, t:0 };
            this.performance[id].t++;
            if (correct) this.performance[id].c++;
            const rate = this.performance[id].t >= 10 ? this.performance[id].c/this.performance[id].t : 0.5;
            let w = this.weights[id] || 1.0;
            if (rate > 0.65) w = Math.min(3.0, w * 1.15);
            else if (rate < 0.35) w = Math.max(0.15, w * 0.85);
            this.weights[id] = w;
        });
        
        if (this.recentResults.length >= 10) {
            const acc = this.recentResults.filter(r=>r).length / this.recentResults.length;
            this.threshold = acc > 0.65 ? 48 : acc < 0.45 ? 62 : 55;
        }
    }

    getStats() {
        const total = this.recentResults.length;
        const correct = this.recentResults.filter(r=>r).length;
        return {
            accuracy: total > 0 ? (correct/total*100).toFixed(1)+'%' : '0%',
            threshold: this.threshold,
            winStreak: this.winStreak,
            loseStreak: this.loseStreak,
            reversalActive: this.loseStreak >= this.REVERSAL_THRESHOLD,
            patterns: Object.keys(this.performance).length,
            history: this.history.length
        };
    }

    saveState() {
        return {
            weights: this.weights,
            performance: this.performance,
            threshold: this.threshold,
            loseStreak: this.loseStreak
        };
    }

    loadState(state) {
        if (state) {
            this.weights = { ...this.weights, ...state.weights };
            this.performance = state.performance || {};
            this.threshold = state.threshold || 55;
            this.loseStreak = state.loseStreak || 0;
        }
    }
}

// ==================== KHỞI TẠO ====================
const predictorHU = new AnhlakhoiGodAI();
const predictorMD5 = new AnhlakhoiGodAI();

let predictionHistory = { hu: [], md5: [] };

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
  if (!predictionResult || predictionResult.action === 'BỎ QUA') return null;
  
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
  console.log(`🚀 VuaOcCac God AI Server chạy tại cổng ${PORT}`);
  main();
});
