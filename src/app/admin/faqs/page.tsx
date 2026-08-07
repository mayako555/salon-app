"use client";

import { useEffect, useState } from "react";
import { getFaqs, toggleFaqPublish, deleteFaq } from "./actions";
import { FAQItem, FAQ_CATEGORIES } from "./types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Eye, EyeOff, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function FaqsAdminPage() {
  const { isSystemOwner, isAdmin } = useAuth();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    loadFaqs();
  }, []);

  async function loadFaqs() {
    setLoading(true);
    const data = await getFaqs();
    setFaqs(data);
    setLoading(false);
  }

  async function handleTogglePublish(faq: FAQItem) {
    const res = await toggleFaqPublish(faq.id!, !faq.is_published);
    if (res.success) {
      toast.success(faq.is_published ? "非公開にしました" : "公開しました");
      setFaqs(faqs.map(f => f.id === faq.id ? { ...f, is_published: !f.is_published } : f));
    } else {
      toast.error("更新に失敗しました");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("本当に削除しますか？この操作は元に戻せません。")) return;
    const res = await deleteFaq(id);
    if (res.success) {
      toast.success("削除しました");
      setFaqs(faqs.filter(f => f.id !== id));
    } else {
      toast.error("削除に失敗しました");
    }
  }

  const filteredFaqs = faqs.filter(faq => {
    const matchCategory = selectedCategory === "ALL" || faq.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = q === "" || 
      faq.question.toLowerCase().includes(q) || 
      faq.answer.toLowerCase().includes(q) ||
      faq.search_terms.some(t => t.toLowerCase().includes(q));
    
    return matchCategory && matchSearch;
  });

  if (!isSystemOwner && !isAdmin) {
    return <div className="p-8 text-center">権限がありません</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" />
            FAQ・ヘルプ管理
          </h1>
          <p className="text-slate-500 font-medium">システムのよくある質問を管理し、AIチャットやヘルプセンターに連携します。</p>
        </div>
        <Link href="/admin/faqs/editor">
          <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md">
            <Plus size={18} className="mr-2" /> 新規FAQを作成
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <CardTitle className="text-lg font-bold text-slate-800">登録済みFAQ一覧 ({filteredFaqs.length}件)</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="質問、回答、キーワードで検索..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="カテゴリー" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">すべて</SelectItem>
                  {FAQ_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          {loading ? (
            <div className="py-12 text-center text-slate-500">読み込み中...</div>
          ) : filteredFaqs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">FAQが見つかりません</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px]">状態</TableHead>
                  <TableHead className="w-[150px]">カテゴリー</TableHead>
                  <TableHead>質問内容</TableHead>
                  <TableHead className="w-[120px]">対象権限</TableHead>
                  <TableHead className="w-[180px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaqs.map(faq => (
                  <TableRow key={faq.id} className={!faq.is_published ? "bg-slate-50/50 text-slate-500" : ""}>
                    <TableCell>
                      {faq.is_published ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">公開中</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 border-slate-300">非公開</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">{faq.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800 mb-1">{faq.question}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{faq.answer}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-500">
                        {faq.target_roles.length === 0 ? "指定なし" : `${faq.target_roles.length} role(s)`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleTogglePublish(faq)}
                          title={faq.is_published ? "非公開にする" : "公開する"}
                        >
                          {faq.is_published ? <EyeOff size={16} className="text-amber-600" /> : <Eye size={16} className="text-green-600" />}
                        </Button>
                        <Link href={`/admin/faqs/editor?id=${faq.id}`}>
                          <Button variant="ghost" size="sm" title="編集">
                            <Edit size={16} className="text-indigo-600" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(faq.id!)} title="削除">
                          <Trash2 size={16} className="text-red-500" />
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
