"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Train, Send, History } from "lucide-react";
import { submitTransportRequest } from "@/app/allowances/actions";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function TransportationPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    target_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    amount: "",
    details: ""
  });

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
      } else {
        toast.error(res.error || "申請に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Train size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">交通費申請</h1>
            <p className="text-sm text-slate-500 font-medium">Transportation Fee Application</p>
          </div>
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send size={18} className="text-blue-400" />
              申請フォーム
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">対象月</label>
                  <input
                    type="month"
                    required
                    value={formData.target_month}
                    onChange={e => setFormData({ ...formData, target_month: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">申請金額 (¥)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">¥</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">詳細内容 (区間など)</label>
                <textarea
                  placeholder="例: 六甲〜三宮 (往復)、定期代など"
                  required
                  rows={3}
                  value={formData.details}
                  onChange={e => setFormData({ ...formData, details: e.target.value })}
                  className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    送信中...
                  </div>
                ) : (
                  "申請を送信する"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
          <h3 className="text-blue-900 font-black flex items-center gap-2 mb-2">
            <History size={18} />
            申請の確認について
          </h3>
          <p className="text-sm text-blue-700 leading-relaxed font-medium">
            送信された申請は管理者による承認後、給与計算に反映されます。
            申請内容に不備がある場合は、担当者より連絡させていただきます。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
