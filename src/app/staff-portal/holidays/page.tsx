"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { submitHolidayRequest } from "@/app/shifts/actions";

export default function StaffPortalHolidaysPage() {
  const [currentDate] = useState(new Date());
  const { profile } = useAuth();
  
  const targetMonthOffset = currentDate.getDate() <= 20 ? 2 : 3;
  const targetMonthDate = addMonths(currentDate, targetMonthOffset);
  const deadlineDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() - 2, 20);

  const [maxRequests] = useState(3);
  const [requestedDays, setRequestedDays] = useState<string[]>([]);
  const [paidLeaveDays, setPaidLeaveDays] = useState<string[]>([]);
  const [requestMode, setRequestMode] = useState<"regular" | "pto">("regular");
  const [submitted, setSubmitted] = useState(false);

  const monthStart = startOfMonth(targetMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const toggleDay = (dateStr: string) => {
    if (requestMode === "regular") {
       if (paidLeaveDays.includes(dateStr)) return;
       setRequestedDays(prev => {
         if (prev.includes(dateStr)) {
           return prev.filter(d => d !== dateStr);
         } else {
           if (prev.length >= maxRequests) {
             alert(`希望休は${maxRequests}日までしか選択できません。それ以上はマネージャーへ直接ご相談ください。`);
             return prev;
           }
           return [...prev, dateStr];
         }
       });
    } else {
       if (requestedDays.includes(dateStr)) return;
       setPaidLeaveDays(prev => {
         if (prev.includes(dateStr)) {
           return prev.filter(d => d !== dateStr);
         } else {
           return [...prev, dateStr];
         }
       });
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitted(true);
    
    try {
      const promises = [];
      
      for (const date of requestedDays) {
        promises.push(submitHolidayRequest({
          staff_id: profile.id,
          staff_name: profile.name,
          date,
        }));
      }
      
      for (const date of paidLeaveDays) {
        promises.push(submitHolidayRequest({
          staff_id: profile.id,
          staff_name: profile.name,
          date,
          reason: "有給休暇"
        }));
      }
      
      await Promise.all(promises);
      
      alert("希望休を提出しました！");
      setRequestedDays([]);
      setPaidLeaveDays([]);
    } catch (error) {
      alert("エラーが発生しました。もう一度やり直してください。");
    } finally {
      setSubmitted(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-br from-rose-500 to-pink-500 p-6 text-white pb-8">
        <h1 className="text-xl font-bold mb-1">希望休の提出</h1>
        <p className="opacity-90 text-sm">カレンダーをタップして希望休を選択してください。</p>
      </div>

      <div className="-mt-4 px-4">
        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4 mb-4">
          <div className="flex items-center gap-2 text-rose-600 font-bold mb-2">
            <CalendarIcon size={18} />
            <h2>{format(targetMonthDate, "yyyy年M月", { locale: ja })} のシフト</h2>
          </div>
          <div className="flex flex-col gap-2 bg-rose-50 p-3 rounded-lg text-rose-800 text-xs">
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">
                {format(deadlineDate, "M月d日", { locale: ja })}までに提出を完了してください。
              </p>
            </div>
            <p className="ml-5 leading-relaxed font-bold">
              ※ 希望休は {maxRequests} 日まで可能です。有給申請は無制限ですが店長の承認が必要です。
            </p>
          </div>
          
          <div className="flex p-1 bg-slate-100 rounded-lg mt-4 shadow-inner">
            <button 
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${requestMode === "regular" ? "bg-white shadow-sm text-rose-600" : "text-slate-500"}`}
              onClick={() => setRequestMode("regular")}
            >
              通常の希望休
            </button>
            <button 
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${requestMode === "pto" ? "bg-white shadow-sm text-emerald-600" : "text-slate-500"}`}
              onClick={() => setRequestMode("pto")}
            >
              有給休暇など
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {["月", "火", "水", "木", "金", "土", "日"].map((day, i) => (
              <div key={day} className={`py-2 text-center text-[10px] font-bold ${
                i === 5 ? "text-blue-600" : i === 6 ? "text-rose-600" : "text-slate-500"
              }`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 p-1 gap-1">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(day, targetMonthDate);
              const isSelectedRegular = requestedDays.includes(dateStr);
              const isSelectedPto = paidLeaveDays.includes(dateStr);
              const isSelected = isSelectedRegular || isSelectedPto;

              if (!isCurrentMonth) {
                return (
                  <div key={day.toString()} className="aspect-square flex items-center justify-center p-1 opacity-0">
                  </div>
                );
              }

              return (
                <button 
                  key={day.toString()} 
                  onClick={() => toggleDay(dateStr)}
                  className={`
                    w-full aspect-square rounded-full flex flex-col items-center justify-center transition-all duration-200 relative
                    ${isSelectedRegular ? 'bg-rose-500 text-white shadow-md transform scale-105' : ''}
                    ${isSelectedPto ? 'bg-emerald-500 text-white shadow-md transform scale-105' : ''}
                    ${!isSelected ? 'bg-white text-slate-700 hover:bg-slate-100' : ''}
                  `}
                >
                  <span className={`text-sm font-semibold ${!isSelected && (day.getDay()===0 ? 'text-rose-500' : day.getDay()===6 ? 'text-blue-500' : '')}`}>
                    {format(day, "d")}
                  </span>
                  {isSelectedRegular && (
                    <span className="text-[8px] opacity-90 mt-0.5 font-medium leading-none">休</span>
                  )}
                  {isSelectedPto && (
                    <span className="text-[8px] opacity-90 mt-0.5 font-bold leading-none">有給</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] w-full block sm:hidden pb-safe">
        <Button 
          className="w-full h-12 text-base font-bold rounded-xl shadow-md gap-2" 
          onClick={handleSubmit}
          disabled={submitted || (requestedDays.length === 0 && paidLeaveDays.length === 0)}
        >
           {submitted ? "送信中..." : `提出する (希望休${requestedDays.length}日/有給${paidLeaveDays.length}日)`}
        </Button>
      </div>

      <div className="mt-6 px-4 hidden sm:block">
        <Button 
          className="w-full h-12 text-base font-bold rounded-xl shadow-md gap-2" 
          onClick={handleSubmit}
          disabled={submitted || (requestedDays.length === 0 && paidLeaveDays.length === 0)}
        >
          {submitted ? "送信中..." : `提出する (希望休${requestedDays.length}日/有給${paidLeaveDays.length}日)`}
        </Button>
      </div>
    </div>
  );
}
