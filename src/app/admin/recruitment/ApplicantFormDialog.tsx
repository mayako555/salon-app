"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Applicant, createApplicant, updateApplicant, ApplicantStatus } from "./actions";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const SOURCES = [
  "ホットペッパービューティー",
  "HotPepper Beauty Works",
  "リジョブ",
  "キレイビズ",
  "Instagram",
  "TikTok",
  "自社サイト",
  "スタッフ紹介",
  "ハローワーク",
  "その他"
];

const ROLES = [
  "アイリスト",
  "アイブロウリスト",
  "ネイリスト",
  "エステティシャン",
  "フロント・受付",
  "その他"
];

const STATUSES: ApplicantStatus[] = [
  "応募受付",
  "サロン見学調整中",
  "サロン見学予定",
  "サロン見学済",
  "面接調整中",
  "面接確定",
  "面接済",
  "内定",
  "採用",
  "不採用",
  "辞退",
  "見学のみ終了",
  "退職済"
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  initialData?: Applicant | null;
};

export default function ApplicantFormDialog({ isOpen, onClose, onRefresh, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Applicant>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        application_date: "",
        name: "",
        name_kana: "",
        age: "",
        category: "",
        phone: "",
        email: "",
        desired_role: ROLES[0],
        application_source: SOURCES[0],
        status: "応募受付",
        salon_tour_date: "",
        interview_date: "",
        recruitment_cost: "",
        school_name: "",
        decision_date: "",
        join_date: "",
        contract_type: "",
        interviewer: "",
        notes: "",
        resume_url: ""
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNestedChange = (category: 'tech_quality' | 'service_quality', key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...(prev[category as keyof Applicant] as any || {}),
        [key]: value
      }
    }));
  };

  const handleCheckboxChange = (skill: string) => {
    setFormData(prev => {
      const skills = prev.skills || [];
      if (skills.includes(skill)) {
        return { ...prev, skills: skills.filter(s => s !== skill) };
      } else {
        return { ...prev, skills: [...skills, skill] };
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const applicantId = initialData?.id || `new_${Date.now()}`;
      const storageRef = ref(storage, `recruitment/${applicantId}/resumes/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, resume_url: url });
    } catch (error) {
      console.error("Upload error:", error);
      alert("ファイルのアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (initialData?.id) {
        await updateApplicant(initialData.id, formData);
      } else {
        await createApplicant(formData as any);
      }
      onRefresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{initialData ? "応募者情報の編集" : "新規応募者の登録"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-1">基本情報</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>お名前 <span className="text-rose-500">*</span></Label>
                <Input required name="name" value={formData.name || ""} onChange={handleChange} placeholder="山田 花子" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>フリガナ</Label>
                <Input name="name_kana" value={formData.name_kana || ""} onChange={handleChange} placeholder="ヤマダ ハナコ" />
              </div>
              <div className="space-y-2">
                <Label>年齢</Label>
                <Input type="number" name="age" value={formData.age || ""} onChange={handleChange} placeholder="25" />
              </div>
              <div className="space-y-2">
                <Label>区分 (経験など)</Label>
                <Input name="category" value={formData.category || ""} onChange={handleChange} placeholder="経験3年以上" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>学校名</Label>
                <Input name="school_name" value={formData.school_name || ""} onChange={handleChange} placeholder="〇〇美容専門学校" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>電話番号</Label>
                <Input name="phone" value={formData.phone || ""} onChange={handleChange} placeholder="090-0000-0000" />
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input type="email" name="email" value={formData.email || ""} onChange={handleChange} placeholder="email@example.com" />
              </div>
            </div>
          </div>

          {/* Section 2: Application Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-1">応募・選考情報</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>応募日</Label>
                <Input type="date" name="application_date" value={formData.application_date || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>応募媒体</Label>
                <select 
                  name="application_source" 
                  value={formData.application_source || ""} 
                  onChange={handleChange}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>希望職種</Label>
                <select 
                  name="desired_role" 
                  value={formData.desired_role || ""} 
                  onChange={handleChange}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>選考ステータス <span className="text-rose-500">*</span></Label>
                <select 
                  name="status" 
                  value={formData.status || ""} 
                  onChange={handleChange}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>サロン見学日</Label>
                <Input type="date" name="salon_tour_date" value={formData.salon_tour_date || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>面接日時</Label>
                <Input type="datetime-local" name="interview_date" value={formData.interview_date || ""} onChange={handleChange} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>面接担当者名</Label>
                <Input name="interviewer" value={formData.interviewer || ""} onChange={handleChange} placeholder="山田" />
              </div>
            </div>
          </div>

          {/* Section 3: Interview Evaluation (Mid-career only) */}
          {(formData.category === "経験3年未満" || formData.category === "経験3年以上") && (
            <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <h3 className="text-sm font-bold text-emerald-800 border-b border-emerald-200 pb-1 flex justify-between items-center">
                <span>中途採用評価・初期給与提案</span>
                <span className="text-xs font-normal text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">中途経験者用</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-emerald-700">技術習得状況</Label>
                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-emerald-100">
                      {["ラッシュリフト", "シングルエクステ", "アイブロウ", "ボリュームラッシュ", "＆Healthy"].map(skill => (
                        <label key={skill} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={(formData.skills || []).includes(skill)}
                            onChange={() => handleCheckboxChange(skill)}
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          {skill}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-emerald-700">技術品質 (5段階)</Label>
                    <div className="space-y-2 bg-white p-3 rounded-lg border border-emerald-100">
                      {[
                        { key: "finish", label: "仕上がりの綺麗さ" },
                        { key: "retention", label: "持ちの良さ" },
                        { key: "low_risk", label: "お直しリスクの低さ" }
                      ].map(item => (
                        <div key={item.key} className="flex justify-between items-center text-sm">
                          <span>{item.label}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleNestedChange("tech_quality", item.key, val)}
                                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${
                                  (formData.tech_quality as any)?.[item.key] === val
                                    ? "bg-emerald-500 text-white font-bold"
                                    : "bg-slate-100 text-slate-500 hover:bg-emerald-100"
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-emerald-700">接客品質 (5段階)</Label>
                    <div className="space-y-2 bg-white p-3 rounded-lg border border-emerald-100">
                      {[
                        { key: "counseling", label: "カウンセリング力" },
                        { key: "language", label: "言葉遣い" },
                        { key: "atmosphere", label: "雰囲気" }
                      ].map(item => (
                        <div key={item.key} className="flex justify-between items-center text-sm">
                          <span>{item.label}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleNestedChange("service_quality", item.key, val)}
                                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${
                                  (formData.service_quality as any)?.[item.key] === val
                                    ? "bg-emerald-500 text-white font-bold"
                                    : "bg-slate-100 text-slate-500 hover:bg-emerald-100"
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-emerald-100/50 p-4 rounded-lg text-xs space-y-3">
                    <p className="font-bold text-emerald-800">月給参考表</p>
                    <ul className="space-y-1 text-emerald-700 list-disc pl-4">
                      <li>ラッシュリフトのみ: 20万円</li>
                      <li>＋シングル: 21万円</li>
                      <li>＋アイブロウ: 22万円</li>
                      <li>＋ボリューム: 23万円</li>
                      <li>全メニュー(＆H含む): 24万円</li>
                    </ul>
                    <p className="font-bold text-emerald-800 mt-2">加算目安</p>
                    <ul className="space-y-1 text-emerald-700 list-disc pl-4">
                      <li>技術・接客品質が高い: ＋5千〜1万</li>
                      <li>前職売上60万以上: ＋5千〜1万</li>
                      <li>前職売上70万以上: ＋1万〜2万</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-emerald-700">初期給与提案</Label>
                    <Input 
                      name="proposed_salary" 
                      value={formData.proposed_salary || ""} 
                      onChange={handleChange} 
                      placeholder="例: 220,000円" 
                      className="border-emerald-200 focus-visible:ring-emerald-500"
                    />
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm text-emerald-800 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.requires_trial_review || false}
                      onChange={(e) => setFormData({ ...formData, requires_trial_review: e.target.checked })}
                      className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    試用期間終了後に再度給与見直しを行う
                  </label>

                  <div className="space-y-2">
                    <Label className="text-emerald-700">面接メモ・評価理由</Label>
                    <textarea
                      name="interview_memo"
                      value={formData.interview_memo || ""}
                      onChange={handleChange}
                      placeholder="技術チェックの所感、接客の印象、採用理由など"
                      className="w-full h-24 p-2 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Result & Contract */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-1">採用・契約情報</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>採用決定日</Label>
                <Input type="date" name="decision_date" value={formData.decision_date || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>入社日</Label>
                <Input type="date" name="join_date" value={formData.join_date || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>契約形態</Label>
                <Input name="contract_type" value={formData.contract_type || ""} onChange={handleChange} placeholder="正社員など" />
              </div>
              <div className="space-y-2">
                <Label>採用費用 (成果報酬)</Label>
                <Input type="number" name="recruitment_cost" value={formData.recruitment_cost || ""} onChange={handleChange} placeholder="150000" />
              </div>
            </div>
          </div>

          {/* File Upload & Notes */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>履歴書・職務経歴書 (ファイル添付)</Label>
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  ファイルをアップロード
                </Button>
                
                {formData.resume_url && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                    <FileText className="w-4 h-4" />
                    <a href={formData.resume_url} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                      添付ファイルを見る
                    </a>
                    <button type="button" onClick={() => setFormData({ ...formData, resume_url: "" })} className="text-slate-400 hover:text-rose-500 ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>備考・特記事項</Label>
              <textarea 
                name="notes" 
                value={formData.notes || ""} 
                onChange={handleChange as any}
                className="w-full h-24 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="その他メモ..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
            <Button type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
              {loading ? "保存中..." : "保存する"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
