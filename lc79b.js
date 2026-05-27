// ╔══════════════════════════════════════════════════════════════════════╗
// ║  VUAOCCAC GOD AI - ULTIMATE 26 LOGICS + DEEP AI + MIT TỔNG HỢP   ║
// ║  Tích hợp toàn bộ thuật toán từ hệ thống MIT + Backend ML        ║
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
const MAX_HISTORY = 100;

// ==================== 1. HÀM PHÂN TÍCH CƠ BẢN ====================
function calculateStdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
}

function avg(nums) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function entropy(arr) {
    if (!arr.length) return 0;
    const freq = {};
    for (const v of arr) freq[v] = (freq[v] || 0) + 1;
    let e = 0, n = arr.length;
    for (const k in freq) { const p = freq[k] / n; e -= p * Math.log2(p); }
    return e;
}
function similarity(a, b) {
    if (a.length !== b.length) return 0;
    let m = 0; for (let i = 0; i < a.length; i++) { if (a[i] === b[i]) m++; } return m / a.length;
}

function extractFeatures(historyArrTx) {
    const tx = historyArrTx.map(h => h.tx);
    const totals = historyArrTx.map(h => h.total);
    const freq = {}; for (const v of tx) freq[v] = (freq[v] || 0) + 1;
    let runs = [], cur = tx[0], len = 1;
    for (let i = 1; i < tx.length; i++) {
        if (tx[i] === cur) len++; else { runs.push({ val: cur, len }); cur = tx[i]; len = 1; }
    }
    if (tx.length) runs.push({ val: cur, len });
    const meanTotal = avg(totals); const variance = avg(totals.map(t => Math.pow(t - meanTotal, 2)));
    return { tx, totals, freq, runs, maxRun: runs.reduce((m, r) => Math.max(m, r.len), 0), meanTotal, stdTotal: Math.sqrt(variance), entropy: entropy(tx) };
}

// ==================== 2. 26 LOGIC MACHINE LEARNING ====================
function predictLogic1(lastSession, history) {
    if (!lastSession || history.length < 10) return null;
    const indicatorSum = (lastSession.Phien % 10) + lastSession.Tong;
    const currentPrediction = indicatorSum % 2 === 0 ? "Xỉu" : "Tài";
    let correctCount = 0; let totalCount = 0;
    const consistencyWindow = Math.min(history.length - 1, 25);
    for (let i = 0; i < consistencyWindow; i++) {
        const session = history[i]; const prevSession = history[i + 1];
        if (prevSession) {
            const prevPredicted = ((prevSession.Phien % 10) + prevSession.Tong) % 2 === 0 ? "Xỉu" : "Tài";
            if (prevPredicted === session.Ket_qua) correctCount++;
            totalCount++;
        }
    }
    if (totalCount > 5 && (correctCount / totalCount) >= 0.65) return currentPrediction;
    return null;
}

function predictLogic2(nextSessionId, history) {
    if (history.length < 15) return null;
    let thuanScore = 0; let nghichScore = 0;
    const analysisWindow = Math.min(history.length, 60);
    for (let i = 0; i < analysisWindow; i++) {
        const session = history[i]; const isEvenSID = session.Phien % 2 === 0;
        const weight = 1.0 - (i / analysisWindow) * 0.6;
        if ((isEvenSID && session.Ket_qua === "Xỉu") || (!isEvenSID && session.Ket_qua === "Tài")) thuanScore += weight;
        if ((isEvenSID && session.Ket_qua === "Tài") || (!isEvenSID && session.Ket_qua === "Xỉu")) nghichScore += weight;
    }
    const currentSessionIsEven = nextSessionId % 2 === 0;
    const totalScore = thuanScore + nghichScore;
    if (totalScore < 10) return null;
    const thuanRatio = thuanScore / totalScore; const nghichRatio = nghichScore / totalScore;
    if (thuanRatio > nghichRatio + 0.15) return currentSessionIsEven ? "Xỉu" : "Tài";
    else if (nghichRatio > thuanRatio + 0.15) return currentSessionIsEven ? "Tài" : "Xỉu";
    return null;
}

function predictLogic3(history) {
    if (history.length < 15) return null;
    const analysisWindow = Math.min(history.length, 50);
    const lastXTotals = history.slice(0, analysisWindow).map(s => s.Tong);
    const average = lastXTotals.reduce((a, b) => a + b, 0) / analysisWindow;
    const stdDev = calculateStdDev(lastXTotals);
    const recentTrendLength = Math.min(5, history.length);
    const recentTrend = history.slice(0, recentTrendLength).map(s => s.Tong);
    let isRising = false; let isFalling = false;
    if (recentTrendLength >= 3) {
        isRising = true; isFalling = true;
        for (let i = 0; i < recentTrendLength - 1; i++) {
            if (recentTrend[i] <= recentTrend[i + 1]) isRising = false;
            if (recentTrend[i] >= recentTrend[i + 1]) isFalling = false;
        }
    }
    if (average < 10.5 - (0.8 * stdDev) && isFalling) return "Xỉu";
    else if (average > 10.5 + (0.8 * stdDev) && isRising) return "Tài";
    return null;
}

function predictLogic4(history) {
    if (history.length < 30) return null;
    let bestPrediction = null; let maxConfidence = 0;
    const volatility = calculateStdDev(history.slice(0, Math.min(30, history.length)).map(s => s.Tong));
    const patternLengths = (volatility < 1.7) ? [6, 5, 4] : [5, 4, 3];
    for (const len of patternLengths) {
        if (history.length < len + 2) continue;
        const recentPattern = history.slice(0, len).map(s => s.Ket_qua).reverse().join('');
        let taiFollows = 0; let xiuFollows = 0; let totalMatches = 0;
        for (let i = len; i < Math.min(history.length - 1, 200); i++) {
            const patternToMatch = history.slice(i, i + len).map(s => s.Ket_qua).reverse().join('');
            if (patternToMatch === recentPattern) {
                totalMatches++;
                if (history[i - 1].Ket_qua === 'Tài') taiFollows++; else xiuFollows++;
            }
        }
        if (totalMatches < 3) continue;
        const taiConfidence = taiFollows / totalMatches; const xiuConfidence = xiuFollows / totalMatches;
        if (taiConfidence >= 0.70 && taiConfidence > maxConfidence) { maxConfidence = taiConfidence; bestPrediction = "Tài"; }
        else if (xiuConfidence >= 0.70 && xiuConfidence > maxConfidence) { maxConfidence = xiuConfidence; bestPrediction = "Xỉu"; }
    }
    return bestPrediction;
}

function predictLogic5(history) {
    if (history.length < 40) return null;
    const sumCounts = {}; const analysisWindow = Math.min(history.length, 400);
    for (let i = 0; i < analysisWindow; i++) {
        const total = history[i].Tong;
        sumCounts[total] = (sumCounts[total] || 0) + (1.0 - (i / analysisWindow) * 0.8);
    }
    let mostFrequentSum = -1; let maxWeightedCount = 0;
    for (const sum in sumCounts) {
        if (sumCounts[sum] > maxWeightedCount) { maxWeightedCount = sumCounts[sum]; mostFrequentSum = parseInt(sum); }
    }
    if (mostFrequentSum !== -1) {
        const totalWeightedSum = Object.values(sumCounts).reduce((a, b) => a + b, 0);
        if (totalWeightedSum > 0 && (maxWeightedCount / totalWeightedSum) > 0.08) {
            const neighbors = [];
            if (sumCounts[mostFrequentSum - 1]) neighbors.push(sumCounts[mostFrequentSum - 1]);
            if (sumCounts[mostFrequentSum + 1]) neighbors.push(sumCounts[mostFrequentSum + 1]);
            const isPeak = neighbors.every(n => maxWeightedCount > n * 1.05);
            if (isPeak) {
                if (mostFrequentSum <= 10) return "Xỉu";
                if (mostFrequentSum >= 11) return "Tài";
            }
        }
    }
    return null;
}

