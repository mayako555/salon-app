"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getDailyAttendance, AttendanceRecord } from "./actions";
import { getMonthlyShifts, ShiftRecord } from "@/app/shifts/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Search, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import AuthGuard from "@/components/AuthGuard";
import AttendanceCSVButton from "./AttendanceCSVButton";
import { updateAttendanceRecord } from "./actions";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AttendancePage() {
  const { profile, isAdmin, isManager } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const targetDateStr = format(new Date(), "yyyy-MM-dd");

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    const [year, month] = targetDateStr.split("-").map(Number);
    const [allRecords, allShifts] = await Promise.all([
      getDailyAttendance(targetDateStr),
      getMonthlyShifts(year, month)
    ]);
    
    const dayShifts = allShifts.filter(s => s.date === targetDateStr);
    setShifts(dayShifts);

    if (isAdmin || isManager) {
      setAttendanceRecords(allRecords);
    } else {
      setAttendanceRecords(allRecords.filter(r => r.staff_id === profile.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [profile, isAdmin, isManager, targetDateStr]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    
    const res = await updateAttendanceRecord(editingRecord.id, {
      break_minutes: editingRecord.break_minutes,
      status: editingRecord.status
    });
    
    if (res.success) {
      toast.success("更新しました");
      setIsEditDialogOpen(false);
      loadData();
    } else {
      toast.error("更新に失敗しました");
    }
  };

  return (
    <AuthGuard requireRole="staff">

    <div className="space-y-6">
      {/* ... existing header ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">勤怠管理</h1>
          <p className="text-slate-500 mt-1 text-sm">スタッフの日々の出退勤打刻実績と、休憩・ステータスの修正を行います。</p>
        </div>
        {/* Only Admin/Manager can search other dates for now in this view */}
        {(isAdmin || isManager) && (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input 
                type="date" 
                defaultValue={targetDateStr}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-700 bg-slate-50 h-9"
              />
            </div>
            <Button className="h-9 gap-2 w-full sm:w-auto">
              <Search size={16} />
              <span>表示</span>
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="font-semibold text-slate-700 items-center flex gap-2">
              <Clock className="w-5 h-5 text-rose-500"/>
              {format(new Date(targetDateStr), "yyyy年MM月dd日 (E)", { locale: ja })} の打刻状況
            </h2>
            <AttendanceCSVButton records={attendanceRecords} date={targetDateStr} shifts={shifts} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">スタッフ名</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>出勤打刻</TableHead>
              <TableHead>退勤打刻</TableHead>
              <TableHead>休憩時間</TableHead>
              <TableHead>実労働時間</TableHead>
              {(isAdmin || isManager) && <TableHead className="text-right">アクション</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10">読み込み中...</TableCell></TableRow>
            ) : attendanceRecords.map((record) => {
              const clockInTime = record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "--:--";
              const clockOutTime = record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "--:--";
              
              let workingHoursText = "--";
              if (record.clock_in && record.clock_out) {
                const ms = new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime();
                const totalMinutes = Math.floor(ms / 60000) - record.break_minutes;
                const hrs = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                workingHoursText = `${hrs}時間${mins}分`;
              }

              return (
                <TableRow key={record.id}>
                  <TableCell className="font-bold text-slate-900">{record.staff_name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      record.status === 'normal' ? 'bg-emerald-100 text-emerald-800' :
                      record.status === 'leave' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {record.status === 'normal' ? '通常出勤' : record.status === 'leave' ? '有給' : '欠勤'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-slate-700">{clockInTime}</TableCell>
                  <TableCell className="font-mono text-slate-700">{clockOutTime}</TableCell>
                  <TableCell>{record.break_minutes} 分</TableCell>
                  <TableCell className="font-medium text-slate-700">{workingHoursText}</TableCell>
                  {(isAdmin || isManager) && (
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1 text-slate-500 hover:text-rose-600"
                        onClick={() => {
                          setEditingRecord(record);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit2 size={16} />
                        <span>編集</span>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!loading && attendanceRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                  {isAdmin || isManager ? "本日の打刻実績はありません" : "あなたの本日の打刻実績はありません"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingRecord?.staff_name} さんの勤怠編集</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">休憩時間 (分)</label>
              <Input 
                type="number" 
                value={editingRecord?.break_minutes} 
                onChange={(e) => setEditingRecord({...editingRecord!, break_minutes: parseInt(e.target.value) || 0})}
                className="h-12 rounded-2xl bg-slate-50 border-none font-bold"
              />
              <p className="text-[10px] text-slate-400 ml-1">※休憩なしの場合は「0」を入力してください</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">出勤ステータス</label>
              <select 
                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm"
                value={editingRecord?.status}
                onChange={(e) => setEditingRecord({...editingRecord!, status: e.target.value as any})}
              >
                <option value="normal">通常出勤</option>
                <option value="leave">有給休暇</option>
                <option value="absence">欠勤</option>
              </select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-2xl font-bold">キャンセル</Button>
              <Button type="submit" className="rounded-2xl bg-slate-900 text-white font-black px-8">保存する</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </AuthGuard>
  );
}
