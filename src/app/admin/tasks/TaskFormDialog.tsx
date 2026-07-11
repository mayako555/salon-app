"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Task, TaskCategory, TaskPriority, TaskStatus, NotificationRule, createTask, updateTask } from "./actions";
import { Loader2, Plus, Trash2, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  initialData?: Task | null;
};

const CATEGORIES: TaskCategory[] = ["経営", "開発", "採用", "助成金", "人事", "経理", "店舗運営", "SNS", "マーケティング", "営業", "個人", "その他"];
const STATUSES: TaskStatus[] = ["未着手", "進行中", "保留", "完了"];

export default function TaskFormDialog({ isOpen, onClose, onRefresh, initialData }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Task>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          title: "",
          description: "",
          category: "その他",
          priority: 3,
          status: "未着手",
          assignee: profile?.id || "unassigned",
          dueDate: "",
          dueTime: "",
          project: "",
          notificationRules: [],
          tags: [],
          attachments: []
        });
      }
    }
  }, [isOpen, initialData, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "priority" ? parseInt(value) : value
    }));
  };

  const handleAddNotification = () => {
    setFormData(prev => ({
      ...prev,
      notificationRules: [
        ...(prev.notificationRules || []),
        {
          id: Math.random().toString(36).substring(7),
          notificationType: "days_before",
          notificationOffset: 1,
          scheduledAt: null,
          sentAt: null,
          notificationStatus: "pending",
          notificationChannel: "app"
        }
      ]
    }));
  };

  const handleUpdateNotification = (index: number, key: keyof NotificationRule, value: any) => {
    setFormData(prev => {
      const newRules = [...(prev.notificationRules || [])];
      newRules[index] = { ...newRules[index], [key]: value };
      return { ...prev, notificationRules: newRules };
    });
  };

  const handleRemoveNotification = (index: number) => {
    setFormData(prev => {
      const newRules = [...(prev.notificationRules || [])];
      newRules.splice(index, 1);
      return { ...prev, notificationRules: newRules };
    });
  };

  const calculateScheduledAt = (rule: NotificationRule, dueDate: string, dueTime: string) => {
    if (!dueDate) return null;
    try {
      const targetDate = new Date(`${dueDate}T${dueTime || "00:00"}:00+09:00`);
      if (isNaN(targetDate.getTime())) return null;

      if (rule.notificationType === "days_before") {
        targetDate.setDate(targetDate.getDate() - rule.notificationOffset);
      } else if (rule.notificationType === "hours_before") {
        targetDate.setHours(targetDate.getHours() - rule.notificationOffset);
      } else if (rule.notificationType === "minutes_before") {
        targetDate.setMinutes(targetDate.getMinutes() - rule.notificationOffset);
      }
      return targetDate.toISOString();
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate scheduledAt for notifications before saving
      const finalRules = (formData.notificationRules || []).map(rule => ({
        ...rule,
        scheduledAt: calculateScheduledAt(rule, formData.dueDate || "", formData.dueTime || "")
      }));

      const dataToSave = {
        ...formData,
        notificationRules: finalRules
      };

      if (initialData?.id) {
        await updateTask(initialData.id, dataToSave);
      } else {
        await createTask(dataToSave as any);
      }
      onRefresh();
      onClose();
    } catch (error: any) {
      alert("保存に失敗しました: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{initialData ? "タスクの編集" : "新規タスク"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>タイトル <span className="text-rose-500">*</span></Label>
            <Input required name="title" value={formData.title || ""} onChange={handleChange} placeholder="タスクの内容" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>カテゴリー</Label>
              <select 
                name="category" 
                value={formData.category || "その他"} 
                onChange={handleChange}
                className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>優先度</Label>
              <select 
                name="priority" 
                value={formData.priority || 3} 
                onChange={handleChange}
                className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value={5}>★★★★★ (5: 最優先)</option>
                <option value={4}>★★★★☆ (4: 高)</option>
                <option value={3}>★★★☆☆ (3: 中)</option>
                <option value={2}>★★☆☆☆ (2: 低)</option>
                <option value={1}>★☆☆☆☆ (1: 最低)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>期限日</Label>
              <Input type="date" name="dueDate" value={formData.dueDate || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>時間</Label>
              <Input type="time" name="dueTime" value={formData.dueTime || ""} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>ステータス</Label>
            <select 
              name="status" 
              value={formData.status || "未着手"} 
              onChange={handleChange}
              className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>詳細</Label>
            <Textarea name="description" value={formData.description || ""} onChange={handleChange} placeholder="タスクの詳細やメモ" rows={3} />
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-bold"><Bell className="w-4 h-4 text-slate-500" /> リマインダー・通知設定</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddNotification} className="h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" /> 通知を追加
              </Button>
            </div>

            {(!formData.notificationRules || formData.notificationRules.length === 0) && (
              <p className="text-xs text-slate-400">通知は設定されていません。</p>
            )}

            {formData.notificationRules?.map((rule, idx) => (
              <div key={rule.id} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-md">
                <Input 
                  type="number" 
                  value={rule.notificationOffset} 
                  onChange={(e) => handleUpdateNotification(idx, "notificationOffset", parseInt(e.target.value))}
                  className="w-16 h-8 text-sm"
                  min={0}
                />
                <select 
                  value={rule.notificationType}
                  onChange={(e) => handleUpdateNotification(idx, "notificationType", e.target.value)}
                  className="h-8 px-2 rounded-md border border-slate-200 text-sm"
                >
                  <option value="days_before">日前</option>
                  <option value="hours_before">時間前</option>
                  <option value="minutes_before">分前</option>
                </select>
                <span className="text-sm text-slate-500">に</span>
                <select 
                  value={rule.notificationChannel}
                  onChange={(e) => handleUpdateNotification(idx, "notificationChannel", e.target.value)}
                  className="h-8 px-2 rounded-md border border-slate-200 text-sm flex-1"
                >
                  <option value="app">アプリ通知</option>
                  <option value="email">メール</option>
                  <option value="line">LINE</option>
                </select>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleRemoveNotification(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <p className="text-[10px] text-slate-500">※期限日時が設定されていない場合、通知は送信されません。<br/>※実際の配信はCloud Functionsのバッチ処理により行われます。</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
            <Button type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
