"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, Download } from "lucide-react";
import { MonthlyStatement } from "./actions";

function calculatePaymentDate(targetMonth: string): string {
  const [yearStr, monthStr] = targetMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (isNaN(year) || isNaN(month)) return "----/--/--";

  // 支給日は翌月25日
  let payYear = year;
  let payMonth = month + 1;
  if (payMonth > 12) {
    payMonth = 1;
    payYear += 1;
  }

  const date = new Date(payYear, payMonth - 1, 25);

  // 日本の祝日判定ヘルパー
  const isJapanesePublicHoliday = (d: Date): boolean => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dy = d.getDate();

    // 1. 固定祝日
    if (m === 1 && dy === 1) return true; // 元日
    if (m === 2 && dy === 11) return true; // 建国記念の日
    if (m === 2 && dy === 23) return true; // 天皇誕生日
    if (m === 4 && dy === 29) return true; // 昭和の日
    if (m === 5 && dy === 3) return true; // 憲法記念日
    if (m === 5 && dy === 4) return true; // みどりの日
    if (m === 5 && dy === 5) return true; // こどもの日
    if (m === 8 && dy === 11) return true; // 山の日
    if (m === 11 && dy === 3) return true; // 文化の日
    if (m === 11 && dy === 23) return true; // 勤労感謝の日

    // 2. ハッピーマンデー (成人の日, 海の日, 敬老の日, スポーツの日)
    const getNthMonday = (yr: number, mo: number, n: number) => {
      let count = 0;
      for (let day = 1; day <= 31; day++) {
        const dt = new Date(yr, mo - 1, day);
        if (dt.getDay() === 1) { // 月曜日
          count++;
          if (count === n) return day;
        }
      }
      return -1;
    };

    if (m === 1 && dy === getNthMonday(y, 1, 2)) return true; // 成人の日 (第2月曜)
    if (m === 7 && dy === getNthMonday(y, 7, 3)) return true; // 海の日 (第3月曜)
    if (m === 9 && dy === getNthMonday(y, 9, 3)) return true; // 敬老の日 (第3月曜)
    if (m === 10 && dy === getNthMonday(y, 10, 2)) return true; // スポーツの日 (第2月曜)

    // 3. 春分の日・秋分の日 (計算式による算出)
    const vernalDay = Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
    if (m === 3 && dy === vernalDay) return true;

    const autumnalDay = Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
    if (m === 9 && dy === autumnalDay) return true;

    // 4. 振替休日
    const isHolidayBase = (dt: Date) => {
      const ty = dt.getFullYear();
      const tm = dt.getMonth() + 1;
      const td = dt.getDate();
      if (tm === 1 && td === 1) return true;
      if (tm === 2 && td === 11) return true;
      if (tm === 2 && td === 23) return true;
      if (tm === 4 && td === 29) return true;
      if (tm === 5 && td === 3) return true;
      if (tm === 5 && td === 4) return true;
      if (tm === 5 && td === 5) return true;
      if (tm === 8 && td === 11) return true;
      if (tm === 11 && td === 3) return true;
      if (tm === 11 && td === 23) return true;
      
      const mon1 = getNthMonday(ty, 1, 2);
      const mon7 = getNthMonday(ty, 7, 3);
      const mon9 = getNthMonday(ty, 9, 3);
      const mon10 = getNthMonday(ty, 10, 2);
      if (tm === 1 && td === mon1) return true;
      if (tm === 7 && td === mon7) return true;
      if (tm === 9 && td === mon9) return true;
      if (tm === 10 && td === mon10) return true;

      const vD = Math.floor(20.8431 + 0.242194 * (ty - 1980) - Math.floor((ty - 1980) / 4));
      if (tm === 3 && td === vD) return true;
      const aD = Math.floor(23.2488 + 0.242194 * (ty - 1980) - Math.floor((ty - 1980) / 4));
      if (tm === 9 && td === aD) return true;

      return false;
    };

    const prev = new Date(y, m - 1, dy - 1);
    if (prev.getDay() === 0 && isHolidayBase(prev)) return true;
    
    let temp = new Date(y, m - 1, dy - 1);
    while (isHolidayBase(temp)) {
      if (temp.getDay() === 0) return true;
      temp.setDate(temp.getDate() - 1);
    }

    // 5. 国民の休日 (祝日と祝日に挟まれた平日)
    const next = new Date(y, m - 1, dy + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6 && isHolidayBase(prev) && isHolidayBase(next)) {
      return true;
    }

    return false;
  };

  // 25日が土日・祝日の場合は、その前日の平日へ遡る
  while (date.getDay() === 0 || date.getDay() === 6 || isJapanesePublicHoliday(date)) {
    date.setDate(date.getDate() - 1);
  }

  const formatY = date.getFullYear();
  const formatM = String(date.getMonth() + 1).padStart(2, "0");
  const formatD = String(date.getDate()).padStart(2, "0");

  return `${formatY}/${formatM}/${formatD}`;
}

