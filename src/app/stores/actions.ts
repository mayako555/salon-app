"use server";
import { setTenantOwnedDoc } from "@/lib/tenant-ownership";

import { db } from "@/lib/firestore-admin-wrapper";
import { 
  doc, 
  serverTimestamp 
} from "@/lib/firestore-admin-wrapper";
import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getCompanyScopedCollection } from "@/lib/tenant-utils";
import { requireCompanyId } from "@/lib/authorization";

const STORE_TARGETS_COLLECTION = "monthly_store_targets";

export type StoreTarget = {
  id: string; // YYYY-MM_storeName
  store_name: string;
  month: string; // YYYY-MM
  target: number;
};

export async function getStoreTargets(month: string): Promise<StoreTarget[]> {
  try {
    const ctx = await getCurrentUserContext();
    const snapshot = await getCompanyScopedCollection(STORE_TARGETS_COLLECTION, ctx)
      .where("month", "==", month)
      .get();
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        store_name: data.store_name,
        month: data.month,
        target: data.target
      };
    }) as StoreTarget[];
  } catch (error) {
    console.error("Error fetching store targets:", error);
    return [];
  }
}

export async function updateStoreTarget(storeName: string, month: string, target: number) {
  try {
    const ctx = await getCurrentUserContext();
    const companyId = requireCompanyId(ctx);
    const id = `${companyId}_${month}_${storeName}`;
    const docRef = doc(db, STORE_TARGETS_COLLECTION, id);
    await setTenantOwnedDoc(docRef, {
      store_name: storeName,
      month,
      target,
      updated_at: serverTimestamp()
    }, { merge: true });
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
