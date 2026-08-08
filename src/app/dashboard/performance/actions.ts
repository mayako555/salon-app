"use server";

import { getStaffList } from "@/app/staff/actions";
import { getMonthlySales } from "@/app/sales/actions";
import { getMonthlyShifts } from "@/app/shifts/actions";
import { format } from "date-fns";
import { getMonthlyStaffTargets, updateStaffTarget } from "@/lib/staff_targets";

export async function getStaffPerformanceStats(year: number, month: number) {
  try {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
    
    const [staffList, sales, shifts, monthlyTargets] = await Promise.all([
      getStaffList({ includeResigned: true }),
      getMonthlySales(year, month),
      getMonthlyShifts(year, month),
      getMonthlyStaffTargets(targetMonth)
    ]);

    const stats = staffList.map(staff => {
      // 1. Current Sales (Include HPB points in revenue, match by ID or Name for CSV compatibility)
      const staffSales = sales.filter(s => {
        if (s.staff_id === staff.id) return true;
        if (s.staff_id === "unknown") {
          const sName = (s.staff_name || "").replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
          const fName = (staff.name || "").replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
          const lName = (staff.last_name || "").replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
          return sName === fName || (sName && (fName.includes(sName) || (lName && sName === lName)));
        }
        return false;
      });
      const currentTotal = staffSales.reduce((acc, s) => acc + (s.tech_sales || 0) + (s.product_sales || 0) - (s.discount || 0), 0);
      
      // 2. Target (Priority: Monthly Target > Fixed Staff Target)
      const target = monthlyTargets[staff.id] || staff.monthly_sales_target || 0;
      
      // 3. Remaining
      const remaining = Math.max(0, target - currentTotal);
      
      // 4. Remaining Working Days
      const staffShifts = shifts.filter(s => s.staff_id === staff.id && s.type === "work");
      const remainingShifts = staffShifts.filter(s => s.date >= todayStr);
      const workedShifts = staffShifts.filter(s => s.date < todayStr);
      
      const remainingDays = remainingShifts.length;
      const workedDaysCount = workedShifts.length || (staffSales.length > 0 ? 1 : 0); // Avoid division by zero, assume at least 1 day if there are sales
      
      // 5. Current Daily Average
      const currentDailyAvg = workedDaysCount > 0 ? Math.round(currentTotal / workedDaysCount) : 0;

      // 6. Required Daily Average
      const requiredDailyAvg = remainingDays > 0 ? Math.ceil(remaining / remainingDays) : (remaining > 0 ? remaining : 0);

      return {
        staffId: staff.id,
        staffName: staff.name,
        currentTotal,
        target,
        remaining,
        remainingDays,
        workedDaysCount,
        currentDailyAvg,
        requiredDailyAvg
      };
    });

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Performance Stats Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStaffMonthlyTarget(staffId: string, year: number, month: number, target: number) {
  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  return await updateStaffTarget(staffId, targetMonth, target);
}
