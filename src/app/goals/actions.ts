"use server";

import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, serverTimestamp, orderBy } from "firebase/firestore";
import { getCurrentUserContext } from "@/lib/auth-server";

export type MonthlyGoal = {
  id: string; // companyId_staffId_YYYY-MM
  companyId: string;
  store_name: string;
  staff_id: string;
  staff_name: string;
  month: string; // YYYY-MM
  revenue_target: number;
  sns_posts: number;
  practice_count: number;
  review_count: number;
  action_plan_revenue: string;
  sns_target: string;
  action_plan_sns: string;
  tech_target: string;
  action_plan_tech: string;
  service_target: string;
  action_plan_service: string;
  challenge: string;
  private_goal: string;
  action_plan_private: string;
  reflection: string;
  created_at: any;
  updated_at: any;
};

export type StaffKPIs = {
  revenue: number;
  customer_count: number;
  average_spend: number;
  next_booking_count: number;
  next_booking_rate: number;
  nomination_count: number;
  nomination_rate: number;
};

const GOALS_COL = "monthly_goals";

export async function getCompanyGoalsForMonth(month: string): Promise<MonthlyGoal[]> {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("会社IDが指定されていません");
  
  const colRef = collection(db, GOALS_COL);
  const q = query(colRef, where("companyId", "==", ctx.companyId), where("month", "==", month));
  const snap = await getDocs(q);
  
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toMillis?.() || data.created_at,
      updated_at: data.updated_at?.toMillis?.() || data.updated_at
    } as MonthlyGoal;
  });
}

export async function getMonthlyGoal(staffId: string, staffName: string, storeName: string, month: string): Promise<MonthlyGoal> {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("会社IDが指定されていません");

  const docId = `${ctx.companyId}_${staffId}_${month}`;
  const docRef = doc(db, GOALS_COL, docId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      created_at: data.created_at?.toMillis?.() || data.created_at,
      updated_at: data.updated_at?.toMillis?.() || data.updated_at
    } as MonthlyGoal;
  }

  // Lazy Creation
  const newGoal: Omit<MonthlyGoal, "id" | "created_at" | "updated_at"> = {
    companyId: ctx.companyId,
    store_name: storeName,
    staff_id: staffId,
    staff_name: staffName,
    month,
    revenue_target: 0,
    sns_posts: 0,
    practice_count: 0,
    review_count: 0,
    action_plan_revenue: "",
    sns_target: "",
    action_plan_sns: "",
    tech_target: "",
    action_plan_tech: "",
    service_target: "",
    action_plan_service: "",
    challenge: "",
    private_goal: "",
    action_plan_private: "",
    reflection: ""
  };

  await setDoc(docRef, {
    ...newGoal,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return {
    id: docId,
    ...newGoal,
    created_at: Date.now(),
    updated_at: Date.now()
  };
}

export async function updateMonthlyGoal(id: string, data: Partial<MonthlyGoal>) {
  try {
    const docRef = doc(db, GOALS_COL, id);
    const updateData = { ...data, updated_at: serverTimestamp() };
    await updateDoc(docRef, updateData);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating monthly goal:", error);
    return { success: false, error: error.message };
  }
}

export async function getStaffKPIs(staffName: string, month: string): Promise<StaffKPIs> {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("会社IDが指定されていません");

  // Fetch sales for this month
  const salesCol = collection(db, "sales");
  // Simple fetch by month prefix by using a range query, or fetch all and filter in memory since we are filtering by staff
  // A composite index on companyId, staff_name, date would be best, but to avoid missing indexes we fetch by companyId and date range
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const q = query(
    salesCol, 
    where("companyId", "==", ctx.companyId),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );

  const snapshot = await getDocs(q);
  
  let revenue = 0;
  let customerCount = 0;
  let nextBookingCount = 0;
  let nominationCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.status === "cancelled") return; // exclude cancelled sales
    if (data.staff_name !== staffName) return;

    customerCount++;
    const rowTotal = (data.tech_sales || 0) + (data.product_sales || 0) + (data.nomination_fee || 0) + (data.cancel_fee || 0) - (data.discount || 0);
    revenue += rowTotal;

    // is_next_booking logic
    if (data.is_next_booking === true || data.is_next_booking === "true") {
      nextBookingCount++;
    }

    // nomination logic
    if (data.is_nominated === true || data.is_nominated === "true" || (data.nomination_fee && data.nomination_fee > 0)) {
      nominationCount++;
    }
  });

  const average_spend = customerCount > 0 ? Math.round(revenue / customerCount) : 0;
  const next_booking_rate = customerCount > 0 ? Math.round((nextBookingCount / customerCount) * 100) : 0;
  const nomination_rate = customerCount > 0 ? Math.round((nominationCount / customerCount) * 100) : 0;

  return {
    revenue,
    customer_count: customerCount,
    average_spend,
    next_booking_count: nextBookingCount,
    next_booking_rate,
    nomination_count: nominationCount,
    nomination_rate
  };
}

