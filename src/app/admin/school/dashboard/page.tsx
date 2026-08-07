"use client";

import { useEffect, useState } from "react";
import { getSchoolDashboardStats } from "../dashboard-actions";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, TrendingUp, Users, CalendarDays, Coins } from "lucide-react";
import { format } from "date-fns";

export default function SchoolDashboardPage() {
  const { schoolEnabled, schoolName } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    if (schoolEnabled) {
      loadStats();
    }
  }, [schoolEnabled, currentMonth]);

  const loadStats = async () => {
    setLoading(true);
    const res = await getSchoolDashboardStats(currentMonth);
    if (res.success) {
      setStats(res.data);
    }
    setLoading(false);
  };

  if (!schoolEnabled) {
    return <div className="p-8 text-center text-slate-500">スクール機能が有効ではありません</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" /> {schoolName || "スクール"} ダッシュボード
          </h1>
          <p className="text-slate-500 font-medium mt-1">スクール事業の主要な数値を一目で確認</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="h-11 rounded-md border border-slate-200 bg-white px-3 font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">集計中...</div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-indigo-100 shadow-md bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-500">売上高 (当月)</CardTitle>
              <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <Coins size={16} className="text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                ¥{stats.totalSales.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">※受講済ステータスの予約から計上</p>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-100 shadow-md bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-500">予約数 (当月)</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <CalendarDays size={16} className="text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                {stats.totalReservations} <span className="text-lg font-bold text-slate-500">件</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-100 shadow-md bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-500">受講完了 (当月)</CardTitle>
              <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-sky-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                {stats.completedReservations} <span className="text-lg font-bold text-slate-500">件</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 text-rose-400 font-bold">データの取得に失敗しました</div>
      )}
    </div>
  );
}
