"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordClockIn, recordClockOut } from "@/app/attendance/actions";

export default function KioskAttendancePage() {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<{id: string, name: string} | null>(null);

  const STAFF_LIST = [
    { id: "e4f5g678-9012-3456-7890-123456789012", name: "柴田" },
    { id: "a1a2a3a4-1111-2222-3333-444455556666", name: "佐藤" },
    { id: "b1b2b3b4-1111-2222-3333-444455556666", name: "北野" },
    { id: "c1c2c3c4-1111-2222-3333-444455556666", name: "大谷" },
    { id: "x1c2c3c4-1111-2222-3333-444455556666", name: "樋口" },
    { id: "y1c2c3c4-1111-2222-3333-444455556666", name: "稲葉" },
    { id: "z1c2c3c4-1111-2222-3333-444455556666", name: "上垣" },
    { id: "v1c2c3c4-1111-2222-3333-444455556666", name: "萩原" },
  ];

  useEffect(() => {
    // Update live clock
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("ja-JP", { hour12: false }));
      setCurrentDate(now.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = async () => {
    if (!selectedStaff) return;
    setLoading(true);
    await recordClockIn(selectedStaff.id, selectedStaff.name);
    setTimeout(() => {
      setMessage(`【${selectedStaff.name}】出勤を打刻しました！今日も一日よろしくお願いします。`);
      setLoading(false);
      setSelectedStaff(null);
      setTimeout(() => setMessage(""), 5000);
    }, 500);
  };

  const handleClockOut = async () => {
    if (!selectedStaff) return;
    setLoading(true);
    await recordClockOut(selectedStaff.id);
    setTimeout(() => {
      setMessage(`【${selectedStaff.name}】退勤を打刻しました！お疲れ様でした。`);
      setLoading(false);
      setSelectedStaff(null);
      setTimeout(() => setMessage(""), 5000);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 min-h-[600px]">
        {/* Left Side: Clock Panel */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 p-12 text-white flex flex-col items-center justify-center h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          
          <div className="z-10 text-center w-full">
            <h1 className="text-3xl font-bold tracking-widest text-indigo-200 mb-8 w-full border-b border-indigo-700/50 pb-6 flex items-center justify-center gap-3">
              <Clock size={32} />
              JASMINE LASH タイムカード
            </h1>
            <p className="text-3xl text-indigo-300 font-medium mb-4">{currentDate}</p>
            <h2 className="text-7xl lg:text-[8rem] font-black tracking-tight font-mono leading-none drop-shadow-xl">{currentTime || "--:--:--"}</h2>
            
            {message && (
              <div className="mt-12 bg-white/10 backdrop-blur-md text-white p-6 rounded-2xl text-xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-2xl border border-white/20">
                <CheckCircle2 size={32} className="text-emerald-400" />
                <span className="text-left leading-tight">{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interaction Panel */}
        <div className="p-10 lg:p-14 h-full flex flex-col">
          <h3 className="text-2xl font-bold text-slate-800 mb-2 border-b-4 border-indigo-500 inline-block pb-1">スタッフ選択</h3>
          <p className="text-slate-500 mb-8">名前をタップしてから、出退勤ボタンを押してください。</p>
          
          <div className="grid grid-cols-4 gap-3 mb-auto">
            {STAFF_LIST.map((staff) => (
              <button
                key={staff.id}
                onClick={() => setSelectedStaff(staff)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 aspect-square ${
                  selectedStaff?.id === staff.id 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black shadow-lg transform scale-105' 
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50 font-bold'
                }`}
              >
                <span className="text-xl">{staff.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 mt-12 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <Button 
              onClick={handleClockIn} 
              disabled={loading || !selectedStaff}
              className="h-28 rounded-2xl flex flex-col gap-2 bg-gradient-to-br from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-xl disabled:opacity-40 transition-all text-3xl font-black"
            >
              出勤
            </Button>

            <Button 
              onClick={handleClockOut} 
              disabled={loading || !selectedStaff}
              className="h-28 rounded-2xl flex flex-col gap-2 bg-gradient-to-br from-rose-500 to-rose-400 hover:from-rose-600 hover:to-rose-500 text-white shadow-xl disabled:opacity-40 transition-all text-3xl font-black"
            >
              退勤
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
