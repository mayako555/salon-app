"use client";

import { useEffect, useState } from "react";
import { getFundsDashboardData, addBankAccounts, saveBankBalances } from "./actions";
import type { BankAccount } from "./actions";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Wallet, Plus, Calendar, Save, Trash2, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO, subMonths } from "date-fns";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function FundsDashboardPage() {
  const { isCompanyOwner, isSystemOwner } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  // Setup Modal
  const [showSetup, setShowSetup] = useState(false);
  const [newAccounts, setNewAccounts] = useState<string[]>([""]);

  // Input Modal
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputDate, setInputDate] = useState("");
  const [inputBalances, setInputBalances] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [isCompanyOwner, isSystemOwner]);

  async function loadData() {
    if (!isCompanyOwner && !isSystemOwner) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const res = await getFundsDashboardData();
    if (res.success && res.data) {
      setData(res.data);
      if (res.data.accounts.length === 0) {
        setShowSetup(true);
      }
    } else {
      toast.error("データの取得に失敗しました");
    }
    setLoading(false);
  }

  const handleAddAccountField = () => {
    setNewAccounts([...newAccounts, ""]);
  };

  const handleAccountNameChange = (index: number, val: string) => {
    const updated = [...newAccounts];
    updated[index] = val;
    setNewAccounts(updated);
  };

  const handleRemoveAccountField = (index: number) => {
    const updated = newAccounts.filter((_, i) => i !== index);
    setNewAccounts(updated);
  };

  const handleSaveSetup = async () => {
    const valid = newAccounts.filter(n => n.trim() !== "");
    if (valid.length === 0) {
      toast.error("最低1つの口座または管理先を入力してください");
      return;
    }
    setIsSaving(true);
    const res = await addBankAccounts(valid);
    if (res.success) {
      toast.success("口座を登録しました");
      setShowSetup(false);
      await loadData();
    } else {
      toast.error(res.error || "エラーが発生しました");
    }
    setIsSaving(false);
  };

  const openInputModal = () => {
    // Default to end of last month
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    // Last day of last month
    const eom = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    setInputDate(format(eom, "yyyy-MM-dd"));
    
    // Prefill with 0 or latest details
    const prefill: Record<string, number> = {};
    if (data?.accounts) {
      data.accounts.forEach((acc: BankAccount) => {
        prefill[acc.id!] = 0; // default 0
      });
    }
    setInputBalances(prefill);
    setShowInputModal(true);
  };

  const handleSaveBalances = async () => {
    if (!inputDate) {
      toast.error("残高基準日を入力してください");
      return;
    }

    const payload = Object.entries(inputBalances).map(([account_id, amount]) => ({
      account_id,
      amount: Number(amount) || 0
    }));

    setIsSaving(true);
    const res = await saveBankBalances(inputDate, payload);
    if (res.success) {
      toast.success("残高を保存しました");
      setShowInputModal(false);
      await loadData();
    } else {
      toast.error(res.error || "保存に失敗しました");
    }
    setIsSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">読み込み中...</div>;
  }

  if (!isCompanyOwner && !isSystemOwner) {
    return <div className="p-8 text-center text-red-500">このページを閲覧する権限がありません。</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="text-indigo-600" />
            経営資金・現預金管理
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            会社の資金状況と現預金残高の推移を管理します。
          </p>
        </div>
        <div className="flex gap-2">
          {data?.accounts?.length > 0 && (
            <Button onClick={openInputModal} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
              <Plus className="mr-2 h-4 w-4" /> 残高を入力する
            </Button>
          )}
        </div>
      </div>

      {!data?.latestDate ? (
        <Card className="bg-slate-50 border-dashed border-2 text-center py-12">
          <CardContent>
            <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-4">まだ残高データがありません。</p>
            {data?.accounts?.length > 0 ? (
              <Button onClick={openInputModal}>最初の残高を入力する</Button>
            ) : (
              <Button onClick={() => setShowSetup(true)}>初期設定（口座登録）を始める</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dashboard Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet className="w-32 h-32" />
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-indigo-100 font-medium text-sm flex items-center gap-2">
                  現在の現預金合計
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-2">
                <div className="text-4xl md:text-5xl font-black tracking-tight">
                  ¥{data.currentTotal.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-indigo-100 bg-indigo-900/30 w-fit px-3 py-1 rounded-full">
                  <Calendar size={14} />
                  <span>{format(parseISO(data.latestDate), "yyyy年MM月dd日")} 時点</span>
                </div>
                <div className="text-xs text-indigo-200 mt-2">
                  最終更新: {data.lastUpdated ? format(parseISO(data.lastUpdated), "yyyy/MM/dd HH:mm") : "-"}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-500 font-medium text-sm">
                  前回入力時からの増減
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`text-3xl md:text-4xl font-black ${data.diff > 0 ? "text-emerald-600" : data.diff < 0 ? "text-rose-600" : "text-slate-700"}`}>
                    {data.diff > 0 ? "+" : ""}¥{data.diff.toLocaleString()}
                  </div>
                  {data.diff > 0 && <TrendingUp className="text-emerald-500 h-8 w-8" />}
                  {data.diff < 0 && <TrendingDown className="text-rose-500 h-8 w-8" />}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  キャッシュフローの簡易的な状況です。
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <Card className="lg:col-span-2 shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800">現預金残高の推移</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => {
                        const d = parseISO(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      tickFormatter={(val) => `¥${(val / 10000).toLocaleString()}万`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`¥${Number(value).toLocaleString()}`, "残高"]}
                      labelFormatter={(label) => format(parseISO(label), "yyyy年MM月dd日")}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#4f46e5" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Account Breakdown */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800">最新の口座別残高</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.accounts.map((acc: BankAccount) => {
                  const amount = data.latestDetails[acc.id!] || 0;
                  return (
                    <div key={acc.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="font-medium text-slate-700">{acc.name}</div>
                      <div className="font-bold text-slate-900">¥{amount.toLocaleString()}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Setup Modal */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>資金管理の初期設定</DialogTitle>
            <DialogDescription>
              事業で使用している銀行口座や現金管理先を登録してください。（例：PayPay銀行、日新信用金庫、手元現金 など）
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {newAccounts.map((acc, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`口座名 ${idx + 1}`}
                  value={acc}
                  onChange={(e) => handleAccountNameChange(idx, e.target.value)}
                />
                {newAccounts.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveAccountField(idx)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={handleAddAccountField} className="w-full text-indigo-600 border-indigo-200 border-dashed">
              <Plus size={16} className="mr-2" />
              口座を追加する
            </Button>
          </div>
          <DialogFooter>
            <Button disabled={isSaving} onClick={handleSaveSetup} className="bg-indigo-600 hover:bg-indigo-700 w-full">
              設定を保存して始める
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input Modal */}
      <Dialog open={showInputModal} onOpenChange={setShowInputModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>残高の入力</DialogTitle>
            <DialogDescription>
              対象となる残高の基準日（いつ時点の残高か）と、各口座の金額を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">残高基準日 <span className="text-red-500">*</span></Label>
              <Input 
                type="date" 
                value={inputDate} 
                onChange={e => setInputDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-3 mt-2">
              <Label className="font-bold text-slate-700">各口座の残高</Label>
              {data?.accounts?.map((acc: BankAccount) => (
                <div key={acc.id} className="flex items-center gap-3">
                  <div className="w-1/2 text-sm text-slate-600 truncate">{acc.name}</div>
                  <div className="w-1/2 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                    <Input 
                      type="number"
                      className="pl-8 text-right font-medium"
                      value={inputBalances[acc.id!] === 0 ? "" : inputBalances[acc.id!]}
                      onChange={e => setInputBalances({ ...inputBalances, [acc.id!]: Number(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInputModal(false)}>キャンセル</Button>
            <Button disabled={isSaving} onClick={handleSaveBalances} className="bg-indigo-600 hover:bg-indigo-700">
              <Save size={16} className="mr-2" />
              保存する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
