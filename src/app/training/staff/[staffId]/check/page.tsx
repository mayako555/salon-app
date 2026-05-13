"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurriculum, recordEvaluation, CurriculumItem, EvaluationRecord } from "../../../training-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Award, 
  ChevronLeft, 
  Star, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CRITERIA = [
  { id: "counseling", label: "カウンセリング", description: "お客様の悩みを聞き出し、提案できているか" },
  { id: "design", label: "デザイン・似合わせ", description: "骨格や自まつ毛の状態に合わせたデザインか" },
  { id: "speed", label: "施術スピード", description: "規定時間内に高品質な施術を完了できているか" },
  { id: "safety", label: "安全性・衛生管理", description: "テープ貼りや道具の扱い、消毒が適切か" },
  { id: "finish", label: "仕上がり", description: "バラつき、左右差、持続性の考慮ができているか" },
  { id: "service", label: "接客・ホスピタリティ", description: "言葉遣いや気遣い、安心感を与えられているか" }
];

export default function TechnicalCheckPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;
  
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<EvaluationRecord>>({
    staff_id: staffId,
    curriculum_id: "",
    scores: CRITERIA.reduce((acc, c) => ({ ...acc, [c.id]: 3 }), {}),
    result: "recheck",
    comment: ""
  });

  useEffect(() => {
    async function load() {
      const data = await getCurriculum();
      setCurriculum(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, curriculum_id: data[0].id }));
      }
      setLoading(false);
    }
    load();
  }, [staffId]);

  const setScore = (criterionId: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [criterionId]: score }
    }));
  };

  const handleSubmit = async () => {
    if (!formData.curriculum_id) {
      toast.error("技術項目を選択してください");
      return;
    }
    
    setSaving(true);
    const total = Object.values(formData.scores || {}).reduce((a, b) => a + b, 0);
    const res = await recordEvaluation({
      ...formData,
      total_score: total
    });
    setSaving(false);
    
    if (res.success) {
      toast.success("評価を記録しました");
      router.push("/training");
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">技術チェック・評価シート</h1>
          <p className="text-sm text-slate-400 font-bold">試験官として新人の技術レベルを客観的に評価します</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">チェック対象の技術項目</label>
            <select 
              className="w-full h-14 rounded-2xl border-slate-100 bg-slate-50 px-6 font-black text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none"
              value={formData.curriculum_id}
              onChange={e => setFormData({...formData, curriculum_id: e.target.value})}
            >
              {curriculum.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-8">
            {CRITERIA.map((criterion, idx) => (
              <motion.div 
                key={criterion.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="space-y-3"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-black text-slate-800">{criterion.label}</h3>
                    <p className="text-[10px] text-slate-400 font-bold leading-tight">{criterion.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        onClick={() => setScore(criterion.id, s)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          (formData.scores?.[criterion.id] || 0) >= s 
                          ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/20' 
                          : 'bg-slate-50 text-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Star size={18} fill={(formData.scores?.[criterion.id] || 0) >= s ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-50">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">合否判定</label>
            <div className="grid grid-cols-3 gap-3">
              <Button 
                variant={formData.result === "pass" ? "default" : "outline"}
                className={`h-20 rounded-3xl flex-col font-black gap-1 transition-all ${formData.result === "pass" ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'border-slate-100 text-slate-300'}`}
                onClick={() => setFormData({...formData, result: "pass"})}
              >
                <CheckCircle2 size={24} />
                <span>合格</span>
              </Button>
              <Button 
                variant={formData.result === "recheck" ? "default" : "outline"}
                className={`h-20 rounded-3xl flex-col font-black gap-1 transition-all ${formData.result === "recheck" ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'border-slate-100 text-slate-300'}`}
                onClick={() => setFormData({...formData, result: "recheck"})}
              >
                <AlertCircle size={24} />
                <span>再チェック</span>
              </Button>
              <Button 
                variant={formData.result === "fail" ? "default" : "outline"}
                className={`h-20 rounded-3xl flex-col font-black gap-1 transition-all ${formData.result === "fail" ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'border-slate-100 text-slate-300'}`}
                onClick={() => setFormData({...formData, result: "fail"})}
              >
                <XCircle size={24} />
                <span>不合格</span>
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">フィードバック・アドバイス</label>
            <Textarea 
              value={formData.comment}
              onChange={e => setFormData({...formData, comment: e.target.value})}
              placeholder="具体的によかった点や、次回への改善ポイントを記入してください"
              className="min-h-[120px] rounded-[1.5rem] border-slate-100 bg-slate-50 p-4 font-medium leading-relaxed"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {saving ? "記録中..." : (
              <>
                <Award size={24} className="text-amber-400" />
                評価を確定して送信
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
