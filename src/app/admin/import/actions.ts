"use server";

import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export async function importCustomersFromSalonBoard(customers: any[]) {
  try {
    const batch = writeBatch(db);
    const colRef = collection(db, "customers");

    customers.forEach((c) => {
      const newDocRef = doc(colRef);
      
      // Parse name into last/first if possible (space separated)
      const kanjiParts = (c.name || "").split(/\s+/);
      const kanaParts = (c.name_kana || "").split(/\s+/);

      batch.set(newDocRef, {
        name: c.name,
        last_name: kanjiParts[0] || "",
        first_name: kanjiParts.slice(1).join(" ") || "",
        name_kana: c.name_kana,
        last_name_kana: kanaParts[0] || "",
        first_name_kana: kanaParts.slice(1).join(" ") || "",
        customer_no: c.customer_no || "",
        gender: c.gender === "男性" ? "male" : "female",
        occupation: c.occupation !== "-" ? c.occupation : "",
        visit_count: parseInt(c.visit_count) || 0,
        last_visit_date: c.last_visit_date !== "-" ? c.last_visit_date : null,
        phone: "", // Missing from list view
        allergies: [],
        has_allergy: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        notes: "SalonBoardからインポートされました"
      });
    });

    await batch.commit();
    revalidatePath("/staff-portal/customers");
    return { success: true, count: customers.length };
  } catch (error: any) {
    console.error("Import Error:", error);
    return { success: false, error: error.message };
  }
}
