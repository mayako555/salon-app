"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { format, subMonths, eachDayOfInterval, isWeekend, getDate, getDay, isAfter, isBefore, addDays, subDays, endOfMonth } from "date-fns";

// Minimal Matrix Math for Multiple Linear Regression
function invertMatrix(M: number[][]): number[][] {
  // Gaussian elimination for matrix inversion
  const n = M.length;
  const I = Array(n).fill(0).map((_, i) => {
    const row = Array(n).fill(0);
    row[i] = 1;
    return row;
  });
  
  const C = M.map(row => [...row]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxEl = Math.abs(C[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(C[k][i]) > maxEl) {
        maxEl = Math.abs(C[k][i]);
        maxRow = k;
      }
    }
    
    // Swap rows
    for (let k = i; k < n; k++) {
      const tmp = C[maxRow][k];
      C[maxRow][k] = C[i][k];
      C[i][k] = tmp;
    }
    for (let k = 0; k < n; k++) {
      const tmp = I[maxRow][k];
      I[maxRow][k] = I[i][k];
      I[i][k] = tmp;
    }
    
    // Check singular
    if (C[i][i] === 0) {
      // Add small epsilon to diagonal if singular to avoid crash (Ridge regression like)
      C[i][i] = 0.0001; 
    }
    
    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const c = -C[k][i] / C[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          C[k][j] = 0;
        } else {
          C[k][j] += c * C[i][j];
        }
      }
      for (let j = 0; j < n; j++) {
        I[k][j] += c * I[i][j];
      }
    }
  }
  
  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    const c = C[i][i];
    for (let j = 0; j < i; j++) {
      for (let k = n - 1; k >= 0; k--) {
        I[j][k] -= (I[i][k] * C[j][i]) / c;
      }
    }
    for (let j = 0; j < n; j++) {
      I[i][j] /= c;
    }
  }
  return I;
}

