"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const STORE_TARGETS_COLLECTION = "monthly_store_targets";

export type StoreTarget = {
  id: string; // YYYY-MM_storeName
  store_name: string;
  month: string; // YYYY-MM
  target: number;
};

export async function getStoreTargets(month: string): Promise<StoreTarget[]> {
  try {
    const colRef = collection(db, STORE_TARGETS_COLLECTION);
    const q = query(colRef, where("month", "==", month));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
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
    const id = `${month}_${storeName}`;
    const docRef = doc(db, STORE_TARGETS_COLLECTION, id);
    await setDoc(docRef, {
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
