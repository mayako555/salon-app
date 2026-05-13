"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurriculum, saveModelRecord, CurriculumItem, ModelRecord } from "../../../../training-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Camera, 
  ChevronLeft, 
  Save, 
  X, 
  Plus,
  CheckCircle2,
  Info
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

export default function NewModelRecordPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;
  
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ModelRecord>>({
    staff_id: staffId,
    curriculum_id: "",
    curriculum_name: "",
    model_name: "",
    model_phone: "",
    date: format(new Date(), "yyyy-MM-dd"),
    photo_before: [],
    photo_after: [],
    reflection: "",
    model_type: "free"
  });

  useEffect(() => {
    async function load() {
      const data = await getCurriculum();
      setCurriculum(data);
      if (data.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          curriculum_id: data[0].id,
          curriculum_name: data[0].name
        }));
      }
      setLoading(false);
    }
    load();
  }, [staffId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setFormData(prev => ({
          ...prev,
          [type === 'before' ? 'photo_before' : 'photo_after']: [...(prev[type === 'before' ? 'photo_before' : 'photo_after'] || []), url]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number, type: 'before' | 'after') => {
    setFormData(prev => ({
      ...prev,
      [type === 'before' ? 'photo_before' : 'photo_after']: prev[type === 'before' ? 'photo_before' : 'photo_after']?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.curriculum_id || !formData.model_name || !formData.model_phone) {
      toast.error("技術項目、モデル名、電話番号を入力してください");
      return;
    }
    setSaving(true);
    const res = await saveModelRecord(formData);
    setSaving(false);
    if (res.success) {
      toast.success("モデル記録を保存し、顧客管理に登録しました");
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
          <h1 className="text-2xl font-black text-slate-900">モデル施術記録</h1>
          <p className="text-sm text-slate-400 font-bold">本日の施術内容と写真を記録します</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">技術項目</label>
              <select 
                className="w-full h-12 rounded-xl border-slate-100 bg-slate-50 px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={formData.curriculum_id}
                onChange={e => {
                  const item = curriculum.find(c => c.id === e.target.value);
                  setFormData({...formData, curriculum_id: e.target.value, curriculum_name: item?.name || ""})
                }}
              >
                {curriculum.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">モデル名</label>
              <Input 
                value={formData.model_name}
                onChange={e => setFormData({...formData, model_name: e.target.value})}
                placeholder="田中 花子 様"
                className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">電話番号</label>
              <Input 
                value={formData.model_phone}
                onChange={e => setFormData({...formData, model_phone: e.target.value})}
                placeholder="09012345678"
                className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">来店日</label>
              <Input 
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">モデル種別</label>
              <div className="flex gap-2">
                <Button 
                  variant={formData.model_type === "free" ? "default" : "outline"}
                  className={`flex-1 h-12 rounded-xl font-bold ${formData.model_type === "free" ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}
                  onClick={() => setFormData({...formData, model_type: "free"})}
                >
                  無料モデル
                </Button>
                <Button 
                  variant={formData.model_type === "paid" ? "default" : "outline"}
                  className={`flex-1 h-12 rounded-xl font-bold ${formData.model_type === "paid" ? 'bg-blue-500 text-white' : 'bg-white text-slate-400'}`}
                  onClick={() => setFormData({...formData, model_type: "paid"})}
                >
                  有料モデル
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Camera size={18} className="text-blue-500" />
              症例写真アップロード
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">施術前 (Before)</label>
                <div className="grid grid-cols-2 gap-2">
                  {formData.photo_before?.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, 'before')} className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-400">
                    <Plus size={24} />
                    <span className="text-[10px] font-bold mt-1">追加</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'before')} />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">施術後 (After)</label>
                <div className="grid grid-cols-2 gap-2">
                  {formData.photo_after?.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-sm">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, 'after')} className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-all text-emerald-400">
                    <Plus size={24} />
                    <span className="text-[10px] font-bold mt-1">追加</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'after')} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">本日の振り返り・反省</label>
            <Textarea 
              value={formData.reflection}
              onChange={e => setFormData({...formData, reflection: e.target.value})}
              placeholder="良かった点、改善すべき点、次回の目標など"
              className="min-h-[120px] rounded-[1.5rem] border-slate-100 bg-slate-50 p-4 font-medium leading-relaxed"
            />
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
            <Info className="text-blue-500 shrink-0" size={20} />
            <p className="text-xs text-blue-700 font-bold leading-relaxed">
              記録を保存すると、トレーニング進捗に自動加算され、顧客管理へ登録されます。
              写真は将来的にポートフォリオとして活用されます。
            </p>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {saving ? <Loader2 className="animate-spin" /> : (
              <>
                <CheckCircle2 size={24} className="text-emerald-400" />
                施術記録を保存して完了
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
