"use client";

import { useEffect, useState } from "react";
import { getFundsDashboardData } from "@/app/admin/funds/actions";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, AlertCircle, ArrowRight, TrendingUp, TrendingDown, Clock } from "lucide-react";
import Link from "next/link";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isBefore, differenceInDays } from "date-fns";
import { clsx } from "clsx";

export default function FundsCard() {
  const { isCompanyOwner, isSystemOwner } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isCompanyOwner || isSystemOwner) {
      getFundsDashboardData().then(res => {
        if (res.success) setData(res.data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isCompanyOwner, isSystemOwner]);

  if (!isCompanyOwner && !isSystemOwner) return null;
  if (loading) return null;

  // Determine if alert is needed
  const today = new Date();
  const isAfter3rd = today.getDate() >= 3;
  let needsInputForLastMonth = false;
  let missingMonthLabel = "";

  if (isAfter3rd) {
    const lastMonth = subMonths(today, 1);
    missingMonthLabel = format(lastMonth, "M月");
    
    // Check if there is any balance date in the last month
    const startOfLast = startOfMonth(lastMonth);
    const endOfLast = endOfMonth(lastMonth);
    
    // If we have accounts but no data for last month
    if (data?.accounts?.length > 0) {
      const hasLastMonthData = data.chartData?.some((d: any) => {
        const dDate = parseISO(d.date);
        return dDate >= startOfLast && dDate <= endOfLast;
      });
      if (!hasLastMonthData) {
        needsInputForLastMonth = true;
      }
    }
  }

  // Calculate staleness
  let stalenessText = "";
  let isStale = false;
  if (data?.lastUpdated) {
    const daysOld = differenceInDays(today, parseISO(data.lastUpdated));
    if (daysOld > 30) {
      stalenessText = `最終更新: ${daysOld}日前`;
      isStale = true;
    } else if (daysOld === 0) {
      stalenessText = `最終更新: 今日`;
    } else {
      stalenessText = `最終更新: ${daysOld}日前`;
    }
  }

  if (needsInputForLastMonth) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="text-amber-600 h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 text-lg mb-1">{missingMonthLabel}分の口座残高がまだ入力されていません</h3>
              <p className="text-sm text-amber-700/80 mb-4">
                現在の経営状況を正確に把握するため、各口座の最新残高を更新してください。
              </p>
              <Link href="/admin/funds">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm">
                  残高を入力する <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-slate-200 relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Wallet className="w-32 h-32" />
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-slate-500 font-medium text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Wallet size={16} className="text-indigo-600"/> 現在の現預金</span>
          {data?.latestDate && (
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">
              {format(parseISO(data.latestDate), "M月d日")} 時点
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        {data?.currentTotal !== undefined ? (
          <>
            <div className="text-3xl font-black tracking-tight text-slate-900 mb-2">
              ¥{data.currentTotal.toLocaleString()}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">前回比</span>
                <span className={clsx(
                  "text-sm font-bold flex items-center",
                  data.diff > 0 ? "text-emerald-600" : data.diff < 0 ? "text-rose-600" : "text-slate-600"
                )}>
                  {data.diff > 0 && <TrendingUp size={14} className="mr-0.5" />}
                  {data.diff < 0 && <TrendingDown size={14} className="mr-0.5" />}
                  {data.diff > 0 ? "+" : ""}¥{data.diff.toLocaleString()}
                </span>
              </div>
              
              <div className={clsx(
                "text-[11px] flex items-center gap-1 font-medium",
                isStale ? "text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded" : "text-slate-400"
              )}>
                <Clock size={12} />
                {stalenessText}
              </div>
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-500 mb-3">口座や残高が未登録です</p>
          </div>
        )}
      </CardContent>
      
      <div className="px-6 pb-4 mt-auto">
        <Link href="/admin/funds">
          <Button variant="outline" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-sm h-9">
            詳細を見る <ArrowRight size={14} className="ml-1.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
