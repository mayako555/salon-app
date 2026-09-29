import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { UserContext } from "@/lib/authorization";

export async function requireLineStore(context: UserContext, storeName: string) {
  if (!context.companyId || !context.uid || context.role === "guest" || context.role === "accountant") throw new Error("権限がありません");
  const stores = await adminDb.collection("sales_master").where("companyId", "==", context.companyId).where("itemType", "==", "store").get();
  const store = stores.docs.find((d: { id: string; data(): Record<string, unknown> }) => d.data().name === storeName && d.data().isActive !== false);
  if (!store) throw new Error("店舗を確認できません");
  if (!["systemOwner", "companyOwner", "admin"].includes(context.role) && !context.salonIds.includes(store.id) && !context.salonIds.includes(storeName)) throw new Error("店舗の権限がありません");
  return store;
}
