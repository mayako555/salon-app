"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { saveOJTSession, OJTSession, getCurriculum, CurriculumItem } from "../../../../training-actions";
import { getStaffList, StaffProfile } from "../../../../../staff/actions";
import { OJT_SCHEDULE } from "./schedule-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  ChevronLeft, 
  Save, 
  Clock, 
  User, 
  MapPin,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  Loader2,
  BookOpen,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function NewOJTLogPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;
  
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [curriculumList, setCurriculumList] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<OJTSession>>({
    staff_id: staffId,
    date: format(new Date(), "yyyy-MM-dd"),
    instructor_name: "",
    location: "神戸本店",
    duration_hours: 7, // 画像のOJT(7h)をデフォルトに
    duration_minutes: 0,
    job_role: "美容技術者（アイリスト）",
    subject_name: "",
    curriculum_content: "",
    content: "",
    acquired_skills: ""
  });

  useEffect(() => {
    async function load() {
      try {
        const [sList, cList] = await Promise.all([
          getStaffList(),
          getCurriculum()
        ]);
        setStaffList(sList);
        setCurriculumList(cList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (formData.date && OJT_SCHEDULE[formData.date]) {
      const defaultData = OJT_SCHEDULE[formData.date];
      setFormData(prev => ({
        ...prev,
        subject_name: defaultData.subject_name,
        curriculum_content: defaultData.curriculum_content,
        content: defaultData.content,
        duration_hours: defaultData.duration_hours,
        instructor_name: defaultData.instructor_name || prev.instructor_name,
      }));
    }
  }, [formData.date]);

  const handleCurriculumSelect = (c: CurriculumItem) => {
    setFormData(prev => ({
      ...prev,
      subject_name: c.name,
      content: `【${c.name}】に関する実技指導および知識習得。\n・${c.description || ""}`
    }));
  };

  const handleSubmit = async () => {
    if (!formData.subject_name || !formData.content || !formData.acquired_skills) {
      toast.error("科目、訓練内容、身についたことは必須項目です");
      return;
    }
    setSaving(true);
    const res = await saveOJTSession(formData);
    setSaving(false);
    if (res.success) {
      toast.success("助成金用 OJT訓練日誌を保存しました");
      router.push("/training");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="animate-spin text-slate-300" size={48} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100" onClick={() => router.back()}>
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">OJT 訓練記録</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Training Log Form (No. 9)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 md:p-10 rounded-[3rem] border-none shadow-2xl shadow-slate-200/50 bg-white space-y-10">
            {/* Subject Selection */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <BookOpen size={14} className="text-blue-500" />
                訓練科目を選択
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {curriculumList.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleCurriculumSelect(c)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all group ${
                      formData.subject_name === c.name 
                      ? "border-blue-600 bg-blue-50/50" 
                      : "border-slate-50 bg-slate-50/50 hover:border-slate-200"
                    }`}
                  >
                    <p className={`text-xs font-black mb-1 ${formData.subject_name === c.name ? "text-blue-600" : "text-slate-400"}`}>SUBJECT</p>
                    <p className={`text-sm font-black ${formData.subject_name === c.name ? "text-blue-900" : "text-slate-600"}`}>{c.name}</p>
                  </button>
                ))}
                {curriculumList.length === 0 && (
                  <p className="text-[10px] text-slate-300 font-bold col-span-2 text-center p-4">
                    ※カリキュラムマスターが未登録です。直接入力してください。
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">科目名 (手入力可)</label>
                <Input 
                  value={formData.subject_name}
                  onChange={e => setFormData({...formData, subject_name: e.target.value})}
                  placeholder="例: エクステンション基礎知識"
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-blue-500/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">具体的な内容</label>
                <Input 
                  value={formData.curriculum_content}
                  onChange={e => setFormData({...formData, curriculum_content: e.target.value})}
                  placeholder="例: デザインパターン実習"
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-black text-slate-900 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs shadow-lg shadow-slate-200">6</span>
                    訓練の具体的内容（指導内容）
                  </label>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Required</span>
                </div>
                <Textarea 
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="どのような技術について、どのような指導を受けましたか？"
                  className="min-h-[220px] rounded-[2.5rem] border-slate-100 bg-slate-50 p-8 font-medium leading-relaxed focus:ring-8 focus:ring-slate-900/5 transition-all text-base resize-none"
                />
                <p className="text-[11px] text-slate-400 px-4 font-bold italic flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" />
                  助成金審査で最も重要視される項目です。なるべく詳細に記載してください。
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-black text-emerald-700 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xs shadow-lg shadow-emerald-100">7</span>
                    訓練により身についたこと
                  </label>
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">Growth</span>
                </div>
                <Textarea 
                  value={formData.acquired_skills}
                  onChange={e => setFormData({...formData, acquired_skills: e.target.value})}
                  placeholder="指導を受けて、どのような点ができるようになりましたか？"
                  className="min-h-[220px] rounded-[2.5rem] border-emerald-100 bg-emerald-50/20 p-8 font-medium leading-relaxed focus:ring-8 focus:ring-emerald-500/5 transition-all text-base border-2 resize-none"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-[2.5rem] border-none shadow-xl bg-white space-y-6 sticky top-8">
            <h3 className="text-sm font-black text-slate-900 px-2 flex items-center gap-2">
              <ClipboardList size={18} className="text-blue-500" />
              自動設定項目
            </h3>
            
            <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">実施日</label>
                <div className="flex items-center gap-2 font-black text-slate-700">
                  <Calendar size={14} className="text-blue-500" />
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="bg-transparent outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">指導者</label>
                <div className="flex items-center gap-2 font-black text-slate-700">
                  <User size={14} className="text-emerald-500" />
                  <select 
                    className="bg-transparent outline-none cursor-pointer w-full"
                    value={formData.instructor_name}
                    onChange={e => setFormData({...formData, instructor_name: e.target.value})}
                  >
                    <option value="">選択してください</option>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">実施場所</label>
                <div className="flex items-center gap-2 font-black text-slate-700">
                  <MapPin size={14} className="text-rose-500" />
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="bg-transparent outline-none w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">訓練時間 (h)</label>
                <div className="flex items-center gap-2 font-black text-slate-700">
                  <Clock size={14} className="text-amber-500" />
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={formData.duration_hours} 
                      onChange={e => setFormData({...formData, duration_hours: parseInt(e.target.value)})}
                      className="bg-transparent outline-none w-12 text-right"
                    />
                    <span>時間</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {saving ? <Loader2 className="animate-spin" /> : (
                <>
                  <Save size={20} />
                  訓練記録を保存する
                </>
              )}
            </Button>
          </Card>
          
          <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100/50">
            <h4 className="text-xs font-black text-amber-800 flex items-center gap-2 mb-2">
              <Sparkles size={14} />
              Tips
            </h4>
            <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
              助成金申請では「実習内容」が具体的であるほど承認されやすくなります。「〜を実施した」だけでなく「〜に留意して指導を受けた」などの表現を加えるとより効果的です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
