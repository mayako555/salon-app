"use server";
import type { DocumentReference } from "firebase-admin/firestore";
import { verifyLineIdentity } from "@/lib/line-identity";
import { randomBytes } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUserContext } from "@/lib/auth-server";
import { requireFeature } from "@/lib/feature-utils";
import { requireLineStore } from "@/lib/line-store-access";
import { readLineLink, signLineLink, verifyLineLink, assertLinkCustomer } from "@/lib/line-link-token";

const LINK_ERROR = "連携用QRが無効、または期限切れです。スタッフに再発行を依頼してください。";
async function configFor(companyId: string, storeName: string) {
  const snapshot = await adminDb.collection("line_integrations").where("companyId", "==", companyId).where("storeName", "==", storeName).limit(1).get();
  const config = snapshot.docs[0]?.data();
  if (!config?.channelAccessToken || !config?.lineOaId || !/^\d+-[A-Za-z0-9]+$/.test(config?.liffId || "")) throw new Error(LINK_ERROR);
  return config;
}
async function linkContext(token: string) {
  const untrusted = readLineLink(token);
  const config = await configFor(untrusted.companyId, untrusted.storeName);
  const payload = verifyLineLink(token, config.channelAccessToken);
  await requireFeature(payload.companyId, "line_automation");
  const customerRef = adminDb.collection("customers").doc(payload.customerId) as DocumentReference;
  const customer = await customerRef.get();
  if (!customer.exists) throw new Error(LINK_ERROR);
  assertLinkCustomer(payload, customer.data() || {});
  return { config, payload, customerRef };
}
export async function createCustomerLineLink(customerId: string, storeName: string) {
  try {
    const ctx = await getCurrentUserContext();
    await requireLineStore(ctx, storeName);
    await requireFeature(ctx.companyId!, "line_automation");
    if (typeof customerId !== "string" || !customerId || customerId.includes("/")) throw new Error(LINK_ERROR);
    const ref = adminDb.collection("customers").doc(customerId) as DocumentReference;
    const config = await configFor(ctx.companyId!, storeName);
    const payload = { companyId: ctx.companyId!, customerId, storeName, nonce: randomBytes(24).toString("hex"), expiresAt: Date.now() + 15 * 60_000 };
    await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (!data || data.companyId !== ctx.companyId || (data.store_name && data.store_name !== storeName)) throw new Error(LINK_ERROR);
      tx.update(ref, { line_link_nonce: payload.nonce });
    });
    const token = signLineLink(payload, config.channelAccessToken);
    return { success: true as const, expiresAt: payload.expiresAt, url: `https://liff.line.me/${encodeURIComponent(config.liffId)}?token=${encodeURIComponent(token)}` };
  } catch {
    return { success: false as const, error: "QRを発行できません。顧客の所属店舗・LINE設定・店舗権限をご確認ください。" };
  }
}
export async function getCustomerLineLinkInfo(token: string) {
  try {
    const { config, payload } = await linkContext(token);
    return { success: true as const, liffId: config.liffId as string, lineOaId: config.lineOaId as string, storeName: payload.storeName };
  } catch { return { success: false as const, error: LINK_ERROR }; }
}
export async function completeCustomerLineLink(token: string, accessToken: string) {
  try {
    if (typeof accessToken !== "string" || !accessToken || accessToken.length > 4096) throw new Error(LINK_ERROR);
    const { config, payload, customerRef } = await linkContext(token);
    const userId = await verifyLineIdentity(accessToken, config.liffId);
    await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
      const snap = await tx.get(customerRef);
      const data = snap.data();
      if (!data || payload.expiresAt <= Date.now()) throw new Error(LINK_ERROR);
      assertLinkCustomer(payload, data);
      if (data.line_user_id && data.line_user_id !== userId) throw new Error(LINK_ERROR);
      tx.update(customerRef, { line_user_id: userId, line_link_nonce: null, updated_at: new Date() });
    });
    return { success: true as const };
  } catch { return { success: false as const, error: "連携できませんでした。LINEのログイン状態を確認し、スタッフにQRの再発行を依頼してください。" }; }
}
