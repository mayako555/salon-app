"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  increment,
  Timestamp,
  limit
} from "firebase/firestore";
import { addNotification } from "@/lib/notifications";

import { getCurrentUserContext, verifyPermission } from "@/lib/auth-server";

export async function getAvailableStores() {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "systemOwner") {
      // システム管理者は全社・全店舗見れる（今回は固定の3店舗を仮置きか、Companyマスタから引くべきだが、一旦既存のリストをベースに拡張）
      return ["メイン店舗"];
    }
    // companyOwner や manager, staff の場合は自分が所属する salonIds を返す
    // salonIds に直接店舗名が入っている想定（既存の運用ベース）
    if (ctx.salonIds && ctx.salonIds.length > 0) {
      return ctx.salonIds;
    }
    return ["メイン店舗"]; // フォールバック
  } catch (err) {
    return ["メイン店舗"];
  }
}

export async function getInventory(storeName: string) {
  const ctx = await getCurrentUserContext();
  const colRef = collection(db, "inventory");
  const q = query(
    colRef, 
    where("storeName", "==", storeName),
    where("companyId", "==", ctx.companyId),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getInventoryLogs(storeName: string) {
  const ctx = await getCurrentUserContext();
  const colRef = collection(db, "inventory_logs");
  const q = query(
    colRef, 
    where("storeName", "==", storeName), 
    where("companyId", "==", ctx.companyId),
    orderBy("date", "desc"), 
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ 
    id: d.id, 
    ...d.data(),
    date: (d.data().date as Timestamp).toDate()
  }));
}

