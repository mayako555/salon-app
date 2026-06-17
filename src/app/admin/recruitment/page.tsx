"use client";

import { useEffect, useState } from "react";
import { Applicant, getApplicants, deleteApplicant } from "./actions";
import { Button } from "@/components/ui/button";
import { Plus, Users, Search, Edit, Trash2, CalendarDays, ExternalLink, FileText, PieChart, TrendingUp, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import ApplicantFormDialog from "./ApplicantFormDialog";
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];

export default function RecruitmentDashboard() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getApplicants();
    setApplicants(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」さんの応募情報を削除しますか？`)) return;
    await deleteApplicant(id);
    await loadData();
  };

  const handleEdit = (app: Applicant) => {
    setSelectedApplicant(app);
    setIsFormOpen(true);
  };

  const filteredApplicants = applicants.filter(a => 
    (a.name || "").includes(searchQuery) || 
    (a.name_kana || "").includes(searchQuery) ||
    (a.desired_role || "").includes(searchQuery) ||
    (a.status || "").includes(searchQuery)
  );

  // Analytics Data Preparation
  const sourceStats = applicants.reduce((acc, curr) => {
    acc[curr.application_source] = (acc[curr.application_source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(sourceStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const roleStats = applicants.reduce((acc, curr) => {
    acc[curr.desired_role] = (acc[curr.desired_role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(roleStats).map(([name, value]) => ({ name, value }));

  // Yearly Experience Stats
  const yearlyStatsMap = applicants.reduce((acc, curr) => {
    if (!curr.application_date) return acc;
    const year = new Date(curr.application_date).getFullYear().toString();
    if (!acc[year]) {
      acc[year] = { year, "新卒": 0, "未経験": 0, "経験3年未満": 0, "経験3年以上": 0, "その他": 0 };
    }
    const cat = curr.category || "";
    let normalized = "その他";
    if (cat.includes("新卒")) normalized = "新卒";
    else if (cat.includes("未経験") || cat.includes("スクール")) normalized = "未経験";
    else if (cat.includes("未満") || cat.includes("1年") || cat.includes("2年")) normalized = "経験3年未満";
    else if (cat.includes("3年以上") || cat.includes("3年") || cat.includes("経験あり")) normalized = "経験3年以上";

    acc[year][normalized] += 1;
    return acc;
  }, {} as Record<string, any>);

  const yearlyData = Object.values(yearlyStatsMap).sort((a: any, b: any) => a.year.localeCompare(b.year));

  // Monthly Application Stats
  const monthlyStatsMap = applicants.reduce((acc, curr) => {
    if (!curr.application_date) return acc;
    const month = curr.application_date.substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = { month, 応募数: 0, 採用数: 0, "新卒": 0, "未経験": 0, "経験3年未満": 0, "経験3年以上": 0, "その他": 0 };
    }
    acc[month].応募数 += 1;
    if (curr.status === "採用") {
      acc[month].採用数 += 1;
    }

    const cat = curr.category || "";
    let normalized = "その他";
    if (cat.includes("新卒")) normalized = "新卒";
    else if (cat.includes("未経験") || cat.includes("スクール")) normalized = "未経験";
    else if (cat.includes("未満") || cat.includes("1年") || cat.includes("2年")) normalized = "経験3年未満";
    else if (cat.includes("3年以上") || cat.includes("3年") || cat.includes("経験あり")) normalized = "経験3年以上";

    acc[month][normalized] += 1;

    return acc;
  }, {} as Record<string, any>);

  const monthlyData = Object.values(monthlyStatsMap).sort((a: any, b: any) => a.month.localeCompare(b.month));

  const activeCount = applicants.filter(a => !["不採用", "辞退", "採用", "見学のみ終了", "退職済"].includes(a.status)).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-slate-700" />
            採用管理ダッシュボード
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">応募者のステータス管理と採用チャネルの分析</p>
        </div>
        
        <Button 
          onClick={() => { setSelectedApplicant(null); setIsFormOpen(true); }}
          className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm gap-2"
        >
          <Plus className="w-4 h-4" /> 新規応募者を登録
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">総応募数</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-slate-800">{applicants.length}</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">選考中</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-blue-600">{activeCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">採用決定</span>
            <Award className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-emerald-600">
            {applicants.filter(a => a.status === "採用").length}
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      {applicants.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4" /> 応募媒体の割合
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> 希望職種別の応募数
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#334155" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 年別・経験区分別の推移
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend wrapperStyle={{fontSize: 10, paddingTop: 10}} />
                  <Bar dataKey="新卒" stackId="a" fill="#34d399" />
                  <Bar dataKey="未経験" stackId="a" fill="#60a5fa" />
                  <Bar dataKey="経験3年未満" stackId="a" fill="#f472b6" />
                  <Bar dataKey="経験3年以上" stackId="a" fill="#a78bfa" />
                  <Bar dataKey="その他" stackId="a" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> 月別の応募推移
            </h3>
            <div className="flex-1 min-h-0 overflow-x-auto custom-scrollbar">
              <div className="h-full min-w-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{fontSize: 10}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs min-w-[140px]">
                              <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
                              <div className="space-y-1 mb-2">
                                <p className="text-slate-700 font-bold flex justify-between"><span>応募数</span> <span>{d.応募数}</span></p>
                                {d.新卒 > 0 && <p className="text-emerald-500 pl-2 flex justify-between"><span>新卒</span> <span>{d.新卒}</span></p>}
                                {d.未経験 > 0 && <p className="text-blue-500 pl-2 flex justify-between"><span>未経験</span> <span>{d.未経験}</span></p>}
                                {d.経験3年未満 > 0 && <p className="text-pink-500 pl-2 flex justify-between"><span>経験3年未満</span> <span>{d.経験3年未満}</span></p>}
                                {d.経験3年以上 > 0 && <p className="text-purple-500 pl-2 flex justify-between"><span>経験3年以上</span> <span>{d.経験3年以上}</span></p>}
                                {d.その他 > 0 && <p className="text-slate-500 pl-2 flex justify-between"><span>その他</span> <span>{d.その他}</span></p>}
                              </div>
                              <div className="h-px bg-slate-100 my-1"></div>
                              <p className="text-emerald-600 font-bold flex justify-between mt-1"><span>採用数</span> <span>{d.採用数}</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{fontSize: 10, paddingTop: 10}} />
                    <Bar dataKey="応募数" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="採用数" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applicants List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-slate-800">応募者一覧</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="名前や職種で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-semibold">応募日</th>
                <th className="px-4 py-3 font-semibold w-1/5">お名前 / 職種</th>
                <th className="px-4 py-3 font-semibold">年齢 / 区分</th>
                <th className="px-4 py-3 font-semibold">ステータス</th>
                <th className="px-4 py-3 font-semibold">応募媒体</th>
                <th className="px-4 py-3 font-semibold">面接予定日</th>
                <th className="px-4 py-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-medium">読み込み中...</td></tr>
              ) : filteredApplicants.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-medium">応募者が見つかりません</td></tr>
              ) : (
                filteredApplicants.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {app.application_date ? format(new Date(app.application_date), "yyyy/MM/dd") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {app.name}
                        {app.resume_url && (
                          <a href={app.resume_url} target="_blank" rel="noreferrer" title="履歴書を見る">
                            <FileText className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{app.desired_role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">{app.age ? `${app.age}歳` : "-"}</div>
                      <div className="text-xs text-slate-500">{app.category || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                        ${app.status === '採用' ? 'bg-emerald-100 text-emerald-800' : 
                          app.status === '不採用' || app.status === '辞退' || app.status === '見学のみ終了' || app.status === '退職済' ? 'bg-slate-100 text-slate-600' : 
                          app.status.includes('面接') ? 'bg-blue-100 text-blue-800' :
                          app.status.includes('見学') ? 'bg-purple-100 text-purple-800' :
                          'bg-amber-100 text-amber-800'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium text-xs">
                      {app.application_source}
                    </td>
                    <td className="px-4 py-3">
                      {app.interview_date ? (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(app.interview_date), "MM/dd HH:mm")}
                        </div>
                      ) : <span className="text-slate-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(app)} className="h-8 w-8 text-slate-500 hover:text-slate-900">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(app.id, app.name)} className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ApplicantFormDialog 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onRefresh={loadData}
        initialData={selectedApplicant}
      />
    </div>
  );
}

// Re-use lucide-react Award icon inside component
function Award(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>;
}
