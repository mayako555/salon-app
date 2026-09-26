"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { collection, getDocsUnfiltered, getDocUnfiltered, addDocUnfiltered, updateDocUnfiltered, doc, serverTimestamp, query } from "@/lib/firestore-admin-wrapper";
import { revalidatePath } from "next/cache";
import { requireSystemOwnerContext } from "@/lib/auth-server";
const BILLINGS_COLLECTION = "tenant_billings";
const COMPANIES_COLLECTION = "companies";
const BILLING_TYPES = new Set(["system_fee", "royalty", "fc_fee", "other"]);

export async function getAllBillings() {
  await requireSystemOwnerContext();
  try {
    const billingsSnap = await getDocsUnfiltered(query(collection(db, BILLINGS_COLLECTION)));
    const billings = billingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    const companiesSnap = await getDocsUnfiltered(collection(db, COMPANIES_COLLECTION));
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
  await requireSystemOwnerContext();
  try {
    const companyId = data.companyId.trim();
    if (!companyId || companyId.includes("/")) throw new Error("請求先テナントが不正です");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.billingMonth)) throw new Error("請求月が不正です");
    if (!BILLING_TYPES.has(data.billingType)) throw new Error("請求種別が不正です");
    if (!Number.isSafeInteger(data.amount) || data.amount < 0) throw new Error("請求額は0円以上の整数で入力してください");

    const companySnap = await getDocUnfiltered(doc(db, COMPANIES_COLLECTION, companyId));
    if (!companySnap.exists()) throw new Error("請求先テナントが見つかりません");

    await addDocUnfiltered(collection(db, BILLINGS_COLLECTION), {
      companyId,
      billingMonth: data.billingMonth,
      billingType: data.billingType,
      amount: data.amount,
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
  await requireSystemOwnerContext();
  try {
    const normalizedId = billingId.trim();
    if (!normalizedId || normalizedId.includes("/")) throw new Error("請求IDが不正です");
    const docRef = doc(db, BILLINGS_COLLECTION, normalizedId);
    const snap = await getDocUnfiltered(docRef);
    if (!snap.exists()) throw new Error("請求データが見つかりません");
    await updateDocUnfiltered(docRef, {
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
