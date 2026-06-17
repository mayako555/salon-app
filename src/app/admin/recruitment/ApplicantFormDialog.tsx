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

          {/* Section 3: Result & Contract */}
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
