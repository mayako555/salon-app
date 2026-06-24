export const dynamic = "force-dynamic";
import { getMonthlyStatements } from "./actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import GenerateButton from "./GenerateButton";
import CloseButton from "./CloseButton";
import CSVExportButton from "./CSVExportButton";
import StatementDialog from "./StatementDialog";
import EditStatementDialog from "./EditStatementDialog";
import CreateStatementDialog from "./CreateStatementDialog";
import DeleteStatementButton from "./DeleteStatementButton";
import TransferToggleButton from "./TransferToggleButton";
import StatusToggleButton from "./StatusToggleButton";
import { getStaffList } from "../staff/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Banknote, UserCircle2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj.toDate === "function") {
    return obj.toDate().toISOString();
  }
  if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
    return new Date(obj.seconds * 1000).toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[key] = sanitizeObject(obj[key]);
  }
  return result;
}

export default async function PayrollPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams;
  const targetDate = params?.month ? new Date(params.month) : new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  const rawStatements = await getMonthlyStatements(year, month);
  const statements = sanitizeObject(rawStatements) as typeof rawStatements;
  
  const isClosed = statements.length > 0 && statements.every((s: any) => s.status === "closed");
  const totalPaid = statements.reduce((acc: number, curr: any) => acc + curr.final_paid_amount, 0);

  const prevMonth = format(new Date(year, month - 2, 1), "yyyy-MM");
  const nextMonth = format(new Date(year, month, 1), "yyyy-MM");

  const staffList = await getStaffList();
  const simpleStaffList = staffList.map(s => ({ id: s.id, name: s.name }));

  // Find staff members without a statement in the current month
  const uncreatedStaff = staffList.filter(staff => {
    return !statements.some((stmt: any) => stmt.staff_id === staff.id);
  });

  return (
    <AuthGuard requireRole="admin">
      <div className="space-y-6 pb-24 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
              <Link href={`/payroll?month=${prevMonth}`} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-400 hover:text-slate-900">
                <ChevronLeft size={20} />
              </Link>
              <div className="px-3 font-bold text-slate-700 text-sm tabular-nums">
                {year}年{month}月
              </div>
              <Link href={`/payroll?month=${nextMonth}`} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-400 hover:text-slate-900">
                <ChevronRight size={20} />
              </Link>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Banknote className="text-emerald-600" />
                <span>給与・報酬計算</span>
              </h1>
              <p className="text-slate-500 mt-0.5 text-xs">各種マスタおよび当月の売上・手当データをもとに算出します</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <CSVExportButton statements={statements} year={year} month={month} />
            <CreateStatementDialog staffList={simpleStaffList} defaultYear={year} defaultMonth={month} />
            {!isClosed && <GenerateButton year={year} month={month} />}
            <CloseButton year={year} month={month} hasData={statements.length > 0} disabled={isClosed} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <p className="text-sm font-medium text-slate-500 mb-1">計算対象スタッフ</p>
             <p className="text-3xl font-bold text-slate-800">{statements.length}<span className="text-lg font-medium text-slate-500 ml-1">名</span></p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <p className="text-sm font-medium text-slate-500 mb-1">当月総支給額</p>
             <p className="text-3xl font-bold text-slate-800">¥{totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-slate-500 mb-1">締めステータス</p>
               {isClosed ? (
                 <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full w-fit">
                   <CheckCircle2 size={16} /><span>確定済み</span>
                 </div>
               ) : (
                 <div className="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full w-fit">
                   <AlertCircle size={16} /><span>未確定 (編集中)</span>
                 </div>
               )}
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">スタッフ別 計算明細サマリ</h2>
          </div>
          
          {statements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <UserCircle2 size={48} className="text-slate-300 mb-4" />
              <p className="mb-2">当月の計算データがありません</p>
              <p className="text-sm">右上の「最新データで再計算」を実行してください</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>スタッフ</TableHead>
                  <TableHead className="text-right">基本給 / 歩合報酬</TableHead>
                  <TableHead className="text-right">手当合計</TableHead>
                  <TableHead className="text-right text-emerald-600">消費税加算</TableHead>
                  <TableHead className="text-right">差引支給額 / 最終請求額</TableHead>
                  <TableHead className="text-center w-28">状態</TableHead>
                  <TableHead className="text-center w-28">振込</TableHead>
                  <TableHead className="text-right w-36">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map(stmt => (
                  <TableRow key={stmt.id}>
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                           {stmt.staff_name.charAt(0)}
                         </div>
                         {stmt.staff_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{stmt.base_amount.toLocaleString()}
                      {stmt.type === "salary" ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">実働: {stmt.details.metrics.worked_hours} 時間</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5">技術 ¥{stmt.details.base_tech_salary.toLocaleString()} / 店販 ¥{stmt.details.base_product_salary.toLocaleString()} / 指名 ¥{stmt.details.nomination_reward.toLocaleString()}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-emerald-600 font-bold">+¥{stmt.total_allowances.toLocaleString()}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">総支給: ¥{(stmt.base_amount + stmt.total_allowances).toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      +¥{stmt.details.tax_addition.toLocaleString()}
                      <p className="text-[10px] text-emerald-600/60 mt-0.5">10%</p>
                    </TableCell>
                    <TableCell className="text-right text-lg font-bold text-slate-800 bg-slate-50/50">
                      ¥{stmt.final_paid_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                        stmt.status === "closed" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          stmt.status === "closed" ? "bg-emerald-500" : "bg-amber-500"
                        }`} />
                        {stmt.status === "closed" ? "確定済み" : "一時保存"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <TransferToggleButton 
                        id={stmt.id} 
                        status={stmt.status} 
                        isTransferred={!!stmt.is_transferred} 
                        staffName={stmt.staff_name} 
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {stmt.status !== "closed" ? (
                          <>
                            <EditStatementDialog stmt={stmt} />
                            <DeleteStatementButton id={stmt.id} staffName={stmt.staff_name} />
                          </>
                        ) : null}
                        <StatusToggleButton id={stmt.id} status={stmt.status} staffName={stmt.staff_name} />
                        <StatementDialog stmt={stmt} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {uncreatedStaff.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <h2 className="font-bold text-slate-800">給与・報酬明細 未作成のスタッフ</h2>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                残り {uncreatedStaff.length} 名
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {uncreatedStaff.map(staff => (
                <div key={staff.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                      {staff.name.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{staff.name}</span>
                  </div>
                  <CreateStatementDialog 
                    staffList={simpleStaffList} 
                    defaultYear={year} 
                    defaultMonth={month} 
                    initialStaffId={staff.id}
                    triggerBtn={
                      <Button size="sm" variant="outline" className="h-8 text-xs font-bold bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300">
                        <Plus size={12} className="mr-1" />明細作成
                      </Button>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
