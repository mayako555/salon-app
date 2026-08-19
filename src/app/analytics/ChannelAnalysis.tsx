"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getChannelAnalytics } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Users, DollarSign, TrendingUp, PieChart as ChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#ec4899", // pink
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#a855f7"  // purple
];

export default function ChannelAnalysis() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState("this_year");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getChannelAnalytics(profile?.companyId!, undefined, period);
      if (res.success) {
        setData(res.data || []);
      }
      setLoading(false);
    }
    load();
  }, [profile, period]);

  const totalCustomers = data.reduce((sum, item) => sum + item.customers, 0);
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);

  const pieData = data.map((item, idx) => ({
    name: item.channel,
    value: item.sales,
    customers: item.customers,
    color: COLORS[idx % COLORS.length]
  }));

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
        <>
          {/* Top visual breakdown charts */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-none shadow-sm bg-white md:col-span-2 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <ChartIcon size={18} className="text-indigo-500" />
                  媒体（予約経路）別売上シェア
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[260px] flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${formatCurrency(value)} (${totalSales > 0 ? Math.round((value / totalSales) * 100) : 0}%)`,
                        name
                      ]}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #f1f5f9", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                    />
                    <Legend 
                      verticalAlign="middle" 
                      align="right" 
                      layout="vertical"
                      iconType="circle"
                      wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingLeft: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">合計売上</h4>
                  <p className="text-3xl font-black text-slate-800 mt-1">{formatCurrency(totalSales)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">総来店顧客数</h4>
                  <p className="text-3xl font-black text-slate-800 mt-1">{totalCustomers}名</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">トップシェア媒体</h4>
                  <p className="text-xl font-black text-blue-600 mt-1 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs border border-blue-100">1位</span>
                    {data[0]?.channel || "なし"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 py-5">
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Globe className="text-blue-500" />
                流入経路分析一覧
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">流入経路</th>
                      <th className="px-6 py-4">顧客数 (割合)</th>
                      <th className="px-6 py-4 text-right">累計売上</th>
                      <th className="px-6 py-4 text-right">平均客単価</th>
                      <th className="px-6 py-4 text-right">リピート率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.map((item, idx) => (
                      <tr key={item.channel} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-800 flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          {item.channel}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-700">{item.customers}名</span>
                            <span className="text-xs font-bold text-slate-400">
                              ({totalCustomers > 0 ? Math.round((item.customers / totalCustomers) * 100) : 0}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2">
                            <div 
                              className="h-full rounded-full" 
                              style={{ width: `${totalCustomers > 0 ? (item.customers / totalCustomers) * 100 : 0}%`, backgroundColor: COLORS[idx % COLORS.length] }}
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
        </>
      )}
    </div>
  );
}
