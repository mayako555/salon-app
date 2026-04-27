import { getStaffList } from "./actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, FileText } from "lucide-react";
import StaffFormDialog from "./StaffFormDialog";
import Link from "next/link";
import { format } from "date-fns";
import AuthGuard from "@/components/AuthGuard";

export default async function StaffPage() {
  const staffList = await getStaffList();

  return (
    <AuthGuard requireRole="admin">
      <div className="space-y-6">
        <div className="flex flex-row justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">スタッフ管理</h1>
            <p className="text-slate-500 mt-1 text-sm">サロンに在籍するスタッフ（正社員・業務委託）の情報を管理します。</p>
          </div>
          <StaffFormDialog />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[200px]">スタッフ名</TableHead>
                <TableHead>雇用形態</TableHead>
                <TableHead>インボイス登録</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead>希望休上限</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium text-slate-900">{staff.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      staff.employment_type === 'employee' 
                        ? 'bg-blue-100 text-blue-800' 
                        : staff.employment_type === 'part_time'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {staff.employment_type === 'employee' ? '正社員' : 
                       staff.employment_type === 'part_time' ? 'パート' : '業務委託'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {staff.is_invoice_registered ? (
                      <span className="text-emerald-600 text-sm font-medium">登録済み</span>
                    ) : (
                      <span className="text-slate-400 text-sm">未登録</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {staff.created_at?.toDate 
                      ? format(staff.created_at.toDate(), "yyyy年MM月dd日") 
                      : staff.created_at instanceof Date 
                        ? format(staff.created_at, "yyyy年MM月dd日")
                        : "初期データ"}
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">
                    {staff.max_holiday_requests ?? 3}日
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link 
                      href={`/contracts?staffId=${staff.id}`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 h-8 px-3 gap-1"
                    >
                      <FileText size={14} />
                      <span className="hidden sm:inline">契約情報</span>
                    </Link>
                    <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-slate-500 hover:text-rose-600">
                      <Edit2 size={16} />
                      <span className="sr-only">編集</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {staffList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    スタッフが登録されていません
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
