"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStaffAnalytics } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, TrendingUp, Clock, DollarSign, Users, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function StaffAnalysis() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState("this_month");
  const [empType, setEmpType] = useState("all");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getStaffAnalytics(profile?.companyId || "company_default", undefined, period, empType);
      if (res.success) {
        setData(res.data || []);
      }
      setLoading(false);
    }
    load();
  }, [profile, period, empType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="期間" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">今月</SelectItem>
              <SelectItem value="last_month">先月</SelectItem>
              <SelectItem value="last_3_months">直近3ヶ月</SelectItem>
              <SelectItem value="this_year">今年</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={empType} onValueChange={setEmpType}>
            <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="雇用区分" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全スタッフ</SelectItem>
              <SelectItem value="employee">正社員</SelectItem>
              <SelectItem value="part_time">アルバイト</SelectItem>
              <SelectItem value="contract">業務委託</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-100 shadow-sm">
          対象データがありません
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((staff, idx) => (
            <Card key={staff.id} className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-lg">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-800">{staff.name}</CardTitle>
                    <p className="text-xs font-bold text-purple-600/80">
                      {staff.type === 'employee' ? '正社員' : staff.type === 'part_time' ? 'アルバイト' : staff.type === 'contract' ? '業務委託' : 'その他'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 text-sm">
                  <div className="p-4">
                    <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><DollarSign size={14}/> 売上</p>
                    <p className="font-black text-slate-800 text-lg">{formatCurrency(staff.sales)}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><Users size={14}/> 客数</p>
                    <p className="font-black text-slate-800 text-lg">{staff.customers}名</p>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><Target size={14}/> 客単価</p>
                    <p className="font-black text-slate-800">{formatCurrency(staff.avgSpend)}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><TrendingUp size={14}/> リピート率</p>
                    <p className="font-black text-indigo-600">{staff.repeatRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><Clock size={14}/> 次回予約率</p>
                    <p className="font-black text-emerald-600">{staff.nextBookingRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><TrendingUp size={14}/> 時間生産性</p>
                    <p className="font-black text-rose-600">{formatCurrency(staff.timeProductivity)}<span className="text-xs text-slate-400">/h</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
