// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC GOD AI - SIÊU CHUẨN - 10K PHIÊN - KHÔNG 51%            ║
// ║  Meta-Learner + HMM + 200+ Patterns + Auto-Adaptive + Deep Stats  ║
// ║  FIX WIN/LOSS TRACKING - SMART BRIDGE ANALYSIS - AI CORE          ║
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

// ==================== 1. TOÀN BỘ THUẬT TOÁN TỔNG HỢP (50+ THUẬT TOÁN) ====================

// ---------- Markov & thống kê ----------
function predictMarkov(seq) { /* ... */ }
function markov1(history) { /* ... */ }
function markov2(history) { /* ... */ }
function markov3(history) { /* ... */ }
class MarkovXucXac123 { /* ... */ }
function predictWeightedFrequency(history, window = 50) { /* ... */ }
function simpleMajority(history, window = 15) { /* ... */ }
function cumulativeImbalance(history, window = 25) { /* ... */ }
function predictCycle(seq, maxCycle = 20) { /* ... */ }
function predictTrend(history) { /* ... */ }
function movingAverageCross(history, short = 5, long = 13) { /* ... */ }
function predictStreak(history) { /* ... */ }
function predictBayes(history) { /* ... */ }
function naiveBayes(history, window = 15) { /* ... */ }
function predictFibonacciByTotal(history) { /* ... */ }
function fibonacciFractal(history) { /* ... */ }
function predictPair(history) { /* ... */ }
function rsiPredict(history, period = 7) { /* ... */ }
function bollingerPredict(history, period = 12) { /* ... */ }
function macdPredict(history, short = 6, long = 13, signal = 4) { /* ... */ }
function stochasticPredict(history, period = 7) { /* ... */ }
function williamsR(history, period = 7) { /* ... */ }
function cciPredict(history, period = 10) { /* ... */ }
function entropyPrediction(history, window = 12) { /* ... */ }
function linearRegression(history, window = 12) { /* ... */ }
function knnPredict(history, k = 5, lookback = 10) { /* ... */ }
function decisionTree(history) { /* ... */ }
function patternMatching(history, lookback = 25) { /* ... */ }
function zigzagPredict(history) { /* ... */ }

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

// ==================== 2. META-LEARNER & HMM ====================
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
        this.obsProb[this.state].T /= sum;
        this.obsProb[this.state].X /= sum;
        const rand = Math.random();
        if (this.state === 'thuan') this.state = rand < this.transProb[0] ? 'thuan' : 'nghich';
        else this.state = rand < this.transProb[2] ? 'thuan' : 'nghich';
    }
    predict() { return this.obsProb[this.state].T > this.obsProb[this.state].X ? 'T' : 'X'; }
    saveState() { return { transProb: this.transProb, state: this.state, obsProb: this.obsProb }; }
    loadState(s) { if (s) { this.transProb = s.transProb || this.transProb; this.state = s.state || 'thuan'; this.obsProb = s.obsProb || this.obsProb; } }
}

