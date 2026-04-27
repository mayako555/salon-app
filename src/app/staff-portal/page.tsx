"use client";

import { useEffect, useState } from "react";
import { getAllCustomers, Customer } from "@/lib/customers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  ReceiptText, 
  CalendarHeart, 
  QrCode, 
  AlertTriangle, 
  ChevronRight,
  Clock,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { useAuth } from "@/lib/auth-context";
import { getMonthlySales } from "@/app/sales/actions";
import { getDailyAttendance, recordClockIn, recordClockOut } from "@/app/attendance/actions";
import { toast } from "sonner";

export default function StaffDashboardPage() {
  const { profile } = useAuth();
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ todaySales: 0, todayCount: 0 });
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = format(new Date(), "yyyy-MM-dd");
      const [customers, sales, attRecords] = await Promise.all([
        getAllCustomers(),
        getMonthlySales(new Date().getFullYear(), new Date().getMonth() + 1),
        getDailyAttendance(today)
      ]);
      
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
      const sorted = customers.sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || new Date(0);
        const dateB = b.created_at?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      }).slice(0, 5);
      setRecentCustomers(sorted);
      setLoading(false);
    }
    load();
  }, []);

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
               <Button 
                 onClick={async () => {
                   if (!profile?.id) return;
                   const res = await recordClockIn(profile.id, profile.name);
                   if (res.success) {
                     toast.success("出勤を記録しました");
                     window.location.reload();
                   }
                 }}
                 className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-lg font-black text-white shadow-xl shadow-emerald-900/20"
               >
                 出勤する
               </Button>
             </div>
           ) : (
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/40 animate-pulse">
                   <Clock size={24} />
                 </div>
                 <div>
                   <h3 className="font-black text-white">勤務中</h3>
                   <p className="text-[10px] text-slate-400 font-bold">
                     出勤時刻: {format(new Date(attendance.clock_in), "HH:mm")}
                   </p>
                 </div>
               </div>
               <Button 
                 onClick={async () => {
                   if (!profile?.id) return;
                   const res = await recordClockOut(profile.id);
                   if (res.success) {
                     toast.success("退勤を記録しました。お疲れ様でした！");
                     window.location.reload();
                   }
                 }}
                 className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-lg font-black shadow-xl shadow-white/10"
               >
                 退勤する
               </Button>
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
    </div>
  );
}