function predictLogic6(lastSession, history) {
    if (!lastSession || history.length < 40) return null;
    const nextSessionLastDigit = (lastSession.Phien + 1) % 10;
    const lastSessionTotalParity = lastSession.Tong % 2;
    let taiVotes = 0; let xiuVotes = 0;
    const analysisWindow = Math.min(history.length, 250);
    for (let i = 0; i < analysisWindow - 1; i++) {
        const prevHistSession = history[i + 1];
        const featureSetHistory = `${(prevHistSession.Phien % 10) % 2}-${prevHistSession.Tong % 2}-${(prevHistSession.Tong > 10.5 ? 'T' : 'X')}`;
        const featureSetCurrent = `${nextSessionLastDigit % 2}-${lastSessionTotalParity}-${(lastSession.Tong > 10.5 ? 'T' : 'X')}`;
        if (featureSetHistory === featureSetCurrent) {
            if (history[i].Ket_qua === "Tài") taiVotes++; else xiuVotes++;
        }
    }
    const totalVotes = taiVotes + xiuVotes;
    if (totalVotes < 5) return null;
    const voteDifferenceRatio = Math.abs(taiVotes - xiuVotes) / totalVotes;
    if (voteDifferenceRatio > 0.25) {
        if (taiVotes > xiuVotes) return "Tài";
        if (xiuVotes > taiVotes) return "Xỉu";
    }
    return null;
}

function predictLogic7(history) {
    if (history.length < 4) return null;
    const volatility = calculateStdDev(history.slice(0, Math.min(25, history.length)).map(s => s.Tong));
    const effectiveStreakLength = (volatility < 1.6) ? 7 : 5;
    const recentResults = history.slice(0, effectiveStreakLength).map(s => s.Ket_qua);
    if (recentResults.length < effectiveStreakLength) return null;
    if (recentResults.every(r => r === "Tài")) {
        const nextFew = history.slice(effectiveStreakLength, effectiveStreakLength + 2);
        if (nextFew.length === 2 && nextFew.filter(s => s.Ket_qua === "Tài").length >= 1) return "Tài";
    }
    if (recentResults.every(r => r === "Xỉu")) {
        const nextFew = history.slice(effectiveStreakLength, effectiveStreakLength + 2);
        if (nextFew.length === 2 && nextFew.filter(s => s.Ket_qua === "Xỉu").length >= 1) return "Xỉu";
    }
    return null;
}

function predictLogic8(history) {
    if (history.length < 31) return null;
    const longTermTotals = history.slice(1, 31).map(s => s.Tong);
    const longTermAverage = longTermTotals.reduce((a, b) => a + b, 0) / 30;
    const longTermStdDev = calculateStdDev(longTermTotals);
    const lastSessionTotal = history[0].Tong;
    const dynamicDeviationThreshold = Math.max(1.5, 0.8 * longTermStdDev);
    const last5Totals = history.slice(0, Math.min(5, history.length)).map(s => s.Tong);
    let isLast5Rising = true; let isLast5Falling = true;
    for (let i = 0; i < last5Totals.length - 1; i++) {
        if (last5Totals[i] <= last5Totals[i + 1]) isLast5Rising = false;
        if (last5Totals[i] >= last5Totals[i + 1]) isLast5Falling = false;
    }
    if (lastSessionTotal > longTermAverage + dynamicDeviationThreshold && isLast5Rising) return "Xỉu";
    else if (lastSessionTotal < longTermAverage - dynamicDeviationThreshold && isLast5Falling) return "Tài";
    return null;
}

function predictLogic9(history) {
    if (history.length < 20) return null;
    let maxTaiStreak = 0; let maxXiuStreak = 0;
    let currentTaiStreakForHistory = 0; let currentXiuStreakForHistory = 0;
    const historyForMaxStreak = history.slice(0, Math.min(history.length, 120));
    for (const session of historyForMaxStreak) {
        if (session.Ket_qua === "Tài") { currentTaiStreakForHistory++; currentXiuStreakForHistory = 0; }
        else { currentXiuStreakForHistory++; currentTaiStreakForHistory = 0; }
        maxTaiStreak = Math.max(maxTaiStreak, currentTaiStreakForHistory);
        maxXiuStreak = Math.max(maxXiuStreak, currentXiuStreakForHistory);
    }
    const dynamicThreshold = Math.max(4, Math.floor(Math.max(maxTaiStreak, maxXiuStreak) * 0.5));
    const mostRecentResult = history[0].Ket_qua;
    let currentConsecutiveCount = 0;
    for (let i = 0; i < history.length; i++) {
        if (history[i].Ket_qua === mostRecentResult) currentConsecutiveCount++; else break;
    }
    if (currentConsecutiveCount >= dynamicThreshold && currentConsecutiveCount >= 3) {
        let totalReversals = 0; let totalContinuations = 0;
        for (let i = currentConsecutiveCount; i < history.length - currentConsecutiveCount; i++) {
            const potentialStreak = history.slice(i, i + currentConsecutiveCount);
            if (potentialStreak.every(s => s.Ket_qua === mostRecentResult)) {
                if (history[i - 1] && history[i - 1].Ket_qua !== mostRecentResult) totalReversals++;
                else if (history[i - 1] && history[i - 1].Ket_qua === mostRecentResult) totalContinuations++;
            }
        }
        if (totalReversals + totalContinuations > 3 && totalReversals > totalContinuations * 1.3) return mostRecentResult === "Tài" ? "Xỉu" : "Tài";
    }
    return null;
}

function predictLogic10(history) {
    if (history.length < 8) return null;
    const recentResults = history.slice(0, 3).map(s => s.Ket_qua);
    const widerHistory = history.slice(0, 7).map(s => s.Ket_qua);
    if (recentResults.every(r => r === "Tài") && (widerHistory.filter(r => r === "Tài").length / 7 >= 0.75)) {
        if (predictLogic9(history) !== "Xỉu") return "Tài";
    }
    if (recentResults.every(r => r === "Xỉu") && (widerHistory.filter(r => r === "Xỉu").length / 7 >= 0.75)) {
        if (predictLogic9(history) !== "Tài") return "Xỉu";
    }
    return null;
}

