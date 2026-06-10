"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addCashTransaction, CashTransactionType } from "@/app/cash/actions";
import { useAuth } from "@/lib/auth-context";
import { Wallet, Banknote, Edit3 } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeName: string;
  isAdmin: boolean;
};

export default function CashTransactionDialog({ isOpen, onClose, onSuccess, storeName, isAdmin }: Props) {
  const { profile } = useAuth();
  const [type, setType] = useState<CashTransactionType>("deposit");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState(new Date().toLocaleDateString("sv-SE")); // YYYY-MM-DD
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("正しい金額を入力してください");
      return;
    }
    
    setLoading(true);
    setError("");

    // If owner collects, it's auto verified. If staff deposits, it's pending.
    // However, if owner is the one reporting a deposit, it's also auto verified.
    const status = isAdmin ? "verified" : "pending";

    const res = await addCashTransaction({
      store_name: storeName,
      date,
      amount: Number(amount),
      type,
      staff_name: profile?.name || "Unknown",
      status,
      note
    });

    setLoading(false);

    if (res.success) {
      setAmount("");
      setNote("");
      onSuccess();
    } else {
      setError(res.error || "エラーが発生しました");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-slate-50 p-0 overflow-hidden">
        <DialogHeader className="bg-white p-5 border-b border-slate-100">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
            {type === 'deposit' ? <Banknote className="w-5 h-5 text-blue-500" /> : <Wallet className="w-5 h-5 text-indigo-500" />}
            現金売上の{type === 'collection' ? '回収' : type === 'deposit' ? '銀行入金' : '残高調整'}を報告
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            店舗に貯まった現金売上を、銀行へ入金したか、オーナーが回収した金額を入力してください。
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-md font-bold">{error}</div>}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">報告の種類</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'deposit' ? 'default' : 'outline'}
                className={type === 'deposit' ? 'flex-1 bg-blue-600 hover:bg-blue-700' : 'flex-1 bg-white text-slate-600'}
                onClick={() => setType('deposit')}
              >
                銀行に入金した
              </Button>
              {isAdmin && (
                <>
                  <Button
                    type="button"
                    variant={type === 'collection' ? 'default' : 'outline'}
                    className={type === 'collection' ? 'flex-1 bg-indigo-600 hover:bg-indigo-700' : 'flex-1 bg-white text-slate-600'}
                    onClick={() => setType('collection')}
                  >
                    オーナーが回収した
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'adjustment' ? 'default' : 'outline'}
                    className={type === 'adjustment' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-white text-slate-600 px-3'}
                    onClick={() => setType('adjustment')}
                    title="残高のズレを調整する"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">日付</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              {type === 'adjustment' ? '調整額（プラス/マイナスで入力）' : '金額 (円)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
              <input 
                type={type === 'adjustment' ? "text" : "number"}
                inputMode="numeric"
                required
                min={type === 'adjustment' ? undefined : "1"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full border border-slate-200 rounded-md py-2 pl-8 pr-3 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {type !== 'adjustment' && (
              <p className="text-[10px] text-slate-400">※レジ金(3万円)を含めず、売上として回収・入金した分だけを入力してください。</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">メモ (任意)</label>
            <input 
              type="text" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: 三井住友銀行へ入金"
              className="w-full border border-slate-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 bg-white" onClick={onClose} disabled={loading}>
              キャンセル
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" disabled={loading}>
              {loading ? "送信中..." : isAdmin ? "確定して保存" : "オーナーに報告する"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
