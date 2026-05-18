"use client";

import { StaffContract } from "./constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Sparkles, CalendarDays, TrendingUp, Trash2 } from "lucide-react";
import { deleteContract } from "./actions";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ContractHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  contracts: StaffContract[];
}

export default function ContractHistoryDialog({ isOpen, onClose, staffName, contracts }: ContractHistoryDialogProps) {
  // Sort contracts by valid_from descending (newest first)
  const sortedContracts = [...contracts].sort((a, b) => 
    new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
  );

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (window.confirm("この契約履歴を削除してもよろしいですか？\n削除すると元に戻せません。")) {
      const res = await deleteContract(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert("削除に失敗しました: " + res.error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="text-emerald-600" />
            {staffName} のキャリアマップ（給与・契約履歴）
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 relative">
          {/* Timeline connecting line */}
          <div className="absolute left-[28px] top-8 bottom-8 w-0.5 bg-slate-200 z-0"></div>

          <div className="space-y-6">
            {sortedContracts.map((contract, index) => {
              const isLatest = index === 0;
              const hasEndDate = !!contract.valid_to;
              
              return (
                <div key={contract.id || index} className="relative z-10 flex gap-4">
                  {/* Timeline Dot */}
                  <div className="flex flex-col items-center mt-1">
                    <div className={`w-14 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                      isLatest 
                        ? "bg-emerald-100 border-emerald-500 text-emerald-700" 
                        : "bg-slate-100 border-slate-300 text-slate-500"
                    }`}>
                      {isLatest ? "現在" : "過去"}
                    </div>
                  </div>

                  {/* Contract Details Card */}
                  <div className={`flex-1 rounded-lg border p-4 ${
                    isLatest ? "bg-white border-emerald-200 shadow-sm ring-1 ring-emerald-500/10" : "bg-slate-50/80 border-slate-200"
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-mono bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                        <CalendarDays size={14} className={isLatest ? "text-emerald-500" : "text-slate-400"} />
                        <span className="font-bold text-slate-800">{format(new Date(contract.valid_from), "yyyy年MM月dd日")}</span>
                        <span className="text-slate-400">〜</span>
                        <span>{hasEndDate ? format(new Date(contract.valid_to!), "yyyy年MM月dd日") : "現在"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`text-xs font-bold px-2 py-1 rounded ${
                          contract.contract_type === 'outsourcing' ? 'bg-emerald-100 text-emerald-800' :
                          contract.contract_type === 'hourly' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {contract.contract_type === 'outsourcing' ? '業務委託' :
                           contract.contract_type === 'hourly' ? '時給' :
                           contract.contract_type === 'monthly' ? '月給' : '月給+歩合'}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(contract.id!)}
                          className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md"
                          title="履歴を削除"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-slate-500 block mb-0.5">等級・役職</span>
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            {contract.grade && <Sparkles size={12} className="text-amber-500" />}
                            {contract.grade || "設定なし"} {contract.job_title ? `(${contract.job_title})` : ""}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block mb-0.5">基本給・時給</span>
                          <div className="font-bold text-slate-800">
                            {contract.contract_type === 'hourly' ? (
                              `${contract.hourly_wage?.toLocaleString()}円 / 時`
                            ) : (
                              `${contract.monthly_base_salary?.toLocaleString()}円 / 月`
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {contract.contract_type !== 'hourly' && (
                          <div>
                            <span className="text-xs text-slate-500 block mb-0.5">歩合条件（技術 / 店販）</span>
                            <div className="font-bold text-slate-800 text-xs">
                              技術: {contract.tech_sales_ratio}% 
                              {contract.tech_sales_threshold! > 0 && <span className="text-slate-500 font-normal"> ({'>'}{contract.tech_sales_threshold?.toLocaleString()}円)</span>}
                              <br />
                              店販: {contract.product_sales_ratio}%
                            </div>
                          </div>
                        )}
                        {((contract.business_allowance || 0) > 0 || (contract.attendance_allowance || 0) > 0) && (
                          <div>
                            <span className="text-xs text-slate-500 block mb-0.5">主な手当</span>
                            <div className="text-xs text-slate-700">
                              {contract.business_allowance! > 0 && <div>役職: {contract.business_allowance?.toLocaleString()}円</div>}
                              {contract.attendance_allowance! > 0 && <div>皆勤: {contract.attendance_allowance?.toLocaleString()}円</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {sortedContracts.length === 0 && (
              <div className="text-center text-slate-500 py-8">履歴がありません。</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
