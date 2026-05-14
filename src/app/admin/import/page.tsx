"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardPaste, 
  Table as TableIcon, 
  CheckCircle2, 
  AlertCircle,
  Users,
  ChevronRight,
  ArrowRight,
  Loader2
} from "lucide-react";
import { importCustomersFromSalonBoard } from "./actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function SalonBoardImportPage() {
  const [pasteData, setPasteData] = useState("");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState(1); // 1: Paste, 2: Preview
  const [storeName, setStoreName] = useState("六甲");

  const handleParse = () => {
    if (!pasteData.trim()) {
      toast.error("データを貼り付けてください");
      return;
    }

    try {
      // Browser copy-paste from table usually results in tab-separated values
      const lines = pasteData.trim().split("\n");
      const results = lines.map(line => {
        const cols = line.split("\t");
        if (cols.length < 3) return null;

        // Salon Board List Columns:
        // 0: Kana, 1: Kanji, 2: CustomerNo, 3: Gender, 4: Occupation, 5: VisitCount, 6: LastVisit
        return {
          name_kana: cols[0]?.trim(),
          name: cols[1]?.trim(),
          customer_no: cols[2]?.trim(),
          gender: cols[3]?.trim(),
          occupation: cols[4]?.trim(),
          visit_count: cols[5]?.trim(),
          last_visit_date: cols[6]?.trim(),
          main_store: storeName
        };
      }).filter(Boolean);

      if (results.length === 0) {
        toast.error("データを解析できませんでした。一覧表の行をまるごとコピーしてください。");
        return;
      }

      setParsedData(results);
      setStep(2);
      toast.success(`${results.length}件のデータを解析しました`);
    } catch (err) {
      toast.error("解析エラーが発生しました");
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await importCustomersFromSalonBoard(parsedData);
      if (res.success) {
        toast.success(`新規登録: ${res.count}件 / 更新: ${res.updateCount}件 完了しました！`);
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-200">
              <ClipboardPaste size={24} />
            </div>
            SalonBoard 一括インポート
          </h1>
          <p className="text-slate-500 font-medium">サロンボードの顧客一覧をコピペで取り込みます</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 px-2">
        {[
          { id: 1, label: "データを貼り付け", icon: <ClipboardPaste size={16}/> },
          { id: 2, label: "プレビュー・確認", icon: <TableIcon size={16}/> },
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
                    <p>サロンボードの「顧客管理」→「顧客検索」で一覧を表示します。</p>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</div>
                    <p>表の行（氏名カナから前回来店日まで）をマウスでドラッグしてコピーします。</p>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</div>
                    <p>下のテキストエリアに貼り付けて「解析する」を押してください。</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="mb-6">
                  <label className="text-sm font-bold text-slate-700 block mb-3">取り込み先の店舗を選択してください：</label>
                  <div className="flex gap-3">
                    {["六甲", "元町", "神戸"].map((s) => (
                      <Button
                        key={s}
                        variant={storeName === s ? "default" : "outline"}
                        onClick={() => setStoreName(s)}
                        className={`h-12 px-6 rounded-xl font-bold transition-all ${
                          storeName === s 
                            ? "bg-rose-600 text-white shadow-md shadow-rose-200 hover:bg-rose-700" 
                            : "text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {s}店
                      </Button>
                    ))}
                  </div>
                </div>

                <Textarea 
                  placeholder="ここにデータを貼り付けてください&#10;例：オカダ カオルコ	岡田 薫子	a-40	女性	-	36	2026/03/18"
                  className="min-h-[300px] rounded-[1.5rem] bg-slate-50 border-none font-mono text-xs p-6 focus-visible:ring-rose-500"
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                />
                <Button 
                  className="w-full h-16 rounded-2xl text-lg font-black mt-8 shadow-xl shadow-rose-200 bg-rose-600 hover:bg-rose-700 transition-all active:scale-[0.98]"
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-black text-slate-800">取り込み内容の確認</CardTitle>
                <div className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full font-bold text-xs">
                  {parsedData.length} 件
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-100">
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">氏名（カナ）</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">氏名（漢字）</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">お客様番号</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">性別</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">来店回数</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">前回来店日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parsedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-400">{row.name_kana}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{row.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-xs">{row.customer_no}</span>
                            {row.customer_no && row.customer_no.toLowerCase().includes("min") && (
                              <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-full">ミニモ</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{row.gender}</td>
                        <td className="px-6 py-4 text-slate-600 font-bold">{row.visit_count}回</td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{row.last_visit_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-8 flex gap-4">
                  <Button variant="outline" className="h-16 flex-1 rounded-2xl font-bold border-slate-200 text-slate-500" onClick={() => setStep(1)}>
                    やり直す
                  </Button>
                  <Button 
                    className="h-16 flex-[2] rounded-2xl text-lg font-black shadow-xl shadow-rose-200 bg-rose-600 hover:bg-rose-700"
                    onClick={handleImport}
                    disabled={isImporting}
                  >
                    {isImporting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                    {isImporting ? "登録中..." : "この内容で一括登録する"}
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
            <h2 className="text-3xl font-black text-slate-900 mb-4">インポート完了！</h2>
            <p className="text-slate-500 max-w-sm leading-relaxed mb-10">
              サロンボードからのデータ移行が完了しました。<br/>
              顧客一覧からインポートされたデータを確認できます。
            </p>
            <div className="flex gap-4">
              <Button variant="outline" className="h-14 px-8 rounded-xl font-bold border-slate-200 text-slate-600" onClick={() => setStep(1)}>
                さらにインポートする
              </Button>
              <Button className="h-14 px-8 rounded-xl font-bold bg-slate-900 text-white" onClick={() => window.location.href = "/staff-portal/customers"}>
                顧客一覧を見る
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
