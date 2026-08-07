"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format, parseISO, isBefore, isAfter } from "date-fns";
import { getMonthlyAttendance } from "./actions";
import { getMonthlyShifts } from "@/app/shifts/actions";

function normalizeStaffName(name: string) {
  if (!name) return "";
  return name.replace(/[\s　]+/g, "")
    .replace(/凜/g, "凛")
    .replace(/邊/g, "辺")
    .replace(/齊|齋/g, "斉")
    .replace(/澤/g, "沢")
    .replace(/濱/g, "浜")
    .replace(/嶋/g, "島")
    .replace(/﨑|嵜/g, "崎")
    .replace(/髙/g, "高");
}

export default function AttendanceCSVButton({ 
  date,
  isSaaS = false,
}: { 
  date: string,
  isSaaS?: boolean,
}) {
  const [isExporting, setIsExporting] = useState(false);
  
  const roundTime = (timeStr: string | null, type: 'in' | 'out', shiftTime?: string) => {
    if (!timeStr) return "";
    let dateObj = parseISO(timeStr);
    
    // SaaSの場合は丸めなし
    if (isSaaS) {
      return format(dateObj, "HH:mm");
    }
    
    // シフト時間によるキャップ処理 (所定労働時間内のみ計算)
    if (shiftTime) {
      const [sh, sm] = shiftTime.split(":").map(Number);
      const shiftDate = new Date(dateObj);
      shiftDate.setHours(sh, sm, 0, 0);

      if (type === 'in' && isBefore(dateObj, shiftDate)) {
        // 出勤: シフト開始より前ならシフト開始時間に合わせる
        dateObj = shiftDate;
      } else if (type === 'out' && isAfter(dateObj, shiftDate)) {
        // 退勤: シフト終了より後ならシフト終了時間に合わせる
        dateObj = shiftDate;
      }
    }

    // 基本ルール: 30分単位で丸める
    const mins = dateObj.getMinutes();
    const roundedDate = new Date(dateObj);
    
    if (type === 'in') {
      const remainder = mins % 30;
      if (remainder > 0) {
        roundedDate.setMinutes(mins + (30 - remainder));
      }
    } else {
      roundedDate.setMinutes(mins - (mins % 30));
    }
    
    roundedDate.setSeconds(0);
    roundedDate.setMilliseconds(0);
    return format(roundedDate, "HH:mm");
  };

  const calculateHours = (inStr: string | null, outStr: string | null, breakMins: number = 0, shiftTimeStart?: string, shiftTimeEnd?: string) => {
    if (!inStr || !outStr) return "0.00";
    
    const rIn = roundTime(inStr, 'in', shiftTimeStart);
    const rOut = roundTime(outStr, 'out', shiftTimeEnd);
    
    const [inH, inM] = rIn.split(":").map(Number);
    const [outH, outM] = rOut.split(":").map(Number);
    
    const startMins = inH * 60 + inM;
    const endMins = outH * 60 + outM;
    
    let diff = endMins - startMins;
    if (diff < 0) {
      diff += 24 * 60; // Next day
    }
    diff -= breakMins;
    return diff > 0 ? (diff / 60).toFixed(2) : "0.00";
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [year, month] = date.split("-").map(Number);
      const [records, shifts] = await Promise.all([
        getMonthlyAttendance(year, month),
        getMonthlyShifts(year, month)
      ]);

      if (records.length === 0) {
        alert("この月の打刻データがありません");
        setIsExporting(false);
        return;
      }

      const headers = [
        "スタッフ名",
        "日付",
        "有効時間 (給与計算用)",
        "休憩時間(分)",
        "実労働時間(h)",
        "店舗",
        "状態"
      ];

      // スタッフID＞日付の順にソートする (IDがない場合は名前でフォールバック)
      const sortedRecords = [...records].sort((a, b) => {
        const idA = a.staff_id || normalizeStaffName(a.staff_name);
        const idB = b.staff_id || normalizeStaffName(b.staff_name);
        if (idA !== idB) {
          return idA.localeCompare(idB);
        }
        return a.date.localeCompare(b.date);
      });

      const rows = sortedRecords.map(r => {
        // Find shift for this staff on this specific date
        const staffShift = shifts.find(s => s.staff_id === r.staff_id && s.date === r.date);
        const shiftStart = staffShift?.segments?.[0]?.start_time;
        const shiftEnd = staffShift?.segments?.[staffShift.segments.length - 1]?.end_time;

        const clockInStr = r.clock_in ? format(parseISO(r.clock_in), "HH:mm") : "";
        const clockOutStr = r.clock_out ? format(parseISO(r.clock_out), "HH:mm") : "";
        const roundedInStr = roundTime(r.clock_in, 'in', shiftStart);
        const roundedOutStr = roundTime(r.clock_out, 'out', shiftEnd);
        const hours = calculateHours(r.clock_in, r.clock_out, r.break_minutes, shiftStart, shiftEnd);
        const statusStr = r.status === 'normal' ? '出勤' : r.status === 'leave' ? '有給' : '欠勤';

        const effectiveTimeStr = roundedInStr || roundedOutStr ? `${roundedInStr} - ${roundedOutStr}` : "";

        return [
          r.staff_name,
          r.date,
          effectiveTimeStr,
          r.break_minutes,
          hours,
          r.store || "",
          statusStr
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance_${year}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("CSV出力に失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={isExporting}
      className="bg-white gap-2 font-bold text-slate-600 border-slate-200"
    >
      {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
      {isSaaS ? "月間CSV出力(スタッフ別・時間通り)" : "月間CSV出力(30分丸め)"}
    </Button>
  );
}
