"use client";

import { useEffect, useState } from "react";
import { getAllStaffGoalsAndKPIs, updateMonthlyGoal } from "@/app/goals/actions";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Target, Download, Printer, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type StaffData = {
  staff_id: string;
  staff_name: string;
  store_name: string;
  goal: any;
  kpi: any;
};

type SortField = 'achievement_rate' | 'revenue' | 'average_spend' | 'customer_count' | 'nomination_rate';
type SortOrder = 'asc' | 'desc';

export default function AdminGoalsPage() {
  const [month, setMonth] = useState(new Date());
  const [data, setData] = useState<StaffData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sortField, setSortField] = useState<SortField>('achievement_rate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadData(month);
  }, [month]);

  const loadData = async (date: Date) => {
    setLoading(true);
    try {
      const monthStr = format(date, "yyyy-MM");
      const results = await getAllStaffGoalsAndKPIs(monthStr);
      setData(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = a.kpi[sortField];
    const bValue = b.kpi[sortField];
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleUpdateTarget = async (staffId: string, goalId: string | undefined, newTarget: number) => {
    if (!goalId) {
      // Need to lazy create first if it doesn't exist, but usually it exists if they opened the portal.
      // If admin tries to set target for a staff who hasn't opened the portal yet:
      alert("スタッフが一度目標画面を開いてデータが作成されるのをお待ちください（または自動生成APIが必要です）");
      return;
    }
    
    // Optimistic UI update
    setData(prev => prev.map(d => {
      if (d.staff_id === staffId) {
        const newGoal = { ...d.goal, revenue_target: newTarget };
        const newAchievement = newTarget > 0 ? Math.round((d.kpi.revenue / newTarget) * 100) : 0;
        return { ...d, goal: newGoal, kpi: { ...d.kpi, achievement_rate: newAchievement } };
      }
      return d;
    }));

    try {
      await updateMonthlyGoal(goalId, { revenue_target: newTarget });
    } catch (err) {
      console.error("Failed to update target:", err);
      // Revert on error
      loadData(month);
    }
  };

  const exportCSV = () => {
    const headers = ["スタッフ名", "店舗", "売上目標", "売上実績", "達成率", "客数", "客単価", "次回予約率", "指名率", "SNS投稿", "口コミ", "練習回数"];
    const rows = sortedData.map(d => [
      d.staff_name,
      d.store_name,
      d.goal?.revenue_target || 0,
      d.kpi.revenue,
      d.kpi.achievement_rate,
      d.kpi.customer_count,
      d.kpi.average_spend,
      d.kpi.next_booking_rate,
      d.kpi.nomination_rate,
      d.goal?.sns_posts || 0,
      d.goal?.review_count || 0,
      d.goal?.practice_count || 0
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KPI_${format(month, "yyyy-MM")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTextColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-rose-600";
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4 print:shadow-none print:border-none print:p-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Target className="text-blue-600" />
            全体KPI管理
          </h1>
          <p className="text-slate-500 mt-1 text-sm print:hidden">全スタッフの目標設定と実績を管理します</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-md shadow-sm print:hidden">
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
          
          <Button variant="outline" className="gap-2 print:hidden" onClick={exportCSV}>
            <Download size={16} />
            CSV
          </Button>
          <Button variant="outline" className="gap-2 print:hidden" onClick={() => window.print()}>
            <Printer size={16} />
            印刷
          </Button>
        </div>
      </div>

      {/* KPI Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="whitespace-nowrap min-w-[1200px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[150px]">スタッフ名</TableHead>
                <TableHead className="w-[120px]">店舗</TableHead>
                <TableHead className="w-[150px]">売上目標</TableHead>
                
                <TableHead className="w-[120px] text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('revenue')}>
                  <div className="flex items-center justify-end gap-1">
                    売上実績 <ArrowUpDown size={12} className={sortField === 'revenue' ? "text-blue-500" : "text-slate-300"} />
                  </div>
                </TableHead>
                
                <TableHead className="w-[100px] text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('achievement_rate')}>
                  <div className="flex items-center justify-end gap-1">
                    達成率 <ArrowUpDown size={12} className={sortField === 'achievement_rate' ? "text-blue-500" : "text-slate-300"} />
                  </div>
                </TableHead>
                
                <TableHead className="w-[80px] text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('customer_count')}>
                  <div className="flex items-center justify-end gap-1">
                    客数 <ArrowUpDown size={12} className={sortField === 'customer_count' ? "text-blue-500" : "text-slate-300"} />
                  </div>
                </TableHead>
                
                <TableHead className="w-[100px] text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('average_spend')}>
                  <div className="flex items-center justify-end gap-1">
                    客単価 <ArrowUpDown size={12} className={sortField === 'average_spend' ? "text-blue-500" : "text-slate-300"} />
                  </div>
                </TableHead>
                
                <TableHead className="w-[100px] text-right">次回予約率</TableHead>
                
                <TableHead className="w-[100px] text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('nomination_rate')}>
                  <div className="flex items-center justify-end gap-1">
                    指名率 <ArrowUpDown size={12} className={sortField === 'nomination_rate' ? "text-blue-500" : "text-slate-300"} />
                  </div>
                </TableHead>
                
                <TableHead className="w-[80px] text-center">SNS投稿</TableHead>
                <TableHead className="w-[80px] text-center">口コミ</TableHead>
                <TableHead className="w-[80px] text-center">練習回数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-slate-500">
                    データを読み込み中...
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-slate-500">
                    スタッフデータがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((d) => (
                  <TableRow key={d.staff_id} className="hover:bg-slate-50">
                    <TableCell className="font-bold text-slate-800">{d.staff_name}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{d.store_name}</TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">¥</span>
                        <Input 
                          type="number" 
                          defaultValue={d.goal?.revenue_target || 0}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            if (val !== d.goal?.revenue_target) {
                              handleUpdateTarget(d.staff_id, d.goal?.id, val);
                            }
                          }}
                          className="h-8 w-24 text-right font-bold tabular-nums print:border-none print:shadow-none"
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-bold text-slate-800 tabular-nums">
                      ¥{d.kpi.revenue.toLocaleString()}
                    </TableCell>
                    
                    <TableCell className={cn("text-right font-black tabular-nums", getTextColor(d.kpi.achievement_rate))}>
                      {d.kpi.achievement_rate}%
                    </TableCell>
                    
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {d.kpi.customer_count}
                    </TableCell>
                    
                    <TableCell className="text-right tabular-nums text-slate-600">
                      ¥{d.kpi.average_spend.toLocaleString()}
                    </TableCell>
                    
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {d.kpi.next_booking_rate}%
                    </TableCell>
                    
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {d.kpi.nomination_rate}%
                    </TableCell>
                    
                    <TableCell className="text-center text-slate-500 tabular-nums bg-slate-50/50">
                      {d.goal?.sns_posts || 0}
                    </TableCell>
                    <TableCell className="text-center text-slate-500 tabular-nums bg-slate-50/50">
                      {d.goal?.review_count || 0}
                    </TableCell>
                    <TableCell className="text-center text-slate-500 tabular-nums bg-slate-50/50">
                      {d.goal?.practice_count || 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
