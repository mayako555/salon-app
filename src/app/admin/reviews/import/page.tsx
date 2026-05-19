"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ClipboardPaste, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Star,
  MessageSquare,
  Building,
  UserCheck,
  X,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Award
} from "lucide-react";
import { 
  getMonthlyReviews, 
  importReviewsFromSalonBoard, 
  deleteReviewAction,
  ReviewRecord 
} from "../actions";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { toast } from "sonner";
import AuthGuard from "@/components/AuthGuard";

export default function ReviewImportPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [isManualInput, setIsManualInput] = useState(false);
  
  // Review Form States
  const [pastedText, setPastedText] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState("");
  const [storeName, setStoreName] = useState("六甲");
  const [isSaving, setIsSaving] = useState(false);

  const STORES = ["六甲", "元町", "神戸"];
  const YEARS = [2025, 2026, 2027];
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

  // Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffs, monthlyReviews] = await Promise.all([
        getStaffList(),
        getMonthlyReviews(year, month)
      ]);
      setStaffList(staffs.filter(s => s.is_active));
      setReviews(monthlyReviews);
    } catch (err) {
      toast.error("データの読み込み中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  // Open modal to add review for a specific staff member
  const handleOpenAddModal = (staff: StaffProfile) => {
    setSelectedStaff(staff);
    setStoreName((staff as any).store || "六甲");
    setPastedText("");
    setReviewDate(`${year}-${String(month).padStart(2, '0')}-01`);
    setReviewerName("");
    setRating(5);
    setReviewText("");
    setIsManualInput(false);
    setIsModalOpen(true);
  };

  // Parsing Helper Function (Local)
  function parseSingleReview(text: string): { reviewerName: string; postDate: string; rating: number; reviewText: string } | null {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    let reviewerName = "顧客";
    let postDate = `${year}-${String(month).padStart(2, "0")}-01`;
    let rating = 5;
    let reviewTextLines: string[] = [];

    // Simple robust scanning
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect date
      if (line.includes("投稿日") || /\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
        const dateMatch = line.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
        if (dateMatch) {
          postDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }
        // Reviewer is typically the line before
        if (i > 0) {
          reviewerName = lines[i - 1].replace(/様|さん/g, "").trim();
        }
      }

      // Detect rating
      if (line.includes("総合") || line.includes("総合評価") || line.includes("★")) {
        const ratingMatch = line.match(/(総合評価|総合)\s*(\d)/);
        if (ratingMatch) {
          rating = parseInt(ratingMatch[2], 10);
        } else {
          const starCount = (line.match(/★/g) || []).length;
          if (starCount > 0) rating = starCount;
        }
      }

      // Collect general contents (ignore standard metadata tags)
      if (
        !line.includes("投稿日") &&
        !line.includes("雰囲気") &&
        !line.includes("接客サービス") &&
        !line.includes("技術・仕上がり") &&
        !line.includes("メニュー・料金") &&
        !line.match(/総合\d/)
      ) {
        reviewTextLines.push(line);
      }
    }

    // Clean reviewer name from email/bracket garbage
    reviewerName = reviewerName.split(/[（(さん]/)[0].trim();

    return {
      reviewerName: reviewerName || "顧客",
      postDate,
      rating,
      reviewText: reviewTextLines.slice(0, 5).join("\n").trim()
    };
  }

  // Handle parsing paste text
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPastedText(text);

    if (!text.trim()) return;

    const parsed = parseSingleReview(text);
    if (parsed) {
      if (parsed.rating !== 5) {
        toast.error(`この口コミの評価は ★${parsed.rating} です。オール5（★5）の口コミのみ登録可能です。`);
        return;
      }
      setReviewerName(parsed.reviewerName);
      setReviewDate(parsed.postDate);
      setRating(5);
      setReviewText(parsed.reviewText);
      toast.success("AIが口コミテキストを自動解析しました！");
    }
  };

  // Save the verified review
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    if (rating !== 5) {
      toast.error("オール5（★5）以外の口コミは登録できません");
      return;
    }
    if (!reviewerName.trim()) {
      toast.error("投稿者名を入力してください");
      return;
    }
    if (!reviewDate) {
      toast.error("投稿日を選択してください");
      return;
    }

    setIsSaving(true);
    try {
      const newReview: ReviewRecord = {
        store_name: storeName,
        reviewer_name: reviewerName.trim(),
        rating,
        post_date: reviewDate,
        review_text: reviewText.trim() || "確認済み★5口コミ",
        staff_name: selectedStaff.name
      };

      const res = await importReviewsFromSalonBoard([newReview]);
      if (res.success) {
        toast.success(`「${selectedStaff.name}」の口コミを確認・登録しました！`);
        setIsModalOpen(false);
        loadData();
      } else {
        toast.error(`登録エラー: ${res.error}`);
      }
    } catch (err: any) {
      toast.error("エラーが発生しました: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete verified review
  const handleDeleteReview = async (id: string, staffName: string) => {
    if (!confirm(`「${staffName}」のこの口コミ確認記録を削除してもよろしいですか？`)) return;

    try {
      const res = await deleteReviewAction(id);
      if (res.success) {
        toast.success("口コミ確認記録を削除しました");
        loadData();
      } else {
        toast.error("削除に失敗しました: " + res.error);
      }
    } catch (err: any) {
      toast.error("エラーが発生しました: " + err.message);
    }
  };

  // Aggregate count for each staff member
  const getStaffReviewCount = (staffName: string) => {
    return reviews.filter(r => r.staff_name === staffName && r.rating === 5).length;
  };

  return (
    <AuthGuard requireRole="manager">
      <div className="max-w-6xl mx-auto p-6 space-y-8 font-sans">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200">
                <CheckCircle2 size={22} />
              </div>
              今月の口コミ確認チェックシート
            </h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              ブラウザでホットペッパー等を見に行き、該当する★5口コミをここで個別に「チェック登録」して手当に自動反映します。
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Calendar size={14} className="text-slate-400 font-bold" />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-10 px-3 bg-slate-50 border border-slate-200 text-xs font-black rounded-xl cursor-pointer"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-10 px-3 bg-slate-50 border border-slate-200 text-xs font-black rounded-xl cursor-pointer"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-none shadow-sm shadow-slate-100 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-white border border-emerald-100/30 overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3.5 bg-emerald-600 rounded-2xl text-white shadow-md shadow-emerald-200">
                <Star className="fill-amber-300 text-amber-300" size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 tracking-wider block">今月の総確認済み★5口コミ</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {reviews.filter(r => r.rating === 5).length} <span className="text-xs font-bold text-slate-400">件</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm shadow-slate-100 rounded-2xl bg-gradient-to-br from-pink-500/10 via-white to-white border border-pink-100/30 overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3.5 bg-pink-600 rounded-2xl text-white shadow-md shadow-pink-200">
                <Award size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-pink-800 tracking-wider block">今月の口コミ合計支給手当</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  ¥{(reviews.filter(r => r.rating === 5).length * 500).toLocaleString()}
                  <span className="text-xs font-bold text-slate-400 ml-1">（1件あたり¥500）</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Verification Grid */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden border border-slate-100 bg-white">
          <CardHeader className="border-b border-slate-100 py-5 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-600" />
              スタッフ別・口コミ確認状況
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="animate-spin text-slate-400" size={28} />
                <span className="text-xs font-bold">データを読み込み中...</span>
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400 font-bold">
                アクティブなスタッフが見つかりませんでした。
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/20">
                    <th className="px-6 py-3.5">スタッフ名</th>
                    <th className="px-6 py-3.5">所属店舗</th>
                    <th className="px-6 py-3.5 text-center">確認済み★5口コミ</th>
                    <th className="px-6 py-3.5 text-right">当月発生手当</th>
                    <th className="px-6 py-3.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff) => {
                    const count = getStaffReviewCount(staff.name);
                    const allowance = count * 500;
                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                              {staff.name.substring(0, 2)}
                            </div>
                            <span className="font-bold text-slate-800 text-xs">{staff.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] bg-slate-100 text-slate-600 border border-slate-200">
                            <Building size={10} />
                            {(staff as any).store || "未設定"}店
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 font-black px-2.5 py-1 rounded-xl text-xs ${
                            count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <Star size={12} className={count > 0 ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                            {count} 件
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-800 text-xs">
                          ¥{allowance.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            onClick={() => handleOpenAddModal(staff)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[10px] rounded-lg px-3 gap-1 shadow-sm active:scale-[0.98] transition-all"
                          >
                            <Plus size={12} />
                            口コミをチェック登録
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Verified Reviews Log */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden border border-slate-100 bg-white">
          <CardHeader className="border-b border-slate-100 py-5 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-600" />
              今月の確認・チェック済み口コミ履歴一覧 ({reviews.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {reviews.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 font-bold leading-relaxed max-w-sm mx-auto">
                💡 まだ今月の確認済み口コミが登録されていません。<br/>
                上のスタッフ一覧から「口コミをチェック登録」を行ってください。
              </div>
            ) : (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/20">
                    <th className="px-6 py-3">投稿日</th>
                    <th className="px-6 py-3">対象スタッフ</th>
                    <th className="px-6 py-3">店舗</th>
                    <th className="px-6 py-3">投稿者</th>
                    <th className="px-6 py-3">評価</th>
                    <th className="px-6 py-3">内容プレビュー</th>
                    <th className="px-6 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-3 text-slate-500 font-mono font-medium">{r.post_date}</td>
                      <td className="px-6 py-3 font-bold text-slate-800">{r.staff_name || "未指定"}</td>
                      <td className="px-6 py-3 font-medium text-slate-600">{r.store_name}</td>
                      <td className="px-6 py-3 text-slate-600 font-medium">{r.reviewer_name}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 font-black px-1.5 py-0.5 rounded text-[10px] ${
                          r.rating === 5 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500'
                        }`}>
                          ★{r.rating}
                        </span>
                      </td>
                      <td className="px-6 py-3 max-w-[250px] truncate text-slate-500" title={r.review_text}>
                        {r.review_text}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => handleDeleteReview(r.id!, r.staff_name || "スタッフ")}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                          title="チェックを取り消す"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Modal: Add & Verify Review */}
        {isModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-auto animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
                 <div>
                    <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                      <Sparkles className="text-emerald-600 w-5 h-5" />
                      「{selectedStaff.name}」の該当口コミを確認登録
                    </h3>
                    <p className="text-[10px] text-slate-500">ブラウザで確認した口コミを貼り付けるか、直接入力してください。</p>
                 </div>
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm"
                 >
                   <X size={18} />
                 </button>
              </div>

              <form onSubmit={handleSaveReview} className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* Method Selector */}
                <div className="flex border border-slate-100 rounded-lg overflow-hidden bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setIsManualInput(false)}
                    className={`flex-1 text-center py-2 font-bold text-[10px] rounded-md transition-all ${
                      !isManualInput ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    コピペしてAI自動解析
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualInput(true)}
                    className={`flex-1 text-center py-2 font-bold text-[10px] rounded-md transition-all ${
                      isManualInput ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    手動で直接入力
                  </button>
                </div>

                {!isManualInput ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">コピーした口コミ文を貼り付け：</label>
                    <Textarea
                      placeholder="ホットペッパーからコピーした口コミをそのまま貼り付けてください。AIが日付や名前を自動抽出します..."
                      value={pastedText}
                      onChange={handlePasteChange}
                      rows={5}
                      className="text-xs p-3 rounded-lg border-slate-200 bg-slate-50 focus:bg-white"
                    />
                  </div>
                ) : null}

                {/* Form Inputs (Auto-filled or manual) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">投稿日</label>
                    <Input 
                      type="date"
                      value={reviewDate}
                      onChange={(e) => setReviewDate(e.target.value)}
                      required
                      className="h-10 text-xs rounded-lg bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">投稿者名</label>
                    <Input 
                      type="text"
                      placeholder="例：mayako"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      required
                      className="h-10 text-xs font-bold rounded-lg bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">対象店舗</label>
                    <Select value={storeName} onValueChange={setStoreName}>
                      <SelectTrigger className="h-10 text-xs rounded-lg bg-slate-50 border-slate-200 font-bold">
                        <SelectValue placeholder="店舗" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.map(s => <SelectItem key={s} value={s}>{s}店</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">評価ランク</label>
                    <div className="h-10 text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-black flex items-center px-3 gap-1.5 shadow-inner">
                      <Star className="fill-amber-400 text-amber-500 w-3.5 h-3.5" />
                      ★5（オール5手当対象）
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">口コミ内容（任意・プレビュー用）</label>
                  <textarea
                    placeholder="口コミの本文があれば記入してください..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white outline-none text-slate-800"
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[10px] font-medium leading-relaxed">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span>※オール5の口コミ登録により、口コミ手当（1件¥500）がスタッフ実績に即時加算されます。</span>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 -mx-5 -mb-5 px-5 py-4 shrink-0">
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
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-lg px-4 gap-1.5 shadow-sm"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {isSaving ? "登録中..." : "確認してチェック登録"}
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
