"use client";
export const maxDuration = 60;

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  getExpensesDashboardData, 
  addExpense, 
  deleteExpense, 
  generateAiManagementAdvice, 
  getYayoiCsvData,
  parseYayoiPdfAction,
  parseYayoiTextAction,
  addExpensesBatch,
  getAnnualPnLData,
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
  X,
  Lock
} from "lucide-react";
import { format } from "date-fns";
import AuthGuard from "@/components/AuthGuard";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line
} from "recharts";

export default function AdminExpensesDashboard() {
  const { profile } = useAuth();
  
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [store, setStore] = useState("すべて");
  const [businessType, setBusinessType] = useState<"corporation" | "sole">("corporation");
  
  // Dashboard States
  const [sales, setSales] = useState(0);
  const [cashExpenses, setCashExpenses] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [financialOutflows, setFinancialOutflows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-calculated Fixed Costs States
  const [rent, setRent] = useState(0);
  const [salaries, setSalaries] = useState(0);
  const [marketing, setMarketing] = useState(0);

  // Search Filter
  const [search, setSearch] = useState("");

  // AI Advisor & Chart States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [annualData, setAnnualData] = useState<any[]>([]);

  // Yayoi PDF Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");

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
        setFinancialOutflows(res.totalFinancialOutflows || 0);
        setRent(res.autoRent || 0);
        setMarketing(res.autoMarketing || 0);
        setSalaries(res.autoSalaries || 0);
        setExpenses(res.expensesList || []);
      } else {
        toast.error("データの取得に失敗しました");
      }

      const annualRes = await getAnnualPnLData();
      if (annualRes.success && annualRes.data) {
        setAnnualData(annualRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("システムエラーが発生しました");
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
        rent,
        salaries,
        marketing
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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ファイルサイズは10MB以下にしてください");
      return;
    }

    setIsParsingPdf(true);
    setImportError(null);
    setParsedTransactions([]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          let mime = file.type;
          if (!mime && file.name.endsWith(".txt")) mime = "text/plain";
          if (!mime && file.name.endsWith(".csv")) mime = "text/csv";
          if (!mime && file.name.endsWith(".rtf")) mime = "text/rtf";
          if (mime === "application/rtf") mime = "text/rtf";
          const res = await parseYayoiPdfAction(base64Data, mime || "application/pdf");
          if (res.success && res.data) {
            setParsedTransactions(res.data);
            toast.success("取引履歴をAIで解析しました！");
          } else {
            setImportError(res.error || "取引履歴の解析に失敗しました");
            toast.error("解析エラーが発生しました");
          }
        } catch (err: any) {
          console.error("Asynchronous error during transaction parsing:", err);
          setImportError(err.message || "解析中に予期せぬエラーが発生しました");
          toast.error("解析エラーが発生しました");
        } finally {
          setIsParsingPdf(false);
        }
      };
      reader.onerror = () => {
        toast.error("ファイルの読み込み中にエラーが発生しました");
        setIsParsingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message);
      toast.error("エラーが発生しました");
      setIsParsingPdf(false);
    }
  };

  const handlePasteTextUpload = async () => {
    if (!pasteText.trim()) return;

    setIsParsingPdf(true);
    setImportError(null);
    setParsedTransactions([]);

    try {
      const res = await parseYayoiTextAction(pasteText);
      if (res.success && res.data) {
        setParsedTransactions(res.data);
        toast.success("テキストから取引履歴をAIで解析しました！");
      } else {
        setImportError(res.error || "取引履歴の解析に失敗しました");
        toast.error("解析エラーが発生しました");
      }
    } catch (err: any) {
      console.error("Asynchronous error during transaction parsing:", err);
      setImportError(err.message || "解析中に予期せぬエラーが発生しました");
      toast.error("解析エラーが発生しました");
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleApplyImportedExpenses = async () => {
    const validExpenses = parsedTransactions.filter(tx => !tx.is_duplicate_sales && (tx.classification === "経費" || tx.classification === "財務・税務"));
    if (validExpenses.length === 0) {
      toast.error("反映可能な経費取引が見つかりませんでした");
      return;
    }

    setIsParsingPdf(true); // Re-use parsing loading state for saving

    try {
      // Map to ExpenseRecord format
      const expensesToSave = validExpenses.map(tx => ({
        store_name: store === "すべて" ? "六甲" : store, // fallback if needed
        date: tx.date,
        category: tx.category,
        amount: tx.amount,
        description: tx.description,
        staff_name: profile?.name || "管理者",
        staff_id: profile?.id || "admin"
      }));

      const res = await addExpensesBatch(expensesToSave);
      
      if (res.success) {
        toast.success(`${res.count}件の経費をデータベースに登録しました！${res.skipped ? `（${res.skipped}件は重複としてスキップされました）` : ''}`);
        setIsImportModalOpen(false);
        setParsedTransactions([]);
        loadDashboardData(); // Refresh the list and chart
      } else {
        toast.error(res.error || "経費の保存に失敗しました");
      }
    } catch (error: any) {
      toast.error(error.message || "予期せぬエラーが発生しました");
    } finally {
      setIsParsingPdf(false);
    }
  };

  // Calculations
  const totalFixedExpenses = rent + salaries + marketing;
  const totalAllExpenses = cashExpenses + totalFixedExpenses;
  const netProfit = sales - totalAllExpenses;

  // Tax and Insurance Estimates
  const taxRate = businessType === "corporation" ? 0.3 : 0.25;
  const taxLabel = businessType === "corporation" ? "法人税等 (約30%)" : "所得税・住民税 (概算25%)";
  const estimatedIncomeTax = netProfit > 0 ? Math.floor(netProfit * taxRate) : 0;
  const valueAdded = sales - (totalAllExpenses - salaries);
  const estimatedConsumptionTax = valueAdded > 0 ? Math.floor(valueAdded * 0.1) : 0;
  const estimatedSocialInsurance = Math.floor(salaries * 0.15);
  const totalEstimatedTaxes = estimatedIncomeTax + estimatedConsumptionTax + estimatedSocialInsurance;
  const pureProfit = netProfit - totalEstimatedTaxes;

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
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl px-4 gap-2 text-xs"
            >
              <Brain size={14} className="text-amber-300" />
              弥生取引帳PDF・画像インポート
            </Button>

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">経費</span>
                  {isLoading ? (
                    <Loader2 className="animate-spin text-slate-300 w-5 h-5 mt-1" />
                  ) : (
                    <span className="text-lg font-black text-slate-800">¥{cashExpenses.toLocaleString()}</span>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">借入金・税金等</span>
                  {isLoading ? (
                    <Loader2 className="animate-spin text-slate-300 w-5 h-5 mt-1" />
                  ) : (
                    <span className="text-lg font-black text-rose-500">¥{financialOutflows.toLocaleString()}</span>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-emerald-200 shadow-sm rounded-2xl bg-emerald-50">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">手元に残る現金</span>
                  {isLoading ? (
                    <Loader2 className="animate-spin text-emerald-300 w-5 h-5 mt-1" />
                  ) : (
                    <span className={`text-lg font-black flex items-center gap-1 ${(netProfit - financialOutflows) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {(netProfit - financialOutflows) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      ¥{(netProfit - financialOutflows).toLocaleString()}
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly P&L Chart */}
            <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-100 p-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-emerald-500" />
                  月次収支トレンド (過去12ヶ月)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={annualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        tickFormatter={(val) => val.substring(5)} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        tickFormatter={(val) => `¥${(val / 10000).toLocaleString()}万`} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        formatter={(value: any) => `¥${Number(value).toLocaleString()}`}
                        labelFormatter={(label) => `${label}月`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="expenses" name="経費" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="financialOutflow" name="借入金・税" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line type="monotone" dataKey="sales" name="売上" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="cashFlow" name="最終キャッシュ" stroke="#6366f1" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3, strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

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
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="text-slate-500 w-4.5 h-4.5" />
                    今月のサロン固定経費の入力
                  </CardTitle>
                  <p className="text-[10px] text-slate-400 mt-0.5">人件費や地代家賃などの基本固定費を想定して収支差額を算出します。</p>
                </div>
                
                <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                  <button 
                    onClick={() => setBusinessType("corporation")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${businessType === "corporation" ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    法人
                  </button>
                  <button 
                    onClick={() => setBusinessType("sole")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${businessType === "sole" ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    個人事業主
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">地代家賃 (賃料)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">¥</span>
                      <div className="h-9 bg-slate-50 border border-slate-200 pl-6 pr-8 text-xs font-bold rounded-lg flex items-center text-slate-700">
                        {rent.toLocaleString()}
                      </div>
                      <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 w-3 h-3" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">人件費 (給与含む)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">¥</span>
                      <div className="h-9 bg-slate-50 border border-slate-200 pl-6 pr-8 text-xs font-bold rounded-lg flex items-center text-slate-700">
                        {salaries.toLocaleString()}
                      </div>
                      <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 w-3 h-3" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">広告宣伝費 (HPB等)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">¥</span>
                      <div className="h-9 bg-slate-50 border border-slate-200 pl-6 pr-8 text-xs font-bold rounded-lg flex items-center text-slate-700">
                        {marketing.toLocaleString()}
                      </div>
                      <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 w-3 h-3" />
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

                  {/* Tax & Insurance Estimates */}
                  <div className="mt-2 bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 mb-1">
                      <Wallet size={12} />
                      <span>翌月以降の納税・支払準備金 (目安)</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{taxLabel}:</span>
                      <span>¥{estimatedIncomeTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>消費税 (概算10%):</span>
                      <span>¥{estimatedConsumptionTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>社会保険料 (会社負担分):</span>
                      <span>¥{estimatedSocialInsurance.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-amber-200/50 my-1" />
                    <div className="flex justify-between text-xs text-amber-900 font-bold">
                      <span>準備金 合計目安:</span>
                      <span>¥{totalEstimatedTaxes.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Pure Profit */}
                  <div className="mt-1 flex justify-between items-center text-sm font-black p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="flex items-center gap-1.5"><Wallet size={16} /> 最終的に手元に残るお金:</span>
                    <span>¥{pureProfit.toLocaleString()}</span>
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

        {/* Modal: Yayoi PDF/Image Import */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
                 <div>
                    <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                      <Brain className="text-emerald-600 w-5 h-5" />
                      弥生取引帳PDF・画像インポート（AI解析）
                    </h3>
                    <p className="text-[10px] text-slate-500">PDFや画像から取引データを一瞬で抽出し、売上重複をチェックします。</p>
                 </div>
                 <button 
                   onClick={() => {
                     setIsImportModalOpen(false);
                     setParsedTransactions([]);
                     setImportError(null);
                   }}
                   className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm"
                 >
                   <X size={18} />
                 </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Uploader Box */}
                {!isParsingPdf && parsedTransactions.length === 0 && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100/50 hover:border-emerald-300 transition-all cursor-pointer relative group">
                      <input 
                        type="file" 
                        accept="application/pdf,image/png,image/jpeg,text/plain,text/csv,text/rtf,application/rtf,.rtf,.txt,.csv"
                        onChange={handlePdfUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-700 block">ここに取引履歴のPDF、テキスト、またはスクリーンショット画像をドロップ</span>
                      <span className="text-[10px] text-slate-400 block mt-1">対応形式: PDF, TXT, RTF, CSV, PNG, JPEG (最大10MB)</span>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400 font-bold">または</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="text-[10px] font-bold text-slate-500">テキストを直接貼り付け</label>
                      <textarea
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="取引履歴のテキストをここにペーストしてください..."
                        className="w-full h-24 p-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white outline-none resize-none"
                      />
                      <Button
                        onClick={handlePasteTextUpload}
                        disabled={!pasteText.trim()}
                        className="self-end bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-lg px-4"
                      >
                        テキストを解析する
                      </Button>
                    </div>
                  </div>
                )}

                {/* Parsing Status */}
                {isParsingPdf && (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-4 bg-slate-50 rounded-xl border border-slate-100 p-8 animate-pulse">
                    <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">AIが弥生取引履歴を解析中...</span>
                      <span className="text-[10px] text-slate-400 block mt-1.5 leading-relaxed max-w-sm mx-auto">
                        画像をOCR処理し、日付、科目、摘要、金額を構造化しています。また、PayPayやAirPAYなどの入金が売上日報と二重カウントされていないか検出中。
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {importError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold leading-relaxed flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span>⚠️ 解析エラーが発生しました</span>
                    </div>
                    <p className="text-[10px] text-rose-600 font-medium">{importError}</p>
                    <button 
                      onClick={() => setImportError(null)}
                      className="text-rose-700 hover:underline text-[10px] font-bold text-left self-start mt-1"
                    >
                      もう一度アップロードする
                    </button>
                  </div>
                )}

                {/* Parsed Transactions List */}
                {parsedTransactions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 block">🎉 取引抽出が完了しました！</span>
                        <span className="text-[9px] text-emerald-600 block mt-0.5">
                          全 {parsedTransactions.length} 件の取引データを検出。売上重複を除外した経費のみをP&Lに反映できます。
                        </span>
                      </div>
                      <button 
                        onClick={() => setParsedTransactions([])}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        再アップロード
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                            <th className="px-3 py-2.5">取引日</th>
                            <th className="px-3 py-2.5">科目</th>
                            <th className="px-3 py-2.5">摘要</th>
                            <th className="px-3 py-2.5 text-right">金額</th>
                            <th className="px-3 py-2.5 text-center">AIチェック状況</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedTransactions.map((tx, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-3 py-2.5 text-slate-700 font-medium whitespace-nowrap">{tx.date}</td>
                              <td className="px-3 py-2.5 font-bold text-slate-600">{tx.category}</td>
                              <td className="px-3 py-2.5 text-slate-500 truncate max-w-[150px]" title={tx.description}>
                                {tx.description}
                              </td>
                              <td className="px-3 py-2.5 text-right font-black text-slate-800">¥{tx.amount?.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-center">
                                {tx.is_duplicate_sales ? (
                                  <span 
                                    className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-block cursor-help animate-pulse"
                                    title={tx.reason}
                                  >
                                    ⚠️ 売上重複検知
                                  </span>
                                ) : tx.classification === "経費" ? (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                                    経費（反映対象）
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200 inline-block">
                                    対象外 ({tx.classification || "振替"})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedTransactions([]);
                    setImportError(null);
                  }}
                  className="h-9 text-xs rounded-lg border-slate-200"
                >
                  閉じる
                </Button>
                {parsedTransactions.length > 0 && (
                  <Button 
                    onClick={handleApplyImportedExpenses}
                    disabled={isParsingPdf}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-lg px-4 gap-1.5 shadow-sm"
                  >
                    {isParsingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={12} className="text-amber-300" />}
                    データベースに一括登録する
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
