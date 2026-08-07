"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { submitTransportRequest } from "@/app/allowances/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Train, 
  MapPin, 
  JapaneseYen, 
  Send, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import AuthGuard from "@/components/AuthGuard";
import { toast } from "sonner";

export default function StaffTransportPage() {
  const { profile } = useAuth();
  const [targetMonth, setTargetMonth] = useState(format(new Date(), "yyyy-MM"));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [route, setRoute] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate month options
  const monthOptions = [];
  const d = new Date();
  for (let i = -1; i < 3; i++) {
    const monthDate = new Date(d.getFullYear(), d.getMonth() + i, 1);
    monthOptions.push(format(monthDate, "yyyy-MM"));
  }

  const handleSubmit = async () => {
    if (!profile || !amount || !route || !startDate || !endDate) {
      toast.error("必須項目（期間、区間、金額）を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const details = `期間: ${startDate} 〜 ${endDate}\n区間: ${route}\n備考: ${memo}`;
      const res = await submitTransportRequest({
        staff_id: profile.id,
        staff_name: profile.name,
        target_month: targetMonth,
        amount: parseInt(amount, 10),
        details: details
      });

      if (res.success) {
        toast.success("交通費の申請を送信しました");
        setAmount("");
        setRoute("");
        setStartDate("");
        setEndDate("");
        setMemo("");
      } else {
        toast.error("申請に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard requireRole="staff" requireFeature="payroll">
      <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl shadow-sm border border-blue-200">
              <Train className="text-blue-600" />
            </div>
            交通費・定期代申請
          </h1>
          <p className="text-slate-500">通勤にかかる費用を申請します。承認後、給与に反映されます。</p>
        </div>

        <Card className="bg-white border-none shadow-md overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              申請フォーム
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                給与反映対象月
              </label>
              <Select value={targetMonth} onValueChange={setTargetMonth}>
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-blue-500">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m} value={m}>{m.replace("-", "年")}月分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  有効期間（開始）
                </label>
                <Input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  有効期間（終了）
                </label>
                <Input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" />
                利用区間・路線名
              </label>
              <Input 
                placeholder="例：西鈴蘭台（神鉄） 〜 阪神元町" 
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <JapaneseYen size={16} className="text-blue-500" />
                申請金額
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">¥</span>
                <Input 
                  type="number"
                  placeholder="0" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 bg-slate-50 border-slate-200 rounded-xl pl-10 text-2xl font-black text-slate-800 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">備考・補足事項</label>
              <textarea 
                className="w-full min-h-[100px] p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="例：勤務日数により変動の可能性があるため、差額は次月申請します。など"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-bold">申請上の注意</p>
                <p>・金額は税込で入力してください。</p>
                <p>・承認後の修正はできませんので、内容をよくご確認ください。</p>
              </div>
            </div>

            <Button 
              className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.98]"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "送信中..." : "申請を送信する"}
              <Send size={20} className="ml-3" />
            </Button>
          </CardContent>
        </Card>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            申請の履歴
          </h3>
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm">直近の申請履歴はありません</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