// ==================== 3. LỚP AnhlakhoiGodAI (HOÀN CHỈNH) ====================
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
            'pattern_11':0.8,'pattern_22':0.8,'pattern_33':0.8,'pattern_123':0.8,'pattern_triangle':0.9,'pattern_zigzag':0.8,'pattern_dragon':0.9,'pattern_tiger':0.9,'pattern_44':0.8,'pattern_55':0.8,
            'cau_3_2_1_var':0.9,'cau_tong_dac_biet':1.0,'cau_xuc_xac_vang':1.1,
            'cau_bac_thang':0.9,'cau_dao_3':1.0,'cau_song_nguoc':1.0,
            'cau_6_6':1.0,'cau_7_7':1.0,'cau_8_8':1.0,
            'hmm':1.2,'meta':1.8
        };
        this.performance = {}; this.recentResults = []; this.threshold = 50; this.lastPred = null; this.lastPatterns = [];
        this.faceFreq={1:0,2:0,3:0,4:0,5:0,6:0}; this.faceTrans={}; this.pairStats={}; this.tripleStats={}; this.scorePatterns={};
        this.markovChain={'T->T':0,'T->X':0,'X->T':0,'X->X':0}; this.betStats={}; this.transitionMatrix={}; this.cycleStats={};
        this.winStreak=0; this.loseStreak=0; this.REVERSAL_THRESHOLD=3; this.reversalState={active:false,consecutiveLosses:0,reversalCount:0};
        this.markovDice = new MarkovXucXac123(3);
        this.metaWeights = {}; this.patternAge = {};
        this.meta = new MetaLearner(10);
        this.hmm = new SimpleHMM();
        this.lastFeatures = null;
        this.volatility = 0;
        this.safeMode = false;
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
        for (let id in this.patternAge) this.patternAge[id]++;
    }

    _getResults(){return this.history.map(h=>h.result).reverse();}

    _extractFeatures(data, results) {
        const last10 = results.slice(0,10);
        const tRatio = last10.filter(r=>r==='T').length / last10.length;
        let streak = 0;
        for (let i=0; i<results.length; i++) {
            if (results[i]===results[0]) streak += results[i]==='T'?1:-1;
            else break;
        }
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
                if(perf && perf.t>=10){
                    const acc=perf.c/perf.t;
                    if(acc<0.3)return;
                    const age = this.patternAge[id] || 0;
                    const ageFactor = Math.max(0.5, 1.0 - age * 0.01);
                    adjW = w * (0.3 + acc * 0.7) * ageFactor;
                }
                S.push({pred,conf,weight:adjW,id,name});
            }
        };

        // 1. Tín hiệu mạnh
        if(lastTotal<=4)add('T',82,'score_low',`Tổng ${lastTotal} → Tài`);
        if(lastTotal>=17)add('X',80,'score_high',`Tổng ${lastTotal} → Xỉu`);
        if(d1===d2&&d2===d3){const k=`${d1},${d2},${d3}`,st=this.tripleStats[k]; add(d1>=4?'X':'T',st&&st.t>=3?Math.round(Math.max(st.T,st.X)/st.t*100):72,'triple',`3 mặt ${d1}`);}
        if(lastDice.filter(x=>x===1).length>=2){const st=this.pairStats['1-2:1']||this.pairStats['2-3:1']||this.pairStats['1-3:1']; add('T',st&&st.t>=5?Math.round(st.T/st.t*100):70,'pair1','Cặp 1 → Tài');}
        if(lastDice.filter(x=>x===6).length>=2){const st=this.pairStats['1-2:6']||this.pairStats['2-3:6']||this.pairStats['1-3:6']; add('X',st&&st.t>=5?Math.round(st.X/st.t*100):68,'pair6','Cặp 6 → Xỉu');}

        // 2. Bệt
        let streak=1; for(let i=1;i<R.length;i++){if(R[i]===R[0])streak++;else break;}
        if(streak>=2){const bk=Math.min(streak,20),bd=this.betStats[bk];
            if(streak<=3)add(R[0],60,`bet_${streak}`,`Bệt ${streak} → Tiếp`);
            else if(streak<=5){const g=bd&&bd.t>=5?bd.gay/bd.t>0.5:false; add(g?(R[0]==='T'?'X':'T'):R[0],g?68:64,`bet_${streak}`,`Bệt ${streak} → ${g?'Gãy':'Tiếp'}`);}
            else{const g=bd&&bd.t>=3?bd.gay/bd.t>0.6:true; add(g?(R[0]==='T'?'X':'T'):R[0],g?75+streak:66,`bet_${streak}`,`Bệt ${streak} → ${g?'GÃY':'Tiếp'}`);}
        }

        // 3. Cầu 1-1
        let alt=1; for(let i=1;i<R.length;i++){if(R[i]!==R[i-1])alt++;else break;}
        if(alt>=4&&alt<=6)add(R[0]==='T'?'X':'T',62+alt,'c11',`Cầu 1-1 (${alt})`);
        else if(alt>=7)add(R[0]==='T'?'X':'T',70+alt,'c11_long',`Cầu 1-1 DÀI (${alt})`);

        // 4. Cầu 2-2, 3-3, 4-4, 5-5
        for(const [sz,id] of [[2,'c22'],[3,'c33'],[4,'c44'],[5,'c55']]){
            let cnt=0; for(let i=0;i<R.length-sz+1;i+=sz){if(R.slice(i,i+sz).every(r=>r===R[i]))cnt++;else break;}
            if(cnt>=1){const pred=cnt>=2?(R[(cnt-1)*sz]==='T'?'X':'T'):R[(cnt-1)*sz]; add(pred,65+cnt*5,id,`Cầu ${sz}-${sz} (${cnt} bộ)`);}
        }

        // 5. Tam giác, Zigzag, Đối xứng
        if(R.length>=5){const l5=R.slice(0,5); if(l5[0]!==l5[1]&&l5[1]!==l5[2]&&l5[2]!==l5[3]&&l5[3]!==l5[4]&&l5[0]===l5[4])add(l5[0]==='T'?'X':'T',80,'tamgiac','Tam giác');}
        let zig=0; for(let i=1;i<R.length;i++){if(R[i]!==R[i-1])zig++;else break;}
        if(zig>=5)add(R[0]==='T'?'X':'T',65+zig*2,'zigzag',`Zigzag ${zig}`);
        if(R.length>=6){const l=R.slice(0,3),r=R.slice(3,6).reverse(); if(l.every((v,i)=>v===r[i])&&l[0]!==l[1])add(l[2]==='T'?'X':'T',66,'doixung','Đối xứng');}

        // 6. Rồng, Dây gãy
        if(streak>=6)add(R[0]==='T'?'X':'T',75+streak,'rong',`Rồng ${streak} → GÃY`);
        if(streak>=5&&R[streak]&&R[streak]!==R[0])add(R[streak],70+streak,'daygay',`Dây gãy ${streak} → Theo mới`);

        // 7. Cầu đặc biệt
        if(R.length>=4&&R[0]!==R[1]&&R[1]===R[2]&&R[2]!==R[3]&&R[0]===R[3])add(R[0],68,'c121','1-2-1');
        if(R.length>=6){const[a,b,c,d,e,f]=R; if(b===c&&c!==d&&d!==e&&e===f)add(a,70,'c123','1-2-3'); if(a===b&&b===c&&d===e&&e===f&&a!==d)add(d,72,'c321','3-2-1'); if(a===b&&b!==c&&c!==d&&d===e&&e===f&&a!==d)add(d,66,'c212','2-1-2'); if(a!==b&&b===c&&c===d&&d!==e&&e===f)add(a,68,'c1221','1-2-2-1'); if(a===b&&b!==c&&c===d&&d!==e&&e===f&&a!==d)add(a,68,'c2112','2-1-1-2');}

        // 8. Cầu nâng cao
        if(R.length>=6){const skip=[]; for(let i=0;i<Math.min(R.length,12);i+=2)skip.push(R[i]); if(skip.length>=3){if(skip.slice(0,3).every(r=>r===skip[0]))add(skip[0],68,'nhaycoc','Nhảy cóc cùng màu'); else if(skip.slice(0,3).every((v,i,a)=>i===0||v!==a[i-1]))add(skip[0]==='T'?'X':'T',66,'nhaycoc','Nhảy cóc đảo');}}
        if(R.length>=5){const t5=R.slice(0,5).filter(r=>r==='T').length; if(t5>=4)add('T',70,'nhipnghieng',`Nhịp nghiêng Tài (${t5}/5)`); else if(t5<=1)add('X',70,'nhipnghieng',`Nhịp nghiêng Xỉu (${5-t5}/5)`);}
        if(R.length>=4){const t4=R.slice(0,4).filter(r=>r==='T').length; if(t4===3)add('X',68,'3van1','3 ván 1 (3T-1X)'); else if(t4===1)add('T',68,'3van1','3 ván 1 (3X-1T)');}
        const betPat=this._analyzeCauBet(R); if(betPat&&betPat.length>=4){const before=R.slice(betPat.length,betPat.length+4),prevBet=this._analyzeCauBet(before); if(prevBet&&prevBet.type!==betPat.type)add(betPat.type==='T'?'X':'T',76,'becau','Bẻ cầu');}
        for(let cycle=2;cycle<=6;cycle++){const st=this.cycleStats[cycle]; if(st&&st.count>=3){const next=st.next,total=Object.values(next).reduce((a,b)=>a+b,0); if(total>0){const pred=next['T']>next['X']?'T':'X',conf=Math.round(Math.max(next['T']||0,next['X']||0)/total*100); if(conf>=60){add(pred,conf,'chuky',`Chu kỳ ${cycle}`);break;}}}}
        if(R.length>=6){for(let gap=2;gap<=3;gap++){let ok=true;const ref=R[0]; for(let i=0;i<Math.min(R.length,12);i+=(gap+1)){if(R[i]!==ref){ok=false;break;}} if(ok){add(ref,68,'gap',`Cầu gấp ${gap+1}`);break;}}}
        let zz=0; for(let i=0;i<R.length-2;i++){if(R[i]!==R[i+1]&&R[i+1]!==R[i+2]&&R[i]===R[i+2])zz++;else break;} if(zz>=3)add(R[0]==='T'?'X':'T',65+zz*2,'ziczac',`Ziczac ${zz}`);
        let pc=0; for(let i=0;i<R.length-1;i+=2){if(R[i]===R[i+1])pc++;else break;} if(pc>=2){const same=R[0]===R[2];add(same?R[0]:(R[0]==='T'?'X':'T'),65+pc*3,'doi',`Cầu đôi ${pc}`);}

        // 9. Xúc xắc
        const totalFaces=Object.values(this.faceFreq).reduce((a,b)=>a+b,0);
        if(totalFaces>20){let hot=1,hc=0,cold=1,cc=Infinity; for(let f=1;f<=6;f++){if(this.faceFreq[f]>hc){hc=this.faceFreq[f];hot=f;} if(this.faceFreq[f]<cc){cc=this.faceFreq[f];cold=f;}} if(hot>=4)add('T',60,'face_hot',`Mặt nóng ${hot}`); if(cold<=3)add('X',58,'face_cold',`Mặt lạnh ${cold}`);}
        for(let pos=0;pos<3;pos++){const from=lastDice[pos],trans=this.faceTrans[pos]?.[from]; if(trans){let best=1,bc=0,tot=0; for(let t=1;t<=6;t++){const c=trans[t]||0;tot+=c;if(c>bc){bc=c;best=t;}} if(tot>=10&&bc/tot>0.35)add(best>=4?'T':'X',Math.round(55+(bc/tot)*25),'face_trans',`Mặt ${pos+1}: ${from}→${best}`);}}
        const pairs=[]; if(d1===d2)pairs.push(`1-2:${d1}`); if(d2===d3)pairs.push(`2-3:${d2}`); if(d1===d3)pairs.push(`1-3:${d1}`);
        pairs.forEach(k=>{const st=this.pairStats[k]; if(st&&st.t>=5){const p=st.T/st.t; if(p>0.6)add('T',Math.round(p*100),'dice_pair',`Cặp ${k} → Tài`); else if(p<0.4)add('X',Math.round((1-p)*100),'dice_pair',`Cặp ${k} → Xỉu`);}});
        if(data.length>=2){const prevT=data[1].total,key=`${prevT}->${lastTotal}`,sp=this.scorePatterns[key]; if(sp&&sp.c>=3){const tn=sp.nextT+sp.nextX; if(tn>=3){const p=sp.nextT/tn; if(p>0.6)add('T',Math.round(p*100),'dice_score',`Tổng ${key} → Tài`); else if(p<0.4)add('X',Math.round((1-p)*100),'dice_score',`Tổng ${key} → Xỉu`);}}}

        // 10. Kỹ thuật
        if(data.length>=10){const sums=data.slice(0,10).map(d=>d.total),a5=sums.slice(0,5).reduce((a,b)=>a+b,0)/5,a10=sums.reduce((a,b)=>a+b,0)/10; if(a5>a10+1.5)add('X',68,'sum_trend','Tổng tăng → Xỉu'); if(a5<a10-1.5)add('T',68,'sum_trend','Tổng giảm → Tài');}
        const currR=R[0],t2t=this.markovChain['T->T']||0,t2x=this.markovChain['T->X']||0,x2t=this.markovChain['X->T']||0,x2x=this.markovChain['X->X']||0;
        if(currR==='T'){const tot=t2t+t2x; if(tot>=10){const prob=t2t/tot; if(prob>0.55)add('T',Math.round(55+prob*20),'markov',`Markov: T→T ${Math.round(prob*100)}%`); else if(prob<0.45)add('X',Math.round(55+(1-prob)*20),'markov',`Markov: T→X ${Math.round((1-prob)*100)}%`);}}
        else{const tot=x2t+x2x; if(tot>=10){const prob=x2x/tot; if(prob>0.55)add('X',Math.round(55+prob*20),'markov',`Markov: X→X ${Math.round(prob*100)}%`); else if(prob<0.45)add('T',Math.round(55+(1-prob)*20),'markov',`Markov: X→T ${Math.round((1-prob)*100)}%`);}}
        const tC=R.filter(r=>r==='T').length,imb=Math.abs(tC-(R.length-tC))/R.length;
        if(imb>0.12)add(tC<R.length/2?'T':'X',Math.round(58+imb*40),'distribution','Phân bố lệch');
        if(R.length>=10){const l5=R.slice(0,5),p5=R.slice(5,10),tL=l5.filter(r=>r==='T').length,tP=p5.filter(r=>r==='T').length; if((tL>=4&&tP<=1)||(tL<=1&&tP>=4))add(tL>=4?'X':'T',78,'smartbet','Đảo xu hướng');}

        // 11. Tích hợp tất cả thuật toán bổ sung
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

        // Pattern mới:
        if(R.length>=6){
            const [a,b,c,d,e,f] = R;
            if(a==='X'&&b==='X'&&c==='X'&&d==='T'&&e==='T'&&f==='X')add('T',70,'cau_3_2_1_var','3-2-1 biến thể');
            const sums = data.slice(0,3).map(d=>d.total);
            if(sums.every(s=> s>=9 && s<=11)){
                add(sums[0]>=10?'X':'T',68,'cau_tong_dac_biet','Tổng trung bình 3 phiên');
            }
            const dicePat = data.slice(0,2).map(d=>d.Xuc_xac_1+d.Xuc_xac_2+d.Xuc_xac_3);
            if(dicePat[0]===6 && dicePat[1]===15)add('X',75,'cau_xuc_xac_vang','Xúc xắc vàng 6->15');
            if(data.length>=4){
                const s4 = data.slice(0,4).map(d=>d.total);
                const inc = s4[0] < s4[1] && s4[1] < s4[2] && s4[2] < s4[3];
                const dec = s4[0] > s4[1] && s4[1] > s4[2] && s4[2] > s4[3];
                if(inc) add('X',70,'cau_bac_thang','Bậc thang tăng → Xỉu');
                if(dec) add('T',70,'cau_bac_thang','Bậc thang giảm → Tài');
            }
            if(R.length>=6 && R[0]===R[2] && R[1]===R[3] && R[2]===R[4] && R[3]===R[5] && R[0]!==R[1]){
                add(R[0]==='T'?'X':'T',72,'cau_dao_3','Đảo 3 liên tiếp');
            }
            if(R.length>=6 && R[0]!==R[1]&&R[1]!==R[2]&&R[2]!==R[3]&&R[3]!==R[4]&&R[4]!==R[5]){
                add(R[0]==='T'?'X':'T',68,'cau_song_nguoc','Sóng ngược');
            }
            for(let run=6; run<=8; run++){
                if(R.slice(0,run).every(r=>r===R[0])){
                    add(R[0]==='T'?'X':'T',75+run,`cau_${run}_${run}`,`Bệt ${run} → Gãy`);
                    break;
                }
            }
        }

        // HMM
        const hmmP = this.hmm.predict();
        if (hmmP) add(hmmP, 58 + (this.volatility > 0.7 ? -5 : 0), 'hmm', 'HMM');

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
            const last = this.history[this.history.length-1];
            if(!last) return {action:'CÂN NHẮC',prediction:'Tài',confidence:51};
            const recent = this.history.slice(-Math.min(this.history.length,20));
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
            const pred = last==='T'?'Xỉu':'Tài';
            return {action:'CÂN NHẮC',prediction:pred,confidence:55};
        }
        if(Math.abs(sT-sX)<0.001){
            const totalT = this.history.filter(h=>h.result==='T').length;
            const totalX = this.history.length - totalT;
            if(totalT>totalX) sT += 0.5;
            else sX += 0.5;
        }
        let pred = sT>=sX?'Tài':'Xỉu';
        let conf = Math.round(Math.max(sT,sX)/(sT+sX)*100);
        const diff = Math.abs(sT-sX)/(sT+sX);
        if(diff<0.15) conf = Math.max(53,conf-10);
        if(signals.length>=6 && diff>0.3) conf = Math.min(92,conf+5);
        if(this.loseStreak>=this.REVERSAL_THRESHOLD){
            const newPred = pred==='Tài'?'Xỉu':'Tài';
            if(conf<70) return {action:'CÂN NHẮC',prediction:newPred,confidence:Math.max(51,conf-5)};
        }
        if(this.volatility>0.8 && conf<60){
            return {action:'BỎ QUA',prediction:pred,confidence:conf,reason:'Biến động cao'};
        }
        this.lastPred = pred;
        this.lastPatterns = signals.map(s=>s.id);
        return {action:conf>=65?'ĐẶT':'CÂN NHẮC',prediction:pred,confidence:Math.max(51,Math.min(92,conf)),signals:signals.slice(0,5).map(s=>s.name),total:signals.length};
    }

    feedback(actual){
        const predictedTai = this.lastPred === 'Tài' || this.lastPred === 'tai';
        const actualTai = actual === 'Tài' || actual === 'tai';
        const correct = predictedTai === actualTai;

        this.recentResults.push(correct);
        if(this.recentResults.length>50) this.recentResults.shift();

        if(correct){ this.winStreak++; this.loseStreak = 0; }
        else { this.loseStreak++; this.winStreak = 0; }

        this.lastPatterns.forEach(id=>{
            if(!this.performance[id]) this.performance[id]={c:0,t:0};
            this.performance[id].t++; if(correct) this.performance[id].c++;
            const perf=this.performance[id];
            const rate=perf.t>=10?perf.c/perf.t:0.5;
            let w=this.weights[id]||1.0;
            if(perf.t>=10){
                if(rate>0.65) w=Math.min(3.0,w*1.15);
                else if(rate<0.35) w=Math.max(0.15,w*0.85);
            }
            this.weights[id]=w;
            if(perf.t>=5){
                const metaW=this.metaWeights[id]||1.0;
                if(rate>0.6) this.metaWeights[id]=Math.min(2.0,metaW*1.05);
                else if(rate<0.4) this.metaWeights[id]=Math.max(0.5,metaW*0.95);
            }
            this.patternAge[id]=0;
        });

        if(this.lastFeatures){
            const target = actualTai ? 1 : 0;
            this.meta.train(this.lastFeatures, target);
        }
        if(this.history.length>=2){
            const prevRes = this.history[this.history.length-2].result;
            const currRes = actualTai ? 'T' : 'X';
            this.hmm.update(prevRes, currRes);
        }
        const changes=[];
        for(let i=1;i<Math.min(10,this.history.length);i++){
            changes.push(Math.abs(this.history[i].total-this.history[i-1].total));
        }
        this.volatility=changes.reduce((a,b)=>a+b,0)/changes.length/6;
        if(this.recentResults.length>=10){
            const acc=this.recentResults.filter(r=>r).length/this.recentResults.length;
            this.threshold=acc>0.65?48:acc<0.45?62:50;
        }
    }

    getStats(){
        const total=this.recentResults.length,correct=this.recentResults.filter(r=>r).length;
        return{accuracy:total>0?(correct/total*100).toFixed(1)+'%':'0%',threshold:this.threshold,winStreak:this.winStreak,loseStreak:this.loseStreak,volatility:this.volatility.toFixed(2),safeMode:this.volatility>0.8,activePatterns:Object.keys(this.performance).length,totalHistory:this.history.length};
    }

    saveState(){
        return{weights:this.weights,performance:this.performance,threshold:this.threshold,loseStreak:this.loseStreak,metaWeights:this.metaWeights,patternAge:this.patternAge,meta:this.meta.saveState(),hmm:this.hmm.saveState()};
    }

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
        }
    }
}

