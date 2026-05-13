"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, 
  Copy, 
  Save, 
  Send, 
  RotateCcw, 
  Loader2,
  CheckCircle2,
  X,
  ExternalLink,
  Share,
  MessageCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { SNSPost, generateSNSContent, saveSNSPost, updateSNSPostStatus } from "./sns-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACCOUNTS = ["BROW GYM", "Jasmine Lash", "JL Academy", "岡田万耶子"];
const GENRES = ["集客", "採用", "教育", "ブランディング", "BeforeAfter", "HPB誘導", "ミニモ募集", "オーナー発信"];
const PLATFORMS = ["Threads", "Instagram", "X"];

export default function SNSPostDialog({ 
  isOpen, 
  onClose, 
  post, 
  defaultAccount,
  targetDate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  post?: SNSPost;
  defaultAccount?: string;
  targetDate: string;
}) {
  const [account, setAccount] = useState(post?.account || defaultAccount || ACCOUNTS[0]);
  const [genre, setGenre] = useState(post?.genre || GENRES[0]);
  const [platform, setPlatform] = useState(post?.platform || PLATFORMS[0]);
  const [theme, setTheme] = useState(post?.theme || "");
  const [content, setContent] = useState(post?.content || "");
  const [scheduledTime, setScheduledTime] = useState(post?.scheduled_time || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setAccount(post.account);
      setGenre(post.genre);
      setPlatform(post.platform);
      setTheme(post.theme);
      setContent(post.content);
      setScheduledTime(post.scheduled_time || "");
    } else {
      setAccount(defaultAccount || ACCOUNTS[0]);
      setGenre(GENRES[0]);
      setPlatform(PLATFORMS[0]);
      setTheme("");
      setContent("");
      setScheduledTime("");
    }
  }, [post, defaultAccount, isOpen]);

  const handleGenerate = async () => {
    if (!theme) {
      toast.error("投稿テーマを入力してください");
      return;
    }
    setIsGenerating(true);
    const res = await generateSNSContent({ account, genre, platform, theme });
    setIsGenerating(false);
    if (res.success && res.content) {
      setContent(res.content);
      toast.success("AIが投稿文を生成しました");
    } else {
      toast.error(res.error || "生成に失敗しました");
    }
  };

  const handleSave = async (status: "draft" | "posted") => {
    setIsSaving(true);
    try {
      const res = await saveSNSPost({
        id: post?.id,
        account,
        genre,
        platform,
        theme,
        content,
        status,
        target_date: targetDate,
        scheduled_time: scheduledTime
      });
      
      if (res.success) {
        toast.success(status === "posted" ? "投稿済みにしました" : "下書きを保存しました");
        onClose();
      } else {
        toast.error(res.error || "保存に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareToThreads = () => {
    const url = `https://www.threads.net/intent/post?text=${encodeURIComponent(content)}`;
    window.open(url, '_blank');
  };

  const handleShareToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("クリップボードにコピーしました");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
              <Send size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">SNS投稿作成</DialogTitle>
              <p className="text-[10px] font-bold text-slate-400">AIが最適な投稿文を提案します</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X size={20} className="text-slate-400" />
          </Button>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">アカウント</label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm">
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ジャンル</label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm">
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SNS</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm">
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">投稿予定時間</label>
              <div className="relative">
                <Input 
                  type="time" 
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">投稿テーマ</label>
            <div className="flex gap-2">
              <Input 
                placeholder="例：メンズ眉、清潔感、アンドヘルシー" 
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm flex-1"
              />
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="h-11 rounded-xl bg-slate-900 text-white font-black px-4 flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-amber-400" />}
                <span>AI生成</span>
              </Button>
            </div>
          </div>

          {(content && (platform === "Threads" || platform === "X")) && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-blue-700">外部アプリ連携</span>
              </div>
              <div className="flex gap-2">
                {platform === "Threads" && (
                  <Button size="sm" onClick={handleShareToThreads} className="bg-[#000] text-white rounded-lg h-8 px-3 font-bold text-[10px] gap-1.5 shadow-sm">
                    <MessageCircle size={12} />
                    Threadsで開く
                  </Button>
                )}
                {platform === "X" && (
                  <Button size="sm" onClick={handleShareToX} className="bg-[#000] text-white rounded-lg h-8 px-3 font-bold text-[10px] gap-1.5 shadow-sm">
                    <Share size={12} />
                    Xで開く
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between items-end mb-1 ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">投稿本文</label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 gap-1 px-1">
                  <Copy size={12} />
                  Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} className="h-6 text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 gap-1 px-1">
                  <RotateCcw size={12} />
                  Regen
                </Button>
              </div>
            </div>
            <Textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="ここに投稿文が表示されます。自由に編集も可能です。"
              className="min-h-[300px] rounded-[1.5rem] bg-slate-50 border-none font-medium text-sm leading-relaxed focus:ring-rose-500/20 p-5"
            />
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Button 
              variant="outline" 
              onClick={() => handleSave("draft")} 
              disabled={isSaving || !content}
              className="w-full sm:w-auto h-12 rounded-xl font-bold gap-2 border-slate-200 text-slate-600 hover:bg-white"
            >
              <Save size={18} />
              下書き保存
            </Button>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="h-12 rounded-xl font-bold text-slate-400"
            >
              キャンセル
            </Button>
            <Button 
              onClick={() => handleSave("posted")} 
              disabled={isSaving || !content}
              className="h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black px-8 flex items-center gap-2 shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
            >
              <CheckCircle2 size={18} />
              投稿済みにする
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
