"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { submitFeedback, checkFeedbackSubmitted } from "@/app/test-feedback/actions";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";

const SNOOZE_KEY = "test_feedback_snoozed_until";

export function TestPlanFeedbackModal() {
  const { user, profile, tenantPlan } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [formData, setFormData] = useState({
    usedFeatures: "",
    unusedFeatures: "",
    confusingFeatures: "",
    desiredFeatures: "",
    bugs: "",
    requests: ""
  });

  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !profile?.companyId || tenantPlan !== "Test") {
        setChecking(false);
        return;
      }

      // 7日間スヌーズの確認
      const snoozedUntilStr = localStorage.getItem(SNOOZE_KEY);
      if (snoozedUntilStr) {
        const snoozedUntil = parseInt(snoozedUntilStr, 10);
        if (Date.now() < snoozedUntil) {
          setChecking(false);
          return;
        } else {
          localStorage.removeItem(SNOOZE_KEY);
        }
      }

      // 当月のフィードバック送信済み確認
      const submitted = await checkFeedbackSubmitted(profile.companyId);
      if (!submitted) {
        setIsOpen(true);
      }
      setChecking(false);
    };

    checkStatus();
  }, [user, profile, tenantPlan]);

  const handleSubmit = async () => {
    if (!profile?.companyId || !user) return;
    setLoading(true);
    
    const res = await submitFeedback(profile.companyId, user.uid, formData);
    if (res.success) {
      toast.success("フィードバックを送信しました。ご協力ありがとうございます！");
      setIsOpen(false);
    } else {
      toast.error("送信に失敗しました");
    }
    setLoading(false);
  };

  const handleSnooze = () => {
    const sevenDaysLater = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, sevenDaysLater.toString());
    toast.info("7日後に再表示します");
    setIsOpen(false);
  };

  if (checking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleSnooze(); // 枠外クリックやESCキーでもスヌーズ扱いとする
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700 text-xl font-black">
            <MessageSquare className="w-6 h-6" />
            今月のフィードバック（Test/Beta限定）
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            テスト版をご利用いただきありがとうございます。<br/>
            より良いシステムにするため、今月の利用状況について教えてください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">1. よく使った機能</label>
            <Textarea 
              value={formData.usedFeatures} 
              onChange={e => setFormData({...formData, usedFeatures: e.target.value})} 
              placeholder="例：予約カレンダー、売上登録など"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">2. 使わなかった機能（その理由も）</label>
            <Textarea 
              value={formData.unusedFeatures} 
              onChange={e => setFormData({...formData, unusedFeatures: e.target.value})} 
              placeholder="例：シフト管理機能は現状紙でやっていて使わなかった"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">3. 分かりにくかった機能</label>
            <Textarea 
              value={formData.confusingFeatures} 
              onChange={e => setFormData({...formData, confusingFeatures: e.target.value})} 
              placeholder="例：在庫の減らし方が分かりにくかった"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">4. 欲しい機能</label>
            <Textarea 
              value={formData.desiredFeatures} 
              onChange={e => setFormData({...formData, desiredFeatures: e.target.value})} 
              placeholder="例：お客様への自動リマインド機能が欲しい"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">5. バグ・不具合</label>
            <Textarea 
              value={formData.bugs} 
              onChange={e => setFormData({...formData, bugs: e.target.value})} 
              placeholder="気付いたエラーなどがあればご記入ください"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">6. その他改善要望</label>
            <Textarea 
              value={formData.requests} 
              onChange={e => setFormData({...formData, requests: e.target.value})} 
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center mt-2 sm:justify-between">
          <Button variant="outline" onClick={handleSnooze} className="text-slate-500">
            後で回答する（7日後に再表示）
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            送信する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
