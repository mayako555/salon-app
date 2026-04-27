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

export default function StaffDashboardPage() {
  const { profile } = useAuth();
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAllCustomers();
      // Sort by created_at desc and take top 5
      const sorted = data.sort((a, b) => {
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
            <h1 className="text-2xl font-bold">Staff Dashboard</h1>
          </div>
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
            <Clock size={20} className="text-slate-300" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/staff-portal/customers" className="bg-amber-500 hover:bg-amber-600 p-4 rounded-2xl shadow-lg shadow-amber-900/20 transition-all active:scale-95">
            <Users className="mb-2" size={24} />
            <div className="font-bold text-sm">顧客管理</div>
            <div className="text-[10px] opacity-80">名簿・カルテ</div>
          </Link>
          <Link href="/staff-portal/sales" className="bg-emerald-500 hover:bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95">
            <ReceiptText className="mb-2" size={24} />
            <div className="font-bold text-sm">売上入力</div>
            <div className="text-[10px] opacity-80">本日の方の会計</div>
          </Link>
          <Link href="/staff-portal/qr" className="bg-blue-500 hover:bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 text-left">
            <QrCode className="mb-2" size={24} />
            <div className="font-bold text-sm">QR表示</div>
            <div className="text-[10px] opacity-80">お客様入力用</div>
          </Link>
          <Link href="/staff-portal/holidays" className="bg-rose-500 hover:bg-rose-600 p-4 rounded-2xl shadow-lg shadow-rose-900/20 transition-all active:scale-95">
            <CalendarHeart className="mb-2" size={24} />
            <div className="font-bold text-sm">シフト提出</div>
            <div className="text-[10px] opacity-80">希望休の入力</div>
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
