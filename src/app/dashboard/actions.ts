"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  getCountFromServer 
} from "@/lib/firestore-admin-wrapper";
import { format } from "date-fns";
import { getStoreTargets } from "../stores/actions";
import { getMonthlyShifts } from "../shifts/actions";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { getCurrentUserContext } from "@/lib/auth-server";

export async function getDashboardStats() {
  try {
    const ctx = await getCurrentUserContext();
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const currentMonthPrefix = format(now, "yyyy-MM");

    // 1. Staff Count
    const staffCol = collection(db, "staff_profiles");
    const staffQuery = query(staffCol, where("companyId", "==", ctx.companyId));
    const staffCountSnap = await getCountFromServer(staffQuery);
    const staffCount = staffCountSnap.data().count;

    // 2. Unprocessed Attendance
    const attendanceCol = collection(db, "attendance");
    const unprocessedQuery = query(
      attendanceCol, 
      where("companyId", "==", ctx.companyId),
      where("date", "<", todayStr)
    );
    const unprocessedSnap = await getDocs(unprocessedQuery);
    const unprocessedAttendanceCount = unprocessedSnap.docs.filter(d => !d.data().clock_out).length;

    // 3. Monthly Sales & 4. Today's Sales
    const salesCol = collection(db, "sales");
    // Fetch all sales for the company to avoid composite index issues, filter in memory
    const salesQuery = query(salesCol, where("companyId", "==", ctx.companyId));
    const salesSnap = await getDocs(salesQuery);
    
    // Fetch School Sales if enabled
    let schoolSalesSnap: any = { docs: [] };
    if (ctx.schoolEnabled) {
      const schoolSalesCol = collection(db, "school_sales");
      const schoolSalesQuery = query(schoolSalesCol, where("companyId", "==", ctx.companyId));
      schoolSalesSnap = await getDocs(schoolSalesQuery);
    }

    let monthlyTotal = 0;
    let monthlyMinimoTotal = 0;
    let monthlyRegularTotal = 0;
    let monthlyMinimoVisits = 0;
    let monthlyRegularVisits = 0;
    const storeSummary: Record<string, number> = {};
    
    salesSnap.forEach(doc => {
      const data = doc.data();
      if (data.source !== "hotpepper" || data.merge_status === "DELETED") return;

      const date = data.date || "";
      const isThisMonth = date.startsWith(currentMonthPrefix);
      const isToday = date === todayStr;

      const amount = (data.tech_sales || 0) + (data.product_sales || 0) - (data.discount || 0);

      if (isThisMonth) {
        monthlyTotal += amount;
        
        const route = String(data.reservation_route || "");
        const menu = String(data.menu_course || "");
        const menuLower = menu.toLowerCase();
        const isMinimo = data.is_minimo === true || 
                        route.includes("ミニモ") || 
                        route.toLowerCase().includes("minimo") ||
                        menu.includes("ミニモ") ||
                        menu.includes("ミニ") ||
                        menu.includes("モデル") ||
                        menuLower.includes("min") ||
                        menuLower.includes("mini");

        if (isMinimo) {
          monthlyMinimoTotal += amount;
          monthlyMinimoVisits++;
        } else {
          monthlyRegularTotal += amount;
          monthlyRegularVisits++;
        }
      }

      if (isToday) {
        const rawStore = data.store_name || "不明";
        const store = rawStore.endsWith("店") ? rawStore.slice(0, -1) : rawStore;
        if (storeSummary[store] !== undefined) {
          storeSummary[store] += amount;
        } else {
          storeSummary[store] = amount;
        }
      }
    });

    const monthlyMinimoAvg = monthlyMinimoVisits > 0 ? Math.round(monthlyMinimoTotal / monthlyMinimoVisits) : 0;
    const monthlyRegularAvg = monthlyRegularVisits > 0 ? Math.round(monthlyRegularTotal / monthlyRegularVisits) : 0;

    // 5. Store Targets & Progress
    const storeTargets = await getStoreTargets(currentMonthPrefix);
    
    const monthlyStoreSales: Record<string, number> = {};
    salesSnap.forEach(doc => {
      const data = doc.data();
      if (data.source !== "hotpepper" || data.merge_status === "DELETED") return;
      if (!data.date?.startsWith(currentMonthPrefix)) return;
      
      const rawStore = data.store_name || "不明";
      const store = rawStore.endsWith("店") ? rawStore.slice(0, -1) : rawStore;
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) - (data.discount || 0);
      monthlyStoreSales[store] = (monthlyStoreSales[store] || 0) + amount;
    });

    // Process school sales
    if (ctx.schoolEnabled && ctx.schoolName) {
      schoolSalesSnap.forEach((doc: any) => {
        const data = doc.data();
        const date = data.date || "";
        const isThisMonth = date.startsWith(currentMonthPrefix);
        const isToday = date === todayStr;
        const amount = data.amount || 0;

        if (isThisMonth) {
          monthlyTotal += amount;
          monthlyStoreSales[ctx.schoolName!] = (monthlyStoreSales[ctx.schoolName!] || 0) + amount;
        }

        if (isToday) {
          storeSummary[ctx.schoolName!] = (storeSummary[ctx.schoolName!] || 0) + amount;
        }
      });
    }

    // Use user's salonIds if available, otherwise fallback to all targets
    const isTenantAdmin = ctx.role === "systemOwner" || ctx.role === "admin" || ctx.role === "companyOwner";
    const availableStores = isTenantAdmin 
      ? storeTargets.map(t => t.store_name.endsWith("店") ? t.store_name.slice(0, -1) : t.store_name) 
      : (ctx.salonIds && ctx.salonIds.length > 0 
          ? ctx.salonIds.map(s => s.endsWith("店") ? s.slice(0, -1) : s) 
          : storeTargets.map(t => t.store_name.endsWith("店") ? t.store_name.slice(0, -1) : t.store_name));
          
    const uniqueStores = Array.from(new Set(availableStores));
    if (ctx.schoolEnabled && ctx.schoolName) {
      if (!uniqueStores.includes(ctx.schoolName)) {
        uniqueStores.push(ctx.schoolName);
      }
    }
    
    // Initialize summary to 0 for unique stores
    uniqueStores.forEach(name => {
      if (storeSummary[name] === undefined) storeSummary[name] = 0;
    });

    const storeStats = uniqueStores.map(name => {
      const target = storeTargets.find(t => {
        const tName = t.store_name.endsWith("店") ? t.store_name.slice(0, -1) : t.store_name;
        return tName === name;
      })?.target || 0;
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
        monthlyMinimoAvg,
        monthlyRegularAvg,
        monthlyMinimoVisits,
        monthlyRegularVisits,
        storeSummary,
        storeStats
      }
    };
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAdvancedAnalytics(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) return { success: false, error: "Company ID missing" };

    const now = new Date();
    const months = Array.from({ length: 36 }, (_, i) => {
      const d = subMonths(now, i);
      return format(d, "yyyy-MM");
    }).reverse();

    const salesCol = collection(db, "sales");
    const shiftsCol = collection(db, "shifts");
    // Fetch all sales for this company
    const qSales = query(salesCol, where("companyId", "==", ctx.companyId));
    const salesSnap = await getDocs(qSales);

    // Group sales by month
    const salesByMonth: Record<string, any[]> = {};
    months.forEach(m => salesByMonth[m] = []);

    salesSnap.forEach(doc => {
      const data = doc.data();
      if (data.source !== "hotpepper" || data.merge_status === "DELETED") return;
      
      const date = data.date || "";
      const monthStr = date.substring(0, 7);
      if (salesByMonth[monthStr]) {
        salesByMonth[monthStr].push(data);
      }
    });

    const monthlyData = await Promise.all(months.map(async (monthStr) => {
      const monthSales = salesByMonth[monthStr] || [];
      
      let total = 0;
      let minimo = 0;
      let treatmentCount = 0;
      let totalTreatmentMinutes = 0;
      let totalNextBookings = 0;
      let totalNextBookingVisits = 0;
      const storeSales: Record<string, { total: number, minimo: number, nextBookings: number, nextBookingVisits: number, count: number, minimoVisits: number, regularVisits: number, regularNewVisits: number, minimoNewVisits: number, routes: Record<string, { visits: number, newVisits: number, sales: number }> }> = {};
      
      monthSales.forEach(data => {
        const amount = (data.tech_sales || 0) + (data.product_sales || 0) - (data.discount || 0);
        total += amount;
        
        const route = String(data.reservation_route || "");
        const menu = String(data.menu_course || "");
        const menuLower = menu.toLowerCase();
        const isMinimo = data.is_minimo === true || 
                        route.includes("ミニモ") || 
                        route.toLowerCase().includes("minimo") ||
                        menu.includes("ミニモ") ||
                        menu.includes("ミニ") ||
                        menu.includes("モデル") ||
                        menuLower.includes("min") ||
                        menuLower.includes("mini");
        
        if (isMinimo) {
          minimo += amount;
        }
        
        const hasNextBooking = !!data.next_booking_date;
        if (hasNextBooking) {
          totalNextBookings++;
        }

        const discountReason = String(data.discount_reason || "");
        const isNextBookingVisit = 
          menu.includes("次回") || 
          menu.includes("店頭クーポン") || 
          discountReason.includes("次回");
        
        if (isNextBookingVisit) {
          totalNextBookingVisits++;
        }

        if ((data.tech_sales || 0) > 0) {
          treatmentCount++;
          totalTreatmentMinutes += data.treatment_minutes || 60; // 実際の施術時間がない場合は後方互換で60分とする
        }
        
        const storeKey = data.store_name || "不明";
        
        if (!storeSales[storeKey]) {
          storeSales[storeKey] = { total: 0, minimo: 0, nextBookings: 0, nextBookingVisits: 0, count: 0, minimoVisits: 0, regularVisits: 0, regularNewVisits: 0, minimoNewVisits: 0, routes: {} };
        }
        
        // Only count as a 'visit' for unit price calculation if they actually had technical sales
        if ((data.tech_sales || 0) > 0) {
          storeSales[storeKey].total += amount;
          storeSales[storeKey].count++;
          
          if (!storeSales[storeKey].routes[route]) {
            storeSales[storeKey].routes[route] = { visits: 0, newVisits: 0, sales: 0 };
          }
          storeSales[storeKey].routes[route].visits++;
          storeSales[storeKey].routes[route].sales += amount;

          if (isMinimo) {
            storeSales[storeKey].minimo += amount;
            storeSales[storeKey].minimoVisits++;
            if (data.customer_type === "新規") {
              storeSales[storeKey].minimoNewVisits++;
              storeSales[storeKey].routes[route].newVisits++;
            }
          } else {
            storeSales[storeKey].regularVisits++;
            if (data.customer_type === "新規") {
              storeSales[storeKey].regularNewVisits++;
              storeSales[storeKey].routes[route].newVisits++;
            }
          }
          
          if (hasNextBooking) {
            storeSales[storeKey].nextBookings++;
          }
          if (isNextBookingVisit) {
            storeSales[storeKey].nextBookingVisits++;
          }
        }
      });

      // Calculate averages per store
      Object.keys(storeSales).forEach(key => {
        const s = storeSales[key];
        const regularSales = s.total - s.minimo;
        const regularVisits = s.regularVisits + s.nextBookingVisits;
        (s as any).avgRegular = regularVisits > 0 ? Math.round(regularSales / regularVisits) : 0;
        (s as any).avgMinimo = s.minimoVisits > 0 ? Math.round(s.minimo / s.minimoVisits) : 0;
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

      // Occupancy calc: Actual treatment minutes / total work minutes
      const estimatedTreatmentMinutes = totalTreatmentMinutes;
      const occupancy = totalWorkMinutes > 0 ? Math.min(100, (estimatedTreatmentMinutes / totalWorkMinutes) * 100) : 0;

      const totalCount = Object.values(storeSales).reduce((acc, s) => acc + s.count, 0);
      const totalRegularSales = total - minimo;
      const totalMinimoVisits = Object.values(storeSales).reduce((acc, s) => acc + s.minimoVisits, 0);
      const totalRegularVisits = totalCount - totalMinimoVisits;

      const avgMinimo = totalMinimoVisits > 0 ? Math.round(minimo / totalMinimoVisits) : 0;
      const avgRegular = totalRegularVisits > 0 ? Math.round(totalRegularSales / totalRegularVisits) : 0;

      const nextBookingRatio = totalCount > 0 ? Math.round((totalNextBookings / totalCount) * 100) : 0;
      const nextBookingVisitRatio = totalCount > 0 ? Math.round((totalNextBookingVisits / totalCount) * 100) : 0;

      return {
        month: monthStr,
        total,
        minimo,
        avgMinimo,
        avgRegular,
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
