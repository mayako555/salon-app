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
    
    // インデックスエラーを避けるため、一旦全件取得（データ量が少ないマスタではこの方が安全）
    const snapshot = await getDocs(colRef);
    let items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Timestampオブジェクトをミリ秒に変換してプレーンなオブジェクトにする
        created_at: data.created_at?.toMillis?.() || data.created_at || null,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at || null,
      };
    }) as SalesMasterItem[];

    // 店舗フィルタ（特定店舗 + 共通）
    if (store && store !== "all") {
      items = items.filter(item => item.store === store || item.store === "共通");
    }

    // メモリ上で並べ替え（並び順、店舗、アイテムタイプ、名前の順）
    return items.sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      if (a.store !== b.store) return a.store.localeCompare(b.store);
      if (a.itemType !== b.itemType) return a.itemType.localeCompare(b.itemType);
      return a.name.localeCompare(b.name);
    });
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
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : 999,
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
}export async function updateMasterItemOrder(id: string, newOrder: number) {
  try {
    await Promise.race([
      setDoc(doc(db, MASTER_COLLECTION, id), { sortOrder: newOrder }, { merge: true }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (10s)")), 10000)
      )
    ]);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating order:", error);
    return { success: false, error: error.message };
  }
}
