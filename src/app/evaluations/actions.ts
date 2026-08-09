"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where
} from "firebase/firestore";
import { StaffEvaluation, calculateDynamicScore, EVALUATION_TEMPLATES } from "./shared";
import { 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  format, 
  differenceInDays, 
  isAfter, 
  isBefore, 
  parseISO 
} from "date-fns";
import { revalidatePath } from "next/cache";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";


const EVALUATIONS_COLLECTION = "staff_evaluations";

export async function getEvaluationReminders(quarter: string) {
  try {
    const colRef = collection(db, "staff_profiles");
    const staffSnap = await getDocs(query(colRef, where("isActive", "==", true)));
    const staffList = staffSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

    const evalCol = collection(db, EVALUATIONS_COLLECTION);
    const evalSnap = await getDocs(query(evalCol, where("target_quarter", "==", quarter)));
    const evaluatedStaffIds = new Set(evalSnap.docs.map(doc => doc.data().staff_id));

    return staffList.filter(s => !evaluatedStaffIds.has(s.id));
  } catch (error) {
    console.error("Error fetching evaluation reminders:", error);
    return [];
  }
}
export async function getEvaluationsByStaffId(staffId: string): Promise<StaffEvaluation[]> {
  try {
    const colRef = collection(db, EVALUATIONS_COLLECTION);
    const q = query(colRef, where("staff_id", "==", staffId), orderBy("target_year", "desc"), orderBy("target_quarter", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      };
    }) as StaffEvaluation[];
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return [];
  }
}

export async function getAllEvaluations(): Promise<StaffEvaluation[]> {
  try {
    const colRef = collection(db, EVALUATIONS_COLLECTION);
    const q = query(colRef, orderBy("target_year", "desc"), orderBy("target_quarter", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      };
    }) as StaffEvaluation[];
  } catch (error) {
    console.error("Error fetching all evaluations:", error);
    return [];
  }
}

