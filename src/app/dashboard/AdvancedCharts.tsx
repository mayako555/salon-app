"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  ComposedChart,
  Area,
  LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, PieChart, Activity, Loader2, Sparkles, Users } from "lucide-react";
import { getAdvancedAnalytics } from "./actions";

export default function AdvancedCharts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getAdvancedAnalytics();
        if (res.success && res.data) {
          setData(res.data);
        } else {
          console.error("Analytics fetch failed:", res.error);
        }
      } catch (err) {
        console.error("Analytics Error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = data.map(d => {
    const stores: any = {};
    Object.entries(d.stores).forEach(([name, vals]: [string, any]) => {
      stores[name] = {
        regular: vals.total - vals.minimo,
        minimo: vals.minimo,
        total: vals.total,
        nextBookingRatio: vals.count > 0 ? Math.round((vals.nextBookings / vals.count) * 100) : 0,
        nextBookingVisits: vals.nextBookingVisits || 0,
        regularVisits: vals.regularVisits || 0,
        minimoVisits: vals.minimoVisits || 0,
        totalVisits: (vals.regularVisits || 0) + (vals.nextBookingVisits || 0) + (vals.minimoVisits || 0),
        avgRegular: vals.avgRegular || 0,
        avgMinimo: vals.avgMinimo || 0,
        count: vals.count || 0
      };
    });
    return { ...d, stores };
  });

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-white rounded-2xl border border-slate-100">
        <Loader2 className="animate-spin text-slate-300" size={32} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Sales Trend Chart */}
      <Card className="bg-white border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            売上推移 (過去6ヶ月)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `¥${(value / 10000).toLocaleString()}万`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(value: any, name: any, props: any) => {
                    const data = props.payload;
                    if (name === "通常売上") {
                      return [`¥${value.toLocaleString()} (単価: ¥${(data.avgRegular || 0).toLocaleString()})`, name];
                    }
                    if (name === "ミニモ売上") {
                      return [`¥${value.toLocaleString()} (単価: ¥${(data.avgMinimo || 0).toLocaleString()})`, name];
                    }
                    return [`¥${value.toLocaleString()}`, name];
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                <Bar name="通常売上" dataKey="total" stackId="total" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar name="ミニモ売上" dataKey="minimo" stackId="total" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  <LabelList 
                    dataKey="total" 
                    position="top" 
                    offset={10}
                    formatter={(val: any) => val ? `¥${(val / 10000).toFixed(1)}万` : ""}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="hidden md:block" />

      {/* Visit Breakdown Charts (Small Multiples) */}
      <Card className="bg-white border-none shadow-sm md:col-span-2">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4">
          <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-500" />
            店舗別 来店客数内訳 (通常・次回・ミニモ)
          </CardTitle>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#10b981] rounded-full" /> 通常</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#fbbf24] rounded-full" /> 次回予約</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#6366f1] rounded-full" /> ミニモ</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {["六甲", "元町", "神戸"].map((store) => (
              <div key={store} className="space-y-4">
                <h4 className="text-sm font-black text-slate-600 text-center bg-slate-50 py-2 rounded-xl border border-slate-100">{store}店</h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        tickFormatter={(value) => `${value}人`}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '10px', fontSize: '12px' }}
                      />
                      <Bar name="通常" dataKey={`stores.${store}.regularVisits`} stackId="st" fill="#10b981" />
                      <Bar name="次回予約" dataKey={`stores.${store}.nextBookingVisits`} stackId="st" fill="#fbbf24" />
                      <Bar name="ミニモ" dataKey={`stores.${store}.minimoVisits`} stackId="st" fill="#6366f1" radius={[4, 4, 0, 0]}>
                        <LabelList 
                          dataKey={`stores.${store}.totalVisits`} 
                          position="top" 
                          formatter={(val: any) => val > 0 ? `${val}人` : ''}
                          style={{ fontSize: '9px', fontWeight: 'bold', fill: '#64748b' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Store Specific Unit Price Info */}
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    // Find latest month with actual visits for this store
                    const latestData = [...chartData].reverse().find(d => d.stores[store]?.totalVisits > 0)?.stores[store];
                    return (
                      <>
                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">通常単価</p>
                          <p className="text-sm font-black text-emerald-700">
                            ¥{(latestData?.avgRegular || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                          <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">ミニモ単価</p>
                          <p className="text-sm font-black text-indigo-700">
                            ¥{(latestData?.avgMinimo || 0).toLocaleString()}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Booking Analytics Chart */}
      <Card className="bg-white border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            次回予約分析（予約数 vs 来店数）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `${value}人`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                
                <Bar yAxisId="left" name="六甲:来店数" dataKey="stores.六甲.nextBookingVisits" stackId="visit" fill="#10b981" />
                <Bar yAxisId="left" name="元町:来店数" dataKey="stores.元町.nextBookingVisits" stackId="visit" fill="#6366f1" />
                <Bar yAxisId="left" name="神戸:来店数" dataKey="stores.神戸.nextBookingVisits" stackId="visit" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  <LabelList 
                    dataKey="nextBookingVisits" 
                    position="top" 
                    formatter={(val: any) => `${val || 0}人`}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                  />
                </Bar>
                
                <Line 
                  yAxisId="right"
                  name="全体予約率 (%)" 
                  type="monotone" 
                  dataKey="nextBookingRatio" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Occupancy Trend Chart */}
      <Card className="bg-white border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity size={20} className="text-rose-500" />
            店舗稼働率（空き具合）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Area name="稼働範囲" type="monotone" dataKey="occupancy" fill="#fff1f2" stroke="none" />
                <Line 
                  name="稼働率 (%)" 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#f43f5e" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Store Sales Chart */}
      <Card className="bg-white border-none shadow-sm md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PieChart size={20} className="text-blue-500" />
            店舗別 売上推移（ミニモ比率）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `¥${(value / 10000).toLocaleString()}万`}
                />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    formatter={(value: any) => [`¥${value?.toLocaleString()}`, ""]}
                  />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                
                <Bar name="六甲:通常" dataKey="stores.六甲.regular" stackId="rokko" fill="#10b981" />
                <Bar name="六甲:ミニモ" dataKey="stores.六甲.minimo" stackId="rokko" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar name="元町:通常" dataKey="stores.元町.regular" stackId="moto" fill="#6366f1" />
                <Bar name="元町:ミニモ" dataKey="stores.元町.minimo" stackId="moto" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar name="神戸:通常" dataKey="stores.神戸.regular" stackId="kobe" fill="#f43f5e" />
                <Bar name="神戸:ミニモ" dataKey="stores.神戸.minimo" stackId="kobe" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
