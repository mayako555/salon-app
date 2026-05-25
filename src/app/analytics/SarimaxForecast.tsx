"use client";

import { useState } from "react";
import { performSarimaxForecast } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, TrendingUp, Presentation, AlertCircle, AreaChart } from "lucide-react";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TARGET_VARIABLES = ["売上", "来店人数"];
const FORECAST_DAYS = [
  { label: "向こう7日間 (1週間)", value: 7 },
  { label: "向こう14日間 (2週間)", value: 14 },
  { label: "向こう30日間 (1ヶ月)", value: 30 },
];
const EXOGENOUS_FEATURES = ["曜日", "天気", "祝日", "イベント日", "デビュー済稼働人数", "研修中稼働人数"];

export default function SarimaxForecast() {
  const [store, setStore] = useState("全店舗");
  const [targetY, setTargetY] = useState("売上");
  const [forecastDays, setForecastDays] = useState(7);
  const [featuresX, setFeaturesX] = useState<string[]>(["曜日", "天気", "祝日"]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleFeature = (f: string) => {
    setFeaturesX(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const handleForecast = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await performSarimaxForecast({ store, targetY, featuresX, forecastDays });
    
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || "予測中にエラーが発生しました。");
    }
    
    setLoading(false);
  };

  const isYCurrency = targetY === "売上";
  const formatY = (val: number | null) => {
    if (val === null) return "-";
    return isYCurrency ? `¥${Math.round(val).toLocaleString()}` : `${Math.round(val)}人`;
  };

  return (
    <div className="space-y-6">
      {/* 検索・条件指定パネル */}
      <Card className="bg-white border-none shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-emerald-500" />
            将来予測 (ARX時系列モデル)
          </CardTitle>
          <CardDescription>
            過去のトレンドや自己相関（ラグ）、季節性（曜日など）、将来の天気・イベント予測などの外生変数を加味し、直近の実績から未来の数値を予測します。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">対象店舗</label>
              <Select value={store} onValueChange={setStore}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="全店舗">全店舗</SelectItem>
                  <SelectItem value="六甲店">六甲店</SelectItem>
                  <SelectItem value="神戸店">神戸店</SelectItem>
                  <SelectItem value="元町店">元町店</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">予測対象 (Y)</label>
              <Select value={targetY} onValueChange={setTargetY}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_VARIABLES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">予測期間</label>
              <Select value={String(forecastDays)} onValueChange={(val) => setForecastDays(Number(val))}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORECAST_DAYS.map(p => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1 mb-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">X</span>
              外生変数 (外部要因)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
              {EXOGENOUS_FEATURES.map(f => (
                <div key={f} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`sari-feature-${f}`}
                    checked={featuresX.includes(f)}
                    onChange={() => handleToggleFeature(f)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor={`sari-feature-${f}`} className="text-sm font-medium leading-none text-slate-700 cursor-pointer">
                    {f}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleForecast} 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 rounded-xl shadow-md shadow-emerald-200 transition-all w-full md:w-auto"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 予測計算中...</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> 将来予測を実行</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="bg-rose-50 text-rose-800 border-rose-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>予測エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 予測結果 */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <Card className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-50">
                <Presentation className="text-teal-200" />
                予測インサイト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                {result.aiComments.map((comment: string, i: number) => (
                  <p key={i} className="text-sm font-medium leading-relaxed bg-white/10 p-3 rounded-lg border border-white/5">
                    {comment}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 予測チャート */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AreaChart size={16} className="text-teal-500" />
                実績 & 予測推移 ({targetY})
              </CardTitle>
              <CardDescription className="text-[10px]">
                実線は確定した実績、破線は予測値、グレー帯は95%信頼区間を表します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] md:h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={result.chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => isYCurrency ? `¥${(val/10000)}万` : val} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      formatter={(val: any, name: any) => {
                        if (val === null) return ["-", name];
                        return [formatY(val), name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const item = payload[0].payload;
                          const weatherIcon = item.weather === "雨" ? "☔️" : item.weather === "曇り" ? "☁️" : "☀️";
                          return `${label} (${weatherIcon})`;
                        }
                        return label;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    
                    {/* 信頼区間の帯 */}
                    <Area 
                      name="95%信頼区間" 
                      type="monotone" 
                      dataKey="upper" 
                      stroke="none" 
                      fill="#e2e8f0" 
                      fillOpacity={0.5} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lower" 
                      stroke="none" 
                      fill="#ffffff" 
                      fillOpacity={1} 
                    />

                    {/* 実績（実線） */}
                    <Line 
                      name="実績" 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#0f172a" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2 }} 
                      activeDot={{ r: 6 }} 
                    />
                    
                    {/* 予測（破線） */}
                    <Line 
                      name="予測値" 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      strokeDasharray="5 5" 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
