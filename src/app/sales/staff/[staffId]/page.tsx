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

  // Default to 2026-07 to view July 2026, or current month if desired. Let's make it state.
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [filterMode, setFilterMode] = useState<"all" | "unentered">("all");

  useEffect(() => {
    if (authLoading) return;
    
    async function load() {
      setLoading(true);
      const [salesData, staffs] = await Promise.all([
        getMonthlySales(selectedYear, selectedMonth),
        getStaffList({ includeResigned: true })
      ]);
      
      const profile = staffs.find(s => s.id === staffId);
      if (profile) {
        setStaffProfile(profile);
        const mySales = salesData.filter(s => normalizeName(s.staff_name) === normalizeName(profile.name));
        setSales(mySales);
      }
      setLoading(false);
    }
    load();
  }, [staffId, authLoading, selectedYear, selectedMonth]);

  const filteredSales = useMemo(() => {
    if (filterMode === "unentered") {
      return sales.filter(s => !s.payment_method || s.payment_method === "不明");
    }
    return sales;
  }, [sales, filterMode]);

  const kpis = useMemo(() => {
    const getVisitId = (s: SalesRecord) => s.source_reservation_id || `${s.customer_name}_${s.date}_${s.time}`;
    const visitIds = new Set(filteredSales.map(getVisitId));
    const visits = visitIds.size;
    
    let cashTech = 0;
    let cardTech = 0;
    let cashProduct = 0;
    let cardProduct = 0;
    let totalDiscount = 0;
    let totalNomination = 0;

    filteredSales.forEach(s => {
      const isCashless = s.payment_method !== "現金" && s.payment_method !== "不明" && s.payment_method !== "";
      if (isCashless) {
        cardTech += (s.tech_sales || 0);
        cardProduct += (s.product_sales || 0);
      } else {
        cashTech += (s.tech_sales || 0);
        cashProduct += (s.product_sales || 0);
      }
      totalDiscount += (s.discount || 0);
      totalNomination += (s.nomination_fee || 0);
    });

    const totalSales = cashTech + cardTech + cashProduct + cardProduct + totalNomination - totalDiscount;
    const techAvg = visits > 0 ? Math.round((cashTech + cardTech) / visits) : 0;
    const totalAvg = visits > 0 ? Math.round(totalSales / visits) : 0;

    return { 
      visits, 
      techAvg, 
      totalAvg, 
      totalSales, 
      cashTech, 
      cardTech, 
      cashProduct, 
      cardProduct,
      totalDiscount,
      totalNomination
    };
  }, [filteredSales]);

  const formatMoney = (val: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(val);

  if (authLoading) return null;

  return (
    <AuthGuard requireRole="admin" requireFeature="sales">
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
              {/* Month & Filter Selectors */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">対象年月:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-9 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-700 px-2"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="h-9 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-700 px-2"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">表示対象:</span>
                  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        filterMode === "all"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      すべて
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("unentered")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        filterMode === "unentered"
                          ? "bg-rose-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      未入力のみ (不明)
                    </button>
                  </div>
                </div>
              </div>

              {/* Cash vs Card Details (KPI expansion cards) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">カード技術売上</span>
                  <span className="text-lg font-black text-slate-700">{formatMoney(kpis.cardTech)}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">カード店販売上</span>
                  <span className="text-lg font-black text-slate-700">{formatMoney(kpis.cardProduct)}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">現金技術売上</span>
                  <span className="text-lg font-black text-slate-700">{formatMoney(kpis.cashTech)}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">現金店販売上</span>
                  <span className="text-lg font-black text-slate-700">{formatMoney(kpis.cashProduct)}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#c084fc] bg-purple-50/20 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-purple-500 block uppercase mb-1">総売上 (税込)</span>
                  <span className="text-xl font-black text-purple-700">{formatMoney(kpis.totalSales)}</span>
                </div>
              </div>

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
                  <span className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-purple-500" /> 手当・割引等控除後</span>
                  <span className="text-3xl font-black text-slate-800">{formatMoney(kpis.totalSales)}</span>
                </div>
              </div>

              {/* Detailed Breakdown and Inline Payment Edit */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">施術・店販売上内訳および支払い方法編集</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      支払い方法が「未入力」または「不明」の売上データは、以下のフォームからその場で正しい支払い方法を選択・保存できます。
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">日時 / 顧客名</th>
                        <th className="p-3">メニュー・コース</th>
                        <th className="p-3 text-right">技術売上 (現金 / カード)</th>
                        <th className="p-3 text-right">店販売上 (現金 / カード)</th>
                        <th className="p-3 text-right">割引 (理由)</th>
                        <th className="p-3">支払い方法</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map((sale) => {
                        const isCashless = sale.payment_method !== "現金" && sale.payment_method !== "不明" && sale.payment_method !== "";
                        const cashTech = isCashless ? 0 : sale.tech_sales;
                        const cashlessTech = isCashless ? sale.tech_sales : 0;
                        const cashProduct = isCashless ? 0 : sale.product_sales;
                        const cashlessProduct = isCashless ? sale.product_sales : 0;

                        return (
                          <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-700">{sale.date} {sale.time}</div>
                              <div className="text-slate-400 font-medium">{sale.customer_name} 様</div>
                            </td>
                            <td className="p-3 max-w-[200px] truncate">
                              <span className="font-medium text-slate-600" title={sale.menu_course}>
                                {sale.menu_course || "オプション・その他"}
                              </span>
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              <div className="font-bold text-slate-700">
                                ¥{sale.tech_sales.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                現金: ¥{cashTech.toLocaleString()} / カード等: ¥{cashlessTech.toLocaleString()}
                              </div>
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              <div className="font-bold text-slate-700">
                                ¥{sale.product_sales.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                現金: ¥{cashProduct.toLocaleString()} / カード等: ¥{cashlessProduct.toLocaleString()}
                              </div>
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              {sale.discount > 0 ? (
                                <>
                                  <div className="font-bold text-rose-500">
                                    -¥{sale.discount.toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium" title={sale.discount_reason}>
                                    {sale.discount_reason || "値引き"}
                                  </div>
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <select
                                value={sale.payment_method || "不明"}
                                onChange={async (e) => {
                                  const newMethod = e.target.value;
                                  try {
                                    const { updatePaymentInfo } = await import("../../actions");
                                    const toastId = window.confirm(`${sale.customer_name} 様の支払い方法を「${newMethod}」に変更しますか？`);
                                    if (toastId) {
                                      const res = await updatePaymentInfo(sale.id, newMethod, "paid", sale.note || "");
                                      if (res.success) {
                                        // Update state locally
                                        setSales((prev) =>
                                          prev.map((s) =>
                                            s.id === sale.id ? { ...s, payment_method: newMethod } : s
                                          )
                                        );
                                      }
                                    }
                                  } catch (err: any) {
                                    alert(`更新エラー: ${err.message || "更新に失敗しました"}`);
                                  }
                                }}
                                className={`h-8 text-xs rounded-lg px-2 border font-bold ${
                                  !sale.payment_method || sale.payment_method === "不明"
                                    ? "bg-rose-50 border-rose-200 text-rose-700 focus:ring-rose-500 animate-pulse"
                                    : "bg-white border-slate-200 text-slate-700 focus:ring-blue-500"
                                }`}
                              >
                                <option value="不明">不明 (未入力)</option>
                                <option value="現金">現金</option>
                                <option value="クレジットカード">クレジットカード</option>
                                <option value="電子マネー・QR">電子マネー・QR</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSales.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center p-8 text-slate-400 font-bold">
                            該当する売上レコードはありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
