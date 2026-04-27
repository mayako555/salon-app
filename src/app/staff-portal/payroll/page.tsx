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

export default function StaffPayrollPage() {
  const { profile, loading: authLoading } = useAuth();
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

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
    <AuthGuard requireRole="staff">
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

          <div className="p-0">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">読み込み中...</div>
            ) : statements.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <FileText size={32} />
                </div>
                <div>
                  <p className="text-slate-500 font-medium">{year}年{month}月の明細はまだ確定していません</p>
                  <p className="text-slate-400 text-xs mt-1">確定までしばらくお待ちください</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>種別</TableHead>
                    <TableHead className="text-right">総支給額 (税込)</TableHead>
                    <TableHead className="text-center">ステータス</TableHead>
                    <TableHead className="text-right">詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((stmt) => (
                    <TableRow key={stmt.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          stmt.type === "salary" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {stmt.type === "salary" ? "給与" : "業務委託報酬"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg text-slate-800">
                        ¥{stmt.final_paid_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2 py-1 rounded-md font-bold ${
                          stmt.status === "closed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {stmt.status === "closed" ? "確定済み" : "計算中"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <StatementDialog stmt={stmt} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
