"use client";

import { useEffect, useState } from "react";
import { getAllCustomers, Customer } from "@/lib/customers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ReceiptText, 
  CalendarHeart, 
  QrCode, 
  AlertTriangle, 
  ChevronRight,
  Clock,
  UserPlus,
  MessageSquare,
  Sparkles,
  TrendingUp,
  X,
  Users
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth-context";
import { getMonthlySales } from "@/app/sales/actions";
import { getDailyAttendance, recordClockIn, recordClockOut } from "@/app/attendance/actions";
import { getAllPendingTasks, TaskRecord, generateBookingReply, sendReplyAndCompleteTask } from "@/app/tasks/actions";
import { getDashboardStats } from "@/app/dashboard/actions";
import { getMonthlyShifts } from "@/app/shifts/actions";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export default function StaffDashboardPage() {
  const { profile } = useAuth();
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [storeStats, setStoreStats] = useState<any[]>([]);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [stats, setStats] = useState({ todaySales: 0, todayCount: 0 });
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMyQr, setShowMyQr] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [generatedReply, setGeneratedReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function load() {
      const today = format(new Date(), "yyyy-MM-dd");
      const [customers, sales, attRecords, tRecords, dashboardRes, mShifts] = await Promise.all([
        getAllCustomers(),
        getMonthlySales(new Date().getFullYear(), new Date().getMonth() + 1),
        getDailyAttendance(today),
        getAllPendingTasks(),
        getDashboardStats(),
        getMonthlyShifts(new Date().getFullYear(), new Date().getMonth() + 1)
      ]);
      
      setTasks(tRecords);
      if (dashboardRes.success && dashboardRes.data) {
        setStoreStats(dashboardRes.data.storeStats);
      }
      
      // Filter today's shifts
      const tShifts = mShifts.filter((s: any) => s.date === today && s.type === 'work');
      setTodayShifts(tShifts);
      const todaySalesData = sales.filter(s => s.date === today);
      const total = todaySalesData.reduce((acc, s) => acc + (s.tech_sales || 0) + (s.product_sales || 0), 0);
      
      setStats({
        todaySales: total,
        todayCount: todaySalesData.length
      });

      if (profile?.id) {
        setAttendance(attRecords.find(a => a.staff_id === profile.id && a.clock_out === null));
      }

      // Sort by created_at desc and take top 5
      const sorted = [...customers].sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || new Date(0);
        const dateB = b.created_at?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setRecentCustomers(sorted.slice(0, 5));
      setLoading(false);
    }
    load();
  }, [profile?.id]);

  const handleGenerateReply = async (task: TaskRecord) => {
    // For demo: pretend we picked these slots
    const slots = ["5月10日 10:00〜", "5月10日 14:00〜", "5月12日 11:30〜"];
    const res = await generateBookingReply(task.customer_name, slots);
    if (res.success) {
      setGeneratedReply(res.reply);
      setSelectedTask(task);
    }
  };

  const handleSendAndComplete = async () => {
    if (selectedTask) {
      setIsSending(true);
      const res = await sendReplyAndCompleteTask(selectedTask.id, selectedTask.customer_id, generatedReply);
      setIsSending(false);
      if (res.success) {
        toast.success("LINEメッセージを送信し、タスクを完了しました");
        setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
        setSelectedTask(null);
      } else {
        toast.error(res.error || "送信に失敗しました");
      }
    }
  };

  const riskAlerts = recentCustomers.filter(c => c.risk_level === 'red' || c.risk_level === 'yellow');

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white pb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
              Welcome back, {profile?.name || "Staff"}
            </p>
            <h1 className="text-2xl font-bold">Timecard</h1>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">{format(new Date(), "HH:mm")}</p>
            <p className="text-[10px] text-slate-400 font-bold">{format(new Date(), "MM/dd (E)", { locale: ja })}</p>
          </div>
        </div>

        {/* Timecard Section */}
        <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
           {!attendance ? (
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
                   <Clock size={24} />
                 </div>
                 <div>
                   <h3 className="font-black text-white">未出勤</h3>
                   <p className="text-[10px] text-slate-400 font-bold">今日も一日頑張りましょう！</p>
                 </div>
               </div>
               <div className="bg-slate-800 rounded-xl p-4 mt-2 border border-slate-700">
                 <p className="text-slate-300 text-xs text-center font-bold">
                   出勤・退勤の打刻は店舗の専用端末（iPad等）またはQRコードリーダーから行ってください。
                 </p>
               </div>
             </div>
           ) : (
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/40 animate-pulse">
                   <Clock size={24} />
                 </div>
                  <div>
                    <h3 className="font-black text-white">勤務中</h3>
                    <p className="text-[10px] text-slate-400 font-bold">今日も一日頑張りましょう！</p>
                  </div>
               </div>
               <div className="bg-slate-800 rounded-xl p-4 mt-2 border border-slate-700">
                 <p className="text-slate-300 text-xs text-center font-bold">
                   退勤の打刻は店舗の専用端末（iPad等）から行ってください。
                 </p>
               </div>
             </div>
           )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">Today's Sales</div>
            <div className="text-xl font-black">¥{stats.todaySales.toLocaleString()}</div>
            <div className="text-[10px] text-white/50 font-bold">{stats.todayCount} 件の会計</div>
          </div>
          <Link href="/staff-portal/sales" className="bg-emerald-500 hover:bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex flex-col justify-between">
            <ReceiptText size={20} />
            <div>
              <div className="font-bold text-sm">売上入力</div>
              <div className="text-[10px] opacity-80">本日の方の会計</div>
            </div>
          </Link>
          <Link href="/staff-portal/customers" className="bg-slate-700 hover:bg-slate-600 p-4 rounded-2xl shadow-lg transition-all active:scale-95">
            <Users className="mb-2" size={20} />
            <div className="font-bold text-sm">顧客管理</div>
            <div className="text-[10px] opacity-80">名簿・カルテ</div>
          </Link>
          <Link href="/staff-portal/qr" className="bg-blue-500 hover:bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 text-left">
            <QrCode className="mb-2" size={20} />
            <div className="font-bold text-sm">QR表示</div>
            <div className="text-[10px] opacity-80">お客様入力用</div>
          </Link>
          
          <Button 
            onClick={() => setShowMyQr(true)}
            className="col-span-2 bg-white text-slate-900 p-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 h-auto"
          >
            <QrCode size={24} className="text-blue-500" />
            <div className="text-left">
              <div className="font-black text-sm">マイ出勤QRコード</div>
              <div className="text-[10px] font-bold text-slate-400">お店の端末でスキャン</div>
            </div>
          </Button>
        </div>
      </div>

      <div className="-mt-6 px-4 space-y-6">
        {/* Alerts Section */}
        {riskAlerts.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-rose-600 font-bold mb-3 text-sm">
              <AlertTriangle size={18} />
              <h2>要確認：リスクアラート</h2>
            </div>
            <div className="space-y-2">
              {riskAlerts.map(customer => (
                <Link key={customer.id} href={`/staff-portal/customers/${customer.id}`} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm bg-white ${
                  customer.risk_level === 'red' ? 'border-rose-200' : 'border-amber-200'
                }`}>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{customer.name} 様</span>
                      <span className={`text-[8px] px-1.5 rounded font-black uppercase ${
                        customer.risk_level === 'red' ? 'bg-rose-600 text-white' : 'bg-amber-400 text-white'
                      }`}>
                        {customer.risk_level === 'red' ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold truncate mt-0.5">
                      {customer.risk_flags?.join('、') || (customer.has_allergy ? 'アレルギーあり' : '要確認')}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-500" />
              重要タスク（チーム連携）
            </h2>
            <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{tasks.length} PENDING</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100 mb-3">
            <Sparkles size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
              担当スタッフが不在の場合は、代わりに返信案を作成して助け合いましょう！✨
            </p>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-6 text-center border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs italic">現在対応が必要なタスクはありません</p>
              </div>
            ) : (
              tasks.map(task => {
                const isMyTask = task.staff_id === profile?.id;
                
                return (
                  <Card key={task.id} className={`p-4 rounded-2xl border transition-all shadow-sm ${isMyTask ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest self-start ${isMyTask ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'}`}>
                          {task.type === 'booking_change_request' ? '予約変更依頼' : 'お問い合わせ'}
                        </span>
                        {!isMyTask && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500">
                              {task.staff_name[0]}
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">担当: {task.staff_name}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold">LINE経由</span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-black text-slate-800">{task.customer_name} 様</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed bg-white/50 p-2 rounded-xl border border-slate-100/50 italic">
                        「{task.content}」
                      </p>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className={`w-full h-11 rounded-xl font-black gap-2 shadow-sm transition-all active:scale-95 ${isMyTask ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                      onClick={() => handleGenerateReply(task)}
                    >
                      <Sparkles size={14} className={isMyTask ? "text-amber-400" : "text-amber-500"} />
                      {isMyTask ? '返信案を作成する' : '代わりに返信案を作る'}
                    </Button>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Today's Staffing by Store */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              今日の店舗別スタッフ
            </h2>
            <Link href="/staff-portal/shifts?view=store">
              <Button variant="ghost" size="sm" className="text-[10px] font-bold text-blue-600 p-0 h-auto">
                全体シフトを見る <ChevronRight size={12} />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {["神戸", "元町", "六甲"].map(store => {
              const staffAtStore = todayShifts.filter(s => 
                s.segments?.some((seg: any) => seg.store === store)
              );
              
              return (
                <Card key={store} className="p-4 rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden relative">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {store}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{staffAtStore.length}名 勤務予定</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {staffAtStore.length === 0 ? (
                      <span className="text-[10px] text-slate-300 italic">本日の出勤予定はありません</span>
                    ) : (
                      staffAtStore.map(s => {
                        const seg = s.segments?.find((seg: any) => seg.store === store);
                        return (
                          <div key={s.id} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex flex-col min-w-[80px]">
                            <span className="text-xs font-bold text-slate-700">{s.staff_name}</span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">{seg?.start_time} - {seg?.end_time}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Store Sales Targets */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              店舗別売上目標・進捗
            </h2>
          </div>
          
          <Card className="p-5 rounded-2xl border-slate-100 shadow-sm space-y-5 bg-white">
            {storeStats.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-4">売上目標データがありません</p>
            ) : (
              storeStats.map(store => (
                <div key={store.name} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-black text-slate-700">{store.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">¥{store.current.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-bold ml-1">/ ¥{store.target.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        store.progress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {store.progress.toFixed(1)}% 達成
                      </span>
                      {store.progress >= 100 && <Sparkles size={12} className="text-amber-400" />}
                    </div>
                    <Progress value={store.progress} className="h-1.5 rounded-full" />
                  </div>
                </div>
              ))
            )}
            <div className="pt-2 border-t border-slate-50">
              <p className="text-[9px] text-slate-400 font-bold text-center">
                ※目標設定は管理者ダッシュボードから行えます
              </p>
            </div>
          </Card>
        </div>

        {/* Recent Registrations */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <UserPlus size={18} className="text-amber-500" />
              最近の登録（待ち状況）
            </h2>
            <Link href="/staff-portal/customers" className="text-xs text-slate-400 font-bold hover:text-slate-600">
              すべて見る
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto mb-2"></div>
                <div className="h-3 bg-slate-50 rounded w-1/2 mx-auto"></div>
              </div>
            ) : recentCustomers.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-sm">登録されたお客様はいません</p>
              </div>
            ) : (
              recentCustomers.map(customer => (
                <Link key={customer.id} href={`/staff-portal/customers/${customer.id}`}>
                  <Card className="p-4 rounded-2xl border-slate-100 hover:border-slate-200 transition-colors shadow-sm flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      customer.risk_level === 'red' ? 'bg-rose-100 text-rose-600' : 
                      customer.risk_level === 'yellow' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {customer.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{customer.name} 様</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          {format(customer.created_at?.toDate?.() || new Date(), "M/d HH:mm", { locale: ja })}
                        </span>
                        {customer.has_allergy && (
                          <span className="bg-rose-100 text-rose-600 text-[8px] px-1.5 py-0.5 rounded font-black">
                            ALLERGY
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* My Attendance QR Modal */}
      {showMyQr && profile && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowMyQr(false)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[3rem] p-10 flex flex-col items-center gap-8 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-900 mb-1">My ID Code</h3>
              <p className="text-sm font-bold text-slate-400">お店の端末にかざしてください</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
              <QRCodeSVG 
                value={profile.id} 
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="text-center">
              <p className="text-xl font-black text-slate-800">{profile.name}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{profile.role || "Staff"}</p>
            </div>

            <Button 
              onClick={() => setShowMyQr(false)}
              className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black"
            >
              閉じる
            </Button>
          </motion.div>
        </div>
      )}

      {/* Reply Generator Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">AI自動返信案</h3>
                  <p className="text-[10px] font-bold text-slate-400">内容を自由に調整できます</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedTask(null)}>
                <X size={20} className="text-slate-400" />
              </Button>
            </div>

            <div className="bg-slate-50 p-5 rounded-[2rem] mb-8 border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                送信予定のメッセージ
              </p>
              <textarea 
                value={generatedReply} 
                onChange={(e) => setGeneratedReply(e.target.value)}
                className="w-full h-56 bg-transparent border-none text-sm text-slate-700 font-medium leading-relaxed focus:ring-0 resize-none p-0"
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                onClick={handleSendAndComplete}
                disabled={isSending}
              >
                {isSending ? "送信中..." : (
                  <>
                    <MessageSquare size={20} />
                    この内容をLINEで送信する
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-2xl text-slate-400 font-bold hover:text-slate-600"
                onClick={() => setSelectedTask(null)}
              >
                キャンセル
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
