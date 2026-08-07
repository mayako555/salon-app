"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMonthlyStatements, MonthlyStatement } from "@/app/payroll/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Banknote, Calendar } from "lucide-react";
import StatementDialog from "@/app/payroll/StatementDialog";
import AuthGuard from "@/components/AuthGuard";

const getPayday = (targetYear: number, targetMonth: number): Date => {
  let payYear = targetYear;
  let payMonth = targetMonth + 1;
  if (payMonth > 12) {
    payYear++;
    payMonth = 1;
  }
  const payday = new Date(payYear, payMonth - 1, 25);
  if (payday.getDay() === 6) payday.setDate(24); // Sat -> Fri
  if (payday.getDay() === 0) payday.setDate(23); // Sun -> Fri
  return payday;
};

const getInitialDate = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 3; i++) {
    const targetDate = new Date();
    targetDate.setMonth(today.getMonth() - i);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    
    const payday = getPayday(year, month);
    if (today.getTime() >= payday.getTime()) {
      return targetDate;
    }
  }
  
  // Fallback to previous month if somehow nothing matches
  const fallback = new Date();
  fallback.setMonth(today.getMonth() - 1);
  return fallback;
};

export default function StaffPayrollPage() {
  const { profile, loading: authLoading } = useAuth();
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(getInitialDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const payday = getPayday(year, month);
  const realToday = new Date();
  realToday.setHours(0, 0, 0, 0);
  const isAvailable = realToday.getTime() >= payday.getTime();

  useEffect(() => {
    if (!authLoading && profile) {
      loadData();
    }
  }, [profile, authLoading, currentDate]);

  const loadData = async () => {
    if (!profile) return;
    setIsLoading(true);
    const data = await getMonthlyStatements(year, month, profile.id);
    setStatements(data);
    setIsLoading(false);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  return (
    <AuthGuard requireRole="staff" requireFeature="payroll">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Banknote className="text-emerald-600" />
              <span>給与・報酬明細</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">あなたの月次支払明細を確認できます</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg shadow-sm">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={18} />
            </Button>
            <div className="px-4 font-bold text-slate-700 flex items-center gap-2 min-w-[140px] justify-center">
              <Calendar size={16} className="text-slate-400" />
              {year}年 {month}月
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white" onClick={() => changeMonth(1)}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              明細一覧
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">読み込み中...</div>
            ) : !isAvailable ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Banknote size={32} />
                </div>
                <div>
                  <p className="text-slate-500 font-medium text-lg">{year}年{month}月の明細はまだ公開されていません</p>
                  <p className="text-slate-400 text-sm mt-2 font-bold bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full inline-block border border-amber-200">
                    公開予定日: {payday.getMonth() + 1}月{payday.getDate()}日
                  </p>
                </div>
              </div>
            ) : statements.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <FileText size={32} />
                </div>
                <div>
                  <p className="text-slate-500 font-medium">{year}年{month}月の明細データがありません</p>
                  <p className="text-slate-400 text-xs mt-1">管理者がまだ作成していない可能性があります</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {statements.map((stmt) => (
                  <div key={stmt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Banknote size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg">
                          {year}年{month}月分 {stmt.type === "salary" ? "給与" : "業務委託報酬"}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">支払明細書</p>
                      </div>
                    </div>
                    <div>
                      <StatementDialog stmt={stmt} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {statements.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
            <div className="bg-emerald-500 text-white p-1 rounded-full">
              <Banknote size={14} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">お支払いついて</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                詳細ボタンから、技術売上の内訳や各種手当、控除額の詳しい情報を確認できます。
                不明点がある場合は、管理者までお問い合わせください。
              </p>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
