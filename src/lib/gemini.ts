import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateSNSContent(params: {
  account: string;
  genre: string;
  platform: string;
  theme: string;
}) {
  if (!genAI) {
    return { 
      success: false, 
      error: "Gemini APIキーが設定されていません。.env.localに GOOGLE_GENERATIVE_AI_API_KEY または GEMINI_API_KEY を設定してください。" 
    };
  }

  // 2026年時点で使用可能な最新モデルを試行
  const modelIds = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];
  let lastError = "";

  let styleInstructions = "";
  let formatInstructions = "";

  if (params.platform === "Threads") {
    styleInstructions = `
- 人間っぽい文章（プロが直接語りかけているような、温かみのある口調）
- 1行目を惹きつける1文にし、2行目以降は体験談や想いを語る
- 過度なハッシュタグ禁止（末尾に1-2個、または文中に自然に入れる程度）
- 読みやすい適度な改行
- 地域ワード（神戸、元町、六甲など）を自然に入れる
    `;
    formatInstructions = `
【出力形式】:
- 「キャッチコピー」「本文」などの見出しやラベルは一切含めないでください。
- 実際にThreadsへそのまま投稿できる完成された1つの文章のみを出力してください。
    `;
  } else if (params.platform === "Instagram") {
    styleInstructions = `
- 保存されやすい構成（有益なTipsや手順など）
- キャッチーなタイトルを1行目に
- CTA（保存、いいね、フォローの誘導）を末尾に
    `;
    formatInstructions = `
【出力形式】:
- 項目ごとのラベル（タイトル、本文、CTA、ハッシュタグ）は含めても良いですが、記号などを使って美しく読みやすく整えてください。
    `;
  } else if (params.platform === "X") {
    styleInstructions = `
- 140文字以内
- 冒頭で結論や驚きを伝え、短文で完結させる
- ハッシュタグは1-2個
    `;
    formatInstructions = `
【出力形式】:
- ラベルや見出しは一切含めず、投稿する1つのツイート内容のみを出力してください。
    `;
  }

  const prompt = `
あなたは美容サロンのSNS運用プロフェッショナルです。
以下の条件で、${params.platform}向けの投稿文を1つ作成してください。

【アカウント】: ${params.account}
【投稿ジャンル】: ${params.genre}
【投稿テーマ】: ${params.theme}

【スタイル指示】:
${styleInstructions}

${formatInstructions}

【注意】:
- あなたは「${params.account}」本人として書いてください。
- サロンの実績や地域性を活かした内容にしてください。
`;

  for (const modelId of modelIds) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return { success: true, content: response.text() };
    } catch (error: any) {
      console.error(`Gemini API Error with model ${modelId}:`, error);
      lastError = error.message;
      continue;
    }
  }

  return { success: false, error: lastError || "生成に失敗しました" };
}
