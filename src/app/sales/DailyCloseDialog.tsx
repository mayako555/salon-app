"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, X } from "lucide-react";
import { closeDailySales } from "./actions";

export default function DailyCloseDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const date = formData.get("date") as string;
      const res = await closeDailySales(date);
      if (res.success) {
        setIsOpen(false);
        alert(`対象日（${date}）の会計データ ${res.count}件 を締め（ロック）処理しました。`);
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
        className="gap-2 bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-0"
        onClick={() => setIsOpen(true)}
      >
        <Lock size={16} />
        <span className="hidden sm:inline">日次締め（ロック）</span>
        <span className="inline sm:hidden">日次締め</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                 <Lock size={18} className="text-slate-500" />
                 日次締め処理
               </h3>
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm"
               >
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <p className="text-sm text-slate-600">
                指定した日付の売上データを「確定（締め済）」状態にし、以降の編集やスタッフポータルからの新規追加をロックします。
              </p>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">締める日付を選択</label>
                <input required type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm cursor-pointer" />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-slate-800 hover:bg-slate-900 text-white min-w-[120px]">
                  {isSubmitting ? "処理中..." : "締めを実行"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
