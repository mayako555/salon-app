"use server";

import { db } from "@/lib/firestore-admin-wrapper";
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
  deleteDoc,
  writeBatch
} from "@/lib/firestore-admin-wrapper";
import { SalesMasterItem } from "@/types/master";
import { getCurrentUserContext } from "@/lib/auth-server";
import { addAuditLog } from "../audit/actions";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc, setTenantOwnedDoc } from "@/lib/tenant-ownership";


const MASTER_COLLECTION = "sales_master";

export async function getMasterItems(store?: string): Promise<SalesMasterItem[]> {
  try {
    const ctx = await getCurrentUserContext();
    const colRef = collection(db, MASTER_COLLECTION);
    
    // Instead of getting all docs, we query by companyId.
    // If we can't query by companyId due to missing indexes, we get all and filter in memory,
    // but querying is much better. Let's assume companyId is added. If not, we filter in memory.
    const snapshot = await getDocs(colRef);
    let items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at || null,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at || null,
      };
    }) as (SalesMasterItem & { companyId?: string })[];

    // --- SaaS Security: Enforce companyId isolation ---
    let effectiveCompanyId = ctx.companyId;
    if (!effectiveCompanyId) {
      if (ctx.role === "systemOwner") {
        effectiveCompanyId = "default";
      } else {
        throw new Error("会社IDが指定されていません");
      }
    }

    items = items.filter(item => item.companyId === effectiveCompanyId);

    if (store && store !== "all") {
      items = items.filter(item => item.store === store || item.store === "共通");
    }

    return items.sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      if (a.store !== b.store) return (a.store || "").localeCompare(b.store || "");
      if (a.itemType !== b.itemType) return (a.itemType || "").localeCompare(b.itemType || "");
      return (a.name || "").localeCompare(b.name || "");
    });
  } catch (error: any) {
    console.error("Error fetching master items:", error);
    return [];
  }
}

export async function upsertMasterItem(data: Partial<SalesMasterItem>) {
  try {
    const ctx = await getCurrentUserContext();
    let effectiveCompanyId = ctx.companyId;
    if (!effectiveCompanyId) {
      if (ctx.role === "systemOwner") {
        effectiveCompanyId = (data as any).companyId || "default";
      } else {
        throw new Error("会社IDが指定されていません");
      }
    }
    const colRef = collection(db, MASTER_COLLECTION);
    
    const payload = {
      companyId: effectiveCompanyId, // Force the injected companyId
      store: data.itemType === 'store' ? data.name : data.store,
      itemType: data.itemType,
      category: data.category || "",
      name: data.name,
      price: Number(data.price) || 0,
      duration: data.duration || "",
      hpbName: data.hpbName || "",
      restrictions: data.restrictions || "",
      notes: data.notes || "",
      imageUrl: data.imageUrl || "",
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : 999,
      trackInventory: !!data.trackInventory,
      staffAssignable: !!data.staffAssignable,
      equipmentAssignable: !!data.equipmentAssignable,
      openTime: data.openTime || "",
      closeTime: data.closeTime || "",
      lineOaId: data.lineOaId || "",
      liffId: data.liffId || "",
      updated_at: serverTimestamp()
    };

    let actionType: "INSERT" | "UPDATE" = "INSERT";
    let recordId = "";

    const upsertPromise = async () => {
      if (data.id) {
        actionType = "UPDATE";
        recordId = data.id;
        const docRef = doc(db, MASTER_COLLECTION, data.id);
        await setTenantOwnedDoc(docRef, payload, { merge: true });
      } else {
        actionType = "INSERT";
        const docRef = await addTenantOwnedDoc(colRef, {
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

      // --- Inventory Sync Trigger ---
      if (payload.trackInventory && payload.store !== "共通") {
        const invQ = query(
          collection(db, "inventory"),
          where("storeName", "==", payload.store),
          where("name", "==", payload.name)
        );
        const invSnap = await getDocs(invQ);
        if (invSnap.empty) {
          await addTenantOwnedDoc(collection(db, "inventory"), {
            name: payload.name,
            storeName: payload.store,
            category: payload.itemType === "product" ? "product" : "material",
            subCategory: payload.category,
            currentStock: 0,
            threshold: 3,
            unit: payload.itemType === "product" ? "本" : "ケース",
            lastUpdated: serverTimestamp()
          });
        }
      }
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
      deleteTenantOwnedDoc(doc(db, MASTER_COLLECTION, id)),
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
      setTenantOwnedDoc(doc(db, MASTER_COLLECTION, id), { isActive: active }, { merge: true }),
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

export async function updateMasterItemOrder(id: string, newOrder: number) {
  try {
    await Promise.race([
      setTenantOwnedDoc(doc(db, MASTER_COLLECTION, id), { sortOrder: newOrder }, { merge: true }),
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

export async function updateMasterItemOrders(updates: { id: string, sortOrder: number }[]) {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(update => {
      const docRef = doc(db, MASTER_COLLECTION, update.id);
      batch.set(docRef, { sortOrder: update.sortOrder }, { merge: true });
    });
    
    await Promise.race([
      batch.commit(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (10s)")), 10000)
      )
    ]);

    // Optional: Audit log for batch order update
    await addAuditLog({
      table_name: MASTER_COLLECTION,
      record_id: "batch_update",
      action: "UPDATE",
      old_data: null,
      new_data: { type: "batch_sort_order", count: updates.length },
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating batch orders:", error);
    return { success: false, error: error.message };
  }
}

export async function duplicateMasterItem(id: string) {
  try {
    const colRef = collection(db, MASTER_COLLECTION);
    const docRef = doc(db, MASTER_COLLECTION, id);
    const snap = await getDocs(query(colRef, where("__name__", "==", id)));
    
    if (snap.empty) return { success: false, error: "Item not found" };
    
    const data = snap.docs[0].data();
    const { id: _, created_at: __, updated_at: ___, ...rest } = data;
    
    const newPayload = {
      ...rest,
      name: `${rest.name} (コピー)`,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    const res = await addTenantOwnedDoc(colRef, newPayload);
    
    await addAuditLog({
      table_name: MASTER_COLLECTION,
      record_id: res.id,
      action: "INSERT",
      old_data: { duplicatedFrom: id },
      new_data: newPayload,
      actor: "管理者"
    });

    return { success: true, id: res.id };
  } catch (error: any) {
    console.error("Error duplicating master item:", error);
    return { success: false, error: error.message };
  }
}
