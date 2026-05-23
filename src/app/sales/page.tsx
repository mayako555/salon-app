"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMonthlySales, SalesRecord, deleteSale, clearMonthlyCsvImports } from "./actions";
import { getStaffList, StaffProfile } from "../staff/actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, ChevronLeft, ChevronRight, Search, FileUp, Settings, Lock, Trash2, Calendar } from "lucide-react";
import Link from "next/link";
import { format, isSameMonth } from "date-fns";
import { ja } from "date-fns/locale";
import CSVUploadButton from "./CSVUploadButton";
import CheckoutDialog from "./CheckoutDialog";
import DailyCloseDialog from "./DailyCloseDialog";
import SalesExportCSVButton from "./SalesExportCSVButton";
import DailyScheduleView from "./DailyScheduleView";
import AuthGuard from "@/components/AuthGuard";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SalesPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = use(searchParams);
  const { profile } = useAuth();
  const targetDateStr = params.month || format(new Date(), "yyyy-MM");
  const [yearNum, monthNum] = targetDateStr.split("-").map(Number);
  const year = yearNum;
  const month = monthNum;

  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [salesData, staffData] = await Promise.all([
        getMonthlySales(year, month),
        getStaffList()
      ]);
      setSales(salesData);
      setStaffProfiles(staffData);
      setLoading(false);
    }
    load();
  }, [year, month]);

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

  const cashSales = sales.filter(s => s.payment_method === '現金');
  const cashlessSales = sales.filter(s => s.payment_method !== '現金' && s.payment_method !== '不明');

  const totalTechSales = sales.reduce((sum, s) => sum + s.tech_sales, 0);
  const totalProductSales = sales.reduce((sum, s) => sum + s.product_sales, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
  const totalSales = sales.reduce((sum, s) => sum + s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0), 0);

  const cashTechSales = cashSales.reduce((sum, s) => sum + s.tech_sales, 0);
  const cashlessTechSales = cashlessSales.reduce((sum, s) => sum + s.tech_sales, 0);
  
  const cashProductSales = cashSales.reduce((sum, s) => sum + s.product_sales, 0);
  const cashlessProductSales = cashlessSales.reduce((sum, s) => sum + s.product_sales, 0);

  const stores = ["六甲", "元町", "神戸"];
  
  const sortedProfiles = [...staffProfiles].sort((a, b) => {
    const orderA = a.sort_order ?? 999;
    const orderB = b.sort_order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, "ja");
  });

  const staffNames = sortedProfiles.map(p => p.name);

  const salesStaffNames = Array.from(new Set(sales.map(s => s.staff_name)));
  salesStaffNames.forEach(name => {
    if (!name) return;
    const normalizedName = normalizeName(name);
    const alreadyExists = staffNames.some(existingName => normalizeName(existingName) === normalizedName);
    
    if (!alreadyExists) {
      staffNames.push(name);
    }
  });
  
  const getSalesMetrics = (staff: string | null, store: string | null) => {
    let filtered = sales;
    if (staff) {
      const staffNormal = normalizeName(staff);
      filtered = filtered.filter(s => normalizeName(s.staff_name) === staffNormal);
    }
    if (store) filtered = filtered.filter(s => s.store_name === store);
    
    const discount = filtered.reduce((sum, s) => sum + (s.discount || 0), 0);
    const techSales = filtered.reduce((sum, s) => sum + (s.tech_sales || 0), 0);
    const productSales = filtered.reduce((sum, s) => sum + (s.product_sales || 0), 0);
    const total = filtered.reduce((sum, s) => sum + s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0), 0);
    
    return { total, discount, techSales, productSales };
  };

  const toggleStaffFilter = (staff: string) => {
    const next = new Set(selectedStaffs);
    if (next.has(staff)) next.delete(staff);
    else next.add(staff);
    setSelectedStaffs(next);
    setSelectedIds(new Set());
  };

  const toggleStoreFilter = (store: string) => {
    const next = new Set(selectedStores);
    if (next.has(store)) next.delete(store);
    else next.add(store);
    setSelectedStores(next);
    setSelectedIds(new Set());
  };

  const toggleMatrixFilter = (staff: string | null, store: string | null) => {
    if (staff && store) {
      // Intersection click: special toggle
      if (selectedStaffs.size === 1 && selectedStaffs.has(staff) && selectedStores.size === 1 && selectedStores.has(store)) {
        setSelectedStaffs(new Set());
        setSelectedStores(new Set());
      } else {
        setSelectedStaffs(new Set([staff]));
        setSelectedStores(new Set([store]));
      }
    } else if (staff) {
      toggleStaffFilter(staff);
    } else if (store) {
      toggleStoreFilter(store);
    }
  };

  const clearFilters = () => {
    setSelectedStaffs(new Set());
    setSelectedStores(new Set());
    setSearchQuery("");
    setSelectedIds(new Set());
  };

  const handleAddClick = (staff: string, time: string) => {
    setCheckoutInitialStaff(staff);
    setCheckoutInitialTime(time);
    setEditingSale(undefined);
    setIsCheckoutOpen(true);
  };

  const handleEditClick = (sale: SalesRecord) => {
    setEditingSale(sale);
    setIsCheckoutOpen(false); // Reset then set to trigger effect? No, let's just set.
    setTimeout(() => setIsCheckoutOpen(true), 10);
  };

  return (
    <AuthGuard requireRole="admin">
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
                <CheckoutDialog 
                  staffList={staffNames} 
                  isOpenControlled={isCheckoutOpen}
                  onOpenChangeControlled={setIsCheckoutOpen}
                  defaultStaffName={checkoutInitialStaff}
                  initialTime={checkoutInitialTime}
                  initialData={editingSale}
                />
                {profile?.role === 'admin' && (
                  <>
                    <CSVUploadButton />
                    <Button variant="outline" size="sm" onClick={handleClearImports} className="text-rose-600 border-rose-200 hover:bg-rose-50 h-10 px-3">
                      <Trash2 size={16} className="mr-1" />
                      CSVクリア
                    </Button>
                  </>
                )}
                <Link href="/staff-portal/sales/master">
                  <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200">
                    <Settings size={20} className="text-slate-500" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <p className="text-sm font-medium text-slate-500 mb-1">当月 技術売上</p>
                <div className="flex items-end gap-2 mb-3">
                  <p className="text-3xl font-bold text-slate-800">¥{totalTechSales.toLocaleString()}</p>
                </div>
                <div className="flex justify-between text-xs mt-auto pt-2 border-t border-slate-100">
                  <div className="flex flex-col"><span className="text-slate-400">現金</span><span className="font-bold text-slate-700">¥{cashTechSales.toLocaleString()}</span></div>
                  <div className="flex flex-col text-right"><span className="text-slate-400">キャッシュレス</span><span className="font-bold text-slate-700">¥{cashlessTechSales.toLocaleString()}</span></div>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <p className="text-sm font-medium text-slate-500 mb-1">当月 店販売上</p>
                <div className="flex items-end gap-2 mb-3">
                  <p className="text-3xl font-bold text-slate-800">¥{totalProductSales.toLocaleString()}</p>
                </div>
                <div className="flex justify-between text-xs mt-auto pt-2 border-t border-slate-100">
                  <div className="flex flex-col"><span className="text-slate-400">現金</span><span className="font-bold text-slate-700">¥{cashProductSales.toLocaleString()}</span></div>
                  <div className="flex flex-col text-right"><span className="text-slate-400">キャッシュレス</span><span className="font-bold text-slate-700">¥{cashlessProductSales.toLocaleString()}</span></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-200 shadow-md flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
                <p className="text-sm font-medium text-slate-300 mb-1 relative z-10">当月 総売上</p>
                <div className="flex items-end gap-2 mb-3 relative z-10">
                  <p className="text-3xl font-bold text-white">¥{totalSales.toLocaleString()}</p>
                </div>
                <div className="flex justify-between text-xs mt-auto pt-2 border-t border-slate-700/50 relative z-10">
                  <div className="flex flex-col"><span className="text-slate-400">現金合計</span><span className="font-bold text-slate-200">¥{(cashTechSales + cashProductSales).toLocaleString()}</span></div>
                  <div className="flex flex-col text-right"><span className="text-slate-400">キャッシュレス合計</span><span className="font-bold text-slate-200">¥{(cashlessTechSales + cashlessProductSales).toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            {/* Explicit Filter Panel */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Search size={16} className="text-slate-400" />
                  絞り込み条件
                </h3>
                {(selectedStaffs.size > 0 || selectedStores.size > 0 || searchQuery) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 text-rose-500 hover:text-rose-600 font-bold">
                    条件をすべてクリア
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">対象店舗</p>
                  <div className="flex flex-wrap gap-3">
                    {stores.map(store => {
                      const isChecked = selectedStores.has(store);
                      return (
                        <label key={store} className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-sm font-medium",
                          isChecked ? "bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => toggleStoreFilter(store)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          {store}店
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">担当スタッフ</p>
                  <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1">
                    {staffNames.map(staff => {
                      const isChecked = Array.from(selectedStaffs).some(s => normalizeName(s) === normalizeName(staff));
                      return (
                        <label key={staff} className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-medium",
                          isChecked ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => toggleStaffFilter(staff)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          {staff}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {isScheduleView ? (
              <DailyScheduleView 
                date={targetDateStr}
                sales={sales.filter(s => s.date === (params.month || format(new Date(), "yyyy-MM-dd")))}
                staffNames={staffNames}
                onAddClick={handleAddClick}
                onEditClick={handleEditClick}
              />
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">店舗・スタッフ別 集計マトリックス</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold w-[150px]">スタッフ名</TableHead>
                      {stores.map(store => (
                        <TableHead 
                          key={store} 
                          className={cn(
                            "text-right cursor-pointer hover:bg-slate-100 transition-colors",
                            selectedStores.has(store) && "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          )}
                          onClick={() => toggleMatrixFilter(null, store)}
                        >
                          {store}店
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-bold text-emerald-700">合計</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffNames.map(staff => (
                      <TableRow key={staff}>
                        <TableCell 
                          className={cn(
                            "font-medium bg-slate-50/30 cursor-pointer hover:bg-slate-100 transition-colors",
                            selectedStaffs.has(staff) && "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                          )}
                          onClick={() => toggleMatrixFilter(staff, null)}
                        >
                          {staff}
                        </TableCell>
                        {stores.map(store => {
                          const { total, discount, techSales, productSales } = getSalesMetrics(staff, store);
                          const isSelected = selectedStaffs.has(staff) && selectedStores.has(store);
                          
                          return (
                            <TableCell 
                              key={store} 
                              className={cn(
                                "text-right text-slate-600 cursor-pointer hover:bg-blue-50 transition-colors",
                                isSelected && "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300"
                              )}
                              onClick={() => toggleMatrixFilter(staff, store)}
                            >
                              <div className="flex flex-col items-end">
                                <span className="font-medium text-slate-900">¥{total.toLocaleString()}</span>
                                <div className="flex gap-1.5 text-[9px] font-bold leading-none mt-1">
                                  <span className="text-indigo-500/80">技 ¥{techSales.toLocaleString()}</span>
                                  <span className="text-emerald-500/80">店 ¥{productSales.toLocaleString()}</span>
                                </div>
                                {discount > 0 && (
                                  <span className="text-[9px] text-rose-500 font-bold leading-none mt-1">
                                    (引 ¥{discount.toLocaleString()})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-bold text-emerald-700 bg-emerald-50/10">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-900">¥{getSalesMetrics(staff, null).total.toLocaleString()}</span>
                            <div className="flex gap-1.5 text-[9px] font-bold leading-none mt-1">
                              <span className="text-indigo-500/60">技 ¥{getSalesMetrics(staff, null).techSales.toLocaleString()}</span>
                              <span className="text-emerald-500/60">店 ¥{getSalesMetrics(staff, null).productSales.toLocaleString()}</span>
                            </div>
                            {getSalesMetrics(staff, null).discount > 0 && (
                              <span className="text-[9px] text-rose-500 font-bold leading-none mt-1">
                                (引 ¥{getSalesMetrics(staff, null).discount.toLocaleString()})
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50">
                      <TableCell className="font-bold text-slate-800">店舗合計</TableCell>
                      {stores.map(store => {
                        const { total, discount, techSales, productSales } = getSalesMetrics(null, store);
                        return (
                          <TableCell key={store} className="text-right font-bold text-slate-800">
                            <div className="flex flex-col items-end">
                              <span className="text-slate-900">¥{total.toLocaleString()}</span>
                              <div className="flex gap-1.5 text-[9px] font-bold leading-none mt-1">
                                <span className="text-indigo-600/70">技 ¥{techSales.toLocaleString()}</span>
                                <span className="text-emerald-600/70">店 ¥{productSales.toLocaleString()}</span>
                              </div>
                              {discount > 0 && (
                                <span className="text-[9px] text-rose-600 font-bold leading-none mt-1">
                                  (引 ¥{discount.toLocaleString()})
                                </span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold text-emerald-700">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-900 text-lg">¥{totalSales.toLocaleString()}</span>
                          <div className="flex gap-1.5 text-[10px] font-bold leading-none mt-1">
                            <span className="text-indigo-700">技 ¥{sales.reduce((sum, s) => sum + s.tech_sales, 0).toLocaleString()}</span>
                            <span className="text-emerald-700">店 ¥{totalProductSales.toLocaleString()}</span>
                          </div>
                          {totalDiscount > 0 && (
                            <span className="text-[10px] text-rose-600 font-bold leading-none mt-1">
                              (引 ¥{totalDiscount.toLocaleString()})
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="p-4 flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 gap-4 bg-slate-50">
                <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-md shadow-sm">
                  <Link href={`/sales?month=${format(new Date(year, month - 2, 1), "yyyy-MM")}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-sm">
                      <ChevronLeft size={16} className="text-slate-600" />
                    </Button>
                  </Link>
                  <div className="px-4 font-bold text-slate-700 tabular-nums">
                    {year}年 {month}月
                  </div>
                  <Link href={`/sales?month=${format(new Date(year, month, 1), "yyyy-MM")}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-sm">
                      <ChevronRight size={16} className="text-slate-600" />
                    </Button>
                  </Link>
                </div>
                
                <div className="flex gap-4 items-center">
                  {profile?.role === 'admin' && selectedIds.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleBatchDelete(Array.from(selectedIds))}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      選択中の{selectedIds.size}件を削除
                    </Button>
                  )}
                  
                  {profile?.role === 'admin' && filteredSales.length > 0 && (selectedStaffs.size > 0 || selectedStores.size > 0 || searchQuery) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleBatchDelete(filteredSales.map(s => s.id))}
                      className="h-8 px-3 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      表示中の全{filteredSales.length}件を削除
                    </Button>
                  )}

                  {(selectedStaffs.size > 0 || selectedStores.size > 0) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold ring-1 ring-blue-100">
                      絞り込み中: {selectedStaffs.size > 0 ? Array.from(selectedStaffs).join(",") : "全員"} / {selectedStores.size > 0 ? Array.from(selectedStores).join(",") : "全店舗"}
                      <button onClick={clearFilters} className="hover:text-blue-900 ml-1">×</button>
                    </div>
                  )}

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="担当者・顧客名検索..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
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
                      <TableHead className="w-[80px]">日付</TableHead>
                      <TableHead className="w-[60px]">時間</TableHead>
                      <TableHead className="w-[80px]">店舗</TableHead>
                      <TableHead className="w-[100px]">担当</TableHead>
                      <TableHead className="w-[120px]">お客様名</TableHead>
                      <TableHead className="w-[80px] text-center">新・リピ</TableHead>
                      <TableHead>コース</TableHead>
                      <TableHead className="text-right w-[80px]">技術売上</TableHead>
                      <TableHead className="text-right w-[80px]">店販売上</TableHead>
                      <TableHead className="text-right w-[80px]">指名料</TableHead>
                      <TableHead className="text-right w-[80px] text-rose-600">割引</TableHead>
                      <TableHead className="text-right w-[80px] text-orange-500">HPB pt</TableHead>
                      <TableHead className="w-[120px] text-center">支払方法</TableHead>
                      <TableHead className="text-right font-bold w-[100px]">合計金額</TableHead>
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
                      [...filteredSales].sort((a, b) => a.date.localeCompare(b.date) || a.time?.localeCompare(b.time || "")).map((sale) => {
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
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black",
                                sale.payment_method === '現金' 
                                  ? 'bg-slate-100 text-slate-700' 
                                  : sale.payment_method === '不明'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              )}>
                                {sale.payment_method || "不明"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-800 bg-slate-50">
                              ¥{Math.max(0, saleTotal).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {profile?.role === 'admin' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleDeleteSale(sale.id)}>
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