function predictLogic11(history) {
    if (history.length < 15) return null;
    const reversalPatterns = [
        { pattern: "TàiXỉuTài", predict: "Xỉu", minOccurrences: 3, weight: 1.5 },
        { pattern: "XỉuTàiXỉu", predict: "Tài", minOccurrences: 3, weight: 1.5 },
        { pattern: "TàiTàiXỉu", predict: "Tài", minOccurrences: 4, weight: 1.3 },
        { pattern: "XỉuXỉuTài", predict: "Xỉu", minOccurrences: 4, weight: 1.3 },
        { pattern: "TàiXỉuXỉu", predict: "Tài", minOccurrences: 3, weight: 1.4 },
        { pattern: "XỉuTàiTài", predict: "Xỉu", minOccurrences: 3, weight: 1.4 },
        { pattern: "XỉuTàiTàiXỉu", predict: "Xỉu", minOccurrences: 2, weight: 1.6 },
        { pattern: "TàiXỉuXỉuTài", predict: "Tài", minOccurrences: 2, weight: 1.6 },
        { pattern: "TàiXỉuTàiXỉu", predict: "Tài", minOccurrences: 2, weight: 1.4 },
        { pattern: "XỉuTàiXỉuTài", predict: "Xỉu", minOccurrences: 2, weight: 1.4 },
        { pattern: "TàiXỉuXỉuXỉu", predict: "Tài", minOccurrences: 1, weight: 1.7 },
        { pattern: "XỉuTàiTàiTài", predict: "Xỉu", minOccurrences: 1, weight: 1.7 },
    ];
    let bestPatternMatch = null; let maxWeightedConfidence = 0;
    for (const patternDef of reversalPatterns) {
        const patternDefShort = patternDef.pattern.replace(/Tài/g, 'T').replace(/Xỉu/g, 'X');
        const patternLength = patternDefShort.length;
        if (history.length < patternLength + 1) continue;
        const currentWindowShort = history.slice(0, patternLength).map(s => s.Ket_qua === 'Tài' ? 'T' : 'X').reverse().join('');
        if (currentWindowShort === patternDefShort) {
            let matchCount = 0; let totalPatternOccurrences = 0;
            for (let i = patternLength; i < Math.min(history.length - 1, 350); i++) {
                const historicalPatternShort = history.slice(i, i + patternLength).map(s => s.Ket_qua === 'Tài' ? 'T' : 'X').reverse().join('');
                if (historicalPatternShort === patternDefShort) {
                    totalPatternOccurrences++;
                    if (history[i - 1].Ket_qua === patternDef.predict) matchCount++;
                }
            }
            if (totalPatternOccurrences < patternDef.minOccurrences) continue;
            const patternAccuracy = matchCount / totalPatternOccurrences;
            if (patternAccuracy >= 0.68) {
                const weightedConfidence = patternAccuracy * patternDef.weight;
                if (weightedConfidence > maxWeightedConfidence) {
                    maxWeightedConfidence = weightedConfidence;
                    bestPatternMatch = patternDef.predict;
                }
            }
        }
    }
    return bestPatternMatch;
}

function predictLogic12(lastSession, history) {
    if (!lastSession || history.length < 20) return null;
    const nextSessionParity = (lastSession.Phien + 1) % 2;
    const mostRecentResult = history[0].Ket_qua;
    let currentConsecutiveCount = 0;
    for (let i = 0; i < history.length; i++) {
        if (history[i].Ket_qua === mostRecentResult) currentConsecutiveCount++; else break;
    }
    let taiVotes = 0; let xiuVotes = 0;
    const analysisWindow = Math.min(history.length, 250);
    for (let i = 0; i < analysisWindow - 1; i++) {
        const currentHistSession = history[i];
        const prevHistSession = history[i + 1];
        let histConsecutiveCount = 0;
        for (let j = i + 1; j < analysisWindow; j++) {
            if (history[j].Ket_qua === prevHistSession.Ket_qua) histConsecutiveCount++; else break;
        }
        if ((prevHistSession.Phien % 2) === nextSessionParity && histConsecutiveCount === currentConsecutiveCount) {
            if (currentHistSession.Ket_qua === "Tài") taiVotes++; else xiuVotes++;
        }
    }
    const totalVotes = taiVotes + xiuVotes;
    if (totalVotes < 6) return null;
    if (taiVotes / totalVotes >= 0.68) return "Tài";
    if (xiuVotes / totalVotes >= 0.68) return "Xỉu";
    return null;
}

function predictLogic13(history) {
    if (history.length < 80) return null;
    const mostRecentResult = history[0].Ket_qua;
    let currentStreakLength = 0;
    for (let i = 0; i < history.length; i++) {
        if (history[i].Ket_qua === mostRecentResult) currentStreakLength++; else break;
    }
    if (currentStreakLength < 1) return null;
    const streakStats = {};
    const analysisWindow = Math.min(history.length, 500);
    for (let i = 0; i < analysisWindow - 1; i++) {
        const sessionResult = history[i].Ket_qua;
        const prevSessionResult = history[i + 1].Ket_qua;
        let tempStreakLength = 1;
        for (let j = i + 2; j < analysisWindow; j++) {
            if (history[j].Ket_qua === prevSessionResult) tempStreakLength++; else break;
        }
        if (tempStreakLength > 0) {
            const streakKey = `${prevSessionResult}_${tempStreakLength}`;
            if (!streakStats[streakKey]) streakStats[streakKey] = { 'Tài': 0, 'Xỉu': 0 };
            streakStats[streakKey][sessionResult]++;
        }
    }
    const currentStreakKey = `${mostRecentResult}_${currentStreakLength}`;
    if (streakStats[currentStreakKey]) {
        const stats = streakStats[currentStreakKey];
        const totalFollowUps = stats['Tài'] + stats['Xỉu'];
        if (totalFollowUps < 5) return null;
        if (stats['Tài'] / totalFollowUps >= 0.65) return "Tài";
        if (stats['Xỉu'] / totalFollowUps >= 0.65) return "Xỉu";
    }
    return null;
}

function predictLogic14(history) {
    if (history.length < 50) return null;
    const shortTermTotals = history.slice(0, 8).map(s => s.Tong);
    const longTermTotals = history.slice(0, 30).map(s => s.Tong);
    const shortAvg = shortTermTotals.reduce((a, b) => a + b, 0) / 8;
    const longAvg = longTermTotals.reduce((a, b) => a + b, 0) / 30;
    const longStdDev = calculateStdDev(longTermTotals);
    if (shortAvg > longAvg + (longStdDev * 0.8) && history.slice(0, 2).every(s => s.Ket_qua === "Tài")) return "Xỉu";
    else if (shortAvg < longAvg - (longStdDev * 0.8) && history.slice(0, 2).every(s => s.Ket_qua === "Xỉu")) return "Tài";
    return null;
}

function predictLogic15(history) {
    if (history.length < 80) return null;
    const analysisWindow = Math.min(history.length, 400);
    const evenCounts = { "Tài": 0, "Xỉu": 0 }; const oddCounts = { "Tài": 0, "Xỉu": 0 };
    let totalEven = 0; let totalOdd = 0;
    for (let i = 0; i < analysisWindow; i++) {
        if (history[i].Tong % 2 === 0) { evenCounts[history[i].Ket_qua]++; totalEven++; }
        else { oddCounts[history[i].Ket_qua]++; totalOdd++; }
    }
    if (totalEven < 20 || totalOdd < 20) return null;
    if (history[0].Tong % 2 === 0) {
        if (evenCounts["Tài"] / totalEven >= 0.65) return "Tài";
        if (evenCounts["Xỉu"] / totalEven >= 0.65) return "Xỉu";
    } else {
        if (oddCounts["Tài"] / totalOdd >= 0.65) return "Tài";
        if (oddCounts["Xỉu"] / totalOdd >= 0.65) return "Xỉu";
    }
    return null;
}

