"use client";

import { useEffect, useState } from "react";
import { getPublishedFaqs } from "./actions";
import { FAQItem, FAQ_CATEGORIES } from "../admin/faqs/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronDown, HelpCircle, BookOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HelpCenterPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const data = await getPublishedFaqs();
      setFaqs(data);
      setLoading(false);
    }
    load();
  }, []);

  const toggleOpen = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  // Convert search query to half-width, lowercase for fuzzy match
  const normalize = (str: string) => str.normalize('NFKC').toLowerCase();

  const filteredFaqs = faqs.filter(faq => {
    const matchCategory = selectedCategory === "ALL" || faq.category === selectedCategory;
    const q = normalize(searchQuery);
    
    if (q === "") return matchCategory;

    // split search query by space to allow multiple keyword search (AND condition)
    const queryParts = q.split(/\s+/).filter(Boolean);

    const faqText = normalize(`${faq.question} ${faq.answer} ${faq.search_terms.join(" ")}`);
    
    const matchSearch = queryParts.every(part => faqText.includes(part));
    
    return matchCategory && matchSearch;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <div className="text-center space-y-4 mb-10 pt-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-3">
          <HelpCircle className="text-indigo-600 w-10 h-10" />
          ヘルプセンター
        </h1>
        <p className="text-slate-500 font-medium max-w-xl mx-auto">
          使い方やよくあるご質問をご確認いただけます。<br className="hidden md:block"/>
          解決しない場合は、画面右下のAIチャットサポートもご活用ください。
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white overflow-visible">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input 
                placeholder="質問やキーワードを入力（例：パスワード 忘れた）" 
                className="pl-10 h-12 text-base rounded-xl border-slate-300 shadow-sm focus-visible:ring-indigo-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-64 h-12 rounded-xl border-slate-300">
                <SelectValue placeholder="すべてのカテゴリー" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">すべてのカテゴリー</SelectItem>
                {FAQ_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-medium">読み込み中...</div>
        ) : filteredFaqs.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-lg text-slate-700 mb-1">見つかりませんでした</p>
            <p className="text-sm">別のキーワードやカテゴリーをお試しください。</p>
          </div>
        ) : (
          filteredFaqs.map(faq => (
            <Collapsible 
              key={faq.id} 
              open={openItems.has(faq.id!)}
              onOpenChange={() => toggleOpen(faq.id!)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-5 text-left hover:bg-slate-50 transition-colors">
                <div className="flex flex-col gap-2">
                  <Badge variant="outline" className="w-fit text-xs font-medium text-indigo-600 border-indigo-200 bg-indigo-50">
                    {faq.category}
                  </Badge>
                  <span className="font-bold text-slate-800 text-lg pr-8">
                    Q. {faq.question}
                  </span>
                </div>
                <ChevronDown 
                  size={20} 
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ${openItems.has(faq.id!) ? "rotate-180" : ""}`} 
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  <div className="py-4 whitespace-pre-wrap">
                    {faq.answer}
                  </div>
                  {faq.related_screen && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <Link href={faq.related_screen}>
                        <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                          <BookOpen size={16} className="mr-2" />
                          関連する画面を開く
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
