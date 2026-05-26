"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query, 
  where,
  orderBy, 
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { addAuditLog } from "../audit/actions";
import { revalidatePath } from "next/cache";

export type StaffRole = "admin" | "manager" | "staff";

export type StaffProfile = {
  id: string;
  uid?: string; // Firebase Auth UID
  name: string; // Combined name (Full name)
  last_name?: string;
  first_name?: string;
  last_name_kana?: string;
  first_name_kana?: string;
  name_kana?: string; // Combined kana
  email?: string;
  role: StaffRole;
  employment_type: "employee" | "outsourcing" | "part_time";
  employment_status?: "active" | "leave" | "retired";
  max_holiday_requests: number;
  is_invoice_registered?: boolean;
  is_trainee: boolean;
  is_active: boolean;
  monthly_sales_target?: number;
  nomination_fee?: number; // 指名手当単価
  hourly_wage?: number; // 時給
  paid_leave_balance?: number; // 有給残日数
  sns_accounts?: string[];
  sort_order?: number;
  passcode?: string; // Kiosk & Portal Passcode
  created_at?: any;
};

const STAFF_COLLECTION = "staff_profiles";

export async function getStaffList(): Promise<StaffProfile[]> {
  try {
    const colRef = collection(db, STAFF_COLLECTION);
    // Remove orderBy from the query itself to ensure records without sort_order are also fetched
    const q = query(colRef);
    
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

    const staff = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      };
    }) as StaffProfile[];

    // Sort in-memory instead
    return staff.sort((a, b) => {
      const aIsRetired = a.employment_status === "retired";
      const bIsRetired = b.employment_status === "retired";
      
      if (aIsRetired && !bIsRetired) return 1;
      if (!aIsRetired && bIsRetired) return -1;
      
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || "").localeCompare(b.name || "", "ja");
    });
  } catch (error) {
    console.error("Error fetching staff from Firestore:", error);
    return [];
  }
}

import { adminAuth } from "@/lib/firebase-admin";

