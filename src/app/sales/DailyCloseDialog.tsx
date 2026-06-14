"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, X, Plus, Minus, Info, Calculator, CheckCircle2, AlertTriangle } from "lucide-react";
import { closeDailySales, getMonthlySales, SalesRecord } from "./actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DailyCloseDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dailySales, setDailySales] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual inputs for cash drawer
  const [openingCash, setOpeningCash] = useState(30000);
  const [cashIn, setCashIn] = useState(0);
  const [cashOut, setCashOut] = useState(0);
  const [actualCash, setActualCash] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadDailyData();
    }
  }, [isOpen, selectedDate]);

  async function loadDailyData() {
    setLoading(true);
    const [y, m, d] = selectedDate.split("-").map(Number);
    const sales = await getMonthlySales(y, m);
    const daily = sales.filter(s => s.date === selectedDate);
    setDailySales(daily);
    setLoading(false);
  }

  // Aggregation Logic
  const totals = {
    cash: 0,
    credit: 0,
    eMoney: 0,
    smart: 0,
    points: 0,
    gift: 0,
    others: 0,
    tech: 0,
    product: 0,
    discount: 0,
    option: 0, // In this app, nomination fee + option strings. For now let's use nomination_fee
  };

  dailySales.forEach(s => {
    // Payment Method
    if (s.payment_method === '現金') totals.cash += s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0) - (s.hpb_points || 0);
    else if (s.payment_method === 'クレジットカード') totals.credit += s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0) - (s.hpb_points || 0);
    else if (['PayPay', '楽天Pay'].includes(s.payment_method)) totals.eMoney += s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0) - (s.hpb_points || 0);
    else if (s.payment_method === 'ミニモ事前決済') totals.smart += s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0) - (s.hpb_points || 0);
    else totals.others += s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0) - (s.hpb_points || 0);

    // Points (HPB Points)
    totals.points += (s.hpb_points || 0);

    // Sales Categories
    totals.tech += s.tech_sales;
    totals.product += s.product_sales;
    totals.discount += (s.discount || 0);
    totals.option += (s.nomination_fee || 0);
  });

  const expectedCash = openingCash + totals.cash + cashIn - cashOut;
  const cashGap = actualCash - expectedCash;
  const netSales = totals.tech + totals.product + totals.option - totals.discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(cashGap) > 0) {
      if (!confirm(`過不足が ${cashGap.toLocaleString()}円 あります。このままレジ締めを完了しますか？`)) return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await closeDailySales(selectedDate);
      if (res.success) {
        setIsOpen(false);
        alert(`対象日（${selectedDate}）の会計データを締めました。`);
        window.location.reload();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline"
        className="gap-2 bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-0 h-10 shadow-lg shadow-slate-200"
        onClick={() => setIsOpen(true)}
      >
        <Lock size={16} />
        <span className="font-black">レジ締め</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f4f7f9] rounded-[2rem] shadow-2xl w-full max-w-5xl my-auto animate-in fade-in zoom-in-95 duration-300 border border-white/20">
            {/* Header */}
            <div className="flex justify-between items-center px-10 py-6 border-b border-slate-200 bg-white rounded-t-[2rem]">
               <div>
                 <h3 className="font-black text-2xl text-slate-900 flex items-center gap-3">
                   <Calculator size={28} className="text-blue-600" />
                   レジ締め
                 </h3>
                 <p className="text-slate-500 text-sm mt-1 font-medium">一日の業務終了時に、お金のやり取りが正しかったかを確認してください。</p>
               </div>
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-100"
               >
                 <X size={24} />
               </button>
            </div>
            
            <div className="p-10">
              {/* Date & Info Selection */}
              <div className="flex flex-wrap items-center gap-6 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-black text-slate-600">レジ締め日</label>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  />
                </div>
                <div className="h-8 w-px bg-slate-200 hidden md:block" />
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Info size={14} />
                  <span>対象予約数: {dailySales.length}件</span>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold">データを集計中...</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left: Sales by Payment Method */}
                  <div className="lg:col-span-4 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-3 bg-blue-500 rounded-full" />
                      会計のレジ金情報
                    </h4>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <tbody>
                          {[
                            { label: "現金", value: totals.cash, isCash: true },
                            { label: "ギフト券", value: totals.gift },
                            { label: "ポイント", value: totals.points },
                            { label: "スマート支払い", value: totals.smart },
                            { label: "クレジットカード", value: totals.credit },
                            { label: "電子マネー", value: totals.eMoney },
                            { label: "その他", value: totals.others },
                          ].map((row, idx) => (
                            <tr key={idx} className={cn("border-b border-slate-50 last:border-0", row.isCash && "bg-blue-50/50")}>
                              <td className="py-4 px-6 font-black text-slate-600">{row.label}</td>
                              <td className="py-4 px-6 text-right font-black text-slate-900 tabular-nums">
                                {row.value.toLocaleString()} <span className="text-[10px] text-slate-400 ml-1">円</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Middle: Plus/Minus and Totals */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4">
                      {/* Cash Logic Section */}
                      <div className="md:col-span-4 space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-3 bg-emerald-500 rounded-full" />
                          会計以外のレジ金情報
                        </h4>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">レジ準備金</label>
                            <input 
                              type="number" 
                              value={openingCash} 
                              onChange={(e) => setOpeningCash(Number(e.target.value))}
                              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-black text-slate-900" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">レジ入金額</label>
                            <div className="relative">
                              <Plus className="absolute left-3 top-3.5 text-emerald-500" size={14} />
                              <input 
                                type="number" 
                                value={cashIn} 
                                onChange={(e) => setCashIn(Number(e.target.value))}
                                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-black text-emerald-600" 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">レジ出金額</label>
                            <div className="relative">
                              <Minus className="absolute left-3 top-3.5 text-rose-500" size={14} />
                              <input 
                                type="number" 
                                value={cashOut} 
                                onChange={(e) => setCashOut(Number(e.target.value))}
                                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-black text-rose-600" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-1 flex justify-center">
                        <div className="text-3xl font-black text-slate-300">=</div>
                      </div>

                      {/* Expected vs Actual */}
                      <div className="md:col-span-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
                            <p className="text-[10px] font-black text-blue-200 uppercase mb-2">想定のレジ金</p>
                            <p className="text-2xl font-black tabular-nums">{expectedCash.toLocaleString()}<span className="text-xs ml-1 opacity-60">円</span></p>
                          </div>
                          <div className={cn(
                            "p-6 rounded-2xl shadow-lg transition-all",
                            cashGap === 0 ? "bg-emerald-500 shadow-emerald-100" : "bg-rose-500 shadow-rose-100"
                          )}>
                            <p className={cn("text-[10px] font-black uppercase mb-2", cashGap === 0 ? "text-emerald-100" : "text-rose-100")}>
                              レジ過不足金額
                            </p>
                            <p className="text-2xl font-black tabular-nums text-white">
                              {cashGap > 0 ? "+" : ""}{cashGap.toLocaleString()}
                              <span className="text-xs ml-1 opacity-60">円</span>
                            </p>
                          </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border-2 border-blue-600 shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5">
                            <CheckCircle2 size={100} />
                          </div>
                          <label className="text-sm font-black text-slate-900 block mb-3">実際のレジ金を入力してください</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              autoFocus
                              value={actualCash || ""} 
                              onChange={(e) => setActualCash(Number(e.target.value))}
                              placeholder="金額を入力"
                              className="w-full h-20 text-4xl px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-right font-black text-slate-900 focus:outline-none focus:border-blue-600 transition-all placeholder:text-slate-200" 
                            />
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl">¥</div>
                          </div>
                          {cashGap !== 0 && (
                            <p className="mt-4 flex items-center gap-2 text-rose-500 text-xs font-bold animate-pulse">
                              <AlertTriangle size={14} />
                              システム上の計算と一致しません。再度確認してください。
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Summary: Sales Report Style */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                         <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                           <div className="w-1.5 h-3 bg-slate-800 rounded-full" />
                           売上報告
                         </h4>
                         <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{selectedDate} (時点)</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">施術</p>
                          <p className="text-lg font-black text-slate-900">¥{totals.tech.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">店販</p>
                          <p className="text-lg font-black text-slate-900">¥{totals.product.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">オプション</p>
                          <p className="text-lg font-black text-slate-900">¥{totals.option.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-400 uppercase mb-1">割引</p>
                          <p className="text-lg font-black text-rose-500">-¥{totals.discount.toLocaleString()}</p>
                        </div>
                        <div className="md:border-l md:pl-8 border-slate-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase mb-1">純売上</p>
                          <p className="text-2xl font-black text-blue-700">¥{netSales.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 pt-10 border-t border-slate-200">
                <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
                  <ShieldCheck className="text-slate-300" size={20} />
                  <span>完了すると、この日のデータは「確定」となりロックされます。</span>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsOpen(false)} 
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none h-14 px-10 text-slate-500 font-black"
                  >
                    キャンセル
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || loading} 
                    className="flex-1 md:flex-none h-14 px-16 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95"
                  >
                    {isSubmitting ? "処理中..." : "レジ締め完了"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShieldCheck({ size, className }: { size?: number, className?: string }) {
  return <ShieldCheckIcon size={size} className={className} />;
}

import { ShieldCheck as ShieldCheckIcon } from "lucide-react";
