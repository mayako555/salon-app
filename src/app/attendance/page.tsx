"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getDailyAttendance, AttendanceRecord, getAllStaffProfiles, bulkImportAttendanceRecords } from "./actions";
import { getMonthlyShifts, ShiftRecord } from "@/app/shifts/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Search, Calendar as CalendarIcon, Clock, ArrowRight, Upload, ShieldAlert, FileText, AlertCircle, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import AuthGuard from "@/components/AuthGuard";
import AttendanceCSVButton from "./AttendanceCSVButton";
import { updateAttendanceRecord, deleteAttendanceRecords } from "./actions";
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
import Papa from "papaparse";

export default function AttendancePage() {
  const { profile, isAdmin, isManager, availableStoreObjects, attendancePolicy } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editingGroup, setEditingGroup] = useState<AttendanceRecord[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [targetDateStr, setTargetDateStr] = useState(format(new Date(), "yyyy-MM-dd"));

  // Google Form Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const actualRoundingRule = attendancePolicy.roundingEnabled 
    ? (attendancePolicy.roundingIntervalMinutes === 15 ? '15' : '30') 
    : 'none';
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);

  // Manual Add States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addRecordData, setAddRecordData] = useState<any>({ staffId: "", clockIn: "", clockOut: "", store: "", storeId: "", breakMinutes: 60, status: "normal" });
  const [isAdding, setIsAdding] = useState(false);

  const applyRounding = (isoStr: string | null, type: 'in' | 'out', rule: 'none' | '15' | '30') => {
    if (!isoStr) return "";
    let d = new Date(isoStr);
    
    if (rule === 'none') {
      return format(d, "HH:mm");
    }
    const mins = d.getMinutes();
    const rounded = new Date(d);
    if (rule === '15') {
      if (type === 'in') {
        const remainder = mins % 15;
        if (remainder > 0) {
          rounded.setMinutes(mins + (15 - remainder));
        }
      } else {
        rounded.setMinutes(mins - (mins % 15));
      }
    } else if (rule === '30') {
      if (type === 'in') {
        const remainder = mins % 30;
        if (remainder > 0) {
          rounded.setMinutes(mins + (30 - remainder));
        }
      } else {
        rounded.setMinutes(mins - (mins % 30));
      }
    }
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return format(rounded, "HH:mm");
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let profiles = staffProfiles;
    if (profiles.length === 0) {
      const res = await getAllStaffProfiles();
      if (res.success && res.data) {
        profiles = res.data;
        setStaffProfiles(res.data);
      } else {
        toast.error("スタッフ情報の取得に失敗しました");
        return;
      }
    }

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          toast.error("CSVファイルが空か、行数が足りません");
          return;
        }

        const headers = rows[0].map(h => h.trim());
        const tsIdx = headers.findIndex(h => h.includes("タイムスタンプ") || h.toLowerCase().includes("timestamp"));
        const nameIdx = headers.findIndex(h => h.includes("スタッフ") || h.toLowerCase().includes("name"));
        const storeIdx = headers.findIndex(h => h.includes("店舗") || h.toLowerCase().includes("store"));
        const typeIdx = headers.findIndex(h => h.includes("出勤") || h.includes("退勤") || h.includes("punch") || h.includes("type"));
        const remarksIdx = headers.findIndex(h => h.includes("備考") || h.toLowerCase().includes("remarks") || h.includes("コメント"));

        if (tsIdx === -1 || nameIdx === -1 || typeIdx === -1) {
          toast.error("必要な列（タイムスタンプ、スタッフ名、出勤or退勤）が見つかりません。ヘッダー行を確認してください。");
          return;
        }

        const groups: Record<string, {
          staffName: string;
          date: string;
          store: string;
          inPunches: string[];
          outPunches: string[];
          remarks: string[];
        }> = {};

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rawTs = row[tsIdx];
          const staffName = row[nameIdx]?.trim();
          const storeName = storeIdx !== -1 ? row[storeIdx]?.trim() || "元町" : "元町";
          const punchType = row[typeIdx]?.trim();
          const remark = remarksIdx !== -1 ? row[remarksIdx]?.trim() : "";

          if (!rawTs || !staffName || !punchType) continue;

          try {
            const datePart = rawTs.split(" ")[0].replace(/\//g, "-");
            const timePart = rawTs.split(" ")[1] || "00:00:00";
            
            // Pad hours, minutes, and seconds to ensure valid ISO 8601 formatting (e.g., 9:54:28 -> 09:54:28)
            const timeParts = timePart.split(":");
            const paddedTime = timeParts.map(part => part.padStart(2, "0")).join(":");
            
            const [y, m, d] = datePart.split("-");
            const formattedDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
            const isoStr = new Date(`${formattedDate}T${paddedTime}`).toISOString();

            const key = `${staffName}_${formattedDate}`;
            if (!groups[key]) {
              groups[key] = {
                staffName,
                date: formattedDate,
                store: storeName.replace("店", ""),
                inPunches: [],
                outPunches: [],
                remarks: []
              };
            }

            if (punchType.includes("出勤")) {
              groups[key].inPunches.push(isoStr);
            } else if (punchType.includes("退勤")) {
              groups[key].outPunches.push(isoStr);
            }
            if (remark) {
              groups[key].remarks.push(remark);
            }
          } catch (err) {
            console.error("Row parsing error:", err, row);
          }
        }

        const preview = Object.values(groups).map((g) => {
          const profileMatch = profiles.find(p => p.name === g.staffName || g.staffName.replace(/\s+/g, "").includes(p.name.replace(/\s+/g, "")));
          const staffId = profileMatch?.id || "unknown";

          const sortedIn = g.inPunches.sort();
          const sortedOut = g.outPunches.sort();

          const rawIn = sortedIn[0] || null;
          const rawOut = sortedOut[sortedOut.length - 1] || null;

          return {
            staffId,
            staffName: g.staffName,
            date: g.date,
            store: g.store,
            rawIn,
            rawOut,
            resolvedInTime: rawIn ? format(new Date(rawIn), "HH:mm") : "",
            resolvedOutTime: rawOut ? format(new Date(rawOut), "HH:mm") : "",
            remarks: g.remarks.join(" / "),
            hasIssue: !rawIn || !rawOut
          };
        });

        setPreviewRecords(preview);
        toast.success(`Googleフォームの打刻データ ${preview.length} 件を読み込みました`);
      }
    });
  };

  const updatePreviewTime = (index: number, type: 'in' | 'out', val: string) => {
    const updated = [...previewRecords];
    if (type === 'in') {
      updated[index].resolvedInTime = val;
    } else {
      updated[index].resolvedOutTime = val;
    }
    updated[index].hasIssue = !updated[index].resolvedInTime || !updated[index].resolvedOutTime;
    setPreviewRecords(updated);
  };

  const handleSaveImport = async () => {
    if (previewRecords.length === 0) return;
    
    const hasUnresolved = previewRecords.some(r => r.hasIssue);
    if (hasUnresolved) {
      if (!confirm("押し忘れなどのエラー（空欄）が残っています。このままインポートしますか？（エラー日は空欄のまま登録されます）")) {
        return;
      }
    }

    setIsImporting(true);
    try {
      const recordsToImport = previewRecords.map((r) => {
        let clock_in: string | null = null;
        let clock_out: string | null = null;
        let effective_clock_in: string | null = null;
        let effective_clock_out: string | null = null;

        if (r.resolvedInTime) {
          const dateObj = new Date(`${r.date}T${r.resolvedInTime}`);
          clock_in = r.rawIn || dateObj.toISOString();
          const roundedTime = applyRounding(clock_in, 'in', actualRoundingRule);
          effective_clock_in = new Date(`${r.date}T${roundedTime}`).toISOString();
        }

        if (r.resolvedOutTime) {
          const dateObj = new Date(`${r.date}T${r.resolvedOutTime}`);
          clock_out = r.rawOut || dateObj.toISOString();
          const roundedTime = applyRounding(clock_out, 'out', actualRoundingRule);
          effective_clock_out = new Date(`${r.date}T${roundedTime}`).toISOString();
        }

        return {
          staff_id: r.staffId,
          staff_name: r.staffName,
          date: r.date,
          clock_in,
          clock_out,
          effective_clock_in,
          effective_clock_out,
          break_minutes: 60,
          status: "normal" as const,
          store: r.store
        };
      });

      const res = await bulkImportAttendanceRecords(recordsToImport);
      if (res.success) {
        toast.success("勤怠データをインポートしました");
        setIsImportOpen(false);
        setPreviewRecords([]);
        loadData();
      } else {
        toast.error("インポートに失敗しました: " + res.error);
      }
    } catch (err: any) {
      toast.error("インポートエラーが発生しました: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addRecordData.staffId || !addRecordData.clockIn || !addRecordData.clockOut) {
      toast.error("スタッフ、出勤時間、退勤時間は必須です");
      return;
    }
    setIsAdding(true);
    try {
      const staff = staffProfiles.find((s: any) => s.id === addRecordData.staffId) || { name: "不明" };
      const dateObjIn = new Date(`${targetDateStr}T${addRecordData.clockIn}`);
      const dateObjOut = new Date(`${targetDateStr}T${addRecordData.clockOut}`);
      
      const roundedIn = applyRounding(dateObjIn.toISOString(), 'in', actualRoundingRule);
      const roundedOut = applyRounding(dateObjOut.toISOString(), 'out', actualRoundingRule);
      
      const effIn = new Date(`${targetDateStr}T${roundedIn}`).toISOString();
      const effOut = new Date(`${targetDateStr}T${roundedOut}`).toISOString();

      const newRecord = {
        staff_id: addRecordData.staffId,
        staff_name: staff.name,
        date: targetDateStr,
        clock_in: dateObjIn.toISOString(),
        clock_out: dateObjOut.toISOString(),
        effective_clock_in: effIn,
        effective_clock_out: effOut,
        break_minutes: addRecordData.breakMinutes,
        status: addRecordData.status as any,
        store: addRecordData.store,
        storeId: addRecordData.storeId,
      };

      const res = await bulkImportAttendanceRecords([newRecord]);
      if (res.success) {
        toast.success("勤怠記録を追加しました");
        setIsAddDialogOpen(false);
        setAddRecordData({ staffId: "", clockIn: "", clockOut: "", store: "", storeId: "", breakMinutes: 60, status: "normal" });
        loadData();
      } else {
        toast.error("追加に失敗しました: " + res.error);
      }
    } catch (error: any) {
      toast.error("エラーが発生しました");
    } finally {
      setIsAdding(false);
    }
  };

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

    if (staffProfiles.length === 0) {
      const resProfiles = await getAllStaffProfiles();
      if (resProfiles.success) setStaffProfiles(resProfiles.data || []);
    }

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
      store: editingRecord.store,
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

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!confirm(`${staffName}さんのこの日の勤怠記録をすべて削除してもよろしいですか？`)) return;
    
    const recordsToDelete = attendanceRecords.filter(r => r.staff_id === staffId);
    if (recordsToDelete.length === 0) return;
    
    const res = await deleteAttendanceRecords(recordsToDelete.map(r => r.id));
    if (res.success) {
      toast.success("削除しました");
      loadData();
    } else {
      toast.error("削除に失敗しました: " + res.error);
    }
  };

  return (
    <AuthGuard requireRole="staff" requireFeature="attendance">

    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">勤怠管理</h1>
          <p className="text-slate-500 mt-1 text-sm">スタッフの日々の出退勤打刻実績と、有効時間の修正を行います。</p>
        </div>
        {(isAdmin || isManager) && (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9" 
                onClick={() => setTargetDateStr(format(subDays(parseISO(targetDateStr), 1), "yyyy-MM-dd"))}
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input 
                  type="date" 
                  value={targetDateStr}
                  onChange={(e) => setTargetDateStr(e.target.value)}
                  className="pl-9 pr-2 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-700 bg-slate-50 h-9 w-[170px]"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9" 
                onClick={() => setTargetDateStr(format(addDays(parseISO(targetDateStr), 1), "yyyy-MM-dd"))}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <Button className="h-9 gap-2 w-full sm:w-auto" onClick={() => loadData()}>
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
            <div className="flex gap-2">
              {(isAdmin || isManager) && (
                <>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white hover:text-white font-bold border-none gap-2 shadow-sm h-9"
                      onClick={() => {
                        if (availableStoreObjects.length > 0) {
                          setAddRecordData({ ...addRecordData, store: availableStoreObjects[0].name, storeId: availableStoreObjects[0].id });
                        }
                      }}
                    >
                      <Plus size={14} />
                      勤怠を手動追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        打刻を手動追加
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleManualAdd} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">スタッフ</label>
                        <select 
                          value={addRecordData.staffId}
                          onChange={(e) => setAddRecordData({...addRecordData, staffId: e.target.value})}
                          className="w-full h-10 px-3 rounded-lg bg-slate-50 border-slate-200 text-sm font-bold"
                          required
                        >
                          <option value="">選択してください</option>
                          {staffProfiles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">出勤時間</label>
                          <Input type="time" required value={addRecordData.clockIn} onChange={(e) => setAddRecordData({...addRecordData, clockIn: e.target.value})} className="h-10 bg-slate-50 font-mono font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">退勤時間</label>
                          <Input type="time" required value={addRecordData.clockOut} onChange={(e) => setAddRecordData({...addRecordData, clockOut: e.target.value})} className="h-10 bg-slate-50 font-mono font-bold" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">休憩時間 (分)</label>
                          <Input type="number" required value={addRecordData.breakMinutes} onChange={(e) => setAddRecordData({...addRecordData, breakMinutes: parseInt(e.target.value)||0})} className="h-10 bg-slate-50 font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">状態</label>
                          <select value={addRecordData.status} onChange={(e) => setAddRecordData({...addRecordData, status: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-slate-50 border-slate-200 text-sm font-bold">
                            <option value="normal">通常出勤</option>
                            <option value="leave">有給休暇</option>
                            <option value="absence">欠勤</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">出勤店舗</label>
                        <select 
                          value={addRecordData.storeId || ""} 
                          onChange={(e) => {
                            const selected = availableStoreObjects.find(s => s.id === e.target.value);
                            if (selected) {
                              setAddRecordData({...addRecordData, storeId: selected.id, store: selected.name});
                            }
                          }} 
                          className="w-full h-10 px-3 rounded-lg bg-slate-50 border-slate-200 text-sm font-bold"
                          required
                        >
                          <option value="" disabled>店舗を選択</option>
                          {availableStoreObjects.map(storeObj => (
                            <option key={storeObj.id} value={storeObj.id}>{storeObj.name}</option>
                          ))}
                        </select>
                        {availableStoreObjects.length === 0 && (
                          <p className="text-[10px] text-rose-500 mt-1">※登録済みの有効な店舗がありません。店舗マスタから追加してください。</p>
                        )}
                      </div>
                      <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)}>キャンセル</Button>
                        <Button type="submit" disabled={isAdding} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">
                          {isAdding ? "追加中..." : "追加する"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
<Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white hover:text-white font-bold border-none gap-2 shadow-sm h-9"
                    >
                      <Upload size={14} />
                      Googleフォーム/CSVインポート
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <FileText className="text-emerald-500 w-5 h-5" />
                        Googleフォーム打刻データのインポート
                      </DialogTitle>
                      <p className="text-xs text-slate-500">
                        Googleフォーム回答のCSVファイルをアップロードし、出退勤ペアの作成・丸め処理・押し忘れ調整を行います。
                      </p>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                      {/* Settings and File Upload */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                        <div className="space-y-2">
                          <label className="font-bold text-slate-600 block">① GoogleフォームCSVを選択</label>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVUpload}
                            className="w-full text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 bg-white p-1 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Preview Table */}
                      {previewRecords.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                              📊 取り込みプレビュー ({previewRecords.length} 件)
                            </h3>
                            {previewRecords.some(r => r.hasIssue) && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                                <ShieldAlert size={12} className="text-amber-500" />
                                押し忘れの疑い（未入力）があります
                              </span>
                            )}
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                            <Table className="min-w-[800px]">
                              <TableHeader className="bg-slate-50">
                                 <TableRow>
                                  <TableHead className="py-2.5 font-bold text-slate-600">日付</TableHead>
                                  <TableHead className="py-2.5 font-bold text-slate-600">スタッフ名</TableHead>
                                  <TableHead className="py-2.5 font-bold text-slate-600">出勤場所</TableHead>
                                  <TableHead className="py-2.5 font-bold text-slate-600">出勤打刻</TableHead>
                                  <TableHead className="py-2.5 font-bold text-slate-600">退勤打刻</TableHead>
                                  <TableHead className="py-2.5 font-bold text-slate-600">丸め後時間</TableHead>
                                  <TableHead className="py-2.5 font-bold text-slate-600">備考・申し送り</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewRecords.map((row, index) => {
                                  const roundedIn = applyRounding(row.rawIn, 'in', actualRoundingRule);
                                  const roundedOut = applyRounding(row.rawOut, 'out', actualRoundingRule);

                                  return (
                                    <TableRow key={index} className={row.hasIssue ? "bg-amber-50/30 hover:bg-amber-50/50" : ""}>
                                      <TableCell className="py-2.5 font-mono text-[11px] text-slate-500 font-bold">{row.date}</TableCell>
                                      <TableCell className="py-2.5 font-bold text-slate-800">
                                        {row.staffName}
                                        {row.staffId === "unknown" && (
                                          <span className="block text-[9px] text-rose-500 font-bold">※マスタ未一致</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-2.5">
                                        <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-black">
                                          {row.store || "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-2.5">
                                        <div className="space-y-1">
                                          <Input
                                            type="text"
                                            placeholder="09:00"
                                            value={row.resolvedInTime}
                                            onChange={(e) => updatePreviewTime(index, 'in', e.target.value)}
                                            className={`h-7 w-20 text-[11px] font-mono font-bold text-center px-1 rounded-md ${
                                              !row.resolvedInTime ? 'border-amber-400 bg-amber-50 focus-visible:ring-amber-500' : 'border-slate-200'
                                            }`}
                                          />
                                          {!row.rawIn && row.resolvedInTime && (
                                            <span className="block text-[8px] text-blue-500 font-bold scale-90 -ml-1">※手動補完</span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-2.5">
                                        <div className="space-y-1">
                                          <Input
                                            type="text"
                                            placeholder="18:00"
                                            value={row.resolvedOutTime}
                                            onChange={(e) => updatePreviewTime(index, 'out', e.target.value)}
                                            className={`h-7 w-20 text-[11px] font-mono font-bold text-center px-1 rounded-md ${
                                              !row.resolvedOutTime ? 'border-amber-400 bg-amber-50 focus-visible:ring-amber-500' : 'border-slate-200'
                                            }`}
                                          />
                                          {!row.rawOut && row.resolvedOutTime && (
                                            <span className="block text-[8px] text-blue-500 font-bold scale-90 -ml-1">※手動補完</span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-2.5 font-mono text-[11px] text-slate-700 font-extrabold">
                                        {row.resolvedInTime && row.resolvedOutTime ? (
                                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                                            {roundedIn || "--"} - {roundedOut || "--"}
                                          </span>
                                        ) : (
                                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                            打刻漏れあり
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-2.5 max-w-[200px] truncate text-slate-500 text-[11px]" title={row.remarks}>
                                        {row.remarks || "-"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
                        <p className="text-[10px] text-slate-400 leading-relaxed max-w-[50%]">
                          ※「出勤」と「退勤」がタイムスタンプ日付ごとにペア化されます。未一致は空欄になりますので、備考の申し送りを参考に手動補完して保存してください。
                        </p>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" onClick={() => setIsImportOpen(false)}>
                            キャンセル
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveImport}
                            disabled={previewRecords.length === 0 || isImporting}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8"
                          >
                            {isImporting ? "インポート中..." : "取り込みを保存"}
                          </Button>
                        </div>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
                </>
              )}
              <AttendanceCSVButton 
                date={targetDateStr} 
                isSaaS={profile?.companyId !== "company_default" && profile?.companyId !== undefined} 
              />
            </div>
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
                  acc[record.staff_id].break_minutes = Math.max(acc[record.staff_id].break_minutes, record.break_minutes);
                  acc[record.staff_id]._allRecords.push(record);
                                    // Keep earliest clock_in and latest clock_out for display
                  const currentIn = acc[record.staff_id].clock_in;
                  if (record.clock_in && (!currentIn || new Date(record.clock_in) < new Date(currentIn))) {
                    acc[record.staff_id].clock_in = record.clock_in;
                  }
                  
                  const currentOut = acc[record.staff_id].clock_out;
                  if (record.clock_out && (!currentOut || new Date(record.clock_out) > new Date(currentOut))) {
                    acc[record.staff_id].clock_out = record.clock_out;
                  }
                  
                  // Same for effective
                  const currentEffIn = acc[record.staff_id].effective_clock_in;
                  if (record.effective_clock_in && (!currentEffIn || new Date(record.effective_clock_in) < new Date(currentEffIn))) {
                    acc[record.staff_id].effective_clock_in = record.effective_clock_in;
                  }
                  
                  const currentEffOut = acc[record.staff_id].effective_clock_out;
                  if (record.effective_clock_out && (!currentEffOut || new Date(record.effective_clock_out) > new Date(currentEffOut))) {
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
                
                const storeDisplay = Array.from(new Set(records.flatMap(r => (r.store || "").split(" / ")).map(s => s.trim()).filter(Boolean))).join(" / ") || "未指定";

                const clockInTime = record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "--:--";
                const clockOutTime = record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "--:--";
                
                const effInTime = record.effective_clock_in ? format(new Date(record.effective_clock_in), "HH:mm") : clockInTime;
                const effOutTime = record.effective_clock_out ? format(new Date(record.effective_clock_out), "HH:mm") : clockOutTime;
                
                const cin = record.effective_clock_in || record.clock_in;
                const cout = record.effective_clock_out || record.clock_out;

                let workingHoursText = "--";
                if (effInTime !== "--:--" && effOutTime !== "--:--") {
                  const [inH, inM] = effInTime.split(':').map(Number);
                  const [outH, outM] = effOutTime.split(':').map(Number);
                  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - record.break_minutes;
                  if (totalMinutes > 0) {
                    const hrs = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    workingHoursText = `${hrs}時間${mins}分`;
                  }
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
                        {(record as any).is_auto_clock_out && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded ml-1">自動退勤</span>}
                      </div>
                    </TableCell>
                    {(isAdmin || isManager) && <TableCell>{record.break_minutes} 分</TableCell>}
                    <TableCell className="font-medium text-slate-700">{workingHoursText}</TableCell>
                    <TableCell>
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {storeDisplay}
                      </span>
                    </TableCell>
                    {(isAdmin || isManager) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-1 text-slate-500 hover:text-blue-600"
                            onClick={() => {
                              const latestRecord = records[records.length - 1];
                              setEditingRecord({
                                ...latestRecord,
                                effective_clock_in: record.effective_clock_in || record.clock_in,
                                effective_clock_out: record.effective_clock_out || record.clock_out,
                                break_minutes: record.break_minutes
                              });
                              setEditingGroup(records);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit2 size={16} />
                            <span>編集</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(record.staff_id, record.staff_name)}
                          >
                            <Trash2 size={16} />
                            <span>削除</span>
                          </Button>
                        </div>
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

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">有効出勤時間</label>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={editingRecord?.effective_clock_in ? format(new Date(editingRecord.effective_clock_in), "yyyy-MM-dd") : ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const timeStr = editingRecord?.effective_clock_in ? format(new Date(editingRecord.effective_clock_in), "HH:mm") : "00:00";
                        setEditingRecord({...editingRecord!, effective_clock_in: new Date(`${val}T${timeStr}`).toISOString()});
                      }
                    }}
                    className="h-10 rounded-lg bg-slate-50 border-none font-bold text-xs flex-1"
                  />
                  <Input 
                    type="time" 
                    step="1800"
                    value={editingRecord?.effective_clock_in ? format(new Date(editingRecord.effective_clock_in), "HH:mm") : ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const dateStr = editingRecord?.effective_clock_in ? format(new Date(editingRecord.effective_clock_in), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                        setEditingRecord({...editingRecord!, effective_clock_in: new Date(`${dateStr}T${val}`).toISOString()});
                      }
                    }}
                    className="h-10 rounded-lg bg-slate-50 border-none font-bold text-xs w-24"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">有効退勤時間</label>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={editingRecord?.effective_clock_out ? format(new Date(editingRecord.effective_clock_out), "yyyy-MM-dd") : ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const timeStr = editingRecord?.effective_clock_out ? format(new Date(editingRecord.effective_clock_out), "HH:mm") : "00:00";
                        setEditingRecord({...editingRecord!, effective_clock_out: new Date(`${val}T${timeStr}`).toISOString()});
                      }
                    }}
                    className="h-10 rounded-lg bg-slate-50 border-none font-bold text-xs flex-1"
                  />
                  <Input 
                    type="time" 
                    step="1800"
                    value={editingRecord?.effective_clock_out ? format(new Date(editingRecord.effective_clock_out), "HH:mm") : ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const dateStr = editingRecord?.effective_clock_out ? format(new Date(editingRecord.effective_clock_out), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                        setEditingRecord({...editingRecord!, effective_clock_out: new Date(`${dateStr}T${val}`).toISOString()});
                      }
                    }}
                    className="h-10 rounded-lg bg-slate-50 border-none font-bold text-xs w-24"
                  />
                </div>
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
            
            <div className="space-y-4">
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">出勤店舗</label>
                <div className="flex gap-2">
                  {["元町", "神戸", "六甲"].map(store => {
                    const isSelected = editingRecord?.store?.includes(store);
                    return (
                      <button
                        key={store}
                        type="button"
                        className={`flex-1 h-10 rounded-lg text-sm font-bold border transition-colors ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        onClick={() => {
                          const currentStores = editingRecord?.store ? editingRecord.store.split(" / ").filter(Boolean) : [];
                          let newStores;
                          if (isSelected) {
                            newStores = currentStores.filter(s => s !== store);
                          } else {
                            newStores = [...currentStores, store];
                          }
                          setEditingRecord({...editingRecord!, store: newStores.length > 0 ? newStores.join(" / ") : ""});
                        }}
                      >
                        {store}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {editingGroup.length > 0 && (
              <div className="space-y-2 mt-6 pt-4 border-t border-slate-100">
                <label className="text-[10px] font-black text-rose-500 uppercase ml-1">個別打刻の削除（間違えて打刻した場合など）</label>
                <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-2 space-y-1">
                  {editingGroup.map((r) => {
                     const inT = r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "--:--";
                     const outT = r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "--:--";
                     return (
                       <div key={r.id} className="flex justify-between items-center text-sm px-3 py-2 bg-white rounded shadow-sm border border-rose-100">
                         <span className="font-mono font-bold text-slate-600">{inT} - {outT}</span>
                         <Button 
                           type="button" 
                           variant="ghost" 
                           size="sm" 
                           className="h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                           onClick={async () => {
                              if (!confirm(`この打刻データ（${inT} - ${outT}）を削除しますか？`)) return;
                              const res = await deleteAttendanceRecords([r.id]);
                              if (res.success) {
                                toast.success("削除しました");
                                setEditingGroup(prev => prev.filter(p => p.id !== r.id));
                                loadData();
                              } else {
                                toast.error("削除に失敗しました");
                              }
                           }}
                         >
                           <Trash2 size={14} className="mr-1" />
                           <span className="text-xs font-bold">削除</span>
                         </Button>
                       </div>
                     )
                  })}
                </div>
              </div>
            )}

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
