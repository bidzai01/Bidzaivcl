// ╔══════════════════════════════════════════════════════════════════════╗
// ║  ANHLAKHOI AI - SIÊU CẦU TỐI ƯU - HỌC 100 PHIÊN - DỰ ĐOÁN CHUẨN   ║
// ║  Game 2 bàn Tài Xỉu LC79B.BET - Phiên bản Chuyên Nghiệp            ║
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
const LEARNING_FILE = path.join(__dirname, 'anhlakhoi_learning.json');
const HISTORY_FILE = path.join(__dirname, 'anhlakhoi_history.json');
const SESSIONS_FILE = path.join(__dirname, 'anhlakhoi_sessions.json');

const MIN_SESSIONS = 100;        // Chỉ cần 100 phiên để bắt đầu
const FETCH_PER_REQUEST = 100;    // Mỗi lần fetch 100 phiên
const FETCH_INTERVAL = 2000;      // Nghỉ 2 giây giữa các lần fetch
const AUTO_SAVE_INTERVAL = 30000; // Tự động lưu mỗi 30s

// ==================== KHỞI TẠO DỮ LIỆU ====================
let sessionsStore = { hu: [], md5: [] };
let predictionHistory = { hu: [], md5: [] };
let lastProcessedPhien = { hu: null, md5: null };

let learningData = {
  hu: {
    predictions: [],
    patternStats: {},
    totalPredictions: 0,
    correctPredictions: 0,
    patternWeights: {},
    lastUpdate: null,
    streakAnalysis: { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, worstStreak: 0 },
    recentAccuracy: [],
    betStats: {}
  },
  md5: {
    predictions: [],
    patternStats: {},
    totalPredictions: 0,
    correctPredictions: 0,
    patternWeights: {},
    lastUpdate: null,
    streakAnalysis: { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, worstStreak: 0 },
    recentAccuracy: [],
    betStats: {}
  }
};

// Trọng số mặc định cho từng loại cầu (đã tối ưu)
const DEFAULT_PATTERN_WEIGHTS = {
  'cau_bet': 1.8, 'cau_bet_ngam': 1.6, 'cau_bet_kep': 1.5,
  'cau_be_bet': 1.7, 'cau_bam_bet': 1.4,
  'cau_dao_11': 1.0, 'cau_22': 1.0, 'cau_33': 1.0, 'cau_44': 1.0, 'cau_55': 1.0,
  'cau_121': 1.0, 'cau_123': 1.0, 'cau_321': 1.0,
  'cau_212': 1.0, 'cau_1221': 1.0, 'cau_2112': 1.0,
  'cau_nhay_coc': 1.0, 'cau_nhip_nghieng': 1.0, 'cau_3van1': 1.0,
  'cau_be_cau': 1.0, 'cau_chu_ky': 1.0,
  'distribution': 1.0, 'dice_pattern': 1.0, 'sum_trend': 1.0,
  'momentum': 1.0, 'cau_tu_nhien': 1.0,
  'break_streak': 1.5, 'alternating_break': 1.0, 'double_pair_break': 1.0,
  'triple_pattern': 1.0, 'day_gay': 1.0,
  'tong_phan_tich': 1.5, 'xu_huong_manh': 1.3, 'dao_chieu': 1.4,
  'cau_rong': 1.0, 'smart_bet': 1.0
};

let isReady = { hu: false, md5: false };

// ==================== LOAD/SAVE ====================
function loadJSON(filename, defaultValue) {
  try {
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
  } catch (e) { console.error(`Lỗi load ${filename}:`, e.message); }
  return defaultValue;
}

function saveJSON(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (e) { console.error(`Lỗi save ${filename}:`, e.message); }
}

function loadAllData() {
  sessionsStore = loadJSON(SESSIONS_FILE, { hu: [], md5: [] });
  learningData = loadJSON(LEARNING_FILE, learningData);
  const histData = loadJSON(HISTORY_FILE, { history: { hu: [], md5: [] }, lastProcessedPhien: { hu: null, md5: null } });
  predictionHistory = histData.history;
  lastProcessedPhien = histData.lastProcessedPhien;

  isReady.hu = sessionsStore.hu.length >= MIN_SESSIONS;
  isReady.md5 = sessionsStore.md5.length >= MIN_SESSIONS;
  
  console.log(`✅ Dữ liệu đã tải - HU: ${sessionsStore.hu.length}/${MIN_SESSIONS} (sẵn sàng: ${isReady.hu}), MD5: ${sessionsStore.md5.length}/${MIN_SESSIONS} (sẵn sàng: ${isReady.md5})`);
}

