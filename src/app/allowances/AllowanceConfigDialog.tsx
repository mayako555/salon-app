"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AllowanceConfig, getAllowanceConfig, saveAllowanceConfig } from "./actions";
import { Loader2, Settings } from "lucide-react";

type AllowanceConfigDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function AllowanceConfigDialog({ isOpen, onClose, onSuccess }: AllowanceConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<AllowanceConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getAllowanceConfig();
      setConfig(data);
    } catch (e) {
      console.error("Failed to load allowance config:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSubmitting(true);
    try {
      const res = await saveAllowanceConfig(config);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert("保存に失敗しました: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof AllowanceConfig, val: any) => {
    setConfig(prev => prev ? { ...prev, [field]: val } : null);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-slate-500" />
            <DialogTitle>会社別手当ルール設定</DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : !config ? (
          <p className="text-xs text-rose-500 py-6 text-center">設定の読み込みに失敗しました。</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 py-4">
            
            {/* Review Rate */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">口コミ手当単価</label>
                <div className="flex items-center gap-1">
                  <Input 
                    type="number" 
                    min="0"
                    value={config.review_rate} 
                    onChange={e => updateField("review_rate", parseInt(e.target.value, 10) || 0)}
                    className="w-24 text-right font-bold h-9"
                  />
                  <span className="text-xs text-slate-500 font-medium">円 / 件</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">口コミ登録1件あたりに支払う手当単価を設定します。</p>
            </div>

            {/* Nomination Rate */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">指名手当基本単価</label>
                <div className="flex items-center gap-1">
                  <Input 
                    type="number" 
                    min="0"
                    value={config.nomination_default_rate} 
                    onChange={e => updateField("nomination_default_rate", parseInt(e.target.value, 10) || 0)}
                    className="w-24 text-right font-bold h-9"
                  />
                  <span className="text-xs text-slate-500 font-medium">円 / 件</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">指名施術1件あたりに支払う基準手当単価を設定します。</p>
            </div>

            {/* Blog Settings */}
            <div className="space-y-3 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">ブログ手当の支給</label>
                <input 
                  type="checkbox"
                  checked={config.has_blog_allowance} 
                  onChange={e => updateField("has_blog_allowance", e.target.checked)}
                  className="w-9 h-5 bg-slate-200 checked:bg-emerald-600 rounded-full appearance-none cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                />
              </div>
              {config.has_blog_allowance && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold">支給最低本数</label>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number" 
                        min="1"
                        value={config.blog_min_posts} 
                        onChange={e => updateField("blog_min_posts", parseInt(e.target.value, 10) || 1)}
                        className="h-8 font-bold text-center text-xs bg-white"
                      />
                      <span className="text-[10px] text-slate-400">本以上</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold">支給金額</label>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number" 
                        min="0"
                        value={config.blog_amount} 
                        onChange={e => updateField("blog_amount", parseInt(e.target.value, 10) || 0)}
                        className="h-8 font-bold text-right text-xs bg-white"
                      />
                      <span className="text-[10px] text-slate-400">円</span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-400">ブログの全店合計投稿数が指定数に達した際の手当を設定します。</p>
            </div>

            {/* SNS Settings */}
            <div className="space-y-3 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">SNS手当の支給</label>
                <input 
                  type="checkbox"
                  checked={config.has_sns_allowance} 
                  onChange={e => updateField("has_sns_allowance", e.target.checked)}
                  className="w-9 h-5 bg-slate-200 checked:bg-emerald-600 rounded-full appearance-none cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                />
              </div>
              {config.has_sns_allowance && (
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold">SNS予約単価</span>
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number" 
                      min="0"
                      value={config.sns_rate} 
                      onChange={e => updateField("sns_rate", parseInt(e.target.value, 10) || 0)}
                      className="w-24 text-right font-bold h-8 text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-400">円 / 件</span>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-400">SNS経由での新規指名予約に対する手当単価を設定します。</p>
            </div>

            {/* Treatment Settings */}
            <div className="space-y-3 pb-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">トリートメント手当の支給</label>
                <input 
                  type="checkbox"
                  checked={config.has_treatment_allowance} 
                  onChange={e => updateField("has_treatment_allowance", e.target.checked)}
                  className="w-9 h-5 bg-slate-200 checked:bg-emerald-600 rounded-full appearance-none cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                />
              </div>
              {config.has_treatment_allowance && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold">最低施術件数</label>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number" 
                        min="1"
                        value={config.treatment_min_cases} 
                        onChange={e => updateField("treatment_min_cases", parseInt(e.target.value, 10) || 1)}
                        className="h-8 font-bold text-center text-xs bg-white"
                      />
                      <span className="text-[10px] text-slate-400">件以上</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold">支給金額</label>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number" 
                        min="0"
                        value={config.treatment_amount} 
                        onChange={e => updateField("treatment_amount", parseInt(e.target.value, 10) || 0)}
                        className="h-8 font-bold text-right text-xs bg-white"
                      />
                      <span className="text-[10px] text-slate-400">円</span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-400">特定トリートメント件数の月間ノルマ達成手当を設定します。</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "設定を保存"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
