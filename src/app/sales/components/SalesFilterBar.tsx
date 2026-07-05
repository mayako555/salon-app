"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, FileSpreadsheet, Download } from "lucide-react";
import Link from "next/link";
import { format, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";
import CSVUploadButton from "../CSVUploadButton";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  currentDate: Date;
  selectedStore: string; // "all" | "六甲" | "神戸" | "元町"
  onStoreChange: (store: string) => void;
  hideZeroSales: boolean;
  onHideZeroSalesChange: (hide: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availableStores: string[];
  onExportCsv: () => void;
  onExportExcel: () => void;
};

import React from "react";

export default React.memo(function SalesFilterBar({
  currentDate,
  selectedStore,
  onStoreChange,
  hideZeroSales,
  onHideZeroSalesChange,
  searchQuery,
  onSearchChange,
  availableStores,
  onExportCsv,
  onExportExcel
}: Props) {
  const prevMonthStr = format(subMonths(currentDate, 1), "yyyy-MM");
  const nextMonthStr = format(addMonths(currentDate, 1), "yyyy-MM");
  const currentMonthDisplay = format(currentDate, "yyyy年MM月", { locale: ja });

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Month & Stores */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <Link href={`/sales?month=${prevMonthStr}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white text-slate-500 shadow-sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm font-black text-slate-700 min-w-[80px] text-center tracking-wider">
              {currentMonthDisplay}
            </span>
            <Link href={`/sales?month=${nextMonthStr}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white text-slate-500 shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStoreChange("all")}
              className={`h-8 px-4 text-xs font-bold rounded-md ${selectedStore === "all" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              全店舗
            </Button>
            {availableStores.map(store => (
              <Button
                key={store}
                variant="ghost"
                size="sm"
                onClick={() => onStoreChange(store)}
                className={`h-8 px-4 text-xs font-bold rounded-md ${selectedStore === store ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                {store}店
              </Button>
            ))}
          </div>
        </div>

        {/* Right Side: Search, Filters, Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 mr-2">
            <Checkbox 
              id="hideZero" 
              checked={hideZeroSales} 
              onCheckedChange={(c) => onHideZeroSalesChange(c as boolean)} 
              tabIndex={0}
              aria-label="売上ありのみ表示の切り替え"
            />
            <label htmlFor="hideZero" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
              売上ありのみ表示
            </label>
          </div>

          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="スタッフ・店舗で検索..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full md:w-48 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-50"
              aria-label="検索"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <CSVUploadButton />
            <Button variant="outline" size="sm" onClick={onExportCsv} className="h-9 font-bold bg-white text-slate-600 border-slate-300 shadow-sm flex-1 md:flex-none">
              <Download className="w-4 h-4 mr-1.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onExportExcel} className="h-9 font-bold bg-[#107c41] hover:bg-[#185c37] text-white border-transparent shadow-sm flex-1 md:flex-none">
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Excel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