function saveAllData() {
  saveJSON(SESSIONS_FILE, sessionsStore);
  saveJSON(LEARNING_FILE, learningData);
  saveJSON(HISTORY_FILE, { history: predictionHistory, lastProcessedPhien });
}

// ==================== CHUYỂN ĐỔI API ====================
function transformApiData(apiData) {
  if (!apiData?.list?.length) return null;
  return apiData.list.map(item => ({
    Phien: item.id,
    Ket_qua: item.resultTruyenThong === 'TAI' ? 'Tài' : 'Xỉu',
    Xuc_xac_1: item.dices[0],
    Xuc_xac_2: item.dices[1],
    Xuc_xac_3: item.dices[2],
    Tong: item.point
  }));
}

async function fetchData(url) {
  try {
    const response = await axios.get(url, { timeout: 15000, params: { limit: FETCH_PER_REQUEST } });
    return transformApiData(response.data);
  } catch (e) {
    console.error(`❌ Fetch lỗi ${url}:`, e.message);
    return null;
  }
}

// ==================== QUẢN LÝ PHIÊN ====================
function mergeSessions(existing, newData) {
  if (!newData?.length) return existing;
  const existingIds = new Set(existing.map(s => s.Phien));
  const added = newData.filter(s => !existingIds.has(s.Phien));
  existing.unshift(...added);
  existing.sort((a, b) => b.Phien - a.Phien);
  // Giữ tối đa 5000 phiên để tiết kiệm bộ nhớ
  if (existing.length > 5000) existing = existing.slice(0, 5000);
  return { sessions: existing, addedCount: added.length };
}

async function accumulateSession(type) {
  const url = type === 'hu' ? API_URL_HU : API_URL_MD5;
  const newData = await fetchData(url);
  if (!newData) return;
  
  const result = mergeSessions(sessionsStore[type], newData);
  sessionsStore[type] = result.sessions;
  
  if (result.addedCount > 0) {
    console.log(`📥 [${type.toUpperCase()}] +${result.addedCount} phiên | Tổng: ${sessionsStore[type].length}/${MIN_SESSIONS}`);
    saveAllData();
  }
  
  if (!isReady[type] && sessionsStore[type].length >= MIN_SESSIONS) {
    isReady[type] = true;
    console.log(`🎉 [${type.toUpperCase()}] ĐÃ ĐỦ ${MIN_SESSIONS}+ PHIÊN! Bắt đầu dự đoán.`);
    updateBetStats(type, sessionsStore[type]);
  }
}

// ==================== HỌC THỐNG KÊ TỪ DỮ LIỆU ====================
function updateBetStats(type, data) {
  const results = data.map(d => d.Ket_qua);
  const stats = {};
  let currentType = results[0];
  let currentLen = 1;
  
  for (let i = 1; i < results.length; i++) {
    if (results[i] === currentType) {
      currentLen++;
    } else {
      const len = Math.min(currentLen, 30);
      if (!stats[len]) stats[len] = { tiep: 0, gay: 0 };
      if (i + 1 < results.length) {
        if (results[i + 1] === currentType) stats[len].tiep++;
        else stats[len].gay++;
      }
      currentType = results[i];
      currentLen = 1;
    }
  }
  learningData[type].betStats = stats;
  console.log(`📊 [${type.toUpperCase()}] Đã học thống kê bệt từ ${data.length} phiên`);
  saveAllData();
}

// ==================== QUẢN LÝ PATTERN ====================
function getPatternWeight(type, patternId) {
  return learningData[type].patternWeights?.[patternId] || DEFAULT_PATTERN_WEIGHTS[patternId] || 1.0;
}

