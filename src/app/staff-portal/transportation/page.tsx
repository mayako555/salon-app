"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Train, Send, History, CheckCircle2, Clock, AlertCircle, Calendar } from "lucide-react";
import { submitTransportRequest, getStaffAllowanceHistory, AllowanceRecord } from "@/app/allowances/actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function TransportationPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<AllowanceRecord[]>([]);
  const [formData, setFormData] = useState({
    target_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    amount: "",
    details: ""
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
      // Filter for transport only if needed, but usually staff only see their requests
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
      const res = await submitTransportRequest({
        staff_id: profile.id,
        staff_name: profile.name,
        target_month: formData.target_month,
        amount: parseInt(formData.amount),
        details: formData.details
      });

      if (res.success) {
        toast.success("交通費を申請しました");
        setFormData(prev => ({ ...prev, amount: "", details: "" }));
        loadHistory(); // Refresh history
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-tighter"><CheckCircle2 size={12} /> 承認済み</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 uppercase tracking-tighter"><AlertCircle size={12} /> 却下</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 uppercase tracking-tighter"><Clock size={12} /> 承認待ち</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Train size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">交通費申請</h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Transportation Fee Portal</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Application Form */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-none shadow-2xl shadow-slate-200/60 overflow-hidden rounded-3xl">
              <CardHeader className="bg-slate-900 p-6">
                <CardTitle className="text-lg font-black text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Send size={18} className="text-blue-400" />
                  </div>
                  新規申請
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">対象月</label>
                      <div className="relative">
                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="month"
                          required
                          value={formData.target_month}
                          onChange={e => setFormData({ ...formData, target_month: e.target.value })}
                          className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">申請金額</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          placeholder="0"
                          value={formData.amount}
                          onChange={e => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-2xl text-blue-600 placeholder:text-slate-200 pr-12"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">¥</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">申請内容・区間</label>
                      <textarea
                        placeholder="例: 六甲〜三宮 (往復)、5月分定期代など"
                        required
                        rows={4}
                        value={formData.details}
                        onChange={e => setFormData({ ...formData, details: e.target.value })}
                        className="w-full p-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700 resize-none bg-slate-50/30"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-[0.98] group"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <span>申請を送信する</span>
                        <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
              <h3 className="text-blue-900 font-black flex items-center gap-2 mb-3">
                <AlertCircle size={18} />
                申請時の注意
              </h3>
              <ul className="text-sm text-blue-700/80 space-y-2 font-bold">
                <li>• 領収書がある場合は別途提出してください</li>
                <li>• 申請は毎月25日までにお願いします</li>
                <li>• 承認された金額は翌月の給与に反映されます</li>
              </ul>
            </div>
          </div>

          {/* History Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <History size={20} className="text-slate-600" />
                </div>
                申請履歴
              </h2>
              {history.length > 0 && (
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                  Total {history.length}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {historyLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-slate-50 rounded-3xl animate-pulse" />
                ))
              ) : history.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <History size={32} className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold">まだ申請履歴がありません</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {history.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-blue-100 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                            {item.target_month.replace("-", "年")}月分
                          </p>
                          <h4 className="text-2xl font-black text-slate-800">
                            ¥{item.amount.toLocaleString()}
                          </h4>
                        </div>
                        {getStatusBadge(item.target_details?.status)}
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-blue-50/50 transition-colors">
                        <p className="text-sm text-slate-600 font-bold line-clamp-2">
                          {item.target_details?.context || item.details || "詳細なし"}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Calendar size={12} />
                          申請日: {format(new Date(item.created_at), "yyyy.MM.dd HH:mm", { locale: ja })}
                        </span>
                      </div>
                      
                      {/* Decorative background element */}
                      <div className="absolute -right-4 -bottom-4 text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Train size={80} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <div className={`w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin ${className}`} />
  );
}
