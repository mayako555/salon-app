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
import { getMonthlyShifts } from "../shifts/actions";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function getDashboardStats() {
  try {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const currentMonthPrefix = format(now, "yyyy-MM");

    // 1. Staff Count
    const staffCol = collection(db, "staff_profiles");
    const staffCountSnap = await getCountFromServer(staffCol);
    const staffCount = staffCountSnap.data().count;

    // 2. Unprocessed Attendance (Fetch recent to avoid index requirements)
    const attendanceCol = collection(db, "attendance");
    const unprocessedQuery = query(
      attendanceCol, 
      where("date", "<", todayStr)
    );
    const unprocessedSnap = await getDocs(unprocessedQuery);
    const unprocessedAttendanceCount = unprocessedSnap.docs.filter(d => !d.data().clock_out).length;

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

export async function getAdvancedAnalytics() {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, i);
      return format(d, "yyyy-MM");
    }).reverse();

    const salesCol = collection(db, "sales");
    const shiftsCol = collection(db, "shifts");

    const monthlyData = await Promise.all(months.map(async (monthStr) => {
      const [year, month] = monthStr.split("-").map(Number);
      
      // 1. Fetch Sales for this month
      const qSales = query(
        salesCol,
        where("date", ">=", `${monthStr}-01`),
        where("date", "<=", `${monthStr}-31`)
      );
      const salesSnap = await getDocs(qSales);
      
      let total = 0;
      let minimo = 0;
      let treatmentCount = 0;
      let totalNextBookings = 0;
      let totalNextBookingVisits = 0;
      const storeSales: Record<string, { total: number, minimo: number, nextBookings: number, nextBookingVisits: number, count: number, minimoVisits: number, regularVisits: number }> = { 
        "六甲": { total: 0, minimo: 0, nextBookings: 0, nextBookingVisits: 0, count: 0, minimoVisits: 0, regularVisits: 0 }, 
        "元町": { total: 0, minimo: 0, nextBookings: 0, nextBookingVisits: 0, count: 0, minimoVisits: 0, regularVisits: 0 }, 
        "神戸": { total: 0, minimo: 0, nextBookings: 0, nextBookingVisits: 0, count: 0, minimoVisits: 0, regularVisits: 0 } 
      };
      
      salesSnap.forEach(doc => {
        const data = doc.data();
        const amount = (data.tech_sales || 0) + (data.product_sales || 0) + (data.hpb_points || 0) - (data.discount || 0);
        total += amount;
        
        const route = String(data.reservation_route || "");
        const isMinimo = data.is_minimo === true || route.includes("ミニモ") || route.toLowerCase().includes("min");
        
        if (isMinimo) {
          minimo += amount;
        }
        
        // Count 1: Making a next booking (KPI for future)
        const hasNextBooking = !!data.next_booking_date;
        if (hasNextBooking) {
          totalNextBookings++;
        }

        // Count 2: Identifying the category of THIS visit (for current breakdown)
        const menu = String(data.menu_course || "");
        const discountReason = String(data.discount_reason || "");
        const isNextBookingVisit = 
          menu.includes("次回予約") || 
          menu.includes("店頭クーポン") || 
          discountReason.includes("次回予約");
        
        if (isNextBookingVisit) {
          totalNextBookingVisits++;
        }

        if (data.tech_sales > 0) treatmentCount++;
        
        const rawStore = data.store_name || "不明";
        const store = rawStore.replace("店", "");
        if (storeSales[store] !== undefined) {
          storeSales[store].total += amount;
          storeSales[store].count++;
          
          // Granular visit classification (Mutual exclusive)
          if (isMinimo) {
            storeSales[store].minimo += amount;
            storeSales[store].minimoVisits = (storeSales[store].minimoVisits || 0) + 1;
          } else if (isNextBookingVisit) {
            storeSales[store].nextBookingVisits++;
          } else {
            storeSales[store].regularVisits = (storeSales[store].regularVisits || 0) + 1;
          }

          if (hasNextBooking) {
            storeSales[store].nextBookings++;
          }
        }
      });

      // 2. Fetch Shifts for occupancy (Fetch all for month to avoid index requirements)
      const qShifts = query(
        shiftsCol,
        where("date", ">=", `${monthStr}-01`),
        where("date", "<=", `${monthStr}-31`)
      );
      const shiftsSnap = await getDocs(qShifts);
      
      let totalWorkMinutes = 0;
      shiftsSnap.forEach(doc => {
        const data = doc.data();
        // Filter by type "work" in memory
        if (data.type === "work") {
          (data.segments || []).forEach((seg: any) => {
            const [h1, m1] = seg.start_time.split(":").map(Number);
            const [h2, m2] = seg.end_time.split(":").map(Number);
            totalWorkMinutes += (h2 * 60 + m2) - (h1 * 60 + m1);
          });
        }
      });

      // Occupancy calc: Treatment count * 60 mins / total work minutes
      const estimatedTreatmentMinutes = treatmentCount * 60;
      const occupancy = totalWorkMinutes > 0 ? Math.min(100, (estimatedTreatmentMinutes / totalWorkMinutes) * 100) : 0;

      const totalCount = Object.values(storeSales).reduce((acc, s) => acc + s.count, 0);
      const nextBookingRatio = totalCount > 0 ? Math.round((totalNextBookings / totalCount) * 100) : 0;
      const nextBookingVisitRatio = totalCount > 0 ? Math.round((totalNextBookingVisits / totalCount) * 100) : 0;

      return {
        month: monthStr,
        total,
        minimo,
        occupancy: Math.round(occupancy),
        stores: storeSales,
        nextBookingRatio,
        nextBookingVisits: totalNextBookingVisits,
        nextBookingVisitRatio
      };
    }));

    return { success: true, data: monthlyData };
  } catch (error: any) {
    console.error("Advanced Analytics Error:", error);
    return { success: false, error: error.message };
  }
}