function updatePatternPerformance(type, patternId, isCorrect) {
  if (!learningData[type].patternStats[patternId]) {
    learningData[type].patternStats[patternId] = { total: 0, correct: 0, recentResults: [] };
  }
  const stats = learningData[type].patternStats[patternId];
  stats.total++;
  if (isCorrect) stats.correct++;
  stats.recentResults.push(isCorrect ? 1 : 0);
  if (stats.recentResults.length > 20) stats.recentResults.shift();
  
  const recentAcc = stats.recentResults.reduce((a,b) => a + b, 0) / stats.recentResults.length;
  const oldWeight = learningData[type].patternWeights?.[patternId] || DEFAULT_PATTERN_WEIGHTS[patternId] || 1.0;
  let newWeight = oldWeight;
  if (stats.recentResults.length >= 5) {
    if (recentAcc > 0.65) newWeight = Math.min(3.0, oldWeight * 1.15);
    else if (recentAcc < 0.35) newWeight = Math.max(0.2, oldWeight * 0.85);
  }
  if (!learningData[type].patternWeights) learningData[type].patternWeights = {};
  learningData[type].patternWeights[patternId] = newWeight;
}

// ==================== PHÂN TÍCH CẦU NÂNG CAO ====================

function analyzeCauBet(results, type) {
  if (results.length < 2) return null;
  const first = results[0];
  let len = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] === first) len++;
    else break;
  }
  if (len < 2) return null;
  
  const stats = learningData[type].betStats?.[Math.min(len, 30)];
  let shouldBreak = false;
  let confidence = 65;
  
  if (stats && (stats.tiep + stats.gay) >= 5) {
    const tiepRate = stats.tiep / (stats.tiep + stats.gay);
    if (tiepRate > 0.6) { shouldBreak = false; confidence = 70 + Math.round(tiepRate * 25); }
    else if (tiepRate < 0.4) { shouldBreak = true; confidence = 70 + Math.round((1 - tiepRate) * 25); }
    else { shouldBreak = len >= 6; confidence = 65; }
  } else {
    if (len >= 8) { shouldBreak = true; confidence = 85; }
    else if (len >= 6) { shouldBreak = true; confidence = 75; }
    else if (len >= 4) { shouldBreak = false; confidence = 72; }
    else { shouldBreak = false; confidence = 68; }
  }
  
  const prediction = shouldBreak ? (first === 'Tài' ? 'Xỉu' : 'Tài') : first;
  const name = `Cầu Bệt ${len} ${first}${shouldBreak ? ' → BẺ' : ' → BÁM'}`;
  return { prediction, confidence, name, patternId: 'cau_bet' };
}

function analyzeCauBetNgam(results, type) {
  if (results.length < 8) return null;
  const last8 = results.slice(0, 8);
  const taiCount = last8.filter(r => r === 'Tài').length;
  const xiuCount = 8 - taiCount;
  const last3 = results.slice(0, 3);
  
  if (taiCount >= 6) {
    const allTai = last3.every(r => r === 'Tài');
    return {
      prediction: 'Tài',
      confidence: allTai ? 78 : 70,
      name: `Cầu Bệt Ngầm Tài (${taiCount}/8)${allTai ? ' → BÁM' : ' → CHUẨN BỊ'}`,
      patternId: 'cau_bet_ngam'
    };
  }
  if (xiuCount >= 6) {
    const allXiu = last3.every(r => r === 'Xỉu');
    return {
      prediction: 'Xỉu',
      confidence: allXiu ? 78 : 70,
      name: `Cầu Bệt Ngầm Xỉu (${xiuCount}/8)${allXiu ? ' → BÁM' : ' → CHUẨN BỊ'}`,
      patternId: 'cau_bet_ngam'
    };
  }
  return null;
}

