"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export async function getTenantContractInfo(companyId: string) {
  try {
    const docRef = doc(db, "companies", companyId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as any;
  } catch (error) {
    console.error("Error fetching tenant contract:", error);
    return null;
  }
}

export async function getTenantBillings(companyId: string) {
  try {
    const colRef = collection(db, "tenant_billings");
    const q = query(colRef, where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
  } catch (error) {
    console.error("Error fetching billings:", error);
    return [];
  }
}

export async function reportPayment(billingId: string) {
  try {
    const docRef = doc(db, "tenant_billings", billingId);
    await updateDoc(docRef, { status: "入金確認待ち" });
    return { success: true };
  } catch (error: any) {
    console.error("Error reporting payment:", error);
    return { success: false, error: error.message };
  }
}
