import { getAuditLogs } from "./actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, FileClock, RefreshCw, PlusCircle, Trash2 } from "lucide-react";

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" />
          <span>監査ログ / 変更追跡</span>
        </h1>
        <p className="text-slate-500 mt-1 text-sm">システム内の重要データの追加・更新・削除・集計履歴をすべて記録しています。</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="w-48">発生日時</TableHead>
              <TableHead className="w-32">操作ユーザー</TableHead>
              <TableHead className="w-32">アクション</TableHead>
              <TableHead>対象テーブル / ID</TableHead>
              <TableHead>変更内容サマリ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              let Icon = FileClock;
              let badgeColor = "bg-slate-100 text-slate-700";
              
              if (log.action === "INSERT") { Icon = PlusCircle; badgeColor = "bg-blue-50 text-blue-700"; }
              else if (log.action === "UPDATE") { Icon = RefreshCw; badgeColor = "bg-amber-50 text-amber-700"; }
              else if (log.action === "DELETE") { Icon = Trash2; badgeColor = "bg-red-50 text-red-700"; }
              else if (log.action === "CALCULATE" || log.action === "CLOSE_ACCOUNTING") {
                Icon = ShieldCheck; badgeColor = "bg-emerald-50 text-emerald-700";
              }

              return (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-slate-600">
                    {format(new Date(log.changed_at), "yyyy/MM/dd HH:mm:ss", { locale: ja })}
                  </TableCell>
                  <TableCell>
                    {log.actor}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-slate-400/20 ${badgeColor}`}>
                      <Icon size={12} className="mr-1" />
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{log.table_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{log.record_id}</div>
                  </TableCell>
                  <TableCell>
                    <pre className="text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-600 max-w-sm overflow-hidden whitespace-nowrap text-ellipsis">
                      {JSON.stringify(log.new_data)}
                    </pre>
                  </TableCell>
                </TableRow>
              );
            })}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  記録されたログはありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
