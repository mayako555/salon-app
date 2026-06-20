"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StaffProfile } from "@/app/staff/actions";
import { saveEvaluation, updateEvaluation, getStaffAutoMetrics } from "./actions";
import { StaffEvaluation, EVALUATION_TEMPLATES, calculateDynamicScore, EVALUATION_CATEGORIES_JP } from "./shared";
import { Loader2, Award, Calendar, CheckCircle2, Calculator, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { unfinalizeEvaluation } from "./actions";
import { logFeatureUsage } from "@/lib/usage-logger";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  staff: StaffProfile;
  existingEvaluations: StaffEvaluation[];
};

export default function EvaluationFormDialog({ isOpen, onClose, onRefresh, staff, existingEvaluations }: Props) {
  const { user, profile, tenantPlan } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [autoMetrics, setAutoMetrics] = useState<Record<string, number>>({});
  const [managerScores, setManagerScores] = useState<Record<string, number>>({});
  
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [targetQuarter, setTargetQuarter] = useState<number>(Math.floor((new Date().getMonth() + 3) / 3));
  const [comments, setComments] = useState("");
  
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  const [periodInfo, setPeriodInfo] = useState({ start: "", end: "", months: 3 });

  const [isUnfinalizeOpen, setIsUnfinalizeOpen] = useState(false);
  const [unfinalizeReason, setUnfinalizeReason] = useState("");
  const [unfinalizing, setUnfinalizing] = useState(false);

  // Get previous evaluation to show diff
  const prevEval = existingEvaluations
    .sort((a, b) => b.target_year === a.target_year ? b.target_quarter - a.target_quarter : b.target_year - a.target_year)[0];

  const currentEval = existingEvaluations.find(e => e.target_year === targetYear && e.target_quarter === targetQuarter);

  useEffect(() => {
    if (isOpen) {
      if (currentEval) {
        setManagerScores(currentEval.manager_raw_scores || {});
        setAutoMetrics(currentEval.auto_metrics || {});
        setComments(currentEval.comments || "");
        setFetchingMetrics(false);
      } else {
        const template = EVALUATION_TEMPLATES[staff.evaluation_role || "general"];
        const initManager: Record<string, number> = {};
        template.managerItems.forEach(item => initManager[item.id] = 3); // Default 3
        setManagerScores(initManager);
        setAutoMetrics({});
        setComments("");
        
        setFetchingMetrics(true);
        getStaffAutoMetrics(staff.id, targetYear, targetQuarter, staff.hire_date).then(res => {
          if (res.success && res.data) {
            setAutoMetrics(prev => ({
              ...prev,
              monthly_sales: res.data.monthly_sales,
              sales_target_ratio: res.data.sales_target_ratio,
              unit_price: res.data.unit_price,
              next_booking_rate: res.data.next_booking_rate,
              nomination_count: res.data.nomination_count
            }));
            setPeriodInfo({ start: res.data.period_start, end: res.data.period_end, months: res.data.months_present });
          }
          setFetchingMetrics(false);
        });
      }
    }
  }, [isOpen, staff, targetYear, targetQuarter, currentEval]);

  const template = currentEval?.snapshot?.template || EVALUATION_TEMPLATES[staff.evaluation_role || "general"];
  const { auto_scores, calculated_scores, rank } = calculateDynamicScore(template, autoMetrics, managerScores);

  const handleSubmit = async (status: "draft" | "pending" | "finalized") => {
    if (!user) {
      toast.error("ログインしていません");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        staff_id: staff.id,
        evaluator_id: user.uid,
        target_year: targetYear,
        target_quarter: targetQuarter,
        template_id: template.id,
        auto_metrics: autoMetrics,
        manager_raw_scores: managerScores,
        comments,
        status
      };

      const res = currentEval 
        ? await updateEvaluation(currentEval.id, payload)
        : await saveEvaluation(payload);

      if (res.success) {
        toast.success("評価を登録しました");
        if (profile?.companyId) {
          logFeatureUsage(profile.companyId, tenantPlan, "evaluation", { action: "save", status });
        }
        onRefresh();
        onClose();
      } else {
        toast.error("登録に失敗しました: " + res.error);
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfinalize = async () => {
    if (!currentEval || !user) return;
    if (!unfinalizeReason.trim()) {
      toast.error("解除理由を入力してください");
      return;
    }

    setUnfinalizing(true);
    try {
      const res = await unfinalizeEvaluation(currentEval.id, unfinalizeReason, user.uid, user.displayName || user.email || "Unknown");
      if (res.success) {
        toast.success("評価確定を解除しました");
        setIsUnfinalizeOpen(false);
        setUnfinalizeReason("");
        onRefresh();
        onClose();
      } else {
        toast.error("解除に失敗しました: " + res.error);
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setUnfinalizing(false);
    }
  };

  const getDiff = (current: number, prev: number | undefined, unit: string = "") => {
    if (prev === undefined) return null;
    const diff = current - prev;
    if (diff > 0) return <span className="text-emerald-600 text-xs font-bold ml-2">+{diff}{unit}</span>;
    if (diff < 0) return <span className="text-rose-600 text-xs font-bold ml-2">{diff}{unit}</span>;
    return <span className="text-slate-400 text-xs ml-2">±0{unit}</span>;
  };

  // Group manager items by category
  const managerGroups = template.managerItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof template.managerItems>);

  const getRadarData = () => {
    const buckets: Record<string, { earned: number; max: number }> = {
      "技術": { earned: 0, max: 0 },
      "接客": { earned: 0, max: 0 },
      "売上": { earned: 0, max: 0 },
      "集客": { earned: 0, max: 0 },
      "運営": { earned: 0, max: 0 },
      "チーム貢献": { earned: 0, max: 0 },
    };

    template.autoItems.forEach(item => {
      const s = auto_scores[item.id] || 0;
      let bucket = "運営";
      if (item.category === "sales" || item.category === "repeat") bucket = "売上";
      else if (item.category === "satisfaction") bucket = "接客";
      else if (item.category === "tech_quality") bucket = "技術";
      else if (item.category === "marketing") bucket = "集客";
      
      buckets[bucket].earned += s;
      if (item.maxScore > 0) buckets[bucket].max += item.maxScore;
    });

    template.managerItems.forEach(item => {
      const val = managerScores[item.id];
      if (val === undefined || val === 0) return;
      
      let bucket = "運営";
      if (item.category === "customer_service") bucket = "接客";
      else if (item.category === "technical") bucket = "技術";
      else if (item.category === "team_contribution") bucket = "チーム貢献";
      else if (item.category === "company_contribution" || item.category === "operations") bucket = "運営";

      buckets[bucket].earned += val;
      buckets[bucket].max += 5;
    });

    return Object.entries(buckets).map(([subject, { earned, max }]) => ({
      subject,
      A: max > 0 ? Math.round((earned / max) * 100) : 0,
      fullMark: 100
    }));
  };

  const radarData = getRadarData();

  const isFinalized = currentEval?.status === "finalized";
  const isOwner = profile?.role === "systemOwner" || profile?.role === "companyOwner";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl sm:max-w-6xl max-h-[95vh] overflow-y-auto p-0 bg-slate-50">
        <div className="sticky top-0 bg-white z-10 border-b border-slate-100 p-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-black flex items-center gap-2 mb-2">
                <Award className="text-emerald-500" />
                スタッフ評価（70/30ルール適用）
              </DialogTitle>
              <DialogDescription>
                {staff.name} さんの評価を入力します。定量データはシステムで自動計算され（一部手入力）、定性評価は上長が入力します。
              </DialogDescription>
            </div>
            
            <div className="flex gap-4">
              <div>
                <Label className="text-xs text-slate-500">対象年</Label>
                <select 
                  className="block w-24 rounded-md border-slate-200 text-sm mt-1"
                  value={targetYear}
                  onChange={e => setTargetYear(Number(e.target.value))}
                  disabled={isFinalized}
                >
                  {[targetYear - 1, targetYear, targetYear + 1].map(y => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">四半期</Label>
                <select 
                  className="block w-24 rounded-md border-slate-200 text-sm mt-1"
                  value={targetQuarter}
                  onChange={e => setTargetQuarter(Number(e.target.value))}
                  disabled={isFinalized}
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex gap-6 items-center bg-slate-50 p-4 rounded-xl relative overflow-hidden">
            <div className="flex-1 flex items-center gap-6 z-10">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-600">
                  {rank}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-500">総合スコア</div>
                  <div className="text-3xl font-black">{calculated_scores.total} <span className="text-lg text-slate-400 font-normal">/ 100</span></div>
                  {prevEval && (
                    <div className="text-xs text-slate-500 mt-1">
                      前回: {prevEval.calculated_scores?.total || 0}点 {getDiff(calculated_scores.total, prevEval.calculated_scores?.total)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="h-12 w-px bg-slate-200 mx-2"></div>
              
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Calculator size={14}/> 自動評価（定量）</div>
                <div className="text-xl font-bold text-emerald-600">{calculated_scores.auto_total} <span className="text-sm font-normal">/ 70</span></div>
              </div>
              
              <div className="text-2xl font-light text-slate-300">+</div>
              
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Award size={14}/> 上長評価（定性）</div>
                <div className="text-xl font-bold text-blue-600">{calculated_scores.manager_total} <span className="text-sm font-normal">/ 30</span></div>
              </div>
            </div>
            
            {/* レーダーチャート表示枠 */}
            <div className="hidden sm:block absolute right-4 top-0 bottom-0 w-48 opacity-90">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="スコア"
                    dataKey="A"
                    stroke="#059669"
                    fill="#10b981"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* 左側：自動評価セクション (70点) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex justify-between items-end border-b border-emerald-200 pb-2">
                <h3 className="text-lg font-black text-emerald-800 flex items-center gap-2">
                  <Calculator className="text-emerald-500"/>
                  自動評価セクション <span className="text-sm font-normal text-emerald-600 ml-2">(配点: 70点)</span>
                </h3>
                {fetchingMetrics && <div className="text-xs text-emerald-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> 集計中...</div>}
                {!fetchingMetrics && periodInfo.start && (
                  <div className="text-xs text-slate-500">
                    集計期間: {periodInfo.start} 〜 {periodInfo.end} (稼働: {periodInfo.months}ヶ月)
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {template.autoItems.map(item => {
                  const val = autoMetrics[item.id] || 0;
                  const score = auto_scores[item.id] || 0;
                  const prevVal = prevEval?.auto_metrics?.[item.id];
                  
                  return (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-b border-l border-emerald-100">
                        最大 {item.maxScore}点
                      </div>
                      
                      <div className="text-xs font-bold text-slate-400 mb-1">{EVALUATION_CATEGORIES_JP[item.category] || item.category}</div>
                      <Label className="text-sm font-bold block mb-3">{item.label}</Label>
                      
                      <div className="flex items-end gap-3 mb-2">
                        {item.isManualInput ? (
                          <div className="relative flex-1">
                            <Input 
                              type="number"
                              value={autoMetrics[item.id] || ""}
                              onChange={e => setAutoMetrics(p => ({...p, [item.id]: Number(e.target.value)}))}
                              disabled={isFinalized}
                              className="pr-8 h-10 text-lg font-bold"
                              placeholder="0"
                              min="0"
                              step="0.1"
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400 text-sm">{item.unit}</span>
                          </div>
                        ) : (
                          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-md p-2 flex justify-between items-end">
                            <span className="text-xl font-black text-slate-700">
                              {item.unit === "円" ? val.toLocaleString() : val}
                            </span>
                            <span className="text-sm font-bold text-slate-400">{item.unit}</span>
                          </div>
                        )}
                        
                        <div className="text-right pb-1">
                          <div className="text-[10px] text-slate-500 mb-1">獲得スコア</div>
                          <div className="text-2xl font-black text-emerald-600 flex items-baseline justify-end">
                            {score} <span className="text-sm font-bold ml-1">点</span>
                          </div>
                        </div>
                      </div>
                      {prevVal !== undefined && (
                        <div className="text-xs text-slate-400">
                          前回: {item.unit === "円" ? prevVal.toLocaleString() : prevVal}{item.unit} {getDiff(val, prevVal, item.unit === "円" ? "" : item.unit)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右側：上長評価セクション (30点) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-end border-b border-blue-200 pb-2">
                <h3 className="text-lg font-black text-blue-800 flex items-center gap-2">
                  <Award className="text-blue-500"/>
                  上長評価セクション <span className="text-sm font-normal text-blue-600 ml-2">(配点: 30点)</span>
                </h3>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
                {Object.entries(managerGroups).map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <h4 className="text-sm font-black text-slate-700 border-l-4 border-blue-500 pl-2">
                      {EVALUATION_CATEGORIES_JP[category] || category}
                    </h4>
                    
                    <div className="space-y-4">
                      {items.map(item => (
                        <div key={item.id} className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex justify-between mb-2">
                            <Label className="text-sm font-bold">{item.label}</Label>
                            {prevEval && prevEval.manager_raw_scores && prevEval.manager_raw_scores[item.id] && (
                              <span className="text-xs text-slate-400">前回: {prevEval.manager_raw_scores[item.id]}</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(num => (
                              <button
                                key={num}
                                type="button"
                                disabled={isFinalized}
                                onClick={() => setManagerScores(p => ({...p, [item.id]: num}))}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                                  managerScores[item.id] === num 
                                    ? "bg-blue-600 text-white shadow-md transform scale-105" 
                                    : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                            <button
                                type="button"
                                disabled={isFinalized}
                                onClick={() => setManagerScores(p => ({...p, [item.id]: 0}))}
                                className={`flex-1 max-w-[80px] py-2 text-xs font-bold rounded-md transition-all ${
                                  managerScores[item.id] === 0 
                                    ? "bg-slate-600 text-white shadow-md transform scale-105" 
                                    : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                対象外
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* コメント入力 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mt-6">
                <Label className="text-sm font-bold mb-2 block">評価コメント・フィードバック</Label>
                <Textarea 
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  disabled={isFinalized}
                  placeholder="スタッフへのフィードバックや評価の理由を入力してください。"
                  className="min-h-[120px] bg-slate-50"
                />
              </div>

            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] border border-slate-100 items-center">
            {isFinalized && (
              <span className="text-sm font-bold text-rose-600 mr-auto flex items-center gap-2">
                <CheckCircle2 size={16} /> この評価は確定済みのため編集できません
              </span>
            )}
            
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-32">
              {isFinalized ? "閉じる" : "キャンセル"}
            </Button>
            
            {isFinalized && isOwner && (
              <Button type="button" variant="destructive" onClick={() => setIsUnfinalizeOpen(true)} disabled={loading} className="shadow-sm">
                確定を解除する
              </Button>
            )}
            
            {!isFinalized && (
              <>
                <Button type="button" variant="secondary" onClick={() => handleSubmit("draft")} disabled={loading} className="bg-slate-200 hover:bg-slate-300 text-slate-800">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  下書き保存
                </Button>
                
                <Button type="button" onClick={() => handleSubmit("pending")} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  承認申請する
                </Button>

                {isOwner && (
                  <Button type="button" onClick={() => handleSubmit("finalized")} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    評価を確定する
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* 確定解除ダイアログ */}
      <Dialog open={isUnfinalizeOpen} onOpenChange={setIsUnfinalizeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600">評価確定の解除</DialogTitle>
            <DialogDescription>
              確定済みの評価を編集可能な状態に戻します。監査ログとして解除理由が記録されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>解除理由（必須）</Label>
              <Textarea 
                value={unfinalizeReason}
                onChange={e => setUnfinalizeReason(e.target.value)}
                placeholder="例: 上長と再面談を実施したため、評価内容を修正する。"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsUnfinalizeOpen(false)} disabled={unfinalizing}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleUnfinalize} disabled={unfinalizing}>
              {unfinalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              解除して下書きに戻す
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
