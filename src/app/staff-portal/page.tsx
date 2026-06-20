"use client";

import { useEffect, useState } from "react";
import { getAllCustomers, Customer } from "@/lib/customers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth-context";
import { getMonthlySales } from "@/app/sales/actions";
import { getDailyAttendance, recordClockIn, recordClockOut } from "@/app/attendance/actions";
import { getAllPendingTasks, TaskRecord, generateBookingReply, sendReplyAndCompleteTask } from "@/app/tasks/actions";
import { getStaffList, StaffProfile, updateStaffPasscode } from "@/app/staff/actions";
import { getDashboardStats } from "@/app/dashboard/actions";
import { getMonthlyShifts } from "@/app/shifts/actions";
import { getContractsList } from "@/app/contracts/actions";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import SNSTaskSection from "@/app/tasks/SNSTaskSection";

export default function StaffDashboardPage() {
  const { profile, availableStores: contextAvailableStores } = useAuth();
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [storeStats, setStoreStats] = useState<any[]>([]);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [stats, setStats] = useState({ todaySales: 0, todayCount: 0 });
  const [attendance, setAttendance] = useState<any>(null);
  const [staffListData, setStaffListData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [generatedReply, setGeneratedReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Derived auth state
  const isInHouse = !profile?.companyId || profile?.companyId === "company_default" || profile?.role === "systemOwner";
  const allowedStores = isInHouse ? contextAvailableStores : (profile?.salonIds && profile.salonIds.length > 0 ? profile.salonIds : contextAvailableStores);
  const canViewRestrictedStats = profile?.role === "systemOwner" || profile?.role === "companyOwner" || profile?.role === "admin";

  // My Dashboard State
  const [mySales, setMySales] = useState({ techSales: 0, productSales: 0, count: 0, cashlessSales: 0, nominations: 0 });
  const [myContract, setMyContract] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const today = format(new Date(), "yyyy-MM-dd");
      const [customers, sales, attRecords, tRecords, dashboardRes, mShifts, sList, contracts] = await Promise.all([
        getAllCustomers(),
        getMonthlySales(new Date().getFullYear(), new Date().getMonth() + 1),
        getDailyAttendance(today),
        getAllPendingTasks(),
        getDashboardStats(),
        getMonthlyShifts(new Date().getFullYear(), new Date().getMonth() + 1),
        getStaffList(),
        getContractsList()
      ]);
      
      if (dashboardRes.success && dashboardRes.data) {
        setStoreStats(dashboardRes.data.storeStats);
      }
      
      // Inside useEffect, we can use the same logic or just use the derived vars if they are stable.
      // But since they depend on profile and contextAvailableStores which are deps of useEffect (indirectly or directly), it's safe.
      const localIsInHouse = !profile?.companyId || profile?.companyId === "company_default" || profile?.role === "systemOwner";
      const localAvailableStores = localIsInHouse ? contextAvailableStores : (profile?.salonIds && profile.salonIds.length > 0 ? profile.salonIds : contextAvailableStores);

      const storeTasks = localIsInHouse ? tRecords : tRecords.filter(t => {
        const staff = sList.find(s => s.id === t.staff_id);
        if (!staff || !staff.salonIds) return true; // Show unassigned tasks to everyone just in case
        return staff.salonIds.some((st: string) => localAvailableStores.includes(st));
      });
      setTasks(storeTasks);
      
      // Filter today's shifts and sort by staff sort_order
      const tShifts = mShifts
        .filter((s: any) => s.date === today && s.type === 'work' && (localIsInHouse || s.segments?.some((seg: any) => localAvailableStores.some((ls: string) => ls.includes(seg.store) || seg.store.includes(ls.replace("店", ""))))))
        .sort((a, b) => {
          const staffA = sList.find(s => s.id === a.staff_id);
          const staffB = sList.find(s => s.id === b.staff_id);
          return (staffA?.sort_order ?? 999) - (staffB?.sort_order ?? 999);
        });
      setTodayShifts(tShifts);
      setStaffListData(sList);
      
      // Filter sales by available stores
      const storeSales = localIsInHouse ? sales : sales.filter(s => localAvailableStores.includes(s.store_name));
      const todaySalesData = storeSales.filter(s => s.date === today);
      const total = todaySalesData.reduce((acc, s) => acc + (s.tech_sales || 0) + (s.product_sales || 0) - (s.discount || 0), 0);
      
      setStats({
        todaySales: total,
        todayCount: todaySalesData.length
      });

      if (profile?.id) {
        setAttendance(attRecords.find(a => a.staff_id === profile.id && a.clock_out === null));

        // My Contract
        const myC = contracts.find(c => c.staff_id === profile.id);
        setMyContract(myC || null);

        // My Monthly Sales Data
        const myS = sales.filter(s => s.staff_id === profile.id);
        const myTech = myS.reduce((acc, s) => acc + (s.tech_sales || 0), 0);
        const myProd = myS.reduce((acc, s) => acc + (s.product_sales || 0), 0);
        const myCashless = myS.filter(s => s.payment_method !== "現金").reduce((acc, s) => acc + (s.tech_sales || 0) + (s.product_sales || 0), 0);
        const myNoms = myS.filter(s => s.is_nominated).length;
        setMySales({
          techSales: myTech,
          productSales: myProd,
          count: myS.length,
          cashlessSales: myCashless,
          nominations: myNoms
        });
      }

      // Sort by created_at desc and take top 5
      // If store_name is not available on customer, we might lose them if we strictly filter.
      // Assuming store_name is set for new customers from now on. For existing, we can only do our best.
      const storeCustomers = localIsInHouse ? customers : customers.filter(c => !c.store_name || localAvailableStores.includes(c.store_name));
      const sorted = [...storeCustomers].sort((a, b) => {
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
    const res = await generateBookingReply(task.customer_name, slots, task.content);
    if (res.success) {
      setGeneratedReply(res.reply || "");
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
              Welcome back, {profile?.name || "担当者"}
            </p>
            <h1 className="text-2xl font-bold">Timecard</h1>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">{format(new Date(), "HH:mm")}</p>
            <p className="text-[10px] text-slate-400 font-bold">{format(new Date(), "MM/dd (E)", { locale: ja })}</p>
          </div>
        </div>

        {/* Timecard Section */}
        {canViewRestrictedStats && (
          <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
             {!attendance ? (
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                   <Clock size={24} />
                 </div>
                 <div>
                   <h3 className="font-black text-white">未出勤</h3>
                   <p className="text-[10px] text-slate-400 font-bold">今日も一日頑張りましょう！</p>
                 </div>
               </div>
               <div className="bg-slate-800/50 rounded-xl p-4 mt-2 border border-slate-700/50">
                 <p className="text-slate-400 text-[10px] text-center font-bold">
                   ※打刻は店舗の専用端末（iPad等）で行ってください。
                 </p>
               </div>
             </div>
           ) : (
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 animate-pulse">
                   <Clock size={24} />
                 </div>
                  <div>
                    <h3 className="font-black text-white">勤務中</h3>
                    <p className="text-[10px] text-emerald-400 font-bold">
                      開始：{format(attendance.clock_in?.toDate?.() || new Date(attendance.clock_in), "HH:mm")}
                    </p>
                  </div>
               </div>
               <div className="bg-slate-800/50 rounded-xl p-4 mt-2 border border-slate-700/50">
                 <p className="text-slate-400 text-[10px] text-center font-bold">
                   ※退勤の打刻は店舗の専用端末で行ってください。
                 </p>
               </div>
             </div>
           )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">Today's Sales</div>
            <div className="text-xl font-black">¥{stats.todaySales.toLocaleString()}</div>
            <div className="text-[10px] text-white/50 font-bold">{stats.todayCount} 件の会計</div>
          </div>
          <Link href="/staff-portal/reservations" className="bg-emerald-500 hover:bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex flex-col justify-between">
            <Calendar className="mb-2" size={20} />
            <div>
              <div className="font-bold text-sm">予約カレンダー</div>
              <div className="text-[10px] opacity-80">本日のスケジュール確認</div>
            </div>
          </Link>
          <Link href="/staff-portal/customers" className="bg-slate-700 hover:bg-slate-600 p-4 rounded-2xl shadow-lg transition-all active:scale-95">
            <Users className="mb-2" size={20} />
            <div className="font-bold text-sm">顧客管理</div>
            <div className="text-[10px] opacity-80">名簿・カルテ</div>
          </Link>
          <Link href="/staff-portal/qr" className="bg-blue-500 hover:bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 text-left col-span-2">
            <QrCode className="mb-2" size={20} />
            <div className="font-bold text-sm">QR表示</div>
            <div className="text-[10px] opacity-80">お客様入力用</div>
          </Link>
        </div>
      </div>

      <div className="-mt-6 px-4 space-y-6">
        {/* 🔥 マイダッシュボード */}
        {canViewRestrictedStats && (
        <Card className="p-5 rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 mb-4 relative">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">🔥 マイダッシュボード</h3>
                <p className="text-[10px] text-slate-400 font-bold">当月の個人成績・目標進捗</p>
              </div>
            </div>
            {myContract && (
              <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase">
                {myContract.contract_type === 'monthly' || myContract.contract_type === 'tier_monthly' ? '月給・正社員' : myContract.contract_type === 'reward' ? '業務委託' : 'パート・時給'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 relative">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 mb-0.5">当月 技術売上</p>
              <p className="font-black text-lg text-slate-700">¥{mySales.techSales.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 mb-0.5">当月 商品売上</p>
              <p className="font-black text-lg text-slate-700">¥{mySales.productSales.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-bold text-slate-400 mb-0.5">指名件数</p>
                <p className="font-black text-lg text-slate-700">{mySales.nominations} <span className="text-xs font-bold text-slate-400">件</span></p>
              </div>
              <UserPlus size={16} className="text-slate-300 mb-1" />
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-bold text-slate-400 mb-0.5">担当客数</p>
                <p className="font-black text-lg text-slate-700">{mySales.count} <span className="text-xs font-bold text-slate-400">人</span></p>
              </div>
              <Users size={16} className="text-slate-300 mb-1" />
            </div>
          </div>

          {/* 契約タイプ別の目標進捗・推定計算 */}
          {myContract && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100/50">
              {myContract.contract_type === 'monthly' && myContract.tech_sales_quota > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-bold text-indigo-800 flex items-center gap-1">
                      <Sparkles size={12} /> 技術売上ノルマ進捗
                    </p>
                    <p className="text-[10px] font-black text-indigo-900">
                      ¥{mySales.techSales.toLocaleString()} / <span className="text-indigo-400">¥{(myContract.tech_sales_quota).toLocaleString()}</span>
                    </p>
                  </div>
                  <Progress value={Math.min(100, (mySales.techSales / myContract.tech_sales_quota) * 100)} className="h-2 bg-indigo-100 [&>div]:bg-indigo-500" />
                  {mySales.techSales >= myContract.tech_sales_quota ? (
                    <p className="text-[9px] text-emerald-600 font-bold mt-1 text-right">🎉 ノルマ達成！超過分に歩合発生中！</p>
                  ) : (
                    <p className="text-[9px] text-indigo-400 font-bold mt-1 text-right">達成まであと ¥{(myContract.tech_sales_quota - mySales.techSales).toLocaleString()}</p>
                  )}
                </div>
              )}

              {myContract.contract_type === 'tier_monthly' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-bold text-indigo-800 flex items-center gap-1">
                      <Sparkles size={12} /> ボーナスライン進捗 (40万円〜)
                    </p>
                    <p className="text-[10px] font-black text-indigo-900">
                      ¥{(mySales.techSales + mySales.productSales).toLocaleString()} / <span className="text-indigo-400">¥400,000</span>
                    </p>
                  </div>
                  <Progress value={Math.min(100, ((mySales.techSales + mySales.productSales) / 400000) * 100)} className="h-2 bg-indigo-100 [&>div]:bg-indigo-500" />
                  {(mySales.techSales + mySales.productSales) >= 400000 ? (
                    <p className="text-[9px] text-emerald-600 font-bold mt-1 text-right">🎉 ボーナス発生ライン突破！</p>
                  ) : (
                    <p className="text-[9px] text-indigo-400 font-bold mt-1 text-right">ボーナス発生まであと ¥{(400000 - (mySales.techSales + mySales.productSales)).toLocaleString()}</p>
                  )}
                </div>
              )}

              {myContract.contract_type === 'reward' && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-indigo-800 flex items-center gap-1 mb-2">
                    <Sparkles size={12} /> 当月の推定歩合報酬（プレビュー）
                  </p>
                  <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold text-indigo-400">見込み基本報酬額</span>
                    <span className="font-black text-lg text-indigo-600 tracking-tight">
                      ¥{Math.floor(
                        Math.max(0, mySales.techSales - (mySales.techSales * 0.1) - (mySales.cashlessSales * (myContract.deduction_cashless_ratio || 0) / 100)) * ((myContract.tech_sales_ratio || 0) / 100) +
                        Math.max(0, mySales.productSales - (mySales.productSales * 0.1)) * ((myContract.product_sales_ratio || 0) / 100)
                      ).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[8px] text-indigo-300 font-bold text-right mt-1 px-1">
                    ※技術{myContract.tech_sales_ratio}% / 商品{myContract.product_sales_ratio}% / 指名等を除くベース概算
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
        )}

        {/* 暗証番号（タイムカード用パスコード）の設定 */}
        {canViewRestrictedStats && (
          <Card className="p-5 rounded-[2rem] border-slate-100 shadow-sm bg-white space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50/80 flex items-center justify-center text-blue-600">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">打刻用暗証番号の設定</h3>
                <p className="text-[10px] text-slate-400 font-bold">Timecard PIN Settings</p>
              </div>
            </div>
            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              4桁の数字
            </span>
          </div>

          <PasscodeChangeSection staffId={profile?.id} currentPasscode={profile?.passcode} />
        </Card>
        )}

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

          <div className="mt-8">
            <SNSTaskSection assignedAccounts={profile?.sns_accounts} />
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
            {contextAvailableStores.filter(store => isInHouse || allowedStores.includes(store)).map(store => {
              const staffAtStore = todayShifts.filter(s => 
                s.segments?.some((seg: any) => store.includes(seg.store) || seg.store.includes(store.replace("店", "")))
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
                        const staffInfo = staffListData.find(sl => sl.id === s.staff_id);
                        const isTrainee = staffInfo?.is_trainee;
                        return (
                          <div key={s.id} className={`border px-3 py-2 rounded-xl flex flex-col min-w-[80px] relative ${isTrainee ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                            {isTrainee && (
                              <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full w-fit mb-1">研修中</span>
                            )}
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
        {canViewRestrictedStats && (
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
        )}

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

function PasscodeChangeSection({ staffId, currentPasscode }: { staffId?: string, currentPasscode?: string }) {
  const [passcode, setPasscode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!staffId) return;
    if (!/^\d{4}$/.test(passcode)) {
      toast.error("暗証番号は4桁の数字で入力してください");
      return;
    }
    setIsUpdating(true);
    try {
      const res = await updateStaffPasscode(staffId, passcode);
      if (res.success) {
        toast.success("暗証番号を変更しました");
        setPasscode("");
      } else {
        toast.error(res.error || "変更に失敗しました");
      }
    } catch (e) {
      toast.error("エラーが発生しました");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">現在の暗証番号</p>
          <p className="text-sm font-extrabold text-slate-700 tracking-widest mt-0.5">
            {showPass ? (currentPasscode || "未設定") : "••••"}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowPass(!showPass)}
          className="text-[10px] font-bold text-blue-600 h-8 rounded-lg hover:bg-white"
        >
          {showPass ? "隠す" : "表示する"}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input 
            type="password"
            maxLength={4}
            pattern="\d*"
            placeholder="新しい4桁の暗証番号"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
            className="h-11 text-xs rounded-xl font-bold border-slate-200"
          />
        </div>
        <Button 
          onClick={handleUpdate}
          disabled={isUpdating || passcode.length !== 4}
          className="h-11 px-5 rounded-xl bg-slate-900 text-white font-black text-xs shadow-md transition-all active:scale-95"
        >
          {isUpdating ? "更新中..." : "変更する"}
        </Button>
      </div>
    </div>
  );
}