function predictLogic16(history) {
    if (history.length < 60) return null;
    const moduloPatterns = {};
    const analysisWindow = Math.min(history.length, 500);
    for (let i = 0; i < analysisWindow - 1; i++) {
        const moduloValue = history[i + 1].Tong % 5;
        if (!moduloPatterns[moduloValue]) moduloPatterns[moduloValue] = { 'Tài': 0, 'Xỉu': 0 };
        moduloPatterns[moduloValue][history[i].Ket_qua]++;
    }
    const currentModuloValue = history[0].Tong % 5;
    if (moduloPatterns[currentModuloValue]) {
        const stats = moduloPatterns[currentModuloValue];
        const totalCount = stats['Tài'] + stats['Xỉu'];
        if (totalCount < 7) return null;
        if (stats['Tài'] / totalCount >= 0.65) return "Tài";
        if (stats['Xỉu'] / totalCount >= 0.65) return "Xỉu";
    }
    return null;
}

function predictLogic17(history) {
    if (history.length < 100) return null;
    const analysisWindow = Math.min(history.length, 600);
    const totals = history.slice(0, analysisWindow).map(s => s.Tong);
    const meanTotal = totals.reduce((a, b) => a + b, 0) / totals.length;
    const stdDevTotal = calculateStdDev(totals);
    const lastSessionTotal = history[0].Tong;
    const zScore = stdDevTotal > 0 ? Math.abs(lastSessionTotal - meanTotal) / stdDevTotal : 0;
    if (zScore >= 1.5) {
        if (lastSessionTotal > meanTotal) return "Xỉu"; else return "Tài";
    }
    return null;
}

function predictLogic18(history) {
    if (history.length < 50) return null;
    const patternStats = {};
    const analysisWindow = Math.min(history.length, 300);
    for (let i = 0; i < analysisWindow - 1; i++) {
        const p1 = history[i + 1].Xuc_xac_1 % 2; const p2 = history[i + 1].Xuc_xac_2 % 2; const p3 = history[i + 1].Xuc_xac_3 % 2;
        const patternKey = `${p1}-${p2}-${p3}`;
        if (!patternStats[patternKey]) patternStats[patternKey] = { 'Tài': 0, 'Xỉu': 0 };
        patternStats[patternKey][history[i].Ket_qua]++;
    }
    const lastSession = history[0];
    const currentPatternKey = `${lastSession.Xuc_xac_1 % 2}-${lastSession.Xuc_xac_2 % 2}-${lastSession.Xuc_xac_3 % 2}`;
    if (patternStats[currentPatternKey]) {
        const stats = patternStats[currentPatternKey];
        const totalCount = stats['Tài'] + stats['Xỉu'];
        if (totalCount < 8) return null;
        if (stats['Tài'] / totalCount >= 0.65) return "Tài";
        if (stats['Xỉu'] / totalCount >= 0.65) return "Xỉu";
    }
    return null;
}

function predictLogic19(history) {
    if (history.length < 50) return null;
    let taiScore = 0; let xiuScore = 0;
    const now = Date.now(); const analysisWindowMs = 2 * 60 * 60 * 1000;
    for (const session of history) {
        if (now - (session.Thoi_gian ? new Date(session.Thoi_gian).getTime() : now) > analysisWindowMs) break;
        const ageFactor = 1 - ((now - (session.Thoi_gian ? new Date(session.Thoi_gian).getTime() : now)) / analysisWindowMs);
        const weight = ageFactor * ageFactor * ageFactor;
        if (session.Ket_qua === "Tài") taiScore += weight; else xiuScore += weight;
    }
    const totalScore = taiScore + xiuScore;
    if (totalScore < 10) return null;
    if (taiScore / totalScore > (xiuScore / totalScore) + 0.10) return "Tài";
    else if (xiuScore / totalScore > (taiScore / totalScore) + 0.10) return "Xỉu";
    return null;
}

function markovWeightedV3(patternArr) {
    if (patternArr.length < 3) return null;
    const transitions = {};
    const lastResult = patternArr[patternArr.length - 1];
    const secondLastResult = patternArr.length > 1 ? patternArr[patternArr.length - 2] : null;
    for (let i = 0; i < patternArr.length - 1; i++) {
        const key = patternArr[i] + patternArr[i + 1];
        if (!transitions[key]) transitions[key] = { 'T': 0, 'X': 0 };
        if (i + 2 < patternArr.length) transitions[key][patternArr[i + 2]]++;
    }
    if (secondLastResult && lastResult) {
        const stats = transitions[secondLastResult + lastResult];
        if (stats && (stats['T'] + stats['X']) > 3) {
            if (stats['T'] / (stats['T'] + stats['X']) > 0.60) return "Tài";
            if (stats['X'] / (stats['T'] + stats['X']) > 0.60) return "Xỉu";
        }
    }
    return null;
}

function repeatingPatternV3(patternArr) {
    if (patternArr.length < 4) return null;
    const lastThree = patternArr.slice(-3).join('');
    const lastFour = patternArr.slice(-4).join('');
    let taiFollows = 0; let xiuFollows = 0; let totalMatches = 0;
    for (let i = 0; i < patternArr.length - 4; i++) {
        const sliceThree = patternArr.slice(i, i + 3).join('');
        const sliceFour = patternArr.slice(i, i + 4).join('');
        if ((lastThree === sliceThree || lastFour === sliceFour) && i + 4 < patternArr.length) {
            totalMatches++;
            if (patternArr[i + 4] === 'T') taiFollows++; else xiuFollows++;
        }
    }
    if (totalMatches < 3) return null;
    if (taiFollows / totalMatches > 0.65) return "Tài";
    if (xiuFollows / totalMatches > 0.65) return "Xỉu";
    return null;
}

function predictLogic21(history) {
    if (history.length < 20) return null;
    const patternArr = history.map(s => s.Ket_qua === 'Tài' ? 'T' : 'X').reverse();
    const voteCounts = { Tài: 0, Xỉu: 0 }; let totalWeightSum = 0;
    const windows = [3, 5, 8, 12, 20, 30, 40, 60, 80];
    for (const win of windows) {
        if (patternArr.length < win) continue;
        const subPattern = patternArr.slice(-win);
        const weight = win / 10;
        const markovRes = markovWeightedV3(subPattern);
        if (markovRes) { voteCounts[markovRes] += weight * 0.7; totalWeightSum += weight * 0.7; }
        const repeatRes = repeatingPatternV3(subPattern);
        if (repeatRes) { voteCounts[repeatRes] += weight * 0.15; totalWeightSum += weight * 0.15; }
    }
    if (totalWeightSum === 0) return null;
    if (voteCounts.Tài > voteCounts.Xỉu * 1.08) return "Tài";
    else if (voteCounts.Xỉu > voteCounts.Tài * 1.08) return "Xỉu";
    return null;
}