function analyzeBeBetChuyenSau(data, results, type) {
  if (results.length < 5) return null;
  const first = results[0];
  let len = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] === first) len++;
    else break;
  }
  if (len < 3) return null;
  
  const scores = data.slice(0, len).map(d => d.Tong);
  const lastDice = data[0];
  
  if (first === 'Tài' && scores.length >= 3) {
    const [s1, s2, s3] = scores;
    if (s1 < s2 && s2 < s3 && s1 <= 10) {
      return { prediction: 'Xỉu', confidence: 82, name: `Bẻ Bệt Tài (điểm giảm ${s1}→${s2}→${s3})`, patternId: 'cau_be_bet' };
    }
  }
  if (first === 'Xỉu' && scores.length >= 3) {
    const [s1, s2, s3] = scores;
    if (s1 > s2 && s2 > s3 && s1 >= 11) {
      return { prediction: 'Tài', confidence: 82, name: `Bẻ Bệt Xỉu (điểm tăng ${s1}→${s2}→${s3})`, patternId: 'cau_be_bet' };
    }
  }
  if (lastDice.Xuc_xac_1 === lastDice.Xuc_xac_2 && lastDice.Xuc_xac_2 === lastDice.Xuc_xac_3) {
    return { prediction: first === 'Tài' ? 'Xỉu' : 'Tài', confidence: 78, name: `Bẻ Bệt (3 mặt ${lastDice.Xuc_xac_1})`, patternId: 'cau_be_bet' };
  }
  if (len >= 8) {
    return { prediction: first === 'Tài' ? 'Xỉu' : 'Tài', confidence: Math.min(95, 75 + len), name: `Bẻ Bệt ${len} (Siêu dài)`, patternId: 'cau_be_bet' };
  }
  return null;
}

function analyzeBamBet(results, type) {
  if (results.length < 2) return null;
  const [first, second] = results;
  if (first !== second) return null;
  const betType = first;
  const third = results.length > 2 ? results[2] : null;
  const fourth = results.length > 3 ? results[3] : null;
  
  if (third === betType) {
    if (fourth === betType) {
      return { prediction: betType, confidence: 78, name: `Bám Bệt ${betType} (4 phiên)`, patternId: 'cau_bam_bet' };
    }
    return { prediction: betType, confidence: 70, name: `Bám Bệt ${betType} (mới hình thành)`, patternId: 'cau_bam_bet' };
  }
  return null;
}

function analyzeCauDao11(results) {
  if (results.length < 4) return null;
  let len = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] !== results[i-1]) len++;
    else break;
  }
  if (len >= 4) {
    return { prediction: results[0] === 'Tài' ? 'Xỉu' : 'Tài', confidence: Math.min(82, 65 + len*2), name: `Cầu 1-1 (${len} nhịp)`, patternId: 'cau_dao_11' };
  }
  return null;
}

function analyzeCau22(results) {
  if (results.length < 4) return null;
  let pairs = 0;
  for (let i = 0; i < results.length - 1; i += 2) {
    if (results[i] === results[i+1]) pairs++;
    else break;
  }
  if (pairs >= 2) {
    const lastPair = results[(pairs-1)*2];
    return { prediction: lastPair === 'Tài' ? 'Xỉu' : 'Tài', confidence: Math.min(80, 65 + pairs*3), name: `Cầu 2-2 (${pairs} cặp)`, patternId: 'cau_22' };
  }
  return null;
}

function analyzeCau33(results) {
  if (results.length < 6) return null;
  let triples = 0;
  for (let i = 0; i < results.length - 2; i += 3) {
    if (results[i] === results[i+1] && results[i+1] === results[i+2]) triples++;
    else break;
  }
  if (triples >= 1) {
    const lastTriple = results[(triples-1)*3];
    return { prediction: lastTriple, confidence: Math.min(82, 68 + triples*4), name: `Cầu 3-3 (${triples} bộ)`, patternId: 'cau_33' };
  }
  return null;
}

function analyzeCau123(results) {
  if (results.length < 6) return null;
  const [a, b, c, d, e, f] = results;
  if (b === c && c !== d && d !== e && e === f) {
    return { prediction: a, confidence: 76, name: 'Cầu 1-2-3', patternId: 'cau_123' };
  }
  return null;
}

function analyzeCau321(results) {
  if (results.length < 6) return null;
  const [a, b, c, d, e, f] = results;
  if (a === b && b === c && d === e && e === f && a !== d) {
    return { prediction: d, confidence: 78, name: 'Cầu 3-2-1', patternId: 'cau_321' };
  }
  return null;
}

function analyzeCau121(results) {
  if (results.length < 4) return null;
  const [a, b, c, d] = results;
  if (a !== b && b === c && c !== d && a === d) {
    return { prediction: a, confidence: 74, name: 'Cầu 1-2-1', patternId: 'cau_121' };
  }
  return null;
}

function analyzeCauRong(results) {
  if (results.length < 6) return null;
  const first = results[0];
  let len = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] === first) len++;
    else break;
  }
  if (len >= 6) {
    return { prediction: first === 'Tài' ? 'Xỉu' : 'Tài', confidence: Math.min(90, 75 + len), name: `Cầu Rồng ${len}`, patternId: 'cau_rong' };
  }
  return null;
}

