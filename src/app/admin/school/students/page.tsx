"use client";

import { useEffect, useState } from "react";
import { getStudents, addStudent, updateStudent, deleteStudent } from "../actions";
import { SchoolStudent } from "../types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Users, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function StudentsPage() {
  const { schoolEnabled } = useAuth();
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", memo: "" });

  useEffect(() => {
    if (schoolEnabled) {
      loadStudents();
    }
  }, [schoolEnabled]);

  const loadStudents = async () => {
    setLoading(true);
    const data = await getStudents();
    setStudents(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("氏名を入力してください");
      return;
    }

    if (editingId) {
      const res = await updateStudent(editingId, formData);
      if (res.success) {
        toast.success("受講生情報を更新しました");
        setIsDialogOpen(false);
        loadStudents();
      } else {
        toast.error("更新に失敗しました");
      }
    } else {
      const res = await addStudent(formData);
      if (res.success) {
        toast.success("受講生を追加しました");
        setIsDialogOpen(false);
        loadStudents();
      } else {
        toast.error("追加に失敗しました");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？\n（関連する予約がある場合、データ不整合が起きる可能性があります）")) return;
    const res = await deleteStudent(id);
    if (res.success) {
      toast.success("削除しました");
      loadStudents();
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({ name: "", phone: "", email: "", memo: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (student: SchoolStudent) => {
    setEditingId(student.id);
    setFormData({ 
      name: student.name, 
      phone: student.phone || "",
      email: student.email || "",
      memo: student.memo || ""
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
            <Users className="text-indigo-600" /> 受講生管理
          </h1>
          <p className="text-slate-500 font-medium mt-1">スクール受講生の連絡先やメモを管理</p>
        </div>
        <Button onClick={openAddDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Plus size={18} className="mr-2" />
          新規受講生追加
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => (
            <Card key={student.id} className="border-slate-200 shadow-sm relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-black text-slate-800">{student.name}</CardTitle>
                <div className="text-xs font-mono text-slate-400 mt-1">ID: {student.id}</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      {student.phone}
                    </div>
                  )}
                  {student.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  )}
                  {student.memo && (
                    <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded whitespace-pre-wrap mt-2">
                      {student.memo}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2 border-t border-slate-100 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(student)}>
                      <Edit2 size={16} className="mr-2" /> 編集
                    </Button>
                    <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(student.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {students.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 font-bold bg-white rounded-2xl border border-slate-200 border-dashed">
              登録されている受講生がありません
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingId ? "受講生の編集" : "新規受講生追加"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">氏名</label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="例: 山田 花子"
                className="font-bold h-11"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">電話番号</label>
              <Input 
                type="tel"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="090-1234-5678"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">メールアドレス</label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="test@example.com"
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">メモ</label>
              <Textarea 
                value={formData.memo} 
                onChange={e => setFormData({...formData, memo: e.target.value})}
                placeholder="経歴や特記事項など"
                className="resize-none"
                rows={3}
              />
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
