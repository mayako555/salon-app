"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSystemAdoptionStats, CompanyAdoptionStats } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Store, Users, Zap, TrendingUp, Activity, CheckCircle2, XCircle } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

export default function SystemAdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getSystemAdoptionStats();
      if (res.success) {
        setStats(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center">読み込み中...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-rose-500">データの取得に失敗しました。権限がありません。</div>;
  }

  const churnCandidates = stats.companies.filter((c: CompanyAdoptionStats) => c.isChurnCandidate);

  return (
    <AuthGuard requireRole="systemOwner">
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">システム導入状況ダッシュボード</h1>
          <p className="text-slate-500 mt-2">全加盟店の導入進捗と利用状況（利用価値スコア）をモニタリングします。</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-slate-500 font-bold">総加盟店</CardTitle>
              <Store className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stats.totalStores}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-slate-500 font-bold">有料 / Test</CardTitle>
              <Zap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-slate-800">
                {stats.paidStores} <span className="text-sm font-normal text-slate-400">/ {stats.testStores}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-slate-500 font-bold">アクティブ(7日)</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stats.activeStores}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-slate-500 font-bold">平均導入率</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stats.avgAdoptionRate}%</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-slate-500 font-bold">平均利用価値</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stats.avgUsageScore}</div>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 border-rose-100 col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-rose-700 font-bold">解約予備軍</CardTitle>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-rose-700">{stats.churnCandidates} <span className="text-sm font-normal text-rose-500">店舗</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Tenant List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">加盟店一覧（利用状況）</h2>
            {stats.companies.map((company: CompanyAdoptionStats) => (
              <Card key={company.id} className="overflow-hidden">
                <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-900">{company.name}</h3>
                      <Badge variant="outline" className="bg-slate-50">{company.plan}</Badge>
                      {company.isChurnCandidate && <Badge className="bg-rose-100 text-rose-700 border-rose-200">要注意</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      ID: {company.id} / 登録: {new Date(company.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-600">
                      <span>最終ログイン: {company.lastLoginAt ? new Date(company.lastLoginAt).toLocaleDateString() : '未ログイン'}</span>
                      <span>最終利用: {company.lastUsedAt ? new Date(company.lastUsedAt).toLocaleDateString() : '未利用'}</span>
                    </div>
                  </div>

                  <div className="flex gap-6 w-full md:w-auto">
                    <div className="space-y-2 flex-1 md:w-32">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">導入率</span>
                        <span className="text-blue-600">{company.adoptionRate}%</span>
                      </div>
                      <Progress value={company.adoptionRate} className="h-2 [&>div]:bg-blue-500" />
                    </div>
                    <div className="space-y-2 flex-1 md:w-32">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">利用価値スコア</span>
                        <span className={company.usageValueScore > 50 ? "text-indigo-600" : "text-amber-600"}>{company.usageValueScore}</span>
                      </div>
                      <Progress value={company.usageValueScore} className={`h-2 [&>div]:${company.usageValueScore > 50 ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Churn Alerts Sidebar */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-xl font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle size={20} />
              解約予備軍アラート
            </h2>
            <p className="text-sm text-slate-500">
              30日未ログイン、60日未利用、または「設定済みだが利用価値スコアが極端に低い」店舗です。
            </p>

            {churnCandidates.length === 0 ? (
              <Card className="bg-emerald-50 border-emerald-100">
                <CardContent className="p-6 text-center text-emerald-700 font-bold">
                  現在、解約予備軍に該当する店舗はありません。
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {churnCandidates.map((c: CompanyAdoptionStats) => (
                  <Card key={c.id} className="border-rose-200 bg-white">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-slate-900">{c.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2 mt-2">
                        {(!c.lastLoginAt || (Date.now() - new Date(c.lastLoginAt).getTime() > 30*24*60*60*1000)) && (
                          <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-md">
                            <XCircle size={14} /> 30日以上未ログイン
                          </div>
                        )}
                        {(!c.lastUsedAt || (Date.now() - new Date(c.lastUsedAt).getTime() > 60*24*60*60*1000)) && (
                          <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-md">
                            <XCircle size={14} /> 60日以上未利用（アクションなし）
                          </div>
                        )}
                        {(c.adoptionRate >= 80 && c.usageValueScore <= 20) && (
                          <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" /> 
                            <span>設定は完了({c.adoptionRate}%)していますが、実運用されていません(スコア: {c.usageValueScore})</span>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-4 text-xs">詳細を確認 / 連絡する</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
