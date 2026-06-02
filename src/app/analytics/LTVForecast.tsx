"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { TrendingUp, AlertCircle, Users, Activity, Loader2 } from "lucide-react";
import { predictLTVAndRepeaters } from "./actions";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function LTVForecast() {
  const { availableStores } = useAuth();
  const [store, setStore] = useState("全店舗");
  const [forecastMonths, setForecastMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePredict = async () => {
    setLoading(true);
    const res = await predictLTVAndRepeaters({ store, forecastMonths });
    if (res.success && res.data) {
      setResult(res.data);
      toast.success("未来予測シミュレーションが完了しました");
    } else {
      toast.error(res.error || "予測に失敗しました");
    }
    setLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isForecast = payload[0]?.payload?.isForecast;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl text-sm min-w-[200px]">
          <p className="font-bold text-slate-800 mb-2 border-b pb-2 flex items-center justify-between">
            {label}
            {isForecast && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full ml-2">予測</span>}
          </p>
          <div className="space-y-1.5">
            {payload.map((p: any, i: number) => {
              if (p.value === 0 && !isForecast) return null;
              return (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span style={{ color: p.color }} className="font-bold text-xs flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}:
                  </span>
                  <span className="font-bold text-slate-700">{Math.round(p.value)}人</span>
                </div>
              );
            })}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-black text-slate-800">
              <span>合計客数:</span>
              <span>{Math.round(payload.reduce((sum: number, p: any) => sum + p.value, 0))}人</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="border-b border-slate-100 bg-white/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
            <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
              <TrendingUp size={20} />
            </span>
            LTV・リピーター予測 (コホート生存モデル)
          </CardTitle>
          <CardDescription className="text-slate-500 pt-2 leading-relaxed">
            過去2年間の顧客データから店舗独自の「顧客定着カーブ（経過月数ごとの離脱率）」を算出し、既存客の残存予測と未来の新規客の積み上げをシミュレーションします。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">対象店舗</label>
              <Select value={store} onValueChange={setStore}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="全店舗">全店舗</SelectItem>
                  {availableStores.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">予測期間</label>
              <Select value={String(forecastMonths)} onValueChange={(val) => setForecastMonths(Number(val))}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">半年後 (6ヶ月)</SelectItem>
                  <SelectItem value="12">1年後 (12ヶ月)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handlePredict} 
              disabled={loading}
              className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AIシミュレーション中...
                </>
              ) : "予測を実行"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 opacity-80 mb-2">
                <Users size={16} />
                <span className="text-xs font-bold">平均 新規獲得数</span>
              </div>
              <p className="text-3xl font-black">{result.avgNewCustomers}<span className="text-lg font-normal ml-1">人/月</span></p>
              <p className="text-xs opacity-70 mt-1">直近6ヶ月の平均</p>
            </Card>
            
            <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 opacity-80 mb-2">
                <TrendingUp size={16} />
                <span className="text-xs font-bold">予測 LTV (顧客生涯価値)</span>
              </div>
              <p className="text-3xl font-black">¥{result.estimatedLTV.toLocaleString()}</p>
              <p className="text-xs opacity-70 mt-1">平均単価(¥{result.avgTicketSize.toLocaleString()}) × 平均来店数</p>
            </Card>

            <Card className="border-none shadow-sm bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 opacity-80 mb-2">
                <Activity size={16} />
                <span className="text-xs font-bold">平均 累計来店回数</span>
              </div>
              <p className="text-3xl font-black">{result.expectedVisitsPerCustomer.toFixed(1)}<span className="text-lg font-normal ml-1">回</span></p>
              <p className="text-xs opacity-70 mt-1">定着率カーブからの期待値</p>
            </Card>

            <Card className="border-none shadow-sm bg-white border-slate-200 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <TrendingUp size={16} />
                <span className="text-xs font-bold">{forecastMonths}ヶ月後の増収予測</span>
              </div>
              <p className="text-3xl font-black text-slate-800">¥{Math.round(result.totalLtvIncrease / 10000).toLocaleString()}<span className="text-lg font-normal ml-1">万</span></p>
              <p className="text-xs text-slate-400 mt-1">今後の新規客が生む将来売上</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-indigo-500" />
                  リピーター＆新規の積み上げ予測チャート
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorExisting" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorFuture" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      
                      <Area 
                        type="monotone" 
                        name="既存リピーター (実績＆予測)" 
                        dataKey="existingRepeaters" 
                        stackId="1" 
                        stroke="#3b82f6" 
                        fill="url(#colorExisting)" 
                      />
                      <Area 
                        type="monotone" 
                        name="未来の新規リピーター (予測)" 
                        dataKey="futureRepeaters" 
                        stackId="1" 
                        stroke="#8b5cf6" 
                        fill="url(#colorFuture)" 
                      />
                      <Area 
                        type="monotone" 
                        name="新規顧客 (実績＆予測)" 
                        dataKey="newCustomers" 
                        stackId="1" 
                        stroke="#10b981" 
                        fill="url(#colorNew)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  実績ベースの顧客定着カーブ
                </CardTitle>
                <CardDescription className="text-xs">
                  初回来店からNヶ月後に再来する確率
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.retentionCurve.slice(1, 13)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="k" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(v) => `${v}ヶ月後`}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 'dataMax + 10']}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(val: any) => [`${val}%`, '再来店確率']}
                        labelFormatter={(label) => `初回来店から ${label}ヶ月後`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
            <AlertCircle className="text-indigo-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-indigo-800 leading-relaxed">
              <p className="font-bold mb-1">予測モデルの前提と見方</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>本予測は過去2年間の顧客データから算出された「初回来店から◯ヶ月後に再来する確率」のカーブを使用しています。</li>
                <li>グラフの「青色」は現在の顧客が将来どのくらい残るか（減衰）を示しています。</li>
                <li>グラフの「紫色」はこれから新しく獲得する新規顧客が、その後どのくらいリピーターとして定着していくか（積み上げ）を示しています。</li>
                <li>このシミュレーションにより、現在の新規獲得・リピート率を維持した場合の半年後〜1年後の顧客基盤の厚さを正確に見積もることができます。</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
