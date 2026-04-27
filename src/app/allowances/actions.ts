"use server";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  doc,
  serverTimestamp 
} from "firebase/firestore";
import { addAuditLog } from "@/app/audit/actions";

export type AllowanceType = "review" | "blog" | "sns" | "treatment" | "transport" | "other";

// ... existing code ...

export async function submitTransportRequest(data: {
  staff_id: string,
  staff_name: string,
  target_month: string,
  amount: number,
  details: string
}) {
  try {
    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const payload = {
      staff_id: data.staff_id,
      staff_name: data.staff_name,
      target_month: data.target_month,
      type: "transport",
      amount: data.amount,
      target_details: { context: data.details, is_request: true, status: "pending" },
      created_at: serverTimestamp()
    };

    const docRef = await addDoc(colRef, payload);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error submitting transport request:", error);
    return { success: false, error: error.message };
  }
}

export type AllowanceRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  target_month: string; // YYYY-MM
  type: AllowanceType;
  amount: number;
  target_details?: any; // JSON
  created_at: string;
};

const ALLOWANCES_COLLECTION = "allowances";

export async function getMonthlyAllowances(year: number, month: number): Promise<AllowanceRecord[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const q = query(colRef, where("target_month", "==", targetPrefix), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AllowanceRecord[];
  } catch (error) {
    console.error("Error fetching allowances:", error);
    return [];
  }
}

export async function addAllowance(formData: FormData) {
  try {
    const staffName = formData.get("staff_name") as string;
    const targetMonth = formData.get("target_month") as string; // YYYY-MM
    const type = formData.get("type") as AllowanceType;
    const amount = parseInt(formData.get("amount") as string || "0", 10);
    const detailText = formData.get("detail_text") as string || "";

    if (!staffName || !targetMonth || !type) {
      return { success: false, error: "必須項目が入力されていません。" };
    }

    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const payload = {
      staff_id: "staff-" + staffName, // Mock UUID or look up from staff profiles if needed
      staff_name: staffName,
      target_month: targetMonth,
      type,
      amount,
      target_details: { context: detailText },
      created_at: serverTimestamp()
    };

    const docRef = await addDoc(colRef, payload);

    await addAuditLog({
      table_name: ALLOWANCES_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: payload,
      actor: "Admin"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding allowance:", error);
    return { success: false, error: error.message || "エラーが発生しました。" };
  }
}

export async function deleteAllowance(id: string) {
  try {
    await deleteDoc(doc(db, ALLOWANCES_COLLECTION, id));

    await addAuditLog({
      table_name: ALLOWANCES_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: null,
      new_data: null,
      actor: "Admin"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting allowance:", error);
    return { success: false, error: error.message || "エラーが発生しました。" };
  }
}
