"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Loader2, 
  MoveUp,
  MoveDown,
  Info
} from "lucide-react";
import Link from "next/link";
import { getSalaryGrades, upsertSalaryGrade, deleteSalaryGrade, SalaryGrade } from "./actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SalaryGradesPage() {
  const [grades, setGrades] = useState<SalaryGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState<Partial<SalaryGrade> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    const data = await getSalaryGrades();
    setGrades(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;
    
    setIsSaving(true);
    const res = await upsertSalaryGrade(editingGrade as SalaryGrade);
    
    if (res.success) {
      setEditingGrade(null);
      fetchGrades();
    } else {
      alert("保存に失敗しました: " + res.error);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この等級を削除してもよろしいですか？")) return;
    const res = await deleteSalaryGrade(id);
    if (res.success) {
      setGrades(grades.filter(g => g.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/contracts" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">等級（グレード）マスタ管理</h1>
              <p className="text-xs text-slate-500 font-normal">給与・時給計算の基準となる等級設定</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setEditingGrade({ 
              code: "", 
              title: "",
              hourly: 1120,
              base: 200000,
              role: 0,
              attendance: 0,
              service: 0,
              display_order: grades.length
            })}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus size={18} />
            新規等級追加
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3 text-blue-800">
          <Info size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            ここで設定した内容は、スタッフの「契約設定」で等級を選択した際に自動的に反映されます。
            <br />既存の契約には影響しません（次回更新時や再設定時に反映されます）。
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-24">コード</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="text-right">時給 (円)</TableHead>
                  <TableHead className="text-right">月給ベース</TableHead>
                  <TableHead className="text-right">業務手当</TableHead>
                  <TableHead className="text-right">皆勤手当</TableHead>
                  <TableHead className="text-right">勤務手当</TableHead>
                  <TableHead className="text-right font-bold text-blue-600 bg-blue-50/50">合計月給</TableHead>
                  <TableHead className="w-24 text-right pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                      <Loader2 className="animate-spin mx-auto mb-2" />
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                      等級が登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map(grade => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-bold text-slate-900">{grade.code}</TableCell>
                      <TableCell className="font-medium text-slate-700">{grade.title}</TableCell>
                      <TableCell className="text-right font-mono">¥{grade.hourly.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">¥{grade.base.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">¥{grade.role.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-slate-600">¥{grade.attendance.toLocaleString()}</TableCell>
                       <TableCell className="text-right font-mono text-slate-600">¥{grade.service.toLocaleString()}</TableCell>
                       <TableCell className="text-right font-bold text-blue-700 bg-blue-50/30">
                         {(() => {
                           const customTotal = (grade.custom_allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
                           return `¥${(grade.base + grade.role + grade.attendance + grade.service + customTotal).toLocaleString()}`;
                         })()}
                         {(grade.custom_allowances || []).length > 0 && (
                           <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                             他 {(grade.custom_allowances || []).length} 項目
                           </div>
                         )}
                       </TableCell>
                       <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                            onClick={() => setEditingGrade(grade)}
                          >
                            <Save size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                            onClick={() => handleDelete(grade.id!)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Editor Modal */}
      {editingGrade && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSave}>
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-lg">
                  {editingGrade.id ? "等級の編集" : "新規等級の登録"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">等級コード</label>
                    <Input 
                      required
                      value={editingGrade.code || ""} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, code: e.target.value })}
                      placeholder="J1, P1, etc."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">等級名称</label>
                    <Input 
                      required
                      value={editingGrade.title || ""} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, title: e.target.value })}
                      placeholder="例: パーマ合格"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">時給 (円)</label>
                    <Input 
                      type="number"
                      required
                      value={editingGrade.hourly || 0} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, hourly: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">月給ベース (円)</label>
                    <Input 
                      type="number"
                      required
                      value={editingGrade.base || 0} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, base: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">業務手当 (円)</label>
                    <Input 
                      type="number"
                      value={editingGrade.role || 0} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, role: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">皆勤手当 (円)</label>
                    <Input 
                      type="number"
                      value={editingGrade.attendance || 0} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, attendance: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">勤務手当 (円)</label>
                    <Input 
                      type="number"
                      value={editingGrade.service || 0} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, service: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">表示順</label>
                    <Input 
                      type="number"
                      value={editingGrade.display_order || 0} 
                      onChange={(e) => setEditingGrade({ ...editingGrade, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-800">個別手当の追加</h4>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const current = editingGrade.custom_allowances || [];
                        setEditingGrade({ ...editingGrade, custom_allowances: [...current, { name: "", amount: 0 }] });
                      }}
                      className="h-7 text-[10px] font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-2"
                    >
                      <Plus size={12} className="mr-1" />
                      手当を追加
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {(editingGrade.custom_allowances || []).map((adj, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input 
                          placeholder="手当名 (例: SNS手当)" 
                          value={adj.name} 
                          onChange={e => {
                            const next = [...(editingGrade.custom_allowances || [])];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setEditingGrade({ ...editingGrade, custom_allowances: next });
                          }}
                          className="flex-1 h-9 text-xs" 
                        />
                        <div className="relative w-28">
                          <Input 
                            type="number" 
                            placeholder="金額" 
                            value={adj.amount} 
                            onChange={e => {
                              const next = [...(editingGrade.custom_allowances || [])];
                              next[idx] = { ...next[idx], amount: parseInt(e.target.value) || 0 };
                              setEditingGrade({ ...editingGrade, custom_allowances: next });
                            }}
                            className="w-full h-9 text-xs pr-6" 
                          />
                          <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">¥</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            const next = (editingGrade.custom_allowances || []).filter((_, i) => i !== idx);
                            setEditingGrade({ ...editingGrade, custom_allowances: next });
                          }}
                          className="h-9 w-9 text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                    {(editingGrade.custom_allowances || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">個別手当はありません</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditingGrade(null)} disabled={isSaving}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : "保存する"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
