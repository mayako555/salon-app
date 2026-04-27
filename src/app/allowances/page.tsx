"use client";

import { useState, useEffect, use } from "react";
import { getMonthlyAllowances, AllowanceType, AllowanceRecord } from "./actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, ChevronLeft, ChevronRight, MessageSquare, Edit3, Megaphone, HelpCircle, Train } from "lucide-react";
import { format } from "date-fns";
import AllowanceFormDialog from "./AllowanceFormDialog";
import DeleteAllowanceButton from "./DeleteAllowanceButton";
import AuthGuard from "@/components/AuthGuard";

export default function AllowancesPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = use(searchParams);
  const monthParam = params.month;
  
  const targetDate = monthParam ? new Date(monthParam) : new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  const [allowances, setAllowances] = useState<AllowanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getMonthlyAllowances(year, month);
      setAllowances(data);
      setLoading(false);
    }
    load();
  }, [year, month]);

  const getAllowanceIcon = (type: AllowanceType) => {
    switch (type) {
      case "review": return <MessageSquare size={14} className="text-pink-500" />;
      case "blog": return <Edit3 size={14} className="text-blue-500" />;
      case "sns": return <Megaphone size={14} className="text-cyan-500" />;
      case "treatment": return <HelpCircle size={14} className="text-amber-500" />;
      case "transport": return <Train size={14} className="text-blue-500" />;
      default: return <HelpCircle size={14} className="text-slate-400" />;
    }
  };

  const getAllowanceLabel = (type: AllowanceType) => {
    switch (type) {
      case "review": return "口コミ";
      case "blog": return "ブログ";
      case "sns": return "SNS";
      case "treatment": return "トリートメント";
      case "transport": return "交通費";
      default: return "その他";
    }
  };

  return (
    <AuthGuard requireRole="admin">
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">手当管理</h1>
          <p className="text-slate-500 mt-1 text-sm">口コミ手当・ブログ手当・キャンペーン手当の集計と管理を行います</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="hidden sm:flex gap-2">
            <Download size={16} />
            <span>出力</span>
          </Button>
          <AllowanceFormDialog staffList={Array.from(new Set(allowances.map(a => a.staff_name).concat(["佐藤", "北野", "大谷"])))} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-md shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-sm">
              <ChevronLeft size={16} className="text-slate-600" />
            </Button>
            <div className="px-4 font-bold text-slate-700 tabular-nums">
              {year}年 {month}月
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-sm">
              <ChevronRight size={16} className="text-slate-600" />
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead>種別</TableHead>
              <TableHead>スタッフ名</TableHead>
              <TableHead className="w-[40%]">詳細・備考</TableHead>
              <TableHead className="text-right">手当額</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allowances.map((allow) => (
              <TableRow key={allow.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      {getAllowanceIcon(allow.type)}
                    </div>
                    <span className="font-medium text-sm text-slate-700">
                      {getAllowanceLabel(allow.type)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {allow.staff_name}
                </TableCell>
                <TableCell>
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                    {allow.type === "review" && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-amber-400 text-xs shadow-sm bg-white border border-amber-100 px-1 rounded-sm">★5</span>
                        {allow.target_details?.count && <span className="font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-sm mx-1 text-[10px]">{allow.target_details.count}件分</span>}
                      </div>
                    )}
                    {allow.type === "sns" && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-cyan-600 text-xs font-bold shadow-sm bg-white border border-cyan-200 px-1 rounded-sm">予約経由</span>
                        {allow.target_details?.count && <span className="font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-sm mx-1 text-[10px]">{allow.target_details.count}件分</span>}
                      </div>
                    )}
                    {allow.type === "treatment" && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-amber-600 text-xs font-bold shadow-sm bg-white border border-amber-200 px-1 rounded-sm">10件達成</span>
                        {allow.target_details?.count && <span className="font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-sm mx-1 text-[10px]">{allow.target_details.count}件分</span>}
                      </div>
                    )}
                    {allow.target_details?.comment_preview && (
                      <span className="text-slate-400 text-[10px] truncate max-w-[200px] block mb-1">"{allow.target_details.comment_preview}"</span>
                    )}
                    {allow.type === "blog" && allow.target_details?.count && (
                      <span className="font-medium inline-block mb-1">投稿数: {allow.target_details.count}件</span>
                    )}
                    {allow.target_details?.context && (
                      <span className="block mt-0.5 text-slate-600">{allow.target_details.context}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600 text-lg">
                  ¥{allow.amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-400 hover:text-slate-600">
                    詳細
                  </Button>
                  <DeleteAllowanceButton id={allow.id} />
                </TableCell>
              </TableRow>
            ))}
            {allowances.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                  当月の手当データはありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    </AuthGuard>
  );
}