function analyzeDayGay(results) {
  if (results.length < 8) return null;
  const first = results[0];
  let len = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] === first) len++;
    else break;
  }
  if (len >= 6) {
    return { prediction: first === 'Tài' ? 'Xỉu' : 'Tài', confidence: Math.min(88, 73 + len), name: `Dây Gãy ${len}`, patternId: 'day_gay' };
  }
  return null;
}

function analyzeTongPhanTich(data) {
  if (data.length < 10) return null;
  const recent10 = data.slice(0, 10);
  const sums = recent10.map(d => d.Tong);
  const first5Avg = sums.slice(5).reduce((a,b) => a+b, 0) / 5;
  const last5Avg = sums.slice(0, 5).reduce((a,b) => a+b, 0) / 5;
  const trend = last5Avg - first5Avg;
  const results = recent10.map(d => d.Ket_qua);
  const taiCount = results.filter(r => r === 'Tài').length;
  
  if (trend > 1.5) return { prediction: 'Xỉu', confidence: Math.round(75 + Math.abs(trend)*3), name: `Tổng tăng → Xỉu`, patternId: 'tong_phan_tich' };
  if (trend < -1.5) return { prediction: 'Tài', confidence: Math.round(75 + Math.abs(trend)*3), name: `Tổng giảm → Tài`, patternId: 'tong_phan_tich' };
  if (Math.abs(taiCount - (10 - taiCount)) >= 3) {
    const pred = taiCount > 5 ? 'Xỉu' : 'Tài';
    return { prediction: pred, confidence: 70 + Math.abs(taiCount - 5) * 3, name: `Lệch ${taiCount}T/${10-taiCount}X → ${pred}`, patternId: 'tong_phan_tich' };
  }
  return null;
}

function analyzeXuHuongManh(results) {
  if (results.length < 8) return null;
  const last8 = results.slice(0, 8);
  const taiCount = last8.filter(r => r === 'Tài').length;
  if (taiCount >= 6) return { prediction: 'Xỉu', confidence: 80 + taiCount * 2, name: `Xu hướng mạnh Tài (${taiCount}/8) → Xỉu`, patternId: 'xu_huong_manh' };
  if (taiCount <= 2) return { prediction: 'Tài', confidence: 80 + (8 - taiCount) * 2, name: `Xu hướng mạnh Xỉu (${8 - taiCount}/8) → Tài`, patternId: 'xu_huong_manh' };
  return null;
}

function analyzeDaoChieu(results) {
  if (results.length < 5) return null;
  const last5 = results.slice(0, 5);
  const isAlt = last5.every((v, i) => i === 0 || v !== last5[i-1]);
  if (isAlt) return { prediction: last5[0] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 77, name: 'Đảo chiều 5 phiên', patternId: 'dao_chieu' };
  return null;
}

function analyzeSmartBet(results) {
  if (results.length < 10) return null;
  const last5 = results.slice(0, 5);
  const prev5 = results.slice(5, 10);
  const taiLast5 = last5.filter(r => r === 'Tài').length;
  const taiPrev5 = prev5.filter(r => r === 'Tài').length;
  if ((taiLast5 >= 4 && taiPrev5 <= 1) || (taiLast5 <= 1 && taiPrev5 >= 4)) {
    const pred = taiLast5 >= 4 ? 'Xỉu' : 'Tài';
    return { prediction: pred, confidence: 80, name: 'Đảo xu hướng', patternId: 'smart_bet' };
  }
  if (taiLast5 >= 4) return { prediction: 'Tài', confidence: 72, name: `Nhịp nghiêng Tài (${taiLast5}/5)`, patternId: 'cau_nhip_nghieng' };
  if (taiLast5 <= 1) return { prediction: 'Xỉu', confidence: 72, name: `Nhịp nghiêng Xỉu (${5 - taiLast5}/5)`, patternId: 'cau_nhip_nghieng' };
  return null;
}

