"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { getTenantContractInfo, getTenantBillings, reportPayment } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle2, Download, ExternalLink, AlertCircle, Building2, Banknote } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [billings, setBillings] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.companyId) {
      loadData(profile.companyId);
    }
  }, [profile]);

  const loadData = async (companyId: string) => {
    setLoading(true);
    const [cData, bData] = await Promise.all([
      getTenantContractInfo(companyId),
      getTenantBillings(companyId)
    ]);
    setContract(cData);
    setBillings(bData);
    setLoading(false);
  };

  const handleReportPayment = async (billingId: string) => {
    if (!confirm("振込が完了しましたか？\n「入金確認待ち」ステータスへ移行します。")) return;
    const res = await reportPayment(billingId);
    if (res.success) {
      toast.success("入金報告を送信しました。運営元での確認をお待ちください。");
      if (profile?.companyId) loadData(profile.companyId);
    } else {
      toast.error("処理に失敗しました");
    }
  };

  const printInvoice = () => {
    // 簡易的な請求書のブラウザ印刷機能（モック）
    toast.info("ブラウザの印刷機能を使用してPDFとして保存してください。");
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  const unpaidBillings = billings.filter(b => b.status === "未請求" || b.status === "請求済");
  const hasUnpaid = unpaidBillings.length > 0;
  
  const paidBillings = billings.filter(b => b.status === "支払済" || b.status === "入金確認待ち");
  const lastPaymentDate = paidBillings.length > 0 ? paidBillings[0].paidDate || "確認中" : "なし";

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="text-indigo-600" /> 契約・請求ダッシュボード
          </h1>
          <p className="text-slate-500 font-medium mt-1">現在の契約プランや請求履歴、利用規約の確認を行えます</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 契約情報 */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> 契約情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-sm font-bold text-slate-500">契約プラン</span>
                <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">{contract?.plan || "未設定"}</Badge>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-sm font-bold text-slate-500">契約開始日</span>
                <span className="font-bold text-slate-800">{contract?.startDate || "未設定"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-sm font-bold text-slate-500">月額利用料金</span>
                <span className="font-black text-lg text-slate-800">¥{contract?.fee?.toLocaleString() || 0}</span>
              </div>
              <div className="pt-2 flex flex-col gap-3">
                <Button variant="outline" className="w-full justify-between" asChild>
                  <a href={contract?.contractPdfUrl || "#"} target="_blank" rel="noopener noreferrer">
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> 契約書PDF</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-between" asChild>
                  <a href={contract?.termsPdfUrl || "#"} target="_blank" rel="noopener noreferrer">
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> 利用規約PDF</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* サマリー */}
          <div className="space-y-6">
            <Card className={`border-slate-200 shadow-sm ${hasUnpaid ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
              <CardContent className="p-6 flex items-center gap-4">
                {hasUnpaid ? (
                  <AlertCircle className="w-10 h-10 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 shrink-0" />
                )}
                <div>
                  <h3 className={`text-lg font-black ${hasUnpaid ? "text-rose-800" : "text-emerald-800"}`}>
                    {hasUnpaid ? "未払いのご請求があります" : "現在未払いのご請求はありません"}
                  </h3>
                  <p className={`text-sm mt-1 font-medium ${hasUnpaid ? "text-rose-600" : "text-emerald-600"}`}>
                    {hasUnpaid ? "お早めのお振込をお願いいたします。" : "すべてのお支払いが完了しています。"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-500 block mb-1">最終入金日</span>
                  <span className="font-black text-xl text-slate-800">{lastPaymentDate}</span>
                </div>
                <Banknote className="w-8 h-8 text-slate-200" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 請求履歴 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Banknote className="w-5 h-5 text-indigo-500" /> 請求履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">請求月</th>
                    <th className="px-4 py-3">種別</th>
                    <th className="px-4 py-3 text-right">金額</th>
                    <th className="px-4 py-3">ステータス</th>
                    <th className="px-4 py-3 text-center">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map(b => (
                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-800">{b.billingMonth}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-slate-500">
                          {b.billingType === "system_fee" ? "システム利用料" :
                           b.billingType === "royalty" ? "ロイヤリティ" :
                           b.billingType === "fc_fee" ? "FC加盟金" : "その他"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-black text-right">¥{b.amount.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <Badge 
                          variant={b.status === "支払済" ? "default" : b.status === "入金確認待ち" ? "secondary" : "destructive"}
                          className={
                            b.status === "支払済" ? "bg-emerald-500" :
                            b.status === "入金確認待ち" ? "bg-amber-100 text-amber-800" : "bg-rose-500"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={printInvoice} title="請求書表示・PDF保存">
                            <Download className="w-4 h-4" />
                          </Button>
                          {b.status === "請求済" && (
                            <Button 
                              size="sm" 
                              onClick={() => handleReportPayment(b.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            >
                              入金報告
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {billings.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-bold">請求データがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </AuthGuard>
  );
}
