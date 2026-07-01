"use client";

import { useState, useEffect } from "react";
import { getDebugSales } from "./actions";
import { SalesRecord } from "@/app/sales/actions";
import { Button } from "@/components/ui/button";

export default function SalesDebugPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [year, month]);

  const fetchSales = async () => {
    setLoading(true);
    const data = await getDebugSales(year, month);
    setSales(data);
    setLoading(false);
  };

  const statusColors: any = {
    "CSV_ONLY": "bg-blue-100 text-blue-700",
    "MERGED_PRIMARY": "bg-emerald-100 text-emerald-700",
    "MANUAL_ONLY": "bg-amber-100 text-amber-700",
    "MERGED_SOURCE": "bg-slate-100 text-slate-500 line-through",
    "DELETED": "bg-red-100 text-red-700 line-through"
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">売上データ 結合・照合デバッグ</h1>
      
      <div className="flex gap-4 mb-6">
        <select 
          className="border p-2 rounded" 
          value={year} 
          onChange={e => setYear(Number(e.target.value))}
        >
          {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select 
          className="border p-2 rounded" 
          value={month} 
          onChange={e => setMonth(Number(e.target.value))}
        >
          {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
        <Button onClick={fetchSales} disabled={loading}>
          {loading ? "読込中..." : "再読込"}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">日時</th>
              <th className="px-4 py-3">スタッフ</th>
              <th className="px-4 py-3">顧客名</th>
              <th className="px-4 py-3">技術</th>
              <th className="px-4 py-3">店販</th>
              <th className="px-4 py-3">指名</th>
              <th className="px-4 py-3">割引</th>
              <th className="px-4 py-3 font-bold">総額(実払)</th>
              <th className="px-4 py-3">ソース</th>
              <th className="px-4 py-3">マージ状態</th>
              <th className="px-4 py-3">結合先ID</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => {
              const total = (s.tech_sales || 0) + (s.product_sales || 0) + (s.nomination_fee || 0) - (s.discount || 0);
              return (
                <tr key={s.id} className={`border-b hover:bg-slate-50 ${s.merge_status === 'DELETED' || s.merge_status === 'MERGED_SOURCE' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 font-mono text-[10px] text-slate-500">{s.id.slice(0,6)}...</td>
                  <td className="px-4 py-2 whitespace-nowrap">{s.date} {s.time}</td>
                  <td className="px-4 py-2">{s.staff_name}</td>
                  <td className="px-4 py-2">{s.customer_name}</td>
                  <td className="px-4 py-2 text-right">¥{(s.tech_sales||0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">¥{(s.product_sales||0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">¥{(s.nomination_fee||0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-red-500">¥{(s.discount||0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-bold">¥{total.toLocaleString()}</td>
                  <td className="px-4 py-2">{s.source}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[s.merge_status || "MANUAL_ONLY"]}`}>
                      {s.merge_status || "未設定"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px]">{s.merged_into_id ? s.merged_into_id.slice(0,6) + "..." : "-"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm space-y-2">
        <p><strong>CSV_ONLY:</strong> HotPepper CSVから取り込まれ、手入力データと結びついていないデータ（通常状態）</p>
        <p><strong>MERGED_PRIMARY:</strong> HotPepper CSVから取り込まれ、手入力データと結合され、情報が補完されたデータ</p>
        <p><strong>MANUAL_ONLY:</strong> 手入力されたが、HotPepperデータと一致しなかったデータ（未結合）</p>
        <p><strong>MERGED_SOURCE:</strong> CSVデータと結合され、非表示（履歴用）となった手入力データ</p>
      </div>
    </div>
  )
}
