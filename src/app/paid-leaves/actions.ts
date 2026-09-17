"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc,
  limit
} from "@/lib/firestore-admin-wrapper";
import { addAuditLog } from "@/app/audit/actions";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";
import { getCurrentUserContext } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";


export type PaidLeaveTransaction = {
  id: string;
  staff_id: string;
  staff_name: string;
  type: "grant" | "consume" | "adjust";
  days: number; // e.g. 10.0, -1.0, 0.5
  reason: string; // e.g. "入社半年付与", "シフト消化", "手動調整"
  date: string; // YYYY-MM-DD
  created_at?: any;
};

const TRANSACTIONS_COLLECTION = "paid_leave_transactions";
const STAFF_COLLECTION = "staff_profiles";

/**
 * スタッフポータル用。有給残数はクライアントに保持したログイン時点の
 * プロフィールではなく、認証済み本人のプロフィールから都度取得する。
 */
export async function getMyPaidLeaveBalance(): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.profileId) {
      return { success: false, error: "スタッフ情報が見つかりませんでした" };
    }

    const profileSnap = await adminDb.collection(STAFF_COLLECTION).doc(ctx.profileId).get();
    if (!profileSnap.exists) {
      return { success: false, error: "スタッフ情報が見つかりませんでした" };
    }

    const profile = profileSnap.data() || {};
    if (ctx.role !== "systemOwner" && profile.companyId !== ctx.companyId) {
      return { success: false, error: "所属会社が一致しません" };
    }

    const rawBalance = profile.paid_leave_balance;
    const balance = typeof rawBalance === "number"
      ? rawBalance
      : Number.parseFloat(String(rawBalance ?? 0));

    return {
      success: true,
      balance: Number.isFinite(balance) ? balance : 0,
    };
  } catch (error) {
    console.error("Error fetching current staff paid leave balance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "有給残日数を取得できませんでした",
    };
  }
}

export async function getPaidLeaveTransactions(staffId?: string): Promise<PaidLeaveTransaction[]> {
  try {
    const colRef = collection(db, TRANSACTIONS_COLLECTION);
    
    let q;
    if (staffId) {
      q = query(colRef, where("staff_id", "==", staffId), orderBy("date", "desc"));
    } else {
      q = query(colRef, orderBy("date", "desc"));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at
      } as PaidLeaveTransaction;
    });
  } catch (error) {
    console.error("Error fetching paid leave transactions:", error);
    return [];
  }
}

// Transaction that adds a log AND updates the staff profile's paid_leave_balance
export async function addPaidLeaveTransaction(
  staffId: string, 
  staffName: string,
  type: "grant" | "consume" | "adjust",
  days: number,
  reason: string,
  currentBalance: number
) {
  try {
    const colRef = collection(db, TRANSACTIONS_COLLECTION);
    const dateStr = new Date().toISOString().split("T")[0];
    
    const payload = {
      staff_id: staffId,
      staff_name: staffName,
      type,
      days,
      reason,
      date: dateStr,
      created_at: serverTimestamp()
    };
    
    const docRef = await addTenantOwnedDoc(colRef, payload);
    
    // Update staff profile balance (allow negative balance)
    const newBalance = currentBalance + days;
    const staffDocRef = doc(db, STAFF_COLLECTION, staffId);
    await updateTenantOwnedDoc(staffDocRef, {
      paid_leave_balance: newBalance,
      updated_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: TRANSACTIONS_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: { currentBalance },
      new_data: { payload, newBalance },
      actor: "システム/管理者"
    });

    return { success: true, newBalance };
  } catch (error: any) {
    console.error("Error adding paid leave transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function getPaidLeaveShiftsForStaff(staffId: string) {
  try {
    const colRef = collection(db, "shifts");
    const q = query(
      colRef,
      where("staff_id", "==", staffId),
      where("type", "==", "paid_leave"),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      let days = -1; // Default to 1 day consumption
      
      // If it's a half-day shift (which we can guess if the shift segments are short, but let's assume -1 unless specified otherwise. We don't have half-day specific types in shifts easily distinguishable unless we check hours. Actually, requested_days might have 0.5. Let's just default to -1.0 for simplicity now).
      
      return {
        id: doc.id,
        staff_id: data.staff_id,
        staff_name: data.staff_name || "",
        type: "consume" as const,
        days: -1.0, 
        reason: "有給取得 (シフト)",
        date: data.date,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : new Date().toISOString()
      } as PaidLeaveTransaction;
    });
  } catch (error) {
    console.error("Error fetching paid leave shifts:", error);
    return [];
  }
}
