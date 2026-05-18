"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  TrendingUp, 
  Plus, 
  Calendar, 
  User, 
  ChevronRight, 
  Search,
  Award,
  Zap,
  Heart,
  BarChart3,
  ShieldCheck,
  ArrowUpRight,
  Target,
  Edit2,
  Trash2,
  Loader2
} from "lucide-react";
import { StaffEvaluation, RANK_CRITERIA, EVALUATION_CATEGORIES } from "./constants";
import { getStaffEvaluations, deleteEvaluation } from "./actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import EvaluationFormDialog from "./EvaluationFormDialog";
import { toast } from "sonner";

function CategoryIcon({ id }: { id: string }) {
  switch(id) {
    case "technology": return <Zap size={14} />;
    case "service": return <Heart size={14} />;
    case "sales": return <BarChart3 size={14} />;
    case "behavior": return <ShieldCheck size={14} />;
    case "brand": return <Star size={14} />;
    default: return null;
  }
}

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<StaffEvaluation | null>(null);

  const fetchEvals = async () => {
    setLoading(true);
    const data = await getStaffEvaluations();
    setEvaluations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvals();
  }, []);

  const handleEdit = (evalItem: StaffEvaluation) => {
    setEditingEval(evalItem);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この評価データを削除してもよろしいですか？")) return;
    
    const res = await deleteEvaluation(id);
    if (res.success) {
      toast.success("評価を削除しました");
      fetchEvals();
    } else {
      toast.error("削除に失敗しました: " + res.error);
    }
  };

  const handleOpenNew = () => {
    setEditingEval(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-2xl shadow-xl shadow-slate-200 text-white">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Performance Analysis</h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-600 border-none text-[9px] font-black h-5 uppercase tracking-widest px-2">Data & Brand Metrics</Badge>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluation System v2.0</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:flex relative group">
                <Search size={18} className="absolute left-3 top-2.5 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                <input 
                  placeholder="スタッフ名で検索..." 
                  className="bg-slate-100 border-none h-10 pl-10 pr-4 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none w-64 transition-all"
                />
             </div>
            <Button 
              onClick={handleOpenNew}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-2xl shadow-purple-200 rounded-xl px-5 h-10 font-black text-xs transition-all active:scale-95"
            >
              <Plus size={18} />
              新規評価を作成
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white border-none shadow-sm rounded-[32px] p-2">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Reviews</p>
              <div className="flex items-end gap-2">
                <p className="text-5xl font-black text-slate-900 tabular-nums leading-none">{evaluations.length}</p>
                <p className="text-sm font-bold text-emerald-500 mb-1 flex items-center gap-0.5">
                  <ArrowUpRight size={14} /> +2
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-4">累計評価データ件数</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm rounded-[32px] p-2 border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Premium Talent</p>
              <div className="flex items-end gap-2">
                <p className="text-5xl font-black text-purple-600 tabular-nums leading-none">
                  {evaluations.length > 0 
                    ? Math.round((evaluations.filter(e => e.overall_rank === "S" || e.overall_rank === "A").length / evaluations.length) * 100)
                    : 0
                  }
                </p>
                <p className="text-lg font-black text-purple-200 mb-1">%</p>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-4">S/A ランク比率</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-2xl rounded-[32px] p-2 text-white md:col-span-2">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Current Focus</p>
                <h3 className="text-xl font-bold leading-tight">「技術の持続力」と「ブランド理念」の<br />浸透率向上フェーズ</h3>
              </div>
              <div className="flex gap-3 mt-6">
                <div className="px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Growth Rate: +12%</div>
                <div className="px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Brand Power: v2.1</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evaluation List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-2 h-8 bg-purple-600 rounded-full" />
              Latest Reviews
            </h2>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort by: Date</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="h-40 bg-white rounded-[32px] animate-pulse" />
              ))
            ) : evaluations.length === 0 ? (
              <div className="py-32 bg-white border-none shadow-sm rounded-[40px] flex flex-col items-center justify-center text-slate-300">
                <Award size={64} className="mb-6 opacity-10" />
                <p className="font-black text-lg">No Analysis Data Yet</p>
                <p className="text-xs font-bold mt-1 text-slate-400">最新データでスタッフを分析しましょう</p>
              </div>
            ) : (
              evaluations.map(evalItem => {
                const criteria = RANK_CRITERIA.find(r => r.rank === evalItem.overall_rank);
                return (
                  <Card key={evalItem.id} className="group hover:shadow-2xl transition-all duration-500 border-none bg-white rounded-[32px] overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row h-full">
                        {/* Rank & Profile */}
                        <div className="md:w-64 p-8 flex flex-col items-center justify-center border-r border-slate-50 bg-slate-50/30 group-hover:bg-white transition-colors duration-500">
                          <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-5xl ${criteria?.color || 'text-slate-400'} shadow-lg border border-white relative overflow-hidden group-hover:scale-105 transition-transform duration-500`}>
                             <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                             {evalItem.overall_rank}
                          </div>
                          <h3 className="mt-4 font-black text-slate-900 text-lg">{evalItem.staff_name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                             <Badge className="bg-slate-900 text-white text-[9px] font-black h-5 uppercase tracking-tighter px-2 border-none">
                               Grade: {evalItem.current_grade_code || "P1"}
                             </Badge>
                          </div>
                        </div>

                        {/* Metrics Breakdown */}
                        <div className="flex-1 p-8 space-y-6">
                          <div className="flex justify-between items-start">
                             <div className="flex gap-4">
                                {EVALUATION_CATEGORIES.map(cat => (
                                  <div key={cat.id} className="text-center group/item">
                                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all ${
                                       (evalItem.category_scores?.[cat.id as keyof typeof evalItem.category_scores] || 0) >= 4 
                                       ? "bg-purple-100 text-purple-600 group-hover/item:bg-purple-600 group-hover/item:text-white" 
                                       : "bg-slate-100 text-slate-400"
                                     }`}>
                                       <CategoryIcon id={cat.id} />
                                     </div>
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{cat.name}</p>
                                     <p className="text-sm font-black text-slate-700">
                                       {evalItem.category_scores?.[cat.id as keyof typeof evalItem.category_scores] || 0}
                                     </p>
                                  </div>
                                ))}
                             </div>
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-end gap-1 mb-1">
                                  <Calendar size={10} />
                                  {evalItem.evaluation_date}
                                </span>
                                <Badge variant="outline" className="text-[9px] font-black h-5 border-slate-200 text-slate-400 tracking-widest">
                                  {evalItem.target_period ? evalItem.target_period.replace('Q', 'Y 第') : "---- "}四半期
                                </Badge>
                             </div>
                          </div>

                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 relative group-hover:bg-white transition-colors duration-500">
                             <div className="absolute -left-1.5 top-4 w-1 h-8 bg-purple-200 rounded-full" />
                             <p className="text-xs text-slate-500 leading-relaxed font-bold italic line-clamp-2">
                               "{evalItem.overall_comment || "評価コメントはまだありません。"}"
                             </p>
                          </div>
                        </div>

                        {/* Action Area */}
                        <div className="md:w-20 p-4 flex flex-col gap-3 items-center justify-center border-l border-slate-50 bg-slate-50/30">
                           <Button 
                             variant="ghost" 
                             size="icon"
                             onClick={() => handleEdit(evalItem)}
                             className="h-10 w-10 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all active:scale-90"
                           >
                              <Edit2 size={18} />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon"
                             onClick={() => evalItem.id && handleDelete(evalItem.id)}
                             className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90"
                           >
                              <Trash2 size={18} />
                           </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      <EvaluationFormDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSuccess={fetchEvals}
        initialData={editingEval}
      />
    </div>
  );
}
