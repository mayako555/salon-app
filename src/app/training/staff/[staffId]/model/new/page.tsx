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
  Info,
  Eye,
  Scissors,
  ClipboardCheck,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
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
    service_type: "extension",
    photo_before: [],
    photo_after: [],
    model_type: "free",
    checklists: {},
    reflection_points: "",
    improvement_points: "",
    good_points: "",
    chart_points: ""
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

  const toggleCheck = (key: string) => {
    setFormData(prev => ({
      ...prev,
      checklists: {
        ...(prev.checklists || {}),
        [key]: !prev.checklists?.[key]
      }
    }));
  };

  const handleSubmit = async () => {
    if (!formData.curriculum_id || !formData.model_name || !formData.model_phone) {
      toast.error("技術項目、モデル名、電話番号を入力してください");
      return;
    }
    setSaving(true);
    // Combine reflection for legacy support
    const combinedReflection = `【反省】${formData.reflection_points}\n【改善】${formData.improvement_points}`;
    const res = await saveModelRecord({ ...formData, reflection: combinedReflection });
    setSaving(false);
    if (res.success) {
      toast.success("モデル記録を保存し、顧客管理に登録しました");
      router.push("/training");
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold">フォームを読み込み中...</div>;

  const CHECKLISTS = {
    extension: [
      { 
        title: "テープ貼りチェック項目", 
        items: [
          { key: "tape_2mm", label: "まつ毛の生え際から2mm上に貼っているか" },
          { key: "tape_eye_shape", label: "目の形にそって貼れているか" },
          { key: "tape_position", label: "目頭すぎず、目尻すぎていないか" },
          { key: "tape_balance", label: "どちらかだけが下がったり上がったりしていないか" },
          { key: "tape_under_hide", label: "下まつ毛がしっかりかくれているか" },
          { key: "tape_skinagate", label: "スキナゲートより和紙が粘膜側に来ていないか" },
          { key: "tape_pore", label: "まつ毛の毛穴は見えていないか" },
          { key: "tape_h_shape", label: "ハの字に重なっていないか" },
          { key: "tape_root_visible", label: "つけるときに根本がしっかり見えるか" },
          { key: "tape_upper_mucosa", label: "下のテープが上瞼の粘膜に触れていないか" },
          { key: "tape_cilia_wrap", label: "上まつ毛の目頭、目尻の毛が巻きこまれていないか" },
          { key: "tape_length", label: "テープの長さが長すぎないか" },
          { key: "tape_eyebrow", label: "眉毛にテープをはっていないか" },
          { key: "tape_eye_open", label: "目が開いていないか" }
        ]
      },
      {
        title: "テープを外す前のチェック項目",
        items: [
          { key: "check_lanugo", label: "産毛がエクステの根本に絡んでいないか" },
          { key: "check_sticking", label: "エクステ同士がくっついていないか" },
          { key: "check_own_stick", label: "エクステに自まつ毛がくっついていないか" },
          { key: "check_root_float", label: "接着面の根本が浮いていないか" },
          { key: "check_under_tangle", label: "下まつ毛が絡んでついていないか" },
          { key: "check_tape_stick", label: "テープにくっついていないか" },
          { key: "check_direction", label: "変な方向を向いているエクステはいないか" },
          { key: "check_comb", label: "コームでとかして引っかかりはないか" },
          { key: "check_position_match", label: "左右の目尻・目頭同じ位置についているか" },
          { key: "check_density", label: "左右で濃さは均等か" },
          { key: "check_hole", label: "穴があいている位置はないか" },
          { key: "check_layer_misplace", label: "上の層や下の層で変なところについていないか" }
        ]
      },
      {
        title: "お客様が目を開けた時のチェック項目",
        items: [
          { key: "open_balance", label: "左右の目尻・目頭同じ位置についてバランスがいいか" },
          { key: "open_density", label: "左右で濃さは均等か" },
          { key: "open_hole", label: "穴があいている位置はないか" },
          { key: "open_match_eye", label: "デザインがお客様の目元にあっているか" },
          { key: "open_layer_visible", label: "あけると目立っている上の層や下の層のエクステはないか" },
          { key: "open_tilt", label: "あけると変な方向に倒れてしまう目頭・目尻のエクステはないか" },
          { key: "open_comfort", label: "しみてチクチクしたり違和感がないか" }
        ]
      }
    ],
    lash_lift: [
      {
        title: "基本工程チェック",
        items: [
          { key: "lift_rod_pos", label: "ロットの位置は適切か" },
          { key: "lift_winding", label: "巻き上げのテンションと方向は均一か" },
          { key: "lift_solution", label: "1液・2液の塗布範囲は適切か" },
          { key: "lift_wipe", label: "拭き取りは丁寧に行えたか" },
          { key: "lift_finish", label: "毛先まで綺麗にセパレートしているか" }
        ]
      }
    ]
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pb-24 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm" onClick={() => router.back()}>
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">モデル施術記録</h1>
          <p className="text-sm text-slate-400 font-bold">施術チェック項目と反省内容を詳細に記録します</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-6 md:p-10 rounded-[2.5rem] border-none shadow-2xl bg-white space-y-8">
          {/* Service Selector */}
          <div className="flex p-1 bg-slate-100 rounded-2xl w-fit mx-auto">
            <button 
              onClick={() => setFormData({...formData, service_type: "extension"})}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${formData.service_type === "extension" ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              まつ毛エクステ
            </button>
            <button 
              onClick={() => setFormData({...formData, service_type: "lash_lift"})}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${formData.service_type === "lash_lift" ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ラッシュリフト
            </button>
          </div>

          {/* Basic Info Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <Info size={14} className="text-blue-500" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1">技術項目</label>
                <select 
                  className="w-full h-11 rounded-xl border-none bg-slate-50 px-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1">モデル名</label>
                <Input value={formData.model_name} onChange={e => setFormData({...formData, model_name: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-bold" placeholder="田中 花子 様" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1">電話番号</label>
                <Input value={formData.model_phone} onChange={e => setFormData({...formData, model_phone: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-bold" placeholder="090..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1">モデル種別</label>
                <div className="flex gap-1 h-11 bg-slate-50 rounded-xl p-1">
                  <button onClick={() => setFormData({...formData, model_type: "free"})} className={`flex-1 rounded-lg text-[10px] font-black transition-all ${formData.model_type === "free" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>無料</button>
                  <button onClick={() => setFormData({...formData, model_type: "paid"})} className={`flex-1 rounded-lg text-[10px] font-black transition-all ${formData.model_type === "paid" ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>有料</button>
                </div>
              </div>
            </div>
          </section>

          {/* Service Specific Details */}
          <section className="p-6 bg-slate-50 rounded-3xl space-y-6">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              {formData.service_type === "extension" ? <Scissors size={18} className="text-blue-500" /> : <Eye size={18} className="text-emerald-500" />}
              施術詳細内容
            </h3>
            
            {formData.service_type === "extension" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">本数</label>
                  <Input value={formData.extension_count} onChange={e => setFormData({...formData, extension_count: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="120本" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">デザイン</label>
                  <Input value={formData.extension_design} onChange={e => setFormData({...formData, extension_design: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="セクシー" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">毛質</label>
                  <Input value={formData.extension_material} onChange={e => setFormData({...formData, extension_material: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="カシミア" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">太さ</label>
                  <Input value={formData.extension_thickness} onChange={e => setFormData({...formData, extension_thickness: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="0.15mm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">オフタイム</label>
                  <Input value={formData.off_time} onChange={e => setFormData({...formData, off_time: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="10分" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">所要時間</label>
                  <Input value={formData.total_time} onChange={e => setFormData({...formData, total_time: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="90分" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1">使用ロッド</label>
                  <Input value={formData.lash_lift_rod} onChange={e => setFormData({...formData, lash_lift_rod: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="パンダSM / アイリSWL" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">放置時間 (1液)</label>
                  <Input value={formData.processing_time_1} onChange={e => setFormData({...formData, processing_time_1: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="8分" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">放置時間 (2液)</label>
                  <Input value={formData.processing_time_2} onChange={e => setFormData({...formData, processing_time_2: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="10分" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">目幅</label>
                  <Input value={formData.eye_width} onChange={e => setFormData({...formData, eye_width: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="広い / 普通" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1">毛質</label>
                  <Input value={formData.lash_quality_length} onChange={e => setFormData({...formData, lash_quality_length: e.target.value})} className="h-10 bg-white border-slate-200" placeholder="長い・普通" />
                </div>
              </div>
            )}
          </section>

          {/* Technical Checklist */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-rose-500" />
              技術セルフチェック
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(CHECKLISTS[formData.service_type as keyof typeof CHECKLISTS] || []).map((group, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <div className="px-3 py-1 bg-slate-900 rounded-lg w-fit">
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">{group.title}</span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map(item => (
                      <label 
                        key={item.key} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.checklists?.[item.key] ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                      >
                        <input 
                          type="checkbox" 
                          checked={formData.checklists?.[item.key] || false}
                          onChange={() => toggleCheck(item.key)}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                        />
                        <span className={`text-[11px] font-bold ${formData.checklists?.[item.key] ? 'text-emerald-700' : 'text-slate-600'}`}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reflection Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-500" />
              自己反省・振り返りシート
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 flex items-center gap-1">
                  <AlertCircle size={10} className="text-rose-400" /> 反省点 (できていないと思ったこと)
                </label>
                <Textarea value={formData.reflection_points} onChange={e => setFormData({...formData, reflection_points: e.target.value})} className="min-h-[100px] rounded-2xl bg-slate-50 border-none font-medium text-xs leading-relaxed" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 flex items-center gap-1">
                   改善点 (次回答うすればいいか)
                </label>
                <Textarea value={formData.improvement_points} onChange={e => setFormData({...formData, improvement_points: e.target.value})} className="min-h-[100px] rounded-2xl bg-slate-50 border-none font-medium text-xs leading-relaxed" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 flex items-center gap-1">
                  出来たと思う事
                </label>
                <Textarea value={formData.good_points} onChange={e => setFormData({...formData, good_points: e.target.value})} className="min-h-[100px] rounded-2xl bg-slate-50 border-none font-medium text-xs leading-relaxed" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 flex items-center gap-1">
                  カルテを書くときのポイント
                </label>
                <Textarea value={formData.chart_points} onChange={e => setFormData({...formData, chart_points: e.target.value})} className="min-h-[100px] rounded-2xl bg-slate-50 border-none font-medium text-xs leading-relaxed" />
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Camera size={18} className="text-blue-500" />
              症例写真
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">施術前 (Before)</label>
                <div className="grid grid-cols-3 gap-2">
                  {formData.photo_before?.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, 'before')} className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"><X size={10} /></button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-400">
                    <Plus size={20} />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'before')} />
                  </label>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">施術後 (After)</label>
                <div className="grid grid-cols-3 gap-2">
                  {formData.photo_after?.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-emerald-100">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, 'after')} className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"><X size={10} /></button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-all text-emerald-400">
                    <Plus size={20} />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'after')} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <Button 
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 mt-12"
          >
            {saving ? <Loader2 className="animate-spin" /> : (
              <>
                <Save size={24} className="text-emerald-400" />
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
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
