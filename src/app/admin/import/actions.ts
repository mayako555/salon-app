"use server";

import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export async function importCustomersFromSalonBoard(customers: any[]) {
  try {
    const { getDocs } = await import("firebase/firestore");
    const batch = writeBatch(db);
    const colRef = collection(db, "customers");

    // 重複チェック用に既存の顧客データを取得
    const snapshot = await getDocs(colRef);
    const existingCustomers = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

    let newCount = 0;
    let updateCount = 0;

    customers.forEach((c) => {
      // 顧客番号、または名前が完全一致する既存顧客を探す
      const existing = existingCustomers.find(ex => 
        (c.customer_no && ex.customer_no === c.customer_no) || 
        (c.name && ex.name === c.name)
      );

      if (existing) {
        // 既存顧客が見つかった場合は更新（来店回数や日付を最新にする）
        const docRef = doc(db, "customers", existing.id);
        const newVisitCount = parseInt(c.visit_count) || 0;
        const newLastVisitDate = c.last_visit_date && c.last_visit_date !== "-" ? c.last_visit_date : null;
        
        batch.update(docRef, {
          visit_count: Math.max(existing.visit_count || 0, newVisitCount),
          ...(newLastVisitDate && { last_visit_date: newLastVisitDate }),
          updated_at: serverTimestamp()
        });
        updateCount++;
      } else {
        // 新規登録
        const newDocRef = doc(colRef);
        
        // Parse name into last/first if possible (space separated)
        const kanjiParts = (c.name || "").split(/\s+/);
        const kanaParts = (c.name_kana || "").split(/\s+/);

        batch.set(newDocRef, {
          name: c.name || "",
          last_name: kanjiParts[0] || "",
          first_name: kanjiParts.slice(1).join(" ") || "",
          name_kana: c.name_kana || "",
          last_name_kana: kanaParts[0] || "",
          first_name_kana: kanaParts.slice(1).join(" ") || "",
          customer_no: c.customer_no || "",
          is_minimo: c.customer_no ? c.customer_no.toLowerCase().includes("min") : false,
          gender: c.gender === "男性" ? "male" : "female",
          occupation: c.occupation && c.occupation !== "-" ? c.occupation : "",
          visit_count: parseInt(c.visit_count) || 0,
          last_visit_date: c.last_visit_date && c.last_visit_date !== "-" ? c.last_visit_date : null,
          phone: "", // Missing from list view
          allergies: [],
          has_allergy: false,
          main_store: c.main_store || "六甲",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          notes: "SalonBoardからインポートされました"
        });
        newCount++;
      }
    });

    await batch.commit();
    revalidatePath("/staff-portal/customers");
    return { success: true, count: newCount, updateCount };
  } catch (error: any) {
    console.error("Import Error:", error);
    return { success: false, error: error.message };
  }
}
