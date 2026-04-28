"use client";

import { useEffect, useState } from "react";
import { getStaffPerformanceStats } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Target, 
  CalendarDays, 
  Banknote,
  Users,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import AuthGuard from "@/components/AuthGuard";

export default function PerformancePage() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();

  useEffect(() => {
    async function load() {
      const res = await getStaffPerformanceStats(now.getFullYear(), now.getMonth() + 1);
      if (res.success) {
        setStats(res.data);
      } else {
        toast.error("データの取得に失敗しました");
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-bold">分析中...</div>;

  return (
    <AuthGuard requireRole="manager">
      <div className="space-y-8 pb-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <TrendingUp className="text-emerald-500" size={32} />
            スタッフ売上目標管理
          </h1>
          <p className="text-slate-500 font-medium">今月の売上達成状況と必要平均単価の分析</p>
        </div>

        <div className="grid gap-6">
          {stats.map((staff) => {
            const progress = staff.target > 0 ? Math.min(100, (staff.currentTotal / staff.target) * 100) : 0;
            
            return (
              <Card key={staff.staffId} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-3xl">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xl font-black shadow-lg">
                        {staff.staffName[0]}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">{staff.staffName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Monthly Target</span>
                          <span className="text-sm font-bold text-slate-700">¥{staff.target.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:flex gap-4 w-full md:w-auto">
                      <div className="bg-emerald-50 p-4 rounded-2xl flex-1 md:min-w-[140px]">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Current Sales</p>
                        <p className="text-lg font-black text-emerald-700">¥{staff.currentTotal.toLocaleString()}</p>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-2xl flex-1 md:min-w-[140px]">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Remaining</p>
                        <p className="text-lg font-black text-rose-700">¥{staff.remaining.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-8">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                      <span>Progress</span>
                      <span className={progress >= 100 ? "text-emerald-500" : "text-slate-600"}>
                        {progress.toFixed(1)}% {progress >= 100 && "COMPLETED"}
                      </span>
                    </div>
                    <Progress value={progress} className="h-3 rounded-full bg-slate-100" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <CalendarDays size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">残り出勤日数</p>
                        <p className="font-black text-slate-700">{staff.remainingDays} 日</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl md:col-span-2">
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <Banknote size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1日あたりの必要売上平均</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-black text-slate-900">¥{staff.requiredDailyAvg.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-slate-400">/ day</span>
                        </div>
                      </div>
                      {staff.remainingDays > 0 && staff.remaining > 0 && (
                        <ArrowRight className="text-slate-200" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {stats.length === 0 && (
          <Card className="p-12 text-center rounded-[3rem] border-dashed border-2 border-slate-200 bg-transparent">
            <Users className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No staff targets set</p>
            <p className="text-slate-300 text-[10px] mt-1">スタッフ管理画面から月間目標額を設定してください。</p>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
