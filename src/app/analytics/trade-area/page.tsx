"use client";

import { useEffect, useState } from "react";
import { getTradeAreaStats, AreaStats } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Database, ArrowRight, Share2 } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { Progress } from "@/components/ui/progress";

export default function TradeAreaAnalyticsPage() {
  const [stats, setStats] = useState<AreaStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getTradeAreaStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center">読み込み中...</div>;
  }

  // Calculate percentages for channel breakdown
  const renderChannelBreakdown = (channels: Record<string, number>, totalCustomers: number) => {
    if (totalCustomers === 0) return <span className="text-slate-400">-</span>;
    
    return (
      <div className="flex flex-wrap gap-2 text-[10px]">
        {Object.entries(channels).sort((a, b) => b[1] - a[1]).map(([channel, count]) => {
          const pct = Math.round((count / totalCustomers) * 100);
          let color = "bg-slate-100 text-slate-600";
          if (channel === "ホットペッパー") color = "bg-rose-100 text-rose-700";
          if (channel === "Instagram") color = "bg-pink-100 text-pink-700";
          if (channel === "TikTok") color = "bg-zinc-100 text-zinc-800";
          if (channel === "Google") color = "bg-blue-100 text-blue-700";
          if (channel === "紹介") color = "bg-emerald-100 text-emerald-700";

          return (
            <Badge key={channel} variant="outline" className={`${color} border-none font-bold`}>
              {channel} {pct}%
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <AuthGuard requireRole="manager">
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <MapPin className="text-indigo-500" />
            商圏・流入経路分析
          </h1>
          <p className="text-slate-500">お客様の来店エリアと、エリアごとの集客チャネル・売上を分析します。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <MapPin size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-indigo-100">集計エリア数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.length} <span className="text-sm font-normal">市区町村</span></div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500">
              <Share2 size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">最大の紹介流入エリア</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const topReferral = [...stats].sort((a, b) => (b.channels["紹介"] || 0) - (a.channels["紹介"] || 0))[0];
                if (!topReferral || (topReferral.channels["紹介"] || 0) === 0) return <div className="text-xl font-bold text-slate-400">データなし</div>;
                return (
                  <div>
                    <div className="text-2xl font-black text-slate-900">{topReferral.areaName}</div>
                    <p className="text-xs text-emerald-600 font-bold mt-1">紹介数: {topReferral.channels["紹介"] || 0}件</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-amber-500">
              <Database size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">最高LTVエリア</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const topSpend = [...stats].sort((a, b) => b.avgSpend - a.avgSpend)[0];
                if (!topSpend) return <div className="text-xl font-bold text-slate-400">データなし</div>;
                return (
                  <div>
                    <div className="text-2xl font-black text-slate-900">{topSpend.areaName}</div>
                    <p className="text-xs text-amber-600 font-bold mt-1">客単価: ¥{topSpend.avgSpend.toLocaleString()}</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-slate-800">エリア別 分析データ</CardTitle>
            <CardDescription>顧客情報に登録された住所から市区町村を抽出し集計しています。</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-slate-700 min-w-[120px]">エリア</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">顧客数</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">累計売上</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">客単価</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">来店回数</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">リピート率</TableHead>
                  <TableHead className="font-bold text-slate-600 min-w-[200px]">流入チャネル割合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">データがありません</TableCell>
                  </TableRow>
                ) : (
                  stats.map((row) => (
                    <TableRow key={row.areaName} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-black text-slate-900">{row.areaName}</TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">{row.customersCount}名</TableCell>
                      <TableCell className="text-right font-medium">¥{row.totalSales.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-amber-700">¥{row.avgSpend.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{row.totalVisits}回</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-bold text-slate-700">{row.repeatRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderChannelBreakdown(row.channels, row.customersCount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AuthGuard>
  );
}