function predictLogic22(history) {
    if (history.length < 15) return null;
    const resultsOnly = history.map(s => s.Ket_qua === 'Tài' ? 'T' : 'X');
    let taiVotes = 0; let xiuVotes = 0; let totalContributionWeight = 0;
    let currentStreakLength = 0;
    for(let i=0; i<resultsOnly.length; i++) {
        if(resultsOnly[i] === resultsOnly[0]) currentStreakLength++; else break;
    }
    if (currentStreakLength >= 3) {
        let streakBreakCount = 0; let streakContinueCount = 0;
        const streakSearchWindow = Math.min(resultsOnly.length, 200);
        for (let i = currentStreakLength; i < streakSearchWindow; i++) {
            const potentialStreak = resultsOnly.slice(i, i + currentStreakLength);
            if (potentialStreak.every(r => r === resultsOnly[0]) && resultsOnly[i - 1]) {
                if (resultsOnly[i - 1] === resultsOnly[0]) streakContinueCount++; else streakBreakCount++;
            }
        }
        const totalOccurrences = streakBreakCount + streakContinueCount;
        if (totalOccurrences > 5) {
            if (streakBreakCount / totalOccurrences > 0.65) {
                if (resultsOnly[0] === 'T') xiuVotes += 1.5; else taiVotes += 1.5;
                totalContributionWeight += 1.5;
            } else if (streakContinueCount / totalOccurrences > 0.65) {
                if (resultsOnly[0] === 'T') taiVotes += 1.5; else xiuVotes += 1.5;
                totalContributionWeight += 1.5;
            }
        }
    }
    if (totalContributionWeight === 0) return null;
    if (taiVotes > xiuVotes * 1.1) return "Tài";
    else if (xiuVotes > taiVotes * 1.1) return "Xỉu";
    return null;
}

function predictLogic23(history) {
    if (history.length < 5) return null;
    const totals = history.map(s => s.Tong);
    const allDice = history.slice(0, Math.min(history.length, 10)).flatMap(s => [s.Xuc_xac_1, s.Xuc_xac_2, s.Xuc_xac_3]);
    const diceFreq = new Array(7).fill(0);
    allDice.forEach(d => { if (d >= 1 && d <= 6) diceFreq[d]++; });
    const avg_total = totals.slice(0, Math.min(history.length, 10)).reduce((a, b) => a + b, 0) / Math.min(history.length, 10);
    const simplePredictions = [];
    if (history.length >= 2) simplePredictions.push((totals[0] + totals[1]) % 2 === 0 ? "Tài" : "Xỉu");
    simplePredictions.push(avg_total > 10.5 ? "Tài" : "Xỉu");
    simplePredictions.push(diceFreq[4] + diceFreq[5] > diceFreq[1] + diceFreq[2] ? "Tài" : "Xỉu");
    simplePredictions.push(history.filter(s => s.Tong > 10).length > history.length / 2 ? "Tài" : "Xỉu");
    if (history.length >= 3) simplePredictions.push(totals.slice(0, 3).reduce((a, b) => a + b, 0) > 33 ? "Tài" : "Xỉu");
    if (history.length >= 5) {
        simplePredictions.push(Math.max(...totals.slice(0, 5)) > 15 ? "Tài" : "Xỉu");
        simplePredictions.push(totals.slice(0, 5).filter(t => t > 10).length >= 3 ? "Tài" : "Xỉu");
    }
    if (history.length >= 2) {
        if (totals[0] > 10 && totals[1] > 10) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
        if (totals[0] < 10 && totals[1] < 10) simplePredictions.push("Xỉu"); else simplePredictions.push("Tài");
    }
    let taiVotes = 0; let xiuVotes = 0;
    simplePredictions.forEach(p => { if (p === "Tài") taiVotes++; else if (p === "Xỉu") xiuVotes++; });
    if (taiVotes > xiuVotes * 1.5) return "Tài";
    else if (xiuVotes > taiVotes * 1.5) return "Xỉu";
    return null;
}

const PATTERN_DATA_MAP = {
    "ttxttx": { tai: 80, xiu: 20 }, "xxttxx": { tai: 25, xiu: 75 }, "ttxxtt": { tai: 75, xiu: 25 },
    "ttx": { tai: 70, xiu: 30 }, "xxt": { tai: 30, xiu: 70 }, "tttt": { tai: 85, xiu: 15 },
    "xxxx": { tai: 15, xiu: 85 }, "ttttt": { tai: 88, xiu: 12 }, "xxxxx": { tai: 12, xiu: 88 },
    "tttx": { tai: 75, xiu: 25 }, "xxxt": { tai: 25, xiu: 75 }, "txtx": { tai: 60, xiu: 40 },
    "xtxt": { tai: 40, xiu: 60 }, "txtxt": { tai: 65, xiu: 35 }, "xtxtx": { tai: 35, xiu: 65 }
};

function predictLogic24(history) {
    if (!history || history.length < 5) return null;
    const votes = [];
    const patternSeq = history.slice(0, 3).reverse().map(r => r.Ket_qua === "Tài" ? "t" : "x").join("");
    if (PATTERN_DATA_MAP[patternSeq]) {
        const prob = PATTERN_DATA_MAP[patternSeq];
        if (prob.tai > prob.xiu + 15) votes.push("Tài");
        else if (prob.xiu > prob.tai + 15) votes.push("Xỉu");
    }
    let taiCount = votes.filter(v => v === "Tài").length; let xiuCount = votes.filter(v => v === "Xỉu").length;
    if (taiCount >= xiuCount + 3) return "Tài";
    if (xiuCount >= taiCount + 3) return "Xỉu";
    return null;
}

function predictLogic25(history) {
    const last5 = history.slice(0, 5).map(x => x.Ket_qua === 'Tài' ? "T" : "X").reverse();
    let count = 1;
    for (let i = last5.length - 1; i > 0; i--) {
        if (last5[i] === last5[i - 1]) count++; else break;
    }
    if (count >= 3) return last5[last5.length - 1] === "T" ? "Tài" : "Xỉu";
    return null;
}

function predictLogic26(history) {
    const last5 = history.slice(0, 5).map(x => x.Ket_qua === 'Tài' ? 'T' : 'X');
    const taiCount = last5.filter(r => r === 'T').length;
    const xiuCount = last5.filter(r => r === 'X').length;
    if (taiCount >= 4) return 'Xỉu';
    if (xiuCount >= 4) return 'Tài';
    return null;
}

// ==================== 3. DEEP AI FUNCTIONS ====================
function algo5_freqRebalance(history) {
    if (history.length < 20) return null;
    const { freq, entropy: e } = extractFeatures(history.map(s => ({ tx: s.Ket_qua === 'Tài' ? 'T' : 'X', total: s.Tong })));
    const diff = Math.abs((freq['T']||0) - (freq['X']||0)); const total = (freq['T']||0) + (freq['X']||0);
    let threshold = e > 0.9 ? 0.45 : (e < 0.4 ? 0.65 : 0.55);
    const recent = history.slice(-30);
    const recentT = recent.filter(h => h.Ket_qua === 'Tài').length; const recentX = recent.filter(h => h.Ket_qua === 'Xỉu').length;
    if (total > 0 && (recentT + recentX) > 0) {
        const combinedRatio = ((diff / total) * 0.4) + ((Math.abs(recentT - recentX) / (recentT + recentX)) * 0.6);
        if (combinedRatio > threshold) return recentT > recentX + 2 ? 'X' : (recentX > recentT + 2 ? 'T' : null);
    }
    return null;
}

function algoA_markov(history) {
    if (history.length < 15) return null;
    const tx = history.map(h => h.Ket_qua === 'Tài' ? 'T' : 'X');
    let maxOrder = history.length < 20 ? 2 : (history.length < 30 ? 3 : 4);
    let bestPred = null, bestScore = -1;
    for (let order = 2; order <= maxOrder; order++) {
        if (tx.length < order + 8) continue;
        const transitions = {}; const totalTransitions = tx.length - order; const decayFactor = 0.95;
        for (let i = 0; i < totalTransitions; i++) {
            const key = tx.slice(i, i + order).join(''); const next = tx[i + order];
            if (!transitions[key]) transitions[key] = { T: 0, X: 0 };
            transitions[key][next] += Math.pow(decayFactor, totalTransitions - i - 1);
        }
        const counts = transitions[tx.slice(-order).join('')];
        if (counts && (counts.T + counts.X) > 0.5) {
            const total = counts.T + counts.X; const confidence = Math.abs(counts.T - counts.X) / total;
            const score = confidence * (order / maxOrder) * Math.min(1, total / 10);
            if (score > bestScore) { bestScore = score; bestPred = counts.T > counts.X ? 'T' : 'X'; }
        }
    }
    return bestPred;
}

