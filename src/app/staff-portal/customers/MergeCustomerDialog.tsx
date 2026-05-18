"use client";

import { useState, useEffect } from "react";
import { Customer, mergeCustomers } from "@/lib/customers";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRightLeft, User, Phone, Tag, Calendar } from "lucide-react";
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MergeCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomers: Customer[];
  onSuccess: () => void;
}

export default function MergeCustomerDialog({ isOpen, onClose, selectedCustomers, onSuccess }: MergeCustomerDialogProps) {
  const [masterIndex, setMasterIndex] = useState(0);
  const [mergedData, setMergedData] = useState<Partial<Customer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedCustomers.length >= 2) {
      // Initialize with master's data, but fill in missing values from others
      const master = selectedCustomers[masterIndex];
      const initial: Partial<Customer> = { ...master };
      
      // Intelligent fill: if master is missing a field, take it from any other record that has it
      selectedCustomers.forEach(c => {
        if (!initial.customer_no && c.customer_no) initial.customer_no = c.customer_no;
        if (!initial.phone && c.phone) initial.phone = c.phone;
        if (!initial.address && c.address) initial.address = c.address;
        if (!initial.birthday && c.birthday) initial.birthday = c.birthday;
        if (!initial.notes && c.notes) initial.notes = (initial.notes || "") + "\n" + (c.notes || "");
      });
      
      setMergedData(initial);
    }
  }, [selectedCustomers, masterIndex]);

  const handleToggleField = (field: keyof Customer, value: any) => {
    setMergedData(prev => ({ ...prev, [field]: value }));
  };

  const handleMerge = async () => {
    setIsSubmitting(true);
    try {
      const master = selectedCustomers[masterIndex];
      const others = selectedCustomers.filter((_, i) => i !== masterIndex).map(c => c.id);
      
      const res = await mergeCustomers(master.id, others, mergedData);
      if (res.success) {
        toast.success("顧客データを統合しました");
        onSuccess();
        onClose();
      } else {
        toast.error("統合に失敗しました: " + res.error);
      }
    } catch (err) {
      toast.error("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedCustomers.length < 2) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <ArrowRightLeft className="text-blue-400" />
            顧客データの目視統合
          </DialogTitle>
          <p className="text-slate-400 text-sm mt-2">
            どちらのデータを優先するか選択してください。不足している情報は自動で補完されています。
          </p>
        </DialogHeader>

        <div className="p-8 space-y-8 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedCustomers.map((c, idx) => (
              <div 
                key={c.id}
                onClick={() => setMasterIndex(idx)}
                className={cn(
                  "p-6 rounded-3xl border-2 transition-all cursor-pointer relative",
                  masterIndex === idx ? "bg-white border-blue-600 shadow-xl ring-4 ring-blue-100" : "bg-white/50 border-slate-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                )}
              >
                <div className="absolute top-4 right-4">
                  {masterIndex === idx ? <CheckCircle2 className="text-blue-600" /> : <Circle className="text-slate-300" />}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                    {idx + 1}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {masterIndex === idx ? "メインとして残す" : "統合して削除する"}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-slate-300" />
                    <span className="font-black text-slate-900">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag size={16} className="text-slate-300" />
                    <span className={cn("text-sm font-bold", !c.customer_no && "text-slate-300")}>
                      {c.customer_no || "番号なし"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Phone size={14} className="text-slate-300" />
                    {c.phone || "電話番号なし"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Result Preview / Manual Edit */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 space-y-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
              <CheckCircle2 size={18} className="text-emerald-500" />
              統合後の最終データ（確認・修正）
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カルテ番号</label>
                  <div className="flex gap-2">
                    {selectedCustomers.map((c, i) => c.customer_no && (
                      <button 
                        key={i}
                        onClick={() => handleToggleField("customer_no", c.customer_no)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                          mergedData.customer_no === c.customer_no ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        {c.customer_no}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">電話番号</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomers.map((c, i) => c.phone && (
                      <button 
                        key={i}
                        onClick={() => handleToggleField("phone", c.phone)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                          mergedData.phone === c.phone ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        {c.phone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">その他の統合ルール</p>
                <ul className="text-[10px] text-slate-500 space-y-2 font-bold">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    すべての「売上履歴」をメインに集約します
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    すべての「カルテ画像・メモ」を統合します
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    古いレコード（削除される側）は完全に消去されます
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-white border-t border-slate-100">
          <div className="flex gap-4 w-full">
            <Button variant="ghost" onClick={onClose} className="flex-1 rounded-2xl h-14 font-bold text-slate-400">
              キャンセル
            </Button>
            <Button 
              onClick={handleMerge}
              disabled={isSubmitting}
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 font-black shadow-xl shadow-blue-100"
            >
              {isSubmitting ? "統合中..." : "上記の内容で統合を実行する"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
