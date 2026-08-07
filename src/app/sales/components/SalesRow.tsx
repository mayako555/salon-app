"use client";
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserCircle } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type StoreSalesData = {
  total: number;
  tech: number;
  product: number;
  discount: number;
  visits?: number;
};

export type StaffSalesData = {
  id: string;
  name: string;
  storeSales: Record<string, StoreSalesData>;
  totalSales: number;
  totalTech: number;
  totalProduct: number;
  totalDiscount: number;
  goal?: number;
  visits?: number;
  techAvg?: number;
  totalAvg?: number;
};

type Props = {
  data: StaffSalesData;
  rank: number;
  availableStores: string[];
  onClick: () => void;
};

export default function SalesRow({ data, rank, availableStores, onClick }: Props) {
  const formatMoney = (val: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(val);

  const getRankBadge = (r: number) => {
    if (r === 1) return <span className="text-xl">🥇</span>;
    if (r === 2) return <span className="text-xl">🥈</span>;
    if (r === 3) return <span className="text-xl">🥉</span>;
    return <span className="text-xs font-bold text-slate-400">#{r}</span>;
  };

  const achievementRate = data.goal ? Math.round((data.totalSales / data.goal) * 100) : null;

  const renderStoreCell = (storeName: string) => {
    const sData = data.storeSales[storeName];
    if (!sData || sData.total === 0) {
      return (
        <TableCell className="text-right">
          <span className="text-slate-300">-</span>
        </TableCell>
      );
    }
    return (
      <TableCell className="text-right py-2">
        <div className="flex flex-col items-end">
          <span className="font-bold text-slate-800 tabular-nums">{formatMoney(sData.total)}</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold">
            <span className="text-blue-500">技 {formatMoney(sData.tech)}</span>
            <span className="text-emerald-500">店 {formatMoney(sData.product)}</span>
          </div>
          {sData.discount > 0 && (
            <span className="text-[9px] text-rose-500 font-bold mt-0.5">
              引 -{formatMoney(sData.discount)}
            </span>
          )}
        </div>
      </TableCell>
    );
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-slate-50 transition-colors group"
      onClick={onClick}
    >
      <TableCell className="text-center font-bold">
        {getRankBadge(rank)}
      </TableCell>
      <TableCell className="font-bold text-slate-700 whitespace-nowrap group-hover:text-blue-600 transition-colors">
        <div className="flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
          {data.name}
        </div>
      </TableCell>
      
      {availableStores.map(store => (
        <React.Fragment key={store}>
          {renderStoreCell(store)}
        </React.Fragment>
      ))}

      <TableCell className="text-right py-2 bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
        <div className="flex flex-col items-end">
          <span className="font-bold text-slate-800 tabular-nums">{formatMoney(data.totalSales)}</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold">
            <span className="text-blue-500">技 {formatMoney(data.totalTech)}</span>
            <span className="text-emerald-500">店 {formatMoney(data.totalProduct)}</span>
          </div>
          {data.totalDiscount > 0 && (
            <span className="text-[10px] text-rose-500 font-bold mt-0.5">
              引 -{formatMoney(data.totalDiscount)}
            </span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="text-right font-bold text-slate-700">
        {data.visits || 0}
      </TableCell>
      
      <TableCell className="text-right text-sm">
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-bold text-slate-700">{formatMoney(data.totalAvg || 0)}</span>
          <span className="text-[10px] font-bold text-blue-500">技 {formatMoney(data.techAvg || 0)}</span>
        </div>
      </TableCell>

      <TableCell className="w-[150px]">
        {achievementRate !== null ? (
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={cn(
                achievementRate >= 100 ? "text-emerald-600" : "text-slate-600"
              )}>
                {achievementRate}%
              </span>
              <span className="text-[10px] text-slate-400 font-normal tabular-nums">
                / {formatMoney(data.goal!)}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  achievementRate >= 100 ? "bg-emerald-500" : "bg-blue-500"
                )}
                style={{ width: `${Math.min(achievementRate, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 text-center font-medium bg-slate-50 py-1 rounded">
            未設定
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