// ==================== 4. KHỞI TẠO SERVER & REST API ====================
const predictorHU  = new AnhlakhoiGodAI();
const predictorMD5 = new AnhlakhoiGodAI();
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

    const hist = loadJSON(HISTORY_FILE, { hu: [], md5: [] });
    predictionHistory = hist;
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
    if (!data.length) return;
    for (const entry of predictionHistory[type]) {
        if (entry.ket_qua !== null) continue;
        const actual = data.find(s => s.Phien === entry.phien);
        if (actual) {
            entry.ket_qua = actual.Ket_qua.toLowerCase();
            const duDoanLower = entry.du_doan.toLowerCase();
            const ketQuaLower = entry.ket_qua;
            entry.danh_gia = duDoanLower === ketQuaLower ? 'thang' : 'thua';
            predictor.feedback(actual.Ket_qua);
            if (pendingPrediction[type] && pendingPrediction[type].entry === entry) pendingPrediction[type] = null;
        }
    }
}

function saveAllData() {
    saveJSON(SESSIONS_FILE, sessionsStore);
    saveJSON(HISTORY_FILE, predictionHistory);
    saveJSON(LEARNING_FILE, {
        hu: predictorHU.saveState(),
        md5: predictorMD5.saveState()
    });
}

// ==================== 5. ENDPOINTS ====================
app.get('/lc79-hu', async (req, res) => {
    await accumulateSession('hu', predictorHU, API_URL_HU);
    if (!isReady.hu) return res.json({ status: 'accumulating', progress: `${sessionsStore.hu.length}/${MIN_SESSIONS}` });
    updateActualResults('hu', predictorHU);
    let pred = predictAndRecord('hu', predictorHU);
    if (!pred) {
        const latest = sessionsStore.hu[0];
        pred = { nextPhien: latest ? latest.Phien + 1 : 0, prediction: latest ? (latest.Ket_qua === 'Tài' ? 'Xỉu' : 'Tài') : 'Tài', confidence: 51 };
    }
    const latestSession = sessionsStore.hu[0];
    const stats = predictorHU.getStats();
    const recentHistory = predictionHistory.hu.filter(e => e.ket_qua !== null).slice(0, 10).map(e => ({
        phien: e.phien,
        du_doan: e.du_doan,
        ket_qua: e.ket_qua,
        danh_gia: e.danh_gia
    }));
    res.json({
        phien_truoc: { Phien: latestSession.Phien, Xuc_xac_1: latestSession.Xuc_xac_1, Xuc_xac_2: latestSession.Xuc_xac_2, Xuc_xac_3: latestSession.Xuc_xac_3, Tong: latestSession.Tong, Ket_qua: latestSession.Ket_qua },
        phien_hien_tai: { Phien: pred.nextPhien, Du_doan: pred.prediction, Do_tin_cay: `${pred.confidence}%` },
        id: '@vuaoccac',
        stats,
        win_loss_table: recentHistory,
        full_history_count: predictionHistory.hu.length
    });
});

