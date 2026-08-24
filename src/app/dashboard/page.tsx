"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Database, 
  ShieldCheck, 
  QrCode, 
  Clock, 
  Calendar,
  Sparkles,
  ArrowRight,
  MessageSquare,
  X,
  TrendingUp,
  Award,
  BookOpen,
  Calculator
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useEffect, useState } from "react";
import { getDashboardStats } from "./actions";
import { getCompanySetupStatus } from "@/app/setup/actions";
import { toast } from "sonner";
import { getAllPendingTasks, generateBookingReply, sendReplyAndCompleteTask } from "@/app/tasks/actions";
import type { TaskRecord } from "@/app/tasks/actions";
import { updateStoreTarget } from "@/app/stores/actions";
import { Progress } from "@/components/ui/progress";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { format } from "date-fns";
import AdvancedCharts from "./AdvancedCharts";
import SNSTaskSection from "@/app/tasks/SNSTaskSection";
import { getEvaluationReminders } from "@/app/evaluations/actions";
import FundsCard from "@/components/dashboard/FundsCard";

export default function DashboardPage() {
  const { profile, isAdmin, isManager, hasFeature } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [generatedReply, setGeneratedReply] = useState("");
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editingTargetData, setEditingTargetData] = useState<Record<string, number>>({});
  const [evalReminders, setEvalReminders] = useState<{id: string, name: string}[]>([]);
  const [setupStatus, setSetupStatus] = useState<{progress: any, rate: number, isComplete: boolean} | null>(null);

  const currentQuarter = (() => {
    const now = new Date();
    const month = now.getMonth();
    const q = Math.floor(month / 3) + 1;
    return `${now.getFullYear()}Q${q}`;
  })();

  useEffect(() => {
    if (!loading && !isAdmin && !isManager) {
      window.location.href = "/staff-portal";
      return;
    }
  }, [loading, isAdmin, isManager]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/stats?quarter=${currentQuarter}`);
        const result = await res.json();
        if (result.success) {
          setStats(result.stats);
          setEvalReminders(result.evalReminders);
          setSetupStatus(result.setupStatus);
          setTasks(result.tasks);
        } else {
          console.error("Failed to load dashboard stats:", result.error);
        }
      } catch (e) {
        console.error("Dashboard stats fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin, isManager, profile?.id, currentQuarter]);

  const handleGenerateReply = async (task: TaskRecord) => {
    // For demo: pretend we picked these slots
    const slots = ["5月10日 10:00〜", "5月10日 14:00〜", "5月12日 11:30〜"];
    const res = await generateBookingReply(task.customer_name, slots, task.content);
    if (res.success) {
      setGeneratedReply(res.reply || "");
      setSelectedTask(task);
    }
  };

  const handleSendAndComplete = async () => {
    if (selectedTask) {
      const res = await sendReplyAndCompleteTask(selectedTask.id, selectedTask.customer_id, generatedReply);
      if (res.success) {
        toast.success("LINEメッセージを送信し、タスクを完了しました");
        setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
        setSelectedTask(null);
      } else {
        toast.error(res.error || "送信に失敗しました");
      }
    }
  };

  const handleUpdateStoreTargets = async () => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const promises = Object.entries(editingTargetData).map(([name, target]) => 
      updateStoreTarget(name, currentMonth, target)
    );
    
    await Promise.all(promises);
    toast.success("店舗目標を更新しました");
    setIsEditingTargets(false);
    window.location.reload();
  };

  return (
    <AuthGuard requireRole="staff">
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="text-emerald-500" />
            {profile?.name}さん、おはようございます
          </h1>
          <p className="text-slate-500">本日の状況と重要なタスクを確認します。</p>
        </div>

        {/* Setup Warning Banner */}
        {(isAdmin || isManager) && setupStatus && setupStatus.rate < 100 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-600 mt-1 md:mt-0">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-amber-800 font-bold text-lg">初期設定が未完了です ({setupStatus.rate}%完了)</h3>
                <p className="text-amber-700/80 text-sm mt-1">
                  システムをフルに活用するために、店舗情報やメニューなどの設定を完了させてください。
                </p>
                <div className="w-full bg-amber-200/50 rounded-full h-1.5 mt-3 max-w-xs">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${setupStatus.rate}%` }}></div>
                </div>
              </div>
            </div>
            <Link href="/setup">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold whitespace-nowrap shadow-sm">
                設定を続ける <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Funds Dashboard Card (Visible only to company/system owners) */}
        {hasFeature("cash_management") && (
          <div className="grid grid-cols-1 mb-8">
            <FundsCard />
          </div>
        )}

        {/* Staff Quick Links (Visible to all roles) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {hasFeature("payroll") && (
            <Link href="/staff-portal/payroll">
              <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Calculator size={24} />
                </div>
                <span className="text-xs font-bold text-slate-700">給与明細確認</span>
              </Card>
            </Link>
          )}
          {hasFeature("shifts") && (
            <Link href="/staff-portal/holidays">
              <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
                <span className="text-xs font-bold text-slate-700">希望休申請</span>
              </Card>
            </Link>
          )}
          {hasFeature("payroll") && (
            <Link href="/staff-portal/transport">
              <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock size={24} />
                </div>
                <span className="text-xs font-bold text-slate-700">交通費申請</span>
              </Card>
            </Link>
          )}
          {hasFeature("expenses") && (
            <Link href="/staff-portal/expenses">
              <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <span className="text-xs font-bold text-slate-700">経費精算</span>
              </Card>
            </Link>
          )}
          {hasFeature("training") && (
            <Link href="/manuals">
              <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
                <div className="p-3 bg-purple-50 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <span className="text-xs font-bold text-slate-700">マニュアル</span>
              </Card>
            </Link>
          )}
        </div>

        {/* STAFF VIEW */}
        {!isAdmin && !isManager && (
            <div className="lg:col-span-3 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-emerald-600 text-white border-none shadow-md overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock size={80} />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-100 uppercase tracking-wider">本日の勤務</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">10:00 - 19:00</div>
                  </CardContent>
                </Card>

                {hasFeature("payroll") && (
                  <Link href="/staff-portal/payroll">
                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                          最新の給与明細
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-slate-900">確認する</div>
                        <p className="text-xs text-slate-400 mt-1">前月分の明細が確定しています</p>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>

               <Card className="bg-white border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-500" />
                    重要タスク・通知
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Team Support Message */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                      <MessageSquare size={18} className="text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
                        担当スタッフがお休みや接客中で返信できない場合は、ぜひ助け合って対応しましょう！✨
                      </p>
                    </div>

                    {tasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">現在対応が必要なタスクはありません</p>
                    ) : (
                      tasks.map(task => {
                        const isMyTask = task.staff_id === profile?.id;
                        
                        return (
                          <div key={task.id} className={`p-4 rounded-2xl border ${isMyTask ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-col gap-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest self-start ${isMyTask ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'}`}>
                                  {task.type === 'booking_change_request' ? '予約変更依頼' : 'お問い合わせ'}
                                </span>
                                {!isMyTask && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                                      {task.staff_name[0]}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">担当: {task.staff_name}</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-300 font-bold">LINE経由</span>
                            </div>
                            
                            <p className="text-sm font-black text-slate-800 mb-1">{task.customer_name}様</p>
                            <p className="text-xs text-slate-600 line-clamp-2 mb-4 bg-white/50 p-2 rounded-lg italic border border-slate-100/50">
                              「{task.content}」
                            </p>
                            
                            <Button 
                              size="sm" 
                              className={`w-full h-10 rounded-xl font-bold gap-2 shadow-sm ${isMyTask ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                              onClick={() => handleGenerateReply(task)}
                            >
                              <Sparkles size={14} className={isMyTask ? "text-amber-400" : "text-amber-500"} />
                              {isMyTask ? '返信案を作成する' : '代わりに返信案を作る'}
                            </Button>
                          </div>
                        );
                      })
                    )}
                    
                    <div className="p-3 bg-white border border-slate-100 rounded-2xl">
                      <p className="font-bold text-slate-800 text-xs">【重要】来月の希望休について</p>
                      <p className="text-[10px] text-slate-400 mt-1">25日までにポータルから提出をお願いします。</p>
                    </div>
                   </div>
                </CardContent>
              </Card>

              {/* SNS Task Section */}
              <SNSTaskSection assignedAccounts={profile?.sns_accounts} />
            </div>
        )}

        {/* Reply Generator Modal */}
        {selectedTask && (
          <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">AI自動返信案</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTask(null)}><X /></Button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">送信予定のメッセージ</p>
                <textarea 
                  value={generatedReply} 
                  onChange={(e) => setGeneratedReply(e.target.value)}
                  className="w-full h-64 bg-transparent border-none text-sm text-slate-700 leading-relaxed focus:ring-0 resize-none p-0"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-900/20"
                  onClick={handleSendAndComplete}
                >
                  この内容をLINEで送信する
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-14 rounded-2xl text-slate-400 font-bold"
                  onClick={() => setSelectedTask(null)}
                >
                  修正する
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ADMIN VIEW */}
        {(isAdmin || isManager) && (
          <>
            {hasFeature("tasks") && hasFeature("sales") && (
              <div className="mb-8">
                <SNSTaskSection />
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 whitespace-nowrap">
              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">登録スタッフ数</CardTitle>
                  <Users className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{stats?.staffCount ?? '...'} 人</div>
                  <p className="text-xs text-slate-500 mt-1">稼働中の全スタッフ</p>
                </CardContent>
              </Card>
              
              {hasFeature("attendance") && (
                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">未処理の勤怠</CardTitle>
                    <FileText className="h-4 w-4 text-rose-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{stats?.unprocessedAttendanceCount ?? '...'} 件</div>
                    <p className="text-xs text-slate-500 mt-1">打刻漏れ等の確認が必要</p>
                  </CardContent>
                </Card>
              )}

              {hasFeature("sales") && (
                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">今月の売上</CardTitle>
                    <Database className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">¥{(stats?.monthlyTotal ?? 0).toLocaleString()}</div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-emerald-600">通常:</span>
                        <span className="text-slate-700 text-right">¥{(stats?.monthlyRegularTotal ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-indigo-600">ミニモ:</span>
                        <span className="text-slate-700 text-right">¥{(stats?.monthlyMinimoTotal ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">システム状態</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">正常</div>
                  <p className="text-xs text-slate-500 mt-1">セキュリティ保護済み</p>
                </CardContent>
              </Card>

              {hasFeature("evaluations") && evalReminders.length > 0 && (
                <Card className="col-span-full bg-white border-none shadow-xl ring-2 ring-purple-500/20 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
                    <Award size={100} />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-purple-600 flex items-center gap-2">
                        <Award size={16} /> 四半期評価のリマインダー
                      </CardTitle>
                      <Badge className="bg-purple-600 text-white border-none text-[9px] font-black h-5 px-2">
                        {currentQuarter.replace('Q', '年 第')}四半期
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
                    <div className="space-y-1">
                      <p className="text-lg font-black text-slate-900">
                        未完了のスタッフが <span className="text-purple-600 text-2xl underline decoration-purple-200 underline-offset-4">{evalReminders.length}名</span> います
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {evalReminders.slice(0, 5).map(s => (
                          <span key={s.id} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                            {s.name}
                          </span>
                        ))}
                        {evalReminders.length > 5 && <span className="text-[10px] font-bold text-slate-400">...他 {evalReminders.length - 5}名</span>}
                      </div>
                    </div>
                    <Link href="/evaluations">
                      <Button className="bg-slate-900 hover:bg-purple-700 text-white font-black px-8 h-12 rounded-2xl shadow-lg transition-all group/btn">
                        評価を実施する
                        <ArrowRight size={18} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <Link href="/dashboard/performance" className="col-span-full md:col-span-1">
                <Card className="bg-emerald-900 text-white border-none shadow-xl hover:bg-emerald-800 transition-all group cursor-pointer h-full relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingUp size={120} />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-300">目標達成分析</CardTitle>
                    <ArrowRight className="h-4 w-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-black">スタッフ分析</div>
                    <p className="text-[10px] text-emerald-300/70 mt-1 font-bold">目標までの必要売上を確認</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/evaluations" className="col-span-full md:col-span-1">
                <Card className="bg-purple-900 text-white border-none shadow-xl hover:bg-purple-800 transition-all group cursor-pointer h-full relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Award size={120} />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-purple-300">人事評価</CardTitle>
                    <ArrowRight className="h-4 w-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-black">スタッフ評価</div>
                    <p className="text-[10px] text-purple-300/70 mt-1 font-bold">評価と育成状況の管理</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <AdvancedCharts />

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="col-span-1 bg-white border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-800">店舗別売上進捗 (今月)</CardTitle>
                  {(isAdmin || isManager) && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        const targets: any = {};
                        stats.storeStats.forEach((s: any) => targets[s.name] = s.target);
                        setEditingTargetData(targets);
                        setIsEditingTargets(true);
                      }}
                      className="text-slate-400 hover:text-slate-900"
                    >
                      <Settings size={18} />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {stats?.storeStats?.map((store: any) => (
                    <div key={store.name} className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-black text-slate-700">{store.name}店</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">¥{store.current.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">/ ¥{store.target.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="relative pt-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {store.progress.toFixed(1)}% 達成
                          </span>
                        </div>
                        <Progress value={store.progress} className="h-2 rounded-full" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="col-span-1 bg-white border-none shadow-sm border-l-4 border-l-rose-500">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800 text-rose-600 font-bold">管理者アラート</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-slate-600 font-medium">
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      前月の月次締め処理が完了していません
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      業務委託「佐藤」様の契約期限が残り7日です
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}

