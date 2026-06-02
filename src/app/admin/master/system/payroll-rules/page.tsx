"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getPayrollRules, updatePayrollRules, PayrollRules } from "../settings-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function PayrollRulesPage() {
  const { isSystemOwner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<PayrollRules>({
    nominationFeeRate: 1.0,
    productSalesRate: 0.1,
    baseHourlyWage: 1001
  });

  useEffect(() => {
    if (isSystemOwner) {
      loadRules();
    }
  }, [isSystemOwner]);

  const loadRules = async () => {
    setLoading(true);
    const data = await getPayrollRules();
    setRules(data);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updatePayrollRules(rules);
    if (res.success) {
      toast.success("給与・手当ルールを保存しました");
    } else {
      toast.error("保存に失敗しました");
    }
    setSaving(false);
  };

  if (!isSystemOwner) {
    return <div className="p-8 text-center text-slate-500 font-bold">権限がありません。</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/master/system" className="text-slate-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-200">System Master</Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Calculator className="text-indigo-600" /> 給与・手当ルール
          </h1>
          <p className="text-slate-500 font-medium">全テナント共通のベースとなる計算ロジック設定</p>
        </div>
        <Button onClick={handleSave} disabled={loading || saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-11 px-6">
          <Save size={18} className="mr-2" />
          {saving ? "保存中..." : "設定を保存"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">読み込み中...</div>
      ) : (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-800">還元率設定</CardTitle>
              <CardDescription>スタッフに還元される手当のベースレート</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">指名料還元率 (1.0 = 100%)</label>
                  <Input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={rules.nominationFeeRate}
                    onChange={(e) => setRules({...rules, nominationFeeRate: parseFloat(e.target.value) || 0})}
                    className="font-bold h-11"
                  />
                  <p className="text-xs text-slate-500">例: お客様から頂戴した指名料の何割をスタッフの手当にするか</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">店販還元率 (0.1 = 10%)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={rules.productSalesRate}
                    onChange={(e) => setRules({...rules, productSalesRate: parseFloat(e.target.value) || 0})}
                    className="font-bold h-11"
                  />
                  <p className="text-xs text-slate-500">例: 商品販売額の何割をスタッフの手当にするか</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-800">基本給与設定</CardTitle>
              <CardDescription>各スタッフ個別の設定がない場合のデフォルト値</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-sm">
                <label className="text-sm font-black text-slate-700">システムデフォルト最低時給 (円)</label>
                <Input 
                  type="number"
                  step="1"
                  min="0"
                  value={rules.baseHourlyWage}
                  onChange={(e) => setRules({...rules, baseHourlyWage: parseInt(e.target.value) || 0})}
                  className="font-bold h-11"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