export async function saveEvaluation(data: Omit<StaffEvaluation, "id" | "created_at" | "updated_at" | "calculated_scores" | "rank" | "auto_scores">) {
  try {
    const template = Object.values(EVALUATION_TEMPLATES).find(t => t.id === data.template_id) || EVALUATION_TEMPLATES.general;
    const { calculated_scores, rank, auto_scores } = calculateDynamicScore(template, data.auto_metrics || {}, data.manager_raw_scores || {});

    const saveData = {
      ...data,
      auto_scores,
      calculated_scores,
      rank,
      snapshot: data.status === "finalized" ? { template } : undefined,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const colRef = collection(db, EVALUATIONS_COLLECTION);
    const docRef = await addTenantOwnedDoc(colRef, saveData);
    
    revalidatePath("/evaluations");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error saving evaluation:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEvaluation(id: string, data: Partial<StaffEvaluation>) {
  try {
    const docRef = doc(db, EVALUATIONS_COLLECTION, id);
    const updateData = { ...data, updated_at: serverTimestamp() };
    
    // Recalculate scores if auto_metrics or manager_raw_scores object is updated
    if (data.auto_metrics || data.manager_raw_scores) {
      // Need current full data to recalculate correctly, so we fetch it first
      const currentSnap = await getDoc(docRef);
      if (currentSnap.exists()) {
        const current = currentSnap.data() as StaffEvaluation;
        const newAutoMetrics = data.auto_metrics || current.auto_metrics || {};
        const newManagerScores = data.manager_raw_scores || current.manager_raw_scores || {};
        
        const template = Object.values(EVALUATION_TEMPLATES).find(t => t.id === current.template_id) || EVALUATION_TEMPLATES.general;
        const { calculated_scores, rank, auto_scores } = calculateDynamicScore(template, newAutoMetrics, newManagerScores);
        updateData.calculated_scores = calculated_scores;
        updateData.rank = rank;
        updateData.auto_scores = auto_scores;
        
        if (updateData.status === "finalized" || (!updateData.status && current.status === "finalized")) {
          updateData.snapshot = { template };
        }
      }
    }

    delete updateData.id;
    delete updateData.created_at;

    await updateTenantOwnedDoc(docRef, updateData);
    
    revalidatePath("/evaluations");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating evaluation:", error);
    return { success: false, error: error.message };
  }
}
export async function deleteEvaluation(id: string) {
  try {
    const docRef = doc(db, EVALUATIONS_COLLECTION, id);
    await deleteTenantOwnedDoc(docRef);
    
    revalidatePath("/evaluations");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting evaluation:", error);
    return { success: false, error: error.message };
  }
}

export async function unfinalizeEvaluation(id: string, reason: string, userId: string, userName: string) {
  try {
    const docRef = doc(db, EVALUATIONS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { success: false, error: "Evaluation not found" };

    const data = snap.data();
    
    await updateTenantOwnedDoc(docRef, {
      status: "pending",
      snapshot: null,
      updated_at: serverTimestamp()
    });

    const auditRef = collection(db, "audit_logs");
    await addTenantOwnedDoc(auditRef, {
      action: "UNFINALIZE_EVALUATION",
      target_id: id,
      staff_id: data.staff_id,
      target_year: data.target_year,
      target_quarter: data.target_quarter,
      reason,
      performed_by_id: userId,
      performed_by_name: userName,
      created_at: serverTimestamp()
    });

    revalidatePath("/evaluations");
    return { success: true };
  } catch (error: any) {
    console.error("Error unfinalizing evaluation:", error);
    return { success: false, error: error.message };
  }
}


export async function getStaffAutoMetrics(staffId: string, targetYear: number, targetQuarter: number, hireDateStr?: string) {
  try {
    // ターゲットの四半期の開始月と終了月を計算する
    // Q1: 1月〜3月, Q2: 4月〜6月, Q3: 7月〜9月, Q4: 10月〜12月
    const startMonthIndex = (targetQuarter - 1) * 3; // 0, 3, 6, 9
    const startOfQuarter = new Date(targetYear, startMonthIndex, 1);
    const endOfQuarter = endOfMonth(new Date(targetYear, startMonthIndex + 2, 1));
    
    const startStr = format(startOfQuarter, "yyyy-MM-dd");
    const endStr = format(endOfQuarter, "yyyy-MM-dd");

    const salesCol = collection(db, "sales");
    const q = query(
      salesCol,
      where("staff_id", "==", staffId),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
    const snapshot = await getDocs(q);

    let total_sales = 0;
    let visitors = 0;
    let nominations = 0;
    let next_bookings = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) + (data.nomination_fee || 0) - (data.discount || 0);
      total_sales += amount;
      visitors++;
      
      if (data.is_nominated || data.nomination_fee > 0) {
        nominations++;
      }
      
      if (data.next_booking_date) {
        next_bookings++;
      }
    });

    const avg_unit_price = visitors > 0 ? Math.round(total_sales / visitors) : 0;
    const next_booking_rate = visitors > 0 ? Math.round((next_bookings / visitors) * 100) : 0;

    // 稼働月数の計算
    let months_present = 3;
    const totalDaysInPeriod = differenceInDays(endOfQuarter, startOfQuarter) + 1;

    if (hireDateStr) {
      const hireDate = parseISO(hireDateStr);
      if (isAfter(hireDate, endOfQuarter)) {
        // 対象期間より後に入社
        months_present = 0;
      } else if (isAfter(hireDate, startOfQuarter)) {
        // 対象期間中に入社
        const daysPresent = differenceInDays(endOfQuarter, hireDate) + 1;
        months_present = (daysPresent / totalDaysInPeriod) * 3;
      }
    }

    const monthly_avg_sales = months_present > 0 ? Math.round(total_sales / months_present) : 0;
    
    // Target ratio (Assuming staff.monthly_sales_target is passed in or we calculate it later. We will return raw and let the client pass it, but wait! The client can calculate it, or we can fetch the staff here.)
    // Wait, getStaffAutoMetrics doesn't receive staff target. Let's fetch it.
    let target = 0;
    try {
      const staffRef = doc(db, "staff_profiles", staffId);
      const staffSnap = await getDoc(staffRef);
      if (staffSnap.exists()) {
        target = staffSnap.data().monthly_sales_target || 0;
      }
    } catch (e) {}

    const sales_target_ratio = target > 0 ? Math.round((monthly_avg_sales / target) * 100) : 0;

    return {
      success: true,
      data: {
        total_sales_3m: total_sales,
        visitors_3m: visitors,
        monthly_sales: monthly_avg_sales,
        sales_target_ratio,
        unit_price: avg_unit_price,
        next_booking_rate,
        nomination_count: nominations,
        months_present: Math.round(months_present * 10) / 10,
        period_start: startStr,
        period_end: endStr
      }
    };
  } catch (error) {
    console.error("Error fetching staff auto metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}
