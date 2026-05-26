"use client";

import { useEffect, useState } from "react";
import { getMonthlySales, SalesRecord } from "@/app/sales/actions";
import { getReservationById, Reservation, updateReservationStatus } from "@/app/reservations/actions";
import CheckoutDialog from "@/app/sales/CheckoutDialog";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ReceiptText, CheckCircle2, UserCircle, Users, Lock, Database } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export default function StaffPortalSalesPage() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoCheckoutRes, setAutoCheckoutRes] = useState<Reservation | null>(null);

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    async function load() {
      const data = await getMonthlySales(year, month);
      setSales(data);
      setLoading(false);

      // Check URL for res_id
      const params = new URLSearchParams(window.location.search);
      const resId = params.get("res_id");
      if (resId) {
        const res = await getReservationById(resId);
        if (res && res.status !== "completed") {
          setAutoCheckoutRes(res);
        }
      }
    }
    load();
  }, [year, month]);

  // Convert reservation to partial SalesRecord
  const mapReservationToSalesRecord = (res: Reservation): SalesRecord => {
    return {
      id: "new",
      staff_id: res.staff_id,
      staff_name: res.staff_name,
      store_name: res.store_name,
      date: res.date,
      time: res.start_time,
      customer_name: res.customer_name,
      customer_type: "不明",
      menu_course: res.menu_name,
      tech_sales: res.expected_price || 0,
      product_sales: 0,
      is_nominated: false,
      nomination_fee: 0,
      discount: 0,
      discount_reason: "",
      portal_fee: 0,
      reservation_route: res.portal === "HPB" ? "HOT PEPPER Beauty" : res.portal,
      status: "open",
      payment_method: "cash",
      hpb_points: 0,
      created_at: null,
      updated_at: null
    };
  };

  const allTodaysSales = sales
    .filter(s => s.date === todayStr)
    .sort((a, b) => b.time?.localeCompare(a.time || "") || 0);

  const mySales = allTodaysSales.filter(s => s.staff_name === profile?.name);
  const otherSales = allTodaysSales.filter(s => s.staff_name !== profile?.name);

  // Calculate totals: (Tech + Product + HPB Points) - Discount
  const todaysTechTotal = mySales.reduce((acc, curr) => acc + curr.tech_sales, 0);
  const todaysProductTotal = mySales.reduce((acc, curr) => acc + curr.product_sales, 0);
  const todaysHpbTotal = mySales.reduce((acc, curr) => acc + (curr.hpb_points || 0), 0);
  const todaysDiscountTotal = mySales.reduce((acc, curr) => acc + (curr.discount || 0), 0);

  const globalTechTotal = allTodaysSales.reduce((acc, curr) => acc + curr.tech_sales, 0);
  const globalProductTotal = allTodaysSales.reduce((acc, curr) => acc + curr.product_sales, 0);
  const globalHpbTotal = allTodaysSales.reduce((acc, curr) => acc + (curr.hpb_points || 0), 0);
  const globalDiscountTotal = allTodaysSales.reduce((acc, curr) => acc + (curr.discount || 0), 0);

  const staffNames = Array.from(new Set(sales.map(s => s.staff_name))).sort();

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-400 font-bold">会計データを読込中...</div>;

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white pb-12 relative">
        <div className="flex items-center justify-between gap-2 mb-2 pt-4">
          <div className="flex items-center gap-2">
            <ReceiptText size={20} />
            <h1 className="text-xl font-bold">日計（会計）入力</h1>
          </div>
          <Link href="/staff-portal/sales/master">
            <Button variant="ghost" size="sm" className="bg-white/10 text-white hover:bg-white/20 border-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <Database size={12} /> Master
            </Button>
          </Link>
        </div>
        <p className="opacity-90 text-sm">お客様の会計完了後、速やかにこちらから登録してください。</p>
      </div>

      {autoCheckoutRes && (
        <CheckoutDialog 
          defaultStaffName={profile?.name || ""} 
          defaultStoreName="六甲" 
          staffList={staffNames}
          initialData={mapReservationToSalesRecord(autoCheckoutRes)}
          isOpenControlled={true}
          onSuccess={async () => {
             // Mark reservation as completed
             await updateReservationStatus(autoCheckoutRes.id, "completed");
             setAutoCheckoutRes(null);
             window.location.replace('/staff-portal/reservations'); // or back to calendar
          }}
          onOpenChangeControlled={(open) => {
            if (!open) {
              setAutoCheckoutRes(null);
              // Remove query param from URL without reload
              window.history.replaceState({}, '', window.location.pathname);
            }
          }}
        />
      )}

      <div className="-mt-6 px-4 space-y-6">
        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 flex flex-col items-center justify-center">
          <p className="text-slate-500 font-bold mb-4">{format(new Date(), "yyyy年M月d日 (E)", { locale: ja })} の売上登録</p>
          <div className="w-full flex justify-center">
            <CheckoutDialog 
              defaultStaffName={profile?.name || ""} 
              defaultStoreName="六甲" 
              staffList={staffNames} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-slate-800 ml-1 flex items-center gap-2">
            <span>あなたの本日の登録実績</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs py-0.5 px-2 rounded-full">{mySales.length}件</span>
          </h2>
          
          <div className="bg-slate-800 text-white rounded-xl shadow-sm border border-slate-700 p-4 flex justify-between items-center">
             <div>
               <p className="text-xs text-slate-400 font-medium mb-1">本日のあなたの売上</p>
               <div className="flex items-end gap-2">
                 <span className="text-2xl font-bold">¥{(todaysTechTotal + todaysProductTotal + todaysHpbTotal - todaysDiscountTotal).toLocaleString()}</span>
               </div>
             </div>
             <CheckCircle2 className="text-emerald-400 opacity-50" size={32} />
          </div>

          <div className="space-y-3 pt-2">
            {mySales.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <p className="text-sm">本日の会計データはまだありません</p>
              </div>
            ) : (
              mySales.map(sale => (
                <div key={sale.id} className={`p-4 rounded-xl shadow-sm border ${sale.status === 'closed' ? 'bg-slate-50 border-slate-200 opacity-90' : 'bg-white border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-2 border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                       <span className={`text-sm font-bold px-2 py-0.5 rounded flex items-center gap-1 ${sale.status === 'closed' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                         {sale.status === 'closed' && <Lock className="w-3 h-3" />}
                         {sale.time}
                       </span>
                      <span className="font-bold text-slate-800">{sale.customer_name} 様</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-slate-800 text-sm">¥{(sale.tech_sales + sale.product_sales + (sale.hpb_points || 0) - (sale.discount || 0)).toLocaleString()}</span>
                      </div>
                      
                      {sale.status !== 'closed' && (
                        <CheckoutDialog 
                          initialData={sale}
                          staffList={staffNames}
                          defaultStoreName={sale.store_name}
                          trigger={
                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors">
                              <Database size={16} />
                            </button>
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    <span>メニュー: <span className="text-slate-700 font-medium">{sale.menu_course || "-"}</span></span>
                    <span>支払: <span className="text-slate-700 font-medium">{sale.payment_method}</span></span>
                    {sale.discount > 0 && <span>割引: <span className="text-rose-500 font-bold">-¥{sale.discount.toLocaleString()}{sale.discount_reason ? ` (${sale.discount_reason})` : ''}</span></span>}
                    {sale.is_nominated && <span className="text-blue-500 font-bold border border-blue-200 px-1 rounded-sm bg-blue-50">指名</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-200">
          <h2 className="font-bold text-slate-800 ml-1 flex items-center gap-2">
            <Users size={18} className="text-slate-500" />
            <span>店舗全体の売上状況</span>
            <span className="bg-slate-100 text-slate-600 text-xs py-0.5 px-2 rounded-full">{allTodaysSales.length}件</span>
          </h2>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex justify-between items-center">
             <div>
               <p className="text-xs text-slate-500 font-medium mb-1">【全店舗】当日の合算売上</p>
               <div className="flex items-end gap-2">
                 <span className="text-2xl font-bold text-slate-800">¥{(globalTechTotal + globalProductTotal + globalHpbTotal - globalDiscountTotal).toLocaleString()}</span>
               </div>
             </div>
          </div>

          <div className="space-y-2 pt-2">
            {otherSales.map(sale => (
              <div key={sale.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                    {sale.staff_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-700">{sale.staff_name}</span>
                      <span className="text-[10px] text-slate-400">{sale.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{sale.store_name}店 / {sale.menu_course || "メニュー不明"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700 text-sm">¥{(sale.tech_sales + sale.product_sales + (sale.hpb_points || 0) - (sale.discount || 0)).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
