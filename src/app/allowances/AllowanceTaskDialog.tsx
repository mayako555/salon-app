"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, MessageSquare, Edit3, Megaphone, HelpCircle, Trash2, Loader2 } from "lucide-react";
import { AllowanceTaskStatus, saveStaffAllowanceTask, markAllowanceChecked, AllowanceType, deleteAllowance } from "./actions";

type AllowanceTaskDialogProps = {
  task: AllowanceTaskStatus;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AllowanceTaskDialog({ task, isOpen, onClose, onSuccess }: AllowanceTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const STORES = ["六甲", "元町", "神戸"];

  // Pre-fill store breakdown counts for Reviews and Nominations
  const initialReviewCounts: Record<string, string> = {};
  const initialNominationCounts: Record<string, string> = {};

  STORES.forEach(store => {
    const autoReviewCount = task.review_store_breakdown?.[store] || 0;
    const hasRegisteredReview = task.allowances.some(a => a.type === "review" && a.store_name === store);
    initialReviewCounts[store] = hasRegisteredReview ? "" : (autoReviewCount || "").toString();

    const autoNominationCount = task.nomination_store_breakdown?.[store] || 0;
    const hasRegisteredNomination = task.allowances.some(a => a.type === "nomination" && a.store_name === store);
    initialNominationCounts[store] = hasRegisteredNomination ? "" : (autoNominationCount || "").toString();
  });

  const [reviewStoreCounts, setReviewStoreCounts] = useState<Record<string, string>>(initialReviewCounts);
  const [nominationStoreCounts, setNominationStoreCounts] = useState<Record<string, string>>(initialNominationCounts);

  // Other one-off allowances (SNS, Blog, Treatment)
  const [blogCount, setBlogCount] = useState("");
  const [snsCount, setSnsCount] = useState("");
  const [treatmentCount, setTreatmentCount] = useState("");
  
  const [blogStore, setBlogStore] = useState("六甲");
  const [snsStore, setSnsStore] = useState("六甲");
  const [treatmentStore, setTreatmentStore] = useState("六甲");

  const calculateAmount = (type: AllowanceType, countStr: string) => {
    const count = parseInt(countStr || "0", 10);
    if (type === "review" || type === "sns") return count * 500;
    if (type === "nomination") return count * (task.nomination_fee_unit || 300);
    if (type === "blog") return count >= 5 ? 3000 : 0;
    if (type === "treatment") return count >= 10 ? 5000 : 0;
    return 0;
  };

  const handleReviewStoreCountChange = (store: string, val: string) => {
    setReviewStoreCounts(prev => ({ ...prev, [store]: val }));
  };

  const handleNominationStoreCountChange = (store: string, val: string) => {
    setNominationStoreCounts(prev => ({ ...prev, [store]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const allowances = [];
      
      // Store-breakdown Review & Nomination allowances
      STORES.forEach(store => {
        const reviewCountStr = reviewStoreCounts[store];
        const rAmount = calculateAmount("review", reviewCountStr);
        if (rAmount > 0) {
          allowances.push({
            type: "review" as AllowanceType,
            amount: rAmount,
            store_name: store,
            target_details: { count: parseInt(reviewCountStr) }
          });
        }

        const nominationCountStr = nominationStoreCounts[store];
        const nAmount = calculateAmount("nomination", nominationCountStr);
        if (nAmount > 0) {
          allowances.push({
            type: "nomination" as AllowanceType,
            amount: nAmount,
            store_name: store,
            target_details: { count: parseInt(nominationCountStr) }
          });
        }
      });

      // Blog, SNS, Treatment
      const bAmount = calculateAmount("blog", blogCount);
      if (bAmount > 0) allowances.push({ type: "blog" as AllowanceType, amount: bAmount, store_name: blogStore, target_details: { count: parseInt(blogCount) } });
      
      const sAmount = calculateAmount("sns", snsCount);
      if (sAmount > 0) allowances.push({ type: "sns" as AllowanceType, amount: sAmount, store_name: snsStore, target_details: { count: parseInt(snsCount) } });
      
      const tAmount = calculateAmount("treatment", treatmentCount);
      if (tAmount > 0) allowances.push({ type: "treatment" as AllowanceType, amount: tAmount, store_name: treatmentStore, target_details: { count: parseInt(treatmentCount) } });

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllowance = async (id: string) => {
    if (!confirm("この手当データを削除してよろしいですか？")) return;
    
    setIsDeleting(id);
    try {
      const res = await deleteAllowance(id);
      if (res.success) {
        onSuccess(); 
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("削除中にエラーが発生しました");
    } finally {
      setIsDeleting(null);
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

  const hasAnyInput = STORES.some(s => reviewStoreCounts[s] || nominationStoreCounts[s]) || blogCount || snsCount || treatmentCount;

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
                      {a.type === 'nomination' && <span className="text-emerald-500 font-bold">★</span>}
                      {a.type === 'blog' && <Edit3 size={14} className="text-blue-500" />}
                      {a.type === 'sns' && <Megaphone size={14} className="text-cyan-500" />}
                      {a.type === 'treatment' && <HelpCircle size={14} className="text-amber-500" />}
                      {a.type === 'transport' && <span className="text-slate-500">🚆</span>}
                      {a.type === 'other' && <span className="text-slate-500">📦</span>}
                      {a.type === 'review' ? '口コミ手当' : a.type === 'nomination' ? '指名手当' : a.type === 'blog' ? 'ブログ' : a.type === 'sns' ? 'SNS' : a.type === 'treatment' ? 'トリートメント' : a.type === 'transport' ? '交通費申請' : 'その他'}
                      {a.store_name && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 ml-1">
                          {a.store_name}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-600">¥{a.amount.toLocaleString()}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteAllowance(a.id)}
                        disabled={isDeleting === a.id}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                      >
                        {isDeleting === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">※追加で登録する場合のみ下部に入力してください。</p>
            </div>
          )}

          <form id="allowance-form" onSubmit={handleSave} className="space-y-6">
            
            {/* Store breakdown grid for reviews and nominations */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/80">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">店舗別手当自動集計・入力</h4>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th className="px-4 py-3 font-bold text-slate-500 w-[90px]">対象店舗</th>
                    <th className="px-4 py-3 font-bold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-pink-500" />
                        <span>口コミ手当 (★5数)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5 block">1件 500円</span>
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-black text-sm">★</span>
                        <span>指名手当 (指名数)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5 block">1件 {task.nomination_fee_unit || 300}円</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {STORES.map(store => {
                    const reviewCountVal = reviewStoreCounts[store] || "";
                    const nominationCountVal = nominationStoreCounts[store] || "";
                    
                    const reviewAmt = calculateAmount("review", reviewCountVal);
                    const nominationAmt = calculateAmount("nomination", nominationCountVal);
                    
                    return (
                      <tr key={store} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-black text-slate-800 text-sm">{store}店</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="0" 
                              value={reviewCountVal} 
                              onChange={e => handleReviewStoreCountChange(store, e.target.value)} 
                              placeholder="0" 
                              className="w-14 h-9 px-2 border border-slate-200 rounded-md text-center font-bold focus:ring-2 focus:ring-pink-500/20 outline-none transition-all text-xs" 
                            />
                            <span className="text-slate-500 font-medium shrink-0">件</span>
                            <span className="font-bold text-emerald-600 text-[10px] shrink-0 ml-1 w-[45px] text-right">
                              {reviewAmt > 0 ? `¥${reviewAmt.toLocaleString()}` : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="0" 
                              value={nominationCountVal} 
                              onChange={e => handleNominationStoreCountChange(store, e.target.value)} 
                              placeholder="0" 
                              className="w-14 h-9 px-2 border border-slate-200 rounded-md text-center font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-xs" 
                            />
                            <span className="text-slate-500 font-medium shrink-0">件</span>
                            <span className="font-bold text-emerald-600 text-[10px] shrink-0 ml-1 w-[55px] text-right">
                              {nominationAmt > 0 ? `¥${nominationAmt.toLocaleString()}` : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Other allowances */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">その他の手当</h4>

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
                  <select value={snsStore} onChange={e => setSnsStore(e.target.value)} className="h-10 px-2 border border-slate-300 rounded-md text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-emerald-500/20">
                    {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                  <select value={blogStore} onChange={e => setBlogStore(e.target.value)} className="h-10 px-2 border border-slate-300 rounded-md text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-emerald-500/20">
                    {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                  <select value={treatmentStore} onChange={e => setTreatmentStore(e.target.value)} className="h-10 px-2 border border-slate-300 rounded-md text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-emerald-500/20">
                    {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
            disabled={isSubmitting || !hasAnyInput} 
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
