"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Plus, Download, Edit2, Trash2, Save, X, Eye } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getContractTemplates, saveContractTemplate, deleteContractTemplate, seedDefaultTemplates, ContractTemplate } from "./actions";

export default function ContractTemplatesPage() {
  const { isSystemOwner } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ContractTemplate>>({});
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (isSystemOwner) {
      loadTemplates();
    }
  }, [isSystemOwner]);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await getContractTemplates();
    setTemplates(data);
    setLoading(false);
  };

  const handleSeed = async () => {
    const res = await seedDefaultTemplates();
    if (res.success) {
      toast.success("標準テンプレートをインポートしました");
      loadTemplates();
    } else {
      toast.error(res.error || "インポートに失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このテンプレートを削除してもよろしいですか？")) return;
    const res = await deleteContractTemplate(id);
    if (res.success) {
      toast.success("テンプレートを削除しました");
      loadTemplates();
    } else {
      toast.error(res.error || "削除に失敗しました");
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error("タイトルと本文は必須です");
      return;
    }
    const res = await saveContractTemplate(editingId, {
      title: formData.title,
      type: formData.type || "other",
      content: formData.content,
    } as any);

    if (res.success) {
      toast.success("保存しました");
      setEditingId(null);
      setFormData({});
      loadTemplates();
    } else {
      toast.error(res.error || "保存に失敗しました");
    }
  };

  const startEdit = (template?: ContractTemplate) => {
    if (template) {
      setEditingId(template.id);
      setFormData(template);
    } else {
      setEditingId("new");
      setFormData({ title: "", type: "employment", content: "## 新規契約書\n\nここに文章を入力してください。入力枠にしたい場所は [[基本給]] のように二重カッコで囲みます。" });
    }
    setIsPreview(false);
  };

  // Preview replacement logic using [[...]]
  const getPreviewContent = () => {
    if (!formData.content) return "";
    let content = formData.content;
    
    // Replace [[変数名]] with input fields
    const regex = /\[\[(.*?)\]\]/g;
    content = content.replace(regex, (match, label) => {
      // Very basic heuristic for type
      const inputType = (label.includes("％") || label.includes("%") || label.includes("円") || label.includes("給") || label.includes("日数") || label.includes("歩合")) ? "number" : "text";
      return `<input type="${inputType}" class="inline-flex h-8 min-w-[120px] rounded border-b-2 border-indigo-200 bg-indigo-50/50 px-3 py-1 text-sm font-bold text-indigo-700 shadow-sm transition-colors focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:bg-white text-center mx-1 placeholder:text-indigo-200 placeholder:font-normal" placeholder="${label}" />`;
    });

    return content;
  };

  if (!isSystemOwner) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen">
        <p className="text-slate-500 font-bold">権限がありません。</p>
      </div>
    );
  }

  if (editingId) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {editingId === "new" ? "新規テンプレート作成" : "テンプレート編集"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingId(null)}>
              <X size={16} className="mr-2" /> キャンセル
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save size={16} className="mr-2" /> 保存する
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 左カラム：基本設定 */}
          <div className="col-span-3 space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                <CardTitle className="text-sm font-bold text-slate-600">基本設定</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">タイトル</label>
                  <Input 
                    value={formData.title || ""} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="例：正社員 雇用契約書" 
                    className="font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">契約種別</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                    value={formData.type || "other"}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="employment">雇用契約書 (正社員)</option>
                    <option value="part_time">雇用契約書 (パート)</option>
                    <option value="outsourcing">業務委託契約書</option>
                    <option value="mirror_rental">面貸し契約書</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-100 shadow-sm bg-indigo-50/30">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-bold text-indigo-800">💡 入力枠の作り方</p>
                <p className="text-[11px] text-indigo-600 leading-relaxed">
                  文章の中に <strong>[[基本給]]</strong> のように二重カッコで文字を囲むと、自動的にそこが文字を入力できる枠に変わります。
                </p>
                <p className="text-[11px] text-slate-500">
                  例：<br/>
                  基本給：月額 <strong>[[基本給(円)]]</strong> 円
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* 右カラム：エディタ / プレビュー */}
          <div className="col-span-9">
            <Card className="h-[750px] flex flex-col shadow-sm border-slate-200">
              <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50">
                <CardTitle className="text-sm font-bold text-slate-600 flex items-center">
                  <FileText size={16} className="mr-2 text-indigo-500" /> 契約書本文
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={!isPreview ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setIsPreview(false)} 
                    className={`h-8 text-xs font-bold ${!isPreview ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-600'}`}
                  >
                    <Edit2 size={14} className="mr-1"/> マークダウン編集
                  </Button>
                  <Button 
                    variant={isPreview ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setIsPreview(true)} 
                    className={`h-8 text-xs font-bold ${isPreview ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-slate-600'}`}
                  >
                    <Eye size={14} className="mr-1"/> 発行テスト（プレビュー）
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 relative">
                {isPreview ? (
                  <div className="absolute inset-0 flex flex-col bg-slate-50">
                    <div className="p-3 border-b border-indigo-100 bg-indigo-50/50 flex items-center justify-center text-xs font-bold text-indigo-600">
                      💡 プレビュー中のため、水色の枠に直接数値を入力してテストできます。
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                      <div 
                        className="prose prose-sm max-w-none text-slate-800 font-sans leading-loose whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                      />
                    </div>
                  </div>
                ) : (
                  <Textarea 
                    className="absolute inset-0 resize-none border-0 rounded-none focus-visible:ring-0 p-6 font-mono text-sm leading-relaxed"
                    value={formData.content || ""}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    placeholder="マークダウン形式で契約内容を入力してください。&#10;&#10;例：&#10;基本給：月額 [[基本給]] 円"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/master/system" className="text-slate-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-200">System Master</Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="text-indigo-600" /> 契約テンプレート管理
          </h1>
          <p className="text-slate-500 font-medium mt-1">雇用契約や業務委託契約の雛形と、各契約ごとの「変動条件入力フォーム」を管理します。</p>
        </div>
        <div className="flex gap-3">
          {templates.length === 0 && (
            <Button onClick={handleSeed} variant="outline" className="h-11 border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-white">
              <Download size={18} className="mr-2" />
              標準テンプレートをインポート
            </Button>
          )}
          <Button onClick={() => startEdit()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md h-11 px-6">
            <Plus size={18} className="mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card key={template.id} className="border-slate-200 shadow-sm group hover:border-indigo-300 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 font-bold">
                    {template.type === 'employment' ? '正社員' : 
                     template.type === 'part_time' ? 'パート' : 
                     template.type === 'outsourcing' ? '業務委託' : 
                     template.type === 'mirror_rental' ? '面貸し' : 'その他'}
                  </Badge>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(template)} className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="h-8 w-8 text-slate-400 hover:text-rose-600">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg font-black text-slate-800 line-clamp-2 leading-tight">
                  {template.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-24 overflow-hidden relative">
                  <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap opacity-70">
                    {template.content}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 border-dashed rounded-xl">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="font-bold mb-4">テンプレートがまだありません</p>
              <p className="text-sm mb-6 max-w-md text-center">
                美容室でよく使われる標準的な契約書（正社員・業務委託など）の雛形をワンクリックでインポートできます。
              </p>
              <Button onClick={handleSeed} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download size={18} className="mr-2" />
                標準テンプレートをインポート
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
