"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, TrendingUp, DollarSign, Calendar, Star, XCircle } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { getMonthlySales, SalesRecord } from "../../actions";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { format } from "date-fns";
import { normalizeName } from "../../hooks/useSalesData";

export default function StaffSalesDetailPage({
  params
}: {
  params: Promise<{ staffId: string }>
}) {
  const { staffId } = use(params);
  const { loading: authLoading } = useAuth();
  
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    async function load() {
      const now = new Date();
      // Fetch current month for now
      const [salesData, staffs] = await Promise.all([
        getMonthlySales(now.getFullYear(), now.getMonth() + 1),
        getStaffList()
      ]);
      
      const profile = staffs.find(s => s.id === staffId);
      if (profile) {
        setStaffProfile(profile);
        // Filter sales for this staff
        const mySales = salesData.filter(s => normalizeName(s.staff_name) === normalizeName(profile.name));
        setSales(mySales);
      }
      setLoading(false);
    }
    load();
  }, [staffId, authLoading]);

  const kpis = useMemo(() => {
    const getVisitId = (s: SalesRecord) => s.source_reservation_id || `${s.customer_name}_${s.date}_${s.time}`;
    const visitIds = new Set(sales.map(getVisitId));
    const visits = visitIds.size;
    
    const techSales = sales.reduce((sum, s) => sum + (s.tech_sales || 0), 0);
    const productSales = sales.reduce((sum, s) => sum + (s.product_sales || 0), 0);
    const discount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
    const nomination = sales.reduce((sum, s) => sum + (s.nomination_fee || 0), 0);
    
    const totalSales = techSales + productSales + nomination - discount;
    
    const techAvg = visits > 0 ? Math.round(techSales / visits) : 0;
    const totalAvg = visits > 0 ? Math.round(totalSales / visits) : 0;

    return { visits, techAvg, totalAvg, totalSales, techSales };
  }, [sales]);

  const formatMoney = (val: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(val);

  if (authLoading) return null;

  return (
    <AuthGuard requireRole="admin">
      <div className="pb-24 bg-slate-50 min-h-screen">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sales">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-slate-800">
              {staffProfile ? `${staffProfile.name} の売上詳細` : "読込中..."}
            </h1>
          </div>
        </div>
        
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
          {loading ? (
            <div className="text-center text-slate-500 py-20">データを読み込んでいます...</div>
          ) : (
            <>
              {/* KPIs Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-500" /> 入客数</span>
                  <span className="text-3xl font-black text-slate-800">{kpis.visits} <span className="text-base font-bold text-slate-500">名</span></span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-500" /> 技術客単価</span>
                  <span className="text-3xl font-black text-slate-800">{formatMoney(kpis.techAvg)}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-emerald-600" /> 総客単価</span>
                  <span className="text-3xl font-black text-slate-800">{formatMoney(kpis.totalAvg)}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-purple-500" /> 合計売上</span>
                  <span className="text-3xl font-black text-slate-800">{formatMoney(kpis.totalSales)}</span>
                </div>
              </div>

              {/* Future Expansion Slots */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main Charts) */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[350px] flex items-center justify-center flex-col text-slate-400">
                    <Calendar className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-bold">日別売上グラフ (開発中)</p>
                    <p className="text-sm mt-1">ここに日別の売上推移グラフが入ります</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[350px] flex items-center justify-center flex-col text-slate-400">
                    <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-bold">月別推移グラフ (開発中)</p>
                    <p className="text-sm mt-1">ここに月別の客単価・客数推移グラフが入ります</p>
                  </div>
                </div>

                {/* Right Column (Secondary KPIs) */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-orange-500" /> 次回予約率</p>
                      <p className="text-2xl font-black text-slate-300">-- %</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-500" /> 指名率</p>
                      <p className="text-2xl font-black text-slate-300">-- %</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><XCircle className="w-4 h-4 text-rose-500" /> キャンセル率</p>
                      <p className="text-2xl font-black text-slate-300">-- %</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
