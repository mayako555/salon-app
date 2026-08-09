import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import * as Papa from "papaparse";
import * as crypto from "crypto";

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
          await setDoc(doc(db, "ai_expense_rules", q.hash), {
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
