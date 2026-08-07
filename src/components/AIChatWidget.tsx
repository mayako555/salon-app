"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Bot, User, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askAiSupport } from "@/lib/ai-chat-actions";
import Link from "next/link";
import { clsx } from "clsx";

type ChatMessage = {
  role: "user" | "ai";
  content: string;
  isError?: boolean;
  relatedFaqId?: string | null;
};

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: "ai", content: "こんにちは！サポートAIです。\n操作方法や設定について、分からないことを入力してください。" }
      ]);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userText = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", content: userText }]);
    setIsTyping(true);

    try {
      const response = await askAiSupport(userText, pathname || "/");
      
      setMessages(prev => [...prev, { 
        role: "ai", 
        content: response.message,
        relatedFaqId: response.related_faq_id
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "ai", 
        content: "エラーが発生しました。しばらく経ってから再度お試しください。", 
        isError: true 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-indigo-600 hover:bg-indigo-700 hover:scale-105 transition-all z-50 p-0"
        >
          <MessageCircle size={28} className="text-white" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[360px] h-[550px] max-h-[80vh] shadow-2xl flex flex-col z-50 border-indigo-100 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 py-3 flex flex-row items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={22} className="text-indigo-100" />
              <CardTitle className="text-base font-bold m-0 text-white">AIチャットサポート</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-100 hover:bg-indigo-500/50 hover:text-white" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </Button>
          </CardHeader>
          
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={clsx("flex gap-2 max-w-[90%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                  <div className="shrink-0 pt-1">
                    {msg.role === "ai" ? (
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-200">
                        <Bot size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 border border-slate-300">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                  <div className={clsx(
                    "p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-sm" 
                      : msg.isError 
                        ? "bg-red-50 text-red-600 border border-red-100 rounded-tl-sm"
                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-sm"
                  )}>
                    {msg.content}
                    
                    {msg.relatedFaqId && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <Link href="/help-center" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 text-xs bg-indigo-50 px-2 py-1.5 rounded w-fit">
                          <ExternalLink size={12} />
                          関連するFAQを見る
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-2 max-w-[90%]">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-200 shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white text-slate-500 p-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                    <span className="text-xs font-medium">AIが回答を生成中...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <CardFooter className="p-3 bg-white border-t shrink-0">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="質問を入力してください..." 
                className="flex-1 bg-slate-50 focus-visible:ring-indigo-500"
                disabled={isTyping}
              />
              <Button type="submit" disabled={!inputValue.trim() || isTyping} className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-10 w-10 p-0 rounded-full">
                <Send size={18} className="ml-0.5" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
