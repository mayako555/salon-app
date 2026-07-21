"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, CreditCard, Plus, Trash2 } from "lucide-react";
import { updatePaymentInfo, checkoutReservation, SalesRecord } from "./actions";
import { getMasterItems } from "./master-actions";

export default function PaymentEditDialog({ 
  initialData,
  trigger,
  isOpenControlled,
  onOpenChangeControlled,
  onSuccess,
}: { 
  initialData: SalesRecord,
  trigger?: React.ReactNode,
  isOpenControlled?: boolean,
  onOpenChangeControlled?: (open: boolean) => void,
  onSuccess?: () => void,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalOpen;
  const setIsOpen = onOpenChangeControlled !== undefined ? onOpenChangeControlled : setInternalOpen;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || "未入力");
  const [paymentStatus, setPaymentStatus] = useState(initialData?.payment_status || "unpaid");
  const [note, setNote] = useState(initialData?.note || "");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["未入力", "現金", "クレジットカード", "PayPay", "楽天Pay", "ミニモ事前決済", "スマート支払い", "複合決済", "その他"]);
  
  const [splitPayments, setSplitPayments] = useState<{ method: string, amount: number }[]>(
    initialData?.split_payments || [{ method: "現金", amount: 0 }, { method: "クレジットカード", amount: 0 }]
  );

  useEffect(() => {
    if (isOpen) {
      getMasterItems().then(items => {
        const pmItems = items.filter(item => item.itemType === "paymentMethod" && item.isActive !== false);
        if (pmItems.length > 0) {
          pmItems.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          const dbMethods = pmItems.map(p => p.name);
          const finalMethods = ["未入力", ...dbMethods];
          if (!finalMethods.includes("複合決済")) finalMethods.push("複合決済");
          if (!finalMethods.includes("その他")) finalMethods.push("その他");
          setPaymentMethods(finalMethods);
        }
      }).catch(console.error);

      // Sync initialData to state when opening
      setPaymentMethod(initialData?.payment_method || "未入力");
      setPaymentStatus(initialData?.payment_status || "unpaid");
      setNote(initialData?.note || "");
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!initialData?.id) return;

    setIsSubmitting(true);
    try {
      let res;
      if (initialData.id === "new" && initialData.source_reservation_id) {
        // If it's a new checkout from a reservation, use checkoutReservation
        res = await checkoutReservation(initialData.source_reservation_id, {
          ...initialData,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          split_payments: paymentMethod === "複合決済" ? splitPayments : undefined,
          note: note,
          status: "closed"
        });
      } else {
        res = await updatePaymentInfo(
          initialData.id, 
          paymentMethod, 
          paymentStatus, 
          note,
          paymentMethod === "複合決済" ? splitPayments : undefined
        );
      }
      if (res.success) {
        if (onSuccess) {
          await onSuccess();
        } else {
          window.location.reload();
        }
        setIsOpen(false);
      }
    } catch (err: any) {
      alert(err.message || "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {trigger && (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                 <CreditCard size={18} className="text-slate-500" />
                 支払い情報の登録・編集
               </h3>
               <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm">
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">顧客名</span>
                  <span className="font-bold text-slate-800">{initialData.customer_name || "未設定"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">来店日時</span>
                  <span className="font-bold text-slate-800">{initialData.date} {initialData.time}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500">お会計金額</span>
                  <span className="font-bold text-lg text-slate-800">
                    ¥{((initialData.tech_sales || 0) + (initialData.product_sales || 0) + (initialData.nomination_fee || 0) - (initialData.discount || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">支払方法</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full h-11 px-3 border border-slate-300 rounded-md text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      {paymentMethods.map(pm => (
                        <option 
                          key={pm} 
                          value={pm}
                          className={pm === "複合決済" ? "font-extrabold text-emerald-700 bg-emerald-50" : ""}
                        >
                          {pm === "複合決済" ? "✨ 複合決済 (現金＋カード等で分割)" : pm}
                        </option>
                      ))}
                    </select>

                    {paymentMethod === "複合決済" && (
                      <div className="mt-3 pl-4 space-y-2 border-l-2 border-slate-200">
                        {splitPayments.map((sp, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select 
                              value={sp.method} 
                              onChange={(e) => {
                                const newSp = [...splitPayments];
                                newSp[idx].method = e.target.value;
                                setSplitPayments(newSp);
                              }}
                              className="w-1/2 h-9 px-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-emerald-500"
                            >
                              {paymentMethods.filter(pm => pm !== "未入力" && pm !== "複合決済" && pm !== "その他").map(pm => (
                                <option key={pm} value={pm}>{pm}</option>
                              ))}
                            </select>
                            <div className="relative w-1/2 flex items-center">
                              <span className="absolute left-2 text-xs text-slate-500">¥</span>
                              <input 
                                type="number" 
                                className="h-9 w-full pl-6 pr-8 text-right text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500" 
                                value={sp.amount || ""}
                                onChange={(e) => {
                                  const newSp = [...splitPayments];
                                  newSp[idx].amount = parseInt(e.target.value) || 0;
                                  setSplitPayments(newSp);
                                }}
                              />
                              {idx > 1 && (
                                <button 
                                  type="button"
                                  className="absolute right-1 p-1 text-slate-400 hover:text-rose-500"
                                  onClick={() => {
                                    setSplitPayments(splitPayments.filter((_, i) => i !== idx));
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-1">
                          <button 
                            type="button"
                            className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:text-blue-700"
                            onClick={() => {
                              setSplitPayments([...splitPayments, { method: "現金", amount: 0 }]);
                            }}
                          >
                            <Plus className="w-3 h-3" /> 決済方法を追加
                          </button>
                          {(() => {
                            const expected = ((initialData.tech_sales || 0) + (initialData.product_sales || 0) + (initialData.nomination_fee || 0) - (initialData.discount || 0));
                            const current = splitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                            return (
                              <div className={`text-xs font-bold ${current === expected ? 'text-emerald-600' : 'text-rose-500'}`}>
                                合計: ¥{current.toLocaleString()} / ¥{expected.toLocaleString()}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">支払状況</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="payment_status" 
                          value="unpaid"
                          checked={paymentStatus === "unpaid"}
                          onChange={() => setPaymentStatus("unpaid")}
                          className="w-5 h-5 text-rose-500"
                        />
                        <span className="text-sm font-bold text-slate-700">未払い</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="payment_status" 
                          value="paid"
                          checked={paymentStatus === "paid"}
                          onChange={() => setPaymentStatus("paid")}
                          className="w-5 h-5 text-emerald-500"
                        />
                        <span className="text-sm font-bold text-slate-700">支払済</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">メモ (任意)</label>
                    <textarea 
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={3}
                      placeholder="備考を入力..."
                      className="w-full p-3 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                </div>

              <div className="flex gap-3 justify-end px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="min-h-[44px]"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 min-h-[44px]"
                >
                  {isSubmitting ? "保存中..." : "保存して会計完了"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
