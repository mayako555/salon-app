"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { addStaff } from "./actions";

export default function StaffFormDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employmentType, setEmploymentType] = useState("outsourcing");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const res = await addStaff(formData);
      if (res.success) {
        setIsOpen(false);
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
      <Button className="gap-2" onClick={() => setIsOpen(true)}>
        <Plus size={16} />
        <span>新規スタッフ登録</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-slate-800">スタッフの登録</h3>
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white"
               >
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">氏名</label>
                <input required type="text" name="name" placeholder="佐藤 花子" className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">雇用形態</label>
                <select 
                  name="employment_type" 
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                >
                  <option value="outsourcing">業務委託</option>
                  <option value="employee">正社員</option>
                  <option value="part_time">パート</option>
                </select>
              </div>

              {employmentType === "outsourcing" && (
                <div className="flex items-center gap-2 py-2">
                  <input type="checkbox" id="is_invoice_registered" name="is_invoice_registered" value="true" className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                  <label htmlFor="is_invoice_registered" className="text-sm font-medium text-slate-700 cursor-pointer">インボイス登録済み</label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス（ログイン用）</label>
                <input required type="email" name="email" placeholder="staff@example.com" className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">初期パスワード</label>
                <input required type="password" name="password" placeholder="6文字以上" minLength={6} className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                <p className="text-[10px] text-slate-400 mt-1">※登録と同時にログインアカウントが自動作成されます</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">アクセス権限</label>
                <select 
                  name="role" 
                  defaultValue="staff"
                  className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                >
                  <option value="staff">スタッフ（閲覧・売上入力のみ）</option>
                  <option value="manager">店長（シフト作成可）</option>
                  <option value="admin">管理者（給与設定・全機能）</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">希望休上限（日）</label>
                <input required type="number" name="max_holiday_requests" defaultValue="3" min="0" className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
                  {isSubmitting ? "登録中..." : "スタッフを登録"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
