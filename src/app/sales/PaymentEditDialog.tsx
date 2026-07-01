"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, CreditCard } from "lucide-react";
import { updatePaymentInfo, SalesRecord } from "./actions";

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

  const paymentMethods = ["未入力", "現金", "クレジットカード", "PayPay", "楽天Pay", "ミニモ事前決済", "スマート支払い", "その他"];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!initialData?.id) return;

    setIsSubmitting(true);
    try {
      const res = await updatePaymentInfo(initialData.id, paymentMethod, paymentStatus, note);
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
                    className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
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
                        className="w-4 h-4 text-rose-500"
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
                        className="w-4 h-4 text-emerald-500"
                      />
                      <span className="text-sm font-bold text-slate-700">支払い済み</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">メモ (任意)</label>
                  <textarea 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="レジと差異がある場合などのメモ"
                    className="w-full p-3 border border-slate-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                  {isSubmitting ? "保存中..." : "支払い情報を保存"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
