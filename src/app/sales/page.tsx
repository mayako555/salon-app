"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMonthlySales, SalesRecord, deleteSale, clearMonthlyCsvImports } from "./actions";
import { getStaffList, StaffProfile } from "../staff/actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, ChevronLeft, ChevronRight, Search, FileUp, Settings, Lock, Trash2, Calendar, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { format, isSameMonth, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import CSVUploadButton from "./CSVUploadButton";
import PaymentEditDialog from "./PaymentEditDialog";
import DailyCloseDialog from "./DailyCloseDialog";
import SalesExportCSVButton from "./SalesExportCSVButton";
import DailyScheduleView from "./DailyScheduleView";
import AuthGuard from "@/components/AuthGuard";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import SalesSummaryCards, { SalesSummaryData } from "./components/SalesSummaryCards";
import SalesFilterBar from "./components/SalesFilterBar";
import SalesTable from "./components/SalesTable";
import StoreTotalBar from "./components/StoreTotalBar";
import { StaffSalesData, StoreSalesData } from "./components/SalesRow";
import { exportSalesToCsv, exportSalesToExcel } from "./exportUtils";
import { getCompanyGoalsForMonth } from "../goals/actions";
import { useSalesData } from "./hooks/useSalesData";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SalesPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = use(searchParams);
  const { profile, loading: authLoading, availableStores, isAdmin } = useAuth();
  const targetDateStr = params.month || format(new Date(), "yyyy-MM");
  const [yearNum, monthNum] = targetDateStr.split("-").map(Number);
  const year = yearNum;
  const month = monthNum;

  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [prevMonthSales, setPrevMonthSales] = useState<SalesRecord[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      const prevDate = subMonths(new Date(year, month - 1, 1), 1);
      const [salesData, prevSalesData, staffData, goalsData] = await Promise.all([
        getMonthlySales(year, month),
        getMonthlySales(prevDate.getFullYear(), prevDate.getMonth() + 1),
        getStaffList({ includeResigned: true }),
        getCompanyGoalsForMonth(targetDateStr)
      ]);
      setSales(salesData);
      setPrevMonthSales(prevSalesData);
      setStaffProfiles(staffData);
      setGoals(goalsData);
      setLoading(false);
    }
    load();
  }, [year, month, authLoading, targetDateStr]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffs, setSelectedStaffs] = useState<Set<string>>(new Set());
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  
  const normalizeName = (name: string | null) => {
    if (!name) return "";
    return name
      .replace(/\s+/g, "")
      .replace(/[凛凜]/g, "凛");
  };

  const checkIsMinimo = (sale: SalesRecord) => {
    const route = String(sale.reservation_route || "");
    const menu = String(sale.menu_course || "");
    const menuLower = menu.toLowerCase();
    return sale.is_minimo === true || 
           route.includes("ミニモ") || 
           route.toLowerCase().includes("minimo") ||
           menu.includes("ミニモ") ||
           menu.includes("ミニ") ||
           menu.includes("モデル") ||
           menuLower.includes("min") ||
           menuLower.includes("mini");
  };

  const checkIsNextBooking = (sale: SalesRecord) => {
    const menu = String(sale.menu_course || "");
    const discountReason = String(sale.discount_reason || "");
    return menu.includes("次回") || 
           menu.includes("店頭クーポン") || 
           discountReason.includes("次回");
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isScheduleView, setIsScheduleView] = useState(false);
  const [checkoutInitialStaff, setCheckoutInitialStaff] = useState("");
  const [checkoutInitialTime, setCheckoutInitialTime] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesRecord | undefined>(undefined);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredSales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSales.map(s => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchDelete = async (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    if (!confirm(`${idsToDelete.length}件のデータを削除してもよろしいですか？`)) return;
    
    setLoading(true);
    let successCount = 0;
    for (const id of idsToDelete) {
      const res = await deleteSale(id);
      if (res.success) successCount++;
    }
    
    setSales(sales.filter(s => !idsToDelete.includes(s.id)));
    setSelectedIds(new Set());
    setLoading(false);
    alert(`${successCount}件のデータを削除しました。`);
  };

  const filteredSales = sales.filter(s => {
    if (selectedStaffs.size > 0) {
      const staffMatch = Array.from(selectedStaffs).some(staff => 
        normalizeName(s.staff_name) === normalizeName(staff)
      );
      if (!staffMatch) return false;
    }
    
    if (selectedStores.size > 0) {
      if (!selectedStores.has(s.store_name)) return false;
    }

    if (searchQuery) {
      const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0);
      
      const isMatched = keywords.every(keyword => {
        return (
          (s.staff_name || "").toLowerCase().includes(keyword) ||
          (s.customer_name || "").toLowerCase().includes(keyword) ||
          (s.store_name || "").toLowerCase().includes(keyword) ||
          (s.menu_course || "").toLowerCase().includes(keyword)
        );
      });
      
      if (!isMatched) return false;
    }
    
    return true;
  });

  const handleDeleteSale = async (id: string) => {
    if (!confirm("この売上データを削除してよろしいですか？")) return;
    const res = await deleteSale(id);
    if (res.success) {
      setSales(sales.filter(s => s.id !== id));
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
  };

  const handleClearImports = async () => {
    if (!confirm(`${year}年${month}月のCSV取り込みデータをすべて削除しますか？`)) return;
    const res = await clearMonthlyCsvImports(year, month);
    if (res.success) {
      alert(`${res.count}件のデータを削除しました。`);
      setSales(sales.filter(s => s.source !== 'hotpepper'));
    }
  };

  const [selectedDashboardStore, setSelectedDashboardStore] = useState<string>("all");
  const [hideZeroSales, setHideZeroSales] = useState<boolean>(true);

  const handleAddClick = (staff: string, time: string) => {
    setCheckoutInitialStaff(staff);
    setCheckoutInitialTime(time);
    setEditingSale(undefined);
    setIsCheckoutOpen(true);
  };

  const handleEditClick = (sale: SalesRecord) => {
    setEditingSale(sale);
    setIsCheckoutOpen(false); 
    setTimeout(() => setIsCheckoutOpen(true), 10);
  };

  const {
    stores,
    staffNames,
    displayStaffData,
    summaryData,
    displaySummaryData,
  } = useSalesData({
    sales,
    prevMonthSales,
    staffProfiles,
    goals,
    availableStores: availableStores || [],
    searchQuery,
    hideZeroSales,
    selectedStore: selectedDashboardStore
  });

  const sortedSales = [...filteredSales].sort((a, b) => {
    let aVal: any = a[sortConfig.key as keyof SalesRecord] || "";
    let bVal: any = b[sortConfig.key as keyof SalesRecord] || "";

    if (sortConfig.key === 'total') {
      aVal = a.tech_sales + a.product_sales + (a.nomination_fee || 0) + (a.cancel_fee || 0) - (a.discount || 0);
      bVal = b.tech_sales + b.product_sales + (b.nomination_fee || 0) + (b.cancel_fee || 0) - (b.discount || 0);
    }
    
    if (sortConfig.key === 'date') {
      const cmp = a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "");
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const cmp = aVal.localeCompare(bVal);
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortableHead = ({ label, sortKey, className }: { label: string, sortKey: string, className?: string }) => (
    <TableHead className={cn("cursor-pointer hover:bg-slate-200/50 transition-colors select-none", className)} onClick={() => handleSort(sortKey)}>
      <div className={cn("flex items-center gap-1", className?.includes("text-right") ? "justify-end" : "")}>
        {label}
        <ArrowUpDown size={14} className={sortConfig.key === sortKey ? "text-slate-800" : "text-slate-400"} />
      </div>
    </TableHead>
  );



  return (
    <AuthGuard requireRole="manager" requireFeature="sales">
      <div className="space-y-6 animate-in fade-in duration-300">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">売上管理</h1>
                <p className="text-slate-500 mt-1 text-sm">スタッフごとの日次売上と、Hot Pepper Beauty CSVの取込を行います</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <SalesExportCSVButton sales={sales} />
                <DailyCloseDialog />
                <Button 
                  variant={isScheduleView ? "default" : "outline"}
                  onClick={() => setIsScheduleView(!isScheduleView)}
                  className="h-10 px-4 font-bold gap-2"
                >
                  {isScheduleView ? <Search size={16} /> : <Calendar size={16} />}
                  {isScheduleView ? "リスト表示" : "スケジュール表示"}
                </Button>
                {editingSale && (
                  <PaymentEditDialog 
                    isOpenControlled={isCheckoutOpen}
                    onOpenChangeControlled={setIsCheckoutOpen}
                    initialData={editingSale}
                    onSuccess={() => {
                      getMonthlySales(year, month).then(setSales);
                      setIsCheckoutOpen(false);
                    }}
                  />
                )}
                <CSVUploadButton />
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={handleClearImports} className="text-rose-600 border-rose-200 hover:bg-rose-50 h-10 px-3">
                    <Trash2 size={16} className="mr-1" />
                    CSVクリア
                  </Button>
                )}
                <Link href="/staff-portal/sales/master">
                  <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200">
                    <Settings size={20} className="text-slate-500" />
                  </Button>
                </Link>
              </div>
            </div>

            <SalesFilterBar
              currentDate={new Date(year, month - 1, 1)}
              selectedStore={selectedDashboardStore}
              onStoreChange={setSelectedDashboardStore}
              hideZeroSales={hideZeroSales}
              onHideZeroSalesChange={setHideZeroSales}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              availableStores={stores}
              onExportCsv={() => exportSalesToCsv(sales, displayStaffData, displaySummaryData, targetDateStr, stores)}
              onExportExcel={() => exportSalesToExcel(sales, displayStaffData, displaySummaryData, targetDateStr, stores)}
            />

            {isScheduleView ? (
              <DailyScheduleView 
                date={targetDateStr}
                sales={sales.filter(s => s.date === (params.month || format(new Date(), "yyyy-MM-dd")))}
                staffNames={staffNames}
                onAddClick={handleAddClick}
                onEditClick={handleEditClick}
              />
            ) : (
              <div className="space-y-6 mt-6">
                <SalesSummaryCards data={displaySummaryData} />
                
                <SalesTable 
                  data={displayStaffData} 
                  availableStores={availableStores}
                  onStaffClick={(staffId) => window.location.href = `/sales/staff/${staffId}`} 
                />
              </div>
            )}

            <StoreTotalBar data={displaySummaryData} />

            <div className="overflow-x-auto mt-12">
                <Table className="whitespace-nowrap min-w-[1000px]">
                  <TableHeader className="bg-slate-100/80">
                    <TableRow className="border-b-2 border-slate-200">
                      <TableHead className="w-[40px] text-center">
                        <input 
                          type="checkbox" 
                          checked={filteredSales.length > 0 && selectedIds.size === filteredSales.length}
                          onChange={handleToggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </TableHead>
                      <SortableHead sortKey="date" label="日付" className="w-[80px]" />
                      <SortableHead sortKey="time" label="時間" className="w-[60px]" />
                      <SortableHead sortKey="store_name" label="店舗" className="w-[80px]" />
                      <SortableHead sortKey="staff_name" label="担当" className="w-[100px]" />
                      <SortableHead sortKey="customer_name" label="お客様名" className="w-[120px]" />
                      <TableHead className="w-[80px] text-center">新・リピ</TableHead>
                      <TableHead>コース</TableHead>
                      <SortableHead sortKey="tech_sales" label="技術売上" className="text-right w-[80px]" />
                      <SortableHead sortKey="product_sales" label="店販売上" className="text-right w-[80px]" />
                      <SortableHead sortKey="nomination_fee" label="指名料" className="text-right w-[80px]" />
                      <SortableHead sortKey="discount" label="割引" className="text-right w-[80px] text-rose-600" />
                      <SortableHead sortKey="hpb_points" label="HPB pt" className="text-right w-[80px] text-orange-500" />
                      <TableHead className="w-[120px] text-center">支払方法</TableHead>
                      <SortableHead sortKey="total" label="合計金額" className="text-right font-bold w-[100px]" />
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={16} className="text-center py-12 text-slate-500">
                          { (searchQuery || selectedStaffs.size > 0 || selectedStores.size > 0) ? "条件に一致するデータが見つかりません。" : "日計（会計）データがありません。右上の「会計を登録」から入力してください。"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedSales.map((sale) => {
                        const saleTotal = sale.tech_sales + sale.product_sales + (sale.nomination_fee || 0) + (sale.cancel_fee || 0) - (sale.discount || 0);
                        const isRowSelected = selectedIds.has(sale.id);

                        return (
                          <TableRow key={sale.id} className={`hover:bg-amber-50/30 ${sale.status === 'closed' ? 'bg-slate-50 opacity-90' : ''} ${isRowSelected ? 'bg-emerald-50/50' : ''}`}>
                            <TableCell className="text-center">
                              <input 
                                type="checkbox" 
                                checked={isRowSelected}
                                onChange={() => handleToggleSelect(sale.id)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-slate-600">
                              {format(new Date(sale.date), "MM/dd")}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">
                              <div className="flex items-center gap-1">
                                {sale.status === 'closed' && <Lock size={12} className="text-slate-400" />}
                                {sale.time || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                {sale.store_name}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800">
                              {sale.staff_name}
                            </TableCell>
                            <TableCell className="font-medium">
                              {sale.customer_name || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex gap-1">
                                  {sale.customer_type === "新規" && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm font-bold">新規</span>}
                                  {sale.customer_type === "リピ" && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-bold">リピ</span>}
                                  {(!sale.customer_type || sale.customer_type === "不明") && <span className="text-[10px] text-slate-300">-</span>}
                                </div>
                                <div className="flex gap-1 flex-wrap justify-center mt-0.5">
                                  {checkIsMinimo(sale) && (
                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-sm font-bold border border-purple-200 shadow-sm leading-none">ミニモ</span>
                                  )}
                                  {checkIsNextBooking(sale) && (
                                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm font-bold border border-amber-200 shadow-sm leading-none">次回予約</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[150px] truncate" title={sale.menu_course}>
                              {sale.menu_course || "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {sale.tech_sales > 0 ? `¥${sale.tech_sales.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right text-slate-500">
                              {sale.product_sales > 0 ? `¥${sale.product_sales.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right text-slate-500 text-xs">
                              {sale.nomination_fee > 0 ? `¥${sale.nomination_fee.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right text-rose-500 font-medium">
                              {sale.discount > 0 ? `-¥${sale.discount.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right text-orange-500 font-medium">
                              {sale.hpb_points > 0 ? `¥${sale.hpb_points.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {sale.payment_method === '未入力' || sale.payment_method === '不明' || !sale.payment_method ? (
                                <button 
                                  onClick={() => handleEditClick(sale)}
                                  className="px-2 py-1 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 shadow-sm animate-pulse hover:bg-rose-200 transition-colors cursor-pointer"
                                >
                                  入力してください
                                </button>
                              ) : (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                                  sale.payment_method === '現金' 
                                    ? 'bg-slate-100 text-slate-700' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                )}>
                                  {sale.payment_method}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-800 bg-slate-50">
                              ¥{Math.max(0, saleTotal).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleEditClick(sale)}>
                                  <Search size={14} />
                                </Button>
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleDeleteSale(sale.id)}>
                                    <Trash2 size={14} />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div> {/* overflow-x-auto */}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-700">
            <span className="text-sm font-bold">{selectedIds.size}件を選択中</span>
            <div className="h-4 w-[1px] bg-slate-700" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-3 text-xs font-bold rounded-full"
            >
              選択をクリア
            </Button>
            {isAdmin && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => handleBatchDelete(Array.from(selectedIds))}
                className="h-8 px-4 text-xs font-bold rounded-full shadow-md hover:bg-rose-600 bg-rose-500"
              >
                削除する
              </Button>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
