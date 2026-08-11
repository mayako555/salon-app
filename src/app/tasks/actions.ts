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
  serverTimestamp 
} from "@/lib/firestore-admin-wrapper";
import { revalidatePath } from "next/cache";
import { sendLineMessage } from "@/lib/line";
import { getCustomerById } from "@/lib/customers";
import { GoogleGenAI } from "@google/genai";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export type TaskType = "booking_change_request" | "general_inquiry" | "staff_evaluation";

export type TaskRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  customer_id: string;
  customer_name: string;
  type: TaskType;
  content: string;
  suggested_reply?: string;
  status: "pending" | "completed";
  created_at: any;
};

const TASKS_COLLECTION = "tasks";

export async function getAllPendingTasks(): Promise<TaskRecord[]> {
  try {
    const colRef = collection(db, TASKS_COLLECTION);
    const q = query(
      colRef, 
      where("status", "==", "pending"),
      orderBy("created_at", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
      };
    }) as TaskRecord[];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

export async function createTaskForStaff(data: Omit<TaskRecord, "id" | "status" | "created_at">) {
  try {
    const colRef = collection(db, TASKS_COLLECTION);
    await addTenantOwnedDoc(colRef, {
      ...data,
      status: "pending",
      created_at: serverTimestamp()
    });
    revalidatePath("/staff-portal");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating task:", error);
    return { success: false, error: error.message };
  }
}

export async function completeTask(taskId: string) {
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    await updateTenantOwnedDoc(docRef, { 
      status: "completed",
      updated_at: serverTimestamp()
    });
    revalidatePath("/staff-portal");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendReplyAndCompleteTask(taskId: string, customerId: string, replyMessage: string) {
  try {
    // 1. Get customer's LINE ID
    const customer = await getCustomerById(customerId);
    if (!customer?.line_user_id) {
      return { success: false, error: "お客様のLINE連携が見つかりません" };
    }

    // 2. Send LINE message
    const lineRes = await sendLineMessage(customer.line_user_id, replyMessage);
    if (!lineRes.success) {
      return { success: false, error: `LINE送信に失敗しました: ${lineRes.error}` };
    }

    // 3. Complete Task
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    await updateTenantOwnedDoc(docRef, { 
      status: "completed",
      reply_sent: replyMessage,
      completed_at: serverTimestamp()
    });

    revalidatePath("/staff-portal");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error in sendReplyAndCompleteTask:", error);
    return { success: false, error: error.message };
  }
}

export async function generateBookingReply(customerName: string, selectedSlots: string[], taskContent?: string) {
  try {
    const slotsText = selectedSlots.join("、");
    const prompt = `あなたは美容サロンのスタッフです。
お客様（${customerName}様）からのLINEの問い合わせに対して、返信文を作成してください。

以下の情報を自然な日本語に組み込んで、温かみのある丁寧な接客トーンで返信を作成してください。
- 提案する予約可能な日時: ${slotsText}
${taskContent ? `- お客様の元の問い合わせ内容: ${taskContent}` : ''}

注意点:
- 挨拶から始めてください。
- 予約枠の提案が含まれている場合は、「以下の日時でご案内可能ですが、ご都合はいかがでしょうか？」などの自然な提案にしてください。
- 最後に「ご返信お待ちしております。」などの締めの言葉を入れてください。
- 長すぎず、スマホのLINEで読みやすい長さにしてください。
- 「※」「【】」などの過剰な記号は使わず、絵文字も控えめ（1〜2個程度）にしてください。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return { success: true, reply: response.text };
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    // Fallback to simple template if AI fails
    const slotsText = selectedSlots.join("\n");
    const reply = `お問い合わせありがとうございます。\nかしこまりました。\n\n${slotsText}\n\nこちらに空きがございますが、ご都合いいかがでしょうか？`;
    return { success: true, reply }; // Return fallback even on error so user can proceed
  }
}
