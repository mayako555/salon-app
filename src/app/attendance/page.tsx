"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getDailyAttendance, AttendanceRecord } from "./actions";
import { getMonthlyShifts, ShiftRecord } from "@/app/shifts/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Search, Calendar as CalendarIcon, Clock, ArrowRight } from "lucide-react";
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
      status: editingRecord.status,
      effective_clock_in: editingRecord.effective_clock_in,
      effective_clock_out: editingRecord.effective_clock_out,
      is_effective_manual: true
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">勤怠管理</h1>
          <p className="text-slate-500 mt-1 text-sm">スタッフの日々の出退勤打刻実績と、有効時間の修正を行います。</p>
        </div>
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
              <TableHead>打刻実績 (IN/OUT)</TableHead>
              <TableHead>有効時間 (給与計算用)</TableHead>
              {(isAdmin || isManager) && <TableHead>休憩時間</TableHead>}
              <TableHead>実労働時間</TableHead>
              <TableHead>店舗</TableHead>
              {(isAdmin || isManager) && <TableHead className="text-right">アクション</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10">読み込み中...</TableCell></TableRow>
            ) : (
              // Group records by staff_id
              Object.values(attendanceRecords.reduce((acc, record) => {
                if (!acc[record.staff_id]) {
                  acc[record.staff_id] = { ...record, _allRecords: [record] };
                } else {
                  // Merge logic
                  acc[record.staff_id].break_minutes += record.break_minutes;
                  acc[record.staff_id]._allRecords.push(record);
                  
                  // Keep earliest clock_in and latest clock_out for display
                  if (record.clock_in && (!acc[record.staff_id].clock_in || new Date(record.clock_in) < new Date(acc[record.staff_id].clock_in))) {
                    acc[record.staff_id].clock_in = record.clock_in;
                  }
                  if (record.clock_out && (!acc[record.staff_id].clock_out || new Date(record.clock_out) > new Date(acc[record.staff_id].clock_out))) {
                    acc[record.staff_id].clock_out = record.clock_out;
                  }
                  // Same for effective
                  if (record.effective_clock_in && (!acc[record.staff_id].effective_clock_in || new Date(record.effective_clock_in) < new Date(acc[record.staff_id].effective_clock_in))) {
                    acc[record.staff_id].effective_clock_in = record.effective_clock_in;
                  }
                  if (record.effective_clock_out && (!acc[record.staff_id].effective_clock_out || new Date(record.effective_clock_out) > new Date(acc[record.staff_id].effective_clock_out))) {
                    acc[record.staff_id].effective_clock_out = record.effective_clock_out;
                  }
                }
                return acc;
              }, {} as Record<string, AttendanceRecord & { _allRecords: AttendanceRecord[] }>))
              .map((groupedRecord) => {
                const record = groupedRecord;
                const records = record._allRecords;
                
                // Format punch history string
                const punchHistory = records.map(r => {
                  const cin = r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "--:--";
                  const cout = r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "--:--";
                  return `${cin}-${cout}`;
                }).join(" / ");

                const clockInTime = record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "--:--";
                const clockOutTime = record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "--:--";
                
                const effInTime = record.effective_clock_in ? format(new Date(record.effective_clock_in), "HH:mm") : clockInTime;
                const effOutTime = record.effective_clock_out ? format(new Date(record.effective_clock_out), "HH:mm") : clockOutTime;
                
                const cin = record.effective_clock_in || record.clock_in;
                const cout = record.effective_clock_out || record.clock_out;

                let workingHoursText = "--";
                if (cin && cout) {
                  const ms = new Date(cout).getTime() - new Date(cin).getTime();
                  const totalMinutes = Math.floor(ms / 60000) - record.break_minutes;
                  const hrs = Math.floor(totalMinutes / 60);
                  const mins = totalMinutes % 60;
                  workingHoursText = `${hrs}時間${Math.max(0, mins)}分`;
                }

                const isEffDifferent = effInTime !== clockInTime || effOutTime !== clockOutTime;

                return (
                  <TableRow key={record.staff_id}>
                    <TableCell className="font-bold text-slate-900">
                      <div>{record.staff_name}</div>
                      {records.length > 1 && <div className="text-[9px] text-blue-500 font-normal">※{records.length}件の打刻を合算</div>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        record.status === 'normal' ? 'bg-emerald-100 text-emerald-800' :
                        record.status === 'leave' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {record.status === 'normal' ? '通常出勤' : record.status === 'leave' ? '有給' : '欠勤'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-400 text-[10px] leading-tight">
                      {punchHistory}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 font-mono text-sm ${isEffDifferent ? 'text-blue-600 font-bold' : 'text-slate-700'}`}>
                        {effInTime} - {effOutTime}
                        {record.is_effective_manual && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded ml-1">修正済</span>}
                      </div>
                    </TableCell>
                    {(isAdmin || isManager) && <TableCell>{record.break_minutes} 分</TableCell>}
                    <TableCell className="font-medium text-slate-700">{workingHoursText}</TableCell>
                    <TableCell>
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {record.store || "未指定"}
                      </span>
                    </TableCell>
                    {(isAdmin || isManager) && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-1 text-slate-500 hover:text-blue-600"
                          onClick={() => {
                            // Edit the most recent/relevant record
                            const latestRecord = records[records.length - 1];
                            setEditingRecord({
                              ...latestRecord,
                              effective_clock_in: record.effective_clock_in || record.clock_in,
                              effective_clock_out: record.effective_clock_out || record.clock_out,
                              break_minutes: record.break_minutes // Use the sum for editing
                            });
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
              })
            )}
            {!loading && attendanceRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                  {isAdmin || isManager ? "本日の打刻実績はありません" : "あなたの本日の打刻実績はありません"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingRecord?.staff_name} さんの勤怠編集</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 py-4">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4">
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                打刻実績にかかわらず、給与計算に使用される「有効時間」を直接上書きできます。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">有効出勤時間</label>
                <Input 
                  type="datetime-local" 
                  value={editingRecord?.effective_clock_in ? editingRecord.effective_clock_in.slice(0, 16) : ""} 
                  onChange={(e) => setEditingRecord({...editingRecord!, effective_clock_in: new Date(e.target.value).toISOString()})}
                  className="h-10 rounded-lg bg-slate-50 border-none font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">有効退勤時間</label>
                <Input 
                  type="datetime-local" 
                  value={editingRecord?.effective_clock_out ? editingRecord.effective_clock_out.slice(0, 16) : ""} 
                  onChange={(e) => setEditingRecord({...editingRecord!, effective_clock_out: new Date(e.target.value).toISOString()})}
                  className="h-10 rounded-lg bg-slate-50 border-none font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">休憩時間 (分)</label>
              <Input 
                type="number" 
                value={editingRecord?.break_minutes} 
                onChange={(e) => setEditingRecord({...editingRecord!, break_minutes: parseInt(e.target.value) || 0})}
                className="h-10 rounded-lg bg-slate-50 border-none font-bold"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">出勤ステータス</label>
              <select 
                className="w-full h-10 rounded-lg bg-slate-50 border-none px-4 font-bold text-sm"
                value={editingRecord?.status}
                onChange={(e) => setEditingRecord({...editingRecord!, status: e.target.value as any})}
              >
                <option value="normal">通常出勤</option>
                <option value="leave">有給休暇</option>
                <option value="absence">欠勤</option>
              </select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>キャンセル</Button>
              <Button type="submit" className="bg-slate-900 text-white font-black px-8">修正を保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </AuthGuard>
  );
}
