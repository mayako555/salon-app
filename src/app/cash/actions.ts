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
  deleteDoc,
  serverTimestamp
} from "@/lib/firestore-admin-wrapper";
import { revalidatePath } from "next/cache";
import { addAuditLog } from "@/app/audit/actions";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";


export type CashTransactionType = "collection" | "deposit" | "adjustment";
export type CashTransactionStatus = "pending" | "verified";

export type CashTransactionRecord = {
  id?: string;
  store_name: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: CashTransactionType;
  staff_name: string;
  status: CashTransactionStatus;
  note?: string;
  created_at?: string;
  updated_at?: string;
};

const CASH_TRANSACTIONS_COLLECTION = "cash_transactions";

export async function getCashTransactions(year: number, month: number, storeName?: string): Promise<CashTransactionRecord[]> {
  try {
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const colRef = collection(db, CASH_TRANSACTIONS_COLLECTION);
    
    // We fetch everything and filter because we might need to filter by storeName
    const q = query(
      colRef,
      where("date", ">=", `${targetPrefix}-01`),
      where("date", "<=", `${targetPrefix}-31`),
      orderBy("date", "desc")
    );
    
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || null
      } as CashTransactionRecord;
    });

    if (storeName && storeName !== "全店舗") {
      return records.filter(r => r.store_name === storeName);
    }
    return records;
  } catch (error) {
    console.error("Error fetching cash transactions:", error);
    return [];
  }
}

export async function addCashTransaction(data: Omit<CashTransactionRecord, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const colRef = collection(db, CASH_TRANSACTIONS_COLLECTION);
    const docRef = await addTenantOwnedDoc(colRef, {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: CASH_TRANSACTIONS_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: data,
      actor: data.staff_name
    });

    revalidatePath("/staff-portal/cash");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding cash transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function verifyCashTransaction(id: string, staffName: string) {
  try {
    const docRef = doc(db, CASH_TRANSACTIONS_COLLECTION, id);
    await updateTenantOwnedDoc(docRef, {
      status: "verified",
      updated_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: CASH_TRANSACTIONS_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: { status: "pending" },
      new_data: { status: "verified" },
      actor: staffName
    });

    revalidatePath("/staff-portal/cash");
    return { success: true };
  } catch (error: any) {
    console.error("Error verifying cash transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCashTransaction(id: string, staffName: string) {
  try {
    const docRef = doc(db, CASH_TRANSACTIONS_COLLECTION, id);
    await deleteTenantOwnedDoc(docRef);

    await addAuditLog({
      table_name: CASH_TRANSACTIONS_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: null,
      new_data: null,
      actor: staffName
    });

    revalidatePath("/staff-portal/cash");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting cash transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function calculateCurrentCash(storeName: string): Promise<number> {
  if (!storeName || storeName === "全店舗") return 0;
  
  try {
    // 1. Calculate Cash Sales
    // Note: We might need to fetch all sales or a running total.
    // For now, let's fetch all sales that are cash.
    // WARNING: As data grows, this will be slow. A better approach is to keep a running total or use a monthly rollup.
    const { getDocs, query, where, collection } = await import("firebase/firestore");
    const salesQ = query(
      collection(db, "sales"),
      where("store_name", "==", storeName),
      where("payment_method", "==", "現金")
    );
    const salesSnap = await getDocs(salesQ);
    let totalCashIn = 0;
    salesSnap.forEach(doc => {
      const data = doc.data();
      // Sales amount is tech_sales + product_sales - discount.
      // We assume expected_price or sum of these is the cash collected.
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) - (data.discount || 0);
      totalCashIn += amount;
    });

    // 2. Calculate Cash Collections / Deposits
    const transQ = query(
      collection(db, CASH_TRANSACTIONS_COLLECTION),
      where("store_name", "==", storeName)
    );
    const transSnap = await getDocs(transQ);
    let totalCashOut = 0;
    transSnap.forEach(doc => {
      const data = doc.data();
      if (data.type === 'collection' || data.type === 'deposit') {
        // collection or deposit reduces the cash in the register
        totalCashOut += (data.amount || 0);
      } else if (data.type === 'adjustment') {
        // positive adjustment adds to cash, negative removes
        totalCashIn += (data.amount || 0);
      }
    });

    return totalCashIn - totalCashOut;
  } catch (error) {
    console.error("Error calculating current cash:", error);
    return 0;
  }
}
