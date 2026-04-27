"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  setDoc,
  doc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { SalesMasterItem } from "./seeds";
import { addAuditLog } from "../audit/actions";

const MASTER_COLLECTION = "sales_master";

export async function getMasterItems(store?: string): Promise<SalesMasterItem[]> {
  try {
    const colRef = collection(db, MASTER_COLLECTION);
    let q;
    if (store && store !== "all") {
      q = query(colRef, where("store", "==", store), orderBy("itemType"), orderBy("name"));
    } else {
      q = query(colRef, orderBy("store"), orderBy("itemType"), orderBy("name"));
    }
    
    const getDocsWithTimeout = Promise.race([
      getDocs(q),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore fetch timed out (10s)")), 10000)
      )
    ]);

    const snapshot = await getDocsWithTimeout as any;
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as SalesMasterItem[];
  } catch (error: any) {
    console.error("Error fetching master items:", error);
    return [];
  }
}

export async function upsertMasterItem(data: Partial<SalesMasterItem>) {
  try {
    const colRef = collection(db, MASTER_COLLECTION);
    
    const payload = {
      store: data.store,
      itemType: data.itemType,
      category: data.category || "",
      name: data.name,
      price: Number(data.price) || 0,
      duration: data.duration || "",
      hpbName: data.hpbName || "",
      restrictions: data.restrictions || "",
      notes: data.notes || "",
      isActive: data.isActive !== undefined ? data.isActive : true,
      staffAssignable: !!data.staffAssignable,
      equipmentAssignable: !!data.equipmentAssignable,
      updated_at: serverTimestamp()
    };

    let actionType: "INSERT" | "UPDATE" = "INSERT";
    let recordId = "";

    const upsertPromise = async () => {
      if (data.id) {
        actionType = "UPDATE";
        recordId = data.id;
        const docRef = doc(db, MASTER_COLLECTION, data.id);
        await setDoc(docRef, payload, { merge: true });
      } else {
        actionType = "INSERT";
        const docRef = await addDoc(colRef, {
          ...payload,
          created_at: serverTimestamp()
        });
        recordId = docRef.id;
      }

      await addAuditLog({
        table_name: MASTER_COLLECTION,
        record_id: recordId,
        action: actionType,
        old_data: actionType === "UPDATE" ? { id: data.id } : null,
        new_data: payload,
        actor: "管理者"
      });
    };

    await Promise.race([
      upsertPromise(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (15s)")), 15000)
      )
    ]);

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting master item:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMasterItem(id: string) {
  try {
    await Promise.race([
      deleteDoc(doc(db, MASTER_COLLECTION, id)),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (10s)")), 10000)
      )
    ]);

    await addAuditLog({
      table_name: MASTER_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: { id },
      new_data: null,
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting master item:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleItemStatus(id: string, active: boolean) {
  try {
    await Promise.race([
      setDoc(doc(db, MASTER_COLLECTION, id), { isActive: active }, { merge: true }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (10s)")), 10000)
      )
    ]);

    await addAuditLog({
      table_name: MASTER_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: { id, isActive: !active },
      new_data: { isActive: active },
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error toggling status:", error);
    return { success: false, error: error.message };
  }
}
