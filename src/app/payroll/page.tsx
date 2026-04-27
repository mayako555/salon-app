export const dynamic = "force-dynamic";
import { getMonthlyStatements } from "./actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import GenerateButton from "./GenerateButton";
import CloseButton from "./CloseButton";
import CSVExportButton from "./CSVExportButton";
import StatementDialog from "./StatementDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, UserCircle2, CheckCircle2, AlertCircle } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

export default async function PayrollPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams;
  const targetDate = params?.month ? new Date(params.month) : new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  const statements = await getMonthlyStatements(year, month);
  
  const isClosed = statements.length > 0 && statements.every(s => s.status === "closed");
  const totalPaid = statements.reduce((acc, curr) => acc + curr.final_paid_amount, 0);

  return (
    <AuthGuard requireRole="admin">
      <div className="space-y-6 pb-24 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Banknote className="text-emerald-600" />
              <span>給与・報酬計算 ({year}年{month}月)</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">各種マスタおよび当月の売上・手当データをもとに総支給額を算出します</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <CSVExportButton statements={statements} year={year} month={month} />
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
                  <TableHead className="text-right">歩合報酬 (預り金控除後)</TableHead>
                  <TableHead className="text-right">手当合計</TableHead>
                  <TableHead className="text-right text-emerald-600">消費税加算</TableHead>
                  <TableHead className="text-right">最終請求額</TableHead>
                  <TableHead className="text-right w-24">アクション</TableHead>
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
                    <TableCell className="text-right text-emerald-600 font-bold">
                      +¥{stmt.total_allowances.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      +¥{stmt.details.tax_addition.toLocaleString()}
                      <p className="text-[10px] text-emerald-600/60 mt-0.5">10%</p>
                    </TableCell>
                    <TableCell className="text-right text-lg font-bold text-slate-800 bg-slate-50/50">
                      ¥{stmt.final_paid_amount.toLocaleString()}
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
    </AuthGuard>
  );
}
