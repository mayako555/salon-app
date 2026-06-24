"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getReferralAnalytics } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, Gift, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ReferralAnalysis() {
  const { profile, isAdmin } = useAuth();
  const [period, setPeriod] = useState("this_year");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getReferralAnalytics(profile?.companyId!, undefined, period);
      if (res.success) {
        setData(res.data || []);
      }
      setLoading(false);
    }
    load();
  }, [profile, period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="期間" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">今月</SelectItem>
              <SelectItem value="last_month">先月</SelectItem>
              <SelectItem value="last_3_months">直近3ヶ月</SelectItem>
              <SelectItem value="this_year">今年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-100 shadow-sm gap-2">
          <Gift size={40} className="text-slate-200" />
          <p>対象期間の紹介データがありません</p>
        </div>
      ) : (
        <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 py-6">
            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Crown className="text-amber-500" />
              紹介アンバサダーランキング
            </CardTitle>
            <p className="text-sm font-bold text-amber-600/80">最も多くのお客様を紹介してくれた方のランキングです</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">順位</th>
                    <th className="px-6 py-4">紹介元顧客</th>
                    <th className="px-6 py-4 text-center">紹介件数</th>
                    <th className="px-6 py-4 text-right">紹介経由の累計売上</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.map((item, idx) => (
                    <tr key={item.referrerId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black">
                        {idx === 0 ? <span className="text-amber-500 text-lg flex items-center gap-1"><Crown size={16}/> 1位</span> : 
                         idx === 1 ? <span className="text-slate-400 text-lg">2位</span> : 
                         idx === 2 ? <span className="text-amber-700/60 text-lg">3位</span> : 
                         <span className="text-slate-400">{idx + 1}位</span>}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {isAdmin ? item.referrerName : <span className="text-slate-400 italic">管理者のみ表示</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 font-black px-3 py-1 rounded-full text-xs">
                          {item.referralCount}名
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-700">
                        {formatCurrency(item.referralSales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
