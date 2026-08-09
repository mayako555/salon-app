"use server";
import { addTenantOwnedDoc } from "@/lib/tenant-ownership";

import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { getUsageStats } from "@/lib/usage-logger";

const FEEDBACK_COLLECTION = "test_feedbacks";

export async function submitFeedback(
  companyId: string, 
  userId: string, 
  data: { 
    usedFeatures: string, 
    unusedFeatures: string, 
    confusingFeatures: string, 
    desiredFeatures: string, 
    bugs: string, 
    requests: string 
  }
) {
  try {
    const currentMonth = format(new Date(), "yyyy-MM");
    const usageStats = await getUsageStats(companyId);

    const colRef = collection(db, FEEDBACK_COLLECTION);
    await addTenantOwnedDoc(colRef, {
      companyId,
      userId,
      month: currentMonth,
      ...data,
      usageStats, // 回答時点での利用状況スナップショットを保存
      timestamp: serverTimestamp()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to submit feedback:", error);
    return { success: false, error: error.message };
  }
}

export async function checkFeedbackSubmitted(companyId: string) {
  try {
    const currentMonth = format(new Date(), "yyyy-MM");
    const colRef = collection(db, FEEDBACK_COLLECTION);
    const q = query(colRef, where("companyId", "==", companyId), where("month", "==", currentMonth));
    const snap = await getDocs(q);
    
    return snap.docs.length > 0;
  } catch (error) {
    console.error("Failed to check feedback:", error);
    return false; // エラー時はモーダルが出ないようにする（邪魔にならないよう安全側に倒す）
  }
}
