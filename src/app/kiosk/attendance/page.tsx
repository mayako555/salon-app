"use client";

import { useState, useEffect, Suspense } from "react";
import { Clock, CheckCircle2, AlertCircle, Coffee, Briefcase, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getKioskStaffList, verifyKioskToken, recordKioskAction } from "@/app/attendance/actions";
import { useSearchParams } from "next/navigation";

function KioskApp() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId");
  const storeId = searchParams.get("storeId");
  const token = searchParams.get("token");

  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<{id: string, name: string} | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    // Update live clock
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("ja-JP", { hour12: false }));
      setCurrentDate(now.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function init() {
      if (!companyId || !storeId || !token) {
        setErrorMsg("無効なURLです。必要なパラメータが不足しています。");
        setInitializing(false);
        return;
      }

      const isValid = await verifyKioskToken(companyId, storeId, token);
      if (!isValid) {
        setErrorMsg("無効なURLまたはトークンです。システム管理者にご確認ください。");
        setInitializing(false);
        return;
      }

      const list = await getKioskStaffList(companyId);
      setStaffList(list);
      setInitializing(false);
    }
    init();
  }, [companyId, storeId, token]);

  const handleAction = async (actionType: "IN" | "OUT" | "BREAK_START" | "BREAK_END", label: string) => {
    if (!selectedStaff || !companyId || !storeId) return;
    setLoading(true);
    const res = await recordKioskAction(companyId, storeId, selectedStaff.id, selectedStaff.name, actionType);
    
    if (res.success) {
      setMessage(`【${selectedStaff.name}】${label} を打刻しました。`);
    } else {
      setMessage(`【エラー】${res.error}`);
    }
    
    setTimeout(() => {
      setLoading(false);
      setSelectedStaff(null);
      setTimeout(() => setMessage(""), 5000);
    }, 1500);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold animate-pulse tracking-widest uppercase">Initializing Terminal...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center max-w-lg text-center border border-red-100">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">アクセスが拒否されました</h1>
          <p className="text-slate-500 font-bold">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 min-h-[700px]">
        {/* Left Side: Clock Panel */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 p-12 text-white flex flex-col items-center justify-center relative overflow-hidden h-full">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          
          <div className="z-10 text-center w-full mt-auto">
            <h1 className="text-xl lg:text-2xl font-bold tracking-widest text-indigo-200 mb-8 w-full border-b border-indigo-700/50 pb-6 flex flex-col items-center justify-center gap-3">
              <Clock size={32} className="text-indigo-400" />
              {storeId} タイムカード
            </h1>
            <p className="text-2xl lg:text-3xl text-indigo-300 font-medium mb-4">{currentDate}</p>
            <h2 className="text-6xl lg:text-[7rem] font-black tracking-tight font-mono leading-none drop-shadow-xl">{currentTime || "--:--:--"}</h2>
          </div>

          <div className="mt-auto pt-12 w-full h-32 flex items-end justify-center">
            {message && (
              <div className="bg-white/10 backdrop-blur-md text-white p-6 rounded-2xl text-lg font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-2xl border border-white/20 w-full justify-center">
                {message.includes("エラー") ? <AlertCircle className="text-rose-400" size={24} /> : <CheckCircle2 size={24} className="text-emerald-400" />}
                <span className="text-left leading-tight truncate">{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interaction Panel */}
        <div className="lg:col-span-3 p-10 lg:p-12 flex flex-col bg-slate-50/50">
          <div className="mb-8">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</div>
              スタッフを選択
            </h3>
            <p className="text-slate-500 font-bold ml-11 mt-1 text-sm">名前をタップして選択状態にしてください。</p>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-10 overflow-y-auto pr-2 max-h-[300px]">
            {staffList.map((staff) => (
              <button
                key={staff.id}
                onClick={() => setSelectedStaff(staff)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                  selectedStaff?.id === staff.id 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black shadow-md transform scale-105' 
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50 font-bold'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 text-lg ${selectedStaff?.id === staff.id ? 'bg-indigo-200' : 'bg-slate-100'}`}>
                  {staff.name.charAt(0)}
                </div>
                <span className="text-sm truncate w-full text-center">{staff.name}</span>
              </button>
            ))}
            {staffList.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 font-bold">
                スタッフが登録されていません
              </div>
            )}
          </div>

          <div className="mt-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</div>
                打刻アクション
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => handleAction("IN", "出勤")} 
                disabled={loading || !selectedStaff}
                className="h-24 rounded-2xl flex flex-col gap-1 bg-gradient-to-br from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-lg disabled:opacity-40 transition-all text-2xl font-black"
              >
                <LogIn size={24} className="opacity-50" /> 出勤
              </Button>

              <Button 
                onClick={() => handleAction("OUT", "退勤")} 
                disabled={loading || !selectedStaff}
                className="h-24 rounded-2xl flex flex-col gap-1 bg-gradient-to-br from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white shadow-lg disabled:opacity-40 transition-all text-2xl font-black"
              >
                <LogOut size={24} className="opacity-50" /> 退勤
              </Button>

              <Button 
                onClick={() => handleAction("BREAK_START", "休憩開始")} 
                disabled={loading || !selectedStaff}
                variant="outline"
                className="h-20 rounded-2xl flex flex-col gap-1 border-2 border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 shadow-sm disabled:opacity-40 transition-all text-lg font-black"
              >
                <Coffee size={20} className="opacity-50" /> 休憩開始
              </Button>

              <Button 
                onClick={() => handleAction("BREAK_END", "休憩終了")} 
                disabled={loading || !selectedStaff}
                variant="outline"
                className="h-20 rounded-2xl flex flex-col gap-1 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-sm disabled:opacity-40 transition-all text-lg font-black"
              >
                <Briefcase size={20} className="opacity-50" /> 休憩終了
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KioskAttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold animate-pulse">Loading...</div>}>
      <KioskApp />
    </Suspense>
  );
}
