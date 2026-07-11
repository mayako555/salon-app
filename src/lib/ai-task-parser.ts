import { GoogleGenerativeAI } from "@google/generative-ai";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export type ParsedAITask = {
  title: string;
  category: "経営" | "開発" | "採用" | "助成金" | "人事" | "経理" | "店舗運営" | "SNS" | "マーケティング" | "営業" | "個人" | "その他";
  priority: 1 | 2 | 3 | 4 | 5;
  project?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
};

export async function parseTasksFromText(text: string): Promise<{ success: boolean; tasks: ParsedAITask[]; error?: string; isMock?: boolean }> {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const timeStr = format(new Date(), "HH:mm");

  if (!genAI) {
    // Fallback Mock Logic
    console.warn("AI Task Parser: API Key not found. Using mock parsing.");
    return mockParse(text, todayStr);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Use latest fast model
    
    const prompt = `
あなたは優秀な秘書です。
以下の入力テキストを解析し、必要なタスクを抽出し、JSON形式で出力してください。
複数のタスクが含まれている場合は配列として分割してください。

現在日時（日本時間）: ${todayStr} ${timeStr}
曜日の基準: 本日が基準です。「来週」「明日」などはこれを元に計算してください。

【出力要件】
1. title: タスクのタイトル（短く明確に）
2. category: 以下のいずれか一つを選択
   "経営", "開発", "採用", "助成金", "人事", "経理", "店舗運営", "SNS", "マーケティング", "営業", "個人", "その他"
3. priority: 重要度を1から5の数値で判定（5が最重要・至急）
4. project: もし関連するプロジェクト名や助成金名があれば抽出（なければ空文字）
5. dueDate: YYYY-MM-DD 形式の期限日（指定がなければ今日から1週間後など適当な期限を推測して設定）
6. dueTime: HH:mm 形式の期限時間（指定がなければ空文字）

【出力フォーマット】
以下のJSONスキーマの配列のみを出力してください。バッククォートでのマークダウン装飾（\`\`\`json ... \`\`\`）は**絶対に**含めないでください。

[
  {
    "title": "...",
    "category": "...",
    "priority": 5,
    "project": "...",
    "dueDate": "YYYY-MM-DD",
    "dueTime": "HH:mm"
  }
]

【入力テキスト】
${text}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const tasks: ParsedAITask[] = JSON.parse(cleanedText);
    
    return { success: true, tasks };

  } catch (error: any) {
    console.error("AI Parsing Error:", error);
    // Fallback on error
    return mockParse(text, todayStr, "AIの解析中にエラーが発生しました。簡易解析結果を表示します。");
  }
}

function mockParse(text: string, todayStr: string, errorMsg?: string): { success: boolean; tasks: ParsedAITask[]; error?: string; isMock: boolean } {
  const tasks: ParsedAITask[] = [];
  
  // Very basic split by "して" or "と"
  const parts = text.split(/(?:して|と|、|。)/).filter(p => p.trim().length > 0);
  
  parts.forEach(p => {
    let category: ParsedAITask["category"] = "その他";
    let priority: 1|2|3|4|5 = 3;
    
    if (p.includes("助成金")) { category = "助成金"; priority = 4; }
    else if (p.includes("採用") || p.includes("面接")) { category = "採用"; priority = 5; }
    else if (p.includes("計算") || p.includes("経理") || p.includes("給与")) { category = "経理"; priority = 5; }
    else if (p.includes("資料") || p.includes("経営") || p.includes("M&A")) { category = "経営"; priority = 5; }

    tasks.push({
      title: p.trim(),
      category,
      priority,
      project: "",
      dueDate: todayStr,
      dueTime: ""
    });
  });

  return { success: true, tasks: tasks.length > 0 ? tasks : [{
    title: text,
    category: "その他",
    priority: 3,
    dueDate: todayStr,
    dueTime: ""
  }], isMock: true, error: errorMsg };
}
