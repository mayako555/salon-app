"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getMonthlyAllowances, AllowanceType, AllowanceRecord } from "./actions";
import { getStaffList } from "@/app/staff/actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, ChevronLeft, ChevronRight, MessageSquare, Edit3, Megaphone, HelpCircle, Train, CheckCircle2, Settings } from "lucide-react";
import { format } from "date-fns";
import AllowanceTaskDialog from "./AllowanceTaskDialog";
import NominationDetailDialog from "./NominationDetailDialog";
import TreatmentDetailDialog from "./TreatmentDetailDialog";
import AllowanceConfigDialog from "./AllowanceConfigDialog";
import TransportHistoryDialog from "./TransportHistoryDialog";
import AuthGuard from "@/components/AuthGuard";
import { AllowanceTaskStatus, getMonthlyAllowanceTasks, unmarkAllowanceChecked } from "./actions";
import { UserCheck } from "lucide-react";

import { Suspense } from "react";

function AllowancesPageContent() {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  
  const targetDate = monthParam ? new Date(monthParam) : new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  
  const router = useRouter();
  const pathname = usePathname();

  const [tasks, setTasks] = useState<AllowanceTaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTask, setSelectedTask] = useState<AllowanceTaskStatus | null>(null);
  const [detailStaff, setDetailStaff] = useState<AllowanceTaskStatus | null>(null);
  const [detailTreatmentStaff, setDetailTreatmentStaff] = useState<AllowanceTaskStatus | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isTransportHistoryOpen, setIsTransportHistoryOpen] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/allowances?year=${year}&month=${month}`, { cache: 'no-store' });
      const result = await res.json();
      if (result.success) {
        setTasks(result.data);
      } else {
        setErrorMsg(result.error || "データの取得に失敗しました。");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [year, month]);

  const handleUnmark = async (staffId: string) => {
    if (confirm("未確認状態に戻しますか？")) {
      await unmarkAllowanceChecked(staffId, `${year}-${String(month).padStart(2, '0')}`);
      loadTasks();
    }
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(year, month - 1 + offset, 1);
    const newMonthStr = format(newDate, "yyyy-MM");
    router.push(`${pathname}?month=${newMonthStr}`);
  };

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

  const completedCount = tasks.filter(t => t.is_checked).length;
  const totalCount = tasks.length;
  const totalAmount = tasks.reduce((sum, t) => sum + t.total_amount, 0);
  const isAllCompleted = totalCount > 0 && completedCount === totalCount;

  return (
    <AuthGuard requireRole="admin">
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">手当管理</h1>
          <p className="text-slate-500 mt-1 text-sm">口コミ手当・ブログ手当・キャンペーン手当の集計と管理を行います</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <span className="text-sm font-bold text-slate-500 mr-2">当月手当合計</span>
            <span className="text-xl font-black text-slate-800">¥{totalAmount.toLocaleString()}</span>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-blue-200 text-blue-700 hover:text-blue-800 hover:bg-blue-50/50"
            onClick={() => setIsTransportHistoryOpen(true)}
          >
            <Train size={16} />
            交通費申請の履歴
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setIsConfigOpen(true)}
          >
            <Settings size={16} />
            手当ルール設定
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-md shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-slate-100 rounded-sm"
              onClick={() => handleMonthChange(-1)}
            >
              <ChevronLeft size={16} className="text-slate-600" />
            </Button>
            <div className="px-4 font-bold text-slate-700 tabular-nums">
              {year}年 {month}月
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-slate-100 rounded-sm"
              onClick={() => handleMonthChange(1)}
            >
              <ChevronRight size={16} className="text-slate-600" />
            </Button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-slate-700">進捗状況</div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${isAllCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                  style={{ width: `${totalCount === 0 ? 0 : (completedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500">
                {completedCount} / {totalCount} 名
              </span>
            </div>
          </div>
          {isAllCompleted && (
            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 size={14} /> 全スタッフの確認完了
            </div>
          )}
        </div>

        <Table>
          {errorMsg && (
            <div className="p-4 bg-rose-50 text-rose-600 text-sm font-bold border-b border-rose-100">
              データの読み込みに失敗しました: {errorMsg}
            </div>
          )}
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="w-[100px]">ステータス</TableHead>
              <TableHead>スタッフ名</TableHead>
              <TableHead>指名数</TableHead>
              <TableHead>手当内訳</TableHead>
              <TableHead className="text-right">手当合計額</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-400">読込中...</TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  スタッフデータがありません
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.staff_id} className={task.is_checked ? "bg-slate-50/30" : "bg-white"}>
                  <TableCell>
                    {task.is_checked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                        <CheckCircle2 size={14} /> 確認済
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md">
                        <HelpCircle size={14} /> 未確認
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-bold text-slate-800">
                    {task.staff_name}
                  </TableCell>
                  <TableCell>
                    <button 
                      onClick={() => setDetailStaff(task)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all font-black text-xs group"
                    >
                      <UserCheck size={14} className="group-hover:scale-110 transition-transform" />
                      {task.nomination_count} 件
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {task.allowances.length === 0 ? (
                        <span className="text-xs text-slate-400">該当手当なし</span>
                      ) : (
                        task.allowances.map(a => (
                          <span key={a.id} className="text-[10px] flex items-center gap-1 font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm">
                            {a.type === 'review' && <MessageSquare size={10} className="text-pink-500" />}
                            {a.type === 'nomination' && <span className="text-emerald-500 font-bold">★</span>}
                            {a.type === 'blog' && <Edit3 size={10} className="text-blue-500" />}
                            {a.type === 'sns' && <Megaphone size={10} className="text-cyan-500" />}
                            {a.type === 'treatment' && <HelpCircle size={10} className="text-amber-500" />}
                            {a.type === 'transport' && <span className="text-slate-500">🚆</span>}
                            {a.type === 'other' && <span className="text-slate-500">📦</span>}
                            {a.type === 'review' ? '口コミ' : a.type === 'nomination' ? '指名手当' : a.type === 'blog' ? 'ブログ' : a.type === 'sns' ? 'SNS' : a.type === 'treatment' ? 'トリートメント' : a.type === 'transport' ? '交通費' : 'その他'}
                            {a.store_name && <span className="text-slate-400 font-normal ml-0.5">({a.store_name})</span>}
                            {a.amount > 0 && <span className="text-slate-400 ml-1">¥{a.amount.toLocaleString()}</span>}
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-800">
                    ¥{task.total_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {task.is_checked ? (
                      <Button variant="ghost" size="sm" onClick={() => handleUnmark(task.staff_id)} className="h-8 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs">
                        未確認に戻す
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setSelectedTask(task)} className="h-8 px-4 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold">
                        入力・確認する
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTask && (
        <AllowanceTaskDialog 
          task={selectedTask} 
          isOpen={true} 
          onClose={() => setSelectedTask(null)} 
          onSuccess={() => {
            setSelectedTask(null);
            loadTasks();
          }}
          onOpenDetail={() => setDetailStaff(selectedTask)} 
          onOpenTreatmentDetail={() => setDetailTreatmentStaff(selectedTask)} 
        />
      )}

      {detailStaff && (
        <NominationDetailDialog
          staffName={detailStaff.staff_name}
          month={`${year}年${month}月`}
          nominations={detailStaff.nominations}
          isOpen={true}
          onClose={() => setDetailStaff(null)}
        />
      )}

      {detailTreatmentStaff && (
        <TreatmentDetailDialog
          staffName={detailTreatmentStaff.staff_name}
          month={`${year}年${month}月`}
          treatments={detailTreatmentStaff.treatments}
          isOpen={true}
          onClose={() => setDetailTreatmentStaff(null)}
        />
      )}

      {isConfigOpen && (
        <AllowanceConfigDialog
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onSuccess={() => loadTasks()}
        />
      )}

      {isTransportHistoryOpen && (
        <TransportHistoryDialog
          isOpen={isTransportHistoryOpen}
          onClose={() => setIsTransportHistoryOpen(false)}
        />
      )}
    </div>
    </AuthGuard>
  );
}

export default function AllowancesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">読み込み中...</div>}>
      <AllowancesPageContent />
    </Suspense>
  );
}
