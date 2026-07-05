"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SalesSummaryData } from "./SalesSummaryCards";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Props = {
  data: SalesSummaryData[];
};

import React from "react";

export default React.memo(function StoreTotalBar({ data }: Props) {
  const formatMoney = (val: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(val);

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-slate-900 border-t border-slate-800 text-white z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="p-2 md:p-3 max-w-7xl mx-auto overflow-hidden">
        <div className="flex flex-wrap items-center justify-center gap-x-4 md:gap-x-8 gap-y-1">
          {data.map((item, idx) => (
            <div key={item.name} className={cn("flex items-center gap-2 md:gap-3", idx !== data.length - 1 && "border-r border-slate-700 pr-4 md:pr-8")}>
              <span className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70", idx === 0 ? "text-blue-300" : "text-slate-400")}>
                {item.name}
              </span>
              <span className={cn("text-base md:text-2xl font-black tracking-tight", idx === 0 ? "text-white" : "text-slate-200")}>
                {formatMoney(item.total)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
