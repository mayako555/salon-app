"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardPaste, 
  Table as TableIcon, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Loader2,
  Star,
  MessageSquare,
  Building,
  UserCheck
} from "lucide-react";
import { importReviewsFromSalonBoard, ReviewRecord } from "../actions";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";

export default function ReviewImportPage() {
  const [pasteData, setPasteData] = useState("");
  const [parsedData, setParsedData] = useState<ReviewRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState(1); // 1: Paste, 2: Preview, 3: Success
  const [defaultStore, setDefaultStore] = useState("六甲");

  const STORES = ["六甲", "元町", "神戸"];

  // Fetch staff list for resolution
  useEffect(() => {
    const fetchStaff = async () => {
      const list = await getStaffList();
      setStaffList(list.filter(s => s.is_active));
    };
    fetchStaff();
  }, []);

  const handleParse = () => {
    if (!pasteData.trim()) {
      toast.error("データを貼り付けてください");
      return;
    }

    try {
      const parsedReviews = parseHotpepperReviews(pasteData, staffList);
      
      if (parsedReviews.length === 0) {
        toast.error("口コミデータを解析できませんでした。投稿日や評価などを含めてコピーしてください。");
        return;
      }

      // Assign the default store to all parsed records initially
      const preparedReviews = parsedReviews.map(r => ({
        ...r,
        store_name: defaultStore
      }));

      setParsedData(preparedReviews);
      setStep(2);
      toast.success(`${preparedReviews.length}件の口コミを解析しました`);
    } catch (err) {
      console.error(err);
      toast.error("解析中にエラーが発生しました");
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await importReviewsFromSalonBoard(parsedData);
      if (res.success) {
        toast.success(`新規インポート: ${res.count}件 完了しました！`);
        setStep(3);
      } else {
        toast.error(`登録エラー: ${res.error}`);
      }
    } catch (err) {
      toast.error("エラーが発生しました");
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateStore = (index: number, store: string) => {
    const updated = [...parsedData];
    updated[index].store_name = store;
    setParsedData(updated);
  };

  const handleUpdateStaff = (index: number, staffName: string) => {
    const updated = [...parsedData];
    updated[index].staff_name = staffName || undefined;
    setParsedData(updated);
  };

  // Parsing Helper Function
  function parseHotpepperReviews(text: string, staffProfiles: StaffProfile[]): ReviewRecord[] {
    const lines = text.split("\n").map(l => l.trim());
    const reviews: ReviewRecord[] = [];
    
    // Find indices of lines that indicate a Post Date
    const postDateIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("投稿日") && (line.includes("[投稿日]") || /\d{4}[-/]\d{2}[-/]\d{2}/.test(line))) {
        postDateIndices.push(i);
      }
    }

    for (let idx = 0; idx < postDateIndices.length; idx++) {
      const postDateLineIdx = postDateIndices[idx];
      const nextPostDateLineIdx = postDateIndices[idx + 1] || lines.length;
      
      // 1. Reviewer Name (first non-empty line before postDateLineIdx)
      let reviewerName = "不明";
      for (let j = postDateLineIdx - 1; j >= 0; j--) {
        if (idx > 0 && j <= postDateIndices[idx - 1]) break;
        if (lines[j]) {
          reviewerName = lines[j];
          break;
        }
      }
      
      // Clean name: extract everything before parenthesis or 'さん'
      const nameMatch = reviewerName.match(/^(.+?)(さん（|様（|（|$)/);
      const cleanReviewerName = nameMatch ? nameMatch[1].trim() : reviewerName;

      // 2. Post Date
      const postDateLine = lines[postDateLineIdx];
      const dateMatch = postDateLine.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
      const postDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : new Date().toISOString().split("T")[0];

      // 3. Rating
      let rating = 5;
      let currentLineIdx = postDateLineIdx + 1;
      
      while (currentLineIdx < nextPostDateLineIdx && currentLineIdx < postDateLineIdx + 10) {
        const line = lines[currentLineIdx];
        if (line.includes("総合") || line.includes("総合評価")) {
          const ratingMatch = line.match(/(総合評価|総合)\s*(\d)/);
          if (ratingMatch) {
            rating = parseInt(ratingMatch[2], 10);
          } else {
            const starCount = (line.match(/★/g) || []).length;
            if (starCount > 0) rating = starCount;
          }
          break;
        }
        currentLineIdx++;
      }

      // 4. Content Parsing (Review text, reply text, coupon text)
      let reviewTextLines: string[] = [];
      let replyTextLines: string[] = [];
      let couponLines: string[] = [];
      let isReply = false;
      let isCoupon = false;

      const searchStartIdx = postDateLineIdx + 1;
      for (let j = searchStartIdx; j < nextPostDateLineIdx; j++) {
        // Stop before the reviewer line of the next block
        if (idx < postDateIndices.length - 1) {
          const nextPostDateIdx = postDateIndices[idx + 1];
          let nextReviewerLineIdx = nextPostDateIdx - 1;
          while (nextReviewerLineIdx > postDateLineIdx && !lines[nextReviewerLineIdx]) {
            nextReviewerLineIdx--;
          }
          if (j >= nextReviewerLineIdx) break;
        }

        const line = lines[j];
        if (!line) continue;

        // Skip standard ratings sub-items
        if (line.includes("雰囲気") || line.includes("接客サービス") || line.includes("技術・仕上がり") || line.includes("メニュー・料金")) {
          continue;
        }
        if (line.match(/総合\d/)) continue;

        if (line.includes("返信コメント") || line.includes("返信コメント")) {
          isReply = true;
          isCoupon = false;
          continue;
        }

        if (line.includes("予約時のクーポン・メニュー") || line.includes("クーポン・メニュー")) {
          isCoupon = true;
          isReply = false;
          continue;
        }

        if (isReply) {
          replyTextLines.push(line);
        } else if (isCoupon) {
          couponLines.push(line);
        } else {
          reviewTextLines.push(line);
        }
      }

      const reviewText = reviewTextLines.join("\n").trim();
      const replyText = replyTextLines.join("\n").trim();
      const couponMenu = couponLines.join("\n").trim();

      // 5. Staff Detection (Flexible Kanban & Katakana Resolver)
      let detectedStaff = undefined;
      if (replyText) {
        const sortedStaff = [...staffProfiles].sort((a, b) => b.name.length - a.name.length);
        
        for (const staff of sortedStaff) {
          const kanji = staff.name.replace(/\s+/g, "");
          const lastName = staff.last_name || "";
          const firstName = staff.first_name || "";
          const lastNameKana = staff.last_name_kana || "";
          const firstNameKana = staff.first_name_kana || "";
          const nameKana = (staff.name_kana || "").replace(/\s+/g, "");

          if (replyText.includes(kanji) || replyText.includes(nameKana)) {
            detectedStaff = staff.name;
            break;
          }
          if (lastName.length >= 2 && replyText.includes(lastName)) {
            detectedStaff = staff.name;
            break;
          }
          if (lastNameKana.length >= 2 && replyText.includes(lastNameKana)) {
            detectedStaff = staff.name;
            break;
          }
        }
      }

      reviews.push({
        reviewer_name: cleanReviewerName,
        post_date: postDate,
        rating,
        review_text: reviewText,
        reply_text: replyText || undefined,
        coupon_menu: couponMenu || undefined,
        staff_name: detectedStaff,
        store_name: ""
      });
    }

    return reviews;
  }

  return (
    <AuthGuard requireRole="manager">
    <div className="max-w-6xl mx-auto p-6 space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-pink-500 rounded-xl text-white shadow-lg shadow-pink-200">
              <ClipboardPaste size={24} />
            </div>
            口コミ一括取込 (Hotpepper Beauty)
          </h1>
          <p className="text-slate-500 font-medium">ホットペッパービューティーの口コミページをコピペして取り込み、手当を自動集計します</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 px-2">
        {[
          { id: 1, label: "口コミを貼り付け", icon: <ClipboardPaste size={16}/> },
          { id: 2, label: "解析・担当者紐付", icon: <TableIcon size={16}/> },
          { id: 3, label: "完了", icon: <CheckCircle2 size={16}/> }
        ].map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
              step === s.id ? 'bg-slate-900 text-white shadow-lg' : 
              step > s.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s.id ? <CheckCircle2 size={16} /> : s.icon}
              {s.label}
            </div>
            {s.id < 3 && <ArrowRight size={14} className="text-slate-300" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" />
                  使い方
                </CardTitle>
                <div className="mt-4 space-y-3">
                  <div className="flex gap-4 text-sm text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">1</div>
                    <p>ホットペッパービューティーのサロン管理画面の「口コミ一覧」または「掲載中の口コミページ」を開きます。</p>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</div>
                    <p>取り込みたい範囲（投稿者名から返信テキストまで）をドラッグしてまとめてコピー（Ctrl+C / Cmd+C）します。</p>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</div>
                    <p>下のテキストエリアに貼り付け（Ctrl+V / Cmd+V）して「解析する」を押します。</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="mb-6">
                  <label className="text-sm font-bold text-slate-700 block mb-3">デフォルトの取り込み先店舗：</label>
                  <div className="flex gap-3">
                    {STORES.map((s) => (
                      <Button
                        key={s}
                        variant={defaultStore === s ? "default" : "outline"}
                        onClick={() => setDefaultStore(s)}
                        className={`h-12 px-6 rounded-xl font-bold transition-all ${
                          defaultStore === s 
                            ? "bg-pink-600 text-white shadow-md shadow-pink-200 hover:bg-pink-700" 
                            : "text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {s}店
                      </Button>
                    ))}
                  </div>
                </div>

                <Textarea 
                  placeholder="ここにホットペッパーの口コミテキストを貼り付けてください..."
                  className="min-h-[300px] rounded-[1.5rem] bg-slate-50 border-none font-mono text-xs p-6 focus-visible:ring-pink-500"
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                />
                <Button 
                  className="w-full h-16 rounded-2xl text-lg font-black mt-8 shadow-xl shadow-pink-200 bg-pink-600 hover:bg-pink-700 transition-all active:scale-[0.98]"
                  onClick={handleParse}
                >
                  解析する <ChevronRight className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-6 bg-slate-50">
                <div>
                  <CardTitle className="text-xl font-black text-slate-800">口コミ解析結果のプレビュー</CardTitle>
                  <p className="text-xs text-slate-400 mt-1">※自動紐付けが間違っている場合は担当スタッフや店舗を変更できます</p>
                </div>
                <div className="bg-pink-50 text-pink-600 px-4 py-1.5 rounded-full font-black text-sm border border-pink-100 shadow-sm">
                  {parsedData.length} 件
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest w-[120px]">投稿日</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest w-[150px]">投稿者</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest w-[120px]">総合評価</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest w-[140px]">担当店舗</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest w-[180px]">担当スタッフ</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">本文プレビュー</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parsedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 font-mono text-xs">{row.post_date}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{row.reviewer_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 font-black px-2 py-0.5 rounded text-xs ${
                            row.rating === 5 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500'
                          }`}>
                            <Star size={12} className={row.rating === 5 ? "fill-amber-400 text-amber-500" : "text-slate-400"} />
                            ★{row.rating}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={row.store_name} 
                            onChange={(e) => handleUpdateStore(i, e.target.value)}
                            className="h-9 px-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-bold focus:bg-white transition-colors focus:ring-2 focus:ring-pink-500/20"
                          >
                            {STORES.map(s => <option key={s} value={s}>{s}店</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <select 
                              value={row.staff_name || ""} 
                              onChange={(e) => handleUpdateStaff(i, e.target.value)}
                              className={`h-9 px-2 border rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-pink-500/20 ${
                                row.staff_name 
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                                  : 'border-rose-200 bg-rose-50 text-rose-600'
                              }`}
                            >
                              <option value="">-- 未設定 / 不明 --</option>
                              {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            {row.staff_name && (
                              <UserCheck size={14} className="text-emerald-500 shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-[300px]">
                          <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed" title={row.review_text}>
                            {row.review_text}
                          </div>
                          {row.reply_text && (
                            <div className="text-[10px] text-emerald-600 line-clamp-1 mt-1 font-medium bg-emerald-50/50 px-2 py-0.5 rounded" title={row.reply_text}>
                              返信: {row.reply_text}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-8 flex gap-4 border-t border-slate-100 bg-slate-50/30">
                  <Button variant="outline" className="h-16 flex-1 rounded-2xl font-bold border-slate-200 text-slate-500 bg-white" onClick={() => setStep(1)}>
                    貼り直し
                  </Button>
                  <Button 
                    className="h-16 flex-[2] rounded-2xl text-lg font-black shadow-xl shadow-pink-200 bg-pink-600 hover:bg-pink-700"
                    onClick={handleImport}
                    disabled={isImporting}
                  >
                    {isImporting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                    {isImporting ? "インポート中..." : "確認してシステムへ取り込む"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">口コミのインポート完了！</h2>
            <p className="text-slate-500 max-w-md leading-relaxed mb-10">
              ホットペッパービューティーの口コミデータのインポートが完了しました。<br/>
              手当管理画面で、紐づいたスタッフの口コミ手当が自動計算されます。
            </p>
            <div className="flex gap-4">
              <Button variant="outline" className="h-14 px-8 rounded-xl font-bold border-slate-200 text-slate-600 bg-white" onClick={() => setStep(1)}>
                追加でインポートする
              </Button>
              <Button className="h-14 px-8 rounded-xl font-bold bg-slate-900 text-white" onClick={() => window.location.href = "/allowances"}>
                手当管理画面へ行く
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AuthGuard>
  );
}
