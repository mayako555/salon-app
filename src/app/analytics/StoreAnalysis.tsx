"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStoreComparisonAnalytics } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, TrendingUp, Users, DollarSign, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function StoreAnalysis() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState("this_month");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getStoreComparisonAnalytics(profile?.companyId!, period);
      if (res.success) {
        setData(res.data || []);
      }
      setLoading(false);
    }
    load();
  }, [profile, period]);

  if (data.length <= 1 && !loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-100 shadow-sm gap-2">
        <Store size={40} className="text-slate-300" />
        <p>この機能は複数店舗を運営しているテナントで利用できます。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-fit">
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
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.map((store, idx) => (
            <Card key={store.name} className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-indigo-50 border-b border-indigo-100 py-4">
                <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Store className="text-indigo-500" />
                  {store.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1"><DollarSign size={14}/> 総売上</p>
                    <p className="font-black text-slate-800 text-2xl">{formatCurrency(store.sales)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1"><Users size={14}/> 客数</p>
                    <p className="font-black text-slate-800 text-2xl">{store.customers}名</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1">客単価</p>
                    <p className="font-black text-slate-800 text-xl">{formatCurrency(store.avgSpend)}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-emerald-600/80 text-xs font-bold mb-1 flex items-center gap-1"><Sparkles size={14}/> 新規率 / リピート率</p>
                    <div className="flex items-end gap-2">
                      <p className="font-black text-emerald-600 text-xl">{store.newRate.toFixed(1)}%</p>
                      <p className="font-bold text-slate-400 text-sm pb-0.5">/ {store.repeatRate.toFixed(1)}%</p>
                    </div>
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
