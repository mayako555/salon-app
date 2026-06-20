"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getChannelAnalytics } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Users, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ChannelAnalysis() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState("this_year");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getChannelAnalytics(profile?.companyId || "company_default", undefined, period);
      if (res.success) {
        setData(res.data || []);
      }
      setLoading(false);
    }
    load();
  }, [profile, period]);

  const totalCustomers = data.reduce((sum, item) => sum + item.customers, 0);

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
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-100 shadow-sm gap-2">
          <Globe size={40} className="text-slate-200" />
          <p>対象データがありません</p>
        </div>
      ) : (
        <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 py-6">
            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Globe className="text-blue-500" />
              流入経路分析（来店きっかけ）
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">流入経路</th>
                    <th className="px-6 py-4">顧客数 (割合)</th>
                    <th className="px-6 py-4 text-right">累計売上</th>
                    <th className="px-6 py-4 text-right">平均客単価</th>
                    <th className="px-6 py-4 text-right">リピート率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.map((item) => (
                    <tr key={item.channel} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-800">
                        {item.channel}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-700">{item.customers}名</span>
                          <span className="text-xs font-bold text-slate-400">
                            ({totalCustomers > 0 ? Math.round((item.customers / totalCustomers) * 100) : 0}%)
                          </span>
                        </div>
                        {/* Progress bar visual */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${totalCustomers > 0 ? (item.customers / totalCustomers) * 100 : 0}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-700">
                        {formatCurrency(item.sales)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600">
                        {formatCurrency(item.avgSpend)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-indigo-600">
                        {item.repeatRate.toFixed(1)}%
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
