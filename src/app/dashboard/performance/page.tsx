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

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateStaffMonthlyTarget } from "./actions";

export default function PerformancePage() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  async function load() {
    setLoading(true);
    const res = await getStaffPerformanceStats(year, month);
    if (res.success && res.data) {
      setStats(res.data);
      // Initialize editing targets
      const targets: Record<string, number> = {};
      res.data.forEach((s: any) => targets[s.staffId] = s.target);
      setEditingTargets(targets);
    } else if (!res.success) {
      toast.error("データの取得に失敗しました");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const handleSaveTargets = async () => {
    setIsSaving(true);
    try {
      const promises = Object.entries(editingTargets).map(([staffId, target]) => 
        updateStaffMonthlyTarget(staffId, year, month, target)
      );
      await Promise.all(promises);
      toast.success("月間目標を更新しました");
      setIsTargetDialogOpen(false);
      load();
    } catch (err) {
      toast.error("保存に失敗しました");
    }
    setIsSaving(false);
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-bold">分析中...</div>;

  return (
    <AuthGuard requireRole="manager">
      <div className="space-y-8 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <TrendingUp className="text-emerald-500" size={32} />
              スタッフ売上目標管理
            </h1>
            <p className="text-slate-500 font-medium">
              {year}年{month}月の売上達成状況
            </p>
          </div>

          <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 rounded-2xl h-12 px-6 font-black gap-2 shadow-lg hover:shadow-xl transition-all">
                <Target size={18} />
                目標を設定する
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] max-h-[85vh] flex flex-col overflow-hidden p-0">
              <DialogHeader className="p-8 pb-0">
                <DialogTitle className="text-xl font-black">{month}月の目標設定</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-4">
                {stats.map(staff => (
                  <div key={staff.staffId} className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl">
                    <span className="font-bold text-slate-700">{staff.staffName}</span>
                    <div className="relative w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">¥</span>
                      <Input 
                        type="number"
                        className="pl-8 h-10 rounded-xl font-black text-right"
                        value={editingTargets[staff.staffId] || 0}
                        onChange={e => setEditingTargets({...editingTargets, [staff.staffId]: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter className="p-8 pt-0 gap-2">
                <Button variant="outline" onClick={() => setIsTargetDialogOpen(false)} disabled={isSaving} className="rounded-xl">キャンセル</Button>
                <Button onClick={handleSaveTargets} disabled={isSaving} className="bg-slate-900 rounded-xl px-8">
                  {isSaving ? "保存中..." : "保存する"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-50 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <CalendarDays size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">残り出勤日数</p>
                        <p className="font-black text-slate-700">{staff.remainingDays} 日</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <TrendingUp size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">現在の実績平均</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-black text-emerald-700">¥{staff.currentDailyAvg.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-slate-400">({staff.workedDaysCount}日稼働)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center gap-4 shadow-xl shadow-slate-900/20 ring-4 ring-slate-900/10">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
                        <Banknote size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">1日あたりの必要売上平均</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-black text-white">¥{staff.requiredDailyAvg.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-white/40">/ day</span>
                        </div>
                      </div>
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
