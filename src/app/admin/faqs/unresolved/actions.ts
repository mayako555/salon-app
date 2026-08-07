"use server";

import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FAQItem, FAQ_CATEGORIES } from "../types";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getTenantCollection, getTenantDoc } from "@/lib/tenant-utils";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function getUnresolvedQuestions() {
  try {
    const ctx = await getCurrentUserContext();
    const snapshot = await getTenantCollection("ai_unresolved_questions", ctx)
      .where("status", "==", "pending")
      .orderBy("created_at", "desc")
      .get();
      
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString()
    }));
  } catch (error) {
    console.error("Error fetching unresolved questions:", error);
    return [];
  }
}

export async function ignoreUnresolvedQuestion(id: string) {
  try {
    const ctx = await getCurrentUserContext();
    await getTenantDoc("ai_unresolved_questions", id, ctx);
    await adminDb.collection("ai_unresolved_questions").doc(id).update({
      status: "ignored"
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateFaqDraftFromQuestion(questionText: string, contextUrl: string): Promise<{ draft: Partial<FAQItem> | null, error?: string }> {
  if (!genAI) {
    return { draft: null, error: "Gemini API is not available." };
  }

  const prompt = `
あなたはサロン管理システムの管理者向けアシスタントです。
利用者が解決できなかった以下の質問から、新しく作成すべきFAQ（よくある質問）の初期案を作成してください。

質問内容: ${questionText}
質問された画面: ${contextUrl}

以下のJSON形式のみを出力してください（マークダウンのコードブロックは不要です）。
推測できない機能についての回答は作らず、一般的な案として回答文を作成するか、管理者が埋めるためのプレースホルダーを含めてください。
カテゴリーは以下のいずれかから最も適切なものを選択してください。
[${FAQ_CATEGORIES.join(", ")}]

{
  "category": "カテゴリー名",
  "question": "ユーザーがわかりやすい形式に直した質問文",
  "answer": "回答の初期案",
  "search_terms": ["検索用キーワード1", "検索用キーワード2"]
}
  `;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(prompt);
    const jsonStr = result.response.text();
    const data = JSON.parse(jsonStr);

    const draft: Partial<FAQItem> = {
      category: FAQ_CATEGORIES.includes(data.category) ? data.category : "その他",
      question: data.question || questionText,
      answer: data.answer || "（管理者が回答を入力してください）",
      search_terms: Array.isArray(data.search_terms) ? data.search_terms : [],
      is_published: false,
      target_roles: ["systemOwner", "companyOwner", "manager", "storeManager", "admin", "staff"],
      related_screen: contextUrl
    };

    return { draft };
  } catch (error: any) {
    console.error("Draft generation failed:", error);
    return { draft: null, error: "回答案の生成に失敗しました。直接追加してください。" };
  }
}
