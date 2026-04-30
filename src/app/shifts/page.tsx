export const dynamic = "force-dynamic";
import { getMonthlyShifts } from "./actions";
import { getStaffList } from "@/app/staff/actions";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import ShiftsView from "./ShiftsView";

export default async function ShiftsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; view?: string; action?: string }>
}) {
  const params = await searchParams;
  const monthParam = params.month;
  const viewMode = params.view === "staff" ? "staff" : params.view === "store" ? "store" : "calendar";
  
  // Parse target month from query or use current month
  const targetDate = monthParam ? new Date(monthParam) : new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  // Generate calendar grid
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const actualMonthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Fetch shifts and staff list
  const [shifts, staffList] = await Promise.all([
    getMonthlyShifts(year, month),
    getStaffList()
  ]);
  
  // Derive unique staff from shifts and official list
  // We keep sort_order for the ones in staffList
  const allStaff = staffList.map(s => ({ id: s.id, name: s.name, sort_order: s.sort_order }));
  
  shifts.forEach(s => {
    if (!allStaff.find(sl => sl.id === s.staff_id)) {
      allStaff.push({ id: s.staff_id, name: s.staff_name, sort_order: 999 });
    }
  });

  const uniqueStaff = Array.from(new Map(allStaff.map(s => [s.id, s])).values())
    .sort((a, b) => {
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "ja");
    });

  return (
    <ShiftsView 
      shifts={shifts}
      staffList={staffList}
      targetDate={targetDate}
      viewMode={viewMode}
      days={days}
      actualMonthDays={actualMonthDays}
      uniqueStaff={uniqueStaff}
    />
  );
}
