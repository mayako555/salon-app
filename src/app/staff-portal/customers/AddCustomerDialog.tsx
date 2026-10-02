"use client";

import CustomerNameFields from "@/components/forms/CustomerNameFields";
import {emptyCustomerName,joinedCustomerName} from "@/lib/customer-name";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { registerManualCustomer } from "./actions";
import { useAuth } from "@/lib/auth-context";

interface AddCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCustomerDialog({ isOpen, onClose, onSuccess }: AddCustomerDialogProps) {
  const { availableStores, selectedStore } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ...emptyCustomerName,
    customer_no: "",
    name: "",
    name_kana: "",
    phone: "",
    store_name: selectedStore || (availableStores.length > 0 ? availableStores[0] : "未設定")
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.last_name.trim() || !form.first_name.trim() || !form.phone) {
      toast.error("名前と電話番号は必須です");
      return;
    }

    setLoading(true);
    const res = await registerManualCustomer(form);
    setLoading(false);

    if (res.success) {
      toast.success("顧客を登録しました");
      setForm({ ...emptyCustomerName, customer_no: "", name: "", name_kana: "", phone: "", store_name: selectedStore || (availableStores.length > 0 ? availableStores[0] : "未設定") });
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || "登録に失敗しました");
    }
  };

  const stores = availableStores;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>新規顧客登録</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">登録店舗</label>
            <div className="flex gap-2">
              {stores.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, store_name: s })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                    form.store_name === s 
                      ? "bg-slate-800 text-white border-slate-800" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="customer_no" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">お客様番号</label>
            <Input 
              id="customer_no" 
              placeholder="0001" 
              value={form.customer_no}
              onChange={(e) => setForm({ ...form, customer_no: e.target.value })}
              className="h-11 rounded-xl bg-slate-50 border-none font-bold"
            />
          </div>
          <CustomerNameFields value={form} onChange={parts=>setForm({...form,...parts,...joinedCustomerName(parts)})}/>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-bold text-slate-700">電話番号</label>
            <Input 
              id="phone" 
              type="tel" 
              placeholder="09012345678" 
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white flex-1">
              {loading ? "登録中..." : "登録する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
