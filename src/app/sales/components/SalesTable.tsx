"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown } from "lucide-react";
import SalesRow, { StaffSalesData } from "./SalesRow";

type SortConfig = {
  key: "name" | "total" | "achievement" | "visits" | "totalAvg" | string;
  direction: "asc" | "desc";
};

type Props = {
  data: StaffSalesData[];
  availableStores: string[];
  onStaffClick: (staffId: string) => void;
};

const SalesTable = React.memo(function SalesTable({ data, availableStores, onStaffClick }: Props) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "total", direction: "desc" });

  const handleSort = (key: SortConfig["key"]) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortConfig.key) {
      case "name":
        aVal = a.name;
        bVal = b.name;
        break;
      case "total":
        aVal = a.totalSales;
        bVal = b.totalSales;
        break;
      case "visits":
        aVal = a.visits || 0;
        bVal = b.visits || 0;
        break;
      case "totalAvg":
        aVal = a.totalAvg || 0;
        bVal = b.totalAvg || 0;
        break;
      case "achievement":
        aVal = a.goal ? (a.totalSales / a.goal) : -1;
        bVal = b.goal ? (b.totalSales / b.goal) : -1;
        break;
      default:
        if (sortConfig.key.startsWith("store_")) {
          const storeName = sortConfig.key.replace("store_", "");
          aVal = a.storeSales[storeName]?.total || 0;
          bVal = b.storeSales[storeName]?.total || 0;
        }
        break;
    }

    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return <ChevronDown className="w-3 h-3 text-slate-300 inline ml-1" />;
    return sortConfig.direction === "asc" ? 
      <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" /> : 
      <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: SortConfig["key"]) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSort(key);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto w-full">
      <Table className="whitespace-nowrap min-w-[800px]">
        <TableHeader className="bg-slate-50">
          <TableRow className="border-b-2 border-slate-200">
            <TableHead 
              className="w-[80px] text-center text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-slate-300" 
              onClick={() => handleSort("total")}
              onKeyDown={(e) => handleKeyDown(e, "total")}
              tabIndex={0}
              aria-label="ランクで並び替え"
            >
              Rank {renderSortIcon("total")}
            </TableHead>
            <TableHead 
              className="text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-slate-300" 
              onClick={() => handleSort("name")}
              onKeyDown={(e) => handleKeyDown(e, "name")}
              tabIndex={0}
              aria-label="スタッフ名で並び替え"
            >
              スタッフ名 {renderSortIcon("name")}
            </TableHead>
            {availableStores.map(store => (
              <TableHead 
                key={store}
                className="text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-slate-300" 
                onClick={() => handleSort(`store_${store}`)}
                onKeyDown={(e) => handleKeyDown(e, `store_${store}`)}
                tabIndex={0}
                aria-label={`${store}店売上で並び替え`}
              >
                {store}店 {renderSortIcon(`store_${store}`)}
              </TableHead>
            ))}
            <TableHead 
              className="text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-slate-300" 
              onClick={() => handleSort("total")}
              onKeyDown={(e) => handleKeyDown(e, "total")}
              tabIndex={0}
              aria-label="合計売上で並び替え"
            >
              合計売上 {renderSortIcon("total")}
            </TableHead>
            <TableHead 
              className="text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-slate-300" 
              onClick={() => handleSort("visits")}
              onKeyDown={(e) => handleKeyDown(e, "visits")}
              tabIndex={0}
              aria-label="入客数で並び替え"
            >
              入客数 {renderSortIcon("visits")}
            </TableHead>
            <TableHead 
              className="text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-slate-300" 
              onClick={() => handleSort("totalAvg")}
              onKeyDown={(e) => handleKeyDown(e, "totalAvg")}
              tabIndex={0}
              aria-label="客単価で並び替え"
            >
              客単価 {renderSortIcon("totalAvg")}
            </TableHead>
            <TableHead 
              className="w-[150px] text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-slate-300" 
              onClick={() => handleSort("achievement")}
              onKeyDown={(e) => handleKeyDown(e, "achievement")}
              tabIndex={0}
              aria-label="達成率で並び替え"
            >
              達成率 {renderSortIcon("achievement")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                表示するデータがありません
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((staff, index) => (
              <SalesRow 
                key={staff.id} 
                data={staff} 
                rank={index + 1}
                availableStores={availableStores}
                onClick={() => onStaffClick(staff.id)} 
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
});

export default SalesTable;
