"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUserContext } from "@/lib/auth-server";
import { FAQItem } from "@/app/admin/faqs/types";
import { FieldValue } from "firebase-admin/firestore";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Server-side masking for Personal Information
function maskPersonalInformation(text: string): string {
  let masked = text;
  // Mask Japanese phone numbers
  masked = masked.replace(/(0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4})/g, "***-****-****");
  // Mask emails
  masked = masked.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, "***@***.***");
  // Mask potential salary/money digits (more than 3 digits usually, just basic masking for safety)
  // masked = masked.replace(/([0-9]{4,})/g, "****"); // Might be too aggressive for years/months
  return masked;
}

export async function askAiSupport(question: string, contextUrl: string) {
  try {
    const authStatus = await getCurrentUserContext();
    if (!authStatus) {
      return { answer_status: "unresolved", message: "ログインが必要です。" };
    }
    const userRole = authStatus.role || "staff";
    const tenantId = authStatus.companyId || "unknown";
    const userId = authStatus.uid;

    const maskedQuestion = maskPersonalInformation(question);

    if (!genAI) {
      console.warn("Gemini API Key is not set.");
      return { answer_status: "unresolved", message: "AIチャット機能は現在利用できません。" };
    }

    // 1. Fetch relevant FAQs based on simple keyword extraction
    // (In a real scenario, use TF-IDF, Embeddings, or Algolia. For now, we do a basic in-memory filter over published FAQs)
    const snapshot = await adminDb.collection("faqs")
      .where("is_published", "==", true)
      .get();
      
    let availableFaqs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as FAQItem[];
    availableFaqs = availableFaqs.filter(faq => !faq.target_roles || faq.target_roles.length === 0 || faq.target_roles.includes(userRole));

    // Simple keyword match
    const qNorm = maskedQuestion.toLowerCase();
    const matchedFaqs = availableFaqs.filter(faq => {
      if (qNorm.includes(faq.category.toLowerCase())) return true;
      if (faq.search_terms.some(term => qNorm.includes(term.toLowerCase()))) return true;
      if (qNorm.includes(faq.question.toLowerCase())) return true;
      return false;
    });

    // We can also provide the context URL to help AI understand what screen the user is looking at.
    const systemPrompt = `
あなたはサロン管理システムのAIサポートアシスタントです。
利用者が質問をしてきました。あなたは【提供されたFAQの内容だけ】をもとに回答しなければなりません。
提供データに答えがない場合や、確信が持てない場合は推測で回答せず、必ず "unresolved" を返してください。

【利用者の状況】
現在の画面URL: ${contextUrl}
利用者の権限: ${userRole}

【関連するFAQデータ】
${matchedFaqs.length === 0 ? "関連するFAQは見つかりませんでした。" : matchedFaqs.map(f => `Q: ${f.question}\nA: ${f.answer}\n関連画面: ${f.related_screen || 'なし'}`).join("\n\n")}

【出力形式（必須）】
必ず以下のJSON形式で返答してください。Markdownのコードブロック (\`\`\`json) は含めないでください。
{
  "answer_status": "answered" または "unresolved",
  "message": "回答の文章（unresolvedの場合は『現在登録されているヘルプ情報だけでは、正確に回答できませんでした。管理者へお問い合わせください。』という文言）",
  "related_faq_id": "もしFAQを参照して回答した場合はそのFAQのID（無い場合はnull）"
}
`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(`${systemPrompt}\n\n質問: ${maskedQuestion}`);
    const responseText = result.response.text();
    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", responseText);
      aiResponse = { answer_status: "unresolved", message: "現在登録されているヘルプ情報だけでは、正確に回答できませんでした。管理者へお問い合わせください。" };
    }

    // 2. If unresolved, record it in ai_unresolved_questions
    if (aiResponse.answer_status === "unresolved") {
      await adminDb.collection("ai_unresolved_questions").add({
        tenant_id: tenantId,
        user_id: userId,
        user_role: userRole,
        question: maskedQuestion,
        context_url: contextUrl,
        status: "pending",
        created_at: FieldValue.serverTimestamp()
      });
    }

    return aiResponse;

  } catch (error) {
    console.error("Error in AI Chat:", error);
    return { answer_status: "unresolved", message: "エラーが発生しました。" };
  }
}
