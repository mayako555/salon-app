"use server";

import { db } from "@/lib/firebase";
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc } from "firebase/firestore";

export type SameDayCancellationRecord = {
  id: string;
  customer_id: string;
  reservation_id: string;
  cancel_date: string; // YYYY-MM-DD
  cancel_count: number; // 1, 2, 3...
  cancel_fee_type: string; // '無し', '2000円', '50%', '100%'
  is_karte_recorded: boolean;
  is_line_sent: boolean;
  is_salonboard_updated: boolean;
  is_fee_notified: boolean;
  is_fee_collected_at_visit: boolean;
  memo: string;
  created_at: any;
  updated_at: any;
};

const COLLECTION_NAME = "sameday_cancellations";

export async function getSameDayCancellations(customerId: string): Promise<SameDayCancellationRecord[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("customer_id", "==", customerId), orderBy("cancel_count", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at,
      } as SameDayCancellationRecord;
    });
  } catch (error) {
    console.error("Error fetching cancellations:", error);
    return [];
  }
}

export async function addSameDayCancellation(data: Omit<SameDayCancellationRecord, "id" | "created_at" | "updated_at">) {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(colRef, {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding cancellation:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSameDayCancellation(id: string, data: Partial<SameDayCancellationRecord>) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updated_at: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating cancellation:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSameDayCancellation(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting cancellation:", error);
    return { success: false, error: error.message };
  }
}
