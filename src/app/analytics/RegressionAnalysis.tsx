"use client";

import { useState } from "react";
import { performRegressionAnalysis, RegressionParams } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, TrendingUp, TrendingDown, Lightbulb, AlertCircle, BarChart3, Presentation } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TARGET_VARIABLES = [
  "売上", "来店人数", "新規人数", "リピート人数", "客単価", 
  "技術売上", "物販売上", "次回予約数", "キャンセル数"
];

const FEATURES = [
  "曜日", "天気", "気温", "降水量", "祝日", "月初", "月末", 
  "スタッフ出勤人数", "デビュー済稼働人数", "研修中稼働人数", "イベント日", "広告費", "稼働ベッド数"
];

const PERIODS = [
  { label: "今月", value: "this_month" },
  { label: "直近3ヶ月", value: "last_3m" },
  { label: "直近6ヶ月", value: "last_6m" },
  { label: "直近1年", value: "last_1y" },
];

export default function RegressionAnalysis() {
  const [store, setStore] = useState("全店舗");
  const [targetY, setTargetY] = useState("売上");
  const [featuresX, setFeaturesX] = useState<string[]>(["曜日", "天気", "スタッフ出勤人数"]);
  const [period, setPeriod] = useState("last_3m");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleFeature = (f: string) => {
    setFeaturesX(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const handleAnalyze = async () => {
    if (featuresX.length === 0) {
      setError("説明変数を1つ以上選択してください。");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await performRegressionAnalysis({ store, targetY, featuresX, period });
    
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || "分析中にエラーが発生しました。");
    }
    
    setLoading(false);
  };

  const isYCurrency = ["売上", "客単価", "技術売上", "物販売上", "広告費"].includes(targetY);
  const formatY = (val: number) => isYCurrency ? `¥${Math.round(val).toLocaleString()}` : `${Math.round(val * 10)/10}件/人`;

  return (
    <div className="space-y-6">
      {/* 検索・条件指定パネル */}
      <Card className="bg-white border-none shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Presentation className="text-purple-500" />
            分析条件の設定
          </CardTitle>
          <CardDescription>
            目的変数（結果）に対して、どのような要因（説明変数）が影響を与えているかを重回帰分析で導き出します。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
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
              <label className="text-xs font-bold text-slate-500 uppercase">分析対象期間</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center text-[10px]">Y</span>
                目的変数 (分析したい結果)
              </label>
              <Select value={targetY} onValueChange={setTargetY}>
                <SelectTrigger className="bg-white border-purple-200 focus:ring-purple-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_VARIABLES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1 mb-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">X</span>
              説明変数 (複数選択可)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
              {FEATURES.map(f => (
                <div key={f} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`feature-${f}`} 
                    checked={featuresX.includes(f)}
                    onCheckedChange={() => handleToggleFeature(f)}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <label htmlFor={`feature-${f}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 cursor-pointer">
                    {f}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || featuresX.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 px-8 rounded-xl shadow-md shadow-purple-200 transition-all w-full md:w-auto"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 分析中...</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> AI回帰分析を実行</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="bg-rose-50 text-rose-800 border-rose-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>分析エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 分析結果 */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* AI Comments */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-none shadow-lg lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-50">
                  <Lightbulb className="text-yellow-300" />
                  AI分析レポート
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

            <Card className="bg-white border-none shadow-sm">
              <CardHeader className="pb-2 bg-amber-50/50 border-b border-amber-100 rounded-t-xl">
                <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  改善アクション提案
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {result.actionProposals.map((proposal: string, i: number) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i+1}</span>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">{proposal}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* 影響度ランキング */}
            <Card className="bg-white border-none shadow-sm lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-800">各要因の影響度 (回帰係数)</CardTitle>
                <CardDescription className="text-[10px]">1単位増えた時の {targetY} の変動額/数</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mt-2">
                  {result.coefficients.map((c: any, i: number) => {
                    const isPositive = c.value > 0;
                    return (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                        <span className="text-xs font-bold text-slate-600">{c.name}</span>
                        <div className={`flex items-center gap-1 font-black text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isPositive ? '+' : ''}{formatY(c.value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 実績vs予測 グラフ */}
            <Card className="bg-white border-none shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={16} className="text-blue-500" />
                  モデル適合度 (実績 vs AI予測)
                </CardTitle>
                <CardDescription className="text-[10px]">
                  このモデルで実際の {targetY} の動きをどれくらい説明できているかを示します（R² = {(result.rSquared * 100).toFixed(1)}%）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] md:h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={result.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => isYCurrency ? `¥${(val/10000)}万` : val} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        formatter={(val: any) => formatY(val)}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <Bar name={`実績 ${targetY}`} dataKey="actual" fill="#cbd5e1" radius={[4,4,0,0]} barSize={20} />
                      <Line name={`AI予測 ${targetY}`} type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
