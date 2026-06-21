"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Plus, LayoutGrid, Users, Building2, X } from "lucide-react";
import { format, isSameMonth, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShiftRecord, ShiftSegment, StoreLocation } from "./actions";
import { StaffProfile } from "@/app/staff/actions";
import ShiftEditDialog from "./ShiftEditDialog";
import BulkShiftDialog from "./BulkShiftDialog";

type ShiftsViewProps = {
  shifts: ShiftRecord[];
  staffList: StaffProfile[];
  targetDate: Date;
  viewMode: "calendar" | "staff" | "store";
  days: Date[];
  actualMonthDays: Date[];
  uniqueStaff: { id: string; name: string; sort_order?: number }[];
};

export default function ShiftsView({
  shifts,
  staffList,
  targetDate,
  viewMode,
  days,
  actualMonthDays,
  uniqueStaff
}: ShiftsViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  const { profile, availableStores } = useAuth();
  const isReadOnly = profile?.role !== "admin" && profile?.role !== "manager";

  const getStoreBadgeClasses = (store: string) => {
    switch (store) {
      case "六甲": return "bg-blue-100 text-blue-800 border-blue-200";
      case "元町": return "bg-purple-100 text-purple-800 border-purple-200";
      case "神戸": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getShiftsForDate = (date: string) => {
    const rawShifts = shifts.filter(s => s.date === date);
    // Merge duplicates for the same staff on the same day
    const mergedMap = new Map<string, ShiftRecord>();
    
    rawShifts.forEach(s => {
      const existing = mergedMap.get(s.staff_id);
      if (!existing) {
        mergedMap.set(s.staff_id, { ...s });
      } else {
        // Holiday/leave requests always take priority over work shifts
        const isHolidayType = (type: string) => 
          type === 'holiday' || type === 'paid_leave' || 
          type === 'requested_holiday' || type === 'requested_paid_leave';
        
        if (isHolidayType(s.type)) {
          // Incoming is a holiday/leave → always wins
          mergedMap.set(s.staff_id, { ...s });
        } else if (s.type === 'work' && !isHolidayType(existing.type)) {
          // Both are work → merge segments
          existing.segments = [...(existing.segments || []), ...(s.segments || [])];
        }
        // If existing is holiday/leave and incoming is work → keep existing (do nothing)
      }
    });
    
    return Array.from(mergedMap.values()).sort((a, b) => {
      const orderA = uniqueStaff.find(s => s.id === a.staff_id)?.sort_order ?? 999;
      const orderB = uniqueStaff.find(s => s.id === b.staff_id)?.sort_order ?? 999;
      return orderA - orderB;
    });
  };

  const getShiftForStaffDate = (staff_id: string, date: string) => {
    const staffShifts = shifts.filter(s => s.staff_id === staff_id && s.date === date);
    if (staffShifts.length === 0) return undefined;
    if (staffShifts.length === 1) return staffShifts[0];
    
    const isHolidayType = (type: string) => 
      type === 'holiday' || type === 'paid_leave' || 
      type === 'requested_holiday' || type === 'requested_paid_leave';

    // Holiday/leave takes priority: return it if any exists
    const holidayShift = staffShifts.find(s => isHolidayType(s.type));
    if (holidayShift) return holidayShift;

    // Otherwise merge work segments
    const merged = { ...staffShifts[0] };
    staffShifts.slice(1).forEach(s => {
      if (s.type === 'work') {
        merged.segments = [...(merged.segments || []), ...(s.segments || [])];
      }
    });
    return merged;
  };

  const handleAddShift = (date?: string) => {
    if (isReadOnly) return;
    setSelectedShift(undefined);
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const handleEditShift = (shift: ShiftRecord) => {
    if (isReadOnly) return;
    setSelectedShift(shift);
    setSelectedDate(shift.date);
    setIsDialogOpen(true);
  };

  const renderCompactShift = (shift: any) => {
    if (!shift) return null;
    return (
      <div 
        className="flex flex-col gap-1 w-full bg-white h-full justify-center cursor-pointer hover:bg-slate-50 rounded p-0.5 transition-colors"
        onClick={() => handleEditShift(shift)}
      >
        {shift.type === 'holiday' ? (
          <div className={`font-bold p-1 rounded h-full flex flex-col justify-center ${shift.request_id ? 'text-blue-700 bg-blue-50 border border-blue-200' : 'text-slate-500 bg-slate-100'}`}>
            {shift.request_id ? "希望休" : "休"}
          </div>
        ) : shift.type === 'paid_leave' ? (
          <div className={`font-bold p-1 rounded h-full flex flex-col justify-center ${shift.request_id ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-600 bg-amber-50'}`}>
            {shift.request_id ? "有休(希望)" : "有休"}
          </div>
        ) : shift.type === 'requested_holiday' ? (
          <div className="text-blue-600 font-bold bg-blue-50 p-1 rounded h-full flex flex-col justify-center repeating-stripes">希望休</div>
        ) : shift.type === 'requested_paid_leave' ? (
          <div className="text-emerald-600 font-bold bg-emerald-50 p-1 rounded h-full flex flex-col justify-center repeating-stripes">有給申請</div>
        ) : (
          shift.segments?.map((seg: any, idx: number) => (
            <div key={idx} className={`p-0.5 rounded border text-[10px] leading-tight ${getStoreBadgeClasses(seg.store)}`}>
              {seg.start_time} - {seg.end_time}<br/><span className="font-bold">{seg.store}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BulkShiftDialog 
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        staffList={uniqueStaff as StaffProfile[]}
        targetMonth={targetDate}
      />
      <ShiftEditDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        shift={selectedShift}
        staffList={staffList}
        initialDate={selectedDate}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">シフト管理</h1>
          <p className="text-slate-500 mt-1 text-sm">スタッフの勤務シフトを作成・調整します。 <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">青色ストライプはスタッフの「希望休」です。</span></p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Link 
              href={`?month=${format(targetDate, "yyyy-MM")}&view=calendar`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={16} /> カレンダー
            </Link>
            <Link 
              href={`?month=${format(targetDate, "yyyy-MM")}&view=staff`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'staff' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={16} /> スタッフ別
            </Link>
            <Link 
              href={`?month=${format(targetDate, "yyyy-MM")}&view=store`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'store' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Building2 size={16} /> 店舗別
            </Link>
          </div>
          {!isReadOnly && (
            <>
              <Button variant="outline" size="sm" className="hidden sm:flex gap-1 h-9 ml-2">
                <Download size={16} />
                <span>出力</span>
              </Button>
              <Button 
                onClick={() => setIsBulkDialogOpen(true)}
                variant="outline"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 border-slate-200"
              >
                <Users size={16} />
                <span>一括入力</span>
              </Button>
              <Button 
                onClick={() => handleAddShift()}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-slate-900"
              >
                <Plus size={16} />
                <span>シフト追加</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 tabular-nums">
              {format(targetDate, "yyyy年 M月", { locale: ja })}
            </h2>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm">
            <Link href={`?month=${format(new Date(targetDate.getFullYear(), targetDate.getMonth() - 1), "yyyy-MM")}&view=${viewMode}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-l-md border-r border-slate-200 hover:bg-slate-100">
                <ChevronLeft size={16} className="text-slate-600" />
              </Button>
            </Link>
            <Link href={`?month=${format(new Date(), "yyyy-MM")}&view=${viewMode}`}>
              <Button variant="ghost" size="sm" className="h-8 rounded-none px-4 text-xs font-medium text-slate-600 hover:bg-slate-100">
                今月
              </Button>
            </Link>
            <Link href={`?month=${format(new Date(targetDate.getFullYear(), targetDate.getMonth() + 1), "yyyy-MM")}&view=${viewMode}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md border-l border-slate-200 hover:bg-slate-100">
                <ChevronRight size={16} className="text-slate-600" />
              </Button>
            </Link>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <div className="overflow-x-auto custom-scrollbar">
            <div className="flex flex-col min-w-[800px] sm:min-w-[100%]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {["月", "火", "水", "木", "金", "土", "日"].map((day, i) => (
                  <div key={day} className={`py-3 text-center text-xs font-semibold ${
                    i === 5 ? "text-blue-600" : i === 6 ? "text-rose-600" : "text-slate-500"
                  }`}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 bg-slate-200 gap-px">
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayShifts = getShiftsForDate(dateStr);
                const isCurrentMonth = isSameMonth(day, targetDate);
                const isTodayDate = isToday(day);

                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[140px] bg-white p-2 transition-colors hover:bg-slate-50 group ${
                      !isCurrentMonth ? 'bg-slate-50/50 opacity-60' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isTodayDate ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-700'
                      }`}>
                        {format(day, "d")}
                      </span>
                      {!isReadOnly && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleAddShift(dateStr)}
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400"
                        >
                          <Plus size={12} />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1.5 pr-1">
                      {dayShifts.map((shift) => (
                        <div 
                          key={shift.id} 
                          onClick={() => handleEditShift(shift)}
                          className={`shrink-0 text-[10px] flex flex-col rounded border shadow-sm leading-none overflow-hidden transition-all
                            ${isReadOnly ? '' : 'cursor-pointer hover:ring-2 hover:ring-slate-400'}
                            ${shift.type === 'holiday' ? (shift.request_id ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-100 border-slate-200 text-slate-600') :
                              shift.type === 'paid_leave' ? (shift.request_id ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-700') : 
                              shift.type === 'requested_holiday' ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-md ring-2 ring-blue-200' :
                              shift.type === 'requested_paid_leave' ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-md ring-2 ring-emerald-200' :
                              'bg-white border-slate-200 text-slate-700'}`}
                        >
                          <div className={`px-1.5 py-1.5 flex justify-between font-bold ${shift.type === 'work' ? 'bg-slate-50 border-b border-slate-100' : ''}`}>
                             <span className="truncate">{shift.staff_name}</span>
                             {shift.type === 'holiday' && <span className="opacity-70 flex-shrink-0 text-[9px] mt-0.5">{shift.request_id ? '希望休' : '休'}</span>}
                             {shift.type === 'paid_leave' && <span className={`opacity-70 flex-shrink-0 text-[9px] mt-0.5 ${shift.request_id ? 'text-emerald-700' : 'text-amber-600'}`}>{shift.request_id ? '有休(希望)' : '有休'}</span>}
                             {shift.type === 'requested_holiday' && <span className="bg-blue-500 text-white px-1 py-0.5 rounded text-[8px] flex-shrink-0 mt-0.5 font-bold shadow-sm">★希望休</span>}
                             {shift.type === 'requested_paid_leave' && <span className="bg-emerald-500 text-white px-1 py-0.5 rounded text-[8px] flex-shrink-0 mt-0.5 font-bold shadow-sm">★有給申請</span>}
                          </div>
                          {shift.type === 'work' && shift.segments && shift.segments.map((seg, idx) => (
                            <div key={idx} className="px-1.5 py-1 border-t border-dashed border-slate-100 first:border-t-0 flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[9px]">
                                 <span className="font-mono text-slate-500">{seg.start_time}-{seg.end_time}</span>
                                 <span className={`px-1.5 py-0.5 rounded border ${getStoreBadgeClasses(seg.store)}`}>
                                   {seg.store}
                                 </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        ) : viewMode === "staff" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-100 p-3 border-y border-r border-slate-200 z-10 min-w-[120px] text-left text-slate-600">
                    スタッフ
                  </th>
                  {actualMonthDays.map((day) => {
                    const dayOfWeek = day.getDay();
                    return (
                      <th 
                        key={day.toString()} 
                        className={`p-2 border-y border-r border-slate-200 min-w-[65px] font-medium
                          ${dayOfWeek === 0 ? "text-rose-600 bg-rose-50/30" : 
                            dayOfWeek === 6 ? "text-blue-600 bg-blue-50/30" : "text-slate-600 bg-slate-50"}
                        `}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{format(day, "d")}</span>
                          <span className="text-[10px] opacity-70">{format(day, "E", { locale: ja })}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {uniqueStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 bg-white p-3 border-b border-r border-slate-200 font-bold text-slate-800 z-10 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {staff.name}
                    </td>
                    {actualMonthDays.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const shift = getShiftForStaffDate(staff.id, dateStr);
                      return (
                        <td 
                          key={dateStr} 
                          className="border-b border-r border-slate-200 p-1 align-middle min-h-[60px] max-w-[65px]"
                          onClick={() => !isReadOnly && (shift ? handleEditShift(shift) : handleAddShift(dateStr))}
                        >
                          <div className="h-full min-h-[50px] flex items-center justify-center">
                            {renderCompactShift(shift)}
                            {!shift && !isReadOnly && (
                              <div className="w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center text-slate-300">
                                <Plus size={14} />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-100 p-3 border-y border-r border-slate-200 z-10 min-w-[120px] text-left text-slate-600">
                    店舗
                  </th>
                  {actualMonthDays.map((day) => {
                    const dayOfWeek = day.getDay();
                    return (
                      <th 
                        key={day.toString()} 
                        className={`p-2 border-y border-r border-slate-200 min-w-[85px] font-medium
                          ${dayOfWeek === 0 ? "text-rose-600 bg-rose-50/30" : 
                            dayOfWeek === 6 ? "text-blue-600 bg-blue-50/30" : "text-slate-600 bg-slate-50"}
                        `}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{format(day, "d")}</span>
                          <span className="text-[10px] opacity-70">{format(day, "E", { locale: ja })}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {availableStores.map((store) => {
                  // Calculate Averages for this store
                  let totalAllVisits = 0;
                  let totalDebutedVisits = 0;
                  const storeDaysCount = actualMonthDays.length;

                  actualMonthDays.forEach(day => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayShifts = getShiftsForDate(dateStr);
                    const storeShifts = dayShifts.filter(shift => 
                      shift.type === "work" && 
                      shift.segments?.some(seg => seg.store === store)
                    );
                    
                    totalAllVisits += storeShifts.length;
                    
                    const debutedCount = storeShifts.filter(s => {
                      const staff = staffList.find(sl => sl.id === s.staff_id);
                      return staff && !staff.is_trainee;
                    }).length;
                    
                    totalDebutedVisits += debutedCount;
                  });

                  const avgAll = (totalAllVisits / storeDaysCount).toFixed(1);
                  const avgDebuted = (totalDebutedVisits / storeDaysCount).toFixed(1);

                  return (
                    <tr key={store} className="hover:bg-slate-50/50">
                      <td className="sticky left-0 bg-white p-4 border-b border-r border-slate-200 z-10 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm mb-2">{store}</span>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded text-[10px] border border-slate-100">
                              <span className="text-slate-500 font-bold">全スタッフ平均</span>
                              <span className="font-black text-slate-900">{avgAll}人</span>
                            </div>
                            <div className="flex justify-between items-center bg-blue-50 px-2 py-1 rounded text-[10px] border border-blue-100">
                              <span className="text-blue-600 font-bold">デビュー済み平均</span>
                              <span className="font-black text-blue-900">{avgDebuted}人</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {actualMonthDays.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const dayShifts = getShiftsForDate(dateStr);
                        const storeShifts = dayShifts.filter(shift => 
                          shift.type === "work" && 
                          shift.segments?.some(seg => seg.store === store)
                        );

                        return (
                          <td 
                            key={dateStr} 
                            className="border-b border-r border-slate-200 p-1 align-top min-h-[60px] max-w-[85px]"
                          >
                            <div className="h-full min-h-[50px] flex flex-col gap-1 p-0.5">
                              {storeShifts.map(shift => {
                                const segments = shift.segments?.filter(seg => seg.store === store) || [];
                                const isTrainee = staffList.find(sl => sl.id === shift.staff_id)?.is_trainee;
                                
                                return (
                                  <div 
                                    key={shift.id} 
                                    className={`p-1 rounded border text-[9px] leading-tight transition-all text-left bg-white
                                      ${isReadOnly ? '' : 'cursor-pointer hover:ring-1 hover:ring-slate-400'}
                                      ${isTrainee ? 'border-dashed border-slate-300 opacity-80' : getStoreBadgeClasses(store).replace('bg-', 'border-').replace('100', '200')}
                                    `}
                                    onClick={() => handleEditShift(shift)}
                                  >
                                    <div className="font-bold truncate text-[10px] mb-0.5 text-slate-700 flex items-center gap-1">
                                      {shift.staff_name}
                                      {isTrainee && <span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400 font-black">新人</span>}
                                    </div>
                                    {segments.map((seg, idx) => (
                                      <div key={idx} className="text-slate-500 font-mono">
                                        {seg.start_time}-{seg.end_time}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                              {storeShifts.length === 0 && !isReadOnly && (
                                <div 
                                  className="w-full h-full min-h-[40px] opacity-0 hover:opacity-100 flex items-center justify-center text-slate-300 cursor-pointer rounded hover:bg-slate-50"
                                  onClick={() => handleAddShift(dateStr)}
                                >
                                  <Plus size={14} />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
