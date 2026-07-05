"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, ShoppingBag, Tag, Calculator, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SalesSummaryData = {
  name: string;
  total: number;
  tech: number;
  product: number;
  discount: number;
  prevMonthTotal?: number;
  prevYearTotal?: number;
};

type Props = {
  data: SalesSummaryData[];
};

export default function SalesSummaryCards({ data }: Props) {
  const formatMoney = (val: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(val);

  const getComparison = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const diff = current - previous;
    const percent = Math.round((diff / previous) * 100);
    const isPositive = diff > 0;
    const isZero = diff === 0;

    return (
      <span className={cn(
        "text-xs font-bold flex items-center gap-0.5",
        isPositive ? "text-emerald-500" : isZero ? "text-slate-400" : "text-rose-400"
      )}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : isZero ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? "+" : ""}{percent}%
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {data.map((item, idx) => (
        <Card key={item.name} className={cn(
          "shadow-sm border-slate-200 overflow-hidden transition-all hover:shadow-md",
          idx === 0 ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700" : "bg-white"
        )}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex justify-between items-center opacity-90">
              {item.name}
              {item.prevMonthTotal !== undefined && (
                <div className="flex items-center gap-2 bg-slate-100/10 px-2 py-1 rounded text-[10px]">
                  前月比: {getComparison(item.total, item.prevMonthTotal)}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-black tracking-tight", idx === 0 ? "text-white" : "text-slate-800")}>
                  {formatMoney(item.total)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/20">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                  <Scissors className="w-3 h-3" /> 技術
                </div>
                <div className={cn("text-xs font-bold", idx === 0 ? "text-slate-200" : "text-slate-700")}>
                  {formatMoney(item.tech)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  <ShoppingBag className="w-3 h-3" /> 店販
                </div>
                <div className={cn("text-xs font-bold", idx === 0 ? "text-slate-200" : "text-slate-700")}>
                  {formatMoney(item.product)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                  <Tag className="w-3 h-3" /> 値引
                </div>
                <div className={cn("text-xs font-bold", idx === 0 ? "text-slate-200" : "text-slate-700")}>
                  {formatMoney(item.discount)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
