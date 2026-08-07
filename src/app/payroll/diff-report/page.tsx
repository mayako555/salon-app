"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function DiffReportPage() {
  const { isSystemOwner, profile } = useAuth();
  const companyId = profile?.companyId;
  
  // Dummy state for parallel testing report
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch of diff report
    setTimeout(() => {
      setReport([
        {
          staff_id: "staff-1",
          staff_name: "山田 太郎",
          old_health_insurance: 12000,
          new_health_insurance: 12000,
          old_pension: 22000,
          new_pension: 21960,
          diff_pension: -40,
          pension_reason: "近似計算から協会けんぽ折半額マスタへの完全一致適用へ変更したため、端数誤差が解消されました。",
          old_income_tax: 3500,
          new_income_tax: 3500,
          diff_income_tax: 0,
        },
        {
          staff_id: "staff-2",
          staff_name: "鈴木 花子",
          old_health_insurance: 9000,
          new_health_insurance: 9500,
          diff_health_insurance: 500,
          health_reason: "標準報酬月額の定時決定履歴（9月改定）が適用されました。",
          old_pension: 18000,
          new_pension: 18000,
          diff_pension: 0,
          old_income_tax: 2100,
          new_income_tax: 0,
          diff_income_tax: -2100,
          income_tax_reason: "交通費非課税枠超過分の計算が厳密化され、かつ乙欄から甲欄（扶養1人）へ履歴が更新されたため税額が0円になりました。",
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (!companyId && !isSystemOwner) {
    return <div className="p-8 text-center text-slate-500 font-bold">権限がありません。</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/payroll" className="text-slate-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">並行稼働検証中</Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="text-indigo-600" /> 給与計算 差分レポート
          </h1>
          <p className="text-slate-500 font-medium">旧近似ロジックと新厳密ロジック（法定マスタ適用）の計算結果差異を確認します。</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm border-t-4 border-t-indigo-500">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-800">スタッフ別 差分一覧（当月分）</CardTitle>
          <CardDescription>差額が発生している場合、必ず「差異理由」を確認し、新ロジックの結果がマスタ設定に基づく正しい値であることを検証してください。</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-bold">計算結果を検証中...</div>
          ) : (
            <div className="space-y-8">
              {report.map((row, i) => {
                const hasDiff = row.diff_pension !== 0 || row.diff_health_insurance !== 0 || row.diff_income_tax !== 0;
                
                return (
                  <div key={i} className={`p-4 rounded-xl border ${hasDiff ? "bg-amber-50/30 border-amber-200" : "bg-white border-slate-200"}`}>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                      <div className="font-bold text-lg text-slate-800">{row.staff_name}</div>
                      {!hasDiff ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">差異なし</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">要確認</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Health Insurance */}
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-600">健康保険</div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through">¥{row.old_health_insurance?.toLocaleString() || 0}</span>
                          <ArrowRight size={14} className="text-slate-300" />
                          <span className={`font-bold ${row.diff_health_insurance ? "text-amber-600" : "text-slate-800"}`}>
                            ¥{row.new_health_insurance?.toLocaleString() || 0}
                          </span>
                        </div>
                        {row.health_reason && (
                          <div className="text-xs text-amber-700 mt-2 bg-white/50 p-2 rounded flex items-start gap-1">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{row.health_reason}</span>
                          </div>
                        )}
                      </div>

                      {/* Pension */}
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-600">厚生年金</div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through">¥{row.old_pension?.toLocaleString() || 0}</span>
                          <ArrowRight size={14} className="text-slate-300" />
                          <span className={`font-bold ${row.diff_pension ? "text-amber-600" : "text-slate-800"}`}>
                            ¥{row.new_pension?.toLocaleString() || 0}
                          </span>
                        </div>
                        {row.pension_reason && (
                          <div className="text-xs text-amber-700 mt-2 bg-white/50 p-2 rounded flex items-start gap-1">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{row.pension_reason}</span>
                          </div>
                        )}
                      </div>

                      {/* Income Tax */}
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-600">所得税</div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through">¥{row.old_income_tax?.toLocaleString() || 0}</span>
                          <ArrowRight size={14} className="text-slate-300" />
                          <span className={`font-bold ${row.diff_income_tax ? "text-amber-600" : "text-slate-800"}`}>
                            ¥{row.new_income_tax?.toLocaleString() || 0}
                          </span>
                        </div>
                        {row.income_tax_reason && (
                          <div className="text-xs text-amber-700 mt-2 bg-white/50 p-2 rounded flex items-start gap-1">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{row.income_tax_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
