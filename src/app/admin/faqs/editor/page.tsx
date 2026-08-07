"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getFaqById, saveFaq } from "../actions";
import { FAQItem, FAQ_CATEGORIES } from "../types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const AVAILABLE_ROLES = [
  { id: "systemOwner", label: "システムオーナー" },
  { id: "companyOwner", label: "会社管理者" },
  { id: "manager", label: "マネージャー" },
  { id: "storeManager", label: "店長" },
  { id: "admin", label: "本部スタッフ" },
  { id: "staff", label: "一般スタッフ" }
];

export default function FaqEditorPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string, question?: string, answer?: string, category?: string, search_terms?: string, unresolved_id?: string }>
}) {
  const params = use(searchParams);
  const router = useRouter();
  const { isSystemOwner, isAdmin } = useAuth();
  const isEdit = !!params.id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<FAQItem>>({
    category: params.category || FAQ_CATEGORIES[0],
    question: params.question || "",
    answer: params.answer || "",
    search_terms: params.search_terms ? params.search_terms.split(",") : [],
    target_roles: ["systemOwner", "companyOwner", "manager", "storeManager", "admin", "staff"],
    is_published: false
  });
  const [searchTermsStr, setSearchTermsStr] = useState(params.search_terms || "");
  const unresolvedId = params.unresolved_id;

  useEffect(() => {
    if (isEdit) {
      loadData(params.id!);
    }
  }, [params.id, isEdit]);

  async function loadData(id: string) {
    const data = await getFaqById(id);
    if (data) {
      setFormData(data);
      setSearchTermsStr((data.search_terms || []).join(", "));
    } else {
      toast.error("FAQが見つかりません");
      router.push("/admin/faqs");
    }
    setLoading(false);
  }

  const handleRoleToggle = (roleId: string) => {
    const roles = formData.target_roles || [];
    if (roles.includes(roleId)) {
      setFormData({ ...formData, target_roles: roles.filter(r => r !== roleId) });
    } else {
      setFormData({ ...formData, target_roles: [...roles, roleId] });
    }
  };

  const handleSave = async () => {
    if (!formData.question || !formData.answer) {
      toast.error("質問と回答は必須です");
      return;
    }
    
    setSaving(true);
    
    // Parse search terms
    const terms = searchTermsStr
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      ...formData,
      search_terms: terms,
    };

    const res = await saveFaq(payload);
    
    if (res.success && unresolvedId) {
      // Mark unresolved question as resolved
      await fetch(`/api/resolve-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: unresolvedId, faqId: res.id })
      }).catch(console.error); // Best effort
    }
    
    setSaving(false);

    if (res.success) {
      toast.success(isEdit ? "更新しました" : "作成しました");
      router.push("/admin/faqs");
    } else {
      toast.error(`保存エラー: ${res.error}`);
    }
  };

  if (!isSystemOwner && !isAdmin) {
    return <div className="p-8 text-center">権限がありません</div>;
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-500">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/faqs">
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border">
            <ArrowLeft size={18} className="text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {isEdit ? "FAQを編集" : "新規FAQを作成"}
          </h1>
          <p className="text-sm text-slate-500">
            作成したFAQは初期状態では非公開になります。一覧画面から公開してください。
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="space-y-2">
            <Label className="text-slate-700 font-bold">カテゴリー <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.category} 
              onValueChange={v => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリーを選択" />
              </SelectTrigger>
              <SelectContent>
                {FAQ_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-bold">質問内容 <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.question} 
              onChange={e => setFormData({ ...formData, question: e.target.value })}
              placeholder="例: パスコードを忘れた場合はどうすればいいですか？" 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-bold">回答 <span className="text-red-500">*</span></Label>
            <Textarea 
              value={formData.answer}
              onChange={e => setFormData({ ...formData, answer: e.target.value })}
              placeholder="回答をMarkdown形式またはプレーンテキストで入力してください"
              className="min-h-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-bold">検索用キーワード（類義語・表記揺れ）</Label>
            <div className="text-xs text-slate-500 mb-2">
              カンマ（,）区切りで入力してください。AIや検索機能がヒットしやすくなります。<br/>
              例: パスワード, ぱすわーど, 忘れた, ログインできない
            </div>
            <Input 
              value={searchTermsStr}
              onChange={e => setSearchTermsStr(e.target.value)}
              placeholder="パスワード, ログイン, 忘れた" 
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Label className="text-slate-700 font-bold">閲覧を許可する権限</Label>
            <div className="text-xs text-slate-500 mb-2">
              チェックを入れた権限のユーザーのみが、ヘルプセンターやAIチャットでこのFAQを参照できます。
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {AVAILABLE_ROLES.map(role => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`role-${role.id}`} 
                    checked={(formData.target_roles || []).includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <label 
                    htmlFor={`role-${role.id}`} 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2 pt-4 border-t border-slate-100">
             <Label className="text-slate-700 font-bold">関連画面（オプション）</Label>
             <Input 
              value={formData.related_screen || ""} 
              onChange={e => setFormData({ ...formData, related_screen: e.target.value })}
              placeholder="例: /staff, /sales" 
            />
          </div>

        </CardContent>
        <CardFooter className="bg-slate-50 border-t p-4 flex justify-end gap-3">
          <Link href="/admin/faqs">
            <Button variant="outline">キャンセル</Button>
          </Link>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 font-bold" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
            {isEdit ? "更新して保存" : "新規作成"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
