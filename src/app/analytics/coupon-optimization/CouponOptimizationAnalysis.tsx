"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeJapaneseYen, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getCouponOptimizationAnalysis,
  type CouponOptimizationResponse,
} from "./actions";

const yen = (value: number | null | undefined) => value == null ? "—" : `¥${Math.round(value).toLocaleString()}`;
const confidenceLabel = { HIGH: "高", MEDIUM: "中", LOW: "低", INSUFFICIENT: "データ不足" } as const;

export default function CouponOptimizationAnalysis() {
  const [months, setMonths] = useState<12 | 24 | 36>(36);
  const [storeName, setStoreName] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [result, setResult] = useState<CouponOptimizationResponse>({ success: true, scopes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCouponOptimizationAnalysis({ months }).then((response) => {
      if (!active) return;
      setResult(response);
      const first = response.scopes?.[0];
      setStoreName(first?.storeName || "");
      setMenuCategory(first?.menuCategory || "");
      if (!first) setLoading(false);
    });
    return () => { active = false; };
  }, [months]);

  useEffect(() => {
    if (!storeName || !menuCategory) return;
    let active = true;
    getCouponOptimizationAnalysis({ months, storeName, menuCategory }).then((response) => {
      if (active) { setResult(response); setLoading(false); }
    });
    return () => { active = false; };
  }, [months, storeName, menuCategory]);

  const stores = useMemo(() => [...new Set((result.scopes || []).map((scope) => scope.storeName))], [result.scopes]);
  const menus = useMemo(() => (result.scopes || []).filter((scope) => scope.storeName === storeName), [result.scopes, storeName]);
  const scope = menus.find((item) => item.menuCategory === menuCategory);
  const model = result.model;
  const wording = (model?.coefficients || [])
    .filter((item) => !["intercept", "price_per_1000"].includes(item.name) && item.coefficient > 0)
    .sort((a, b) => b.coefficient - a.coefficient);

  const chooseStore = (value: string) => {
    setLoading(true);
    setStoreName(value);
    setMenuCategory((result.scopes || []).find((item) => item.storeName === value)?.menuCategory || "");
  };

  const chooseMenu = (value: string) => {
    setLoading(true);
    setMenuCategory(value);
  };

  const chooseMonths = (value: string) => {
    setLoading(true);
    setMonths(Number(value) as 12 | 24 | 36);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <BadgeJapaneseYen className="text-indigo-600" />クーポン価格・文言最適化
            </h2>
            <p className="mt-1 text-sm text-slate-500">自社の取込済みCSVから、新規集客クーポンの価格と文言の関連を分析します。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={storeName} onValueChange={chooseStore}>
              <SelectTrigger className="min-w-44"><SelectValue placeholder="店舗を選択" /></SelectTrigger>
              <SelectContent>{stores.map((store) => <SelectItem key={store} value={store}>{store}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={menuCategory} onValueChange={chooseMenu}>
              <SelectTrigger className="min-w-52"><SelectValue placeholder="メニューを選択" /></SelectTrigger>
              <SelectContent>{menus.map((item) => <SelectItem key={item.key} value={item.menuCategory}>{item.menuCategory}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(months)} onValueChange={chooseMonths}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="12">直近12ヶ月</SelectItem><SelectItem value="24">直近24ヶ月</SelectItem><SelectItem value="36">直近36ヶ月</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border bg-white"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : !result.success ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{result.error}</div>
      ) : !scope ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">分析対象となる新規クーポンデータがありません。</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="直近観測価格" value={yen(result.currentObservedPrice)} />
            <Metric label="売上最大予測価格" value={yen(model?.revenueOptimalPrice)} accent />
            <Metric label="分析信頼度" value={confidenceLabel[scope.confidence]} />
            <Metric label="分析データ" value={`${scope.reservationCount}件・${scope.observedWeeks}週`} />
          </div>

          {model?.revenueOptimalPrice == null ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="flex items-center gap-2 font-bold text-amber-900"><AlertTriangle size={19} />まだ最適価格を推定できません</h3>
              <p className="mt-2 text-sm text-amber-800">CSVデータが増えると、この店舗・メニュー専用の分析が可能になります。</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-amber-800">{scope.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-2 font-bold text-slate-900"><TrendingUp size={19} className="text-indigo-600" />価格 × 予測売上</h3>
                <p className="mt-1 text-xs text-slate-500">縦軸は週次の予測売上です。実際の結果を保証するものではありません。</p>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.simulation} margin={{ left: 8, right: 16 }}>
                      <XAxis dataKey="price" tickFormatter={(value) => `¥${Number(value).toLocaleString()}`} minTickGap={32} />
                      <YAxis tickFormatter={(value) => `¥${Math.round(Number(value) / 1000)}千`} width={58} />
                      <Tooltip formatter={(value) => yen(Number(value))} labelFormatter={(value) => `価格 ${yen(Number(value))}`} />
                      <Line type="monotone" dataKey="predictedRevenue" name="予測売上" stroke="#4f46e5" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-2 font-bold text-slate-900"><Sparkles size={19} className="text-purple-600" />関連が強い文言</h3>
                <p className="mt-1 text-xs text-slate-500">因果効果ではなく、過去実績上の関連性です。</p>
                <div className="mt-4 space-y-3">
                  {wording.length ? wording.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex justify-between gap-3"><span className="font-bold text-slate-800">{index + 1}. {item.name}</span><span className="text-sm font-bold text-emerald-600">+{item.coefficient.toFixed(2)}件/週</span></div>
                      <p className="mt-1 text-xs text-slate-500">{item.pValue != null && item.pValue < 0.05 ? "統計的な関連を確認" : "参考（信頼性の確認が必要）"}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">現在のデータでは明確な文言効果を確認できません。</p>}
                </div>
              </section>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            この結果は、選択したサロンの過去CSVデータをもとにした予測・意思決定支援です。相関を因果関係として示すものではなく、価格変更後の結果を保証しません。
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${accent ? "text-indigo-700" : "text-slate-900"}`}>{value}</p></div>;
}
