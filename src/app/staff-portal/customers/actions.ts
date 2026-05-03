"use server";

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Customer, addCustomer } from "@/lib/customers";
import { addCounselingResponse } from "@/lib/counseling";
import { revalidatePath } from "next/cache";

import { GoogleGenerativeAI } from "@google/generative-ai";

const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY || "");

export async function parseExtractedText(rawText: string) {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error("API Key is not configured.");
    }

    const prompt = `
以下のテキストは、美容サロンの紙の顧客カルテ（カウンセリングシート）をOCRで読み取ったものです。
このテキストから、顧客情報を抽出してJSON形式で返してください。

【ルール】
1. 氏名、フリガナ、電話番号、住所、郵便番号、生年月日、職業、アレルギー、リスク（注意点）を抽出してください。
2. 「会員No」や「顧客No」があれば customer_no フィールドに入れてください。
3. 性別が判断できれば gender ("male" / "female") を入れてください。
4. それ以外の「過去の施術履歴」や「メモ」と思われる部分は、 visit_history フィールドにまとめてください。
5. 日本語で出力してください。
6. JSON以外の余計な解説は含めないでください。

【期待するJSON構造】
{
  "customer_no": "会員番号",
  "name": "名前",
  "name_kana": "ふりがな",
  "phone": "電話番号",
  "postal_code": "郵便番号",
  "address": "住所",
  "birthday": "YYYY-MM-DD",
  "occupation": "職業",
  "gender": "female",
  "allergies": ["アレルギー1", "アレルギー2"],
  "risk_flags": ["注意点1", "注意点2"],
  "visit_history": "過去の施術履歴やメモの内容"
}

【OCRテキスト】
${rawText}
`;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    // Priority: Try models that are more likely to have free quota (1.5, flash-latest, then 2.0)
    const modelIds = ["gemini-1.5-flash", "gemini-flash-latest", "gemini-1.5-flash-8b", "gemini-2.0-flash-exp", "gemini-2.0-flash"];
    let lastError = null;

    for (const modelId of modelIds) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        console.log(`Attempting Gemini parsing (v1beta) with model: ${modelId}...`);
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`Model ${modelId} failed:`, errorData.error?.message || response.status);
          lastError = errorData.error?.message || response.status;
          continue; // Try next model
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) throw new Error("Empty response");

        console.log(`Success with model: ${modelId}!`);
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        const data = JSON.parse(jsonStr);
        return { success: true, data };
      } catch (err: any) {
        console.error(`Error with model ${modelId}:`, err.message);
        lastError = err.message;
        continue;
      }
    }

    throw new Error(lastError || "All Gemini models failed.");
  } catch (error: any) {
    console.error("Gemini Parsing Error (Fallback Loop):", error);
    return { success: false, error: error.message };
  }
}

export async function performOCR(base64Image: string) {
  try {
    if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error("Google Cloud Vision API Key is not configured. Please set GOOGLE_CLOUD_VISION_API_KEY in your environment.");
    }

    // Extract base64 data (remove prefix like "data:image/jpeg;base64,")
    const base64Data = base64Image.split(",")[1] || base64Image;

    const response = await fetch(VISION_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Data },
            features: [
              { type: "DOCUMENT_TEXT_DETECTION" } // Optimized for handwriting/documents
            ],
            imageContext: {
              languageHints: ["ja"]
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Vision API Error:", errorData);
      
      // Check for quota or billing errors
      if (response.status === 429 || (errorData.error?.message?.includes("quota") || errorData.error?.message?.includes("limit"))) {
        return { success: false, error: "QUOTA_LIMIT_REACHED" };
      }
      
      // Check for API key errors
      if (response.status === 403) {
        return { success: false, error: "API_KEY_INVALID", details: errorData.error?.message };
      }

      return { 
        success: false, 
        error: "API_ERROR", 
        message: errorData.error?.message || "解析に失敗しました",
        details: JSON.stringify(errorData.error, null, 2)
      };
    }

    const result = await response.json();
    const fullTextAnnotation = result.responses?.[0]?.fullTextAnnotation;
    
    if (!fullTextAnnotation) {
      return { success: false, error: "No text detected in image." };
    }

    return { success: true, text: fullTextAnnotation.text };
  } catch (error: any) {
    console.error("OCR Error:", error);
    return { success: false, error: error.message };
  }
}

export type VisitRecord = {
  id: string;
  customer_id: string;
  date: any;
  content: string; // メモ・施術内容
  staff_name: string;
  created_at: any;
};

import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getDownloadURL } from "firebase-admin/storage";

export async function uploadScanImage(base64Image: string) {
  try {
    const bucket = adminStorage.bucket();
    const base64Data = base64Image.split(",")[1] || base64Image;
    const buffer = Buffer.from(base64Data, "base64");
    
    const fileName = `scans/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, {
      metadata: { contentType: "image/jpeg" },
      public: true
    });

    // Make it public so it's viewable by eye
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("Upload Error:", error);
    return { success: false, error: error.message };
  }
}

export async function registerScannedCustomer(
  customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>,
  visitHistory?: string,
  imageUrls: string[] = []
) {
  try {
    // Ensure chart_image_urls and notes are included
    const dataToSave = {
      ...customerData,
      chart_image_urls: imageUrls,
      notes: visitHistory,
      is_active: true,
      has_allergy: (customerData.allergies?.length ?? 0) > 0,
    };

    // 1. Create the customer record
    const res = await addCustomer(dataToSave as any);
    
    if (!res.success || !res.id) {
      throw new Error(res.error || "Failed to create customer");
    }

    const customerId = res.id;

    // 2. Add an initial counseling response
    await addCounselingResponse({
      customer_id: customerId,
      service_types: [],
      gender: customerData.gender as any,
      answers: {
        is_scanned: true,
        allergies: customerData.allergies,
        risk_flags: customerData.risk_flags,
        scanned_history: visitHistory,
        image_urls: imageUrls
      },
      risk_level: customerData.risk_level || 'none',
      risk_flags: customerData.risk_flags || [],
      signed_at: new Date()
    });

    // 3. Process visit history (same as before but more robust)
    if (visitHistory) {
      const visitEntries = visitHistory.split(/\n\n|(?=\d{4}\/\d{1,2}\/\d{1,2})/).filter(v => v.trim().length > 0);
      for (const visitContent of visitEntries) {
        const trimmedContent = visitContent.trim();
        if (!trimmedContent) continue;

        const dateMatch = trimmedContent.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        let visitDate = new Date();
        if (dateMatch) {
          visitDate = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
        }

        const isEyelash = trimmedContent.includes("エクステ") || trimmedContent.includes("本");
        const isPerm = trimmedContent.includes("パーマ") || trimmedContent.includes("リフト");
        
        await adminDb.collection("karte_records").add({
          customer_id: customerId,
          date: visitDate,
          staff_id: "scanned_import",
          staff_name: "紙カルテ移行",
          service_type: isEyelash ? "eyelash_ext" : isPerm ? "lash_lift" : "other",
          visit_type: "repeat",
          design: {
            notes: trimmedContent,
            count: parseInt(trimmedContent.match(/(\d+)本/)?.[1] || "0")
          },
          notes: trimmedContent,
          photos: imageUrls, // Link original photos to each record as well
          created_at: serverTimestamp(),
          edit_history: []
        });
      }
    }

    revalidatePath("/staff-portal/customers");
    return { success: true, id: customerId };
  } catch (error: any) {
    console.error("Error in registerScannedCustomer:", error);
    return { success: false, error: error.message };
  }
}
