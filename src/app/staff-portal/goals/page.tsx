"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMonthlyGoal, updateMonthlyGoal, getStaffKPIs, MonthlyGoal, StaffKPIs } from "@/app/goals/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, Target, CheckCircle, TrendingUp, Users as UsersIcon, Star, User, Heart, Search } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function StaffGoalsPage() {
  const { profile, selectedStore } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [goal, setGoal] = useState<MonthlyGoal | null>(null);
  const [kpis, setKpis] = useState<StaffKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [formData, setFormData] = useState<Partial<MonthlyGoal>>({});

  useEffect(() => {
    if (profile) {
      loadData(month);
    }
  }, [profile, month, selectedStore]);

  const loadData = async (date: Date) => {
    if (!profile) return;
    setLoading(true);
    try {
      const monthStr = format(date, "yyyy-MM");
      const fetchedGoal = await getMonthlyGoal(profile.id, profile.name, selectedStore, monthStr);
      setGoal(fetchedGoal);
      setFormData({
        sns_posts: fetchedGoal.sns_posts,
        practice_count: fetchedGoal.practice_count,
        review_count: fetchedGoal.review_count,
        action_plan_revenue: fetchedGoal.action_plan_revenue,
        sns_target: fetchedGoal.sns_target,
        action_plan_sns: fetchedGoal.action_plan_sns,
        tech_target: fetchedGoal.tech_target,
        action_plan_tech: fetchedGoal.action_plan_tech,
        service_target: fetchedGoal.service_target,
        action_plan_service: fetchedGoal.action_plan_service,
        challenge: fetchedGoal.challenge,
        private_goal: fetchedGoal.private_goal,
        action_plan_private: fetchedGoal.action_plan_private,
        reflection: fetchedGoal.reflection
      });

      const fetchedKpis = await getStaffKPIs(profile.name, monthStr);
      setKpis(fetchedKpis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!goal) return;
    setSaving(true);
    try {
      await updateMonthlyGoal(goal.id, formData);
      alert("保存しました");
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof MonthlyGoal, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading || !kpis || !goal) {
    return <div className="p-8 text-center text-slate-500">読み込み中...</div>;
  }

  const achievementRate = goal.revenue_target > 0 ? Math.round((kpis.revenue / goal.revenue_target) * 100) : 0;
  const remainingRevenue = Math.max(0, goal.revenue_target - kpis.revenue);

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "bg-emerald-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-rose-500";
  };

  const getTextColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-rose-600";
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Target className="text-blue-600" />
            月間目標・KPI管理
          </h1>
          <p className="text-slate-500 mt-1 text-sm">目標を設定し、日々の進捗を確認しましょう</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-md shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))} className="h-8 w-8 hover:bg-slate-200 rounded-sm">
            <ChevronLeft size={16} />
          </Button>
          <div className="px-4 font-bold text-slate-700 tabular-nums">
            {format(month, "yyyy年 MM月")}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))} className="h-8 w-8 hover:bg-slate-200 rounded-sm">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Main Progress Card */}
        <Card className="md:col-span-2 shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">達成率</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-5xl font-black tabular-nums tracking-tighter", getTextColor(achievementRate))}>
                    {achievementRate}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-500 mb-1">売上目標</p>
                <p className="text-xl font-bold text-slate-700 tabular-nums">¥{goal.revenue_target.toLocaleString()}</p>
              </div>
            </div>

            <div className="h-4 bg-slate-200 rounded-full overflow-hidden mb-4">
              <div 
                className={cn("h-full transition-all duration-1000", getProgressColor(achievementRate))}
                style={{ width: `${Math.min(100, achievementRate)}%` }}
              />
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-400 font-bold">現在の売上実績</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">¥{kpis.revenue.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold">あと必要売上</p>
                <p className="text-lg font-bold text-slate-600 tabular-nums">¥{remainingRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Small KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <UsersIcon size={16} />
                <span className="text-xs font-bold">客数</span>
              </div>
              <p className="text-2xl font-black text-slate-800 tabular-nums">{kpis.customer_count} <span className="text-sm font-bold text-slate-400">名</span></p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <TrendingUp size={16} />
                <span className="text-xs font-bold">客単価</span>
              </div>
              <p className="text-2xl font-black text-slate-800 tabular-nums">¥{kpis.average_spend.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <CheckCircle size={16} />
                <span className="text-xs font-bold">次回予約率</span>
              </div>
              <p className="text-2xl font-black text-slate-800 tabular-nums">{kpis.next_booking_rate}% <span className="text-sm font-bold text-slate-400">({kpis.next_booking_count}名)</span></p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Star size={16} />
                <span className="text-xs font-bold">指名率</span>
              </div>
              <p className="text-2xl font-black text-slate-800 tabular-nums">{kpis.nomination_rate}% <span className="text-sm font-bold text-slate-400">({kpis.nomination_count}名)</span></p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual KPIs Input */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <Search className="w-5 h-5 text-blue-500" />
            活動量（手動入力KPI）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-600 font-bold">SNS投稿数</Label>
              <Input 
                type="number" 
                value={formData.sns_posts || 0} 
                onChange={(e) => handleInputChange("sns_posts", parseInt(e.target.value) || 0)}
                className="bg-slate-50 text-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-bold">口コミ件数</Label>
              <Input 
                type="number" 
                value={formData.review_count || 0} 
                onChange={(e) => handleInputChange("review_count", parseInt(e.target.value) || 0)}
                className="bg-slate-50 text-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-bold">練習回数</Label>
              <Input 
                type="number" 
                value={formData.practice_count || 0} 
                onChange={(e) => handleInputChange("practice_count", parseInt(e.target.value) || 0)}
                className="bg-slate-50 text-xl font-bold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Input Form */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 flex flex-row justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <User className="w-5 h-5 text-emerald-500" />
            アクションプラン
          </CardTitle>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4 mr-2" />
            保存する
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-1">
              <h3 className="font-bold text-slate-800">売上目標</h3>
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">売上を達成するための具体的な行動</Label>
              <Textarea 
                value={formData.action_plan_revenue || ""} 
                onChange={(e) => handleInputChange("action_plan_revenue", e.target.value)}
                placeholder="例: 単価アップのため、全接客でトリートメントの提案をする"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-indigo-500 pl-4 py-1">
              <h3 className="font-bold text-slate-800">SNS目標</h3>
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">SNS目標（フォロワー数・投稿内容など）</Label>
              <Input 
                value={formData.sns_target || ""} 
                onChange={(e) => handleInputChange("sns_target", e.target.value)}
                placeholder="例: インスタフォロワー1000人達成"
              />
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">SNS目標を達成するための具体的な行動</Label>
              <Textarea 
                value={formData.action_plan_sns || ""} 
                onChange={(e) => handleInputChange("action_plan_sns", e.target.value)}
                placeholder="例: 毎日21時にリール動画を投稿する"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-emerald-500 pl-4 py-1">
              <h3 className="font-bold text-slate-800">技術目標</h3>
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">技術目標</Label>
              <Input 
                value={formData.tech_target || ""} 
                onChange={(e) => handleInputChange("tech_target", e.target.value)}
                placeholder="例: 新しいカラー技術の習得"
              />
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">技術目標を達成するための具体的な行動</Label>
              <Textarea 
                value={formData.action_plan_tech || ""} 
                onChange={(e) => handleInputChange("action_plan_tech", e.target.value)}
                placeholder="例: 週2回、先輩にモデルチェックをお願いする"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-amber-500 pl-4 py-1">
              <h3 className="font-bold text-slate-800">接客目標</h3>
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">接客目標</Label>
              <Input 
                value={formData.service_target || ""} 
                onChange={(e) => handleInputChange("service_target", e.target.value)}
                placeholder="例: お客様満足度の向上"
              />
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">接客目標を達成するための具体的な行動</Label>
              <Textarea 
                value={formData.action_plan_service || ""} 
                onChange={(e) => handleInputChange("action_plan_service", e.target.value)}
                placeholder="例: お見送りの際に必ずお礼のカードを渡す"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-purple-500 pl-4 py-1">
              <h3 className="font-bold text-slate-800">自己成長・チャレンジ</h3>
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">今月チャレンジしたいこと</Label>
              <Textarea 
                value={formData.challenge || ""} 
                onChange={(e) => handleInputChange("challenge", e.target.value)}
                placeholder="例: 店販キャンペーンの企画立案"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-rose-400 pl-4 py-1 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
              <h3 className="font-bold text-slate-800">プライベート</h3>
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">プライベートでしたいこと</Label>
              <Input 
                value={formData.private_goal || ""} 
                onChange={(e) => handleInputChange("private_goal", e.target.value)}
                placeholder="例: 旅行に行く"
              />
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">プライベート目標を達成するための行動</Label>
              <Textarea 
                value={formData.action_plan_private || ""} 
                onChange={(e) => handleInputChange("action_plan_private", e.target.value)}
                placeholder="例: 毎月1万円貯金する"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="border-l-4 border-slate-600 pl-4 py-1">
              <h3 className="font-bold text-slate-800">月末振り返り</h3>
            </div>
            <div className="space-y-2 pl-5">
              <Label className="text-slate-500">今月の振り返り（できたこと・反省点・次月への課題）</Label>
              <Textarea 
                value={formData.reflection || ""} 
                onChange={(e) => handleInputChange("reflection", e.target.value)}
                placeholder="月末に入力してください"
                className="min-h-[150px] resize-none bg-slate-50"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 px-8">
              <Save className="w-5 h-5 mr-2" />
              アクションプランを保存
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
