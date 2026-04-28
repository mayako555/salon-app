"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc,
  deleteDoc,
  doc,
  query, 
  orderBy, 
  serverTimestamp
} from "firebase/firestore";
import { addAuditLog } from "../audit/actions";
import { revalidatePath } from "next/cache";

export type StaffRole = "admin" | "manager" | "staff";

export type StaffProfile = {
  id: string;
  uid?: string; // Firebase Auth UID
  name: string;
  email?: string;
  role: StaffRole;
  employment_type: "employee" | "outsourcing" | "part_time";
  max_holiday_requests: number;
  is_invoice_registered?: boolean;
  is_active: boolean;
  created_at?: any;
};

const STAFF_COLLECTION = "staff_profiles";

export async function getStaffList(): Promise<StaffProfile[]> {
  try {
    const colRef = collection(db, STAFF_COLLECTION);
    const q = query(colRef, orderBy("name", "asc"));
    
    // Add a timeout to prevent page hang
    const getDocsWithTimeout = Promise.race([
      getDocs(q),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore fetch timed out (10s)")), 10000)
      )
    ]);

    const snapshot = await getDocsWithTimeout as any;
    
    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as StaffProfile[];
  } catch (error) {
    console.error("Error fetching staff from Firestore:", error);
    return [];
  }
}

import { adminAuth } from "@/lib/firebase-admin";

export async function addStaff(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const employment_type = formData.get("employment_type") as "employee" | "outsourcing" | "part_time";
    const is_invoice_registered = formData.get("is_invoice_registered") === "true";
    const max_holiday_requests = parseInt(formData.get("max_holiday_requests") as string || "3", 10);
    const role = (formData.get("role") as StaffRole) || "staff";

    if (!name || !email || !password) {
      return { success: false, error: "名前、メールアドレス、パスワードは必須です" };
    }

    // 1. Create Firebase Auth User (Optional)
    let uid: string | undefined;
    try {
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
      uid = userRecord.uid;
    } catch (authError: any) {
      console.warn("Auth creation skipped or failed:", authError);
      // We do not fail the whole process. The staff will be saved to Firestore,
      // but they won't be able to log in until an Auth account is manually created.
    }

    // 2. Save Staff Profile to Firestore
    const colRef = collection(db, STAFF_COLLECTION);
    const staffData = {
      uid: uid || null,
      name,
      email,
      role,
      employment_type,
      is_invoice_registered,
      max_holiday_requests,
      is_active: true,
      created_at: serverTimestamp()
    };
    
    const addDocWithTimeout = Promise.race([
      addDoc(colRef, staffData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (15s)")), 15000)
      )
    ]);

    const docRef = await addDocWithTimeout as any;

    // 3. Add Audit Log
    await addAuditLog({
      table_name: STAFF_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: { ...staffData, created_at: "now" },
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error in addStaff:", error);
    return { success: false, error: error.message || "予期せぬエラーが発生しました" };
  }
}

export async function deleteStaff(id: string, uid?: string) {
  try {
    // 1. Delete from Firebase Auth if uid exists
    if (uid) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (authError) {
        console.error("Error deleting from Firebase Auth:", authError);
        // Continue even if auth delete fails (maybe user doesn't exist anymore)
      }
    }

    // 2. Delete from Firestore
    const docRef = doc(db, STAFF_COLLECTION, id);
    await deleteDoc(docRef);

    // 3. Audit log
    await addAuditLog({
      table_name: STAFF_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: { id, uid },
      new_data: null,
      actor: "管理者"
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting staff:", error);
    return { success: false, error: error.message || "削除に失敗しました" };
  }
}
