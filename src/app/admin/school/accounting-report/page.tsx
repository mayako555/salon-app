"use client";

import { useState, useEffect } from "react";
import { 
  getReservations,
  getAllPayments,
  getAllSales
} from "../reservation-actions";
import { SchoolReservation, SchoolPayment, SchoolSalesRecord } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Search, CreditCard, Banknote } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";

export default function AccountingReportPage() {
  const [activeTab, setActiveTab] = useState<"receivables" | "payments" | "sales">("receivables");
  const [reservations, setReservations] = useState<SchoolReservation[]>([]);
  const [payments, setPayments] = useState<SchoolPayment[]>([]);
  const [sales, setSales] = useState<SchoolSalesRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAccountant, impersonatingCompanyId } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, payData, salesData] = await Promise.all([
        getReservations(),
        getAllPayments(),
        getAllSales()
      ]);
      setReservations(resData);
      setPayments(payData);
      setSales(salesData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const receivables = reservations.filter(r => r.remaining_amount > 0);

  const exportCSV = (type: "receivables" | "payments" | "sales") => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    if (type === "receivables") {
      csvContent += "契約日,受講日,受講者名,講座名,契約金額,累計入金額,未収残高\n";
      receivables.forEach(r => {
        const cDate = r.contract_date || "";
        const row = [
          cDate, r.date, r.student_name, r.course_name, r.final_amount, r.paid_amount, r.remaining_amount
        ].map(v => `"${v}"`).join(",");
        csvContent += row + "\n";
      });
    } else if (type === "payments") {
      csvContent += "入金日,受講者名,講座名,入金種別,支払方法,入金額\n";
      payments.forEach(p => {
        const row = [
          p.payment_date, p.student_name || "不明", p.course_name || "不明", 
          p.payment_type === 'deposit' ? '申込金' : p.payment_type === 'balance' ? '残金・分割金' : p.payment_type === 'full' ? '一括' : '返金',
          p.payment_method === 'cash' ? '現金' : p.payment_method === 'bank_transfer' ? '銀行振込' : p.payment_method === 'credit_card' ? 'クレジットカード' : p.payment_method,
          p.amount
        ].map(v => `"${v}"`).join(",");
        csvContent += row + "\n";
      });
    } else if (type === "sales") {
      csvContent += "売上計上日,受講者名,講座名,売上金額\n";
      sales.forEach(s => {
        const row = [
          s.date, s.student_name || "不明", s.course_name || "不明", s.amount
        ].map(v => `"${v}"`).join(",");
        csvContent += row + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `school_accounting_${type}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="text-indigo-600" />
            経理レポート {impersonatingCompanyId && <Badge className="bg-amber-500">代理閲覧中</Badge>}
          </h1>
          <p className="text-slate-500 font-medium mt-1">未収金・入金・売上の管理とCSV出力</p>
        </div>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-200">
        <button
          onClick={() => setActiveTab("receivables")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors ${activeTab === "receivables" ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <Search size={16} /> 未収金管理
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors ${activeTab === "payments" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <CreditCard size={16} /> 入金履歴
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors ${activeTab === "sales" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <Banknote size={16} /> 売上履歴
        </button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
          <CardTitle className="text-lg font-black text-slate-800">
            {activeTab === "receivables" && "未収金一覧"}
            {activeTab === "payments" && "入金履歴"}
            {activeTab === "sales" && "売上履歴"}
          </CardTitle>
          <Button onClick={() => exportCSV(activeTab)} variant="outline" size="sm" className="font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <Download size={16} className="mr-2" />
            CSVダウンロード
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-bold">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  {activeTab === "receivables" && (
                    <tr>
                      <th className="px-4 py-3">契約日</th>
                      <th className="px-4 py-3">受講日</th>
                      <th className="px-4 py-3">受講者</th>
                      <th className="px-4 py-3">講座</th>
                      <th className="px-4 py-3 text-right">契約金額</th>
                      <th className="px-4 py-3 text-right">累計入金</th>
                      <th className="px-4 py-3 text-right text-rose-600">未収残高</th>
                    </tr>
                  )}
                  {activeTab === "payments" && (
                    <tr>
                      <th className="px-4 py-3">入金日</th>
                      <th className="px-4 py-3">受講者</th>
                      <th className="px-4 py-3">講座</th>
                      <th className="px-4 py-3">種別</th>
                      <th className="px-4 py-3">方法</th>
                      <th className="px-4 py-3 text-right">入金額</th>
                    </tr>
                  )}
                  {activeTab === "sales" && (
                    <tr>
                      <th className="px-4 py-3">売上計上日</th>
                      <th className="px-4 py-3">受講者</th>
                      <th className="px-4 py-3">講座</th>
                      <th className="px-4 py-3 text-right">売上金額</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === "receivables" && receivables.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">{r.contract_date || "-"}</td>
                      <td className="px-4 py-3">{r.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{r.student_name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.course_name}</td>
                      <td className="px-4 py-3 text-right">¥{r.final_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">¥{(r.paid_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-black text-rose-600">¥{r.remaining_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {activeTab === "payments" && payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-600">{p.payment_date}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{p.student_name || "不明"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.course_name || "不明"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-slate-50">
                          {p.payment_type === 'deposit' ? '申込金' : p.payment_type === 'balance' ? '残金・分割金' : p.payment_type === 'full' ? '一括' : '返金'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.payment_method === 'cash' ? '現金' : p.payment_method === 'bank_transfer' ? '銀行振込' : p.payment_method === 'credit_card' ? 'クレジットカード' : p.payment_method}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600">
                        {p.payment_type === 'refund' ? "-" : ""}¥{p.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {activeTab === "sales" && sales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-600">{s.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{s.student_name || "不明"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.course_name || "不明"}</td>
                      <td className="px-4 py-3 text-right font-black text-indigo-600">¥{s.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeTab === "receivables" && receivables.length === 0 && <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 border-b">未収金はありません</div>}
              {activeTab === "payments" && payments.length === 0 && <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 border-b">入金履歴はありません</div>}
              {activeTab === "sales" && sales.length === 0 && <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 border-b">売上履歴はありません</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
