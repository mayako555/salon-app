"use client";

import { useEffect, useState } from "react";
import { getUnresolvedQuestions, ignoreUnresolvedQuestion, generateFaqDraftFromQuestion } from "./actions";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpCircle, Trash2, Edit3, Bot, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function UnresolvedQuestionsPage() {
  const { isSystemOwner, isAdmin } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    setLoading(true);
    const data = await getUnresolvedQuestions();
    setQuestions(data);
    setLoading(false);
  }

  async function handleIgnore(id: string) {
    if (!confirm("この質問を対応不要（無視）として処理しますか？")) return;
    const res = await ignoreUnresolvedQuestion(id);
    if (res.success) {
      toast.success("対応不要として処理しました");
      setQuestions(questions.filter(q => q.id !== id));
    } else {
      toast.error("処理に失敗しました");
    }
  }

  async function handleGenerateDraft(q: any) {
    setGeneratingId(q.id);
    const res = await generateFaqDraftFromQuestion(q.question, q.context_url || "");
    setGeneratingId(null);

    if (res.error || !res.draft) {
      toast.error(res.error || "生成に失敗しました");
      // Fallback: manually redirect to editor with pre-filled question
      const query = new URLSearchParams({ question: q.question, unresolved_id: q.id });
      router.push(`/admin/faqs/editor?${query.toString()}`);
    } else {
      // We pass the generated draft fields as URL params for the editor to pick up
      const query = new URLSearchParams({
        category: res.draft.category || "",
        question: res.draft.question || "",
        answer: res.draft.answer || "",
        search_terms: (res.draft.search_terms || []).join(","),
        unresolved_id: q.id
      });
      router.push(`/admin/faqs/editor?${query.toString()}`);
    }
  }

  if (!isSystemOwner && !isAdmin) {
    return <div className="p-8 text-center">権限がありません</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/faqs">
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border">
            <ArrowLeft size={18} className="text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <HelpCircle className="text-amber-600" />
            未解決の質問一覧
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            AIチャットが回答できなかったユーザーの質問です。これらを元に新しいFAQを作成できます。
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0 bg-white">
          {loading ? (
            <div className="py-12 text-center text-slate-500">読み込み中...</div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <HelpCircle size={32} className="mx-auto text-slate-300" />
              <p>現在、未解決の質問はありません。</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[150px]">日時</TableHead>
                  <TableHead>質問内容 (マスキング済)</TableHead>
                  <TableHead className="w-[150px]">発生画面URL</TableHead>
                  <TableHead className="w-[280px] text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs text-slate-500">
                      {q.created_at ? format(new Date(q.created_at), "yyyy/MM/dd HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {q.question}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {q.context_url || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => handleGenerateDraft(q)}
                          disabled={generatingId === q.id}
                        >
                          {generatingId === q.id ? (
                            <Loader2 size={16} className="mr-2 animate-spin" />
                          ) : (
                            <Bot size={16} className="mr-2" />
                          )}
                          AIで回答案作成
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const query = new URLSearchParams({ question: q.question, unresolved_id: q.id });
                            router.push(`/admin/faqs/editor?${query.toString()}`);
                          }}
                          title="手動でFAQを追加"
                        >
                          <Edit3 size={16} className="text-slate-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleIgnore(q.id)}
                          title="対応不要（無視）にする"
                        >
                          <Trash2 size={16} className="text-slate-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
