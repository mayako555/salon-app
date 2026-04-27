"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { addAllowance } from "./actions";

export default function AllowanceFormDialog({ staffList }: { staffList: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState("review");
  const [countInput, setCountInput] = useState("");

  let calculatedAmount = 0;
  const count = parseInt(countInput || "0", 10);
  if (type === "review" || type === "sns") calculatedAmount = count * 500;
  if (type === "blog") calculatedAmount = count >= 5 ? 3000 : 0;
  if (type === "treatment") calculatedAmount = count >= 10 ? 5000 : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const res = await addAllowance(formData);
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
      <Button 
        className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
        onClick={() => setIsOpen(true)}
      >
        <Plus size={16} />
        <span>新規手当を追加</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-slate-800">手当の手動登録</h3>
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm"
               >
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対象月</label>
                  <input required type="month" name="target_month" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">スタッフ</label>
                  <select required name="staff_name" className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white">
                    <option value="">選択してください</option>
                    {staffList.map(staff => (
                      <option key={staff} value={staff}>{staff}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">手当種別</label>
                <select required name="type" value={type} onChange={e => { setType(e.target.value); setCountInput(""); }} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white">
                  <option value="review">口コミ手当</option>
                  <option value="blog">ブログ手当</option>
                  <option value="sns">SNS手当</option>
                  <option value="treatment">トリートメント手当</option>
                  <option value="transport">交通費</option>
                  <option value="other">その他</option>
                </select>
              </div>

              {type !== "other" && type !== "transport" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {type === "review" && "星5の件数 (件)"}
                    {type === "blog" && "月間ブログ投稿数 (本)"}
                    {type === "sns" && "SNS経由予約件数 (件)"}
                    {type === "treatment" && "トリートメントキャンペーン達成件数 (件)"}
                  </label>
                  <div className="flex items-center gap-3">
                    <input required min="0" type="number" name="dynamic_count" value={countInput} onChange={e => setCountInput(e.target.value)} placeholder="0" className="w-24 h-10 px-3 border border-slate-300 rounded-md text-sm" />
                    <span className="text-sm font-medium text-slate-600 flex-1">
                      {type === "review" && "件 × 500円"}
                      {type === "sns" && "件 × 500円"}
                      {type === "blog" && "※ 5本以上で 3,000円支給"}
                      {type === "treatment" && "※ 10件達成で 5,000円支給"}
                    </span>
                  </div>
                  {countInput && parseInt(countInput) > 0 && (
                     <p className="text-xs font-bold mt-2 p-2 rounded border flex items-center justify-between transition-colors bg-emerald-50 border-emerald-100 text-emerald-700">
                       <span>自動計算金額</span>
                       <span className="text-sm">¥{calculatedAmount.toLocaleString()}</span>
                     </p>
                  )}
                  <input type="hidden" name="amount" value={calculatedAmount} />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">金額 (円)</label>
                  <input required min="0" type="number" name="amount" placeholder="5000" className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">詳細・備考</label>
                <textarea name="detail_text" placeholder="例: 星5口コミ 10件達成など" className="w-full p-3 border border-slate-300 rounded-md text-sm min-h-[80px]" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                  {isSubmitting ? "保存中..." : "保存する"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
