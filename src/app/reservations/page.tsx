"use client";

import { useEffect, useState } from "react";
import { getReservations, Reservation } from "./actions";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { getShiftsForDate, ShiftRecord } from "@/app/shifts/actions";
import { getReservationSettings, ReservationSettings } from "@/app/admin/settings/actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw, Search, Plus } from "lucide-react";
import ReservationTimeline from "@/components/reservations/ReservationTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/lib/auth-context";

export default function ReservationsPage() {
  const { profile, selectedStore, setSelectedStore, availableStores } = useAuth();
  const [date, setDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    const initialLoad = async () => {
      try {
        const [staffData, settingsData] = await Promise.all([
          getStaffList(),
          getReservationSettings()
        ]);
        setStaffList(staffData);
        setSettings(settingsData);
      } catch (e) {
        console.error("Initial load error", e);
      }
    };
    initialLoad();
  }, []);

  const loadDateData = async () => {
    setIsFetching(true);
    if (reservations.length === 0) setLoading(true); // First time load
    try {
      const [resData, shiftsData] = await Promise.all([
        getReservations("全店舗", dateStr),
        getShiftsForDate(dateStr)
      ]);
      setReservations(resData);
      setShifts(shiftsData);
    } catch (e) {
      console.error("Date data load error", e);
    }
    setLoading(false);
    setIsFetching(false);
  };

  useEffect(() => {
    loadDateData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, selectedStore]);

  const changeDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    setDate(newDate);
  };

  const setToday = () => {
    setDate(new Date());
  };

  const currentStoreReservations = reservations.filter(r => selectedStore === "全店舗" || r.store_name === selectedStore);

  const isTenantAdmin = profile?.role === "systemOwner" || profile?.role === "admin" || profile?.role === "companyOwner";
  const allowedStores = isTenantAdmin ? availableStores : (profile?.salonIds && profile.salonIds.length > 0 ? profile.salonIds : availableStores);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-100 overflow-hidden text-xs">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-300 px-2 py-2 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 shadow-sm z-20 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-2 font-black text-slate-800 text-lg">
            <CalendarIcon className="text-blue-600 w-5 h-5" />
            予約台帳
          </div>
          
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
            <Button variant="ghost" size="sm" onClick={() => changeDate(-1)} className="h-7 px-2 text-slate-600">
              <ChevronLeft className="w-4 h-4" /> 前日
            </Button>
            <Button variant="ghost" size="sm" onClick={setToday} className="h-7 px-3 font-bold bg-white shadow-sm rounded-sm">
              今日
            </Button>
            <Button variant="ghost" size="sm" onClick={() => changeDate(1)} className="h-7 px-2 text-slate-600">
              翌日 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 text-base font-black text-slate-800 tracking-tight hover:bg-slate-100 px-2 py-1 rounded-md transition-colors">
                {format(date, "yyyy年MM月dd日(E)", { locale: ja })}
                <span className="text-[10px] text-slate-400">▼</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <select 
            value={selectedStore} 
            onChange={e => setSelectedStore(e.target.value)}
            className="h-8 px-2 border border-slate-300 rounded text-xs font-bold bg-white min-w-[100px]"
          >
            {allowedStores.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
            {isTenantAdmin && <option value="全店舗">全店舗</option>}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 w-4 h-4 text-slate-400" />
            <Input className="h-8 w-48 pl-8 text-xs bg-slate-50 border-slate-300 focus:bg-white" placeholder="顧客名・電話番号..." />
          </div>
          
          <div className="flex bg-slate-50 border border-slate-200 rounded-md overflow-hidden text-[10px] font-bold">
            <div className="px-3 py-1.5 border-r border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 mb-0.5">来店予定</span>
              <span className="text-slate-800 text-sm">{currentStoreReservations.length}<span className="text-[10px] ml-0.5">名</span></span>
            </div>
            <div className="px-3 py-1.5 border-r border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 mb-0.5">売上見込</span>
              <span className="text-slate-800 text-sm">¥{(currentStoreReservations.reduce((acc, r) => acc + (r.expected_price || 0), 0)).toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 flex flex-col items-center">
              <span className="text-slate-500 mb-0.5">稼働率</span>
              <span className="text-emerald-600 text-sm">
                {(() => {
                  // 動的な稼働率計算
                  let totalWorkMinutes = 0;
                  shifts.forEach(shift => {
                    if (shift.type === "work") {
                      (shift.segments || []).forEach(seg => {
                        const normalizedSelectedStore = selectedStore.replace(/店$/, "");
                        const normalizedSegStore = seg.store.replace(/店$/, "");
                        if (selectedStore === "全店舗" || normalizedSegStore === normalizedSelectedStore) {
                          const [h1, m1] = seg.start_time.split(":").map(Number);
                          const [h2, m2] = seg.end_time.split(":").map(Number);
                          totalWorkMinutes += (h2 * 60 + m2) - (h1 * 60 + m1);
                        }
                      });
                    }
                  });

                  let totalReservedMinutes = 0;
                  currentStoreReservations.forEach(res => {
                    if (!res.start_time || !res.end_time || res.type !== 'reservation') return;
                    const [h1, m1] = res.start_time.split(":").map(Number);
                    const [h2, m2] = res.end_time.split(":").map(Number);
                    totalReservedMinutes += (h2 * 60 + m2) - (h1 * 60 + m1);
                  });

                  const occupancy = totalWorkMinutes > 0 ? Math.round((totalReservedMinutes / totalWorkMinutes) * 100) : 0;
                  return Math.min(100, occupancy);
                })()}
                <span className="text-[10px] ml-0.5">%</span>
              </span>
            </div>
          </div>

          <Button variant="default" size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 font-bold px-4">
            <Plus className="w-4 h-4 mr-1" /> 予約追加
          </Button>
          
          <Button variant="outline" size="sm" onClick={loadDateData} className="h-8 w-8 p-0" disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Timeline Area (Takes remaining height) */}
      <div className="flex-1 overflow-hidden p-2 relative">
        {loading || !settings ? (
          <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Loading Timeline...</div>
        ) : (
          <div className={`h-full transition-opacity duration-200 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <ReservationTimeline 
              reservations={currentStoreReservations} 
              staffList={staffList.filter(s => {
                if (selectedStore === "全店舗") {
                  if (!s.salonIds || s.salonIds.length === 0) return true;
                  return s.salonIds.some(st => allowedStores.includes(st));
                }
                if (!s.salonIds || s.salonIds.length === 0) return true;
                return s.salonIds.includes(selectedStore);
              })} 
              shifts={shifts}
              date={dateStr}
              storeName={selectedStore}
              settings={settings || undefined}
              onRefresh={loadDateData}
              onOptimisticUpdate={(updated) => setReservations(prev => prev.map(r => r.id === updated.id ? updated : r))}
            />
          </div>
        )}
      </div>

    </div>
  );
}
