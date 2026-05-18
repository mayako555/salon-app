"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Award, User, Star, Calendar, Zap, Target, BarChart3, Heart, MessageSquare, ShieldCheck, Users, Box } from "lucide-react";
import { StaffEvaluation, EVALUATION_CATEGORIES, RANK_CRITERIA, GRADE_WEIGHTS } from "./constants";
import { upsertEvaluation, getEvaluationMetrics } from "./actions";
import { getContractsList } from "@/app/contracts/actions";

// Radar Chart Component (5-axis)
function RadarChart({ scores }: { scores: StaffEvaluation["category_scores"] }) {
  const size = 220;
  const center = size / 2;
  const radius = 80;
  
  const axes = [
    { label: "技術", key: "technology" },
    { label: "接客", key: "service" },
    { label: "売上", key: "sales" },
    { label: "行動", key: "behavior" },
    { label: "チーム", key: "brand" },
  ];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const x = center + (radius * (value / 5)) * Math.cos(angle);
    const y = center + (radius * (value / 5)) * Math.sin(angle);
    return `${x},${y}`;
  };

  const points = axes.map((axis, i) => getPoint(i, scores?.[axis.key as keyof typeof scores] || 3)).join(" ");
  
  return (
    <div className="relative w-[220px] h-[220px] mx-auto bg-white rounded-full flex items-center justify-center shadow-inner">
      <svg width={size} height={size} className="overflow-visible">
        {[1, 2, 3, 4, 5].map(level => (
          <polygon
            key={level}
            points={axes.map((_, i) => getPoint(i, level)).join(" ")}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}
        {axes.map((_, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos((Math.PI * 2 * i) / axes.length - Math.PI / 2)}
            y2={center + radius * Math.sin((Math.PI * 2 * i) / axes.length - Math.PI / 2)}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={points}
          fill="rgba(139, 92, 246, 0.25)"
          stroke="#8b5cf6"
          strokeWidth="3"
          className="transition-all duration-500 ease-out"
        />
        {axes.map((axis, i) => {
          const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
          const x = center + (radius + 25) * Math.cos(angle);
          const y = center + (radius + 18) * Math.sin(angle);
          return (
            <text
              key={axis.label}
              x={x}
              y={y}
              fontSize="11"
              fontWeight="900"
              textAnchor="middle"
              fill="#475569"
              className="tracking-tighter"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

const INITIAL_DETAILS = {
  technology: [
    { id: "tech_accuracy", name: "技術手順の正確さ (ミス・付け漏れなし)", score: 3 },
    { id: "tech_finish", name: "仕上がりの美しさ (左右差・方向性・再現性)", score: 3 },
    { id: "tech_hygiene", name: "衛生管理 (器具消毒・施術環境の清潔さ)", score: 3 },
    { id: "tech_speed", name: "スピード (時間内で正確に仕上げる)", score: 3 },
  ],
  service: [
    { id: "svc_counseling", name: "カウンセリングの丁寧さと正確さ", score: 3 },
    { id: "svc_attitude", name: "言葉遣い・態度・笑顔", score: 3 },
    { id: "svc_proposal", name: "お客様の立場に立った提案や説明", score: 3 },
    { id: "svc_trouble", name: "トラブル時の単独対応力", score: 3 },
  ],
  sales: [
    { id: "sale_total", name: "売上高", score: 3, is_auto: true },
    { id: "sale_unit", name: "客単価", score: 3, is_auto: true },
    { id: "sale_nomination", name: "指名率", score: 3, is_auto: true },
    { id: "sale_repeat", name: "再来率", score: 3, is_auto: true },
  ],
  behavior: [
    { id: "bhv_attendance", name: "勤怠・時間厳守", score: 3 },
    { id: "bhv_grooming", name: "身だしなみ・清潔感", score: 3 },
    { id: "bhv_report", name: "報告・連絡・相談の適切さ", score: 3 },
    { id: "bhv_improvement", name: "指摘の受け止め方と改善の早さ", score: 3 },
    { id: "bhv_inventory_use", name: "在庫管理: 使用量の適正化", score: 3 },
    { id: "bhv_inventory_check", name: "在庫管理: 在庫チェック・補充の正確さ", score: 3 },
  ],
  brand: [
    { id: "team_collab", name: "他スタッフとの協力姿勢", score: 3 },
    { id: "team_support", name: "フォロー・助け合い", score: 3 },
    { id: "team_workspace", name: "共有物や作業スペースの扱い", score: 3 },
    { id: "junior_learning", name: "ジュニア特有: 学習姿勢・研修進捗", score: 3 },
    { id: "junior_safety", name: "ジュニア特有: モデル施術時の安全管理", score: 3 },
  ],
};

export default function EvaluationFormDialog({ 
  isOpen, 
  onOpenChange, 
  onSuccess,
  initialData
}: { 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void,
  onSuccess: () => void,
  initialData?: StaffEvaluation | null
}) {
  const [staffList, setStaffList] = useState<{id: string, name: string, grade?: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<StaffEvaluation>>({
    staff_id: "",
    staff_name: "",
    evaluation_date: new Date().toISOString().split('T')[0],
    target_period: (() => {
      const now = new Date();
      const month = now.getMonth();
      const q = Math.floor(month / 3) + 1;
      return `${now.getFullYear()}Q${q}`;
    })(),
    category_scores: {
      technology: 3,
      service: 3,
      sales: 3,
      behavior: 3,
      brand: 3
    },
    details: INITIAL_DETAILS,
    overall_comment: "",
    overall_rank: "B"
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        staff_id: "",
        staff_name: "",
        evaluation_date: new Date().toISOString().split('T')[0],
        target_period: (() => {
          const now = new Date();
          const month = now.getMonth();
          const q = Math.floor(month / 3) + 1;
          return `${now.getFullYear()}Q${q}`;
        })(),
        category_scores: {
          technology: 3,
          service: 3,
          sales: 3,
          behavior: 3,
          brand: 3
        },
        details: INITIAL_DETAILS,
        overall_comment: "",
        overall_rank: "B"
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!formData.staff_id || !formData.target_period || !isOpen) return;
      
      const res = await getEvaluationMetrics(formData.staff_id, formData.target_period);
      if (res.success && res.metrics) {
        const m = res.metrics;
        const nextDetails = { ...formData.details! };
        
        // Update Sales sub-items
        nextDetails.sales = nextDetails.sales.map(item => {
          if (item.id === "sale_total") return { ...item, score: m.total_sales > 1000000 ? 5 : m.total_sales > 700000 ? 4 : 3, value: m.total_sales };
          if (item.id === "sale_unit") return { ...item, score: m.unit_price > 12000 ? 5 : m.unit_price > 10000 ? 4 : 3, value: m.unit_price };
          if (item.id === "sale_nomination") return { ...item, score: m.nomination_rate > 50 ? 5 : m.nomination_rate > 30 ? 4 : 3, value: m.nomination_rate };
          if (item.id === "sale_repeat") return { ...item, score: m.repeat_rate > 60 ? 5 : m.repeat_rate > 40 ? 4 : 3, value: m.repeat_rate };
          return item;
        });

        // Update Service sub-items (review replies)
        nextDetails.service = nextDetails.service.map(item => {
          if (item.id === "svc_review_reply") return { ...item, score: m.review_replies_count > 5 ? 5 : m.review_replies_count > 0 ? 4 : 3, value: m.review_replies_count };
          return item;
        });

        // Update Technology sub-items (rework penalty)
        nextDetails.technology = nextDetails.technology.map(item => {
            if (item.id === "tech_accuracy") return { ...item, score: m.rework_count === 0 ? 5 : m.rework_count < 2 ? 4 : 2, value: m.rework_count };
            return item;
        });

        // Update Category Scores
        const salesAvg = Math.round((nextDetails.sales.reduce((sum, i) => sum + i.score, 0) / nextDetails.sales.length) * 10) / 10;
        const techAvg = Math.round((nextDetails.technology.reduce((sum, i) => sum + i.score, 0) / nextDetails.technology.length) * 10) / 10;
        const serviceAvg = Math.round((nextDetails.service.reduce((sum, i) => sum + i.score, 0) / nextDetails.service.length) * 10) / 10;
        
        setFormData(prev => ({
          ...prev,
          details: nextDetails,
          category_scores: {
            ...prev.category_scores!,
            sales: salesAvg,
            technology: techAvg,
            service: serviceAvg
          },
          review_allowance: m.review_allowance // Store the calculated allowance
        } as any));
      }
    };
    fetchMetrics();
  }, [formData.staff_id, formData.target_period, isOpen]);

  useEffect(() => {
    const fetchStaff = async () => {
      const contracts = await getContractsList();
      const uniqueStaff = Array.from(new Set(contracts.map(c => c.staff_id))).map(id => {
        const c = contracts.find(x => x.staff_id === id);
        return { id, name: c?.staff_name || "不明", grade: c?.grade };
      });
      setStaffList(uniqueStaff);
    };
    fetchStaff();
  }, []);

  const handleSubScoreChange = (category: keyof typeof INITIAL_DETAILS, subId: string, val: number) => {
    const nextDetails = { ...formData.details! };
    const categoryList = [...nextDetails[category]];
    const itemIndex = categoryList.findIndex(item => item.id === subId);
    
    if (itemIndex > -1) {
      categoryList[itemIndex] = { ...categoryList[itemIndex], score: val };
      nextDetails[category] = categoryList;
      
      // Recalculate main category score (average)
      const avg = Math.round((categoryList.reduce((sum, item) => sum + item.score, 0) / categoryList.length) * 10) / 10;
      const nextCategoryScores = { ...formData.category_scores!, [category]: avg };
      
      // Get current staff's grade weights
      const staffGrade = staffList.find(s => s.id === formData.staff_id)?.grade || "default";
      const weights = GRADE_WEIGHTS[staffGrade as keyof typeof GRADE_WEIGHTS] || GRADE_WEIGHTS["default"];
      
      // Recalculate Overall Score (Weighted Average)
      // Overall = Sum(Score * Weight) / 100
      const weightedSum = (Object.keys(nextCategoryScores) as Array<keyof typeof nextCategoryScores>).reduce((sum, key) => {
        const score = nextCategoryScores[key] || 0;
        const weight = weights[key as keyof typeof weights] || 20;
        return sum + (score * weight);
      }, 0);
      const overallScore = weightedSum / 100;

      // Determine Rank
      let rank: StaffEvaluation["overall_rank"] = "B";
      if (overallScore >= 4.6) rank = "S";
      else if (overallScore >= 4.0) rank = "A";
      else if (overallScore >= 3.0) rank = "B";
      else if (overallScore >= 2.0) rank = "C";
      else rank = "D";

      setFormData({ 
        ...formData, 
        details: nextDetails, 
        category_scores: nextCategoryScores,
        overall_rank: rank 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staff_id) return alert("スタッフを選択してください");
    
    setIsSubmitting(true);
    const res = await upsertEvaluation({
      ...formData,
      evaluator_name: "管理者",
      current_grade_code: staffList.find(s => s.id === formData.staff_id)?.grade || "J1",
      status: "completed"
    });
    
    if (res.success) {
      onOpenChange(false);
      onSuccess();
    } else {
      alert("エラー: " + res.error);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] w-[98vw] max-h-[96vh] overflow-hidden flex flex-col p-0 bg-slate-50 border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 tracking-tighter">
                <div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg shadow-purple-200">
                  <Award size={22} />
                </div>
                Performance Review
              </DialogTitle>
              <p className="text-slate-400 text-[11px] font-black flex items-center gap-1 ml-1 uppercase tracking-widest">
                <Target size={12} /> Data-Driven & Brand Excellence Evaluation
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Rank</p>
                <div className="text-5xl font-black text-purple-600 leading-none">{formData.overall_rank}</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Basic Info & Chart (Span 4) */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">対象スタッフ</Label>
                    <Select 
                      onValueChange={(val) => {
                        const s = staffList.find(x => x.id === val);
                        setFormData({ ...formData, staff_id: val, staff_name: s?.name });
                      }}
                      value={formData.staff_id}
                    >
                      <SelectTrigger className="w-full bg-slate-50 border-none h-10 font-bold text-slate-800 rounded-xl ring-1 ring-slate-200">
                        <SelectValue placeholder="スタッフを選択" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        {staffList.map(s => (
                          <SelectItem key={s.id} value={s.id} className="font-bold py-2.5">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">評価日</Label>
                      <Input 
                        type="date" 
                        value={formData.evaluation_date}
                        onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
                        className="bg-slate-50 border-none h-9 font-bold text-slate-700 rounded-xl ring-1 ring-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">対象期間</Label>
                      <Select 
                        onValueChange={(val) => setFormData({ ...formData, target_period: val })}
                        value={formData.target_period}
                      >
                        <SelectTrigger className="w-full bg-slate-50 border-none h-9 font-bold text-slate-700 rounded-xl ring-1 ring-slate-200">
                          <SelectValue placeholder="期間" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const year = new Date().getFullYear();
                            return [4,3,2,1].map(q => (
                              <SelectItem key={q} value={`${year}Q${q}`}>{year}年 第{q}四半期</SelectItem>
                            ))
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1">
                      <MessageSquare size={12} className="text-blue-500" /> 面談予定日
                    </Label>
                    <Input 
                      type="date" 
                      value={formData.interview_date || ""}
                      onChange={(e) => setFormData({ ...formData, interview_date: e.target.value, interview_status: "pending" })}
                      className="bg-slate-50 border-none h-9 font-bold text-slate-700 rounded-xl ring-1 ring-slate-200"
                    />
                  </div>

                  {/* Calculated Allowance Badge */}
                  {formData.id === undefined && (Object.keys(formData.category_scores || {}).length > 0) && (
                    <div className="mt-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">自動計算手当</p>
                        <Badge className="bg-emerald-500 text-white border-none font-black">確定予定</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">口コミ手当:</span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-sm">¥</span>
                          <Input 
                            type="number"
                            value={(formData as any).review_allowance || 0}
                            onChange={(e) => setFormData({ ...formData, review_allowance: parseInt(e.target.value) || 0 } as any)}
                            className="pl-7 bg-white border-emerald-200 h-9 rounded-xl font-black text-emerald-700 focus:ring-emerald-500 shadow-sm"
                          />
                        </div>
                        <span className="text-[10px] text-emerald-500 font-bold whitespace-nowrap">(自動計算ベース)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-2 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-center aspect-square relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <RadarChart scores={formData.category_scores as StaffEvaluation["category_scores"]} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">総合コメント / 次回目標</Label>
                <Textarea 
                  placeholder="エクセルにある「コメント/次回目標」をここに入力..."
                  value={formData.overall_comment}
                  onChange={(e) => setFormData({ ...formData, overall_comment: e.target.value })}
                  className="min-h-[120px] bg-white border-slate-100 rounded-2xl text-xs p-3 shadow-sm resize-none focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Right Column: Detailed Tabs (Span 8) */}
            <div className="lg:col-span-8">
              <Tabs defaultValue="technology" className="h-full flex flex-col">
                <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-full grid grid-cols-5 h-14 mb-6">
                  <TabsTrigger value="technology" className="rounded-xl font-black text-[11px] data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <Zap size={13} className="mr-1" />技術
                  </TabsTrigger>
                  <TabsTrigger value="service" className="rounded-xl font-black text-[11px] data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <Heart size={13} className="mr-1" />接客
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="rounded-xl font-black text-[11px] data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <BarChart3 size={13} className="mr-1" />売上
                  </TabsTrigger>
                  <TabsTrigger value="behavior" className="rounded-xl font-black text-[11px] data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <ShieldCheck size={13} className="mr-1" />行動
                  </TabsTrigger>
                  <TabsTrigger value="brand" className="rounded-xl font-black text-[11px] data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <Users size={13} className="mr-1" />チーム
                  </TabsTrigger>
                </TabsList>

                {(Object.keys(INITIAL_DETAILS) as Array<keyof typeof INITIAL_DETAILS>).map((catKey) => (
                  <TabsContent key={catKey} value={catKey} className="mt-0 space-y-4 focus-visible:outline-none">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                        <div>
                          <h3 className="text-xl font-black text-slate-800">
                            {catKey === "technology" ? "技術スキル" : 
                             catKey === "service" ? "接客スキル" : 
                             catKey === "behavior" ? "業務態度・在庫管理" : 
                             catKey === "brand" ? "チームワーク・ジュニア特有" : "売上分析"}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                            {catKey} detailed metrics
                          </p>
                        </div>
                        <div className="bg-purple-50 px-4 py-2 rounded-2xl text-center min-w-[80px]">
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-tighter">Avg</p>
                          <p className="text-2xl font-black text-purple-700">{formData.category_scores?.[catKey as keyof StaffEvaluation["category_scores"]]}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {formData.details?.[catKey].map((item) => (
                          <div key={item.id} className="space-y-4 group">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-black text-slate-700 group-hover:text-purple-600 transition-colors">
                                {item.name}
                                {item.is_auto && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-black italic">AUTO</span>}
                              </Label>
                              <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => handleSubScoreChange(catKey, item.id, lvl)}
                                    className={`w-9 h-9 rounded-xl font-black transition-all text-xs ${
                                      item.score === lvl 
                                        ? "bg-purple-600 text-white shadow-lg shadow-purple-200 scale-110" 
                                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                    }`}
                                  >
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-200 to-purple-600 transition-all duration-500"
                                style={{ width: `${(item.score / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-white border-t border-slate-100 shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px] h-12 rounded-2xl shadow-xl shadow-slate-200 font-black text-base gap-2 group transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
            {isSubmitting ? "保存中..." : "評価を確定して保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
