"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAISettings, updateAISettings, AISettings } from "../settings-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function AISettingsPage() {
  const { isSystemOwner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AISettings>({
    sarimaxDefaultMonths: 24,
    regressionBaseWeight: 1.0,
    enableExternalFactors: true
  });

  useEffect(() => {
    if (isSystemOwner) {
      loadSettings();
    }
  }, [isSystemOwner]);

  const loadSettings = async () => {
    setLoading(true);
    const data = await getAISettings();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateAISettings(settings);
    if (res.success) {
      toast.success("AI分析設定を保存しました");
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
            <Brain className="text-indigo-600" /> AI分析設定
          </h1>
          <p className="text-slate-500 font-medium">SARIMAXや回帰分析のベースパラメータ管理</p>
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
              <CardTitle className="text-lg font-black text-slate-800">SARIMAX予測モデル設定</CardTitle>
              <CardDescription>時系列予測モデル（SARIMAX）の計算ベースとなるパラメータ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">予測用学習データの取得期間 (ヶ月)</label>
                  <Input 
                    type="number"
                    step="1"
                    min="6"
                    max="60"
                    value={settings.sarimaxDefaultMonths}
                    onChange={(e) => setSettings({...settings, sarimaxDefaultMonths: parseInt(e.target.value) || 24})}
                    className="font-bold h-11"
                  />
                  <p className="text-xs text-slate-500">デフォルトは24ヶ月（直近2年間）のデータを利用して将来予測を行います</p>
                </div>
                
                <div className="space-y-2 pt-6">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={settings.enableExternalFactors}
                      onChange={(e) => setSettings({...settings, enableExternalFactors: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <div>
                      <span className="text-sm font-black text-slate-800 block">外生変数の有効化 (Exogenous Factors)</span>
                      <span className="text-xs text-slate-500 font-medium">天気・祝日・イベント等の外部要因を予測に組み込むか</span>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-800">重回帰分析 (要因分析) 設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-sm">
                <label className="text-sm font-black text-slate-700">ベース重み付け (Base Weight)</label>
                <Input 
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={settings.regressionBaseWeight}
                  onChange={(e) => setSettings({...settings, regressionBaseWeight: parseFloat(e.target.value) || 1.0})}
                  className="font-bold h-11"
                />
                <p className="text-xs text-slate-500">標準化係数のベースとなる重み付け（通常は1.0）</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
