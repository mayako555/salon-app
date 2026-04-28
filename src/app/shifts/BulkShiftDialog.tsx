"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Check, Users } from "lucide-react";
import { ShiftType, StoreLocation, ShiftSegment, bulkSaveShifts } from "./actions";
import { StaffProfile } from "@/app/staff/actions";
import { useRouter } from "next/navigation";

type BulkShiftDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffProfile[];
};

export default function BulkShiftDialog({ isOpen, onClose, staffList }: BulkShiftDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  });
  const [type, setType] = useState<ShiftType>("work");
  const [segments, setSegments] = useState<ShiftSegment[]>([
    { start_time: "10:00", end_time: "19:00", store: "神戸" }
  ]);
  const [activeDaysOfWeek, setActiveDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri

  const toggleDayOfWeek = (day: number) => {
    setActiveDaysOfWeek(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const toggleStaff = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllStaff = () => {
    if (selectedStaffIds.length === staffList.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(staffList.map(s => s.id));
    }
  };

  const addSegment = () => {
    setSegments(prev => [...prev, { start_time: "10:00", end_time: "19:00", store: "神戸" }]);
  };

  const removeSegment = (index: number) => {
    setSegments(prev => prev.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, field: keyof ShiftSegment, value: string) => {
    setSegments(prev => prev.map((seg, i) => i === index ? { ...seg, [field]: value } : seg));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffIds.length === 0) {
      alert("スタッフを選択してください。");
      return;
    }
    
    setLoading(true);
    try {
      const result = await bulkSaveShifts({
        staffIds: selectedStaffIds,
        dateRange,
        type,
        segments,
        activeDaysOfWeek
      });
      
      if (result.success) {
        onClose();
        router.refresh();
      } else {
        alert("エラー: " + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="text-slate-500" />
            シフト一括登録
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Staff Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">対象スタッフ</label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={toggleAllStaff}
                className="text-xs h-7"
              >
                {selectedStaffIds.length === staffList.length ? "解除" : "全選択"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto p-1 border rounded-md">
              {staffList.map(staff => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => toggleStaff(staff.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-all ${
                    selectedStaffIds.includes(staff.id)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedStaffIds.includes(staff.id) ? "border-white bg-white/20" : "border-slate-300"
                  }`}>
                    {selectedStaffIds.includes(staff.id) && <Check size={10} />}
                  </div>
                  {staff.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">開始日</label>
              <Input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">終了日</label>
              <Input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">対象曜日</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "月", value: 1 },
                { label: "火", value: 2 },
                { label: "水", value: 3 },
                { label: "木", value: 4 },
                { label: "金", value: 5 },
                { label: "土", value: 6, color: "text-blue-600" },
                { label: "日", value: 0, color: "text-rose-600" }
              ].map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDayOfWeek(day.value)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border ${
                    activeDaysOfWeek.includes(day.value) 
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                      : `bg-white border-slate-200 hover:border-slate-400 ${day.color || "text-slate-600"}`
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {activeDaysOfWeek.length === 0 && (
              <p className="text-xs text-rose-500 font-bold mt-1">※少なくとも1つの曜日を選択してください</p>
            )}
          </div>

          {/* Shift Type */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">シフト種別</label>
            <div className="flex flex-wrap gap-2">
              {(["work", "holiday", "paid_leave"] as ShiftType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all border ${
                    type === t 
                      ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {t === 'work' ? '勤務' : t === 'holiday' ? '公休' : '有休'}
                </button>
              ))}
            </div>
          </div>

          {/* Segments (only for Work) */}
          {type === "work" && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-800">勤務パターン</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addSegment}
                  className="h-7 text-xs"
                >
                  <Plus size={14} className="mr-1" /> 追加
                </Button>
              </div>
              
              <div className="space-y-3">
                {segments.map((seg, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm relative group">
                    <button 
                      type="button"
                      onClick={() => removeSegment(idx)}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">開始</span>
                        <Input 
                          type="time" 
                          value={seg.start_time}
                          onChange={(e) => updateSegment(idx, "start_time", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">終了</span>
                        <Input 
                          type="time" 
                          value={seg.end_time}
                          onChange={(e) => updateSegment(idx, "end_time", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">勤務店舗</span>
                      <select 
                        className="w-full h-8 px-2 rounded-md border border-slate-200 bg-white text-sm"
                        value={seg.store}
                        onChange={(e) => updateSegment(idx, "store", e.target.value as StoreLocation)}
                      >
                        <option value="神戸">神戸</option>
                        <option value="元町">元町</option>
                        <option value="六甲">六甲</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading || activeDaysOfWeek.length === 0} className="px-8 bg-slate-900">
              {loading ? "登録中..." : "一括登録を実行"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