function analyzeDistribution(data) {
  if (data.length < 50) return null;
  const total = data.length;
  const taiCount = data.filter(d => d.Ket_qua === 'Tài').length;
  const xiuCount = total - taiCount;
  const imbalance = Math.abs(taiCount - xiuCount) / total;
  if (imbalance > 0.1) {
    const minority = taiCount < xiuCount ? 'Tài' : 'Xỉu';
    return { prediction: minority, confidence: Math.round(60 + imbalance * 50), name: `Phân bố lệch (T:${(taiCount/total*100).toFixed(0)}%) → ${minority}`, patternId: 'distribution' };
  }
  return null;
}

// ==================== DỰ ĐOÁN TỔNG HỢP ====================
function predict(type) {
  const data = sessionsStore[type];
  if (!isReady[type] || data.length < 10) return { prediction: 'Chưa đủ dữ liệu', confidence: 0 };
  
  const results = data.map(d => d.Ket_qua);
  const predictions = [];
  
  const analyzers = [
    { fn: analyzeCauBet, args: [results, type] },
    { fn: analyzeBeBetChuyenSau, args: [data, results, type] },
    { fn: analyzeCauBetNgam, args: [results, type] },
    { fn: analyzeBamBet, args: [results, type] },
    { fn: analyzeCauRong, args: [results, type] },
    { fn: analyzeDayGay, args: [results, type] },
    { fn: analyzeCauDao11, args: [results] },
    { fn: analyzeCau22, args: [results] },
    { fn: analyzeCau33, args: [results] },
    { fn: analyzeCau123, args: [results] },
    { fn: analyzeCau321, args: [results] },
    { fn: analyzeCau121, args: [results] },
    { fn: analyzeTongPhanTich, args: [data] },
    { fn: analyzeXuHuongManh, args: [results] },
    { fn: analyzeDaoChieu, args: [results] },
    { fn: analyzeSmartBet, args: [results] },
    { fn: analyzeDistribution, args: [data] }
  ];
  
  analyzers.forEach(({ fn, args }) => {
    const result = fn(...args);
    if (result) {
      const weight = getPatternWeight(type, result.patternId);
      predictions.push({ ...result, weight, score: result.confidence * weight });
    }
  });
  
  if (predictions.length === 0) {
    predictions.push({ prediction: results[0], confidence: 60, weight: 1, name: 'Cầu tự nhiên' });
  }
  
  let taiScore = 0, xiuScore = 0;
  predictions.forEach(p => {
    if (p.prediction === 'Tài') taiScore += p.score;
    else xiuScore += p.score;
  });
  
  const finalPred = taiScore >= xiuScore ? 'Tài' : 'Xỉu';
  let confidence = Math.round((Math.max(taiScore, xiuScore) / (taiScore + xiuScore)) * 100);
  confidence = Math.max(60, Math.min(95, confidence));
  
  // Lưu dự đoán vào lịch sử (sẽ được cập nhật sau khi có kết quả)
  const nextPhien = data[0].Phien + 1;
  const historyEntry = {
    phien: nextPhien,
    du_doan: finalPred.toLowerCase(),
    ket_qua: null,
    danh_gia: null
  };
  predictionHistory[type].unshift(historyEntry);
  if (predictionHistory[type].length > 100) predictionHistory[type].length = 100; // chỉ giữ 100 gần nhất
  
  // Lưu vào learning data
  learningData[type].predictions.unshift({
    phien: nextPhien,
    prediction: finalPred,
    confidence,
    patterns: predictions.map(p => p.name),
    timestamp: new Date().toISOString(),
    verified: false
  });
  if (learningData[type].predictions.length > 200) learningData[type].predictions.length = 200;
  
  saveAllData();
  
  return {
    prediction: finalPred,
    confidence,
    patterns: predictions.slice(0, 5).map(p => ({ name: p.name, confidence: p.confidence })),
    totalPatterns: predictions.length
  };
}

