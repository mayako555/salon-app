"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { StaffProfile, addStaff, editStaff } from "./actions";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";

export default function StaffFormDialog({ staff }: { staff?: StaffProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employmentType, setEmploymentType] = useState(staff?.employment_type || "outsourcing");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const res = staff 
        ? await editStaff(staff.id, formData)
        : await addStaff(formData);
        
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {staff ? (
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-slate-500 hover:text-rose-600">
            <Edit2 size={16} />
            <span className="sr-only">編集</span>
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus size={16} />
            <span>新規スタッフ登録</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <DialogTitle className="font-bold text-lg text-slate-800">
            {staff ? "スタッフ情報の編集" : "スタッフの登録"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">氏名</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">姓</span>
                <input required type="text" name="last_name" defaultValue={staff?.last_name || staff?.name?.split(" ")[0]} placeholder="佐藤" className="w-full h-10 pl-6 pr-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold" />
              </div>
              <div className="relative">
                <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">名</span>
                <input required type="text" name="first_name" defaultValue={staff?.first_name || staff?.name?.split(" ")[1]} placeholder="花子" className="w-full h-10 pl-6 pr-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">姓カナ</span>
                <input required type="text" name="last_name_kana" defaultValue={staff?.last_name_kana || staff?.name_kana?.split(" ")[0]} placeholder="サトウ" className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[11px] font-bold bg-slate-50" />
              </div>
              <div className="relative">
                <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">名カナ</span>
                <input required type="text" name="first_name_kana" defaultValue={staff?.first_name_kana || staff?.name_kana?.split(" ")[1]} placeholder="ハナコ" className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[11px] font-bold bg-slate-50" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">雇用形態</label>
            <select 
              name="employment_type" 
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as any)}
              className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="outsourcing">業務委託</option>
              <option value="employee">正社員</option>
              <option value="part_time">パート</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 py-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <input type="checkbox" id={`is_trainee-${staff?.id||'new'}`} name="is_trainee" value="true" defaultChecked={staff?.is_trainee} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
              <label htmlFor={`is_trainee-${staff?.id||'new'}`} className="text-sm font-bold text-slate-700 cursor-pointer">研修中（新人）</label>
            </div>
            {employmentType === "outsourcing" && (
              <div className="flex items-center gap-2 py-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input type="checkbox" id={`is_invoice_registered-${staff?.id||'new'}`} name="is_invoice_registered" value="true" defaultChecked={staff?.is_invoice_registered} className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                <label htmlFor={`is_invoice_registered-${staff?.id||'new'}`} className="text-sm font-bold text-slate-700 cursor-pointer">インボイス登録</label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス（ログイン用）</label>
            <input required type="email" name="email" defaultValue={staff?.email} placeholder="staff@example.com" className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
          </div>

          {!staff && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">初期パスワード</label>
              <input required type="password" name="password" placeholder="6文字以上" minLength={6} className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              <p className="text-[10px] text-slate-400 mt-1">※登録と同時にログインアカウントが自動作成されます</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">アクセス権限</label>
            <select 
              name="role" 
              defaultValue={staff?.role || "staff"}
              className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="staff">スタッフ（閲覧・売上入力のみ）</option>
              <option value="manager">店長（シフト作成可）</option>
              <option value="admin">管理者（給与設定・全機能）</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-bold text-emerald-700">月間売上目標 (¥)</label>
            <input required type="number" name="monthly_sales_target" defaultValue={staff?.monthly_sales_target ?? 0} min="0" step="10000" className="w-full h-10 px-3 border-2 border-emerald-100 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold" />
            <p className="text-[10px] text-slate-400 mt-1">※ ダッシュボードの目標達成分析に使用されます</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-bold text-emerald-700">1件あたりの指名手当 (¥)</label>
            <input required type="number" name="nomination_fee" defaultValue={staff?.nomination_fee ?? 300} min="0" step="100" className="w-full h-10 px-3 border-2 border-emerald-100 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold" />
            <p className="text-[10px] text-slate-400 mt-1">※ 手当管理での指名手当自動計算に使用されます</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-bold text-emerald-700">基本時給 (¥)</label>
            <input required type="number" name="hourly_wage" defaultValue={staff?.hourly_wage ?? 0} min="0" step="50" className="w-full h-10 px-3 border-2 border-emerald-100 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold" />
            <p className="text-[10px] text-slate-400 mt-1">※ パート・時給制スタッフの給与明細自動計算の初期値として使用されます</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">希望休上限（日）</label>
            <input required type="number" name="max_holiday_requests" defaultValue={staff?.max_holiday_requests ?? 3} min="0" className="w-full h-10 px-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-bold text-amber-600">有給残日数（日）</label>
            <input required type="number" name="paid_leave_balance" defaultValue={staff?.paid_leave_balance ?? 0} min="0" className="w-full h-10 px-3 border-2 border-amber-100 rounded-md shadow-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-bold" />
            <p className="text-[10px] text-slate-400 mt-1">※ スタッフの現在の有給残日数。付与・調整時に手動で変更してください。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-bold text-blue-700">暗証番号（打刻・ポータル用）</label>
            <input required type="text" name="passcode" defaultValue={staff?.passcode || "1234"} placeholder="例: 1234" className="w-full h-10 px-3 border-2 border-blue-100 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold" />
            <p className="text-[10px] text-slate-400 mt-1">※ タイムカード打刻時およびポータルログイン時に入力する暗証番号（4桁以上推奨）</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">SNS投稿担当（連携アカウント）</label>
            <div className="grid grid-cols-2 gap-2">
              {["BROW GYM", "Jasmine Lash", "JL Academy", "岡田万耶子"].map(acc => (
                <label key={acc} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input 
                    type="checkbox" 
                    name="sns_accounts" 
                    value={acc} 
                    defaultChecked={staff?.sns_accounts?.includes(acc)}
                    className="w-4 h-4 rounded text-rose-500 border-slate-300 focus:ring-rose-500" 
                  />
                  <span className="text-xs font-bold text-slate-600">{acc}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">※ 選択したアカウントがスタッフポータルのタスクに表示されます</p>
          </div>

          <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
              {isSubmitting ? "保存中..." : staff ? "更新する" : "スタッフを登録"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