function algoB_ngram(history) {
    if (history.length < 30) return null;
    const tx = history.map(h => h.Ket_qua === 'Tài' ? 'T' : 'X');
    const ngramSizes = []; if (history.length >= 50) ngramSizes.push(5, 6); if (history.length >= 40) ngramSizes.push(4); ngramSizes.push(3, 2);
    let bestPred = null, bestConfidence = 0;
    for (const n of ngramSizes) {
        if (tx.length < n * 2) continue;
        const target = tx.slice(-n).join(''); let matches = [];
        for (let i = 0; i <= tx.length - n - 1; i++) {
            if (tx.slice(i, i + n).join('') === target) matches.push({ position: i, next: tx[i + n], distance: tx.length - i });
        }
        if (matches.length >= 2) {
            const weights = { T: 0, X: 0 }; let totalWeight = 0;
            for (const match of matches) { const weight = 1 / (match.distance * 0.5 + 1); weights[match.next] += weight; totalWeight += weight; }
            if (totalWeight > 0) {
                const confidence = Math.abs(weights.T / totalWeight - weights.X / totalWeight);
                if (confidence > bestConfidence) { bestConfidence = confidence; bestPred = weights.T > weights.X ? 'T' : 'X'; }
            }
        }
    }
    return bestConfidence > 0.3 ? bestPred : null;
}

function algoS_NeoPattern(history) {
    if (history.length < 25) return null;
    const { runs, tx } = extractFeatures(history.map(s => ({ tx: s.Ket_qua === 'Tài' ? 'T' : 'X', total: s.Tong })));
    const patternType = (() => {
        if (runs.length < 3) return null;
        const lastRuns = runs.slice(-6); const lengths = lastRuns.map(r => r.len); const values = lastRuns.map(r => r.val);
        if (lastRuns.length >= 3) {
            if (lengths.every(l => l === 1)) return values.every((v, i) => i === 0 || v !== values[i-1]) ? '1_1_pattern' : null;
            if (lengths.every(l => l === 2)) return values.every((v, i) => i === 0 || v !== values[i-1]) ? '2_2_pattern' : null;
            if (lengths.every(l => l === 3)) return values.every((v, i) => i === 0 || v !== values[i-1]) ? '3_3_pattern' : null;
            if (lengths.length >= 5 && lengths[0]===2 && lengths[1]===1 && lengths[2]===2 && lengths[3]===1 && lengths[4]===2) return '2_1_2_pattern';
            if (lengths.length >= 5 && lengths[0]===1 && lengths[1]===2 && lengths[2]===1 && lengths[3]===2 && lengths[4]===1) return '1_2_1_pattern';
        }
        const lastRun = lastRuns[lastRuns.length - 1];
        if (lastRun && lastRun.len >= 5) return 'long_run_pattern';
        return 'random_pattern';
    })();
    if (!patternType || patternType === 'random_pattern') return null;
    const lastRun = runs[runs.length - 1];
    let prediction;
    switch (patternType) {
        case '1_1_pattern': prediction = tx[tx.length - 1] === 'T' ? 'X' : 'T'; break;
        case '2_2_pattern': prediction = lastRun.len === 2 ? (lastRun.val === 'T' ? 'X' : 'T') : lastRun.val; break;
        case '3_3_pattern': prediction = lastRun.len === 3 ? (lastRun.val === 'T' ? 'X' : 'T') : lastRun.val; break;
        case '2_1_2_pattern': if (lastRun.val === 'T' && lastRun.len === 2) prediction = 'X'; else if (lastRun.val === 'X' && lastRun.len === 2) prediction = 'T'; else prediction = lastRun.len === 1 ? lastRun.val : null; break;
        case '1_2_1_pattern': if (lastRun.val === 'T' && lastRun.len === 1) prediction = 'X'; else if (lastRun.val === 'X' && lastRun.len === 1) prediction = 'T'; else prediction = lastRun.len === 2 ? lastRun.val : null; break;
        case 'long_run_pattern': if (lastRun.len > 7) prediction = lastRun.val === 'T' ? 'X' : 'T'; else if (lastRun.len >= 4 && lastRun.len <= 7) prediction = lastRun.val; else prediction = null; break;
        default: prediction = null;
    }
    return prediction;
}

function algoF_SuperDeepAnalysis(history) {
    if (history.length < 60) return null;
    const timeframes = [{ lookback: 10, weight: 0.3 }, { lookback: 30, weight: 0.4 }, { lookback: 60, weight: 0.3 }];
    let totalScore = { T: 0, X: 0 }, totalWeight = 0;
    for (const tf of timeframes) {
        if (history.length < tf.lookback) continue;
        const slice = history.slice(-tf.lookback); const sliceTx = slice.map(h => h.Ket_qua === 'Tài' ? 'T' : 'X'); const sliceTotals = slice.map(h => h.Tong);
        const meanTotal = avg(sliceTotals); const volatility = Math.sqrt(avg(sliceTotals.map(t => Math.pow(t - meanTotal, 2))));
        let tScore = 0, xScore = 0;
        if (meanTotal > 12) xScore += 0.4; if (meanTotal < 9) tScore += 0.4;
        const tCount = sliceTx.filter(t => t === 'T').length; const xCount = sliceTx.filter(t => t === 'X').length;
        if (tCount > xCount + 3) xScore += 0.3; if (xCount > tCount + 3) tScore += 0.3;
        if (volatility > 4) { if (sliceTx[sliceTx.length - 1] === 'T') tScore += 0.2; else xScore += 0.2; }
        const trend = sliceTotals[sliceTotals.length - 1] - sliceTotals[0];
        if (trend > 3) xScore += 0.1; if (trend < -3) tScore += 0.1;
        const timeframeWeight = tf.weight * (sliceTx.length / tf.lookback);
        totalScore.T += tScore * timeframeWeight; totalScore.X += xScore * timeframeWeight; totalWeight += timeframeWeight;
    }
    if (totalWeight > 0 && Math.abs(totalScore.T - totalScore.X) > 0.15) return totalScore.T > totalScore.X ? 'T' : 'X';
    return null;
}

function algoE_Transformer(history) {
    if (history.length < 100) return null;
    const tx = history.map(h => h.Ket_qua === 'Tài' ? 'T' : 'X'); let attentionScores = { T: 0, X: 0 };
    for (const seqLen of [6, 8, 10, 12]) {
        if (tx.length < seqLen * 2) continue;
        const targetSeq = tx.slice(-seqLen).join(''); let seqMatches = 0;
        for (let i = 0; i <= tx.length - seqLen - 1; i++) {
            const matchScore = similarity(tx.slice(i, i + seqLen).join(''), targetSeq);
            if (matchScore >= 0.7) {
                attentionScores[tx[i + seqLen]] += matchScore * (1 / (tx.length - i)) * (seqLen / 12);
                seqMatches++;
            }
        }
        if (seqMatches >= 3) { const boost = Math.min(1.5, seqMatches / 2); attentionScores.T *= boost; attentionScores.X *= boost; }
    }
    if (attentionScores.T + attentionScores.X > 0.2 && Math.abs(attentionScores.T - attentionScores.X) / (attentionScores.T + attentionScores.X) > 0.25) return attentionScores.T > attentionScores.X ? 'T' : 'X';
    return null;
}

