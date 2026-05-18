"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  getExpensesDashboardData, 
  addExpense, 
  deleteExpense, 
  generateAiManagementAdvice, 
  getYayoiCsvData,
  ExpenseRecord 
} from "@/app/admin/expenses/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Sparkles, 
  Search, 
  Trash2, 
  Plus, 
  Loader2, 
  Brain,
  Calendar,
  Layers,
  ArrowRightLeft,
  X
} from "lucide-react";
import { format } from "date-fns";
import AuthGuard from "@/components/AuthGuard";
import { toast } from "sonner";

export default function AdminExpensesDashboard() {
  const { profile } = useAuth();
  
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [store, setStore] = useState("すべて");
  
  // Dashboard States
  const [sales, setSales] = useState(0);
  const [cashExpenses, setCashExpenses] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Custom Fixed Costs States
  const [rent, setRent] = useState("150000");
  const [salaries, setSalaries] = useState("450000");
  const [marketing, setMarketing] = useState("100000");

  // Search Filter
  const [search, setSearch] = useState("");

  // AI Advisor States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // New Expense Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDate, setNewDate] = useState(format(now, "yyyy-MM-dd"));
  const [newStore, setNewStore] = useState("六甲");
  const [newCategory, setNewCategory] = useState("消耗品費");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const STORES = ["六甲", "元町", "神戸"];
  const CATEGORIES = ["消耗品費", "旅費交通費", "通信費", "水道光熱費", "広告宣伝費", "雑費", "地代家賃", "給料手当", "その他"];

  useEffect(() => {
    loadDashboardData();
  }, [year, month]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setAiReport(null);
    try {
      const res = await getExpensesDashboardData(year, month);
      if (res.success) {
        setSales(res.totalSales || 0);
        setCashExpenses(res.totalCashExpenses || 0);
        setExpenses(res.expensesList || []);
      } else {
        toast.error("データの取得に失敗しました");
      }
    } catch (err) {
      console.error(err);
      toast.error("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvContent = await getYayoiCsvData(year, month, store === "すべて" ? undefined : store);
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `yayoi_expenses_${year}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("弥生会計インポートCSVを出力しました");
    } catch (err) {
      toast.error("CSVエクスポート中にエラーが発生しました");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!newAmount || parseInt(newAmount, 10) <= 0) {
      toast.error("正しい金額を入力してください");
      return;
    }
    if (!newDesc.trim()) {
      toast.error("用途を入力してください");
      return;
    }

    setIsSavingExpense(true);
    try {
      const res = await addExpense({
        store_name: newStore,
        date: newDate,
        category: newCategory,
        amount: parseInt(newAmount, 10),
        description: newDesc.trim(),
        staff_name: "管理者",
        staff_id: "admin"
      });

      if (res.success) {
        toast.success("経費を新しく追加しました");
        setNewAmount("");
        setNewDesc("");
        setIsModalOpen(false);
        loadDashboardData();
      } else {
        toast.error(res.error || "経費の追加に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("この経費データを削除してよろしいですか？")) return;
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        toast.success("経費を削除しました");
        loadDashboardData();
      } else {
        toast.error("削除に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    }
  };

  const handleGenerateAiAdvice = async () => {
    setIsGeneratingAi(true);
    setAiReport(null);
    try {
      const costs = {
        rent: parseInt(rent, 10) || 0,
        salaries: parseInt(salaries, 10) || 0,
        marketing: parseInt(marketing, 10) || 0
      };
      
      const res = await generateAiManagementAdvice(year, month, costs);
      if (res.success) {
        setAiReport(res.report!);
        toast.success("AI経営分析レポートが完了しました");
      } else {
        toast.error(res.error || "AI分析の生成に失敗しました");
      }
    } catch (err) {
      toast.error("AI分析の生成中にエラーが発生しました");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Calculations
  const customRent = parseInt(rent, 10) || 0;
  const customSalaries = parseInt(salaries, 10) || 0;
  const customMarketing = parseInt(marketing, 10) || 0;

  const totalFixedExpenses = customRent + customSalaries + customMarketing;
  const totalAllExpenses = cashExpenses + totalFixedExpenses;
  const netProfit = sales - totalAllExpenses;

  // Filtered Expenses for Display List
  const filteredExpenses = expenses.filter(exp => {
    const matchesStore = store === "すべて" || exp.store_name === store;
    const matchesSearch = search.trim() === "" || 
      exp.category.includes(search) || 
      exp.description.includes(search) || 
      exp.staff_name.includes(search);
    return matchesStore && matchesSearch;
  });

  // Custom Markdown Parser for Beautiful Premium rendering of AI adviser results
  const renderAiReport = (text: string) => {
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-lg font-black text-slate-800 mt-6 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-sm font-extrabold text-slate-700 mt-4 mb-2 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full"></div>
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("- ") || line.startsWith("・")) {
        const content = line.substring(2);
        const boldParts = content.split(/\*\*(.*?)\*\*/g);
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-600 mb-1.5 leading-relaxed">
            {boldParts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-extrabold text-emerald-800 bg-emerald-50 px-1 rounded">{part}</strong> : part)}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={idx} className="text-xs text-slate-600 mb-2 leading-relaxed">
          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-extrabold text-slate-800 bg-amber-50 px-1 rounded">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <AuthGuard requireRole="manager">
      <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4 md:px-0">
        
        {/* Header Control Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl shadow-sm border border-emerald-200">
              <Wallet className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">経費・収支管理ダッシュボード</h1>
              <p className="text-xs text-slate-500 mt-0.5">サロン店舗のキャッシュフロー把握、経費監査、およびAI経営アドバイスレポート</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Year */}
            <Select value={year.toString()} onValueChange={val => setYear(parseInt(val, 10))}>
              <SelectTrigger className="w-24 h-10 bg-slate-50 border-slate-200 text-xs font-bold rounded-xl">
                <SelectValue placeholder="年" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025年</SelectItem>
                <SelectItem value="2026">2026年</SelectItem>
                <SelectItem value="2027">2027年</SelectItem>
              </SelectContent>
            </Select>

            {/* Month */}
            <Select value={month.toString()} onValueChange={val => setMonth(parseInt(val, 10))}>
              <SelectTrigger className="w-24 h-10 bg-slate-50 border-slate-200 text-xs font-bold rounded-xl">
                <SelectValue placeholder="月" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>{m}月</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Store Filter */}
            <Select value={store} onValueChange={setStore}>
              <SelectTrigger className="w-28 h-10 bg-slate-50 border-slate-200 text-xs font-bold rounded-xl">
                <SelectValue placeholder="店舗" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="すべて">全店</SelectItem>
                {STORES.map(s => <SelectItem key={s} value={s}>{s}店</SelectItem>)}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleExportCsv} 
              disabled={isLoading || expenses.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-xl px-4 gap-2 text-xs"
            >
              <Download size={14} />
              弥生会計インポートCSV
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Expense List & Yayoi Book (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Quick Cards Grid */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">総売上（実績）</span>
                  {isLoading ? (
                    <Loader2 className="animate-spin text-slate-300 w-5 h-5 mt-1" />
                  ) : (
                    <span className="text-lg font-black text-slate-800">¥{sales.toLocaleString()}</span>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">現金経費（スタッフ入力）</span>
                  {isLoading ? (
                    <Loader2 className="animate-spin text-slate-300 w-5 h-5 mt-1" />
                  ) : (
                    <span className="text-lg font-black text-slate-800">¥{cashExpenses.toLocaleString()}</span>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">収支差額 (利益残高)</span>
                  {isLoading ? (
                    <Loader2 className="animate-spin text-slate-300 w-5 h-5 mt-1" />
                  ) : (
                    <span className={`text-lg font-black flex items-center gap-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      ¥{netProfit.toLocaleString()}
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Expenses List */}
            <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-100 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">現金経費帳簿</CardTitle>
                  <p className="text-[10px] text-slate-400 mt-0.5">スタッフおよび管理者が登録した経費ログ</p>
                </div>
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 rounded-xl px-3 gap-1.5 text-xs"
                >
                  <Plus size={14} />
                  手動で追加
                </Button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input 
                    placeholder="勘定科目、用途、または登録者名で検索..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-10 bg-slate-50 border-slate-200 rounded-xl pl-9 text-xs focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                  />
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                    <p className="text-slate-400 text-xs font-semibold">経費データを読み込み中...</p>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8">
                    <Wallet size={32} className="text-slate-300 mb-2" />
                    <p className="text-slate-600 font-bold text-xs">経費レコードはありません</p>
                    <p className="text-slate-400 text-[10px] mt-1">選択された期間、または検索条件に合う経費は見つかりませんでした。</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                          <th className="px-4 py-3">日付</th>
                          <th className="px-4 py-3">店舗</th>
                          <th className="px-4 py-3">勘定科目</th>
                          <th className="px-4 py-3">摘要（用途）</th>
                          <th className="px-4 py-3">登録者</th>
                          <th className="px-4 py-3 text-right">金額</th>
                          <th className="px-4 py-3 text-center w-12">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-slate-700 font-semibold">{exp.date}</td>
                            <td className="px-4 py-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {exp.store_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600">{exp.category}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={exp.description}>
                              {exp.description}
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-medium">{exp.staff_name}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-800">¥{exp.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <button 
                                onClick={() => handleDeleteExpense(exp.id!)}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT: Fixed Costs Input & AI advisor (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Custom Fixed Costs Panel */}
            <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="text-slate-500 w-4.5 h-4.5" />
                  今月のサロン固定経費の入力
                </CardTitle>
                <p className="text-[10px] text-slate-400 mt-0.5">人件費や地代家賃などの基本固定費を想定して収支差額を算出します。</p>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">地代家賃 (賃料)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">¥</span>
                      <Input 
                        type="number"
                        value={rent}
                        onChange={e => setRent(e.target.value)}
                        className="h-9 bg-slate-50 border-slate-200 pl-6 text-xs font-bold rounded-lg focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">人件費 (給与含む)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">¥</span>
                      <Input 
                        type="number"
                        value={salaries}
                        onChange={e => setSalaries(e.target.value)}
                        className="h-9 bg-slate-50 border-slate-200 pl-6 text-xs font-bold rounded-lg focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">広告宣伝費 (HPB等)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">¥</span>
                      <Input 
                        type="number"
                        value={marketing}
                        onChange={e => setMarketing(e.target.value)}
                        className="h-9 bg-slate-50 border-slate-200 pl-6 text-xs font-bold rounded-lg focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit/Loss summary */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex flex-col gap-1.5 font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span>総売上:</span>
                    <span className="text-slate-800 font-black">¥{sales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>総経費 (固定 + 現金):</span>
                    <span className="text-rose-600 font-black">¥{totalAllExpenses.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-0.5" />
                  <div className="flex justify-between text-sm">
                    <span>営業差額利益:</span>
                    <span className={netProfit >= 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                      ¥{netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Advisor Panel */}
            <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 animate-pulse" />
                  <div>
                    <CardTitle className="text-sm font-bold">AI経営分析コンサルタント</CardTitle>
                    <p className="text-[10px] text-emerald-100 mt-0.5">Gemini-2.5-Flashによるサロン業績 & コスト最適化アドバイス</p>
                  </div>
                </div>
                <Sparkles size={16} className="text-amber-300" />
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col">
                {isGeneratingAi ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <Loader2 className="animate-spin text-emerald-600" size={36} />
                    <div>
                      <p className="text-slate-700 font-bold text-sm">AIコンサルタントが分析中...</p>
                      <p className="text-slate-400 text-[10px] mt-1">今月の客単価、次回予約率、稼働率、経費率を統合分析しています。</p>
                    </div>
                  </div>
                ) : aiReport ? (
                  <div className="space-y-4">
                    <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-4 max-h-[500px] overflow-y-auto">
                      {renderAiReport(aiReport)}
                    </div>
                    <Button 
                      onClick={() => setAiReport(null)}
                      variant="outline"
                      className="w-full text-xs font-bold border-slate-200 h-9 rounded-lg"
                    >
                      閉じて再生成する
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mb-3 shadow-inner">
                      <Brain size={24} className="text-emerald-500" />
                    </div>
                    <p className="text-slate-700 font-bold text-sm">今月のAI経営診断を実行しましょう</p>
                    <p className="text-slate-400 text-[10px] max-w-[300px] mt-1.5 leading-normal">
                      売上や次回予約率などの業績データに加え、スタッフ現金経費や入力された固定費を考慮した、サロン専門AIアドバイザーの診断レポートを即座に生成します。
                    </p>
                    <Button 
                      onClick={handleGenerateAiAdvice}
                      disabled={isLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl mt-5 gap-2 text-xs shadow-md shadow-emerald-600/10 transition-all hover:scale-[1.01] active:scale-[0.98]"
                    >
                      <Sparkles size={14} className="text-amber-300" />
                      AI経営レポートを生成する
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Modal: New Expense */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-auto animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
                 <div>
                    <h3 className="font-bold text-base text-slate-800">経費の手動追加（管理者）</h3>
                    <p className="text-[10px] text-slate-500">管理者として経費を入力します。</p>
                 </div>
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm"
                 >
                   <X size={18} />
                 </button>
              </div>
              
              <form onSubmit={handleAddExpense} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">支払日付</label>
                  <Input 
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="h-10 text-xs rounded-lg bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">店舗</label>
                  <Select value={newStore} onValueChange={setNewStore}>
                    <SelectTrigger className="h-10 text-xs rounded-lg bg-slate-50 border-slate-200">
                      <SelectValue placeholder="店舗" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORES.map(s => <SelectItem key={s} value={s}>{s}店</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">勘定科目</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="h-10 text-xs rounded-lg bg-slate-50 border-slate-200">
                      <SelectValue placeholder="科目" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">金額</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">¥</span>
                    <Input 
                      type="number"
                      placeholder="0"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      required
                      min="1"
                      className="h-10 pl-7 text-sm font-bold rounded-lg bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">用途・内容</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    required
                    rows={3}
                    placeholder="用途や内容を記入してください"
                    className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white outline-none text-slate-800"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsModalOpen(false)}
                    className="h-9 text-xs rounded-lg border-slate-200"
                  >
                    キャンセル
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSavingExpense}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-lg px-4"
                  >
                    {isSavingExpense ? "追加中..." : "追加する"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
