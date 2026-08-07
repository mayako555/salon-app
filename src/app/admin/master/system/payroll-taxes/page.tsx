"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowLeft, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { parseIncomeTaxCsv } from "@/lib/tax-table-parser";
import { uploadIncomeTaxTable } from "./actions";

// Use subtle crypto helper for hash in client
async function computeHash(text: string) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function PayrollTaxesPage() {
  const { isSystemOwner, profile } = useAuth();
  const role = profile?.role;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Permission check based on new rules
  // systemOwner or payrollMasterAdmin can upload
  const canUpload = isSystemOwner || (role as any) === "payrollMasterAdmin";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setPreview(null);

    const text = await selected.text();
    const result = parseIncomeTaxCsv(text);

    if (!result.success) {
      setError(result.error || "パースに失敗しました");
      return;
    }
    
    setPreview(result.data || null);
  };

  const handleUpload = async () => {
    if (!file || !preview) return;
    setUploading(true);
    try {
      const text = await file.text();
      const hash = await computeHash(text);
      await uploadIncomeTaxTable({ year: 2026, data: preview, hash, fileName: file.name, userId: "unknown" });
      toast.success("源泉徴収税額表をインポートしました (draft状態)");
      setFile(null);
      setPreview(null);
    } catch (e: any) {
      toast.error(`アップロード失敗: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!canUpload) {
    return <div className="p-8 text-center text-slate-500 font-bold">権限がありません。</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/master/system" className="text-slate-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-200">System Master</Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Calculator className="text-indigo-600" /> 法定税額表マスタ管理
          </h1>
          <p className="text-slate-500 font-medium">全テナント共通の法定マスタ（源泉徴収税額表など）の管理</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-800">源泉徴収税額表（月額表）のインポート</CardTitle>
          <CardDescription>国税庁公開データに準拠したCSVファイルをアップロードしてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
            {preview && (
              <Button onClick={handleUpload} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-700">
                <Upload size={16} className="mr-2" />
                {uploading ? "インポート中..." : "インポート実行"}
              </Button>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          {preview && (
            <div className="space-y-2">
              <div className="p-4 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">バリデーション成功: {preview.length}件のデータ行を検出しました。</span>
              </div>
              
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2">以上</th>
                      <th className="p-2">未満</th>
                      <th className="p-2 text-right">甲 (0人)</th>
                      <th className="p-2 text-right">甲 (1人)</th>
                      <th className="p-2 text-right">乙欄</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="p-2">{r.min_taxable_amount.toLocaleString()}</td>
                        <td className="p-2">{r.max_taxable_amount === null ? "上限なし" : r.max_taxable_amount.toLocaleString()}</td>
                        <td className="p-2 text-right">{r.kou_amounts["0"].toLocaleString()}</td>
                        <td className="p-2 text-right">{r.kou_amounts["1"].toLocaleString()}</td>
                        <td className="p-2 text-right">{r.otsu_amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 100 && <p className="text-xs text-slate-500 text-center">※プレビューは先頭100件まで表示しています</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
