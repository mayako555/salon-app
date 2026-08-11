"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc
} from "@/lib/firestore-admin-wrapper";
import { revalidatePath } from "next/cache";
import { getAdvancedAnalytics } from "@/app/dashboard/actions";
import { addAuditLog } from "@/app/audit/actions";
import * as Papa from "papaparse";
import * as crypto from "crypto";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc, setTenantOwnedDoc } from "@/lib/tenant-ownership";


export type ExpenseRecord = {
  id?: string;
  store_name: string; // "六甲" | "元町" | "神戸"
  date: string; // YYYY-MM-DD
  category: string; // "消耗品費" | "旅費交通費" | "広告宣伝費" | "水道光熱費" | "通信費" | "雑費" | "地代家賃" | "給料手当" | "その他"
  amount: number;
  description: string;
  staff_name: string;
  staff_id: string;
  is_imported?: boolean;
  created_at?: string;
};

const EXPENSES_COLLECTION = "expenses";

export async function getExpenses(year: number, month: number, storeName?: string): Promise<ExpenseRecord[]> {
  try {
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const colRef = collection(db, EXPENSES_COLLECTION);
    const q = query(
      colRef,
      where("date", ">=", `${targetPrefix}-01`),
      where("date", "<=", `${targetPrefix}-31`),
      orderBy("date", "desc")
    );
    
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString() || null
      } as ExpenseRecord;
    });

    if (storeName) {
      return records.filter(r => r.store_name === storeName);
    }
    return records;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function addExpense(data: Omit<ExpenseRecord, 'id' | 'created_at'>) {
  try {
    const colRef = collection(db, EXPENSES_COLLECTION);
    const docRef = await addTenantOwnedDoc(colRef, {
      ...data,
      created_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: EXPENSES_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: data,
      actor: data.staff_name || "Staff"
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/staff-portal/expenses");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding expense:", error);
    return { success: false, error: error.message };
  }
}

export async function addExpensesBatch(expenses: Omit<ExpenseRecord, 'id' | 'created_at'>[]) {
  try {
    if (expenses.length === 0) return { success: true, count: 0, skipped: 0 };

    // Find date range
    const dates = expenses.map(e => e.date);
    const minDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
    const maxDate = dates.reduce((max, d) => d > max ? d : max, dates[0]);

    // Fetch existing expenses in that range to prevent duplicates
    const colRef = collection(db, EXPENSES_COLLECTION);
    const q = query(
      colRef,
      where("date", ">=", minDate),
      where("date", "<=", maxDate)
    );
    const snapshot = await getDocs(q);
    const existingRecords = snapshot.docs.map(doc => doc.data() as ExpenseRecord);

    // Filter out duplicates
    const newExpenses = expenses.filter(newExp => {
      const isDuplicate = existingRecords.some(ex => 
        ex.date === newExp.date && 
        ex.category === newExp.category && 
        ex.amount === newExp.amount
      );
      return !isDuplicate;
    });

    if (newExpenses.length === 0) {
      return { success: true, count: 0, skipped: expenses.length };
    }

    // Insert new expenses
    await Promise.all(newExpenses.map(async (data) => {
      await addTenantOwnedDoc(colRef, {
        ...data,
        is_imported: true, // Flag as imported via CSV
        created_at: serverTimestamp()
      });
    }));

    await addAuditLog({
      table_name: EXPENSES_COLLECTION,
      record_id: `BATCH_IMPORT_${new Date().getTime()}`,
      action: "INSERT",
      old_data: null,
      new_data: { count: newExpenses.length },
      actor: expenses[0]?.staff_name || "管理者"
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/staff-portal/expenses");
    
    return { success: true, count: newExpenses.length, skipped: expenses.length - newExpenses.length };
  } catch (error: any) {
    console.error("Error batch adding expenses:", error);
    return { success: false, error: error.message };
  }
}

export async function updateExpense(id: string, data: Partial<ExpenseRecord>) {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, id);
    await updateTenantOwnedDoc(docRef, {
      ...data,
      updated_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: EXPENSES_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: { id },
      new_data: data,
      actor: "管理者"
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteExpense(id: string) {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, id);
    await deleteTenantOwnedDoc(docRef);

    await addAuditLog({
      table_name: EXPENSES_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: { id },
      new_data: null,
      actor: "管理者"
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/staff-portal/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return { success: false, error: error.message };
  }
}

export async function getYayoiCsvData(year: number, month: number, storeName?: string): Promise<string> {
  const expenses = await getExpenses(year, month, storeName);
  
  // Yayoi Standard Import Columns (Simplified Format)
  const headers = [
    "識別子", "伝票番号", "決算区分", "取引日付", 
    "借方勘定科目", "借方補助科目", "借方部門", "借方税区分", "借方金額", "借方税額",
    "貸方勘定科目", "貸方補助科目", "貸方部門", "貸方税区分", "貸方金額", "貸方税額",
    "摘要", "タイプ"
  ];
  
  const csvRows = [headers.join(",")];
  
  expenses.forEach((exp, idx) => {
    const dateFormatted = exp.date.replace(/-/g, "/");
    const dept = exp.store_name ? `${exp.store_name}店` : "";
    
    const row = [
      "2000",                // 識別子
      (idx + 1).toString(),  // 伝票番号
      "",                    // 決算区分
      dateFormatted,         // 取引日付
      `"${exp.category}"`,   // 借方勘定科目
      "",                    // 借方補助科目
      `"${dept}"`,           // 借方部門
      "",                    // 借方税区分
      exp.amount.toString(), // 借方金額
      "",                    // 借方税額
      `"現金"`,              // 貸方勘定科目
      "",                    // 貸方補助科目
      "",                    // 貸方部門
      "",                    // 貸方税区分
      exp.amount.toString(), // 貸方金額
      "",                    // 貸方税額
      `"${exp.description.replace(/"/g, '""')} (担当: ${exp.staff_name})"`, // 摘要
      ""                     // タイプ
    ];
    csvRows.push(row.join(","));
  });
  
  return csvRows.join("\n");
}

export async function generateAiManagementAdvice(
  year: number, 
  month: number, 
  fixedCosts: { rent: number; salaries: number; marketing: number }
) {
  try {
    const targetMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    const analyticsRes = await getAdvancedAnalytics();
    
    let targetMonthData: any = null;
    if (analyticsRes.success && analyticsRes.data) {
      targetMonthData = analyticsRes.data.find((d: any) => d.month === targetMonthStr);
    }
    
    const expenses = await getExpenses(year, month);
    const totalCashExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalCashExpenses + fixedCosts.rent + fixedCosts.salaries + fixedCosts.marketing;
    
    const expenseByCategory: Record<string, number> = {
      "地代家賃": fixedCosts.rent,
      "給料手当": fixedCosts.salaries,
      "広告宣伝費": fixedCosts.marketing
    };
    
    expenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });
    
    let expenseBreakdownStr = "";
    Object.keys(expenseByCategory).forEach(cat => {
      if (expenseByCategory[cat] > 0) {
        expenseBreakdownStr += `・${cat}: ¥${expenseByCategory[cat].toLocaleString()}\n`;
      }
    });
    
    const totalSales = targetMonthData?.total || 0;
    const minimoSales = targetMonthData?.minimo || 0;
    const avgMinimo = targetMonthData?.avgMinimo || 0;
    const avgRegular = targetMonthData?.avgRegular || 0;
    const occupancy = targetMonthData?.occupancy || 0;
    const nextBookingRatio = targetMonthData?.nextBookingRatio || 0;
    
    // Store breakdown
    let storeSalesStr = "";
    if (targetMonthData?.stores) {
      Object.keys(targetMonthData.stores).forEach(s => {
        const storeInfo = targetMonthData.stores[s];
        storeSalesStr += `  - ${s}店: 売上 ¥${storeInfo.total.toLocaleString()} (件数: ${storeInfo.count}件)\n`;
      });
    }

    const prompt = `あなたは美容サロン「ジャスミンラッシュ」のAI敏腕経営コンサルタントです。
以下のサロン実績データ（売上、次回予約率、稼働率等）および経費データを分析し、経営改善に向けた超具体的なアドバイスレポートを日本語で作成してください。

【分析対象期間】
${year}年${month}月

【収支要約】
・総売上: ¥${totalSales.toLocaleString()}
・総経費: ¥${totalExpenses.toLocaleString()}
・営業利益 (売上 - 経費): ¥${(totalSales - totalExpenses).toLocaleString()}

【詳細売上・パフォーマンス実績】
・ミニモ(新規等)売上: ¥${minimoSales.toLocaleString()}
・リピート顧客 平均単価: ¥${avgRegular.toLocaleString()}
・新規顧客 平均単価: ¥${avgMinimo.toLocaleString()}
・サロン稼働率: ${occupancy}%
・次回予約率: ${nextBookingRatio}%

【店舗別売上状況】
${storeSalesStr || "  - データなし"}

【経費内訳（現金経費 ＋ 固定費）】
${expenseBreakdownStr || "・経費データなし"}

【レポート構成ルール】
必ず以下の構成で作成してください。プロフェッショナルで洗練されたアドバイスをお願いします。

## 📊 ${year}年${month}月 サロン経営総合分析レポート

### 1. 📈 収支総評（今月の評価）
今月の売上、経費、利益から見たサロン全体の経営状況を評価します。黒字の場合は賞賛し、赤字や利益率低下の場合はその主要因を明確に指摘してください。

### 2. 🎯 売上・パフォーマンス分析
稼働率（サロンベッドの埋まり具合）と次回予約率（顧客リピート率）、および新規客（ミニモ等）と既存客の単価の差に着目し、集客面と接客サービス技術の観点から課題や改善余地を浮き彫りにします。

### 3. 💸 経費効率化とコスト削減のヒント
売上に対する経費比率（経費率）を算出し、水道光熱費や消耗品費などの変動費で無駄が発生している部分、あるいは広告宣伝費の対効果について具体的なアドバイスを提示してください。

### 4. 🚀 来月に向けた3つのアクションプラン
サロン運営を即座に改善するために、オーナーおよびスタッフが来月実践すべき具体的かつ測定可能なアクションを3つ提示してください（例：次回予約のお声がけ強化、低単価メニューの見直し、消耗品の仕入れ先変更など）。`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const modelIds = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let lastError = null;
    let markdownReport = null;

    for (const modelId of modelIds) {
      try {
        console.log(`[AI Advisor] Attempting analysis with model: ${modelId}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ]
            }),
            signal: AbortSignal.timeout(15000)
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`[AI Advisor] Model ${modelId} failed:`, errorData.error?.message || response.status);
          lastError = errorData.error?.message || response.status;
          continue;
        }

        const json = await response.json();
        markdownReport = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (markdownReport) {
          console.log(`[AI Advisor] Success with model: ${modelId}`);
          break;
        }
      } catch (err: any) {
        console.error(`[AI Advisor] Error fetching from ${modelId}:`, err.message);
        lastError = err.message;
        continue;
      }
    }

    if (!markdownReport) {
      return { 
        success: false, 
        error: `AI経営分析の生成に失敗しました（エラー: ${lastError || "レスポンス空" }）。インターネット接続やAPIキーの設定をご確認ください。` 
      };
    }

    return { success: true, report: markdownReport };
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getExpensesDashboardData(year: number, month: number) {
  try {
    const targetMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    const analyticsRes = await getAdvancedAnalytics();
    
    let targetMonthData: any = null;
    if (analyticsRes.success && analyticsRes.data) {
      targetMonthData = analyticsRes.data.find((d: any) => d.month === targetMonthStr);
    }
    
    const totalSales = targetMonthData?.total || 0;
    const expensesList = await getExpenses(year, month);
    
    // Separate normal cash expenses and financial/tax outflows
    let totalCashExpenses = 0;
    let totalFinancialOutflows = 0;
    let autoRent = 0;
    let autoMarketing = 0;
    let yayoiSalaries = 0;

    expensesList.forEach(e => {
      const isTaxOrDebt = ["借入金", "長期借入金", "短期借入金", "法人税等", "法人税", "所得税", "住民税", "消費税"].some(keyword => e.category.includes(keyword) || (e.description && e.description.includes(keyword)));
      if (isTaxOrDebt) {
        totalFinancialOutflows += e.amount;
      } else if (e.category === "地代家賃") {
        autoRent += e.amount;
      } else if (e.category === "広告宣伝費") {
        autoMarketing += e.amount;
      } else if (e.category === "給料手当" || e.category === "役員報酬" || e.category === "給料賃金" || e.category === "法定福利費") {
        yayoiSalaries += e.amount;
      } else {
        totalCashExpenses += e.amount;
      }
    });

    // Automatically calculate payroll salaries and actual insurance deductions
    const { getMonthlyStatements } = await import("@/app/payroll/actions");
    const statements = await getMonthlyStatements(year, month);
    let autoSalaries = 0;
    let actualSocialInsurance = 0;
    let actualLaborInsurance = 0;
    
    statements.forEach(s => {
      autoSalaries += s.final_paid_amount;
      
      if (s.details.social_insurance) {
        // Employer pays 50% matching for health and pension, plus childcare
        const health = s.details.social_insurance.health || 0;
        const pension = s.details.social_insurance.pension || 0;
        const childcare = s.details.social_insurance.childcare || 0;
        actualSocialInsurance += (health + pension + childcare);
        
        // Employer pays 0.95% out of 1.55% total for employment insurance (employee pays 0.6%)
        const employment = s.details.social_insurance.employment || 0;
        const employerEmployment = Math.round((employment / 0.6) * 0.95) || 0;
        
        // Worker's comp (労災) is 100% employer paid (0.3% of gross salary)
        const gross = s.base_amount + s.total_allowances;
        const workersComp = Math.round(gross * 0.003) || 0;
        
        actualLaborInsurance += (employerEmployment + workersComp);
      }
    });
    
    // Fallback to Yayoi salaries if no payroll records exist for this month
    if (autoSalaries === 0 && yayoiSalaries > 0) {
      autoSalaries = yayoiSalaries;
    }
    
    return {
      success: true,
      totalSales,
      totalCashExpenses,
      totalFinancialOutflows,
      autoRent,
      autoMarketing,
      autoSalaries,
      actualSocialInsurance,
      actualLaborInsurance,
      expensesList
    };
  } catch (error: any) {
    console.error("Dashboard data load error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAnnualPnLData() {
  try {
    const analyticsRes = await getAdvancedAnalytics();
    let salesData: Record<string, number> = {};
    
    if (analyticsRes.success && analyticsRes.data) {
      analyticsRes.data.forEach((d: any) => {
        salesData[d.month] = d.total || 0;
      });
    }

    // Get all expenses from Firestore (could limit to last 12 months, but let's grab all and group)
    const colRef = collection(db, EXPENSES_COLLECTION);
    const q = query(colRef, orderBy("date", "asc"));
    const snapshot = await getDocs(q);
    
    const expensesByMonth: Record<string, number> = {};
    const financialByMonth: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const monthStr = data.date.substring(0, 7); // YYYY-MM
      const amount = data.amount || 0;
      
      const isTaxOrDebt = ["借入金", "長期借入金", "短期借入金", "法人税等", "法人税", "所得税", "住民税", "消費税"].some(keyword => data.category?.includes(keyword) || data.description?.includes(keyword));

      if (isTaxOrDebt) {
        financialByMonth[monthStr] = (financialByMonth[monthStr] || 0) + amount;
      } else {
        expensesByMonth[monthStr] = (expensesByMonth[monthStr] || 0) + amount;
      }
    });

    const { getMonthlyStatements } = await import("@/app/payroll/actions");

    // Merge sales and expenses for the last 12 months
    const now = new Date();
    const result = [];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = d.getFullYear();
      const targetMonth = d.getMonth() + 1;
      const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      
      const sales = salesData[monthStr] || 0;
      let rawExpenses = expensesByMonth[monthStr] || 0;
      const financialOutflow = financialByMonth[monthStr] || 0;

      // Extract specific fixed costs for this month from the DB
      const monthlyExpList = await getExpenses(targetYear, targetMonth);
      let autoRent = 0;
      let autoMarketing = 0;
      let variableExpenses = 0;
      let yayoiSalaries = 0;

      monthlyExpList.forEach(e => {
        const isTaxOrDebt = ["借入金", "長期借入金", "短期借入金", "法人税等", "法人税", "所得税", "住民税", "消費税"].some(keyword => e.category.includes(keyword) || (e.description && e.description.includes(keyword)));
        if (!isTaxOrDebt) {
          if (e.category === "地代家賃") autoRent += e.amount;
          else if (e.category === "広告宣伝費") autoMarketing += e.amount;
          else if (e.category === "給料手当" || e.category === "役員報酬" || e.category === "給料賃金" || e.category === "法定福利費") {
            yayoiSalaries += e.amount;
          } else {
            variableExpenses += e.amount;
          }
        }
      });

      // Get payroll salaries
      const statements = await getMonthlyStatements(targetYear, targetMonth);
      let autoSalaries = 0;
      statements.forEach(s => {
        autoSalaries += s.final_paid_amount;
      });

      if (autoSalaries === 0 && yayoiSalaries > 0) {
        autoSalaries = yayoiSalaries;
      }

      const totalExpenses = variableExpenses + autoRent + autoMarketing + autoSalaries;
      const profit = sales - totalExpenses;
      const cashFlow = profit - financialOutflow;
      
      result.push({
        month: monthStr,
        sales,
        expenses: totalExpenses,
        profit,
        financialOutflow,
        cashFlow
      });
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error fetching annual P&L data:", error);
    return { success: false, error: error.message };
  }
}

export async function parseYayoiPdfAction(base64File: string, mimeType: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const cleanBase64 = base64File.includes(",") ? base64File.split(",")[1] : base64File;

    if (mimeType === "text/csv" || mimeType === "text/plain" || mimeType === "text/rtf") {
      const buffer = Buffer.from(cleanBase64, 'base64');
      const jschardet = await import('jschardet');
      const iconv = await import('iconv-lite');
      const detected = jschardet.detect(buffer);
      // jschardet can sometimes return null for short/ambiguous Shift_JIS strings.
      // If the buffer looks like a CSV and has Shift_JIS byte patterns or is undetected, default to Shift_JIS.
      let encoding = 'utf8';
      if (detected.encoding === 'Shift_JIS' || detected.encoding === 'windows-1252' || detected.encoding?.includes('ISO') || !detected.encoding) {
        encoding = 'Shift_JIS';
      }
      
      const decodedText = iconv.decode(buffer, encoding);
      // If it decoded as Shift_JIS but looks completely garbled (lots of replacement characters), fallback to utf8
      if (decodedText.includes('') && encoding === 'Shift_JIS' && !decodedText.includes('弥生')) {
          return parseYayoiTextAction(iconv.decode(buffer, 'utf8'));
      }
      
      return parseYayoiTextAction(decodedText);
    }

    const prompt = `
あなたは優秀な美容サロン専門の税理士・会計コンサルタントです。
添付されたファイルは、弥生会計の「取引帳」「取引履歴」、または銀行口座のWeb明細（CSV、テキスト、画像など）です。
この画像または書類に記載されているすべての取引行を正確に抽出し、以下のルールに従って解析してJSON形式の配列で返してください。

【解析・重複検出・振替分類ルール】
1. 各行の取引日、金額、摘要（お取り扱い内容）を正確に抽出してください。銀行明細の場合、「お引出し」「出金」の金額を支出として扱い、「お預入れ」「入金」の金額を収入として扱います。
2. 勘定科目の推測: 銀行明細などで勘定科目が不明な場合は、摘要（お取り扱い内容）から推測して 'category' に最も適切な勘定科目（消耗品費、通信費、広告宣伝費、旅費交通費、地代家賃など）を設定してください。推測が難しい場合は摘要の一部をそのまま使うか「不明」としてください。
3. 売上の二重計上防止チェック:
   - 勘定科目が「売上」となっている行、または「お預入れ」等で摘要に「ＰＡＹＰＡＹ」「PayPay」「ﾘｸﾙｰﾄ ﾍﾟｲﾒﾝﾄ」「リクルート」「ﾒﾙﾍﾟｲ」「メルペイ」「Square」「スクエア」「Stripe」「ストライプ」「カード」「ホットペッパー」などの売上入金を示す文字が含まれる場合は、日報売上（サロンアプリ側）と重複しているため、分類を「売上」とし、 'is_duplicate_sales' を true にしてください。具体的な警告・仕訳アドバイス理由（reason）を添えてください。
4. 財務・税務支出（キャッシュフロー計算用）のチェック:
   - 借方勘定科目または摘要が「借入金」「長期借入金」「短期借入金」「法人税等」「所得税」「住民税」「消費税」の場合は、 'classification' を "財務・税務" にしてください。
5. 口座間振替・資金移動（経費ではない取引）のチェック:
   - 上記の「財務・税務」以外で、借方と貸方の両方が資産口座となっている取引、または摘要に「パソコン振替」「セブンATM出金」「カード (302)」「通帳 (709)」などの資金移動を示す文言がある場合は、経費ではなく資金の移動に過ぎないため、 'is_transfer' を true にし、 'classification' を "振替" にしてください。それ以外の出金（消耗品費、水道光熱費など）は 'is_transfer' を false にし、 'classification' を "経費" にしてください。
6. 金額はカンマを除いた数値型（number）で出力してください。
7. 取引データが存在しない場合は、必ず空のJSON配列 \`[]\` だけを出力してください。挨拶や説明などの文章は一切不要です。

【期待するJSON構造】
[
  {
    "no": 1,
    "date": "YYYY-MM-DD",
    "classification": "売上" | "経費" | "振替",
    "category": "勘定科目名",
    "description": "摘要欄の内容",
    "payment_method": "取引手段の内容",
    "amount": 金額（数値）,
    "is_duplicate_sales": true | false,
    "is_transfer": true | false,
    "reason": "重複や振替の警告理由、または空欄"
  }
]
`;

    console.log(`[Yayoi Parser] Sending file to Gemini (MIME: ${mimeType})...`);
    
    const modelIds = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError = null;
    let jsonResultText = null;

    for (const modelId of modelIds) {
      try {
        console.log(`[Yayoi Parser] Attempting parse with model: ${modelId}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt
                    },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: cleanBase64
                      }
                    }
                  ]
                }
              ]
            }),
            signal: AbortSignal.timeout(90000)
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`[Yayoi Parser] Model ${modelId} failed:`, errorData.error?.message || response.status);
          lastError = errorData.error?.message || response.status;
          continue;
        }

        const json = await response.json();
        jsonResultText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonResultText) {
          console.log(`[Yayoi Parser] Success with model: ${modelId}`);
          break;
        }
      } catch (err: any) {
        console.error(`[Yayoi Parser] Error fetching from ${modelId}:`, err.message);
        lastError = err.message;
        continue;
      }
    }

    if (!jsonResultText) {
      return { 
        success: false, 
        error: `弥生PDFの読み取りに失敗しました（エラー: ${lastError || "レスポンス空" }）。ファイルの鮮明度や形式をご確認ください。` 
      };
    }

    try {
      const jsonMatch = jsonResultText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : jsonResultText;
      let parsedData = JSON.parse(jsonStr);
      
      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
      }
      
      // Keep only flat objects to prevent Next.js rendering issues with weird nested structures
      const validTransactions = parsedData.flat(5).filter((item: any) => 
        item && typeof item === 'object' && !Array.isArray(item)
      );
      
      // Return as a JSON string to bypass Next.js Server Action "Maximum array nesting exceeded" limits
      return { success: true, dataStr: JSON.stringify(validTransactions) };
    } catch (parseErr: any) {
      console.error("JSON parse error on Gemini output:", parseErr, jsonResultText);
      return {
        success: false,
        error: `AIの出力解析に失敗しました。データが多すぎるため途中で処理が途切れた可能性があります。数ヶ月ごとに分割してアップロードするか、弥生会計から「CSV形式」でエクスポートして貼り付けると確実に読み込めます。`
      };
    }
  } catch (error: any) {
    console.error("parseYayoiPdfAction Error:", error);
    return { success: false, error: error.message };
  }
}

function hashStr(str: string) {
  return crypto.createHash("md5").update(str).digest("hex");
}

export async function parseYayoiTextAction(textContent: string, columnMapping?: { date: string | number; amount: string | number; desc: string | number }) {
  const startTime = Date.now();
  let stats = { total: 0, ai: 0, rule: 0, excluded: 0, expense: 0, timeMs: 0 };

  try {
    const lines = textContent.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const isYayoi = lines.some(l => l.startsWith('"2000"') || l.includes('弥生'));
    
    const parsed = Papa.parse(textContent, { skipEmptyLines: true, header: false });
    const data = parsed.data as any[][];
    if (data.length === 0) return { success: false, error: "データが空です" };
    
    const hasHeader = isNaN(Number(data[0][0]?.replace(/,/g, ''))) && data.length > 1;
    const startIndex = hasHeader ? 1 : 0;
    
    let results: any[] = [];
    
    if (isYayoi) {
      console.log("[Parser] Detected Yayoi CSV. Skipping AI.");
      let no = 1;
      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (row.length < 17) continue;
        
        const date = row[3] ? row[3].replace(/\//g, "-") : "";
        const debitAccount = row[4] || "";
        const creditAccount = row[10] || "";
        const amountStr = row[8] || row[14] || "0";
        const amount = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
        const description = row[16] || "";

        if (!date || amount === 0) continue;
        stats.total++;

        const exclusions = ["売上", "売掛金", "普通預金", "事業主貸", "事業主借", "現金"]; 
        if (exclusions.includes(debitAccount)) {
          stats.excluded++;
          continue; 
        }

        let classification = "経費";
        let category = debitAccount;

        const debtAccounts = ["借入金", "長期借入金", "短期借入金"];
        const taxAccounts = ["租税公課", "法人税等", "所得税", "住民税", "消費税"];
        const salaryAccounts = ["給料手当", "法定福利費", "福利厚生費"];
        const rentAccounts = ["地代家賃"];

        if (debtAccounts.includes(category)) {
          category = "借入金・返済";
          classification = "財務・税務";
        } else if (taxAccounts.includes(category)) {
          category = "税金";
          classification = "財務・税務";
        } else if (salaryAccounts.includes(category)) {
          category = "人件費";
        } else if (rentAccounts.includes(category)) {
          category = "固定費";
        }
        
        stats.rule++;
        stats.expense++;

        results.push({
          no: no++, date, classification, category, description,
          payment_method: "", amount, is_duplicate_sales: false, is_transfer: false,
          reason: "弥生自動マッピング"
        });
      }
      stats.timeMs = Date.now() - startTime;
      return { success: true, dataStr: JSON.stringify(results), stats };
    }

    console.log("[Parser] Detected Generic CSV.");
    
    let dateCol = -1, amountCol = -1, descCol = -1;
    
    if (columnMapping) {
      dateCol = Number(columnMapping.date);
      amountCol = Number(columnMapping.amount);
      descCol = Number(columnMapping.desc);
    } else {
      const firstRow = data[0];
      for (let i = 0; i < firstRow.length; i++) {
        const val = String(firstRow[i]);
        if (val.includes("日付") || val.includes("利用日") || /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(val)) {
           if (dateCol === -1) dateCol = i;
        }
        if (val.includes("出金") || val.includes("引出") || val.includes("支払") || val.includes("金額")) {
           amountCol = i;
        }
        if (val.includes("摘要") || val.includes("内容") || val.includes("利用店")) {
           descCol = i;
        }
      }
      
      if (dateCol === -1 || amountCol === -1 || descCol === -1) {
         if (data.length > 1) {
           const row = data[1];
           for (let i = 0; i < row.length; i++) {
             const val = String(row[i]);
             if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(val) && dateCol === -1) dateCol = i;
             const num = Number(val.replace(/,/g, ''));
             if (!isNaN(num) && num > 0 && amountCol === -1) amountCol = i;
             if (val.length > 3 && isNaN(num) && descCol === -1) descCol = i;
           }
         }
      }
    }

    if (dateCol === -1 || amountCol === -1 || descCol === -1) {
       return { 
         success: false, 
         requireColumnSelection: true, 
         headers: data[0],
         previewRows: data.slice(1, 4)
       };
    }

    let no = 1;
    const aiQueue: any[] = [];
    const salesKeywords = ["paypay", "リクルート", "stripe", "square", "airpay", "stores", "楽天ペイ", "ホットペッパー"];
    const transferKeywords = ["atm", "振替", "移動", "引落", "振込", "カード ("];

    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      if (!row[dateCol] || !row[amountCol]) continue;
      
      const date = row[dateCol].replace(/\//g, "-");
      const amount = parseInt(String(row[amountCol]).replace(/,/g, ''), 10) || 0;
      const desc = row[descCol] || "";
      
      if (amount === 0) continue; 
      stats.total++;
      
      const descLower = desc.toLowerCase();
      const isSales = salesKeywords.some(k => descLower.includes(k));
      const isTransfer = transferKeywords.some(k => descLower.includes(k));

      if (isSales) {
        stats.rule++;
        stats.excluded++;
        results.push({ no: no++, date, classification: "売上", category: "売上", description: desc, payment_method: "", amount, is_duplicate_sales: true, is_transfer: false, reason: "ルール：売上重複除外" });
        continue;
      }

      if (isTransfer) {
        stats.rule++;
        stats.excluded++;
        results.push({ no: no++, date, classification: "振替", category: "振替", description: desc, payment_method: "", amount, is_duplicate_sales: false, is_transfer: true, reason: "ルール：資金移動除外" });
        continue;
      }

      // Check Cache
      const hash = hashStr(desc);
      try {
        const snap = await getDoc(doc(db, "ai_expense_rules", hash));
        if (snap.exists()) {
          const cached = snap.data();
          stats.rule++;
          stats.expense++;
          results.push({ no: no++, date, classification: cached.classification, category: cached.category, description: desc, payment_method: "", amount, is_duplicate_sales: false, is_transfer: false, reason: "キャッシュ：自動適用" });
          continue;
        }
      } catch (e) { console.error("Cache error", e); }

      aiQueue.push({ index: i, no: no++, date, amount, desc, hash });
    }

    if (aiQueue.length > 0) {
      console.log(`[Parser] Extracted ${aiQueue.length} items for AI processing`);
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

      const prompt = `
あなたは優秀な美容サロン専門の税理士・会計コンサルタントです。
以下のJSON配列データ（未分類の経費行）の 'category' を推測して設定してください。
分類は '消耗品費', '通信費', '広告宣伝費', '旅費交通費', '地代家賃' 等の適切な科目です。推測不可な場合は '不明' としてください。
出力は元の配列と同じ長さのJSON配列のみを返してください。

データ:
${JSON.stringify(aiQueue.map(q => ({ desc: q.desc, amount: q.amount })))}

出力形式:
[ { "category": "勘定科目名" }, ... ]
`;

      const modelIds = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
      let aiResultText = null;
      let lastError = null;

      for (const modelId of modelIds) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), signal: AbortSignal.timeout(90000)
          });
          if (!response.ok) { lastError = (await response.json()).error?.message; continue; }
          const json = await response.json();
          aiResultText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResultText) break;
        } catch (err: any) { lastError = err.message; continue; }
      }

      if (!aiResultText) throw new Error(`AI解析エラー: ${lastError}`);

      const jsonMatch = aiResultText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResultText;
      let aiParsed = JSON.parse(jsonStr);
      if (!Array.isArray(aiParsed)) aiParsed = [aiParsed];

      for (let i = 0; i < aiQueue.length; i++) {
        const q = aiQueue[i];
        const aiRes = aiParsed[i] || { category: "不明" };
        stats.ai++;
        stats.expense++;
        
        results.push({ no: q.no, date: q.date, classification: "経費", category: aiRes.category, description: q.desc, payment_method: "", amount: q.amount, is_duplicate_sales: false, is_transfer: false, reason: "AI推測" });
        
        // Save to cache
        try {
          await setTenantOwnedDoc(doc(db, "ai_expense_rules", q.hash), {
            description: q.desc, classification: "経費", category: aiRes.category, updated_at: serverTimestamp()
          });
        } catch (e) { console.error("Cache save error", e); }
      }
    }

    stats.timeMs = Date.now() - startTime;
    return { success: true, dataStr: JSON.stringify(results), stats };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

const PETTY_CASH_COLLECTION = "petty_cash_balances";

export async function getPettyCashBalance(year: number, month: number, storeName: string): Promise<number> {
  try {
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const docId = `${storeName}_${targetPrefix}`;
    const docRef = doc(db, PETTY_CASH_COLLECTION, docId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data().balance || 0;
    }
    return 0; // Default to 0 if not set
  } catch (error) {
    console.error("Error getting petty cash balance:", error);
    return 0;
  }
}

export async function updatePettyCashBalance(year: number, month: number, storeName: string, balance: number) {
  try {
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const docId = `${storeName}_${targetPrefix}`;
    const docRef = doc(db, PETTY_CASH_COLLECTION, docId);
    
    await setTenantOwnedDoc(docRef, {
      store_name: storeName,
      target_month: targetPrefix,
      balance: balance,
      updated_at: serverTimestamp()
    });
    
    revalidatePath("/staff-portal/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating petty cash balance:", error);
    return { success: false, error: error.message };
  }
}