function algoG_SuperBridgePredictor(history) {
    const { runs } = extractFeatures(history.map(s => ({ tx: s.Ket_qua === 'Tài' ? 'T' : 'X', total: s.Tong })));
    if (runs.length < 4) return null;
    const lastRun = runs[runs.length - 1]; let prediction = null, confidence = 0;
    if (lastRun.len >= 5) {
        if (lastRun.len >= 8) { prediction = lastRun.val === 'T' ? 'X' : 'T'; confidence = 0.8; }
        else { prediction = lastRun.len > avg(runs.map(r => r.len)) * 1.8 ? (lastRun.val === 'T' ? 'X' : 'T') : lastRun.val; confidence = 0.6; }
    }
    if (!prediction && runs.length >= 5) {
        const l = runs.slice(-5).map(r => r.len);
        if (l[0] === 1 && l[1] === 1 && l[2] >= 3 && lastRun.len >= 3) { prediction = lastRun.val === 'T' ? 'X' : 'T'; confidence = 0.7; }
    }
    return confidence > 0.55 ? prediction : null;
}

function algoH_AdaptiveMarkov(history) {
    if (history.length < 25) return null;
    const tx = history.map(h => h.Ket_qua === 'Tài' ? 'T' : 'X'); let ensembleVotes = { T: 0, X: 0 };
    for (const order of [2, 3, 4]) {
        if (tx.length < order + 5) continue;
        const transitions = {};
        for (let i = 0; i <= tx.length - order - 1; i++) {
            const key = tx.slice(i, i + order).join(''); const next = tx[i + order];
            if (!transitions[key]) transitions[key] = { T: 0, X: 0 }; transitions[key][next]++;
        }
        const counts = transitions[tx.slice(-order).join('')];
        if (counts && counts.T + counts.X >= 2) ensembleVotes[counts.T > counts.X ? 'T' : 'X'] += (Math.abs(counts.T - counts.X) / (counts.T + counts.X)) * (order / 10);
    }
    return (ensembleVotes.T + ensembleVotes.X > 0.3) ? (ensembleVotes.T > ensembleVotes.X ? 'T' : 'X') : null;
}

function algoI_PatternMaster(history) {
    if (history.length < 35) return null;
    const { runs } = extractFeatures(history.map(s => ({ tx: s.Ket_qua === 'Tài' ? 'T' : 'X', total: s.Tong }))); if (runs.length < 5) return null;
    const recentRuns = runs.slice(-8); const runPattern = recentRuns.map(r => r.len).join(''); const valuePattern = recentRuns.map(r => r.val).join('');
    let patternStrength = { T: 0, X: 0 };
    const pl = [{ p: '12121', v: valuePattern[valuePattern.length-1] === 'T' ? 'X' : 'T', s: 0.7 }, { p: '21212', v: valuePattern[valuePattern.length-1] === 'T' ? 'T' : 'X', s: 0.7 }];
    for (const l of pl) if (runPattern.includes(l.p)) patternStrength[l.v] += l.s;
    if (patternStrength.T > 0 || patternStrength.X > 0) {
        if (Math.abs(patternStrength.T - patternStrength.X) / (patternStrength.T + patternStrength.X) > 0.3) return patternStrength.T > patternStrength.X ? 'T' : 'X';
    }
    return null;
}

function algoJ_QuantumEntropy(history) {
    if (history.length < 40) return null;
    const { tx } = extractFeatures(history.map(s => ({ tx: s.Ket_qua === 'Tài' ? 'T' : 'X', total: s.Tong })));
    let entropyPredictions = { T: 0, X: 0 };
    for (const window of [10, 20, 30]) {
        if (tx.length < window) continue;
        const windowTx = tx.slice(-window); const windowEntropy = entropy(windowTx);
        if (windowEntropy < 0.3) entropyPredictions[windowTx[windowTx.length - 1]] += 0.6;
        else if (windowEntropy > 0.9) {
            const tCount = windowTx.filter(t => t === 'T').length; const xCount = windowTx.filter(t => t === 'X').length;
            if (tCount > xCount) entropyPredictions['X'] += 0.5; else if (xCount > tCount) entropyPredictions['T'] += 0.5;
        }
    }
    if (entropyPredictions.T + entropyPredictions.X > 0.4) return entropyPredictions.T > entropyPredictions.X ? 'T' : 'X';
    return null;
}

function algoK_UltimateChaosResolver(history) {
    if (history.length < 50) return null;
    const { tx, entropy: e, runs } = extractFeatures(history.map(s => ({ tx: s.Ket_qua === 'Tài' ? 'T' : 'X', total: s.Tong })));
    if (e < 0.85 && runs.length < 10) return null;
    const targetSize = 8; const targetPattern = tx.slice(-targetSize).map(x => x === 'T' ? 1 : 0);
    let bestMatchIdx = -1; let minXorDistance = Infinity;
    for (let i = 0; i < tx.length - targetSize - 1; i++) {
        const window = tx.slice(i, i + targetSize).map(x => x === 'T' ? 1 : 0);
        let xorDist = 0;
        for (let j = 0; j < targetSize; j++) xorDist += targetPattern[j] ^ window[j];
        if (xorDist < minXorDistance) { minXorDistance = xorDist; bestMatchIdx = i; }
    }
    if (bestMatchIdx !== -1 && minXorDistance <= 2) return tx[bestMatchIdx + targetSize] === 'T' ? 'T' : 'X';
    return null;
}

const VIP_AI_ALGORITHMS = [
    { name: "AI_FreqRebalance", fn: algo5_freqRebalance, baseConf: 0.25 },
    { name: "AI_MarkovChain", fn: algoA_markov, baseConf: 0.3 },
    { name: "AI_NGram", fn: algoB_ngram, baseConf: 0.3 },
    { name: "AI_NeoPattern", fn: algoS_NeoPattern, baseConf: 0.35 },
    { name: "AI_DeepAnalysis", fn: algoF_SuperDeepAnalysis, baseConf: 0.4 },
    { name: "AI_Transformer", fn: algoE_Transformer, baseConf: 0.45 },
    { name: "AI_BridgeBreaker", fn: algoG_SuperBridgePredictor, baseConf: 0.35 },
    { name: "AI_AdaptiveMarkov", fn: algoH_AdaptiveMarkov, baseConf: 0.35 },
    { name: "AI_PatternMaster", fn: algoI_PatternMaster, baseConf: 0.4 },
    { name: "AI_QuantumEntropy", fn: algoJ_QuantumEntropy, baseConf: 0.45 },
    { name: "AI_UltimateChaos", fn: algoK_UltimateChaosResolver, baseConf: 0.6 }
];

// ==================== 4. HỆ THỐNG DỰ ĐOÁN TỔNG HỢP ====================
class MasterPredictor {
    constructor() {
        this.history = [];
        this.logicPerformance = {};
        for (let i = 1; i <= 26; i++) {
            if (i === 20) continue; // Logic 20 cần dữ liệu đặc biệt
            this.logicPerformance['logic' + i] = { correct: 0, total: 0, accuracy: 0.5, consistency: 0.5 };
        }
        this.consecutiveLosses = 0;
        this.lastPred = null;
    }

