"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, Download } from "lucide-react";
import { MonthlyStatement } from "./actions";

export default function StatementDialog({ stmt }: { stmt: MonthlyStatement }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Receipt size={14} />
          <span>明細</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                給与・報酬明細書
              </DialogTitle>
              <DialogDescription className="mt-1">
                {stmt.target_month.replace("-", "年")}月度
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => window.print()}>
               <Download size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="bg-white p-4 text-sm mt-4 text-slate-900 overflow-x-auto print:m-0 print:p-0">
          <div className="min-w-[800px]">
            {/* Header Info */}
            <div className="flex justify-between mb-4 border border-black p-2 max-w-sm">
              <div className="space-y-1">
                <p>支給日: ----/--/--</p>
                <p className="font-bold border-b border-black w-48 mb-2 pb-1">{stmt.target_month.replace("-", "年")}月分 給与・報酬</p>
                <p>Jasmine Lash</p>
                <p className="font-bold text-lg">{stmt.staff_name} 様</p>
              </div>
              <div className="flex items-end">
                 <div className="border border-black p-2 w-16 h-16 flex items-start justify-center">
                   <span className="text-xs">受領印</span>
                 </div>
              </div>
            </div>

            {/* 4 Column Layout */}
            <div className="grid grid-cols-4 gap-2 border-t-2 border-black">
              
              {/* Col 1: Attendance */}
              <div className="border-x-2 border-b-2 border-black">
                <div className="text-center font-bold border-b-2 border-black py-1">勤怠</div>
                <div className="p-2 space-y-2 h-[260px]">
                   <div className="flex justify-between text-xs"><span>出勤日数</span><span>{stmt.details.metrics?.worked_days || 0} 日</span></div>
                   <div className="flex justify-between text-xs"><span>欠勤日数</span><span>0 日</span></div>
                   <div className="flex justify-between text-xs"><span>公休日数</span><span>0 日</span></div>
                   <div className="flex justify-between text-xs"><span>有給使用回数</span><span>0 日</span></div>
                   <div className="flex justify-between text-xs mt-4"><span>労働時間</span><span>{stmt.details.metrics?.worked_hours || 0} 時間</span></div>
                   <div className="flex justify-between text-xs mt-4"><span>扶養人数</span><span>0 人</span></div>
                </div>
              </div>

              {/* Col 2: Payments */}
              <div className="border-x-2 border-b-2 border-black relative">
                <div className="text-center font-bold border-b-2 border-black py-1">支給額</div>
                <div className="flex justify-between font-bold border-b-2 border-black p-2 text-lg">
                  <span>合計</span><span>{stmt.base_amount.toLocaleString()}</span>
                </div>
                <div className="text-center text-xs mt-1 border-b border-black pb-1">支給内訳</div>
                <div className="p-2 space-y-2 h-[200px]">
                   {stmt.type === "salary" && (
                     <div className="flex justify-between">
                       <span className="text-xs">基本給</span>
                       <span>{stmt.base_amount.toLocaleString()}</span>
                     </div>
                   )}
                   {stmt.details.base_tech_salary > 0 && (
                     <div className="flex justify-between text-xs"><span>技術歩合/インセンティブ</span><span>{stmt.details.base_tech_salary.toLocaleString()}</span></div>
                   )}
                   {stmt.details.base_product_salary > 0 && (
                     <div className="flex justify-between text-xs"><span>店販歩合</span><span>{stmt.details.base_product_salary.toLocaleString()}</span></div>
                   )}
                   {stmt.details.nomination_reward > 0 && (
                     <div className="flex justify-between text-xs"><span>指名手当</span><span>{stmt.details.nomination_reward.toLocaleString()}</span></div>
                   )}
                   {stmt.total_allowances > 0 && (
                     <div className="flex justify-between text-xs"><span>各種手当 (口コミ/ブログ等)</span><span>{stmt.total_allowances.toLocaleString()}</span></div>
                   )}
                   {stmt.details.tax_addition > 0 && (
                     <div className="flex justify-between text-xs"><span>消費税加算額</span><span>{stmt.details.tax_addition.toLocaleString()}</span></div>
                   )}
                </div>
              </div>

              {/* Col 3: Deductions */}
              <div className="border-x-2 border-b-2 border-black relative">
                <div className="text-center font-bold border-b-2 border-black py-1">控除</div>
                <div className="p-2 space-y-2 h-[260px]">
                   <div className="flex justify-between text-xs"><span>雇用保険料</span><span>{stmt.details.social_insurance?.employment.toLocaleString() || "--"}</span></div>
                   <div className="flex justify-between text-xs"><span>所得税</span><span>{stmt.details.social_insurance?.income_tax.toLocaleString() || "--"}</span></div>
                   <div className="flex justify-between text-xs"><span>住民税</span><span>{stmt.details.social_insurance?.resident_tax.toLocaleString() || "--"}</span></div>
                   <div className="flex justify-between text-xs mt-4"><span>健康保険料</span><span>{stmt.details.social_insurance?.health.toLocaleString() || "--"}</span></div>
                   <div className="flex justify-between text-xs"><span>厚生年金保険</span><span>{stmt.details.social_insurance?.pension.toLocaleString() || "--"}</span></div>
                </div>
                <div className="absolute bottom-0 w-full flex justify-between font-bold border-t-2 border-black p-2">
                  <span>合計</span><span>{stmt.total_deductions?.toLocaleString() || "0"}</span>
                </div>
              </div>

              {/* Col 4: Other / Final */}
              <div className="border-x-2 border-b-2 border-black flex flex-col">
                <div className="text-center font-bold border-b-2 border-black py-1">その他</div>
                <div className="p-2 space-y-2 border-b-2 border-black pb-4">
                   <div className="flex justify-between text-xs"><span>年末調整還付</span><span></span></div>
                   <div className="flex justify-between text-xs"><span>年末調整徴収</span><span></span></div>
                   <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t border-black"><span>合計</span><span>0</span></div>
                </div>
                
                <div className="p-2 space-y-2 border-b-2 border-black bg-slate-50">
                   <div className="flex justify-between font-bold"><span>差し引き支給額</span><span>{stmt.final_paid_amount.toLocaleString()}</span></div>
                </div>

                <div className="p-2 space-y-2">
                   <div className="flex justify-between text-xs"><span>振込支給額</span><span className="font-bold">{stmt.final_paid_amount.toLocaleString()}</span></div>
                   <div className="flex justify-between text-xs"><span>支払済振込額</span><span>0</span></div>
                </div>
              </div>
            </div>

            {/* Footer Rules */}
            <div className="mt-4 border-2 border-black p-2 text-xs">
               <p>※インセンティブ計算に関する備考項目。当月の変動歩合や評価に基づく特別手当が基本支給に含まれています。</p>
            </div>
            
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
