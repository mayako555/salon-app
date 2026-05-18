"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  doc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { StaffEvaluation } from "./constants";
import { addAuditLog } from "@/app/audit/actions";
import { revalidatePath } from "next/cache";
import { getContractsList } from "@/app/contracts/actions";
import { getMonthlySales } from "@/app/sales/actions";
import { getStaffList } from "@/app/staff/actions";
import { getMonthlyReviews } from "@/app/admin/reviews/actions";

const EVALUATIONS_COLLECTION = "staff_evaluations";

export async function getStaffEvaluations(staffId?: string): Promise<StaffEvaluation[]> {
  try {
    const colRef = collection(db, EVALUATIONS_COLLECTION);
    let q = query(colRef, orderBy("evaluation_date", "desc"));
    
    if (staffId) {
      q = query(colRef, where("staff_id", "==", staffId), orderBy("evaluation_date", "desc"));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          created_at: data.created_at?.toDate?.()?.toISOString() || null,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || null,
        } as StaffEvaluation;
      })
      .filter(e => (e as any).deleted !== true); // Filter in-memory to handle legacy records missing the field
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return [];
  }
}

export async function upsertEvaluation(data: Partial<StaffEvaluation>) {
  try {
    const colRef = collection(db, EVALUATIONS_COLLECTION);
    
    // Remove the ID from the payload to avoid nesting it in Firestore
    const { id, ...cleanData } = data;
    
    const payload = {
      ...cleanData,
      updated_at: serverTimestamp(),
      evaluation_date: data.evaluation_date || new Date().toISOString().split('T')[0]
    };

    let recordId = "";
    if (id) {
      recordId = id;
      const docRef = doc(db, EVALUATIONS_COLLECTION, id);
      await setDoc(docRef, payload, { merge: true });
    } else {
      const docRef = await addDoc(colRef, {
        ...payload,
        created_at: serverTimestamp()
      });
      recordId = docRef.id;
    }

    await addAuditLog({
      table_name: EVALUATIONS_COLLECTION,
      record_id: recordId,
      action: id ? "UPDATE" : "INSERT",
      old_data: id ? { id } : null,
      new_data: payload,
      actor: "管理者"
    });

    revalidatePath("/evaluations");
    revalidatePath("/staff");
    revalidatePath("/dashboard");

    return { success: true, id: recordId };
  } catch (error: any) {
    console.error("Error upserting evaluation:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEvaluation(evaluationId: string) {
  try {
    const docRef = doc(db, EVALUATIONS_COLLECTION, evaluationId);
    await updateDoc(docRef, { 
      deleted: true, 
      updated_at: serverTimestamp() 
    });
    
    revalidatePath("/evaluations");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting evaluation:", error);
    return { success: false, error: error.message };
  }
}

export async function getEvaluationReminders(targetPeriod: string) {
  try {
    const evaluations = await getStaffEvaluations();
    const contracts = await getContractsList();
    
    // Get unique active staff IDs from contracts
    const staffIds = Array.from(new Set(contracts.map(c => c.staff_id)));
    const evaluatedStaffIds = new Set(
      evaluations
        .filter(e => e.target_period === targetPeriod && e.status === "completed")
        .map(e => e.staff_id)
    );
    
    const pendingStaff = staffIds
      .filter(id => !evaluatedStaffIds.has(id))
      .map(id => {
        const c = contracts.find(x => x.staff_id === id);
        return {
          id,
          name: c?.staff_name || "不明"
        };
      });
      
    return pendingStaff;
  } catch (error) {
    console.error("Error getting evaluation reminders:", error);
    return [];
  }
}

export async function getEvaluationMetrics(staffId: string, targetPeriod: string) {
  try {
    const year = parseInt(targetPeriod.substring(0, 4));
    const quarter = parseInt(targetPeriod.substring(5, 6));
    const startMonth = (quarter - 1) * 3 + 1;
    
    let allSales: any[] = [];
    for (let m = 0; m < 3; m++) {
      const monthSales = await getMonthlySales(year, startMonth + m);
      allSales = [...allSales, ...monthSales];
    }

    const staffSales = allSales.filter(s => s.staff_id === staffId);
    const count = staffSales.length || 1;
    const totalTech = staffSales.reduce((sum, s) => sum + (s.tech_sales || 0), 0);
    const totalProd = staffSales.reduce((sum, s) => sum + (s.product_sales || 0), 0);
    
    const unitPrice = Math.round((totalTech + totalProd) / count);
    const nominations = staffSales.filter(s => s.is_nominated).length;
    const nominationRate = Math.round((nominations / count) * 100);
    const repeats = staffSales.filter(s => s.customer_type === "リピ").length;
    const repeatRate = Math.round((repeats / count) * 100);

    // Rework Logic: attribute rework to the PREVIOUS staff member
    let reworkPenaltyCount = 0;
    const reworksInPeriod = allSales.filter(s => 
      s.menu_course?.includes("お直し") || s.discount_reason?.includes("お直し")
    );

    for (const rw of reworksInPeriod) {
      if (!rw.customer_id) continue;
      const prevVisits = allSales.filter(s => 
        s.customer_id === rw.customer_id && s.date < rw.date
      ).sort((a, b) => b.date.localeCompare(a.date));
      
      if (prevVisits.length > 0 && prevVisits[0].staff_id === staffId) {
        reworkPenaltyCount++;
      }
    }

    // Review Reply Logic: attribute reply count to the staff member by name
    let totalReviewsCount = 0;
    let star5ReviewsCount = 0;
    
    const staffList = await getStaffList();
    const staff = staffList.find(s => s.id === staffId);
    
    if (staff) {
      const staffNameNormal = staff.name.replace(/\s+/g, "");
      const lastName = staff.last_name || "";
      const nameKana = (staff.name_kana || "").replace(/\s+/g, "");
      
      for (let m = 0; m < 3; m++) {
        const monthReviews = await getMonthlyReviews(year, startMonth + m);
        const staffMonthReviews = monthReviews.filter(r => {
          if (r.staff_name === staff.name) return true;
          if (r.reply_text) {
            const kanji = staffNameNormal;
            const kana = nameKana;
            if (kanji && r.reply_text.includes(kanji)) return true;
            if (kana && r.reply_text.includes(kana)) return true;
            if (lastName && r.reply_text.includes(lastName)) return true;
          }
          return false;
        });
        totalReviewsCount += staffMonthReviews.length;
        star5ReviewsCount += staffMonthReviews.filter(r => r.rating === 5).length;
      }
    }
    
    return {
      success: true,
      metrics: {
        total_sales: totalTech,
        product_sales: totalProd,
        unit_price: unitPrice,
        nomination_rate: nominationRate,
        repeat_rate: repeatRate,
        rework_count: reworkPenaltyCount,
        review_replies_count: totalReviewsCount,
        review_allowance: star5ReviewsCount * 500 // 1件500円として計算
      }
    };
  } catch (error: any) {
    console.error("Error getting evaluation metrics:", error);
    return { success: false, error: error.message };
  }
}
