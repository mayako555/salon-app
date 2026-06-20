"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const BILLINGS_COLLECTION = "tenant_billings";
const COMPANIES_COLLECTION = "companies";

export async function getAllBillings() {
  try {
    const billingsSnap = await getDocs(query(collection(db, BILLINGS_COLLECTION)));
    const billings = billingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    const companiesSnap = await getDocs(collection(db, COMPANIES_COLLECTION));
    const companies = companiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    // Attach company name to billings
    const enriched = billings.map(b => {
      const company = companies.find(c => c.id === b.companyId);
      return {
        ...b,
        companyName: company?.name || "不明なテナント",
        companyPlan: company?.plan || "不明"
      };
    }).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
    
    return { success: true, billings: enriched, companies };
  } catch (error: any) {
    console.error("Error fetching billings:", error);
    return { success: false, error: error.message };
  }
}

export async function createBilling(data: { companyId: string, billingMonth: string, billingType: string, amount: number }) {
  try {
    await addDoc(collection(db, BILLINGS_COLLECTION), {
      ...data,
      status: "請求済",
      issueDate: new Date().toISOString().split('T')[0],
      timestamp: serverTimestamp()
    });
    revalidatePath("/admin/master/system/billing");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating billing:", error);
    return { success: false, error: error.message };
  }
}

export async function confirmPayment(billingId: string) {
  try {
    const docRef = doc(db, BILLINGS_COLLECTION, billingId);
    await updateDoc(docRef, {
      status: "支払済",
      paidDate: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp()
    });
    revalidatePath("/admin/master/system/billing");
    return { success: true };
  } catch (error: any) {
    console.error("Error confirming payment:", error);
    return { success: false, error: error.message };
  }
}
