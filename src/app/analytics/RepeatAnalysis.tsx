"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AlertCircle, ArrowRight } from "lucide-react";
import { getRepeatAnalysis } from "./actions";
import { toast } from "sonner";

export default function RepeatAnalysis() {
  const [store, setStore] = useState("全店舗");
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    const res = await getRepeatAnalysis({ store, months });
    if (res.success) {
      setResult(res.data);
      console.log("Repeat Analysis Debug Info:", res.data.debugInfo);
      toast.success("分析が完了しました");
    } else {
      toast.error(res.error || "分析に失敗しました");
    }
    setLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg text-sm min-w-[200px]">
          <p className="font-bold text-slate-800 mb-2 border-b pb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4 mb-1">
              <span style={{ color: p.color }} className="font-bold text-xs">{p.name}:</span>
              <span className="font-bold">{Number(p.value).toFixed(1)}%</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
            <p>通常(新規): {payload[0]?.payload.normalNewTotal}人 / 通常(リピ): {payload[0]?.payload.normalRepeatTotal}人</p>
            <p>ミニモ(新規): {payload[0]?.payload.minimoNewTotal}人 / ミニモ(リピ): {payload[0]?.payload.minimoRepeatTotal}人</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderRankingTable = (data: any[], title: string, nameKey: string) => (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
        <h3 className="font-bold text-slate-700">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-tighter">
            <tr>
              <th className="px-3 py-3 w-8">順位</th>
              <th className="px-3 py-3">{nameKey === "staff_name" ? "スタッフ" : "メニュー"}</th>
              <th className="px-3 py-3">通常(新規)再来</th>
              <th className="px-3 py-3">ミニモ(新規)再来</th>
              <th className="px-3 py-3">通常(リピ)再来</th>
              <th className="px-3 py-3">ミニモ(リピ)再来</th>
              <th className="px-3 py-3">総客数</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-bold text-slate-400">#{i + 1}</td>
                <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">{row[nameKey]}</td>
                <td className="px-3 py-2 font-bold text-emerald-600">{row.normalNewRate.toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal">({row.normalNewTotal})</span></td>
                <td className="px-3 py-2 font-bold text-teal-600">{row.minimoNewRate.toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal">({row.minimoNewTotal})</span></td>
                <td className="px-3 py-2 font-bold text-blue-600">{row.normalRepeatRate.toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal">({row.normalRepeatTotal})</span></td>
                <td className="px-3 py-2 font-bold text-sky-600">{row.minimoRepeatRate.toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal">({row.minimoRepeatTotal})</span></td>
                <td className="px-3 py-2 text-slate-500">{row.totalVisits}人</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">データがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="border-b border-slate-100 bg-white/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
            <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg">
              <ArrowRight size={20} />
            </span>
            コホート分析 (新規再来率・リピ再来率)
          </CardTitle>
          <CardDescription className="text-slate-500 pt-2 leading-relaxed">
            過去の売上データから顧客ごとに来店履歴を追跡し、「初回来店時（新規）」および「2回目以降（リピ）」に担当したスタッフやメニューが、その後の再来店（定着）にどれくらい繋がったかを分析します。
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
              <label className="text-xs font-bold text-slate-500 uppercase">集計期間</label>
              <Select value={String(months)} onValueChange={(val) => setMonths(Number(val))}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">過去3ヶ月</SelectItem>
                  <SelectItem value="6">過去6ヶ月</SelectItem>
                  <SelectItem value="12">過去1年</SelectItem>
                  <SelectItem value="999">全期間（制限なし）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleAnalyze} 
              disabled={loading}
              className="px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-200"
            >
              {loading ? "集計中..." : "リピート分析を実行"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
            <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-800 leading-relaxed">
              <p className="font-bold mb-1">指標の見方</p>
              <p>・<span className="font-bold">通常 / ミニモ:</span> それぞれ「通常経路」「ミニモ経路」で来店されたお客様のデータに分割。</p>
              <p>・<span className="font-bold">新規再来率:</span> 該当スタッフ/メニューで「新規」として来店したお客様が、その後もう一度来店した割合。</p>
              <p>・<span className="font-bold">リピ再来率:</span> 該当スタッフ/メニューで「リピ」として来店したお客様が、その後さらに来店した割合。</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* スタッフ別 */}
            <div className="space-y-4">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                スタッフ別 再来率比較
              </h3>
              
              {result.staffRanking.length > 0 ? (
                <>
                  <Card className="p-4 border-slate-200 shadow-sm">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={result.staffRanking.slice(0, 10)} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="staff_name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar name="通常(新規)再来" dataKey="normalNewRate" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={20} />
                          <Bar name="ミニモ(新規)再来" dataKey="minimoNewRate" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={20} />
                          <Bar name="通常(リピ)再来" dataKey="normalRepeatRate" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={20} />
                          <Bar name="ミニモ(リピ)再来" dataKey="minimoRepeatRate" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  {renderRankingTable(result.staffRanking, "スタッフ別ランキング (新規再来率順 トップ10)", "staff_name")}
                </>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-500 font-bold mb-2">スタッフのデータがありません</p>
                  <div className="text-xs text-slate-400 text-left max-w-sm mx-auto overflow-auto max-h-32 p-2 bg-slate-100 rounded">
                    <p>取得売上件数: {result.debugInfo?.salesCount}件</p>
                    <p>有効顧客数: {result.debugInfo?.customerIdsFound}人</p>
                    <p>期間: {result.debugInfo?.startDate} 〜 {result.debugInfo?.endDate}</p>
                    {result.debugInfo?.sampleSales?.length > 0 && (
                      <pre className="mt-2 text-[10px]">{JSON.stringify(result.debugInfo.sampleSales[0], null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* メニュー別 */}
            <div className="space-y-4">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                メニュー別 再来率比較
              </h3>
              
              {result.menuRanking.length > 0 ? (
                <>
                  <Card className="p-4 border-slate-200 shadow-sm">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={result.menuRanking.slice(0, 10)} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="menu_name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar name="通常(新規)再来" dataKey="normalNewRate" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={20} />
                          <Bar name="ミニモ(新規)再来" dataKey="minimoNewRate" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={20} />
                          <Bar name="通常(リピ)再来" dataKey="normalRepeatRate" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={20} />
                          <Bar name="ミニモ(リピ)再来" dataKey="minimoRepeatRate" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  {renderRankingTable(result.menuRanking, "メニュー別ランキング (新規再来率順 トップ10)", "menu_name")}
                </>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-500 font-bold mb-2">メニューのデータがありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
