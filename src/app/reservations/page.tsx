"use client";

import { useEffect, useState } from "react";
import { getReservations, Reservation } from "./actions";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { getMonthlyShifts, ShiftRecord } from "@/app/shifts/actions";
import { getReservationSettings, ReservationSettings } from "@/app/admin/settings/actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw, Search, Plus, Bell, MessageCircle, Star } from "lucide-react";
import ReservationTimeline from "@/components/reservations/ReservationTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ReservationsPage() {
  const [date, setDate] = useState(new Date());
  const [store, setStore] = useState("六甲");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const dateStr = format(date, "yyyy-MM-dd");

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, staffData, shiftsData, settingsData] = await Promise.all([
        getReservations(store, dateStr),
        getStaffList(),
        getMonthlyShifts(date.getFullYear(), date.getMonth() + 1),
        getReservationSettings()
      ]);
      setReservations(resData);
      setStaffList(staffData);
      setSettings(settingsData);
      
      // Filter shifts for the selected date
      const dailyShifts = shiftsData.filter(s => s.date === dateStr);
      setShifts(dailyShifts);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, store]);

  const changeDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    setDate(newDate);
  };

  const setToday = () => {
    setDate(new Date());
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden text-xs">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-300 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
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

          <div className="text-base font-black text-slate-800 tracking-tight">
            {format(date, "yyyy年MM月dd日(E)", { locale: ja })}
          </div>

          <select 
            value={store} 
            onChange={e => setStore(e.target.value)}
            className="h-8 px-2 border border-slate-300 rounded text-xs font-bold bg-white min-w-[100px]"
          >
            <option value="六甲">六甲店</option>
            <option value="神戸">神戸店</option>
            <option value="元町">元町店</option>
            <option value="全店舗">全店舗</option>
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
              <span className="text-slate-800 text-sm">{reservations.length}<span className="text-[10px] ml-0.5">名</span></span>
            </div>
            <div className="px-3 py-1.5 border-r border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 mb-0.5">売上見込</span>
              <span className="text-slate-800 text-sm">¥{(reservations.reduce((acc, r) => acc + (r.expected_price || 0), 0)).toLocaleString()}</span>
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
                        if (store === "全店舗" || seg.store === store) {
                          const [h1, m1] = seg.start_time.split(":").map(Number);
                          const [h2, m2] = seg.end_time.split(":").map(Number);
                          totalWorkMinutes += (h2 * 60 + m2) - (h1 * 60 + m1);
                        }
                      });
                    }
                  });

                  let totalReservedMinutes = 0;
                  reservations.forEach(res => {
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
          
          <Button variant="outline" size="sm" onClick={loadData} className="h-8 w-8 p-0" disabled={loading}>
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Timeline Area (Takes remaining height) */}
      <div className="flex-1 overflow-hidden p-2 relative">
        {loading || !settings ? (
          <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Loading Timeline...</div>
        ) : (
          <ReservationTimeline 
            reservations={reservations} 
            staffList={staffList} 
            shifts={shifts}
            date={dateStr}
            storeName={store}
            settings={settings}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* Sticky Notification Footer */}
      <div className="bg-slate-800 text-white px-4 h-10 flex items-center justify-between shrink-0 text-[10px] font-bold z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400 border-r border-slate-600 pr-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            正常稼働
          </div>
          
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Bell className="w-3.5 h-3.5 text-blue-400" /> 空き枠: 3枠</span>
            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> LINE未送信: 5件</span>
            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Star className="w-3.5 h-3.5 text-amber-400" /> 口コミ未返信: 2件</span>
            <span className="flex items-center gap-1 hover:text-white cursor-pointer text-purple-300"><CalendarIcon className="w-3.5 h-3.5" /> 次回未設定: 4件</span>
            <span className="flex items-center gap-1 hover:text-white cursor-pointer text-rose-300">会計未完了: 1件</span>
            <span className="flex items-center gap-1 hover:text-white cursor-pointer text-red-400">要注意: 1件</span>
          </div>
        </div>
        
        {/* Quick Links */}
        <div className="flex items-center gap-4 text-slate-400">
           <span className="hover:text-white cursor-pointer transition-colors">予約</span>
           <span className="hover:text-white cursor-pointer transition-colors">顧客</span>
           <span className="hover:text-white cursor-pointer transition-colors">売上</span>
           <span className="hover:text-white cursor-pointer transition-colors">シフト</span>
           <span className="hover:text-white cursor-pointer transition-colors">KPI</span>
           <span className="hover:text-white cursor-pointer transition-colors">教育</span>
           <span className="hover:text-white cursor-pointer transition-colors">給与</span>
        </div>
      </div>
    </div>
  );
}
