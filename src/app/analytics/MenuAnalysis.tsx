"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMenuAnalytics } from "./actions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList,
} from "recharts";
import { Loader2, BarChart2, Tag } from "lucide-react";

const PERIOD_OPTIONS = [
  { label: "今月", value: "thisMonth" },
  { label: "先月", value: "lastMonth" },
  { label: "直近3ヶ月", value: "3months" },
  { label: "今年", value: "thisYear" },
];

const PALETTE = [
  "#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e",
  "#f97316","#eab308","#22c55e","#14b8a6","#0ea5e9",
  "#3b82f6","#84cc16","#06b6d4","#d946ef","#fb923c",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-bold text-slate-800 mb-1 max-w-[200px] break-words">{label}</p>
        <p className="text-indigo-600 font-bold">予約数: <span className="text-lg">{payload[0].value}</span>件</p>
        {payload[0].payload.revenue > 0 && (
          <p className="text-slate-500">売上目安: ¥{payload[0].payload.revenue.toLocaleString()}</p>
        )}
      </div>
    );
  }
  return null;
};

export default function MenuAnalysis() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState("thisMonth");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"bar" | "pie">("bar");

  useEffect(() => {
    fetchData();
  }, [period, profile?.companyId]);

  const fetchData = async () => {
    setLoading(true);
    const res = await getMenuAnalytics(
      profile?.companyId!,
      period
    );
    if (res.success) setData(res.data || []);
    setLoading(false);
  };

  const totalCount = data.reduce((s, d) => s + d.count, 0);
  const top10 = data.slice(0, 10);
  const pieData = data.slice(0, 8).map((d, i) => ({
    ...d,
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="text-indigo-500" size={22} />
            メニュー別予約数
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            期間内に予約されたメニューの件数・割合を可視化します
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                period === p.value
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Tag size={40} className="opacity-30" />
          <p className="font-medium">この期間の予約データがありません</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs text-slate-500 font-medium mb-1">総予約件数</p>
              <p className="text-3xl font-black text-indigo-600">{totalCount}<span className="text-base font-medium text-slate-500 ml-1">件</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs text-slate-500 font-medium mb-1">メニュー種類数</p>
              <p className="text-3xl font-black text-purple-600">{data.length}<span className="text-base font-medium text-slate-500 ml-1">種</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs text-slate-500 font-medium mb-1">最多メニュー</p>
              <p className="text-sm font-black text-slate-800 truncate">{data[0]?.menu}</p>
              <p className="text-indigo-600 font-bold">{data[0]?.count}件</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs text-slate-500 font-medium mb-1">TOP3 シェア</p>
              <p className="text-3xl font-black text-emerald-600">
                {totalCount > 0
                  ? Math.round((data.slice(0, 3).reduce((s, d) => s + d.count, 0) / totalCount) * 100)
                  : 0}
                <span className="text-base font-medium text-slate-500 ml-1">%</span>
              </p>
            </div>
          </div>

          {/* View Toggle + Charts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">メニュー別件数</h3>
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                <button
                  onClick={() => setViewMode("bar")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === "bar" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
                >
                  棒グラフ
                </button>
                <button
                  onClick={() => setViewMode("pie")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === "pie" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
                >
                  円グラフ
                </button>
              </div>
            </div>

            {viewMode === "bar" ? (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="menu"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                    axisLine={false}
                    width={180}
                    tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + "…" : v}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={32}>
                    {top10.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fontSize: 12, fontWeight: 700, fill: "#475569" }}
                      formatter={(v: unknown) => `${v}件`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={140}
                    dataKey="count"
                    nameKey="menu"
                    label={({ name, percent }) => {
                      const n = name ?? "";
                      return `${n.length > 12 ? n.slice(0, 12) + "…" : n} ${((percent ?? 0) * 100).toFixed(0)}%`;
                    }}
                    labelLine={true}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [`${value}件`, String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Full Ranking Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">全メニューランキング</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.map((item, i) => {
                const pct = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
                return (
                  <div key={i} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      i === 0 ? "bg-yellow-400 text-white" :
                      i === 1 ? "bg-slate-400 text-white" :
                      i === 2 ? "bg-orange-400 text-white" :
                      "bg-slate-100 text-slate-500"
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.menu || "(未設定)"}</p>
                      <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-slate-800">{item.count}件</p>
                      <p className="text-xs text-slate-400">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
