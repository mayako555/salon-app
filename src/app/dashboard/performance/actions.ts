"use server";

import { getStaffList } from "@/app/staff/actions";
import { getMonthlySales } from "@/app/sales/actions";
import { getMonthlyShifts } from "@/app/shifts/actions";
import { format, endOfMonth } from "date-fns";

export async function getStaffPerformanceStats(year: number, month: number) {
  try {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    
    const [staffList, sales, shifts] = await Promise.all([
      getStaffList(),
      getMonthlySales(year, month),
      getMonthlyShifts(year, month)
    ]);

    const stats = staffList.map(staff => {
      // 1. Current Sales
      const staffSales = sales.filter(s => s.staff_id === staff.id);
      const currentTotal = staffSales.reduce((acc, s) => acc + (s.tech_sales || 0) + (s.product_sales || 0) - (s.discount || 0), 0);
      
      // 2. Target
      const target = staff.monthly_sales_target || 0;
      
      // 3. Remaining
      const remaining = Math.max(0, target - currentTotal);
      
      // 4. Remaining Working Days
      // Filter shifts for this staff, type "work", and date >= today
      const staffShifts = shifts.filter(s => 
        s.staff_id === staff.id && 
        s.type === "work" && 
        s.date >= todayStr
      );
      const remainingDays = staffShifts.length;
      
      // 5. Required Daily Average
      const requiredDailyAvg = remainingDays > 0 ? Math.ceil(remaining / remainingDays) : (remaining > 0 ? remaining : 0);

      return {
        staffId: staff.id,
        staffName: staff.name,
        currentTotal,
        target,
        remaining,
        remainingDays,
        requiredDailyAvg
      };
    });

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Performance Stats Error:", error);
    return { success: false, error: error.message };
  }
}
