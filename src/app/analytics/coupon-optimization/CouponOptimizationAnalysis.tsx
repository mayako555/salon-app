"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeJapaneseYen, Building2, Loader2, Plus, Save, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getCouponOptimizationAnalysis,
  addManualCompetitorPrice,
  deleteManualCompetitorPrice,
  saveCouponVariableCost,
  type CouponOptimizationResponse,
} from "./actions";
import { summarizeCompetitorPrices } from "@/lib/coupon-optimization/competitors";

const yen = (value: number | null | undefined) => value == null ? "—" : `¥${Math.round(value).toLocaleString()}`;
const confidenceLabel = { HIGH: "高", MEDIUM: "中", LOW: "低", INSUFFICIENT: "データ不足" } as const;

export default function CouponOptimizationAnalysis() {
  const [months, setMonths] = useState<12 | 24 | 36>(36);
  const [storeName, setStoreName] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [result, setResult] = useState<CouponOptimizationResponse>({ success: true, scopes: [] });
  const [loading, setLoading] = useState(true);
  const [costInput, setCostInput] = useState("");
  const [savingCost, setSavingCost] = useState(false);
  const [costMessage, setCostMessage] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [competitorArea, setCompetitorArea] = useState("");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [competitorDate, setCompetitorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingCompetitor, setSavingCompetitor] = useState(false);
  const [competitorMessage, setCompetitorMessage] = useState("");

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
      if (active) {
        setResult(response);
        setCostInput(response.variableCost == null ? "" : String(response.variableCost));
        setCostMessage("");
        const areas = [...new Set((response.competitorPrices || []).map((item) => item.area))];
        setCompetitorArea((current) => current && areas.includes(current) ? current : (areas[0] || current));
        setCompetitorMessage("");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [months, storeName, menuCategory]);

  const stores = useMemo(() => [...new Set((result.scopes || []).map((scope) => scope.storeName))], [result.scopes]);
  const menus = useMemo(() => (result.scopes || []).filter((scope) => scope.storeName === storeName), [result.scopes, storeName]);
  const scope = menus.find((item) => item.menuCategory === menuCategory);
  const model = result.model;
  const competitorAreas = useMemo(() => [...new Set((result.competitorPrices || []).map((item) => item.area))].sort(), [result.competitorPrices]);
  const competitorSummary = useMemo(() => summarizeCompetitorPrices(
    result.competitorPrices || [],
    competitorArea,
    result.currentObservedPrice ?? null,
  ), [result.competitorPrices, competitorArea, result.currentObservedPrice]);
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

  const saveCost = async () => {
    const trimmed = costInput.trim();
    const variableCost = trimmed === "" ? null : Number(trimmed);
    if (variableCost != null && (!Number.isInteger(variableCost) || variableCost < 0)) {
      setCostMessage("0円以上の整数で入力してください");
      return;
    }
    setSavingCost(true);
    setCostMessage("");
    const saved = await saveCouponVariableCost({ storeName, menuCategory, variableCost });
    if (!saved.success) {
      setCostMessage(saved.error || "保存に失敗しました");
    } else {
      const refreshed = await getCouponOptimizationAnalysis({ months, storeName, menuCategory });
      setResult(refreshed);
      setCostMessage(variableCost == null ? "原価設定を解除しました" : "変動原価を保存しました");
    }
    setSavingCost(false);
  };

  const refreshAnalysis = async () => {
    const refreshed = await getCouponOptimizationAnalysis({ months, storeName, menuCategory });
    setResult(refreshed);
    return refreshed;
  };

  const addCompetitor = async () => {
    const price = Number(competitorPrice);
    if (!competitorName.trim() || !competitorArea.trim() || !Number.isInteger(price) || price <= 0) {
      setCompetitorMessage("競合名・エリア・1円以上の整数価格を入力してください");
      return;
    }
    setSavingCompetitor(true);
    setCompetitorMessage("");
    const saved = await addManualCompetitorPrice({
      storeName,
      menuCategory,
      competitorName,
      area: competitorArea,
      price,
      capturedAt: competitorDate,
    });
    if (!saved.success) {
      setCompetitorMessage(saved.error || "登録に失敗しました");
    } else {
      await refreshAnalysis();
      setCompetitorName("");
      setCompetitorPrice("");
      setCompetitorMessage("競合価格の履歴を登録しました");
    }
    setSavingCompetitor(false);
  };

  const deleteCompetitor = async (id: string) => {
    setSavingCompetitor(true);
    setCompetitorMessage("");
    const deleted = await deleteManualCompetitorPrice({ id });
    if (!deleted.success) setCompetitorMessage(deleted.error || "削除に失敗しました");
    else {
      await refreshAnalysis();
      setCompetitorMessage("競合価格の履歴を削除しました");
    }
    setSavingCompetitor(false);
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
            <Metric label="推定粗利益最大価格" value={yen(model?.grossProfitOptimalPrice)} />
            <Metric label="分析信頼度" value={confidenceLabel[scope.confidence]} />
            <Metric label="分析データ" value={`${scope.reservationCount}件・${scope.observedWeeks}週`} />
            <Metric label="周辺価格中央値" value={yen(competitorSummary.medianPrice)} />
            <Metric label="周辺平均との差" value={competitorSummary.differencePercent == null ? "—" : `${competitorSummary.differencePercent >= 0 ? "+" : ""}${competitorSummary.differencePercent.toFixed(1)}%`} />
          </div>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="font-bold text-emerald-950">メニュー1件あたりの変動原価</h3>
                <p className="mt-1 text-xs leading-5 text-emerald-800">材料費など、施術1件増加に伴い増える原価を入力してください。固定費や人件費は含めません。</p>
              </div>
              <div className="flex items-end gap-2">
                <label className="text-xs font-medium text-emerald-900">変動原価（円）
                  <input type="number" min="0" step="1" value={costInput} onChange={(event) => setCostInput(event.target.value)} placeholder="未設定" className="mt-1 block w-40 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-base text-slate-900" />
                </label>
                <button type="button" onClick={saveCost} disabled={savingCost} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  {savingCost ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}保存
                </button>
              </div>
            </div>
            {costMessage && <p className="mt-2 text-sm text-emerald-900">{costMessage}</p>}
            {model?.variableCost == null && <p className="mt-3 text-xs text-amber-700">原価未設定のため、推定粗利益最大価格は表示していません。</p>}
          </section>

          <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-slate-900"><Building2 size={19} className="text-blue-600" />競合価格（手動登録）</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">同一エリアの各競合について、最新の登録価格から中央値を計算します。過去履歴は上書きせず保存します。</p>
              </div>
              {competitorAreas.length > 0 && (
                <Select value={competitorArea} onValueChange={setCompetitorArea}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="エリアを選択" /></SelectTrigger>
                  <SelectContent>{competitorAreas.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_140px_160px_auto]">
              <input value={competitorName} onChange={(event) => setCompetitorName(event.target.value)} placeholder="競合サロン名" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={competitorArea} onChange={(event) => setCompetitorArea(event.target.value)} placeholder="商圏・エリア" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input type="number" min="1" step="1" value={competitorPrice} onChange={(event) => setCompetitorPrice(event.target.value)} placeholder="価格（円）" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input type="date" value={competitorDate} onChange={(event) => setCompetitorDate(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button type="button" onClick={addCompetitor} disabled={savingCompetitor} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {savingCompetitor ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}登録
              </button>
            </div>
            {competitorMessage && <p className="mt-2 text-sm text-blue-800">{competitorMessage}</p>}
            {competitorArea && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">競合</th><th className="px-3 py-2">最新価格</th><th className="px-3 py-2">取得日</th><th className="px-3 py-2">履歴数</th><th className="px-3 py-2"></th></tr></thead>
                  <tbody>{competitorSummary.latestPrices.map((item) => {
                    const historyCount = (result.competitorPrices || []).filter((record) => record.area === competitorArea && record.competitorName === item.competitorName).length;
                    return <tr key={item.id} className="border-t border-slate-100"><td className="px-3 py-2 font-medium">{item.competitorName}</td><td className="px-3 py-2">{yen(item.price)}</td><td className="px-3 py-2">{item.capturedAt}</td><td className="px-3 py-2">{historyCount}件</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => deleteCompetitor(item.id)} disabled={savingCompetitor || item.sourceType !== "manual"} aria-label={`${item.competitorName}の最新手動価格を削除`} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={16} /></button></td></tr>;
                  })}</tbody>
                </table>
                {competitorSummary.latestPrices.length === 0 && <p className="p-4 text-center text-sm text-slate-500">このエリアの競合価格は未登録です。</p>}
              </div>
            )}
            <p className="mt-3 text-xs leading-5 text-amber-700">外部サイトからの自動収集は行っていません。相対価格は表示用で、履歴期間と価格変動が十分になるまで回帰モデルには投入しません。</p>
          </section>

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
                      {model.variableCost != null && <Line type="monotone" dataKey="predictedGrossProfit" name="推定粗利益" stroke="#059669" strokeWidth={3} dot={false} />}
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
            この結果は、選択したサロンの過去CSVデータをもとにした予測・意思決定支援です。相関を因果関係として示すものではなく、価格変更後の結果を保証しません。「推定粗利益」は入力した変動原価だけを差し引いた予測で、会計上の純利益ではありません。
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${accent ? "text-indigo-700" : "text-slate-900"}`}>{value}</p></div>;
}
