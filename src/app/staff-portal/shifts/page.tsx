export const dynamic = "force-dynamic";
import { getMonthlyShifts } from "../../shifts/actions";
import { getStaffList } from "@/app/staff/actions";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import ShiftsView from "../../shifts/ShiftsView";

export default async function StaffPortalShiftsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; view?: string; action?: string }>
}) {
  const params = await searchParams;
  const monthParam = params.month;
  const viewMode = (params.view as any) || "calendar";
  
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
  
  // Derive unique staff from shifts
  const staffFromShifts = shifts.map(s => ({ id: s.staff_id, name: s.staff_name }));
  const allStaff = [...staffList, ...staffFromShifts.filter(s => !staffList.find(sl => sl.id === s.id))];
  const uniqueStaff = Array.from(new Map(allStaff.map(s => [s.id, s])).values())
    .map(s => ({ id: (s as any).id, name: (s as any).name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-4 md:p-8">
      <ShiftsView 
        shifts={shifts}
        staffList={staffList}
        targetDate={targetDate}
        viewMode={viewMode}
        days={days}
        actualMonthDays={actualMonthDays}
        uniqueStaff={uniqueStaff}
      />
    </div>
  );
}
