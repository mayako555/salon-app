"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  setDoc,
  addDoc,
  doc, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  getDoc,
  updateDoc
} from "firebase/firestore";

import { StaffContract } from "./constants";
import { getStaffList } from "../staff/actions";
import { addAuditLog } from "../audit/actions";

const CONTRACTS_COLLECTION = "staff_contracts";
const STAFF_COLLECTION = "staff_profiles";

export async function getContractsList(): Promise<StaffContract[]> {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const snapshot = await adminDb
      .collection(CONTRACTS_COLLECTION)
      .orderBy("valid_from", "desc")
      .get();
    
    // Fetch all staff to map names
    const staffSnapshot = await adminDb.collection(STAFF_COLLECTION).get();
    const staffMap = new Map();
    staffSnapshot.docs.forEach((doc: any) => {
      staffMap.set(doc.id, doc.data().name);
    });

    return snapshot.docs
      .filter((doc: any) => doc.data().deleted !== true)
      .map((doc: any) => {
        const data = doc.data();
        // Convert dates/timestamps to serializable types or remove them if not needed
        const contract = {
          ...data,
          id: doc.id,
          staff_name: staffMap.get(data.staff_id) || "不明",
          created_at: data.created_at?.toDate?.()?.getTime() || data.created_at || null,
          updated_at: data.updated_at?.toDate?.()?.getTime() || data.updated_at || null,
        };
        return JSON.parse(JSON.stringify(contract)) as StaffContract;
      });
  } catch (error: any) {
    console.error("Error fetching contracts from Firestore:", error);
    return [];
  }
}

export async function upsertContract(data: Partial<StaffContract>, saveMode: "add_history" | "overwrite" = "overwrite") {
  try {
    const colRef = collection(db, CONTRACTS_COLLECTION);
    
    const contractData = {
      staff_id: data.staff_id,
      contract_type: data.contract_type || "outsourcing",
      grade: data.grade || "",
      job_title: data.job_title || "",
      hourly_wage: Number(data.hourly_wage) || 0,
      monthly_base_salary: Number(data.monthly_base_salary) || 0,
      business_allowance: Number(data.business_allowance) || 0,
      attendance_allowance: Number(data.attendance_allowance) || 0,
      service_year_allowance: Number(data.service_year_allowance) || 0,
      tech_sales_quota: Number(data.tech_sales_quota) || 0,
      tech_sales_threshold: Number(data.tech_sales_threshold) || 0,
      tech_sales_ratio: Number(data.tech_sales_ratio) || 0,
      product_sales_ratio: Number(data.product_sales_ratio) || 0,
      nomination_fee: Number(data.nomination_fee) || 0,
      transport_fee_limit: Number(data.transport_fee_limit) || 0,
      deduction_consumption_tax: !!data.deduction_consumption_tax,
      deduction_cashless_ratio: Number(data.deduction_cashless_ratio) || 0,
      deduction_minimo_fee: !!data.deduction_minimo_fee,
      deduction_rakuten_fee: !!data.deduction_rakuten_fee,
      deduction_nailie_fee: !!data.deduction_nailie_fee,
      deduction_nomination_fee: !!data.deduction_nomination_fee,
      valid_from: data.valid_from || new Date().toISOString().split('T')[0],
      valid_to: data.valid_to || null,
      is_probation: !!data.is_probation,
      menu_specific_rates: data.menu_specific_rates || [],
      custom_allowances: data.custom_allowances || [],
      updated_at: serverTimestamp()
    };

    let actionType: "INSERT" | "UPDATE" = "INSERT";
    let recordId = "";

    const upsertPromise = async () => {
      if (data.id) {
        if (saveMode === "add_history") {
          // 1. Calculate the day before the new valid_from date
          const newValidFromDate = new Date(contractData.valid_from);
          newValidFromDate.setDate(newValidFromDate.getDate() - 1);
          const prevValidTo = newValidFromDate.toISOString().split('T')[0];

          // 2. Close the old contract
          const oldDocRef = doc(db, CONTRACTS_COLLECTION, data.id);
          await updateDoc(oldDocRef, { valid_to: prevValidTo, updated_at: serverTimestamp() });

          // 3. Insert the new contract
          actionType = "INSERT";
          const newDocRef = await addDoc(colRef, {
            ...contractData,
            created_at: serverTimestamp()
          });
          recordId = newDocRef.id;
        } else {
          // Overwrite mode
          actionType = "UPDATE";
          recordId = data.id;
          const docRef = doc(db, CONTRACTS_COLLECTION, data.id);
          await updateDoc(docRef, contractData);
        }
      } else {
        actionType = "INSERT";
        const docRef = await addDoc(colRef, {
          ...contractData,
          created_at: serverTimestamp()
        });
        recordId = docRef.id;
      }
      
      // Audit Log
      await addAuditLog({
        table_name: CONTRACTS_COLLECTION,
        record_id: recordId,
        action: actionType,
        old_data: actionType === "UPDATE" ? { id: data.id } : null,
        new_data: contractData,
        actor: "管理者"
      });
    };

    await Promise.race([
      upsertPromise(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (15s)")), 15000)
      )
    ]);

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/contracts");

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting contract in Firestore:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteContract(contractId: string) {
  try {
    const docRef = doc(db, CONTRACTS_COLLECTION, contractId);
    const snapshot = await getDoc(docRef);
    const oldData = snapshot.exists() ? snapshot.data() : null;

    await updateDoc(docRef, { deleted: true, updated_at: serverTimestamp() }); // Soft delete
    
    // Audit Log
    await addAuditLog({
      table_name: CONTRACTS_COLLECTION,
      record_id: contractId,
      action: "DELETE",
      old_data: oldData,
      new_data: { deleted: true },
      actor: "管理者"
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/contracts");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting contract from Firestore:", error);
    return { success: false, error: error.message };
  }
}