    addSession(s) {
        this.history.unshift({
            Phien: s.Phien,
            Ket_qua: s.Ket_qua,
            Tong: s.Tong,
            Xuc_xac_1: s.Xuc_xac_1,
            Xuc_xac_2: s.Xuc_xac_2,
            Xuc_xac_3: s.Xuc_xac_3,
            Thoi_gian: s.Thoi_gian || new Date().toISOString()
        });
        if (this.history.length > MAX_STORED_SESSIONS) this.history.pop();
    }

    _collectSignals() {
        if (this.history.length < 10) return [];
        const signals = [];
        const lastSession = this.history[0];
        const nextSessionId = lastSession.Phien + 1;

        // 26 Backend Logics
        const backendLogics = [
            { name: 'logic1', predict: predictLogic1(lastSession, this.history), base: 0.8 },
            { name: 'logic2', predict: predictLogic2(nextSessionId, this.history), base: 0.7 },
            { name: 'logic3', predict: predictLogic3(this.history), base: 0.9 },
            { name: 'logic4', predict: predictLogic4(this.history), base: 1.2 },
            { name: 'logic5', predict: predictLogic5(this.history), base: 0.6 },
            { name: 'logic6', predict: predictLogic6(lastSession, this.history), base: 0.8 },
            { name: 'logic7', predict: predictLogic7(this.history), base: 1.0 },
            { name: 'logic8', predict: predictLogic8(this.history), base: 0.7 },
            { name: 'logic9', predict: predictLogic9(this.history), base: 1.1 },
            { name: 'logic10', predict: predictLogic10(this.history), base: 0.9 },
            { name: 'logic11', predict: predictLogic11(this.history), base: 1.3 },
            { name: 'logic12', predict: predictLogic12(lastSession, this.history), base: 0.7 },
            { name: 'logic13', predict: predictLogic13(this.history), base: 1.2 },
            { name: 'logic14', predict: predictLogic14(this.history), base: 0.8 },
            { name: 'logic15', predict: predictLogic15(this.history), base: 0.6 },
            { name: 'logic16', predict: predictLogic16(this.history), base: 0.7 },
            { name: 'logic17', predict: predictLogic17(this.history), base: 0.9 },
            { name: 'logic18', predict: predictLogic18(this.history), base: 1.3 },
            { name: 'logic19', predict: predictLogic19(this.history), base: 0.9 },
            { name: 'logic21', predict: predictLogic21(this.history), base: 1.5 },
            { name: 'logic22', predict: predictLogic22(this.history), base: 1.8 },
            { name: 'logic23', predict: predictLogic23(this.history), base: 1.0 },
            { name: 'logic24', predict: predictLogic24(this.history), base: 1.1 },
            { name: 'logic25', predict: predictLogic25(this.history), base: 0.8 },
            { name: 'logic26', predict: predictLogic26(this.history), base: 0.8 }
        ];

        backendLogics.forEach(l => {
            if (l.predict && this.logicPerformance[l.name]) {
                const perf = this.logicPerformance[l.name];
                if (perf.total > 2 && perf.accuracy > 0.30 && perf.consistency > 0.20) {
                    const weight = l.base * ((perf.accuracy + perf.consistency) / 2);
                    signals.push({ prediction: l.predict === 'Tài' ? 'T' : (l.predict === 'Xỉu' ? 'X' : l.predict), confidence: Math.round(weight * 60), weight: weight, id: l.name, name: l.name });
                }
            }
        });

        // VIP AI Algorithms
        VIP_AI_ALGORITHMS.forEach(algo => {
            try {
                const pred = algo.fn(this.history);
                if (pred) {
                    signals.push({ prediction: pred, confidence: Math.round(algo.baseConf * 100), weight: algo.baseConf * 2, id: algo.name, name: algo.name });
                }
            } catch (e) {}
        });

        // Tín hiệu mạnh từ tổng điểm
        const lastTotal = this.history[0].Tong;
        if (lastTotal <= 4) signals.push({ prediction: 'T', confidence: 82, weight: 2.0, id: 'score_low', name: `Tổng ${lastTotal} → Tài` });
        if (lastTotal >= 17) signals.push({ prediction: 'X', confidence: 80, weight: 1.8, id: 'score_high', name: `Tổng ${lastTotal} → Xỉu` });

        // Xúc xắc đặc biệt
        const [d1, d2, d3] = [this.history[0].Xuc_xac_1, this.history[0].Xuc_xac_2, this.history[0].Xuc_xac_3];
        if (d1 === d2 && d2 === d3) {
            signals.push({ prediction: d1 >= 4 ? 'X' : 'T', confidence: 72, weight: 1.7, id: 'triple', name: `3 mặt ${d1}` });
        }

        return signals;
    }

    predict() {
        if (this.history.length < 10) {
            return { action: 'CÂN NHẮC', prediction: 'Tài', confidence: 51 };
        }

        const signals = this._collectSignals();
        if (signals.length === 0) {
            const last = this.history[0].Ket_qua;
            return { action: 'CÂN NHẮC', prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 51 };
        }

        // Sắp xếp theo weight * confidence
        signals.sort((a, b) => (b.weight * b.confidence) - (a.weight * a.confidence));
        const topSignals = signals.slice(0, 10);

        let sT = 0, sX = 0;
        topSignals.forEach(s => {
            if (s.prediction === 'T' || s.prediction === 'Tài') sT += s.confidence * s.weight;
            else sX += s.confidence * s.weight;
        });

        if (sT === sX && sT === 0) { sT = 0.001; sX = 0; }
        else if (sT === sX) {
            const totalT = this.history.filter(h => h.Ket_qua === 'Tài').length;
            const totalX = this.history.length - totalT;
            if (totalT > totalX) sT += 0.001; else sX += 0.001;
        }

        const pred = sT >= sX ? 'Tài' : 'Xỉu';
        let conf = Math.round(Math.max(sT, sX) / (sT + sX) * 100);
        conf = Math.max(51, Math.min(92, conf));

        this.lastPred = pred;
        return { action: conf >= 65 ? 'ĐẶT' : 'CÂN NHẮC', prediction: pred, confidence: conf };
    }

    feedback(actual) {
        const predTai = this.lastPred === 'Tài';
        const actualTai = actual === 'Tài';
        const correct = predTai === actualTai;

        if (correct) this.consecutiveLosses = 0;
        else this.consecutiveLosses++;
    }

    getStats() {
        return {
            totalHistory: this.history.length,
            consecutiveLosses: this.consecutiveLosses,
            activeLogics: Object.keys(this.logicPerformance).filter(k => this.logicPerformance[k].total > 0).length
        };
    }
}

// ==================== 5. SERVER ====================
const predictorHU  = new MasterPredictor();
const predictorMD5 = new MasterPredictor();
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
            Phien: s.Phien, Ket_qua: s.Ket_qua, Tong: s.Tong,
            Xuc_xac_1: s.Xuc_xac_1, Xuc_xac_2: s.Xuc_xac_2, Xuc_xac_3: s.Xuc_xac_3,
            Thoi_gian: s.Thoi_gian || new Date().toISOString()
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
    res.added.sort((a, b) => a.Phien - b.Phien).forEach(s => predictor.addSession(s));
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
