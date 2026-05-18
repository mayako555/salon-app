"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { 
  Train, 
  Send, 
  History, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  MapPin,
  FileText,
  ChevronDown
} from "lucide-react";
import { submitTransportRequest, getStaffAllowanceHistory, AllowanceRecord } from "@/app/allowances/actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TransportationPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<AllowanceRecord[]>([]);
  
  // Form states based on screenshot
  const [formData, setFormData] = useState({
    target_month: format(new Date(), "yyyy-MM"),
    valid_from: "",
    valid_to: "",
    route: "",
    amount: "",
    notes: ""
  });

  // Generate target month options (current + next 2 months)
  const monthOptions = Array.from({ length: 4 }).map((_, i) => {
    const d = addMonths(startOfMonth(new Date()), i - 1);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "yyyy年MM月分", { locale: ja })
    };
  });

  useEffect(() => {
    if (profile) {
      loadHistory();
    }
  }, [profile]);

  async function loadHistory() {
    if (!profile) return;
    setHistoryLoading(true);
    try {
      const data = await getStaffAllowanceHistory(profile.id);
      setHistory(data.filter(i => i.type === "transport"));
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!formData.amount || parseInt(formData.amount) <= 0) {
      toast.error("金額を正しく入力してください");
      return;
    }

    setLoading(true);
    try {
      // Construct a detailed context string
      const detailedContext = `【区間】${formData.route}\n【期間】${formData.valid_from} 〜 ${formData.valid_to}\n【備考】${formData.notes}`;

      const res = await submitTransportRequest({
        staff_id: profile.id,
        staff_name: profile.name,
        target_month: formData.target_month,
        amount: parseInt(formData.amount),
        details: detailedContext
      });

      if (res.success) {
        toast.success("交通費を申請しました");
        setFormData({
          ...formData,
          valid_from: "",
          valid_to: "",
          route: "",
          amount: "",
          notes: ""
        });
        loadHistory();
      } else {
        toast.error(res.error || "申請に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest"><CheckCircle2 size={12} /> 承認済み</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest"><AlertCircle size={12} /> 却下</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest"><Clock size={12} /> 承認待ち</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-[2rem] flex items-center justify-center text-blue-600 shadow-xl shadow-blue-100 border border-blue-50">
            <Train size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">交通費・定期代申請</h1>
            <p className="text-sm text-slate-400 font-bold">通勤にかかる費用を申請します。承認後、給与に反映されます。</p>
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 overflow-hidden relative"
        >
          <div className="flex items-center gap-3 mb-10 pb-4 border-b border-slate-50">
             <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
             <h2 className="text-xl font-black text-slate-900">申請フォーム</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Target Month */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-slate-900 ml-1">
                <Calendar size={16} className="text-blue-500" /> 給与反映対象月
              </label>
              <div className="relative group">
                <select
                  value={formData.target_month}
                  onChange={e => setFormData({ ...formData, target_month: e.target.value })}
                  className="w-full h-14 pl-6 pr-12 rounded-2xl bg-slate-50/50 border-2 border-slate-50 hover:border-blue-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black text-slate-900 ml-1">
                  <Clock size={16} className="text-blue-500" /> 有効期間（開始）
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.valid_from}
                    onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50/50 border-2 border-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black text-slate-900 ml-1">
                  <Clock size={16} className="text-blue-500" /> 有効期間（終了）
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.valid_to}
                    onChange={e => setFormData({ ...formData, valid_to: e.target.value })}
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50/50 border-2 border-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-slate-900 ml-1">
                <MapPin size={16} className="text-blue-500" /> 利用区間・路線名
              </label>
              <input
                type="text"
                required
                placeholder="例：西鈴蘭台（神鉄） 〜 阪神元町"
                value={formData.route}
                onChange={e => setFormData({ ...formData, route: e.target.value })}
                className="w-full h-14 px-6 rounded-2xl bg-slate-50/50 border-2 border-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
              />
            </div>

            {/* Amount */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-slate-900 ml-1">
                <span className="text-blue-500 font-black text-lg leading-none">¥</span> 申請金額
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full h-16 px-10 rounded-2xl bg-slate-50/50 border-2 border-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-3xl text-blue-600 placeholder:text-slate-200"
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">¥</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-slate-900 ml-1">
                <FileText size={16} className="text-blue-500" /> 備考・補足事項
              </label>
              <textarea
                placeholder="例：勤務日数により変動の可能性があるため、差額は次月申請します。など"
                rows={4}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-6 rounded-2xl bg-slate-50/50 border-2 border-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 resize-none placeholder:text-slate-300"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-xl shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] mt-4"
            >
              {loading ? "送信中..." : "申請を送信する"}
            </Button>
          </form>

          {/* Tips Section */}
          <div className="mt-12 p-8 bg-blue-50/30 rounded-[2rem] border border-blue-100/50">
            <h3 className="text-blue-950 font-black flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-blue-500" />
              申請上の注意
            </h3>
            <ul className="text-sm text-blue-900/60 space-y-2 font-bold leading-relaxed">
              <li>• 定期代または実費分を正確に入力してください</li>
              <li>• 領収書の提出が必要な場合は、管理者に提示をお願いします</li>
              <li>• 承認された交通費は、対象月の給与と合算して振り込まれます</li>
            </ul>
          </div>
        </motion.div>

        {/* History Section */}
        <div className="space-y-6 pt-8">
           <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 ml-2">
             <History className="text-slate-400" />
             これまでの申請履歴
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {historyLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-40 bg-white rounded-[2rem] animate-pulse shadow-sm" />
                ))
              ) : history.length === 0 ? (
                <div className="md:col-span-2 bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[3rem] py-16 text-center">
                  <History size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">申請履歴はまだありません</p>
                </div>
              ) : history.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">
                        {item.target_month}分
                      </span>
                      <p className="text-2xl font-black text-slate-900">¥{item.amount.toLocaleString()}</p>
                    </div>
                    {getStatusBadge(item.target_details?.status)}
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl min-h-[4rem]">
                    <p className="text-xs text-slate-500 font-bold line-clamp-3 whitespace-pre-wrap">
                      {item.target_details?.context || "詳細なし"}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>申請日: {format(new Date(item.created_at), "yyyy.MM.dd", { locale: ja })}</span>
                    <Train size={16} className="opacity-20 group-hover:opacity-100 group-hover:text-blue-500 transition-all group-hover:translate-x-2" />
                  </div>
                </motion.div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
