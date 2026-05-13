"use client";

import { useEffect, useState } from "react";
import { getCurriculum, getStaffProgress, CurriculumItem, StaffTrainingProgress, TrainingStatus } from "./training-actions";
import { getStaffList, StaffProfile } from "../staff/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, 
  Users, 
  ChevronRight, 
  Settings, 
  Plus, 
  History,
  TrendingUp,
  Award,
  Sparkles,
  Camera,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TrainingDashboard() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, StaffTrainingProgress[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sList, cList] = await Promise.all([
        getStaffList(),
        getCurriculum()
      ]);
      
      setStaff(sList.filter(s => s.is_active)); // Show all active staff for now
      setCurriculum(cList);
      
      const pMap: Record<string, StaffTrainingProgress[]> = {};
      await Promise.all(sList.map(async (s) => {
        pMap[s.id] = await getStaffProgress(s.id);
      }));
      setProgressMap(pMap);
      
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Loading Academy Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
        <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">SALON ACADEMY</h1>
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">新人育成・技術チェック管理</p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/training/curriculum">
              <Button variant="outline" className="bg-white/5 border-white/10 rounded-2xl h-12 px-6 font-bold hover:bg-white/10">
                <Settings size={18} className="mr-2" /> カリキュラム設定
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Active Trainees</div>
            <div className="text-4xl font-black">{staff.length} <span className="text-sm font-bold text-slate-500">名</span></div>
            <p className="text-[10px] text-slate-400 font-bold mt-2">現在トレーニング中のスタッフ総数</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Total Skills</div>
            <div className="text-4xl font-black">{curriculum.length} <span className="text-sm font-bold text-slate-500">項目</span></div>
            <p className="text-[10px] text-slate-400 font-bold mt-2">マスターすべき全技術項目数</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Completion Rate</div>
            <div className="text-4xl font-black">42 <span className="text-sm font-bold text-slate-500">%</span></div>
            <p className="text-[10px] text-slate-400 font-bold mt-2">合格基準に達した技術の割合</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {staff.map((s, idx) => {
          const progress = progressMap[s.id] || [];
          const activeProgress = progress.filter(p => p.status !== "passed");
          const passedProgress = progress.filter(p => p.status === "passed");

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200 bg-white group hover:scale-[1.01] transition-all duration-300">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-500">
                      {s.name[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">{s.name} <span className="text-xs font-bold text-slate-400 ml-2">({s.role})</span></h3>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">
                          {passedProgress.length} Skills Cleared
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-widest">
                          {progressMap[s.id]?.filter(p => (p as any).job_role)?.length || 0} OJT Logs
                        </span>
                        {s.monthly_sales_target && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-widest">
                            Target: ¥{s.monthly_sales_target.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Link href={`/training/staff/${s.id}`}>
                    <Button variant="ghost" size="icon" className="rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-all">
                      <ChevronRight />
                    </Button>
                  </Link>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={12} className="text-blue-500" />
                      Active Training Progress
                    </h4>
                    <span className="text-[10px] font-black text-blue-500">{activeProgress.length} 項目進行中</span>
                  </div>

                  <div className="space-y-5">
                    {activeProgress.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 italic">現在進行中のトレーニングはありません</p>
                      </div>
                    ) : (
                      activeProgress.map(p => {
                        const curr = curriculum.find(c => c.id === p.curriculum_id);
                        if (!curr) return null;
                        
                        const totalTarget = curr.free_model_target + curr.paid_model_target;
                        const currentTotal = p.free_count + p.paid_count;
                        const percentage = Math.min(100, Math.round((currentTotal / totalTarget) * 100));
                        
                        return (
                          <div key={p.id} className="space-y-2">
                            <div className="flex justify-between items-baseline px-1">
                              <span className="text-sm font-black text-slate-700">{curr.name}</span>
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-900">{currentTotal} <span className="text-[10px] text-slate-400">/ {totalTarget}</span></span>
                              </div>
                            </div>
                            <div className="relative pt-1">
                              <Progress value={percentage} className="h-2 rounded-full" />
                              <div className="flex justify-between mt-1 px-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase">
                                  Free: {p.free_count}/{curr.free_model_target}
                                </span>
                                <span className="text-[9px] font-black text-slate-400 uppercase">
                                  Paid: {p.paid_count}/{curr.paid_model_target}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex gap-3">
                    <Link href={`/training/staff/${s.id}/model/new`} className="flex-1">
                      <Button className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black gap-2 shadow-lg hover:shadow-xl transition-all">
                        <Camera size={16} />
                        モデル記録を追加
                      </Button>
                    </Link>
                    <Link href={`/training/staff/${s.id}/check`} className="flex-1">
                      <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                        <Award size={16} className="mr-2 text-amber-500" />
                        技術チェック
                      </Button>
                    </Link>
                  </div>
                  <div className="pt-3">
                    <Link href={`/training/staff/${s.id}/ojt/new`}>
                      <Button variant="ghost" className="w-full h-10 rounded-xl bg-blue-50/50 text-blue-700 font-bold hover:bg-blue-100 text-[11px] gap-2">
                        <FileSpreadsheet size={14} />
                        助成金用 OJT訓練日誌を作成
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
