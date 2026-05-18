"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getExpenses, addExpense, deleteExpense, ExpenseRecord } from "@/app/admin/expenses/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet, 
  Store, 
  Tag, 
  JapaneseYen, 
  Send, 
  AlertCircle,
  FileText,
  Trash2,
  Loader2,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import AuthGuard from "@/components/AuthGuard";
import { toast } from "sonner";

export default function StaffExpensesPage() {
  const { profile, selectedStore } = useAuth();
  
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [storeName, setStoreName] = useState("六甲");
  const [category, setCategory] = useState("消耗品費");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [history, setHistory] = useState<ExpenseRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const STORES = ["六甲", "元町", "神戸"];
  const CATEGORIES = ["消耗品費", "旅費交通費", "通信費", "水道光熱費", "広告宣伝費", "雑費", "その他"];

  useEffect(() => {
    if (selectedStore) {
      // Normalize selectedStore to match "六甲" or "元町" or "神戸"
      const matched = STORES.find(s => selectedStore.includes(s));
      if (matched) setStoreName(matched);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (profile) {
      loadHistory();
    }
  }, [profile]);

  const loadHistory = async () => {
    if (!profile) return;
    setIsLoadingHistory(true);
    try {
      const now = new Date();
      const list = await getExpenses(now.getFullYear(), now.getMonth() + 1);
      const myItems = list.filter(item => item.staff_id === profile.id);
      setHistory(myItems);
    } catch (err) {
      console.error("Error loading expenses history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!amount || parseInt(amount, 10) <= 0) {
      toast.error("正しい金額を入力してください");
      return;
    }
    if (!description.trim()) {
      toast.error("用途・内容を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addExpense({
        store_name: storeName,
        date: date,
        category: category,
        amount: parseInt(amount, 10),
        description: description.trim(),
        staff_name: profile.name,
        staff_id: profile.id
      });

      if (res.success) {
        toast.success("経費を登録しました");
        setAmount("");
        setDescription("");
        loadHistory();
      } else {
        toast.error(res.error || "登録に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この経費データを削除してよろしいですか？")) return;
    
    setIsDeleting(id);
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        toast.success("経費を削除しました");
        loadHistory();
      } else {
        toast.error("削除に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AuthGuard requireRole="staff">
      <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto px-4 md:px-0">
        
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-2xl shadow-sm border border-emerald-200">
              <Wallet className="text-emerald-600 w-7 h-7" />
            </div>
            <span>現金経費ノート（デジタル入力）</span>
          </h1>
          <p className="text-slate-500">
            店舗の現金で購入した消耗品や交通費等の経費を入力してください。入力されたデータは毎月の収支計算および弥生会計連携に使用されます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Panel */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-white border-none shadow-md overflow-hidden rounded-2xl">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="text-emerald-500 w-5 h-5" />
                  経費を新しく登録する
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">支払日付</label>
                    <Input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="h-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                    />
                  </div>

                  {/* Store */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">対象店舗</label>
                    <Select value={storeName} onValueChange={setStoreName}>
                      <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-emerald-500">
                        <SelectValue placeholder="店舗を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.map(s => (
                          <SelectItem key={s} value={s}>{s}店</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">勘定科目（経費種別）</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-emerald-500">
                        <SelectValue placeholder="科目の選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">金額</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">¥</span>
                      <Input 
                        type="number"
                        placeholder="1,200" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                        className="h-11 bg-slate-50 border-slate-200 rounded-xl pl-8 text-lg font-black text-slate-800 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">用途・具体的な内容</label>
                    <textarea 
                      className="w-full min-h-[80px] p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
                      placeholder="例：六甲店お手洗い用トイレットペーパー、ハンドソープ"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-amber-700 leading-normal">
                      <p className="font-bold">入力内容の確認</p>
                      <p>領収書（レシート）は保管し、現金合わせの際に手元に残して置いてください。</p>
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-xl transition-all hover:scale-[1.01] active:scale-[0.98] gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>登録中...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>経費を登録する</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right History Panel */}
          <div className="lg:col-span-7">
            <Card className="bg-white border-none shadow-md overflow-hidden rounded-2xl h-full flex flex-col">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="text-slate-500 w-5 h-5" />
                  今月の入力履歴
                </CardTitle>
                <span className="text-xs text-slate-400 font-medium">※当月分の登録データが表示されます。</span>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col">
                {isLoadingHistory ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                    <p className="text-slate-400 text-sm font-medium">履歴を読み込み中...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-8">
                    <Wallet size={36} className="text-slate-300 mb-2" />
                    <p className="text-slate-600 font-bold text-sm">登録済みの経費はありません</p>
                    <p className="text-slate-400 text-xs mt-1">左のフォームから今日の経費を入力してください。</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold">
                          <th className="py-2.5">支払日</th>
                          <th className="py-2.5">店舗</th>
                          <th className="py-2.5">科目</th>
                          <th className="py-2.5">内容</th>
                          <th className="py-2.5 text-right">金額</th>
                          <th className="py-2.5 text-center w-12">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-semibold text-slate-700">
                              {item.date.substring(5).replace("-", "/")}
                            </td>
                            <td className="py-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {item.store_name}
                              </span>
                            </td>
                            <td className="py-3 font-medium text-slate-600">{item.category}</td>
                            <td className="py-3 text-slate-500 max-w-[150px] truncate" title={item.description}>
                              {item.description}
                            </td>
                            <td className="py-3 text-right font-black text-slate-800">
                              ¥{item.amount.toLocaleString()}
                            </td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => handleDelete(item.id!)}
                                disabled={isDeleting === item.id}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                              >
                                {isDeleting === item.id ? (
                                  <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
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
        </div>
      </div>
    </AuthGuard>
  );
}