export default function StatementDialog({ stmt }: { stmt: MonthlyStatement }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const paymentDate = calculatePaymentDate(stmt.target_month);

  const [yearStr, monthStr] = stmt.target_month.split("-");
  const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  const workedDays = stmt.details.metrics?.worked_days || 0;
  // @ts-ignore
  const paidLeaves = stmt.details.metrics?.paid_leaves || 0;
  const publicHolidays = daysInMonth - paidLeaves - workedDays;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Receipt size={14} />
          <span>明細</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
            <div className="flex items-center gap-3 print:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => window.print()}>
                 <Download size={16} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: landscape;
              margin: 10mm;
            }
            html, body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
            }
            body * {
              visibility: hidden !important;
            }
            #print-area-${stmt.id}, #print-area-${stmt.id} * {
              visibility: visible !important;
            }
            #print-area-${stmt.id} {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            /* Override Radix UI fixed positioning to prevent it from clipping */
            div[role="dialog"] {
              position: static !important;
              transform: none !important;
            }
          }
        `}} />

        <div id={`print-area-${stmt.id}`} className="bg-white p-4 text-sm mt-4 text-slate-900 overflow-x-auto print:m-0 print:p-0">
          <div className="min-w-[800px]">
            {/* Header Info */}
            <div className="flex justify-between mb-4 border border-black p-2 max-w-sm">
              <div className="space-y-1">
                <p>支給日: {paymentDate}</p>
                <p className="font-bold border-b border-black w-48 mb-2 pb-1">{stmt.target_month.replace("-", "年")}月分 給与・報酬</p>
                <div className="flex justify-between items-baseline pr-4">
                  <span>{stmt.work_location ? stmt.work_location.split("・")[0] : "Jasmine Lash"}</span>
                </div>
                <p className="font-bold text-lg">{stmt.staff_name} 様</p>
              </div>
              <div className="flex items-end">
                 <div className="border border-black p-2 w-16 h-16 flex items-start justify-center">
                   <span className="text-xs">受領印</span>
                 </div>
              </div>
            </div>

            {/* Dynamic Column Layout based on Staff Type */}
            <div className={`grid ${stmt.type === "salary" ? "grid-cols-4" : "grid-cols-3"} gap-2 border-t-2 border-black`}>
              
              {/* Col 1: Attendance (Employees only) */}
              {stmt.type === "salary" && (
                <div className="border-x-2 border-b-2 border-black">
                  <div className="text-center font-bold border-b-2 border-black py-1">勤怠</div>
                  <div className="p-2 space-y-2 h-[260px]">
                     <div className="flex justify-between text-xs"><span>出勤日数</span><span>{workedDays} 日</span></div>
                     <div className="flex justify-between text-xs"><span>欠勤日数</span><span>0 日</span></div>
                     <div className="flex justify-between text-xs"><span>公休日数</span><span>{publicHolidays} 日</span></div>
                     <div className="flex justify-between text-xs"><span>有給使用回数</span><span>{paidLeaves} 日</span></div>
                     <div className="flex justify-between text-xs mt-4"><span>労働時間</span><span>{stmt.details.metrics?.worked_hours || 0} 時間</span></div>
                     <div className="flex justify-between text-xs mt-4"><span>扶養人数</span><span>0 人</span></div>
                  </div>
                </div>
              )}

              {/* Col 2: Payments */}
              <div className="border-x-2 border-b-2 border-black relative">
                <div className="text-center font-bold border-b-2 border-black py-1">支給額</div>
                <div className="flex justify-between font-bold border-b-2 border-black p-2 text-lg">
                  <span>合計</span><span>¥{(stmt.base_amount + stmt.total_allowances + (stmt.details.tax_addition || 0)).toLocaleString()}</span>
                </div>
                <div className="text-center text-xs mt-1 border-b border-black pb-1">支給内訳</div>
                <div className="p-2 space-y-2 h-[200px] overflow-y-auto">
                   {(() => {
                     const allocated = 
                       (stmt.details.transport_fee || 0) + 
                       (stmt.details.nomination_reward || 0) + 
                       // @ts-ignore
                       (stmt.details.review_allowance || 0) + 
                       // @ts-ignore
                       (stmt.details.blog_allowance || 0) + 
                       // @ts-ignore
                       (stmt.details.executive_allowance || 0) +
                       (stmt.details.business_allowance || 0) +
                       (stmt.details.attendance_allowance || 0);
                     
                     const unallocated = Math.max(0, stmt.total_allowances - allocated);
                     const baseSalaryOnly = stmt.base_amount - (stmt.details.base_tech_salary || 0) - (stmt.details.base_product_salary || 0);
                     // @ts-ignore
                     const businessAllowance = stmt.details.business_allowance || 0;
                     const attendanceAllowance = stmt.details.attendance_allowance || 0;
                     const bundledBasicSalary = baseSalaryOnly + businessAllowance + attendanceAllowance + unallocated;
                     const showSeparateAllowances = stmt.allowance_display_mode === "separate";

                     return (
                       <>
                         {stmt.type === "salary" && !showSeparateAllowances && (
                           <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                             <div className="text-xs">
                               <div className="font-bold">基本給</div>
                               <div className="text-[10px] text-slate-500 scale-90 origin-left">(ベース給＋皆勤手当＋業務手当)</div>
                             </div>
                             <span>{bundledBasicSalary.toLocaleString()}</span>
                           </div>
                         )}
                         {stmt.type === "salary" && showSeparateAllowances && (
                           <div className="border-b border-slate-100 pb-2 mb-2 space-y-1">
                             <div className="text-xs font-bold mb-1">基本給</div>
                             <div className="flex justify-between text-xs font-normal"><span>ベース給</span><span>{baseSalaryOnly.toLocaleString()}</span></div>
                             <div className="flex justify-between text-xs font-normal"><span>皆勤手当</span><span>{attendanceAllowance.toLocaleString()}</span></div>
                             <div className="flex justify-between text-xs font-normal"><span>業務手当</span><span>{businessAllowance.toLocaleString()}</span></div>
                             {unallocated > 0 && (
                               <div className="flex justify-between text-xs font-normal"><span>その他手当</span><span>{unallocated.toLocaleString()}</span></div>
                             )}
                           </div>
                         )}
                         {stmt.details.base_tech_salary > 0 && (
                           <div className="flex justify-between text-xs"><span>技術歩合/インセンティブ</span><span>{stmt.details.base_tech_salary.toLocaleString()}</span></div>
                         )}
                         {stmt.details.base_product_salary > 0 && (
                           <div className="flex justify-between text-xs"><span>店販歩合</span><span>{stmt.details.base_product_salary.toLocaleString()}</span></div>
                         )}
                         {/* @ts-ignore */}
                         {stmt.details.executive_allowance > 0 && (
                           <div className="flex justify-between text-xs"><span>役職・その他手当</span><span>{(stmt.details.executive_allowance || 0).toLocaleString()}</span></div>
                         )}
                         
                         {/* Separated Allowances */}
                         {(stmt.details.nomination_reward > 0 || stmt.details.nomination_reward === 0) && (
                           <div className="flex justify-between text-xs"><span>指名手当</span><span>{stmt.details.nomination_reward.toLocaleString()}</span></div>
                         )}
                         {stmt.details.transport_fee > 0 && (
                           <div className="flex justify-between text-xs"><span>通勤手当</span><span>{stmt.details.transport_fee.toLocaleString()}</span></div>
                         )}
                         {/* @ts-ignore */}
                         {stmt.details.review_allowance > 0 && (
                           <div className="flex justify-between text-xs">
                             <span>口コミ手当</span>
                             {/* @ts-ignore */}
                             <span>{stmt.details.review_allowance.toLocaleString()}</span>
                           </div>
                         )}
                         {/* @ts-ignore */}
                         {stmt.details.blog_allowance > 0 && (
                           <div className="flex justify-between text-xs">
                             <span>ブログ手当</span>
                             {/* @ts-ignore */}
                             <span>{stmt.details.blog_allowance.toLocaleString()}</span>
                           </div>
                         )}
                       </>
                     );
                   })()}

                   {stmt.details.tax_addition > 0 && (
                     <div className="flex justify-between text-xs"><span>消費税加算額</span><span>{stmt.details.tax_addition.toLocaleString()}</span></div>
                   )}
                </div>
              </div>

              {/* Col 3: Deductions */}
              <div className="border-x-2 border-b-2 border-black relative">
                <div className="text-center font-bold border-b-2 border-black py-1">控除</div>
                <div className="p-2 space-y-2 h-[260px]">
                   {stmt.type === "salary" ? (
                     <>
                       <div className="flex justify-between text-xs"><span>雇用保険料</span><span>{stmt.details.social_insurance?.employment.toLocaleString() || "--"}</span></div>
                       <div className="flex justify-between text-xs"><span>所得税</span><span>{stmt.details.social_insurance?.income_tax.toLocaleString() || "--"}</span></div>
                       <div className="flex justify-between text-xs"><span>住民税</span><span>{stmt.details.social_insurance?.resident_tax.toLocaleString() || "--"}</span></div>
                       <div className="flex justify-between text-xs mt-4"><span>健康保険料</span><span>{stmt.details.social_insurance?.health.toLocaleString() || "--"}</span></div>
                       <div className="flex justify-between text-xs"><span>厚生年金保険</span><span>{stmt.details.social_insurance?.pension.toLocaleString() || "--"}</span></div>
                       {(stmt.details.social_insurance?.childcare ?? 0) > 0 && (
                         <div className="flex justify-between text-xs"><span>子ども・子育て支援金</span><span>{stmt.details.social_insurance?.childcare?.toLocaleString()}</span></div>
                       )}
                     </>
                   ) : (
                     <>
                       <div className="flex justify-between text-xs"><span>所得税（源泉徴収）</span><span>{stmt.details.social_insurance?.income_tax?.toLocaleString() || "0"}</span></div>
                     </>
                   )}
                </div>
                <div className="absolute bottom-0 w-full flex justify-between font-bold border-t-2 border-black p-2">
                  <span>合計</span><span>{stmt.total_deductions?.toLocaleString() || "0"}</span>
                </div>
              </div>

              {/* Col 4: Other / Final */}
              <div className="border-x-2 border-b-2 border-black flex flex-col">
                <div className="text-center font-bold border-b-2 border-black py-1">その他</div>
                <div className="p-2 space-y-2 border-b-2 border-black pb-4">
                   {stmt.type === "salary" ? (
                     <>
                       <div className="flex justify-between text-xs"><span>年末調整還付</span><span></span></div>
                       <div className="flex justify-between text-xs"><span>年末調整徴収</span><span></span></div>
                     </>
                   ) : (
                     <>
                       <div className="flex justify-between text-xs text-transparent"><span>-</span><span></span></div>
                       <div className="flex justify-between text-xs text-transparent"><span>-</span><span></span></div>
                     </>
                   )}
                   <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t border-black"><span>合計</span><span>0</span></div>
                </div>
                
                <div className="p-2 space-y-2 border-b-2 border-black bg-slate-50">
                   <div className="flex justify-between font-bold"><span>差し引き支給額</span><span>{stmt.final_paid_amount.toLocaleString()}</span></div>
                </div>

                <div className="p-2 space-y-2">
                   <div className="flex justify-between text-xs"><span>振込支給額</span><span className="font-bold">{(stmt.final_paid_amount - (stmt.adjustments?.already_paid_amount_override || 0) - (stmt.adjustments?.advance_deduction_override || 0)).toLocaleString()}</span></div>
                   {(stmt.adjustments?.already_paid_amount_override ?? 0) > 0 && (
                     <div className="flex justify-between text-xs"><span>支払済振込額</span><span>{(stmt.adjustments?.already_paid_amount_override || 0).toLocaleString()}</span></div>
                   )}
                   {(stmt.adjustments?.advance_deduction_override ?? 0) > 0 && (
                     <div className="flex justify-between text-xs"><span>立替金・購入代控除</span><span>{(stmt.adjustments?.advance_deduction_override || 0).toLocaleString()}</span></div>
                   )}
                </div>
              </div>
            </div>

            {/* Footer Rules / Memo */}
            <div className="mt-4 border-2 border-black p-2 text-xs whitespace-pre-wrap min-h-[3rem]">
               {stmt.note ? (
                 <p>{stmt.note}</p>
               ) : (
                 <p>※インセンティブ計算に関する備考項目。当月の変動歩合や評価に基づく特別手当が基本支給に含まれています。</p>
               )}
            </div>
            
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