export async function updateStock(itemId: string, count: number, type: string, staffName: string) {
  try {
    const ctx = await getCurrentUserContext();
    const itemRef = doc(db, "inventory", itemId);
    const itemSnap = await getDocs(query(collection(db, "inventory"), where("__name__", "==", itemId)));
    const itemData = itemSnap.docs[0].data();

    if (itemData.companyId && itemData.companyId !== ctx.companyId && ctx.role !== "systemOwner") {
      throw new Error("権限がありません");
    }

    const batch = writeBatch(db);
    batch.update(itemRef, {
      currentStock: increment(count),
      lastUpdated: serverTimestamp()
    });

    const logRef = doc(collection(db, "inventory_logs"));
    batch.set(logRef, {
      itemId,
      itemName: itemData.name,
      count,
      type,
      staffName,
      date: serverTimestamp(),
      storeName: itemData.storeName,
      companyId: itemData.companyId || ctx.companyId
    });

    await batch.commit();

    if (itemData.currentStock + count <= itemData.threshold) {
      await addNotification({
        title: "在庫不足のアラート",
        message: `${itemData.name} の在庫が少なくなっています（現在: ${itemData.currentStock + count}）。`,
        type: "inventory_alert",
        priority: "high",
        targetRole: "admin",
        targetStore: itemData.storeName,
        link: "/inventory"
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getInventoryOrders(storeName: string) {
  const ctx = await getCurrentUserContext();
  const q = query(
    collection(db, "inventory_orders"), 
    where("storeName", "==", storeName), 
    where("companyId", "==", ctx.companyId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp).toDate()
  }));
}

export async function requestOrder(itemId: string, count: number, staffName: string) {
  try {
    const ctx = await getCurrentUserContext();
    const itemSnap = await getDocs(query(collection(db, "inventory"), where("__name__", "==", itemId)));
    const itemData = itemSnap.docs[0].data();

    if (itemData.companyId && itemData.companyId !== ctx.companyId && ctx.role !== "systemOwner") {
      throw new Error("権限がありません");
    }

    await addDoc(collection(db, "inventory_orders"), {
      itemId,
      itemName: itemData.name,
      count,
      staffName,
      status: "pending",
      createdAt: serverTimestamp(),
      storeName: itemData.storeName,
      companyId: itemData.companyId || ctx.companyId
    });

    await addNotification({
      title: "発注申請が届きました",
      message: `${staffName}さんから ${itemData.name} (${count}個) の申請がありました。`,
      type: "order_request",
      priority: "medium",
      targetRole: "admin",
      targetStore: itemData.storeName,
      link: "/inventory"
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(orderId: string, status: string, staffName: string) {
  try {
    const orderRef = doc(db, "inventory_orders", orderId);
    const orderSnap = await getDocs(query(collection(db, "inventory_orders"), where("__name__", "==", orderId)));
    const orderData = orderSnap.docs[0].data();
    
    await updateDoc(orderRef, { 
      status, 
      updatedAt: serverTimestamp(),
      updatedBy: staffName 
    });

    if (status === "received") {
      await updateStock(orderData.itemId, orderData.count, "restock", staffName);
    }

    await addNotification({
      title: status === "ordered" ? "発注が完了しました" : "商品が入荷しました",
      message: `${orderData.itemName} が ${status === "ordered" ? "発注済み" : "入荷済"} になりました。`,
      type: "order_update",
      priority: "medium",
      targetRole: "staff",
      targetStore: orderData.storeName,
      link: "/staff-portal/inventory"
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncInventoryFromSale(sale: any, action: "deduct" | "return") {
  try {
    if (!sale || !sale.store_name) return { success: false };

    const items = [
      ...(sale.menu_course ? sale.menu_course.split(/ \+ |,\s*/) : []),
      ...(sale.options ? sale.options.split(/ \+ |,\s*/) : [])
    ].map(i => i.trim()).filter(Boolean);

    for (const itemName of items) {
      const q = query(
        collection(db, "inventory"),
        where("storeName", "==", sale.store_name),
        where("name", "==", itemName)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const invItem = snap.docs[0];
        const qty = action === "deduct" ? -1 : 1;
        await updateStock(invItem.id, qty, action === "deduct" ? "sale" : "restock", "レジ自動連動");
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error("Inventory sync error:", err);
    return { success: false, error: err.message };
  }
}

export async function bulkRequestOrders(orders: { itemId: string, itemName: string, count: number, storeName: string, companyId?: string }[], staffName: string) {
  try {
    const ctx = await getCurrentUserContext();
    const batch = writeBatch(db);
    const colRef = collection(db, "inventory_orders");
    
    orders.forEach(order => {
      const newDocRef = doc(colRef);
      batch.set(newDocRef, {
        ...order,
        staffName,
        status: "pending",
        createdAt: serverTimestamp(),
        companyId: order.companyId || ctx.companyId
      });
    });
    
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Bulk order error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInventoryItem(itemId: string, data: any) {
  try {
    const ctx = await getCurrentUserContext();
    const docRef = doc(db, "inventory", itemId);
    const snap = await getDocs(query(collection(db, "inventory"), where("__name__", "==", itemId)));
    
    if (!snap.empty && snap.docs[0].data().companyId && snap.docs[0].data().companyId !== ctx.companyId && ctx.role !== "systemOwner") {
      throw new Error("権限がありません");
    }

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Update item error:", error);
    return { success: false, error: error.message };
  }
}

async function seedInventory(storeName: string) {
  const items: any[] = [];

  // 0. フラットラッシュ
  ["J", "C", "CC", "D"].forEach(curl => {
    [8, 9, 10, 11, 12, 13, 14, 15].forEach(len => {
      if (curl === "D" && len < 10) return;
      if (curl === "CC" && len < 9) return;
      items.push({
        name: `カラー剤 ${curl}`, category: "material", subCategory: `${curl}${len}`, currentStock: 5, threshold: 2, unit: "ケース", vendor: "ビューティガレージ", costPrice: 2400, price: 1848
      });
    });
  });

  // 1. LADY COCO
  ["グルー イエロー", "グルー ピンク", "グルー グリーン", "グルー LED", "プライマー"].forEach(name => {
    items.push({
      name, category: "consumable", subCategory: "LADY COCO", currentStock: 5, threshold: 1, unit: "個", vendor: "Ladycoco", costPrice: 4500, price: 3000
    });
  });

  // 2. アスクル
  const askulItems = [
    "ペーパータオル（スタッフ用）", "綿棒（大）", "綿棒（小）", "コットン", "ティッシュ", 
    "クイックルワイパー", "コロコロ", "エタノール", "精製水", "コンタクトケース", 
    "ハンドソープ（泡）", "ボールペン（スタッフ用）", "ボールペンインク（お客様用）", 
    "蛍光ペンインク（黄色）", "蛍光ペンインク（ピンク）", "修正テープ", "スティックのり", 
    "ファブリーズ（空間用）", "ファブリーズ", "ラップ", "スキナゲート"
  ];
  askulItems.forEach(name => {
    items.push({
      name, category: "consumable", subCategory: "備品・日用品", currentStock: 10, threshold: 3, unit: "個", vendor: "アスクル", costPrice: 500, price: 500
    });
  });

  // 3. はまざき
  const hamazakiGeneral = ["コーティング", "パーマグルー", "多能スティック", "マイクロスティック", "スクリューブラシ", "アイシャンプー"];
  hamazakiGeneral.forEach(name => {
    items.push({
      name, category: "consumable", subCategory: "はまざき", currentStock: 10, threshold: 2, unit: "個", vendor: "はまざき", costPrice: 1200, price: 1200
    });
  });

  [0.1, 0.15].forEach(thickness => {
    ["J", "C"].forEach(curl => {
      [6, 7, 8, 9, 10, 11, 12, 13].forEach(len => {
        items.push({
          name: `パーマ液 1剤 ${thickness}`, category: "material", subCategory: `${curl}${len}`, currentStock: 5, threshold: 1, unit: "ケース", vendor: "ビューティガレージ", costPrice: 1500, price: 1848
        });
      });
    });
  });

  ["J", "C", "D"].forEach(curl => {
    [8, 9, 10, 11, 12, 13, 14].forEach(len => {
      items.push({
        name: "パーマ液 2剤", category: "material", subCategory: `${curl}${len}`, currentStock: 3, threshold: 1, unit: "ケース", vendor: "ビューティガレージ", costPrice: 2000, price: 2420
      });
    });
  });

  // 4. ビュプロ
  ["前処理（フーラORビュプロ）", "低刺激グルー（ピンク）", "低刺激グルー（黒）"].forEach(name => {
    items.push({
      name, category: "consumable", subCategory: "ビュプロ", currentStock: 5, threshold: 1, unit: "個", vendor: "ビュプロ", costPrice: 3500, price: 3000
    });
  });

  // 5. フーラ
  ["前処理（フーラORビュプロ）", "パーマラップ", "ホワイトブラシ", "ジェルリムーバー", "カラーボリューム", "cite", "プライマー"].forEach(name => {
    items.push({
      name, category: "consumable", subCategory: "フーラ", currentStock: 5, threshold: 1, unit: "個", vendor: "フーラストア", costPrice: 2500, price: 3000
    });
  });

  // 6. BIJOUBEAU
  ["クレンジング（EYELASH LABO）", "リフト剤"].forEach(name => {
    items.push({
      name, category: "product", subCategory: "BIJOUBEAU", currentStock: 10, threshold: 2, unit: "本", vendor: "BIJOUBEAU", costPrice: 1800, price: 3000
    });
  });

  [0.12, 0.15].forEach(thickness => {
    ["J", "C", "D"].forEach(curl => {
      [6, 7, 8, 9, 10, 11, 12, 13, 14].forEach(len => {
        items.push({
          name: `トリートメントA ${thickness}`, category: "material", subCategory: `${curl}${len}`, currentStock: 4, threshold: 1, unit: "ケース", vendor: "MILBON", costPrice: 1800, price: 1848
        });
      });
    });
  });

  // 7. EMEDA
  [0.1, 0.15].forEach(thickness => {
    ["J", "C", "D"].forEach(curl => {
      [8, 9, 10, 11, 12, 13, 14].forEach(len => {
        items.push({
          name: `トリートメントB ${thickness}`, category: "material", subCategory: `${curl}${len}`, currentStock: 5, threshold: 1, unit: "ケース", vendor: "MILBON", costPrice: 2500, price: 1200
        });
      });
    });
  });

  // 8. その他
  const others = ["リルジュ", "リルジュEX", "V3", "V3レフィル", "VM", "V3専用パフ", "デビュースクッションファンデ", "トリートメント", "サージカルテープ（和紙テープ）"];
  others.forEach(name => {
    items.push({
      name, category: "product", subCategory: "その他", currentStock: 8, threshold: 2, unit: "個", vendor: "その他", costPrice: 5000, price: 3000
    });
  });

  const batch = writeBatch(db);
  const colRef = collection(db, "inventory");
  for (const item of items) {
    const newDocRef = doc(colRef);
    batch.set(newDocRef, { ...item, storeName, lastUpdated: serverTimestamp() });
  }
  await batch.commit();
}

export async function resetAndSeedInventory(storeName: string) {
  try {
    const snapshot = await getDocs(query(collection(db, "inventory"), where("storeName", "==", storeName)));
    const deleteBatch = writeBatch(db);
    snapshot.docs.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    await seedInventory(storeName);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
