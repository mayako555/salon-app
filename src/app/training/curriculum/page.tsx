"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurriculum, saveCurriculumItem, CurriculumItem } from "../training-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, 
  Plus, 
  Settings2, 
  Trash2, 
  Save, 
  CheckCircle2,
  BookOpen,
  Target
} from "lucide-react";
import { toast } from "sonner";

export default function CurriculumMasterPage() {
  const router = useRouter();
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<CurriculumItem> | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getCurriculum();
    setItems(data);
    setLoading(false);
  }

  const handleSave = async () => {
    if (!editingItem?.name) {
      toast.error("技術項目名を入力してください");
      return;
    }
    const res = await saveCurriculumItem(editingItem);
    if (res.success) {
      toast.success("カリキュラムを保存しました");
      setEditingItem(null);
      load();
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push("/training")}>
            <ChevronLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">技術カリキュラム管理</h1>
            <p className="text-sm text-slate-400 font-bold">教育項目とモデル合格基準を設定します</p>
          </div>
        </div>
        <Button 
          className="rounded-full bg-slate-900 text-white font-black px-6 gap-2"
          onClick={() => setEditingItem({ name: "", free_model_target: 10, paid_model_target: 5, description: "", evaluation_criteria: [] })}
        >
          <Plus size={18} />
          新規項目を追加
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <Card key={item.id} className="p-6 rounded-[2rem] border-none shadow-xl bg-white hover:shadow-2xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                <BookOpen size={24} />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingItem(item)}
              >
                <Settings2 size={18} className="text-slate-400" />
              </Button>
            </div>
            
            <h3 className="text-lg font-black text-slate-900 mb-2">{item.name}</h3>
            <p className="text-xs text-slate-400 font-medium mb-6 line-clamp-2 h-8">{item.description || "説明なし"}</p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">無料モデル</p>
                <p className="text-xl font-black text-emerald-700">{item.free_model_target}<span className="text-[10px] ml-1">人</span></p>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-1">有料モデル</p>
                <p className="text-xl font-black text-blue-700">{item.paid_model_target}<span className="text-[10px] ml-1">人</span></p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Target Cleared</span>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white" />
                <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[8px] flex items-center justify-center font-bold text-slate-400">
                  +
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <Card className="w-full max-w-lg p-8 rounded-[3rem] border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Settings2 className="text-blue-500" />
              カリキュラムの編集
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">技術項目名</label>
                <Input 
                  value={editingItem.name}
                  onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                  placeholder="例：アイブロウワックス"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">必要無料モデル数</label>
                  <Input 
                    type="number"
                    value={editingItem.free_model_target}
                    onChange={e => setEditingItem({...editingItem, free_model_target: parseInt(e.target.value)})}
                    className="h-12 rounded-xl bg-emerald-50/50 border-none font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-1">必要有料モデル数</label>
                  <Input 
                    type="number"
                    value={editingItem.paid_model_target}
                    onChange={e => setEditingItem({...editingItem, paid_model_target: parseInt(e.target.value)})}
                    className="h-12 rounded-xl bg-blue-50/50 border-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">項目の説明</label>
                <Textarea 
                  value={editingItem.description}
                  onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                  placeholder="どのような技術か、どのような点に注意して指導するか"
                  className="min-h-[100px] rounded-xl bg-slate-50 border-none font-medium text-sm p-4"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <Button 
                variant="ghost" 
                className="h-14 rounded-2xl font-bold text-slate-400"
                onClick={() => setEditingItem(null)}
              >
                キャンセル
              </Button>
              <Button 
                className="h-14 rounded-2xl bg-slate-900 text-white font-black shadow-xl gap-2"
                onClick={handleSave}
              >
                <Save size={18} />
                設定を保存
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
