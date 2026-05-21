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
  serverTimestamp 
} from "@/lib/firestore-server";
import { revalidatePath } from "next/cache";
import { sendLineMessage } from "@/lib/line";
import { getCustomerById } from "@/lib/customers";

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
    await addDoc(colRef, {
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
    await updateDoc(docRef, { 
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
    await updateDoc(docRef, { 
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

export async function generateBookingReply(customerName: string, selectedSlots: string[]) {
  // Use the exact style from the provided screenshots
  const slotsText = selectedSlots.join("\n");
  
  const reply = `お問い合わせありがとうございます。
かしこまりました。

${slotsText}

こちらに空きがございますが、ご都合いいかがでしょうか？`;

  return { success: true, reply };
}
