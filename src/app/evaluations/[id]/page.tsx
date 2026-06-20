"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StaffProfile, getStaffList } from "@/app/staff/actions";
import { getAllEvaluations } from "../actions";
import { StaffEvaluation, EVALUATION_TEMPLATES, EVALUATION_CATEGORIES_JP } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, TrendingUp, Award, BarChart3 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { Sparkles, ArrowUpCircle, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";

export default function GrowthChartPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>([]);

  useEffect(() => {
    if (staffId) fetchData();
  }, [staffId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffList, evalsRes] = await Promise.all([
        getStaffList(),
        getAllEvaluations()
      ]);
      const currentStaff = staffList.find(s => s.id === staffId);
      if (currentStaff) setStaff(currentStaff);
      
      const staffEvals = evalsRes
        .filter(e => e.staff_id === staffId)
        .sort((a, b) => a.target_year === b.target_year ? a.target_quarter - b.target_quarter : a.target_year - b.target_year);
      
      setEvaluations(staffEvals);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
        <p className="text-slate-500 mb-4">スタッフが見つかりません</p>
        <Button onClick={() => router.push("/evaluations")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
      </div>
    );
  }

  const latestEval = evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

  // 1. LineChart Data (推移)
  const lineChartData = evaluations.map(e => ({
    name: `${e.target_year} Q${e.target_quarter}`,
    total: e.calculated_scores?.total || 0,
    auto: e.calculated_scores?.auto_total || 0,
    manager: e.calculated_scores?.manager_total || 0
  }));

  // 2. RadarChart Data (直近評価)
  const getRadarData = (evaluation: StaffEvaluation | null) => {
    if (!evaluation) return [];
    
    const template = EVALUATION_TEMPLATES[staff.evaluation_role || "general"];
    
    const buckets: Record<string, { earned: number; max: number }> = {
      "技術": { earned: 0, max: 0 },
      "接客": { earned: 0, max: 0 },
      "売上": { earned: 0, max: 0 },
      "集客": { earned: 0, max: 0 },
      "運営": { earned: 0, max: 0 },
      "チーム貢献": { earned: 0, max: 0 },
    };

    template.autoItems.forEach(item => {
      const s = evaluation.auto_scores?.[item.id] || 0;
      let bucket = "運営";
      if (item.category === "sales" || item.category === "repeat") bucket = "売上";
      else if (item.category === "satisfaction") bucket = "接客";
      else if (item.category === "tech_quality") bucket = "技術";
      else if (item.category === "marketing") bucket = "集客";
      
      buckets[bucket].earned += s;
      if (item.maxScore > 0) buckets[bucket].max += item.maxScore;
    });

    template.managerItems.forEach(item => {
      const val = evaluation.manager_raw_scores?.[item.id];
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

  const radarData = getRadarData(latestEval);

  // 3. 昇格候補判定
  const getPromotionCandidates = () => {
    if (evaluations.length < 2) return [];
    
    const candidates = [];
    const evals = evaluations.slice().reverse(); // Oldest to newest
    const last3 = evals.slice(-3);
    const last2 = evals.slice(-2);
    
    if (last3.length === 3 && last3.every(e => (e.calculated_scores?.total || 0) >= 80)) {
      candidates.push({ title: "店長昇格候補", reason: "3期連続80点以上" });
    }
    
    if (last2.length === 2 && last2.every(e => e.rank === "S" || e.rank === "A")) {
      candidates.push({ title: "教育担当候補", reason: "2期連続A評価以上" });
    }
    
    return candidates;
  };
  
  const promotionCandidates = getPromotionCandidates();

  // 4. AI評価サマリー (Mock)
  const getAIFeedback = (evaluation: StaffEvaluation | null) => {
    if (!evaluation) return null;
    
    // In a real app, we'd call an LLM API here, passing the evaluation data.
    // Here we generate a mock summary based on the scores.
    const autoScores = evaluation.auto_scores || {};
    const strengths = [];
    const weaknesses = [];
    const actions = [];
    
    if (autoScores["sales_target_ratio"] > 10) strengths.push("売上目標達成率が非常に高い");
    else if (autoScores["sales_target_ratio"] !== undefined && autoScores["sales_target_ratio"] < 5) weaknesses.push("売上達成率が伸び悩んでいる");
    
    if (autoScores["next_booking_rate"] > 5) strengths.push("次回予約率が高く、リピート顧客が定着している");
    else if (autoScores["next_booking_rate"] !== undefined && autoScores["next_booking_rate"] < 3) weaknesses.push("次回予約率の改善が必要");
    
    if (strengths.length === 0) strengths.push("日々の業務を真面目に取り組んでいる");
    if (weaknesses.length === 0) weaknesses.push("特筆すべき課題は少ないが、更なる売上拡大を目指したい");
    
    if (weaknesses.some(w => w.includes("売上"))) actions.push("店販の提案力強化トレーニングを受講する");
    if (weaknesses.some(w => w.includes("予約"))) actions.push("カウンセリング時の次回提案トークスクリプトを見直す");
    if (actions.length === 0) actions.push("後輩スタッフの育成・フォローに回る");

    return { strengths, weaknesses, actions };
  };

  const aiFeedback = getAIFeedback(latestEval);

  return (
    <AuthGuard requireRole="admin">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push("/evaluations")} className="text-slate-500 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          評価一覧へ戻る
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="text-emerald-500" />
              成長カルテ
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">{staff.name} さんの過去の評価推移と分析</p>
          </div>
          {latestEval && (
            <Badge variant="outline" className={`font-black text-lg px-4 py-2 shadow-sm ${
              latestEval.rank === "S" ? "border-amber-200 bg-amber-50 text-amber-700" :
              latestEval.rank === "A" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
              latestEval.rank === "B" ? "border-blue-200 bg-blue-50 text-blue-700" :
              "border-slate-200 bg-slate-50 text-slate-700"
            }`}>
              現在の総合ランク: {latestEval.rank} ({latestEval.calculated_scores?.total || 0}点)
            </Badge>
          )}
        </div>

        {evaluations.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-slate-500 font-bold mb-4">まだ評価データがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 総合スコア推移 */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  総合スコアの推移
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="総合点" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="auto" name="定量(70点満点)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="manager" name="定性(30点満点)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 最新のレーダーチャート */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Award className="w-5 h-5 text-amber-500" />
                  直近の能力バランス ({latestEval?.target_year}年 Q{latestEval?.target_quarter})
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="達成度(%)"
                      dataKey="A"
                      stroke="#0ea5e9"
                      fill="#38bdf8"
                      fillOpacity={0.4}
                    />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI評価サマリー */}
            {aiFeedback && (
              <Card className="lg:col-span-2 border-slate-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-50 to-white w-64 h-full z-0 opacity-50"></div>
                <CardHeader className="pb-2 border-b border-slate-50 relative z-10">
                  <CardTitle className="text-lg font-black flex items-center gap-2 text-indigo-900">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    AI評価サマリー
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 mb-3 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> 強み
                      </h4>
                      <ul className="space-y-2">
                        {aiFeedback.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full mt-2 shrink-0"></span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                      <h4 className="font-bold text-rose-800 flex items-center gap-1.5 mb-3 text-sm">
                        <AlertCircle className="w-4 h-4" /> 課題
                      </h4>
                      <ul className="space-y-2">
                        {aiFeedback.weaknesses.map((w, i) => (
                          <li key={i} className="text-sm text-rose-700 flex items-start gap-2">
                            <span className="w-1 h-1 bg-rose-400 rounded-full mt-2 shrink-0"></span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <h4 className="font-bold text-blue-800 flex items-center gap-1.5 mb-3 text-sm">
                        <Lightbulb className="w-4 h-4" /> 推奨アクション
                      </h4>
                      <ul className="space-y-2">
                        {aiFeedback.actions.map((a, i) => (
                          <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                            <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 shrink-0"></span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 昇格候補表示 */}
            {promotionCandidates.length > 0 && (
              <Card className="lg:col-span-2 border-amber-200 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-black flex items-center gap-2 text-amber-900">
                    <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                    昇格候補
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {promotionCandidates.map((c, i) => (
                      <div key={i} className="bg-white px-4 py-3 rounded-lg border border-amber-200 shadow-sm flex items-center gap-3">
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none px-2">{c.title}</Badge>
                        <span className="text-sm font-bold text-slate-600">{c.reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 過去評価一覧 */}
            <Card className="lg:col-span-2 border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800">評価履歴</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">時期</th>
                        <th className="px-4 py-3">総合点</th>
                        <th className="px-4 py-3">ランク</th>
                        <th className="px-4 py-3">定量スコア</th>
                        <th className="px-4 py-3">定性スコア</th>
                        <th className="px-4 py-3 rounded-tr-lg">ステータス</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.slice().reverse().map((ev, i) => (
                        <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 font-bold text-slate-700">
                            {ev.target_year}年 Q{ev.target_quarter}
                          </td>
                          <td className="px-4 py-4 font-black text-lg">
                            {ev.calculated_scores?.total || 0}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={`font-bold ${
                              ev.rank === "S" ? "text-amber-600 border-amber-200" :
                              ev.rank === "A" ? "text-emerald-600 border-emerald-200" :
                              ev.rank === "B" ? "text-blue-600 border-blue-200" :
                              "text-slate-600 border-slate-200"
                            }`}>{ev.rank}</Badge>
                          </td>
                          <td className="px-4 py-4 text-slate-600 font-medium">{ev.calculated_scores?.auto_total || 0}</td>
                          <td className="px-4 py-4 text-slate-600 font-medium">{ev.calculated_scores?.manager_total || 0}</td>
                          <td className="px-4 py-4">
                            {ev.status === "finalized" ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">確定</Badge> :
                             ev.status === "pending" ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">承認待ち</Badge> :
                             <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none">下書き</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
