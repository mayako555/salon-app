"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { MonthlyStatement } from "./actions";

export default function CSVExportButton({ statements, year, month }: { statements: MonthlyStatement[], year: number, month: number }) {
  
  const handleExport = () => {
    if (statements.length === 0) return;

    // Build standard CSV rows
    const headers = [
      "スタッフ名", 
      "雇用形態",
      "総請求額/支給額",
      "手当合計",
      "消費税加算", 
      "基本給/ベース報酬", 
      "実働時間", 
      "（参考）税抜総技術売上", 
      "（参考）税抜総店販売上", 
      "（参考）総指名件数", 
      "計算ステータス"
    ];

    const rows = statements.map(stmt => {
      const typeLabel = stmt.type === "salary" ? "給与(社員/パート)" : "業務委託(報酬)";
      return [
        stmt.staff_name,
        typeLabel,
        stmt.final_paid_amount,
        stmt.total_allowances,
        stmt.details.tax_addition,
        stmt.base_amount,
        stmt.details.metrics.worked_hours || 0,
        stmt.details.metrics.total_tech_sales,
        stmt.details.metrics.total_product_sales,
        stmt.details.metrics.nomination_count,
        stmt.status === "closed" ? "確定済" : "仮計算"
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // utf-8 bom for excel

    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `payroll_export_${year}_${String(month).padStart(2, '0')}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleExport}
      disabled={statements.length === 0}
      className="bg-white gap-2 font-semibold"
    >
      <Download size={16} className="text-slate-500" />
      CSV出力
    </Button>
  );
}
