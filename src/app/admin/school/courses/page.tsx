"use client";

import { useEffect, useState } from "react";
import { getCourses, addCourse, updateCourse, deleteCourse } from "../actions";
import { SchoolCourse } from "../types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function CoursesPage() {
  const { schoolEnabled } = useAuth();
  const [courses, setCourses] = useState<SchoolCourse[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", price: 0, duration_minutes: 60, is_active: true });

  useEffect(() => {
    if (schoolEnabled) {
      loadCourses();
    }
  }, [schoolEnabled]);

  const loadCourses = async () => {
    setLoading(true);
    const data = await getCourses();
    setCourses(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("講座名を入力してください");
      return;
    }

    if (editingId) {
      const res = await updateCourse(editingId, formData);
      if (res.success) {
        toast.success("講座情報を更新しました");
        setIsDialogOpen(false);
        loadCourses();
      } else {
        toast.error("更新に失敗しました");
      }
    } else {
      const res = await addCourse(formData);
      if (res.success) {
        toast.success("講座を追加しました");
        setIsDialogOpen(false);
        loadCourses();
      } else {
        toast.error("追加に失敗しました");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    const res = await deleteCourse(id);
    if (res.success) {
      toast.success("削除しました");
      loadCourses();
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", price: 0, duration_minutes: 60, is_active: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (course: SchoolCourse) => {
    setEditingId(course.id);
    setFormData({ 
      name: course.name, 
      description: course.description || "",
      price: course.price,
      duration_minutes: course.duration_minutes,
      is_active: course.is_active
    });
    setIsDialogOpen(true);
  };

  if (!schoolEnabled) {
    return <div className="p-8 text-center text-slate-500">スクール機能が有効ではありません</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="text-indigo-600" /> スクール講座マスタ
          </h1>
          <p className="text-slate-500 font-medium mt-1">スクールで提供する講座・コースの管理</p>
        </div>
        <Button onClick={openAddDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Plus size={18} className="mr-2" />
          新規講座追加
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <Card key={course.id} className="border-slate-200 shadow-sm relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-black text-slate-800">{course.name}</CardTitle>
                    <div className="text-xs font-mono text-slate-400 mt-1">ID: {course.id}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${course.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {course.is_active ? '有効' : '無効'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-slate-600 bg-slate-100 p-2 rounded whitespace-pre-wrap min-h-[3rem]">
                    {course.description || "説明なし"}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">料金:</span>
                    <span className="font-bold text-slate-800">¥{course.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">所要時間:</span>
                    <span className="font-bold text-slate-800">{course.duration_minutes}分</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(course)}>
                      <Edit2 size={16} className="mr-2" /> 編集
                    </Button>
                    <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(course.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 font-bold bg-white rounded-2xl border border-slate-200 border-dashed">
              登録されている講座がありません
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingId ? "講座の編集" : "新規講座追加"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">講座名</label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="例: ベーシックコース"
                className="font-bold h-11"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">説明</label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="講座の概要や詳細"
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">料金（税抜/税込等は運用に合わせる）</label>
                <Input 
                  type="number"
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  className="font-bold h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">所要時間（分）</label>
                <Input 
                  type="number"
                  value={formData.duration_minutes} 
                  onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                  className="font-bold h-11"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="isActive"
                checked={formData.is_active}
                onChange={e => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                この講座を有効にする（予約可能）
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11">キャンセル</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11">
              {editingId ? "更新する" : "追加する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