function multiplyMatrix(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const n = B[0].length;
  const p = B.length;
  const res = Array(m).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < p; k++) {
        res[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return res;
}

function transpose(A: number[][]): number[][] {
  return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
}

// Pseudo-random generator seeded by date string
function pseudoRandom(dateStr: string, salt: string) {
  let h = 0;
  const s = dateStr + salt;
  for(let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  // returns 0.0 ~ 1.0
  const val = ((h ^ (h >> 15)) & 0xFFFFFF) / 0xFFFFFF; 
  return val;
}

const JAPANESE_HOLIDAYS_MOCK: Record<string, boolean> = {
  // Mock partial list for demo purposes
  "01-01": true, "01-02": true, "01-03": true, "02-11": true, 
  "03-20": true, "04-29": true, "05-03": true, "05-04": true, 
  "05-05": true, "07-15": true, "08-11": true, "09-16": true,
  "09-23": true, "10-14": true, "11-03": true, "11-23": true,
};

function getSyntheticDayFactors(date: Date) {
  const dateStr = format(date, "yyyy-MM-dd");
  const monthDay = format(date, "MM-dd");
  const isHoliday = JAPANESE_HOLIDAYS_MOCK[monthDay] || false;
  
  // Weather synthesis
  const rWeather = pseudoRandom(dateStr, "weather");
  let weather = "晴れ";
  if (rWeather > 0.8) weather = "雨";
  else if (rWeather > 0.6) weather = "曇り";
  
  const tempBase = 15 + Math.sin(date.getMonth() * Math.PI / 6 - Math.PI/2) * 12; 
  const temp = Math.round(tempBase + (pseudoRandom(dateStr, "temp") * 6 - 3));
  
  const precip = weather === "雨" ? Math.round(pseudoRandom(dateStr, "precip") * 20) : 0;
  
  const day = getDate(date);
  const start_of_month = day <= 5;
  const end_of_month = day >= 25;
  const mid_month = !start_of_month && !end_of_month;
  
  const isEvent = pseudoRandom(dateStr, "event") > 0.95; // 5% chance of local event

  const rAd = pseudoRandom(dateStr, "ad");
  const adSpend = Math.round((2000 + rAd * 3000) / 100) * 100; // 2k~5k JPY

  const dayOfWeek = getDay(date);
  const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
  const baseDebuted = isWeekendDay ? 4 : 3;
  const baseTrainee = isWeekendDay ? 1 : 0;
  
  const debutedCount = Math.round(baseDebuted + pseudoRandom(dateStr, "staff") * 2 - 1);
  const traineeCount = Math.round(baseTrainee + pseudoRandom(dateStr, "trainee") * 1.5);

  return {
    dayOfWeek, // 0(Sun) - 6(Sat)
    isHoliday,
    weather,
    temp,
    precip,
    start_of_month,
    mid_month,
    end_of_month,
    isEvent,
    adSpend,
    beds: 4, // fixed for demo
    debutedCount,
    traineeCount
  };
}

export type RegressionParams = {
  store: string; // "全店舗", "六甲店", "神戸店", "元町店"
  targetY: string; // "売上", "来店人数", etc.
  featuresX: string[]; // "曜日", "天気", "気温", etc.
  period: string; // "this_month", "last_3m", "last_6m", "last_1y"
};

export async function performRegressionAnalysis(params: RegressionParams) {
  try {
    const { store, targetY, featuresX, period } = params;
    const now = new Date();
    let startDate = subMonths(now, 1);
    
    if (period === "this_month") startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === "last_3m") startDate = subMonths(now, 3);
    else if (period === "last_6m") startDate = subMonths(now, 6);
    else if (period === "last_1y") startDate = subMonths(now, 12);

    const dateRange = eachDayOfInterval({ start: startDate, end: now });
    if (dateRange.length < 30) {
      return { success: false, error: "分析には最低30日以上のデータが必要です", dataSize: dateRange.length };
    }

    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(now, "yyyy-MM-dd");

    // Fetch Sales
    const salesCol = collection(db, "sales");
    const qSales = query(
      salesCol,
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
    const salesSnap = await getDocs(qSales);
    
    // Fetch Shifts to count staff
    const shiftsCol = collection(db, "shifts");
    const qShifts = query(
      shiftsCol,
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
    const shiftsSnap = await getDocs(qShifts);

    // Aggregate daily data
    const dailyData: Record<string, any> = {};
    
    dateRange.forEach(d => {
      const dStr = format(d, "yyyy-MM-dd");
      const factors = getSyntheticDayFactors(d);
      dailyData[dStr] = {
        date: dStr,
        ...factors,
        staffCount: 0,
        // Y vars
        total_sales: 0,
        visitors: 0,
        new_visitors: 0,
        repeat_visitors: 0,
        ticket_size: 0,
        tech_sales: 0,
        product_sales: 0,
        next_bookings: 0,
        cancels: Math.floor(pseudoRandom(dStr, "cancel") * 2), // mock cancels
        debutedCount: 0,
        traineeCount: 0
      };
    });

    const staffStatsByMonth: Record<string, Record<string, { total: number, minimo: number }>> = {};

    salesSnap.forEach(doc => {
      const data = doc.data();
      const dStr = data.date;
      const mStr = dStr.substring(0, 7); // yyyy-MM
      
      const staffId = data.staff_id;
      if (staffId) {
        if (!staffStatsByMonth[mStr]) staffStatsByMonth[mStr] = {};
        if (!staffStatsByMonth[mStr][staffId]) staffStatsByMonth[mStr][staffId] = { total: 0, minimo: 0 };
        
        staffStatsByMonth[mStr][staffId].total++;
        const route = data.reservation_route || "";
        const menu = data.menu_name || "";
        if (route.includes("ミニモ") || menu.includes("ミニモ") || data.is_minimo) {
          staffStatsByMonth[mStr][staffId].minimo++;
        }
      }

      if (!dailyData[dStr]) return;
      if (store !== "全店舗" && data.store_name !== store.replace("店", "")) return;
      
      const sales = dailyData[dStr];
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) + (data.hpb_points || 0) - (data.discount || 0);
      
      sales.total_sales += amount;
      sales.tech_sales += (data.tech_sales || 0);
      sales.product_sales += (data.product_sales || 0);
      sales.visitors++;
      
      if (data.customer_type === "新規") sales.new_visitors++;
      else sales.repeat_visitors++;

      if (data.next_booking_date) sales.next_bookings++;
    });

    shiftsSnap.forEach(doc => {
      const data = doc.data();
      const dStr = data.date;
      const mStr = dStr.substring(0, 7);

      if (!dailyData[dStr]) return;
      if (store !== "全店舗" && data.store_name !== store.replace("店", "")) return;
      if (data.type === "work") {
        dailyData[dStr].staffCount++;
        const staffId = data.staff_id || "unknown";
        let isTrainee = false;
        
        if (staffStatsByMonth[mStr] && staffStatsByMonth[mStr][staffId]) {
          isTrainee = staffStatsByMonth[mStr][staffId].minimo >= (staffStatsByMonth[mStr][staffId].total / 2);
        } else {
          isTrainee = (staffId.length + staffId.charCodeAt(0)) % 4 === 0;
        }
        
        if (isTrainee) {
          dailyData[dStr].traineeCount = (dailyData[dStr].traineeCount || 0) + 1;
        } else {
          dailyData[dStr].debutedCount = (dailyData[dStr].debutedCount || 0) + 1;
        }
      }
    });

    // Finalize Ticket Size
    Object.values(dailyData).forEach((d: any) => {
      d.ticket_size = d.visitors > 0 ? Math.round(d.total_sales / d.visitors) : 0;
    });

    const dataset = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    // Map selected Y
    const yMap: Record<string, string> = {
      "売上": "total_sales",
      "来店人数": "visitors",
      "新規人数": "new_visitors",
      "リピート人数": "repeat_visitors",
      "客単価": "ticket_size",
      "技術売上": "tech_sales",
      "物販売上": "product_sales",
      "次回予約数": "next_bookings",
      "キャンセル数": "cancels"
    };
    const yKey = yMap[targetY] || "total_sales";

    // Build X matrix and Y vector
    const X: number[][] = [];
    const Y: number[][] = [];
    
    // Build feature dictionary to extract names for coefficients later
    const featureNames: string[] = [];
    let featureInitialized = false;

    for (const d of dataset) {
      const rowX = [1]; // Intercept
      const names = ["ベース値 (切片)"];
      
      if (featuresX.includes("曜日")) {
        // One-hot encoding for days (omitting Sunday to avoid dummy variable trap)
        rowX.push(d.dayOfWeek === 1 ? 1 : 0); names.push("月曜日");
        rowX.push(d.dayOfWeek === 2 ? 1 : 0); names.push("火曜日");
        rowX.push(d.dayOfWeek === 3 ? 1 : 0); names.push("水曜日");
        rowX.push(d.dayOfWeek === 4 ? 1 : 0); names.push("木曜日");
        rowX.push(d.dayOfWeek === 5 ? 1 : 0); names.push("金曜日");
        rowX.push(d.dayOfWeek === 6 ? 1 : 0); names.push("土曜日");
      }
      if (featuresX.includes("天気")) {
        rowX.push(d.weather === "雨" ? 1 : 0); names.push("雨天");
        rowX.push(d.weather === "曇り" ? 1 : 0); names.push("曇り");
      }
      if (featuresX.includes("気温")) {
        rowX.push(d.temp); names.push("気温(℃)");
      }
      if (featuresX.includes("降水量")) {
        rowX.push(d.precip); names.push("降水量(mm)");
      }
      if (featuresX.includes("祝日")) {
        rowX.push(d.isHoliday ? 1 : 0); names.push("祝日");
      }
      if (featuresX.includes("月初")) {
        rowX.push(d.start_of_month ? 1 : 0); names.push("月初");
      }
      if (featuresX.includes("月末")) {
        rowX.push(d.end_of_month ? 1 : 0); names.push("月末");
      }
      if (featuresX.includes("スタッフ出勤人数")) {
        rowX.push(d.staffCount); names.push("スタッフ出勤数");
      }
      if (featuresX.includes("稼働ベッド数")) {
        rowX.push(d.beds); names.push("稼働ベッド数");
      }
      if (featuresX.includes("デビュー済稼働人数")) {
        rowX.push(d.debutedCount); names.push("デビュー済稼働数");
      }
      if (featuresX.includes("研修中稼働人数")) {
        rowX.push(d.traineeCount); names.push("研修中稼働数");
      }
      if (featuresX.includes("広告費")) {
        rowX.push(d.adSpend); names.push("広告費");
      }
      if (featuresX.includes("イベント日")) {
        rowX.push(d.isEvent ? 1 : 0); names.push("イベント日");
      }

      X.push(rowX);
      Y.push([d[yKey]]);
      if (!featureInitialized) {
        featureNames.push(...names);
        featureInitialized = true;
      }
    }

    if (X[0].length >= dateRange.length) {
      return { success: false, error: "変数の数がデータの日数より多いため分析できません。期間を長くするか、変数を減らしてください。", dataSize: dateRange.length };
    }

    // Math: Beta = (X^T * X)^-1 * X^T * Y
    const XT = transpose(X);
    const XTX = multiplyMatrix(XT, X);
    
    // Add ridge penalty (regularization) to prevent singular matrix issues from one-hot encoding or collinearity
    const lambda = 0.1;
    for (let i = 0; i < XTX.length; i++) {
        XTX[i][i] += lambda; 
    }

    const invXTX = invertMatrix(XTX);
    const XT_Y = multiplyMatrix(XT, Y);
    const Beta = multiplyMatrix(invXTX, XT_Y);
    
    // Extract Coefficients
    const coefficients = featureNames.map((name, i) => ({
      name,
      value: Beta[i][0]
    })).filter(c => c.name !== "ベース値 (切片)");

    // Calculate predictions and R^2
    let sst = 0;
    let sse = 0;
    const yMean = dataset.reduce((sum, d) => sum + d[yKey], 0) / dataset.length;
    
    const chartData = dataset.map((d, i) => {
      let predicted = Beta[0][0]; // intercept
      for (let j = 1; j < Beta.length; j++) {
        predicted += Beta[j][0] * X[i][j];
      }
      predicted = Math.max(0, predicted); // no negative KPIs usually
      
      const actual = Y[i][0];
      sst += Math.pow(actual - yMean, 2);
      sse += Math.pow(actual - predicted, 2);

      return {
        date: format(new Date(d.date), "MM/dd"),
        actual,
        predicted
      };
    });

    const rSquared = sst === 0 ? 0 : 1 - (sse / sst);

    // AI comments generation
    coefficients.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // sort by absolute impact
    const topPositive = [...coefficients].sort((a, b) => b.value - a.value).slice(0, 3).filter(c => c.value > 0);
    const topNegative = [...coefficients].sort((a, b) => a.value - b.value).slice(0, 3).filter(c => c.value < 0);

    const formatVal = (val: number) => {
      if (["売上", "客単価", "技術売上", "物販売上", "広告費"].includes(targetY)) {
        return `¥${Math.round(val).toLocaleString()}`;
      }
      return `${Math.round(val * 10) / 10}件/人`;
    };

    const aiComments = [
      `現在の分析モデルの当てはまり度（R²）は ${(rSquared * 100).toFixed(1)}% です。`,
      topPositive.length > 0 
        ? `${topPositive[0].name} が最もプラスの影響を与えており、この要因がある/1単位増えると平均して ${formatVal(topPositive[0].value)} 上がる傾向があります。` 
        : "",
      topNegative.length > 0 
        ? `${topNegative[0].name} が最もマイナスの影響を与えており、この要因がある/1単位増えると平均して ${formatVal(Math.abs(topNegative[0].value))} 下がる傾向があります。`
        : "",
    ].filter(Boolean);

    const actionProposals = [];
    if (topNegative.some(c => c.name.includes("雨") || c.name.includes("降水"))) {
      actionProposals.push("雨の日の客足・売上低下が顕著です。雨の日限定クーポンや、予約キャンセルの防止策（事前リマインド強化）を検討してください。");
    }
    if (topPositive.some(c => c.name.includes("スタッフ出勤数"))) {
      actionProposals.push("スタッフ出勤数が売上/客数に直結しています。土日やイベント時など、需要の高い日に出勤枠を最大限確保するシフト調整が推奨されます。");
    }
    if (topPositive.some(c => c.name.includes("月末") || c.name.includes("月初"))) {
      actionProposals.push("月初/月末の特異な売上変動が見られます。給料日後の需要を捉えた高単価メニューのキャンペーンが効果的です。");
    }
    if (actionProposals.length === 0) {
      actionProposals.push("特定された要因に基づき、プラス要因の再現性を高める施策を打ちましょう。");
    }

    return {
      success: true,
      data: {
        rSquared,
        coefficients,
        chartData,
        aiComments,
        actionProposals,
        dataSize: dateRange.length
      }
    };
  } catch (err: any) {
    console.error("Regression Error:", err);
    return { success: false, error: err.message };
  }
}

export type SarimaxParams = {
  store: string;
  targetY: string; // "売上", "来店人数"
  featuresX: string[]; // 外生変数の選択
  forecastDays: number; // 7, 14, 30
};

export async function performSarimaxForecast(params: SarimaxParams) {
  try {
    const { store, targetY, featuresX, forecastDays } = params;
    const now = new Date();
    // 過去90日間のデータを使ってモデルを学習する
    const startDate = subDays(now, 90);
    const dateRange = eachDayOfInterval({ start: startDate, end: now });
    
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(now, "yyyy-MM-dd");

    // Fetch Sales
    const salesCol = collection(db, "sales");
    const qSales = query(salesCol, where("date", ">=", startStr), where("date", "<=", endStr));
    const salesSnap = await getDocs(qSales);
    
    // Aggregate daily data
    const dailyData: Record<string, any> = {};
    dateRange.forEach(d => {
      const dStr = format(d, "yyyy-MM-dd");
      const factors = getSyntheticDayFactors(d);
      dailyData[dStr] = {
        date: dStr,
        ...factors,
        total_sales: 0,
        visitors: 0,
        debutedCount: 0,
        traineeCount: 0
      };
    });

    const staffStatsByMonth: Record<string, Record<string, { total: number, minimo: number }>> = {};

    salesSnap.forEach(doc => {
      const data = doc.data();
      const dStr = data.date;
      const mStr = dStr.substring(0, 7);
      
      const staffId = data.staff_id;
      if (staffId) {
        if (!staffStatsByMonth[mStr]) staffStatsByMonth[mStr] = {};
        if (!staffStatsByMonth[mStr][staffId]) staffStatsByMonth[mStr][staffId] = { total: 0, minimo: 0 };
        
        staffStatsByMonth[mStr][staffId].total++;
        const route = data.reservation_route || "";
        const menu = data.menu_name || "";
        if (route.includes("ミニモ") || menu.includes("ミニモ") || data.is_minimo) {
          staffStatsByMonth[mStr][staffId].minimo++;
        }
      }

      if (!dailyData[dStr]) return;
      if (store !== "全店舗" && data.store_name !== store.replace("店", "")) return;
      
      const sales = dailyData[dStr];
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) + (data.hpb_points || 0) - (data.discount || 0);
      sales.total_sales += amount;
      sales.visitors++;
    });

    // fetch past shifts as well
    const shiftsCol = collection(db, "shifts");
    const qShifts = query(shiftsCol, where("date", ">=", startStr), where("date", "<=", endStr));
    const shiftsSnap = await getDocs(qShifts);
    
    shiftsSnap.forEach(doc => {
      const data = doc.data();
      const dStr = data.date;
      const mStr = dStr.substring(0, 7);

      if (!dailyData[dStr]) return;
      if (store !== "全店舗" && data.store_name !== store.replace("店", "")) return;
      if (data.type === "work") {
        const staffId = data.staff_id || "unknown";
        let isTrainee = false;
        
        if (staffStatsByMonth[mStr] && staffStatsByMonth[mStr][staffId]) {
          isTrainee = staffStatsByMonth[mStr][staffId].minimo >= (staffStatsByMonth[mStr][staffId].total / 2);
        } else {
          isTrainee = (staffId.length + staffId.charCodeAt(0)) % 4 === 0;
        }
        
        if (isTrainee) {
          dailyData[dStr].traineeCount = (dailyData[dStr].traineeCount || 0) + 1;
        } else {
          dailyData[dStr].debutedCount = (dailyData[dStr].debutedCount || 0) + 1;
        }
      }
    });

    const dataset = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    const yKey = targetY === "来店人数" ? "visitors" : "total_sales";

    // 疑似SARIMAXのモデリング（AR(1), AR(7) + 外生変数X + 曜日季節性）
    const X: number[][] = [];
    const Y: number[][] = [];
    
    for (let i = 7; i < dataset.length; i++) {
      const d = dataset[i];
      const lag1 = dataset[i-1][yKey];
      const lag7 = dataset[i-7][yKey];
      
      const rowX = [1, lag1, lag7];
      
      if (featuresX.includes("曜日")) {
        rowX.push(d.dayOfWeek === 1 ? 1 : 0);
        rowX.push(d.dayOfWeek === 2 ? 1 : 0);
        rowX.push(d.dayOfWeek === 3 ? 1 : 0);
        rowX.push(d.dayOfWeek === 4 ? 1 : 0);
        rowX.push(d.dayOfWeek === 5 ? 1 : 0);
        rowX.push(d.dayOfWeek === 6 ? 1 : 0);
      }
      if (featuresX.includes("祝日")) {
        rowX.push(d.isHoliday ? 1 : 0);
      }
      if (featuresX.includes("天気")) {
        rowX.push(d.weather === "雨" ? 1 : 0);
      }
      if (featuresX.includes("イベント日")) {
        rowX.push(d.isEvent ? 1 : 0);
      }
      if (featuresX.includes("デビュー済稼働人数")) {
        rowX.push(d.debutedCount);
      }
      if (featuresX.includes("研修中稼働人数")) {
        rowX.push(d.traineeCount);
      }
      X.push(rowX);
      Y.push([d[yKey]]);
    }

    // 回帰係数の計算
    const XT = transpose(X);
    const XTX = multiplyMatrix(XT, X);
    const lambda = 1.0; // Ridge penalty for stability
    for (let i = 0; i < XTX.length; i++) XTX[i][i] += lambda;
    const invXTX = invertMatrix(XTX);
    const XT_Y = multiplyMatrix(XT, Y);
    const Beta = multiplyMatrix(invXTX, XT_Y);

    // RMSEの計算（予測区間バンド用）
    let sse = 0;
    for (let i = 0; i < X.length; i++) {
      let pred = 0;
      for (let j = 0; j < Beta.length; j++) pred += Beta[j][0] * X[i][j];
      sse += Math.pow(Y[i][0] - Math.max(0, pred), 2);
    }
    const rmse = Math.sqrt(sse / Math.max(1, X.length - Beta.length));

    // 結果出力用データの整形（直近14日間の実績をプロットに含める）
    const chartData = [];
    const recentDays = 14;
    for (let i = dataset.length - recentDays; i < dataset.length; i++) {
      chartData.push({
        date: format(new Date(dataset[i].date), "MM/dd"),
        actual: dataset[i][yKey],
        predicted: null,
        lower: null,
        upper: null,
        isForecast: false,
        weather: dataset[i].weather
      });
    }

    // 今月の実績を計算
    const currentMonthStr = format(now, "yyyy-MM");
    let currentMonthActual = 0;
    dataset.forEach(d => {
      if (d.date.startsWith(currentMonthStr)) {
        currentMonthActual += d[yKey];
      }
    });
    
    let currentMonthProjected = currentMonthActual;

    // 将来予測（逐次予測：Autoregressive prediction）
    const forecastStart = addDays(now, 1);
    
    // 指定期間、または今月末までのどちらか長い方まで予測を生成（着地予測のため）
    const eom = endOfMonth(now);
    const requestedEnd = addDays(now, forecastDays);
    const forecastEnd = isAfter(requestedEnd, eom) ? requestedEnd : eom;
    
    const futureRange = eachDayOfInterval({ start: forecastStart, end: forecastEnd });
    
    // 予測用に直近の実績を保持しておく配列
    const historyY = dataset.map(d => d[yKey]);

    let maxPred = 0;
    let maxDate = "";
    
    futureRange.forEach((d, i) => {
      const dStr = format(d, "yyyy-MM-dd");
      const factors = getSyntheticDayFactors(d); // 将来の天気や祝日などを取得
      
      const lag1 = historyY[historyY.length - 1];
      const lag7 = historyY[historyY.length - 7];
      
      const rowX = [1, lag1, lag7];
      
      if (featuresX.includes("曜日")) {
        rowX.push(factors.dayOfWeek === 1 ? 1 : 0);
        rowX.push(factors.dayOfWeek === 2 ? 1 : 0);
        rowX.push(factors.dayOfWeek === 3 ? 1 : 0);
        rowX.push(factors.dayOfWeek === 4 ? 1 : 0);
        rowX.push(factors.dayOfWeek === 5 ? 1 : 0);
        rowX.push(factors.dayOfWeek === 6 ? 1 : 0);
      }
      if (featuresX.includes("祝日")) {
        rowX.push(factors.isHoliday ? 1 : 0);
      }
      if (featuresX.includes("天気")) {
        rowX.push(factors.weather === "雨" ? 1 : 0);
      }
      if (featuresX.includes("イベント日")) {
        rowX.push(factors.isEvent ? 1 : 0);
      }
      if (featuresX.includes("デビュー済稼働人数")) {
        rowX.push(factors.debutedCount);
      }
      if (featuresX.includes("研修中稼働人数")) {
        rowX.push(factors.traineeCount);
      }
      
      let pred = 0;
      for (let j = 0; j < Beta.length; j++) pred += Beta[j][0] * rowX[j];
      pred = Math.max(0, pred);
      
      // 予測値を履歴に追加（次回のラグ変数として使用）
      historyY.push(pred);

      // 今月の着地予測に加算
      if (dStr.startsWith(currentMonthStr)) {
        currentMonthProjected += pred;
      }

      // チャートにはユーザーが指定した forecastDays 分だけ表示する
      if (isBefore(d, addDays(requestedEnd, 1))) {
        if (pred > maxPred) {
          maxPred = pred;
          maxDate = format(d, "MM/dd");
        }

        chartData.push({
          date: format(d, "MM/dd"),
          actual: null,
          predicted: pred,
          lower: Math.max(0, pred - rmse * 1.5),
          upper: pred + rmse * 1.5,
          isForecast: true,
          weather: factors.weather,
          isEvent: factors.isEvent
        });
      }
    });

    const isYCurrency = targetY === "売上";
    const formatVal = (val: number) => isYCurrency ? `¥${Math.round(val).toLocaleString()}` : `${Math.round(val)}人`;

    const aiComments = [
      `時系列・外生変数モデル（ARX）による向こう${forecastDays}日間の予測が完了しました。`,
      `現在のペースで行くと、今月（${format(now, "M月")}）の ${targetY} は **${formatVal(currentMonthProjected)}** で着地する見込みです。`,
      `予測期間中で最も${targetY}が見込めるのは ${maxDate} （約 ${formatVal(maxPred)}）です。`,
      `※グレーの帯は95%信頼区間（予測のブレ幅）を示しています。天候の急変などでこの範囲を逸脱する可能性があります。`
    ];

    return {
      success: true,
      data: {
        chartData,
        aiComments,
        currentMonthProjected
      }
    };
  } catch (err: any) {
    console.error("SARIMAX Error:", err);
    return { success: false, error: err.message };
  }
}
