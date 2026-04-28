"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, MessageSquare, Edit3, Megaphone, HelpCircle } from "lucide-react";
import { AllowanceTaskStatus, saveStaffAllowanceTask, markAllowanceChecked, AllowanceType } from "./actions";

type AllowanceTaskDialogProps = {
  task: AllowanceTaskStatus;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AllowanceTaskDialog({ task, isOpen, onClose, onSuccess }: AllowanceTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States for each allowance type (Review, Blog, SNS, Treatment)
  const [reviewCount, setReviewCount] = useState("");
  const [blogCount, setBlogCount] = useState("");
  const [snsCount, setSnsCount] = useState("");
  const [treatmentCount, setTreatmentCount] = useState("");

  const calculateAmount = (type: AllowanceType, countStr: string) => {
    const count = parseInt(countStr || "0", 10);
    if (type === "review" || type === "sns") return count * 500;
    if (type === "blog") return count >= 5 ? 3000 : 0;
    if (type === "treatment") return count >= 10 ? 5000 : 0;
    return 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const allowances = [];
      
      const rAmount = calculateAmount("review", reviewCount);
      if (rAmount > 0) allowances.push({ type: "review" as AllowanceType, amount: rAmount, target_details: { count: parseInt(reviewCount) } });
      
      const bAmount = calculateAmount("blog", blogCount);
      if (bAmount > 0) allowances.push({ type: "blog" as AllowanceType, amount: bAmount, target_details: { count: parseInt(blogCount) } });
      
      const sAmount = calculateAmount("sns", snsCount);
      if (sAmount > 0) allowances.push({ type: "sns" as AllowanceType, amount: sAmount, target_details: { count: parseInt(snsCount) } });
      
      const tAmount = calculateAmount("treatment", treatmentCount);
      if (tAmount > 0) allowances.push({ type: "treatment" as AllowanceType, amount: tAmount, target_details: { count: parseInt(treatmentCount) } });

      const res = await saveStaffAllowanceTask({
        staff_id: task.staff_id,
        staff_name: task.staff_name,
        target_month: task.target_month,
        allowances
      });

      if (res.success) {
        onSuccess();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkNoAllowance = async () => {
    setIsSubmitting(true);
    try {
      const res = await markAllowanceChecked(task.staff_id, task.target_month);
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-auto animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
           <div>
             <h3 className="font-bold text-lg text-slate-800">{task.staff_name} の手当入力</h3>
             <p className="text-xs text-slate-500">{task.target_month}分</p>
           </div>
           <button 
             onClick={onClose}
             className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm"
           >
             <X size={20} />
           </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          {task.allowances.length > 0 && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">既に登録済みの手当</h4>
              <div className="space-y-2">
                {task.allowances.map(a => (
                  <div key={a.id} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-md text-sm">
                    <span className="font-medium flex items-center gap-2">
                      {a.type === 'review' && <MessageSquare size={14} className="text-pink-500" />}
                      {a.type === 'blog' && <Edit3 size={14} className="text-blue-500" />}
                      {a.type === 'sns' && <Megaphone size={14} className="text-cyan-500" />}
                      {a.type === 'treatment' && <HelpCircle size={14} className="text-amber-500" />}
                      {a.type === 'transport' && <span className="text-slate-500">🚆</span>}
                      {a.type === 'other' && <span className="text-slate-500">📦</span>}
                      {a.type === 'review' ? '口コミ' : a.type === 'blog' ? 'ブログ' : a.type === 'sns' ? 'SNS' : a.type === 'treatment' ? 'トリートメント' : a.type === 'transport' ? '交通費申請' : 'その他'}
                    </span>
                    <span className="font-bold text-emerald-600">¥{a.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">※追加で登録する場合のみ下部に入力してください。</p>
            </div>
          )}

          <form id="allowance-form" onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Review */}
              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <MessageSquare size={16} className="text-pink-500" />
                    口コミ手当
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">星5の件数 × 500円</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={reviewCount} onChange={e => setReviewCount(e.target.value)} placeholder="0" className="w-16 h-10 px-2 border border-slate-300 rounded-md text-center font-bold" />
                  <span className="text-sm font-medium text-slate-600">件</span>
                </div>
                <div className="w-20 text-right font-bold text-emerald-600">
                  ¥{calculateAmount("review", reviewCount).toLocaleString()}
                </div>
              </div>

              {/* SNS */}
              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Megaphone size={16} className="text-cyan-500" />
                    SNS手当
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">SNS経由予約数 × 500円</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={snsCount} onChange={e => setSnsCount(e.target.value)} placeholder="0" className="w-16 h-10 px-2 border border-slate-300 rounded-md text-center font-bold" />
                  <span className="text-sm font-medium text-slate-600">件</span>
                </div>
                <div className="w-20 text-right font-bold text-emerald-600">
                  ¥{calculateAmount("sns", snsCount).toLocaleString()}
                </div>
              </div>

              {/* Blog */}
              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Edit3 size={16} className="text-blue-500" />
                    ブログ手当
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">5本以上で 3,000円支給</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={blogCount} onChange={e => setBlogCount(e.target.value)} placeholder="0" className="w-16 h-10 px-2 border border-slate-300 rounded-md text-center font-bold" />
                  <span className="text-sm font-medium text-slate-600">本</span>
                </div>
                <div className="w-20 text-right font-bold text-emerald-600">
                  ¥{calculateAmount("blog", blogCount).toLocaleString()}
                </div>
              </div>

              {/* Treatment */}
              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <HelpCircle size={16} className="text-amber-500" />
                    トリートメント手当
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">10件達成で 5,000円支給</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={treatmentCount} onChange={e => setTreatmentCount(e.target.value)} placeholder="0" className="w-16 h-10 px-2 border border-slate-300 rounded-md text-center font-bold" />
                  <span className="text-sm font-medium text-slate-600">件</span>
                </div>
                <div className="w-20 text-right font-bold text-emerald-600">
                  ¥{calculateAmount("treatment", treatmentCount).toLocaleString()}
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleMarkNoAllowance} 
            disabled={isSubmitting}
            className="text-slate-600 border-slate-300 bg-white"
          >
            {task.allowances.length > 0 ? "追加なしで完了" : "手当なし（該当なし）で完了"}
          </Button>
          
          <Button 
            form="allowance-form"
            type="submit" 
            disabled={isSubmitting || (!reviewCount && !blogCount && !snsCount && !treatmentCount)} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? "保存中..." : "追加して確認済にする"}
          </Button>
        </div>
      </div>
    </div>
  );
}
