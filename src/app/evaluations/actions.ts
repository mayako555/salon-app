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
import { getMonthlyStaffTargets } from "@/lib/staff_targets";
import { getCurrentUserContext } from "@/lib/auth-server";

const EVALUATIONS_COLLECTION = "staff_evaluations";

export async function getStaffEvaluations(staffId?: string): Promise<StaffEvaluation[]> {
  try {
    const ctx = await getCurrentUserContext();
    const colRef = collection(db, EVALUATIONS_COLLECTION);
    let q = query(colRef, orderBy("evaluation_date", "desc"));
    
    if (staffId) {
      q = query(colRef, where("staff_id", "==", staffId), orderBy("evaluation_date", "desc"));
    }
    
    const snapshot = await getDocs(q);
    const evaluations = snapshot.docs
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

    if (ctx.role !== "systemOwner") {
      const staffList = await getStaffList(); // already filtered by companyId
      const allowedStaffIds = new Set(staffList.map(s => s.id));
      return evaluations.filter(e => allowedStaffIds.has(e.staff_id));
    }
    
    return evaluations;
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
    const startMonth = (quarter - 1) * 3 + 1; // Q1=1, Q2=4, Q3=7, Q4=10

    // ── 当期 3ヶ月の売上データを取得 ──
    let allSales: any[] = [];
    for (let m = 0; m < 3; m++) {
      const monthSales = await getMonthlySales(year, startMonth + m);
      allSales = [...allSales, ...monthSales];
    }

    const staffList = await getStaffList();
    const staff = staffList.find(st => st.id === staffId);
    
    // Filter sales to match staff by ID or Name (ignoring spaces) for CSV compatibility
    const staffSales = allSales.filter(s => {
      if (s.staff_id === staffId) return true;
      if (s.staff_id === "unknown" && staff) {
        const sName = (s.staff_name || "").replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
        const fName = (staff.name || "").replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
        const lName = (staff.last_name || "").replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
        return sName === fName || (sName && (fName.includes(sName) || (lName && sName === lName)));
      }
      return false;
    });
    const visitCount = staffSales.length || 1;
    const totalTech = staffSales.reduce((sum, s) => sum + (s.tech_sales || 0), 0);
    const totalProd = staffSales.reduce((sum, s) => sum + (s.product_sales || 0), 0);
    const totalRevenue = totalTech + totalProd;
    const unitPrice = Math.round(totalRevenue / visitCount);

    // ── ① 目標達成率（当期3ヶ月合計の目標vs実績） ──
    let quarterlyTarget = 0;
    for (let m = 0; m < 3; m++) {
      const monthStr = `${year}-${String(startMonth + m).padStart(2, '0')}`;
      const targets = await getMonthlyStaffTargets(monthStr);
      quarterlyTarget += targets[staffId] || 0;
    }
    // 目標未設定の場合はデフォルト60万/月×3ヶ月
    if (quarterlyTarget === 0) quarterlyTarget = 1800000;
    const achievementRate = Math.round((totalRevenue / quarterlyTarget) * 100);

    // ── ② 客単価：全スタッフ平均との比率 ──
    const allVisitCount = allSales.length || 1;
    const allRevenue = allSales.reduce((sum, s) => sum + (s.tech_sales || 0) + (s.product_sales || 0), 0);
    const avgUnitPrice = Math.round(allRevenue / allVisitCount);
    // このスタッフの単価が全体平均の何%か
    const unitPriceRatio = avgUnitPrice > 0 ? Math.round((unitPrice / avgUnitPrice) * 100) : 100;

    // ── ③ 新規からの再来率（当期内：新規来店→リピートに転換した割合） ──
    // このスタッフに新規で来た顧客IDを抽出
    const newCustomerIds = new Set(
      staffSales
        .filter(s => s.customer_type === "新規" && s.customer_id)
        .map(s => s.customer_id)
    );
    // 同期間内に全店で「リピ」として来店した顧客IDを抽出
    const repeatCustomerIdsInPeriod = new Set(
      allSales
        .filter(s => s.customer_type === "リピ" && s.customer_id)
        .map(s => s.customer_id)
    );
    // 新規→リピートに転換した顧客数
    const convertedCount = [...newCustomerIds].filter(id => repeatCustomerIdsInPeriod.has(id)).length;
    const newRepeatRate = newCustomerIds.size > 0
      ? Math.round((convertedCount / newCustomerIds.size) * 100)
      : 0;

    // ── ④ リピーター継続率（前四半期のリピ客が今期も来たか） ──
    // 前四半期の月を計算
    const prevQuarterStart = startMonth - 3;
    const prevYear = prevQuarterStart <= 0 ? year - 1 : year;
    const adjustedPrevStart = prevQuarterStart <= 0 ? prevQuarterStart + 12 : prevQuarterStart;

    let prevAllSales: any[] = [];
    for (let m = 0; m < 3; m++) {
      const monthSales = await getMonthlySales(prevYear, adjustedPrevStart + m);
      prevAllSales = [...prevAllSales, ...monthSales];
    }
    // 前四半期にリピートしていた顧客ID
    const prevRepeatIds = new Set(
      prevAllSales
        .filter(s => s.customer_type === "リピ" && s.customer_id)
        .map(s => s.customer_id)
    );
    // 今期も来店した顧客ID（全スタッフ）
    const currentCustomerIds = new Set(
      allSales.map(s => s.customer_id).filter(Boolean)
    );
    const continuedCount = [...prevRepeatIds].filter(id => currentCustomerIds.has(id)).length;
    const repeatContinuationRate = prevRepeatIds.size > 0
      ? Math.round((continuedCount / prevRepeatIds.size) * 100)
      : 0;

    // ── お直しペナルティ ──
    let reworkPenaltyCount = 0;
    const reworksInPeriod = allSales.filter(s =>
      s.menu_course?.includes("お直し") || s.discount_reason?.includes("お直し")
    );
    for (const rw of reworksInPeriod) {
      if (!rw.customer_id) continue;
      const prevVisits = allSales
        .filter(s => s.customer_id === rw.customer_id && s.date < rw.date)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (prevVisits.length > 0 && prevVisits[0].staff_id === staffId) {
        reworkPenaltyCount++;
      }
    }

    // ── 口コミ集計 ──
    let totalReviewsCount = 0;
    let star5ReviewsCount = 0;
    if (staff) {
      const staffNameNormal = staff.name.replace(/\s+/g, "");
      const lastName = staff.last_name || "";
      const nameKana = (staff.name_kana || "").replace(/\s+/g, "");
      for (let m = 0; m < 3; m++) {
        const monthReviews = await getMonthlyReviews(year, startMonth + m);
        const staffMonthReviews = monthReviews.filter(r => {
          if (r.staff_name === staff.name) return true;
          if (r.reply_text) {
            if (staffNameNormal && r.reply_text.includes(staffNameNormal)) return true;
            if (nameKana && r.reply_text.includes(nameKana)) return true;
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
        total_sales: totalRevenue,
        quarterly_target: quarterlyTarget,
        achievement_rate: achievementRate,       // 目標達成率(%)
        unit_price: unitPrice,
        avg_unit_price: avgUnitPrice,
        unit_price_ratio: unitPriceRatio,         // 全体平均比(%)
        new_repeat_rate: newRepeatRate,           // 新規からの再来率(%)
        repeat_continuation_rate: repeatContinuationRate, // リピーター継続率(%)
        new_customer_count: newCustomerIds.size,
        prev_repeat_count: prevRepeatIds.size,
        rework_count: reworkPenaltyCount,
        review_replies_count: totalReviewsCount,
        review_allowance: star5ReviewsCount * 500
      }
    };
  } catch (error: any) {
    console.error("Error getting evaluation metrics:", error);
    return { success: false, error: error.message };
  }
}