// ==================== XÁC MINH & HỌC ====================
function verifyPredictions(type) {
  const data = sessionsStore[type];
  if (!data.length) return;
  
  // Xác minh các dự đoán đã lưu trong learningData
  learningData[type].predictions.forEach(pred => {
    if (pred.verified) return;
    const actual = data.find(d => d.Phien === pred.phien);
    if (actual) {
      pred.verified = true;
      pred.actual = actual.Ket_qua;
      pred.isCorrect = pred.prediction === actual.Ket_qua;
      
      if (pred.isCorrect) {
        learningData[type].correctPredictions++;
        learningData[type].streakAnalysis.wins++;
        learningData[type].streakAnalysis.currentStreak = Math.max(0, learningData[type].streakAnalysis.currentStreak) + 1;
      } else {
        learningData[type].streakAnalysis.losses++;
        learningData[type].streakAnalysis.currentStreak = Math.min(0, learningData[type].streakAnalysis.currentStreak) - 1;
      }
      learningData[type].totalPredictions++;
      learningData[type].recentAccuracy.push(pred.isCorrect ? 1 : 0);
      if (learningData[type].recentAccuracy.length > 30) learningData[type].recentAccuracy.shift();
      
      // Cập nhật pattern weights
      pred.patterns?.forEach(patternName => {
        const patternId = Object.keys(DEFAULT_PATTERN_WEIGHTS).find(id => patternName.includes(id));
        if (patternId) updatePatternPerformance(type, patternId, pred.isCorrect);
      });
    }
  });
  
  // Cập nhật lịch sử thắng thua (predictionHistory) dựa trên dữ liệu đã có
  predictionHistory[type].forEach(entry => {
    if (entry.ket_qua !== null) return; // đã cập nhật
    const actual = data.find(d => d.Phien === entry.phien);
    if (actual) {
      entry.ket_qua = actual.Ket_qua.toLowerCase();
      entry.danh_gia = entry.du_doan === entry.ket_qua ? 'thang' : 'thua';
    }
  });
  
  saveAllData();
}

// ==================== API ENDPOINTS ====================
app.get('/lc79-hu', async (req, res) => {
  await accumulateSession('hu');
  if (!isReady.hu) return res.json({ status: 'accumulating', progress: `${sessionsStore.hu.length}/${MIN_SESSIONS}` });
  
  verifyPredictions('hu');
  const pred = predict('hu');
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
      Phien: latestSession.Phien + 1,
      Du_doan: pred.prediction,
      Do_tin_cay: `${pred.confidence}%`
    },
    id: '@anhlakhoi',
    patterns: pred.patterns
  });
});

app.get('/lc79-md5', async (req, res) => {
  await accumulateSession('md5');
  if (!isReady.md5) return res.json({ status: 'accumulating', progress: `${sessionsStore.md5.length}/${MIN_SESSIONS}` });
  
  verifyPredictions('md5');
  const pred = predict('md5');
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
      Phien: latestSession.Phien + 1,
      Du_doan: pred.prediction,
      Do_tin_cay: `${pred.confidence}%`
    },
    id: '@anhlakhoi',
    patterns: pred.patterns
  });
});

app.get('/lc79-hu/history', async (req, res) => {
  verifyPredictions('hu');
  res.json(predictionHistory.hu);
});

app.get('/lc79-md5/history', async (req, res) => {
  verifyPredictions('md5');
  res.json(predictionHistory.md5);
});

app.get('/status', (req, res) => {
  res.json({
    hu: { sessions: sessionsStore.hu.length, ready: isReady.hu },
    md5: { sessions: sessionsStore.md5.length, ready: isReady.md5 }
  });
});

// ==================== KHỞI ĐỘNG ====================
async function mainLoop() {
  // Tích lũy đến khi đủ 100 phiên
  while (!isReady.hu || !isReady.md5) {
    const tasks = [];
    if (!isReady.hu) tasks.push(accumulateSession('hu'));
    if (!isReady.md5) tasks.push(accumulateSession('md5'));
    await Promise.all(tasks);
    if (!isReady.hu || !isReady.md5) {
      console.log(`⏳ Tiến độ: HU=${sessionsStore.hu.length}/${MIN_SESSIONS} MD5=${sessionsStore.md5.length}/${MIN_SESSIONS}`);
      await new Promise(r => setTimeout(r, FETCH_INTERVAL));
    }
  }
  
  console.log('✅ Cả hai bàn đã sẵn sàng! Bắt đầu dự đoán tự động...');
  
  // Dự đoán và cập nhật liên tục
  setInterval(async () => {
    await accumulateSession('hu');
    await accumulateSession('md5');
    verifyPredictions('hu');
    verifyPredictions('md5');
    saveAllData();
  }, AUTO_SAVE_INTERVAL);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Anhlakhoi AI Server chạy tại cổng ${PORT}`);
  loadAllData();
  mainLoop();
});
