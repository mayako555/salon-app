"use client";

import { useState } from "react";
import { StaffProfile, updateStaffOrder } from "./actions";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListOrdered, GripVertical, Check, Loader2 } from "lucide-react";
import { Reorder, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function StaffOrderDialog({ staffList }: { staffList: StaffProfile[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(staffList);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setItems(staffList);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const orderedIds = items.map(i => i.id);
    const res = await updateStaffOrder(orderedIds);
    
    if (res.success) {
      toast.success("表示順を更新しました");
      setIsOpen(false);
    } else {
      toast.error(res.error || "更新に失敗しました");
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-slate-600 border-slate-200">
          <ListOrdered size={16} />
          表示順を変更
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">スタッフの表示順</DialogTitle>
          <p className="text-sm text-slate-500">ドラッグして並び替えてください。この順番がシフト表や名簿に反映されます。</p>
        </DialogHeader>
        
        <div className="py-4 overflow-y-auto flex-1 pr-2">
          <Reorder.Group 
            axis="y" 
            values={items} 
            onReorder={setItems}
            className="space-y-2"
          >
            <AnimatePresence>
              {items.map((staff) => (
                <Reorder.Item 
                  key={staff.id} 
                  value={staff}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-200 transition-colors"
                  whileDrag={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                >
                  <div className="text-slate-400">
                    <GripVertical size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{staff.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                      {staff.employment_type === 'employee' ? '正社員' : 
                       staff.employment_type === 'part_time' ? 'パート' : '業務委託'}
                    </p>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl">キャンセル</Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-slate-900 text-white rounded-xl gap-2 min-w-[100px]"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            保存する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
