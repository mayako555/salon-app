"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FeatureKey, FeatureSettings, FEATURE_DEPENDENCIES } from "@/types/master";
import { saveCompanyFeatures } from "./feature-actions";
import { useAuth } from "@/lib/auth-context";

interface FeatureManagerDialogProps {
  companyId: string;
  companyName: string;
  initialFeatures?: FeatureSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const FEATURE_LABELS: Record<FeatureKey, { label: string, category: string }> = {
  attendance: { label: "勤怠管理", category: "標準・基盤" },
  shifts: { label: "シフト管理", category: "標準・基盤" },
  payroll: { label: "給与計算", category: "標準・基盤" },
  expenses: { label: "経費管理", category: "標準・基盤" },
  cash_management: { label: "資金管理・レジ", category: "標準・基盤" },
  inventory: { label: "在庫管理", category: "標準・基盤" },
  training: { label: "研修・マニュアル", category: "標準・基盤" },
  
  sales: { label: "売上管理", category: "プラン制御・営業" },
  customers: { label: "顧客管理（カルテ）", category: "プラン制御・営業" },
  reservations: { label: "予約管理", category: "プラン制御・営業" },
  goals: { label: "目標管理", category: "プラン制御・営業" },
  evaluations: { label: "人事評価", category: "プラン制御・営業" },
  
  line_automation: { label: "LINE連携・自動化", category: "オプション" },
  ai_assistant: { label: "AIアシスタント", category: "オプション" },
  exports: { label: "データエクスポート", category: "オプション" },
  
  school: { label: "スクール管理", category: "システムオーナー専用" },
  
  tasks: { label: "タスク管理", category: "ベータ" },
};

export function FeatureManagerDialog({ companyId, companyName, initialFeatures, open, onOpenChange, onSaved }: FeatureManagerDialogProps) {
  const { profile } = useAuth();
  const [features, setFeatures] = useState<FeatureSettings>(initialFeatures || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFeatures(initialFeatures || {});
    }
  }, [open, initialFeatures]);

  const handleToggle = (key: FeatureKey, checked: boolean) => {
    const newFeatures = { ...features, [key]: checked };
    
    // Warn about dependencies when turning off
    if (!checked) {
      const dependents = Object.entries(FEATURE_DEPENDENCIES)
        .filter(([_, deps]) => deps.requires.includes(key) && newFeatures[_[0] as FeatureKey])
        .map(([k]) => FEATURE_LABELS[k as FeatureKey].label);
        
      if (dependents.length > 0) {
        toast.warning(`注意: これをOFFにすると、依存する機能 (${dependents.join(", ")}) も正常に動作しなくなる可能性があります。`);
      }
    } else {
      // Warn about requirements when turning on
      const requires = FEATURE_DEPENDENCIES[key].requires;
      const missing = requires.filter(req => !newFeatures[req]);
      if (missing.length > 0) {
        toast.warning(`注意: この機能を有効にするには、${missing.map(m => FEATURE_LABELS[m].label).join(", ")} もONにする必要があります。`);
      }
    }
    
    setFeatures(newFeatures);
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    try {
      await saveCompanyFeatures(companyId, features);
      toast.success("機能設定を保存しました");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const categories = Array.from(new Set(Object.values(FEATURE_LABELS).map(f => f.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>モジュール設定 - {companyName}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto pr-2 py-4 flex-1 space-y-8">
          {categories.map(category => (
            <div key={category}>
              <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(FEATURE_LABELS) as FeatureKey[])
                  .filter(k => FEATURE_LABELS[k].category === category)
                  .map(key => (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <div className="font-bold text-sm text-slate-700">{FEATURE_LABELS[key].label}</div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">{key}</div>
                    </div>
                    <Checkbox 
                      checked={!!features[key]}
                      onCheckedChange={(checked) => handleToggle(key, !!checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end pt-4 border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>キャンセル</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-800 text-white">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
