"use client";

import React, { useEffect, useState, useMemo } from "react";
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

  // Scroll to the rightmost (most recent) data by default
  useEffect(() => {
    if (!loading && data.length > 0) {
      const scrollRight = () => {
        const scrollContainers = document.querySelectorAll('.custom-scrollbar');
        scrollContainers.forEach(container => {
          container.scrollLeft = container.scrollWidth;
        });
      };
      
      // Use a timeout to ensure DOM is fully rendered before scrolling
      setTimeout(scrollRight, 300);
      // Backup timeout for slower re-renders of Recharts responsive container
      setTimeout(scrollRight, 800);
    }
  }, [loading, data]);

  const processedData = data.map(d => {
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
        regularNewVisits: vals.regularNewVisits || 0,
        minimoNewVisits: vals.minimoNewVisits || 0,
        totalVisits: (vals.regularVisits || 0) + (vals.nextBookingVisits || 0) + (vals.minimoVisits || 0),
        avgRegular: vals.avgRegular || 0,
        avgMinimo: vals.avgMinimo || 0,
        count: vals.count || 0
      };
    });
    return { ...d, stores, regularSales: (d.total || 0) - (d.minimo || 0) };
  });

  // 最初のデータが存在する月を探し、それ以前の空データをカットする
  const firstDataIndex = processedData.findIndex(d => d.total > 0 || d.minimo > 0 || Object.values(d.stores).some((s: any) => s.totalVisits > 0));
  const chartData = firstDataIndex >= 0 ? processedData.slice(firstDataIndex) : processedData;
  // Calculate global max visits to align Y-axis scales across all stores
  const globalMaxVisits = chartData.reduce((max, d) => {
    const storeVals = Object.values(d.stores).map((s: any) => s.totalVisits || 0);
    const storeMax = storeVals.length > 0 ? Math.max(...storeVals) : 0;
    return Math.max(max, storeMax);
  }, 0);
  const maxVisitsAxis = Math.ceil(globalMaxVisits * 1.15 / 10) * 10; // add 15% buffer and round up to 10
  
  const availableStores = useMemo(() => {
    const storeSet = new Set<string>();
    chartData.forEach(d => {
      Object.keys(d.stores).forEach(s => storeSet.add(s));
    });
    return Array.from(storeSet).sort();
  }, [chartData]);
  
  const storeColors = [
    { regular: "#34d399", minimo: "#818cf8" },
    { regular: "#10b981", minimo: "#6366f1" },
    { regular: "#059669", minimo: "#4f46e5" },
    { regular: "#f43f5e", minimo: "#e11d48" },
    { regular: "#fbbf24", minimo: "#f59e0b" },
    { regular: "#38bdf8", minimo: "#0284c7" }
  ];

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
      <Card className="bg-white border-none shadow-sm md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            売上推移 (過去3年間)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full mt-4 overflow-x-auto pb-4 custom-scrollbar">
            <div className="h-[300px]" style={{ minWidth: `${Math.max(chartData.length * 60, 600)}px` }}>
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
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const stores = availableStores;
                      const groupedData: Record<string, { regular: number, minimo: number, colors: { regular: string, minimo: string } }> = {};
                      
                      stores.forEach(store => {
                        groupedData[store] = { regular: 0, minimo: 0, colors: { regular: "", minimo: "" } };
                      });

                      payload.forEach((entry: any) => {
                        const [store, type] = entry.name.split(':');
                        if (stores.includes(store)) {
                          if (type === "通常") {
                            groupedData[store].regular = entry.value;
                            groupedData[store].colors.regular = entry.color;
                          } else if (type === "ミニモ") {
                            groupedData[store].minimo = entry.value;
                            groupedData[store].colors.minimo = entry.color;
                          }
                        }
                      });

                      return (
                        <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-xl min-w-[160px]">
                          <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
                          <div className="space-y-3">
                            {stores.map(store => {
                              const data = groupedData[store];
                              if (!data) return null;
                              const total = data.regular + data.minimo;
                              if (total === 0) return null; // skip if no data

                              return (
                                <div key={store} className="space-y-1">
                                  <div className="flex items-center justify-between font-black text-slate-700 text-sm">
                                    <span>{store}</span>
                                    <span>¥{total.toLocaleString()}</span>
                                  </div>
                                  <div className="pl-2 space-y-0.5 border-l-2 border-slate-100 ml-1">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 gap-4">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: data.colors.regular || '#ccc' }} />
                                        <span>通常</span>
                                      </div>
                                      <span>¥{data.regular.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 gap-4">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: data.colors.minimo || '#ccc' }} />
                                        <span>ミニモ</span>
                                      </div>
                                      <span>¥{data.minimo.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                
                {/* グラフの積み上げ順序: 最初が下、最後が上 */}
                {/* 上から六甲、神戸、元町にするには、一番下が元町、真ん中が神戸、一番上が六甲 */}
                
                {/* 動的店舗レンダリング */}
                {availableStores.map((store, idx) => (
                  <Bar key={`${store}-regular`} name={`${store}:通常`} dataKey={`stores.${store}.regular`} stackId="total" fill={storeColors[idx % storeColors.length].regular} />
                ))}
                {availableStores.map((store, idx) => {
                  const isLast = idx === availableStores.length - 1;
                  return (
                    <Bar key={`${store}-minimo`} name={`${store}:ミニモ`} dataKey={`stores.${store}.minimo`} stackId="total" fill={storeColors[idx % storeColors.length].minimo} radius={isLast ? [4, 4, 0, 0] : [0,0,0,0]}>
                      {isLast && (
                        <LabelList 
                          dataKey="total" 
                          position="top" 
                          offset={10}
                          formatter={(val: any) => val ? `¥${(val / 10000).toFixed(1)}万` : ""}
                          style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                        />
                      )}
                    </Bar>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visit Breakdown Charts (Small Multiples) */}
      <Card className="bg-white border-none shadow-sm md:col-span-2">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4">
          <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-500" />
            店舗別 来店客数内訳 (通常・次回・ミニモ)
          </CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#10b981] rounded-full" /> 通常</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#fbbf24] rounded-full" /> 次回予約</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#6366f1] rounded-full" /> ミニモ</div>
            <div className="flex items-center gap-1 text-sky-500 font-extrabold"><span className="text-xs">👥</span> 通常新規</div>
            <div className="flex items-center gap-1 text-purple-500 font-extrabold"><span className="text-xs">👥</span> ミニモ新規</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {availableStores.map((store) => (
              <div key={store} className="space-y-4">
                <h4 className="text-sm font-black text-slate-600 text-center bg-slate-50 py-2 rounded-xl border border-slate-100">{store}店</h4>
                <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                  <div className="h-[250px]" style={{ minWidth: `${Math.max(chartData.length * 50, 400)}px` }}>
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
                        domain={[0, maxVisitsAxis]}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            const storeData = item.stores?.[store] || {};
                            return (
                              <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-100 text-xs font-bold space-y-1.5 text-slate-700">
                                <p className="text-slate-400 font-extrabold text-[10px] uppercase border-b border-slate-50 pb-1 mb-1">{item.month}</p>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#10b981] rounded-full" /> 通常:</span>
                                    <span className="text-slate-800">{storeData.regularVisits || 0}人</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 pl-4">
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">↳ うち新規:</span>
                                    <span className="text-slate-600 text-[10px]">{storeData.regularNewVisits || 0}人</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 pl-4">
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">↳ うちリピ:</span>
                                    <span className="text-slate-600 text-[10px]">{(storeData.regularVisits || 0) - (storeData.regularNewVisits || 0)}人</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 pt-1 mt-1 border-t border-slate-50">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#6366f1] rounded-full" /> ミニモ:</span>
                                    <span className="text-slate-800">{storeData.minimoVisits || 0}人</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 pl-4">
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">↳ うち新規:</span>
                                    <span className="text-slate-600 text-[10px]">{storeData.minimoNewVisits || 0}人</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 pl-4">
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">↳ うちリピ:</span>
                                    <span className="text-slate-600 text-[10px]">{(storeData.minimoVisits || 0) - (storeData.minimoNewVisits || 0)}人</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 pt-1 mt-1 border-t border-slate-50">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#fbbf24] rounded-full" /> 次回予約:</span>
                                    <span className="text-slate-800">{storeData.nextBookingVisits || 0}人</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
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
                </div>
                {/* Store Specific Unit Price & New Customer Info */}
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    // Find latest month with actual visits for this store
                    const latestData = [...chartData].reverse().find(d => d.stores[store]?.totalVisits > 0)?.stores[store];
                    return (
                      <>
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5 leading-tight">通常単価</p>
                          <p className="text-xs font-black text-emerald-700">
                            ¥{(latestData?.avgRegular || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-indigo-600 uppercase mb-0.5 leading-tight">ミニモ単価</p>
                          <p className="text-xs font-black text-indigo-700">
                            ¥{(latestData?.avgMinimo || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 bg-sky-50 rounded-xl border border-sky-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-sky-600 uppercase mb-0.5 leading-tight">通常新規</p>
                          <p className="text-xs font-black text-sky-700">
                            {(latestData?.regularNewVisits || 0)}人
                          </p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-xl border border-purple-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-purple-600 uppercase mb-0.5 leading-tight">ミニモ新規</p>
                          <p className="text-xs font-black text-purple-700">
                            {(latestData?.minimoNewVisits || 0)}人
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
      <Card className="bg-white border-none shadow-sm md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            次回予約分析（過去3年間）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full mt-4 overflow-x-auto pb-4 custom-scrollbar">
            <div className="h-[300px]" style={{ minWidth: `${Math.max(chartData.length * 60, 600)}px` }}>
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
                   cursor={{ fill: '#f8fafc' }}
                   content={({ active, payload, label }) => {
                     if (active && payload && payload.length) {
                       // Find the line payload for the ratio
                       const ratioPayload = payload.find(p => p.dataKey === 'nextBookingRatio');
                       const ratio = ratioPayload ? ratioPayload.value : 0;
                       
                       // Group store data
                       const stores = availableStores;
                       const storeData = payload.filter((p: any) => stores.some(s => p.name && typeof p.name === 'string' && p.name.includes(s)));

                       return (
                         <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-xl min-w-[180px]">
                           <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
                           
                           <div className="flex items-center justify-between font-black text-rose-600 mb-4 bg-rose-50 p-2 rounded-lg">
                             <span>全体 次回予約率</span>
                             <span className="text-lg">{ratio}%</span>
                           </div>

                           <div className="space-y-2">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">店舗別 総来店数</p>
                             {storeData.map((entry: any, index: number) => {
                               const storeName = entry.name.split(':')[0];
                               return (
                                 <div key={index} className="flex items-center justify-between text-xs font-bold">
                                   <div className="flex items-center gap-1.5">
                                     <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                                     <span className="text-slate-600">{storeName}</span>
                                   </div>
                                   <span className="text-slate-800">{entry.value}人</span>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       );
                     }
                     return null;
                   }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                
                {/* 積み上げ棒グラフ：総来店数（サロンのトラフィック） */}
                {availableStores.map((store, idx) => {
                  const isLast = idx === availableStores.length - 1;
                  return (
                    <Bar key={`${store}-visits`} yAxisId="left" name={`${store}:来店数`} dataKey={`stores.${store}.totalVisits`} stackId="visit" fill={storeColors[idx % storeColors.length].regular} radius={isLast ? [4, 4, 0, 0] : [0,0,0,0]} />
                  );
                })}
                
                {/* 折れ線グラフ：次回予約率（KPI） */}
                <Line 
                  yAxisId="right"
                  name="全体 次回予約率 (%)" 
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
          </div>
        </CardContent>
      </Card>

      {/* Occupancy Trend Chart */}
      <Card className="bg-white border-none shadow-sm md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity size={20} className="text-rose-500" />
            店舗稼働率（過去3年間）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full mt-4 overflow-x-auto pb-4 custom-scrollbar">
            <div className="h-[300px]" style={{ minWidth: `${Math.max(chartData.length * 60, 600)}px` }}>
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
          </div>
        </CardContent>
      </Card>

      {/* Store Sales Chart */}
      <Card className="bg-white border-none shadow-sm md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PieChart size={20} className="text-blue-500" />
            店舗別 売上推移（過去3年間）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full mt-4 overflow-x-auto pb-4 custom-scrollbar">
            <div className="h-[300px]" style={{ minWidth: `${Math.max(chartData.length * 60, 600)}px` }}>
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
                
                {availableStores.map((store, idx) => (
                  <React.Fragment key={store}>
                    <Bar name={`${store}:通常`} dataKey={`stores.${store}.regular`} stackId={store} fill={storeColors[idx % storeColors.length].regular} />
                    <Bar name={`${store}:ミニモ`} dataKey={`stores.${store}.minimo`} stackId={store} fill={storeColors[idx % storeColors.length].minimo} radius={[4, 4, 0, 0]} />
                  </React.Fragment>
                ))}
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
