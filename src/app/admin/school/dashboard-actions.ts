"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { getCurrentUserContext } from "@/lib/auth-server";

const SALES_COL = "school_sales";
const RESERVATIONS_COL = "school_reservations";
const PAYMENTS_COL = "school_payments";

export async function getSchoolDashboardStats(month: string) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    // We'll just fetch all data for simplicity, but ideally filter by date range
    // Since 'month' is YYYY-MM
    
    // Fetch Sales
    const salesQ = query(
      collection(db, SALES_COL),
      where("companyId", "==", ctx.companyId)
    );
    const salesSnap = await getDocs(salesQ);
    const sales = salesSnap.docs.map(d => d.data());

    // Fetch Reservations
    const resQ = query(
      collection(db, RESERVATIONS_COL),
      where("companyId", "==", ctx.companyId)
    );
    const resSnap = await getDocs(resQ);
    const reservations = resSnap.docs.map(d => d.data());

    // Filter by month string prefix
    const currentMonthSales = sales.filter(s => s.date.startsWith(month));
    const currentMonthReservations = reservations.filter(r => r.date.startsWith(month));

    const totalSales = currentMonthSales.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalReservations = currentMonthReservations.length;
    const completedReservations = currentMonthReservations.filter(r => r.status === "completed").length;

    return {
      success: true,
      data: {
        totalSales,
        totalReservations,
        completedReservations,
        salesRecords: currentMonthSales
      }
    };
  } catch (error: any) {
    console.error("Error fetching school dashboard stats:", error);
    return { success: false, error: error.message };
  }
}
