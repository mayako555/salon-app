"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  getCountFromServer 
} from "firebase/firestore";
import { format } from "date-fns";
import { getStoreTargets } from "../stores/actions";

export async function getDashboardStats() {
  try {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const currentMonthPrefix = format(now, "yyyy-MM");

    // 1. Staff Count
    const staffCol = collection(db, "staff_profiles");
    const staffCountSnap = await getCountFromServer(staffCol);
    const staffCount = staffCountSnap.data().count;

    // 2. Unprocessed Attendance (Missed clock-outs from the past)
    const attendanceCol = collection(db, "attendance");
    const unprocessedQuery = query(
      attendanceCol, 
      where("clock_out", "==", null),
      where("date", "<", todayStr)
    );
    const unprocessedSnap = await getCountFromServer(unprocessedQuery);
    const unprocessedAttendanceCount = unprocessedSnap.data().count;

    // 3. Monthly Sales
    const salesCol = collection(db, "sales");
    const monthlySalesQuery = query(
      salesCol,
      where("date", ">=", `${currentMonthPrefix}-01`),
      where("date", "<=", `${currentMonthPrefix}-31`)
    );
    const monthlySalesSnap = await getDocs(monthlySalesQuery);
    let monthlyTotal = 0;
    let monthlyMinimoTotal = 0;
    let monthlyRegularTotal = 0;
    
    monthlySalesSnap.forEach(doc => {
      const data = doc.data();
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) + (data.hpb_points || 0) - (data.discount || 0);
      monthlyTotal += amount;
      
      if (data.reservation_route?.includes("ミニモ") || data.is_minimo) {
        monthlyMinimoTotal += amount;
      } else {
        monthlyRegularTotal += amount;
      }
    });

    // 4. Today's Sales by Store
    const todaySalesQuery = query(
      salesCol,
      where("date", "==", todayStr)
    );
    const todaySalesSnap = await getDocs(todaySalesQuery);
    const storeSummary: Record<string, number> = {
      "六甲店": 0,
      "神戸店": 0,
      "元町店": 0
    };
    
    todaySalesSnap.forEach(doc => {
      const data = doc.data();
      const store = data.store_name || "不明";
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) + (data.hpb_points || 0) - (data.discount || 0);
      if (storeSummary[store] !== undefined) {
        storeSummary[store] += amount;
      } else {
        storeSummary[store] = amount;
      }
    });

    // 5. Store Targets & Progress
    const storeTargets = await getStoreTargets(currentMonthPrefix);
    
    // Aggregate monthly sales by store
    const monthlyStoreSales: Record<string, number> = {};
    monthlySalesSnap.forEach(doc => {
      const data = doc.data();
      const store = data.store_name || "不明";
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) + (data.hpb_points || 0) - (data.discount || 0);
      monthlyStoreSales[store] = (monthlyStoreSales[store] || 0) + amount;
    });

    const storeStats = ["六甲", "神戸", "元町"].map(name => {
      const target = storeTargets.find(t => t.store_name === name)?.target || 0;
      const current = monthlyStoreSales[name] || 0;
      return {
        name,
        target,
        current,
        progress: target > 0 ? (current / target) * 100 : 0
      };
    });

    return {
      success: true,
      data: {
        staffCount,
        unprocessedAttendanceCount,
        monthlyTotal,
        monthlyMinimoTotal,
        monthlyRegularTotal,
        storeSummary,
        storeStats
      }
    };
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return { success: false, error: error.message };
  }
}
