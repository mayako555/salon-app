"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { ParsedAITask } from "@/lib/ai-task-parser";
import { createTask, TaskCategory } from "./actions";
import { useAuth } from "@/lib/auth-context";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
};

const CATEGORIES: TaskCategory[] = ["経営", "開発", "採用", "助成金", "人事", "経理", "店舗運営", "SNS", "マーケティング", "営業", "個人", "その他"];

export default function AITaskInputDialog({ isOpen, onClose, onRefresh }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedAITask[] | null>(null);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText })
      });
      const data = await res.json();
      
      if (data.success && data.tasks) {
        setParsedTasks(data.tasks);
      } else {
        alert("解析に失敗しました: " + (data.error || "不明なエラー"));
      }
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskChange = (index: number, field: keyof ParsedAITask, value: any) => {
    setParsedTasks(prev => {
      if (!prev) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: field === "priority" ? parseInt(value) : value };
      return updated;
    });
  };

  const handleRemoveTask = (index: number) => {
    setParsedTasks(prev => {
      if (!prev) return prev;
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSaveAll = async () => {
    if (!parsedTasks || parsedTasks.length === 0) return;
    setLoading(true);
    try {
      for (const task of parsedTasks) {
        await createTask({
          title: task.title,
          description: "AIによる自動生成",
          category: task.category,
          priority: task.priority,
          status: "未着手",
          assignee: profile?.id || "unassigned",
          dueDate: task.dueDate || "",
          dueTime: task.dueTime || "",
          project: task.project || "",
          notificationRules: [],
          tags: ["AI作成"],
          attachments: []
        });
      }
      onRefresh();
      setParsedTasks(null);
      setInputText("");
      onClose();
    } catch (error: any) {
      alert("保存中にエラーが発生しました: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setParsedTasks(null);
        setInputText("");
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI秘書タスク入力
          </DialogTitle>
        </DialogHeader>

        {!parsedTasks ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              タスクにしたい内容を音声入力（またはキーボード）で入力してください。AIが自動でタイトル、期限、優先度を抽出し、複数タスクの場合は分割します。
            </p>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="例: M&A資料を明日の16時までに完成させて、LINEを確認してから給与計算する"
              rows={4}
              className="text-base"
            />
            <Button 
              onClick={handleParse} 
              disabled={loading || !inputText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AIで解析する
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-indigo-500" />
              AIが以下の {parsedTasks.length} 件のタスクを抽出しました。確認・修正して登録してください。
            </p>

            <div className="space-y-4">
              {parsedTasks.map((task, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"
                    onClick={() => handleRemoveTask(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <div className="space-y-3 pr-8">
                    <div className="space-y-1">
                      <Label className="text-xs">タイトル</Label>
                      <Input value={task.title} onChange={e => handleTaskChange(idx, "title", e.target.value)} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">カテゴリー</Label>
                        <select 
                          value={task.category} 
                          onChange={e => handleTaskChange(idx, "category", e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">優先度</Label>
                        <select 
                          value={task.priority} 
                          onChange={e => handleTaskChange(idx, "priority", e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm"
                        >
                          <option value={5}>★★★★★ (5)</option>
                          <option value={4}>★★★★☆ (4)</option>
                          <option value={3}>★★★☆☆ (3)</option>
                          <option value={2}>★★☆☆☆ (2)</option>
                          <option value={1}>★☆☆☆☆ (1)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">期限日</Label>
                        <Input type="date" className="h-9" value={task.dueDate || ""} onChange={e => handleTaskChange(idx, "dueDate", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">時間</Label>
                        <Input type="time" className="h-9" value={task.dueTime || ""} onChange={e => handleTaskChange(idx, "dueTime", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {parsedTasks.length === 0 && (
                <p className="text-center text-slate-500 py-4">タスクがありません。</p>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setParsedTasks(null)}>
                やり直す
              </Button>
              <Button 
                onClick={handleSaveAll} 
                disabled={loading || parsedTasks.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {parsedTasks.length}件のタスクを登録
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
