"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Beaker, Users, MessageSquare, BarChart3, Clock } from "lucide-react";
import { getTestTenantsData } from "./actions";
import { format } from "date-fns";

export default function TestTenantsPage() {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await getTestTenantsData();
    if (res.success) {
      setTenants(res.tenants || []);
      setFeedbacks(res.feedbacks || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Aggregate usage stats from feedbacks
  const totalUsage: Record<string, number> = {};
  feedbacks.forEach(fb => {
    if (fb.usageStats) {
      Object.entries(fb.usageStats).forEach(([key, val]) => {
        totalUsage[key] = (totalUsage[key] || 0) + (val as number);
      });
    }
  });

  const sortedUsage = Object.entries(totalUsage).sort((a, b) => b[1] - a[1]);

  return (
    <AuthGuard requireRole="systemOwner">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Beaker className="text-indigo-600" /> Test/Betaテナント管理
          </h1>
          <p className="text-slate-500 font-medium mt-1">テスト導入先の利用状況とフィードバックの分析</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* テナント一覧 */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" /> テスト企業一覧
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">企業名</th>
                      <th className="px-4 py-3">プラン</th>
                      <th className="px-4 py-3">ステータス</th>
                      <th className="px-4 py-3">フィードバック数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => {
                      const tFeedbacks = feedbacks.filter(f => f.companyId === t.id);
                      return (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 font-bold text-slate-800">{t.name}</td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                              {t.plan}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            {t.status === "active" ? (
                              <span className="text-emerald-600 font-bold">稼働中</span>
                            ) : (
                              <span className="text-slate-400">停止中</span>
                            )}
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-600">{tFeedbacks.length}件</td>
                        </tr>
                      );
                    })}
                    {tenants.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">テスト企業が存在しません</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 利用機能ランキング */}
          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-indigo-900">
                <BarChart3 className="w-5 h-5 text-indigo-500" /> 利用機能ランキング
              </CardTitle>
              <CardDescription>直近のフィードバックから集計された実際の利用回数</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mt-4">
                {sortedUsage.map(([feature, count], idx) => (
                  <li key={feature} className="flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <span className="font-bold flex items-center gap-2 text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">{idx + 1}</span>
                      {feature === "evaluation" ? "評価機能" :
                       feature === "shift" ? "シフト作成" :
                       feature === "manual" ? "マニュアル閲覧" :
                       feature === "task" ? "タスク管理" :
                       feature === "reservation" ? "予約登録" :
                       feature === "medical_record" ? "カルテ登録" :
                       feature === "sales" ? "売上登録" :
                       feature === "analytics" ? "分析画面" : feature}
                    </span>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 font-black">{count}回</Badge>
                  </li>
                ))}
                {sortedUsage.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">データがありません</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* フィードバック履歴 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" /> フィードバック履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {feedbacks.map(f => {
                const tenantName = tenants.find(t => t.id === f.companyId)?.name || "Unknown";
                return (
                  <div key={f.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">{tenantName}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Clock className="w-4 h-4" />
                          対象月: {f.month}
                          {f.timestamp && <span className="ml-2">（送信日時: {f.timestamp.toDate?.() ? format(f.timestamp.toDate(), "yyyy/MM/dd HH:mm") : "不明"}）</span>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <strong className="text-emerald-800 text-sm block mb-2">よく使った機能</strong>
                        <p className="text-emerald-900 text-sm whitespace-pre-wrap">{f.usedFeatures || "なし"}</p>
                      </div>
                      <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                        <strong className="text-slate-700 text-sm block mb-2">使わなかった機能</strong>
                        <p className="text-slate-800 text-sm whitespace-pre-wrap">{f.unusedFeatures || "なし"}</p>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 md:col-span-2">
                        <strong className="text-rose-800 text-sm block mb-2">バグ・不具合 / 改善要望</strong>
                        <p className="text-rose-900 text-sm whitespace-pre-wrap">{(f.bugs || "") + "\n" + (f.requests || "")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {feedbacks.length === 0 && (
                <div className="p-12 text-center text-slate-500 font-bold">フィードバックはまだありません</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </AuthGuard>
  );
}
