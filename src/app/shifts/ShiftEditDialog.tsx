"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X } from "lucide-react";
import { ShiftRecord, ShiftType, StoreLocation, ShiftSegment, saveShift, deleteShift, updateHolidayRequestStatus } from "./actions";
import { StaffProfile } from "@/app/staff/actions";
import { useRouter } from "next/navigation";

type ShiftEditDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  shift?: ShiftRecord;
  staffList: StaffProfile[];
  initialDate?: string;
};

export default function ShiftEditDialog({ 
  isOpen, 
  onClose, 
  shift, 
  staffList,
  initialDate 
}: ShiftEditDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<ShiftRecord, "id"> & { id?: string }>({
    staff_id: "",
    staff_name: "",
    date: initialDate || new Date().toISOString().split("T")[0],
    type: "work",
    segments: [{ start_time: "10:00", end_time: "19:00", store: "神戸" }]
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        id: shift.id,
        staff_id: shift.staff_id,
        staff_name: shift.staff_name,
        date: shift.date,
        type: shift.type,
        segments: shift.segments || [],
        request_id: shift.request_id
      });
    } else if (initialDate) {
      setFormData(prev => ({ ...prev, date: initialDate }));
    }
  }, [shift, initialDate]);

  const handleStaffChange = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
      setFormData(prev => ({
        ...prev,
        staff_id: staff.id,
        staff_name: staff.name
      }));
    }
  };

  const addSegment = () => {
    setFormData(prev => ({
      ...prev,
      segments: [...(prev.segments || []), { start_time: "10:00", end_time: "19:00", store: "神戸" }]
    }));
  };

  const removeSegment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      segments: prev.segments?.filter((_, i) => i !== index)
    }));
  };

  const updateSegment = (index: number, field: keyof ShiftSegment, value: string) => {
    setFormData(prev => ({
      ...prev,
      segments: prev.segments?.map((seg, i) => i === index ? { ...seg, [field]: value } : seg)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await saveShift(formData);
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

  const handleApprove = async () => {
    if (!formData.request_id) return;
    setLoading(true);
    try {
      const result = await updateHolidayRequestStatus(formData.request_id, "approved");
      if (result.success) {
        onClose();
        router.refresh();
      } else {
        alert("承認に失敗しました: " + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!formData.request_id) return;
    if (!confirm("この希望休申請を却下してもよろしいですか？（シフトからも削除されます）")) return;
    
    setLoading(true);
    try {
      const result = await updateHolidayRequestStatus(formData.request_id, "rejected");
      if (result.success) {
        onClose();
        router.refresh();
      } else {
        alert("却下に失敗しました: " + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    if (!confirm("このシフトを削除してもよろしいですか？")) return;

    setLoading(true);
    try {
      const result = await deleteShift(formData.id);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{shift ? "シフト編集" : "新規シフト登録"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">スタッフ</label>
            <select 
              className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
              value={formData.staff_id}
              onChange={(e) => handleStaffChange(e.target.value)}
              required
              disabled={!!shift}
            >
              <option value="">選択してください</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">日付</label>
            <Input 
              type="date" 
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">種類</label>
            <div className="flex flex-wrap gap-2">
              {(["work", "holiday", "paid_leave", "requested_holiday", "requested_paid_leave"] as ShiftType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    formData.type === type 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {type === 'work' ? '勤務' : type === 'holiday' ? '公休' : type === 'paid_leave' ? '有休' : type === 'requested_holiday' ? '希望休' : '有給申請'}
                </button>
              ))}
            </div>
          </div>

          {formData.type === "work" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">時間・店舗</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addSegment}
                  className="h-7 px-2 text-[10px]"
                >
                  <Plus size={12} className="mr-1" /> 追加
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {formData.segments?.map((seg, idx) => (
                  <div key={idx} className="p-3 border border-slate-100 rounded-lg bg-slate-50 relative group">
                    <button 
                      type="button"
                      onClick={() => removeSegment(idx)}
                      className="absolute -top-2 -right-2 bg-white border-2 border-slate-200 text-slate-500 hover:text-rose-500 rounded-full p-1.5 shadow-md z-10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">開始</label>
                        <Input 
                          type="time" 
                          value={seg.start_time}
                          onChange={(e) => updateSegment(idx, "start_time", e.target.value)}
                          className="h-8 text-xs px-2"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">終了</label>
                        <Input 
                          type="time" 
                          value={seg.end_time}
                          onChange={(e) => updateSegment(idx, "end_time", e.target.value)}
                          className="h-8 text-xs px-2"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">店舗</label>
                      <select 
                        className="w-full h-8 px-2 rounded-md border border-slate-200 bg-white text-xs"
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
                {(!formData.segments || formData.segments.length === 0) && (
                  <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                    勤務時間が設定されていません
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            {(formData.type === "requested_holiday" || formData.type === "requested_paid_leave") && formData.request_id ? (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  却下する
                </Button>
                <Button 
                  type="button" 
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  承認する
                </Button>
              </div>
            ) : shift ? (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleDelete}
                disabled={loading}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Trash2 size={16} className="mr-2" />
                削除
              </Button>
            ) : <div />}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none">
                キャンセル
              </Button>
              {(!formData.request_id || (formData.type !== "requested_holiday" && formData.type !== "requested_paid_leave")) && (
                <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
                  {loading ? "保存中..." : "保存"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
