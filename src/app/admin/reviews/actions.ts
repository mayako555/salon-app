"use server";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { addAuditLog } from "@/app/audit/actions";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc } from "@/lib/tenant-ownership";


export type ReviewRecord = {
  id?: string;
  store_name: string;
  reviewer_name: string;
  rating: number; // 1-5
  post_date: string; // YYYY-MM-DD
  visit_date?: string; // YYYY-MM-DD
  coupon_menu?: string;
  review_text: string;
  reply_text?: string;
  staff_name?: string; // 抽出されたスタッフ名
  created_at?: string;
};

const REVIEWS_COLLECTION = "reviews";

export async function importReviewsFromSalonBoard(reviews: ReviewRecord[]) {
  try {
    const batch = writeBatch(db);
    let count = 0;
    
    // For duplicate check, let's fetch recent reviews for the stores
    // Simplification: assume if post_date, reviewer_name, and rating match, it's a duplicate
    const q = query(collection(db, REVIEWS_COLLECTION)); // Ideally bounded by date
    const snapshot = await getDocs(q);
    const existingReviews = snapshot.docs.map(d => d.data() as ReviewRecord);
    
    for (const r of reviews) {
      // Check if duplicate
      const isDuplicate = existingReviews.some(e => 
        e.store_name === r.store_name && 
        e.reviewer_name === r.reviewer_name && 
        e.post_date === r.post_date
      );
      
      if (!isDuplicate) {
        const docRef = doc(collection(db, REVIEWS_COLLECTION));
        batch.set(docRef, {
          ...r,
          created_at: serverTimestamp()
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      await addAuditLog({
        table_name: REVIEWS_COLLECTION,
        record_id: "batch-import",
        action: "INSERT",
        old_data: null,
        new_data: { imported_count: count },
        actor: "Admin"
      });
    }

    return { success: true, count };
  } catch (err: any) {
    console.error("Error importing reviews:", err);
    return { success: false, error: err.message };
  }
}

export async function getMonthlyReviews(year: number, month: number, storeName?: string) {
  try {
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const colRef = collection(db, REVIEWS_COLLECTION);
    const snapshot = await getDocs(colRef);
    
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as ReviewRecord;
    }).filter(r => r.post_date.startsWith(targetPrefix));
    
    if (storeName) {
      return records.filter(r => r.store_name === storeName);
    }
    return records;
  } catch (err: any) {
    console.error("Error fetching reviews:", err);
    return [];
  }
}

export async function deleteReviewAction(id: string) {
  try {
    const docRef = doc(db, REVIEWS_COLLECTION, id);
    const { deleteDoc } = await import("firebase/firestore");
    await deleteTenantOwnedDoc(docRef);
    await addAuditLog({
      table_name: REVIEWS_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: { id },
      new_data: null,
      actor: "Admin"
    });
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting review:", err);
    return { success: false, error: err.message };
  }
}