export async function addStaff(formData: FormData) {
  try {
    const lastName = formData.get("last_name") as string || "";
    const firstName = formData.get("first_name") as string || "";
    const lastNameKana = formData.get("last_name_kana") as string || "";
    const firstNameKana = formData.get("first_name_kana") as string || "";
    
    const name = (lastName + " " + firstName).trim();
    const nameKana = (lastNameKana + " " + firstNameKana).trim();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const employment_type = formData.get("employment_type") as "employee" | "outsourcing" | "part_time";
    const is_invoice_registered = formData.get("is_invoice_registered") === "true";
    const max_holiday_requests = parseInt(formData.get("max_holiday_requests") as string || "3", 10);
    const role = (formData.get("role") as StaffRole) || "staff";
    const monthly_sales_target = parseInt(formData.get("monthly_sales_target") as string || "0", 10);
    const nomination_fee = parseInt(formData.get("nomination_fee") as string || "300", 10);
    const hourly_wage = parseInt(formData.get("hourly_wage") as string || "0", 10);
    const paid_leave_balance = parseInt(formData.get("paid_leave_balance") as string || "0", 10);
    const passcode = (formData.get("passcode") as string) || "1234";
    const employment_status = (formData.get("employment_status") as "active" | "leave" | "retired") || "active";

    if (!name || !email) {
      return { success: false, error: "名前、メールアドレスは必須です" };
    }

    const is_trainee = formData.get("is_trainee") === "true";

    // 1. Create Firebase Auth User (Optional)
    let uid: string | undefined;
    try {
      const userRecord = await adminAuth.createUser({
        email,
        password: passcode + "_salon",
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
      last_name: lastName,
      first_name: firstName,
      last_name_kana: lastNameKana,
      first_name_kana: firstNameKana,
      name_kana: nameKana,
      email,
      role,
      employment_type,
      employment_status,
      is_invoice_registered,
      is_trainee,
      max_holiday_requests,
      is_active: true,
      monthly_sales_target,
      nomination_fee,
      hourly_wage,
      paid_leave_balance,
      passcode,
      sns_accounts: formData.getAll("sns_accounts") as string[],
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

export async function editStaff(id: string, formData: FormData) {
  try {
    const lastName = formData.get("last_name") as string || "";
    const firstName = formData.get("first_name") as string || "";
    const lastNameKana = formData.get("last_name_kana") as string || "";
    const firstNameKana = formData.get("first_name_kana") as string || "";
    
    const name = (lastName + " " + firstName).trim();
    const nameKana = (lastNameKana + " " + firstNameKana).trim();

    const email = formData.get("email") as string;
    const employment_type = formData.get("employment_type") as "employee" | "outsourcing" | "part_time";
    const is_invoice_registered = formData.get("is_invoice_registered") === "true";
    const max_holiday_requests = parseInt(formData.get("max_holiday_requests") as string || "3", 10);
    const role = (formData.get("role") as StaffRole) || "staff";
    const monthly_sales_target = parseInt(formData.get("monthly_sales_target") as string || "0", 10);
    const nomination_fee = parseInt(formData.get("nomination_fee") as string || "300", 10);
    const hourly_wage = parseInt(formData.get("hourly_wage") as string || "0", 10);
    const paid_leave_balance = parseInt(formData.get("paid_leave_balance") as string || "0", 10);
    const passcode = formData.get("passcode") as string;
    const employment_status = (formData.get("employment_status") as "active" | "leave" | "retired") || "active";

    const is_trainee = formData.get("is_trainee") === "true";

    if (!name || !email) {
      return { success: false, error: "名前、メールアドレスは必須です" };
    }

    // Get current profile to check uid
    const snap = await getDocs(query(collection(db, STAFF_COLLECTION), where("__name__", "==", id)));
    let currentUid = "";
    if (!snap.empty) {
      currentUid = snap.docs[0].data().uid;
    }

    // Sync passcode and status to Firebase Auth using admin SDK
    if (currentUid) {
      try {
        const updateData: any = {
          disabled: employment_status === "retired"
        };
        if (passcode) {
          updateData.password = passcode + "_salon";
        }
        await adminAuth.updateUser(currentUid, updateData);
      } catch (authError) {
        console.warn("Failed to sync Firebase Auth user:", authError);
      }
    } else if (passcode) {
      try {
        const userRecord = await adminAuth.createUser({
          email,
          password: passcode + "_salon",
          displayName: name,
          disabled: employment_status === "retired"
        });
        currentUid = userRecord.uid;
      } catch (createError) {
        console.warn("Failed to create Firebase Auth user during edit:", createError);
      }
    }

    const colRef = doc(db, STAFF_COLLECTION, id);
    const staffData = {
      name,
      last_name: lastName,
      first_name: firstName,
      last_name_kana: lastNameKana,
      first_name_kana: firstNameKana,
      name_kana: nameKana,
      email,
      role,
      employment_type,
      employment_status,
      is_invoice_registered,
      is_trainee,
      max_holiday_requests,
      monthly_sales_target,
      nomination_fee,
      hourly_wage,
      paid_leave_balance,
      ...(passcode !== null && passcode !== undefined ? { passcode } : {}),
      sns_accounts: formData.getAll("sns_accounts") as string[],
      updated_at: serverTimestamp()
    };

    await updateDoc(colRef, staffData);

    await addAuditLog({
      table_name: STAFF_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: null,
      new_data: { ...staffData, updated_at: "now" },
      actor: "管理者"
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Error in editStaff:", error);
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

export async function updateStaffOrder(orderedIds: string[]) {
  try {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      const docRef = doc(db, STAFF_COLLECTION, id);
      batch.update(docRef, { sort_order: index });
    });
    await batch.commit();
    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating staff order:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStaffPasscode(staffId: string, passcode: string) {
  try {
    if (!staffId || !passcode) {
      return { success: false, error: "無効な入力データです" };
    }

    const docRef = doc(db, STAFF_COLLECTION, staffId);
    
    // Retrieve current profile to get uid
    const snap = await getDocs(query(collection(db, STAFF_COLLECTION), where("__name__", "==", staffId)));
    let currentUid = "";
    if (!snap.empty) {
      currentUid = snap.docs[0].data().uid;
    }

    // Sync passcode to Firebase Auth password under the hood using admin SDK
    if (currentUid) {
      try {
        await adminAuth.updateUser(currentUid, { password: passcode + "_salon" });
      } catch (authError) {
        console.warn("Failed to sync passcode to Firebase Auth password:", authError);
      }
    }

    await updateDoc(docRef, {
      passcode,
      updated_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: STAFF_COLLECTION,
      record_id: staffId,
      action: "UPDATE",
      old_data: null,
      new_data: { passcode: "UPDATED_BY_STAFF" },
      actor: "スタッフ本人"
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateStaffPasscode:", error);
    return { success: false, error: error.message || "暗証番号の変更に失敗しました" };
  }
}
