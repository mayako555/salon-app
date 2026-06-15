"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  getCashTransactions, 
  calculateCurrentCash, 
  CashTransactionRecord,
  verifyCashTransaction,
  deleteCashTransaction
} from "@/app/cash/actions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle, Clock, Trash2, Wallet, Banknote, RefreshCcw } from "lucide-react";
import CashTransactionDialog from "./CashTransactionDialog";

export default function CashManagementPage() {
  const { profile, isAdmin, selectedStore, availableStores } = useAuth();
  const [transactions, setTransactions] = useState<CashTransactionRecord[]>([]);
  const [currentCash, setCurrentCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [storeName, setStoreName] = useState<string>(selectedStore || "メイン店舗"); // Default or from context
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    if (selectedStore) {
      setStoreName(selectedStore);
    }
  }, [selectedStore]);

  const loadData = async () => {
    if (!storeName) return;
    setLoading(true);
    try {
      const trans = await getCashTransactions(year, month, storeName);
      setTransactions(trans);
      const cash = await calculateCurrentCash(storeName);
      setCurrentCash(cash);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month, storeName]);

  const handleVerify = async (id: string) => {
    if (!confirm("入金を確認済みにしますか？")) return;
    await verifyCashTransaction(id, profile?.name || "Unknown");
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    await deleteCashTransaction(id, profile?.name || "Unknown");
    loadData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            現金売上の回収・入金管理
          </h1>
          <p className="text-slate-500 mt-1 text-sm">現金売上のうち、まだ銀行入金・オーナー回収が終わっていない未回収金額を確認・報告します。</p>
        </div>
        
        {/* Stores Select if Admin */}
        {isAdmin && availableStores.length > 1 && (
          <select 
            value={storeName} 
            onChange={(e) => setStoreName(e.target.value)}
            className="border-slate-300 rounded-md text-sm py-2 px-3 focus:border-emerald-500 focus:ring-emerald-500"
          >
            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-center p-6 items-center text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Banknote className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-500 mb-2">未回収の現金売上 ({storeName}店)</h3>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">
            ¥{currentCash.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            過去の全現金売上から、<br/>報告済みの回収・入金額を引いた金額です<br/>
            （※お釣り用のレジ金3万円は含まれません）
          </p>
        </div>

        {/* List Card */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="text-sm border-slate-200 rounded-md py-1 px-2">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="text-sm border-slate-200 rounded-md py-1 px-2">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}月</option>)}
              </select>
            </div>
            
            <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9">
              <Plus className="w-4 h-4 mr-2" />
              回収・入金報告
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>日付</TableHead>
                <TableHead>種類</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>スタッフ</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">読込中...</TableCell></TableRow>
              ) : transactions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">今月の入金・回収記録はありません</TableCell></TableRow>
              ) : (
                transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-slate-700">{t.date}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-max ${
                        t.type === 'collection' ? 'bg-indigo-100 text-indigo-700' :
                        t.type === 'adjustment' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {t.type === 'collection' ? 'オーナー回収' : 
                         t.type === 'adjustment' ? '残高調整' : 
                         '銀行入金'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-800">
                      ¥{t.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{t.staff_name}</TableCell>
                    <TableCell>
                      {t.status === 'verified' ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle className="w-4 h-4" /> 確認済
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Clock className="w-4 h-4" /> 入金報告済 (未確認)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      {isAdmin && t.status === 'pending' && (
                        <Button variant="outline" size="sm" className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleVerify(t.id!)}>
                          着金を確認
                        </Button>
                      )}
                      {(isAdmin || t.staff_name === profile?.name) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(t.id!)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CashTransactionDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSuccess={() => { setIsDialogOpen(false); loadData(); }} 
        storeName={storeName}
        isAdmin={isAdmin}
      />
    </div>
  );
}