app.get('/lc79-md5', async (req, res) => {
    await accumulateSession('md5', predictorMD5, API_URL_MD5);
    if (!isReady.md5) return res.json({ status: 'accumulating', progress: `${sessionsStore.md5.length}/${MIN_SESSIONS}` });
    updateActualResults('md5', predictorMD5);
    let pred = predictAndRecord('md5', predictorMD5);
    if (!pred) {
        const latest = sessionsStore.md5[0];
        pred = { nextPhien: latest ? latest.Phien + 1 : 0, prediction: latest ? (latest.Ket_qua === 'Tài' ? 'Xỉu' : 'Tài') : 'Tài', confidence: 51 };
    }
    const latestSession = sessionsStore.md5[0];
    const stats = predictorMD5.getStats();
    const recentHistory = predictionHistory.md5.filter(e => e.ket_qua !== null).slice(0, 10).map(e => ({
        phien: e.phien,
        du_doan: e.du_doan,
        ket_qua: e.ket_qua,
        danh_gia: e.danh_gia
    }));
    res.json({
        phien_truoc: { Phien: latestSession.Phien, Xuc_xac_1: latestSession.Xuc_xac_1, Xuc_xac_2: latestSession.Xuc_xac_2, Xuc_xac_3: latestSession.Xuc_xac_3, Tong: latestSession.Tong, Ket_qua: latestSession.Ket_qua },
        phien_hien_tai: { Phien: pred.nextPhien, Du_doan: pred.prediction, Do_tin_cay: `${pred.confidence}%` },
        id: '@vuaoccac',
        stats,
        win_loss_table: recentHistory,
        full_history_count: predictionHistory.md5.length
    });
});

app.get('/lc79-hu/history', (req, res) => { updateActualResults('hu', predictorHU); res.json(predictionHistory.hu); });
app.get('/lc79-md5/history', (req, res) => { updateActualResults('md5', predictorMD5); res.json(predictionHistory.md5); });
app.get('/status', (req, res) => res.json({
    hu: { sessions: sessionsStore?.hu?.length || 0, ready: isReady.hu, stats: predictorHU.getStats() },
    md5: { sessions: sessionsStore?.md5?.length || 0, ready: isReady.md5, stats: predictorMD5.getStats() }
}));

// ==================== 6. KHỞI ĐỘNG ====================
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
