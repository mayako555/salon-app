"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  CheckCircle2, 
  FileEdit, 
  Plus, 
  Clock,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Trash2
} from "lucide-react";
import { getDailySNSPosts, SNSPost, deleteSNSPost } from "./sns-actions";
import { format } from "date-fns";
import SNSPostDialog from "./SNSPostDialog";
import { toast } from "sonner";

const ACCOUNTS = [
  { id: "BROW GYM", name: "BROW GYM", time: "21:00〜22:30", color: "bg-slate-900" },
  { id: "Jasmine Lash", name: "Jasmine Lash", time: "20:00〜22:00", color: "bg-rose-500" },
  { id: "JL Academy", name: "JL Academy", time: "19:00〜21:00", color: "bg-emerald-600" },
  { id: "岡田万耶子", name: "岡田万耶子", time: "22:00〜23:30", color: "bg-indigo-600" }
];

export default function SNSTaskSection({ assignedAccounts }: { assignedAccounts?: string[] }) {
  const [posts, setPosts] = useState<SNSPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SNSPost | undefined>();
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const targetDate = format(new Date(), "yyyy-MM-dd");

  // Staff should only see SNS accounts explicitly assigned to them.
  // If undefined or empty, show nothing instead of all accounts.
  const filteredAccounts = (assignedAccounts && assignedAccounts.length > 0)
    ? ACCOUNTS.filter(a => assignedAccounts.includes(a.id))
    : [];

  useEffect(() => {
    async function load() {
      const res = await getDailySNSPosts(targetDate);
      // Filter out soft-deleted posts if is_deleted field exists
      setPosts(res.filter((p: any) => !p.is_deleted));
    }
    load();
  }, [targetDate, isDialogOpen]);

  const openEdit = (post: SNSPost) => {
    setSelectedPost(post);
    setSelectedAccount(undefined);
    setIsDialogOpen(true);
  };

  const openCreate = (accountId: string) => {
    setSelectedPost(undefined);
    setSelectedAccount(accountId);
    setIsDialogOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("この投稿の下書きを削除しますか？")) return;
    const res = await deleteSNSPost(id);
    if (res.success) {
      setPosts(posts.filter(p => p.id !== id));
      toast.success("削除しました");
    }
  };

  if (filteredAccounts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-1 px-1">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Send size={18} className="text-rose-500" />
          今日のSNS投稿タスク
        </h2>
        <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Action Needed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAccounts.map(account => {
          const accountPosts = posts.filter(p => p.account === account.id);

          return (
            <div key={account.id} className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${account.color}`}></div>
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-tight">{account.name}</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => openCreate(account.id)}
                  className="h-7 px-2 text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1 rounded-lg"
                >
                  <Plus size={12} />
                  新規追加
                </Button>
              </div>

              {accountPosts.length === 0 ? (
                <Card className="p-4 rounded-2xl border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white hover:border-rose-200 transition-all" onClick={() => openCreate(account.id)}>
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-rose-400 group-hover:scale-110 transition-all mb-2">
                    <Plus size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">投稿予定がありません</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {accountPosts.map(post => (
                    <Card key={post.id} className="p-0 rounded-2xl border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => openEdit(post)}>
                      <div className="flex h-full">
                        <div className={`w-1 ${post.status === 'posted' ? 'bg-emerald-400' : post.status === 'draft' ? 'bg-blue-400' : 'bg-slate-300'}`}></div>
                        <div className="p-3 flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              post.status === 'posted' ? 'bg-emerald-50 text-emerald-600' :
                              post.status === 'draft' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                            }`}>
                              {post.status === 'posted' ? <CheckCircle2 size={16} /> : post.status === 'draft' ? <FileEdit size={16} /> : <Plus size={16} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-xs">{post.platform}</span>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{post.genre}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={10} className="text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-500">
                                  {post.scheduled_time || "時間未設定"}
                                </span>
                                <span className="text-[10px] text-slate-300 mx-1">•</span>
                                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[120px]">{post.theme}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 rounded-full" onClick={(e) => handleDelete(e, post.id)}>
                              <Trash2 size={14} />
                            </Button>
                            <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-400 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SNSPostDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        post={selectedPost}
        defaultAccount={selectedAccount}
        targetDate={targetDate}
      />
    </div>
  );
}
