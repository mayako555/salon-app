"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  setDoc,
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { addAuditLog } from "@/app/audit/actions";

export type SalaryGrade = {
  id?: string;
  code: string; // J1, P1, etc.
  title: string; // スクール生, etc.
  hourly: number;
  base: number;
  role: number;
  attendance: number;
  service: number;
  display_order: number;
};

const GRADES_COLLECTION = "salary_grades";

export async function getSalaryGrades(): Promise<SalaryGrade[]> {
  try {
    const colRef = collection(db, GRADES_COLLECTION);
    const q = query(colRef, orderBy("display_order", "asc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SalaryGrade[];
  } catch (error) {
    console.error("Error fetching salary grades:", error);
    return [];
  }
}

export async function upsertSalaryGrade(data: SalaryGrade) {
  try {
    const colRef = collection(db, GRADES_COLLECTION);
    const payload = {
      code: data.code,
      title: data.title,
      hourly: Number(data.hourly) || 0,
      base: Number(data.base) || 0,
      role: Number(data.role) || 0,
      attendance: Number(data.attendance) || 0,
      service: Number(data.service) || 0,
      display_order: Number(data.display_order) || 0,
      updated_at: serverTimestamp()
    };

    let actionType: "INSERT" | "UPDATE" = "INSERT";
    let recordId = "";

    if (data.id) {
      actionType = "UPDATE";
      recordId = data.id;
      const docRef = doc(db, GRADES_COLLECTION, data.id);
      await setDoc(docRef, payload, { merge: true });
    } else {
      actionType = "INSERT";
      const docRef = await addDoc(colRef, {
        ...payload,
        created_at: serverTimestamp()
      });
      recordId = docRef.id;
    }

    await addAuditLog({
      table_name: GRADES_COLLECTION,
      record_id: recordId,
      action: actionType,
      old_data: data.id ? { id: data.id } : null,
      new_data: payload,
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting salary grade:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSalaryGrade(id: string) {
  try {
    await deleteDoc(doc(db, GRADES_COLLECTION, id));
    
    await addAuditLog({
      table_name: GRADES_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: { id },
      new_data: null,
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting salary grade:", error);
    return { success: false, error: error.message };
  }
}
