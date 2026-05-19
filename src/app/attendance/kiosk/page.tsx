"use client";

import { useState, useEffect, Suspense } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordClockIn, recordClockOut, getDailyAttendance } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  User, 
  CheckCircle2, 
  ArrowRightLeft, 
  LogOut, 
  LogIn,
  Sparkles,
  Loader2,
  MapPin,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

function KioskContent() {
  const searchParams = useSearchParams();
  const storeName = searchParams.get("store") || "未設定";
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [authStaff, setAuthStaff] = useState<{ id: string; name: string; isClockedIn: boolean } | null>(null);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadData();
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const [staffSnap, attRecords] = await Promise.all([
        getDocs(query(collection(db, "staff_profiles"), orderBy("name", "asc"))),
        getDailyAttendance(today)
      ]);

      const staff = staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const attMap: Record<string, any> = {};
      attRecords.forEach(rec => {
        if (!rec.clock_out) {
          attMap[rec.staff_id] = rec;
        }
      });

      setStaffList(staff);
      setAttendanceMap(attMap);
    } catch (error) {
      console.error(error);
      toast.error("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const executeClockAction = async (staffId: string, staffName: string, isClockedIn: boolean) => {
    setProcessing(staffId);
    try {
      if (isClockedIn) {
        const res = await recordClockOut(staffId);
        if (res.success) {
          toast.success(`${staffName}さん、お疲れ様でした！`);
        }
      } else {
        const res = await recordClockIn(staffId, staffName, storeName);
        if (res.success) {
          toast.success(`${staffName}さん、おはようございます！ (${storeName}店)`);
        }
      }
      await loadData();
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setProcessing(null);
    }
  };

  const handleClockAction = async (staffId: string, staffName: string, isClockedIn: boolean) => {
    setAuthStaff({ id: staffId, name: staffName, isClockedIn });
    setPasswordInput("");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authStaff) return;
    
    // Find the staff in memory
    const staff = staffList.find(s => s.id === authStaff.id);
    const requiredPasscode = staff?.passcode || "1234";
    
    if (passwordInput === requiredPasscode) {
      const targetStaff = authStaff;
      setAuthStaff(null);
      await executeClockAction(targetStaff.id, targetStaff.name, targetStaff.isClockedIn);
    } else {
      toast.error("暗証番号（パスコード）が正しくありません");
    }
  };

  // Scanner removed as requested

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="font-bold animate-pulse">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 font-sans overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                <Clock className="text-white w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">STORE TIMECARD</h1>
            </div>
            
            <div className="flex items-center justify-center md:justify-start gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
              <MapPin size={16} className="text-emerald-400" />
              <span className="text-lg font-black text-white tracking-tight">{storeName}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">Terminal Active</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex flex-col items-center md:items-end min-w-[280px]">
            <div className="text-5xl font-black text-white tabular-nums tracking-tighter mb-1">
              {format(currentTime, "HH:mm:ss")}
            </div>
            <div className="text-emerald-400 font-black tracking-wider">
              {format(currentTime, "yyyy.MM.dd (E)", { locale: ja })}
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((staff) => {
            const currentAtt = attendanceMap[staff.id];
            const isClockedIn = !!currentAtt;

            return (
              <motion.div
                key={staff.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className={`relative overflow-hidden rounded-[2rem] border-none shadow-2xl transition-all duration-500 ${
                  isClockedIn 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white' 
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}>
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-8">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black shadow-inner ${
                        isClockedIn ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
                      }`}>
                        {staff.name[0]}
                      </div>
                      {isClockedIn && (
                        <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                          WORKING @ {currentAtt.store || storeName}
                        </div>
                      )}
                    </div>

                    <div className="mb-8">
                      <h3 className={`text-2xl font-black mb-1 truncate ${isClockedIn ? 'text-white' : 'text-slate-100'}`}>
                        {staff.name}
                      </h3>
                      <p className={`text-xs font-bold tracking-wider uppercase ${isClockedIn ? 'text-white/60' : 'text-slate-500'}`}>
                        {staff.role || "Staff"}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {processing === staff.id ? (
                        <Button disabled className="w-full h-16 rounded-2xl bg-white/20">
                          <Loader2 className="animate-spin mr-2" /> 処理中...
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleClockAction(staff.id, staff.name, isClockedIn)}
                          className={`w-full h-16 rounded-2xl font-black text-lg shadow-xl transition-all ${
                            isClockedIn 
                            ? 'bg-white text-emerald-700 hover:bg-slate-100 shadow-emerald-900/40' 
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-900/20'
                          }`}
                        >
                          {isClockedIn ? (
                            <><LogOut className="mr-2" /> 退勤する</>
                          ) : (
                            <><LogIn className="mr-2" /> 出勤する</>
                          )}
                        </Button>
                      )}
                      
                      {isClockedIn && (
                        <div className="text-center text-[10px] font-bold text-white/60 mt-4 flex items-center justify-center gap-1">
                          <Clock size={10} /> 出勤時刻: {format(new Date(currentAtt.clock_in), "HH:mm")}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Decorative Background Icon */}
                  <div className="absolute -bottom-4 -right-4 opacity-5">
                    <User size={120} />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2">
            <Sparkles size={14} className="text-emerald-500/40" />
            Designed for JASMINE LASH STORE TERMINAL
          </p>
        </div>
      </div>



      {/* 暗証番号入力モーダル */}
      <AnimatePresence>
        {authStaff && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 flex flex-col items-center justify-center p-6 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-white">暗証番号（PIN）の入力</h3>
                <p className="text-xs font-semibold text-slate-400">
                  {authStaff.name} 様、打刻（{authStaff.isClockedIn ? "退勤" : "出勤"}）を行います。<br />
                  ご自身の暗証番号を入力してください。
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="暗証番号を入力"
                    className="w-full h-14 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-black text-center placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-2xl tracking-widest"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button"
                    onClick={() => setAuthStaff(null)}
                    variant="ghost"
                    className="flex-1 h-12 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    キャンセル
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!passwordInput}
                    className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    認証して打刻
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function AttendanceKioskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <KioskContent />
    </Suspense>
  );
}
