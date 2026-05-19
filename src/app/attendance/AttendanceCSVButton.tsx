"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AttendanceRecord } from "./actions";
import { format, parseISO, isBefore, isAfter, setHours, setMinutes, startOfMinute } from "date-fns";
import { ShiftRecord } from "@/app/shifts/actions";

export default function AttendanceCSVButton({ 
  records, 
  date,
  shifts
}: { 
  records: AttendanceRecord[], 
  date: string,
  shifts: ShiftRecord[]
}) {
  
  const roundTime = (timeStr: string | null, type: 'in' | 'out', shiftTime?: string) => {
    if (!timeStr) return "";
    let dateObj = parseISO(timeStr);
    
    // Add 30 minutes delay for clock-in (preparation time outside working hours)
    if (type === 'in') {
      dateObj = new Date(dateObj.getTime() + 30 * 60 * 1000);
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

  const calculateHours = (inStr: string | null, outStr: string | null, breakMins: number = 0, staffId: string) => {
    if (!inStr || !outStr) return "0.00";
    
    // このスタッフのシフト情報を取得
    const staffShift = shifts.find(s => s.staff_id === staffId);
    const shiftStart = staffShift?.segments?.[0]?.start_time;
    const shiftEnd = staffShift?.segments?.[staffShift.segments.length - 1]?.end_time;

    // 丸め・キャップ適用後の時間で計算
    const rIn = roundTime(inStr, 'in', shiftStart);
    const rOut = roundTime(outStr, 'out', shiftEnd);
    
    const [inH, inM] = rIn.split(":").map(Number);
    const [outH, outM] = rOut.split(":").map(Number);
    
    const startMins = inH * 60 + inM;
    const endMins = outH * 60 + outM;
    
    // 休憩時間を引く
    const diff = endMins - startMins - breakMins;
    return diff > 0 ? (diff / 60).toFixed(2) : "0.00";
  };

  const handleExport = () => {
    if (records.length === 0) return;

    const headers = [
      "日付",
      "スタッフ名",
      "打刻(出勤)",
      "打刻(退勤)",
      "丸め後(出勤)",
      "丸め後(退勤)",
      "実働時間(h)",
      "休憩(分)",
      "状態"
    ];

    const rows = records.map(r => {
      const staffShift = shifts.find(s => s.staff_id === r.staff_id);
      const shiftStart = staffShift?.segments?.[0]?.start_time;
      const shiftEnd = staffShift?.segments?.[staffShift.segments.length - 1]?.end_time;

      return [
        r.date,
        r.staff_name,
        r.clock_in ? format(parseISO(r.clock_in), "HH:mm") : "",
        r.clock_out ? format(parseISO(r.clock_out), "HH:mm") : "",
        roundTime(r.clock_in, 'in', shiftStart),
        roundTime(r.clock_out, 'out', shiftEnd),
        calculateHours(r.clock_in, r.clock_out, r.break_minutes, r.staff_id),
        r.break_minutes,
        r.status === 'normal' ? '出勤' : r.status === 'leave' ? '有給' : '欠勤'
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={records.length === 0}
      className="bg-white gap-2 font-bold text-slate-600 border-slate-200"
    >
      <Download size={14} />
      CSV出力(30分丸め)
    </Button>
  );
}
