"use client";

import { useState, useMemo } from "react";
import { SalesRecord } from "./actions";
import { format, addMinutes, parse, isWithinInterval, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { User, Clock, Plus, Info, Scissors, ShoppingBag, Tag } from "lucide-react";
import PaymentEditDialog from "./PaymentEditDialog";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DailyScheduleViewProps = {
  date: string;
  sales: SalesRecord[];
  staffNames: string[];
  onAddClick: (staff: string, time: string) => void;
  onEditClick: (sale: SalesRecord) => void;
};

export default function DailyScheduleView({ 
  date, 
  sales, 
  staffNames,
  onAddClick,
  onEditClick
}: DailyScheduleViewProps) {
  // 9:00 to 20:00 in 30min intervals
  const timeSlots = useMemo(() => {
    const slots = [];
    let current = parse("09:00", "HH:mm", new Date());
    const end = parse("20:00", "HH:mm", new Date());
    while (current <= end) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, 30);
    }
    return slots;
  }, []);

  const getSaleAtSlot = (staff: string, time: string) => {
    return sales.find(s => s.staff_name === staff && s.time === time);
  };

  // 1つ前のスロットで売上があるかチェック（セルの結合的な見栄えのため）
  const getSaleOccupyingSlot = (staff: string, time: string) => {
    // 厳密な時間一致で検索
    return sales.find(s => s.staff_name === staff && s.time === time);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[800px]">
          {/* Header row with Staff Names */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 sticky top-0 z-20 backdrop-blur-sm">
            <div className="w-20 flex-shrink-0 border-r border-slate-200 bg-slate-100/50 flex items-center justify-center">
              <Clock size={16} className="text-slate-400" />
            </div>
            {staffNames.map(staff => (
              <div key={staff} className="flex-1 min-w-[120px] p-4 text-center border-r border-slate-100 last:border-r-0">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                    <User size={20} />
                  </div>
                  <span className="font-black text-sm text-slate-800 tracking-tighter">{staff}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="relative">
            {timeSlots.map((time, idx) => (
              <div key={time} className="flex border-b border-slate-100 group">
                {/* Time Column */}
                <div className={cn(
                  "w-20 flex-shrink-0 border-r border-slate-200 p-2 text-right bg-slate-50/30 flex items-start justify-end",
                  time.endsWith(":00") ? "font-black text-slate-900 text-xs" : "text-[10px] text-slate-400 font-medium"
                )}>
                  {time}
                </div>

                {/* Staff Columns */}
                {staffNames.map(staff => {
                  const sale = getSaleAtSlot(staff, time);
                  
                  return (
                    <div 
                      key={`${staff}-${time}`} 
                      className="flex-1 min-w-[120px] relative border-r border-slate-100 last:border-r-0 h-16 group/cell"
                    >
                      {sale ? (
                        <PaymentEditDialog 
                          initialData={sale}
                          trigger={
                            <div className={cn(
                              "absolute inset-1 rounded-xl p-2 shadow-sm border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95 z-10",
                              sale.status === 'closed' 
                                ? "bg-slate-100 border-slate-200 text-slate-500" 
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            )}>
                              <div className="flex flex-col h-full justify-between">
                                <div className="flex justify-between items-start">
                                  <span className="text-[10px] font-black truncate max-w-[80%] leading-tight">
                                    {sale.customer_name} 様
                                  </span>
                                  {sale.customer_type === '新規' && <span className="text-[8px] bg-blue-500 text-white px-1 rounded-sm font-bold">新</span>}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black tabular-nums">
                                    ¥{(sale.tech_sales + sale.product_sales + (sale.nomination_fee || 0) - (sale.discount || 0)).toLocaleString()}
                                  </span>
                                  <div className="flex gap-0.5">
                                    {sale.tech_sales > 0 && <Scissors size={10} className="text-blue-400" />}
                                    {sale.product_sales > 0 && <ShoppingBag size={10} className="text-emerald-400" />}
                                  </div>
                                </div>
                              </div>
                            </div>
                          }
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-transparent flex items-center justify-center transition-opacity" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend / Info */}
      <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap gap-6 items-center justify-center text-[11px] font-bold text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded-sm" />
          <span>通常予約（未完了）</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded-sm" />
          <span>会計済み / ロック中</span>
        </div>

        <div className="ml-auto flex gap-3">
          <div className="flex items-center gap-1">
            <Scissors size={12} className="text-blue-400" />
            <span>施術</span>
          </div>
          <div className="flex items-center gap-1">
            <ShoppingBag size={12} className="text-emerald-400" />
            <span>店販</span>
          </div>
        </div>
      </div>
    </div>
  );
}
