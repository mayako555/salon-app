"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Calendar, X } from "lucide-react";
import { SalesRecord } from "./actions";

export default function SalesExportCSVButton({ sales }: { sales: SalesRecord[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(sales[0]?.date || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleDownload = () => {
    // Filter by dates
    const filteredSales = sales.filter(s => s.date >= startDate && s.date <= endDate);

    // Basic CSV headers
    const headers = [
      "日付",
      "店舗",
      "スタッフ名",
      "お客様名",
      "メニュー",
      "毛質・マテリアル",
      "予約オプション",
      "予約経路",
      "技術売上",
      "店販売上",
      "支払方法",
      "予約手数料",
      "指名有無"
    ];

    const rows = filteredSales.map(s => [
      s.date,
      s.store_name,
      s.staff_name,
      s.customer_name || "不明",
      s.menu_course || "-",
      s.hair_material || "なし",
      s.options || "なし",
      s.reservation_route || "その他",
      s.tech_sales.toString(),
      s.product_sales.toString(),
      s.payment_method,
      (s.portal_fee || 0).toString(),
      s.is_nominated ? "指名" : "フリー"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    // Add BOM for Excel compatibility in Japanese
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_export_${startDate}_to_${endDate}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="hidden sm:flex gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700">
        <Download size={16} />
        <span>CSV期間出力</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
               <h3 className="font-bold flex items-center gap-2"><Calendar size={18}/> CSV出力の期間選択</h3>
               <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200">
                 <X size={20} />
               </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">開始日</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2 rounded-md" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">終了日</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2 rounded-md" />
              </div>
              
              <Button onClick={handleDownload} className="w-full gap-2">
                <Download size={16}/> CSVをダウンロード
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
