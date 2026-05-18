"use client";

import { StaffContract } from "./constants";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  User, 
  Calendar, 
  Briefcase, 
  CreditCard, 
  Percent, 
  Settings, 
  ShieldCheck, 
  FileText 
} from "lucide-react";
import { format } from "date-fns";

interface ContractDetailDialogProps {
  contract: StaffContract | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractDetailDialog({ contract, isOpen, onClose }: ContractDetailDialogProps) {
  if (!contract) return null;

  const totalMonthlyAllowance = (contract.business_allowance || 0) + 
                               (contract.attendance_allowance || 0) + 
                               (contract.service_year_allowance || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DialogTitle className="text-2xl font-black">{contract.staff_name} 様</DialogTitle>
                {contract.is_probation && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">PROBATION</span>
                )}
              </div>
              <p className="text-slate-400 text-xs font-bold flex items-center gap-1">
                <Briefcase size={12} />
                {contract.contract_type === 'outsourcing' ? '業務委託（完全歩合）' :
                 contract.contract_type === 'hourly' ? '時給（パート・アルバイト）' :
                 contract.contract_type === 'monthly' ? '月給（正社員・固定）' : '月給+歩合（固定＋出来高）'}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">適用開始日</span>
              <span className="text-sm font-bold text-slate-200">{format(new Date(contract.valid_from), "yyyy年MM月dd日")}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 bg-white">
          {/* Base Salary Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={14} className="text-slate-300" />
              基本報酬・固定給
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <span className="block text-[10px] font-bold text-slate-500 mb-1">
                  {contract.contract_type === 'hourly' ? '基本時給' : 'ベース基本給'}
                </span>
                <span className="text-xl font-black text-slate-900">
                  {contract.contract_type === 'hourly' 
                    ? `¥${contract.hourly_wage?.toLocaleString()}` 
                    : `¥${contract.monthly_base_salary?.toLocaleString()}`}
                  <span className="text-xs ml-1">{contract.contract_type === 'hourly' ? '/時' : ''}</span>
                </span>
              </div>
              {totalMonthlyAllowance > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-500 mb-1">固定手当 合計</span>
                  <span className="text-xl font-black text-slate-900">¥{totalMonthlyAllowance.toLocaleString()}</span>
                </div>
              )}
            </div>
          </section>

          {/* Commission Rates Section */}
          {(contract.contract_type === 'outsourcing' || contract.contract_type === 'tier_monthly') && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Percent size={14} className="text-slate-300" />
                歩合・還元ルール
              </h3>
              <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-blue-100">
                  <span className="text-sm font-bold text-blue-900">技術売上 還元率</span>
                  <span className="text-2xl font-black text-blue-600">{contract.tech_sales_ratio}%</span>
                </div>
                {contract.tech_sales_threshold && contract.tech_sales_threshold > 0 && (
                  <div className="flex justify-between items-center text-xs text-blue-700">
                    <span>還元発生しきい値</span>
                    <span className="font-bold">¥{contract.tech_sales_threshold.toLocaleString()} 超過分</span>
                  </div>
                )}
                
                {/* Menu Specific Rates */}
                {contract.menu_specific_rates && contract.menu_specific_rates.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <span className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">メニュー別特別ルール</span>
                    {contract.menu_specific_rates.map((rate, i) => (
                      <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl text-xs shadow-sm border border-blue-50">
                        <span className="font-bold text-slate-700">{rate.menu_name}</span>
                        <span className="font-black text-blue-600">{rate.ratio}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Deductions Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} className="text-slate-300" />
              控除・その他設定
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">交通費上限</span>
                  <span className="font-bold text-slate-800">¥{contract.transport_fee_limit?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">指名料手当</span>
                  <span className="font-bold text-slate-800">¥{contract.nomination_fee?.toLocaleString()}/件</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 content-start">
                {contract.deduction_consumption_tax && (
                  <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[9px] font-black border border-rose-100">消費税控除 あり</span>
                )}
                {contract.deduction_rakuten_fee && (
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[9px] font-black border border-slate-200">媒体手数料控除 あり</span>
                )}
                {contract.deduction_cashless_ratio > 0 && (
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[9px] font-black border border-slate-200">決済手数料 {contract.deduction_cashless_ratio}%</span>
                )}
              </div>
            </div>
          </section>

          {/* Allowances List */}
          {contract.custom_allowances && contract.custom_allowances.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} className="text-slate-300" />
                個別追加手当
              </h3>
              <div className="space-y-2">
                {contract.custom_allowances.map((a, i) => (
                  <div key={i} className="flex justify-between items-center bg-emerald-50/30 px-4 py-3 rounded-2xl border border-emerald-100/50">
                    <span className="text-sm font-bold text-slate-700">{a.name}</span>
                    <span className="text-sm font-black text-emerald-600">¥{a.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
          <button 
            onClick={onClose}
            className="w-full h-12 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200"
          >
            閉じる
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