export async function getAllStaffGoalsAndKPIs(month: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("会社IDが指定されていません");

  // 1. Fetch all goals for the month
  const goalsCol = collection(db, GOALS_COL);
  const goalsQ = query(
    goalsCol,
    where("companyId", "==", ctx.companyId),
    where("month", "==", month)
  );
  const goalsSnap = await getDocs(goalsQ);
  const goalsData = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyGoal));

  // 2. Fetch all active staff to ensure we show everyone, even if no goal exists yet (they can be created lazily if we want, but in admin view we might just show who exists)
  const staffCol = collection(db, "staff");
  const staffQ = query(staffCol, where("companyId", "==", ctx.companyId), where("status", "==", "active"));
  const staffSnap = await getDocs(staffQ);
  const allStaff = staffSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as { id: string; name: string; store_name: string; status: string }));

  // 3. Fetch all sales for the month to calculate KPIs efficiently in bulk
  const salesCol = collection(db, "sales");
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;
  const salesQ = query(
    salesCol, 
    where("companyId", "==", ctx.companyId),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  const salesSnap = await getDocs(salesQ);
  
  const salesByStaff: Record<string, any[]> = {};
  salesSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.status === "cancelled") return;
    const staffName = data.staff_name;
    if (!salesByStaff[staffName]) salesByStaff[staffName] = [];
    salesByStaff[staffName].push(data);
  });

  // 4. Combine
  const results = allStaff.map(staff => {
    // Find goal
    let goal = goalsData.find(g => g.staff_id === staff.id);
    
    // Calculate KPIs
    const staffSales = salesByStaff[staff.name] || [];
    let revenue = 0;
    let customerCount = 0;
    let nextBookingCount = 0;
    let nominationCount = 0;

    staffSales.forEach(data => {
      customerCount++;
      const rowTotal = (data.tech_sales || 0) + (data.product_sales || 0) + (data.nomination_fee || 0) + (data.cancel_fee || 0) - (data.discount || 0);
      revenue += rowTotal;

      if (data.is_next_booking === true || data.is_next_booking === "true") {
        nextBookingCount++;
      }
      if (data.is_nominated === true || data.is_nominated === "true" || (data.nomination_fee && data.nomination_fee > 0)) {
        nominationCount++;
      }
    });

    const average_spend = customerCount > 0 ? Math.round(revenue / customerCount) : 0;
    const next_booking_rate = customerCount > 0 ? Math.round((nextBookingCount / customerCount) * 100) : 0;
    const nomination_rate = customerCount > 0 ? Math.round((nominationCount / customerCount) * 100) : 0;
    const achievement_rate = goal && goal.revenue_target > 0 ? Math.round((revenue / goal.revenue_target) * 100) : 0;

    return {
      staff_id: staff.id,
      staff_name: staff.name,
      store_name: staff.store_name,
      goal: goal || null, // null means they haven't opened their dashboard yet to trigger lazy creation, or we can lazy create it here if we want.
      kpi: {
        revenue,
        customer_count: customerCount,
        average_spend,
        next_booking_count: nextBookingCount,
        next_booking_rate,
        nomination_count: nominationCount,
        nomination_rate,
        achievement_rate
      }
    };
  });

  return results;
}
