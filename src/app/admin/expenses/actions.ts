"use server";

import { db } from "@/lib/firebase";
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
  serverTimestamp 
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { getAdvancedAnalytics } from "@/app/dashboard/actions";
import { addAuditLog } from "@/app/audit/actions";

export type ExpenseRecord = {
  id?: string;
  store_name: string; // "六甲" | "元町" | "神戸"
  date: string; // YYYY-MM-DD
  category: string; // "消耗品費" | "旅費交通費" | "広告宣伝費" | "水道光熱費" | "通信費" | "雑費" | "地代家賃" | "給料手当" | "その他"
  amount: number;
  description: string;
  staff_name: string;
  staff_id: string;
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
    const docRef = await addDoc(colRef, {
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

export async function updateExpense(id: string, data: Partial<ExpenseRecord>) {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, id);
    await updateDoc(docRef, {
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
    await deleteDoc(docRef);

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
    const totalCashExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      success: true,
      totalSales,
      totalCashExpenses,
      expensesList
    };
  } catch (error: any) {
    console.error("Dashboard data load error:", error);
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

    const prompt = `
あなたは優秀な美容サロン専門の税理士・会計コンサルタントです。
添付されたファイルは、弥生会計の「取引帳」または「取引履歴」のPDF、CSVテキスト、またはスクリーンショット画像です。
この画像または書類に記載されているすべての取引行を正確に抽出し、以下のルールに従って解析してJSON形式の配列で返してください。

【解析・重複検出・振替分類ルール】
1. 各行の取引日、借方勘定科目、貸方勘定科目、金額、摘要を正確に抽出してください。
2. 売上の二重計上防止チェック:
   - 勘定科目が「売上」「売掛金」「雑収入」となっている行、または摘要に「ＰＡＹＰＡＹ」「PayPay」「ﾘｸﾙｰﾄ ﾍﾟｲﾒﾝﾄ」「リクルート」「ﾒﾙﾍﾟｲ」「メルペイ」「Square」「スクエア」「Stripe」「ストライプ」「カード」などの文字が含まれ、分類が「売上」となっている行は、日報売上（サロンアプリ側）と重複しているため、 is_duplicate_sales を true にし、日本のサロンオーナー向けに分かりやすい具体的な警告・仕訳アドバイス理由（reason）を添えてください。
3. 口座間振替・資金移動（経費ではない取引）のチェック:
   - 借方と貸方の両方が資産口座（例：「普通預金」⇔「普通預金」、「普通預金」⇔「現金」、「クレジットカード」の返済）となっている取引、または摘要に「パソコン振替」「セブンATM出金」「カード (302)」「通帳 (709)」などの資金移動を示す文言がある場合、あるいは「借入金返済 (ご返済　ｾｲｻｸｺｳｺ)」などの財務活動による支出の場合は、経費ではなく資金の移動に過ぎないため、 is_transfer を true にしてください。それ以外（消耗品費、水道光熱費、通信費、広告宣伝費、地代家賃、税理士報酬、給料賃金、支払手数料など）は is_transfer を false にし、 classification を "経費" にしてください。
4. 金額はカンマを除いた数値型（number）で出力してください。

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
    
    const modelIds = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];
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
            signal: AbortSignal.timeout(60000)
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

    const jsonMatch = jsonResultText.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : jsonResultText;
    const parsedData = JSON.parse(jsonStr);

    return { success: true, data: parsedData };
  } catch (error: any) {
    console.error("parseYayoiPdfAction Error:", error);
    return { success: false, error: error.message };
  }
}
