"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTransportAllowanceHistory, AllowanceRecord } from "./actions";
import { Loader2, Train, AlertCircle } from "lucide-react";
import { format } from "date-fns";

type TransportHistoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function TransportHistoryDialog({ isOpen, onClose }: TransportHistoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AllowanceRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getTransportAllowanceHistory();
      setHistory(data);
    } catch (e) {
      console.error("Failed to load transport history:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Train size={20} className="text-blue-500" />
            <DialogTitle>交通費の申請・提出履歴</DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            交通費の申請履歴はありません。
          </div>
        ) : (
          <div className="py-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[120px] text-xs font-bold text-slate-500">申請日時</TableHead>
                    <TableHead className="w-[120px] text-xs font-bold text-slate-500">スタッフ名</TableHead>
                    <TableHead className="w-[90px] text-xs font-bold text-slate-500 text-center">対象月</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-500">申請額</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-500">支給(決定)額</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500">詳細・備考</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const originalAmount = item.target_details?.original_requested_amount ?? item.amount;
                    const wasCapped = item.target_details?.was_capped || originalAmount > item.amount;
                    const reqDate = item.created_at ? new Date(item.created_at) : null;
                    const context = item.target_details?.context || "";

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                        <TableCell className="font-mono text-slate-500">
                          {reqDate ? format(reqDate, "yyyy/MM/dd HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="font-bold text-slate-800">
                          {item.staff_name}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-600">
                          {item.target_month}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-500">
                          ¥{originalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                          ¥{item.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-500 max-w-[200px] truncate">
                          <div className="flex flex-col gap-0.5">
                            <span>{context}</span>
                            {wasCapped && (
                              <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5 bg-rose-50 border border-rose-100 rounded px-1 w-max">
                                <AlertCircle size={10} /> 上限超過によりカット
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
