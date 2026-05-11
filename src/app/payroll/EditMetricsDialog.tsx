"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit3, Clock, Calendar, Save, Loader2 } from "lucide-react";
import { MonthlyStatement, updateStatementMetrics } from "./actions";

export default function EditMetricsDialog({ stmt, onUpdate }: { stmt: MonthlyStatement, onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hours, setHours] = useState(stmt.details.metrics?.worked_hours?.toString() || "0");
  const [days, setDays] = useState(stmt.details.metrics?.worked_days?.toString() || "0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await updateStatementMetrics(stmt.id, {
        worked_hours: parseFloat(hours),
        worked_days: parseInt(days)
      });
      
      if (res.success) {
        setIsOpen(false);
        onUpdate();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("更新中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
          <Edit3 size={14} />
          <span className="sr-only">勤怠編集</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            勤怠データの直接編集
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              タイムカード連携前や、データの修正が必要な場合に直接入力してください。
              時給契約のスタッフの場合、入力した時間に基づいて基本給が再計算されます。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                出勤日数
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={days} 
                  onChange={e => setDays(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-lg"
                />
                <span className="absolute right-3 top-2.5 text-sm font-bold text-slate-400">日</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                労働時間
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  value={hours} 
                  onChange={e => setHours(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-lg"
                />
                <span className="absolute right-3 top-2.5 text-sm font-bold text-slate-400">時間</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSubmitting ? "保存中..." : "変更を保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
