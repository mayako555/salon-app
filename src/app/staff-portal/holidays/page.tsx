"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { submitHolidayRequest, getStaffHolidayRequests } from "@/app/shifts/actions";
import { useEffect } from "react";

export default function StaffPortalHolidaysPage() {
  const [currentDate] = useState(new Date());
  const { profile } = useAuth();
  
  const targetMonthOffset = currentDate.getDate() <= 20 ? 2 : 3;
  const targetMonthDate = addMonths(currentDate, targetMonthOffset);
  const deadlineDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() - 2, 20);

  const maxRequests = profile?.max_holiday_requests ?? 3;
  const [requestedDays, setRequestedDays] = useState<Record<string, number>>({});
  const [paidLeaveDays, setPaidLeaveDays] = useState<Record<string, number>>({});
  const [requestMode, setRequestMode] = useState<"regular" | "pto">("regular");
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    if (!profile?.id) return;
    setLoadingHistory(true);
    try {
      const data = await getStaffHolidayRequests(profile.id);
      setHistory(data);
    } catch (e) {
      console.error("Failed to load holiday requests history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [profile?.id]);

  const monthStart = startOfMonth(targetMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const toggleDay = (dateStr: string) => {
    if (requestMode === "regular") {
       if (paidLeaveDays[dateStr]) return;
       setRequestedDays(prev => {
         const current = prev[dateStr] || 0;
         const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);
         const available = maxRequests - currentTotal + current;

         let next = 0;
         if (current === 0) {
            if (available >= 1) next = 1;
            else if (available >= 0.5) next = 0.5;
            else next = 1; // let it fail below
         }
         else if (current === 1) next = 0.5;
         else next = 0;
         
         const total = currentTotal - current + next;
         
         if (next > current && total > maxRequests) {
           alert(`希望休は${maxRequests}日までしか選択できません。それ以上はマネージャーへ直接ご相談ください。`);
           return prev;
         }
         const newObj = { ...prev };
         if (next === 0) delete newObj[dateStr];
         else newObj[dateStr] = next;
         return newObj;
       });
    } else {
       if (requestedDays[dateStr]) return;
       setPaidLeaveDays(prev => {
         const current = prev[dateStr] || 0;
         const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);
         const balance = profile?.paid_leave_balance ?? 0;
         const available = balance - currentTotal + current;

         let next = 0;
         if (current === 0) {
            if (available >= 1) next = 1;
            else if (available >= 0.5) next = 0.5;
            else next = 1; // let it fail below
         }
         else if (current === 1) next = 0.5;
         else next = 0;

         const total = currentTotal - current + next;
         
         if (next > current && total > balance) {
           alert(`有給残日数（${balance}日）を超えて申請することはできません。`);
           return prev;
         }
         const newObj = { ...prev };
         if (next === 0) delete newObj[dateStr];
         else newObj[dateStr] = next;
         return newObj;
       });
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitted(true);
    
    try {
      const promises = [];
      
      for (const [date, amount] of Object.entries(requestedDays)) {
        promises.push(submitHolidayRequest({
          staff_id: profile.id,
          staff_name: profile.name,
          date,
          amount
        }));
      }
      
      for (const [date, amount] of Object.entries(paidLeaveDays)) {
        promises.push(submitHolidayRequest({
          staff_id: profile.id,
          staff_name: profile.name,
          date,
          amount,
          reason: "有給休暇"
        }));
      }
      
      await Promise.all(promises);
      
      alert("希望休を提出しました！");
      setRequestedDays({});
      setPaidLeaveDays({});
      await loadHistory();
    } catch (error) {
      alert("エラーが発生しました。もう一度やり直してください。");
    } finally {
      setSubmitted(false);
    }
  };

  return (
    <div className="pb-36">
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
              ※ 希望休は {maxRequests} 日まで可能です。
            </p>
            <p className="ml-5 leading-relaxed font-bold text-amber-600">
              ※ 現在の有給残日数: {profile?.paid_leave_balance ?? 0} 日
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
              const regularAmount = requestedDays[dateStr];
              const ptoAmount = paidLeaveDays[dateStr];
              const isSelectedRegular = !!regularAmount;
              const isSelectedPto = !!ptoAmount;
              const isSelected = isSelectedRegular || isSelectedPto;
              const isHalf = regularAmount === 0.5 || ptoAmount === 0.5;

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
                    <span className="text-[8px] opacity-90 mt-0.5 font-medium leading-none">{regularAmount === 0.5 ? "半休" : "休"}</span>
                  )}
                  {isSelectedPto && (
                    <span className="text-[8px] opacity-90 mt-0.5 font-bold leading-none">{ptoAmount === 0.5 ? "半有給" : "有給"}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">提出済みの申請・状況</h3>
            {loadingHistory ? (
              <p className="text-xs text-slate-400">履歴を読み込み中...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400">提出済みの希望休申請はありません。</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {history.map((req) => (
                  <div key={req.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{req.date}</span>
                      <span className="text-[10px] text-slate-400">
                        {req.reason === "有給休暇" ? "有給休暇" : `希望公休 (${req.amount || 1}日)`}
                      </span>
                    </div>
                    <div>
                      {req.status === "pending" ? (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full font-black">
                          申請中（未承認）
                        </span>
                      ) : req.status === "approved" ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full font-black">
                          承認済み
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-full font-black">
                          却下
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-[64px] left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 shadow-[0_-10px_15px_-3px_rgb(0,0,0,0.05)] w-full block sm:hidden z-30 pb-safe">
        <Button 
          className="w-full h-12 text-base font-bold rounded-xl shadow-md gap-2" 
          onClick={handleSubmit}
          disabled={submitted || (Object.keys(requestedDays).length === 0 && Object.keys(paidLeaveDays).length === 0)}
        >
           {submitted ? "送信中..." : `選択を完了して提出 (希望休${Object.values(requestedDays).reduce((a,b)=>a+b,0)}日/有給${Object.values(paidLeaveDays).reduce((a,b)=>a+b,0)}日)`}
        </Button>
      </div>

      <div className="mt-6 px-4 hidden sm:block">
        <Button 
          className="w-full h-12 text-base font-bold rounded-xl shadow-md gap-2" 
          onClick={handleSubmit}
          disabled={submitted || (Object.keys(requestedDays).length === 0 && Object.keys(paidLeaveDays).length === 0)}
        >
          {submitted ? "送信中..." : `提出する (希望休${Object.values(requestedDays).reduce((a,b)=>a+b,0)}日/有給${Object.values(paidLeaveDays).reduce((a,b)=>a+b,0)}日)`}
        </Button>
      </div>
    </div>
  );
}
