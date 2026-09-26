"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { doc, collection, query, where, getDocUnfiltered, getDocsUnfiltered, serverTimestamp } from "@/lib/firestore-admin-wrapper";
import { updateTenantOwnedDoc } from "@/lib/tenant-ownership";
import { getCurrentUserContext } from "@/lib/auth-server";
import { requireCompanyId } from "@/lib/authorization";
import { normalizeMonthlyFee, normalizeSubscriptionStatus } from "@/lib/tenant-subscription";

const BILLINGS_COLLECTION = "tenant_billings";
const COMPANIES_COLLECTION = "companies";

async function getCurrentCompanyId() {
  return requireCompanyId(await getCurrentUserContext());
}

export async function getTenantContractInfo() {
  try {
    const companyId = await getCurrentCompanyId();
    const snap = await getDocUnfiltered(doc(db, COMPANIES_COLLECTION, companyId));
    if (!snap.exists()) return { success: false, error: "契約情報が見つかりません" };
    const data = snap.data();
    return {
      success: true,
      contract: {
        id: snap.id,
        ...data,
        fee: normalizeMonthlyFee(data.fee),
        subscriptionStatus: normalizeSubscriptionStatus(data.subscriptionStatus),
      },
    };
  } catch (error: any) {
    console.error("Error fetching tenant contract:", error);
    return { success: false, error: error.message || "契約情報の取得に失敗しました" };
  }
}

export async function getTenantBillings() {
  try {
    const companyId = await getCurrentCompanyId();
    const colRef = collection(db, BILLINGS_COLLECTION);
    const q = query(colRef, where("companyId", "==", companyId));
    const snap = await getDocsUnfiltered(q);
    const billings = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => String(b.billingMonth || "").localeCompare(String(a.billingMonth || "")));
    return { success: true, billings };
  } catch (error: any) {
    console.error("Error fetching billings:", error);
    return { success: false, error: error.message || "請求履歴の取得に失敗しました" };
  }
}

export async function reportPayment(billingId: string) {
  try {
    const normalizedId = billingId.trim();
    if (!normalizedId || normalizedId.includes("/")) throw new Error("請求IDが不正です");

    const companyId = await getCurrentCompanyId();
    const docRef = doc(db, BILLINGS_COLLECTION, normalizedId);
    const snap = await getDocUnfiltered(docRef);
    if (!snap.exists()) throw new Error("請求データが見つかりません");

    const billing = snap.data();
    if (billing.companyId !== companyId) throw new Error("この請求を更新する権限がありません");
    if (billing.status !== "請求済") throw new Error("この請求は入金報告できる状態ではありません");

    await updateTenantOwnedDoc(docRef, {
      status: "入金確認待ち",
      paymentReportedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error reporting payment:", error);
    return { success: false, error: error.message };
  }
}
