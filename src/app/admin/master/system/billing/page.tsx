"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getAllBillings, createBilling, confirmPayment } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Banknote, Building2, Download, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BillingMasterPage() {
  const [loading, setLoading] = useState(true);
  const [billings, setBillings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyId: "",
    billingMonth: format(new Date(), "yyyy-MM"),
    billingType: "system_fee",
    amount: 10000
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getAllBillings();
    if (res.success) {
      setBillings(res.billings || []);
      setCompanies(res.companies || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.companyId) {
      toast.error("請求先のテナントを選択してください");
      return;
    }
    setSaving(true);
    const res = await createBilling(formData);
    if (res.success) {
      toast.success("請求書を発行しました");
      setIsDialogOpen(false);
      loadData();
    } else {
      toast.error("発行に失敗しました");
    }
    setSaving(false);
  };

  const handleConfirmPayment = async (id: string) => {
    if (!confirm("入金確認済みに変更しますか？")) return;
    const res = await confirmPayment(id);
    if (res.success) {
      toast.success("入金確認を完了しました");
      loadData();
    } else {
      toast.error("エラーが発生しました");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  const openAddDialog = () => {
    setFormData({
      companyId: companies.length > 0 ? companies[0].id : "",
      billingMonth: format(new Date(), "yyyy-MM"),
      billingType: "system_fee",
      amount: companies.length > 0 && companies[0].fee ? companies[0].fee : 10000
    });
    setIsDialogOpen(true);
  };

  return (
    <AuthGuard requireRole="systemOwner">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Banknote className="text-indigo-600" /> 請求・入金管理
            </h1>
            <p className="text-slate-500 font-medium mt-1">FC加盟店およびシステム利用テナントへの請求管理</p>
          </div>
          <Button onClick={openAddDialog} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> 請求書発行
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" /> 全テナント請求一覧
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">テナント名</th>
                    <th className="px-4 py-3">請求月</th>
                    <th className="px-4 py-3">請求種別</th>
                    <th className="px-4 py-3 text-right">請求額</th>
                    <th className="px-4 py-3 text-center">ステータス</th>
                    <th className="px-4 py-3 text-center">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map(b => (
                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-800">
                        {b.companyName}
                        <div className="text-xs text-slate-400 font-normal mt-1">プラン: {b.companyPlan}</div>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-600">{b.billingMonth}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-slate-500">
                          {b.billingType === "system_fee" ? "システム利用料" :
                           b.billingType === "royalty" ? "ロイヤリティ" :
                           b.billingType === "fc_fee" ? "FC加盟金" : "その他"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-black text-right">¥{b.amount.toLocaleString()}</td>
                      <td className="px-4 py-4 text-center">
                        <Badge 
                          variant={b.status === "支払済" ? "default" : b.status === "入金確認待ち" ? "secondary" : "destructive"}
                          className={
                            b.status === "支払済" ? "bg-emerald-500" :
                            b.status === "入金確認待ち" ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-rose-500"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          {b.status !== "支払済" && (
                            <Button 
                              size="sm" 
                              onClick={() => handleConfirmPayment(b.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              入金確認
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => toast.info("PDFダウンロード（モック）")} title="請求書PDF">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {billings.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-bold">請求データがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 請求書発行ダイアログ */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">新規請求書の発行</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">請求先テナント</label>
                <select
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                  value={formData.companyId}
                  onChange={e => {
                    const cId = e.target.value;
                    const c = companies.find(x => x.id === cId);
                    setFormData({...formData, companyId: cId, amount: c?.fee || 10000});
                  }}
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.plan})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">請求月 (YYYY-MM)</label>
                <Input 
                  type="month"
                  value={formData.billingMonth} 
                  onChange={e => setFormData({...formData, billingMonth: e.target.value})}
                  className="font-bold h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">請求種別</label>
                <select
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                  value={formData.billingType}
                  onChange={e => setFormData({...formData, billingType: e.target.value})}
                >
                  <option value="system_fee">システム利用料</option>
                  <option value="royalty">ロイヤリティ</option>
                  <option value="fc_fee">FC加盟金</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">請求額（円）</label>
                <Input 
                  type="number"
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  className="font-bold h-11"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? "発行中..." : "発行する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AuthGuard>
  );
}
