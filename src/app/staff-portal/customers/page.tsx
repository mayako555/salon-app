"use client";

import { useEffect, useState } from "react";
import { getAllCustomers, Customer, bulkDeleteCustomers, mergeCustomers } from "@/lib/customers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Search, UserPlus, AlertCircle, Phone, Calendar, ChevronRight, Scan, Trash2, CheckCircle, Circle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import ScanPaperDialog from "./ScanPaperDialog";
import AddCustomerDialog from "./AddCustomerDialog";
import MergeCustomerDialog from "./MergeCustomerDialog";
import { useAuth } from "@/lib/auth-context";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StaffCustomersPage() {
  const { profile, availableStores } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>("すべて");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getAllCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const handleExtracted = (data: Partial<Customer>) => {
    toast.success("AIスキャンが完了し、顧客リストに追加されました。");
    load();
  };

  useEffect(() => {
    load();
  }, []);

  const isTenantAdmin = profile?.role === "systemOwner" || profile?.role === "admin" || profile?.role === "companyOwner";
  const allowedStores = isTenantAdmin ? availableStores : (profile?.salonIds && profile.salonIds.length > 0 ? profile.salonIds : availableStores);

  const filtered = customers
    .filter(c => {
      // Security filter: only allow customers that belong to allowedStores
      const store = c.store_name || (c as any).main_store;
      
      // If store is completely undefined and they are a franchise, they shouldn't see it
      if (!isTenantAdmin && (!store || !allowedStores.includes(store))) {
        return false;
      }

      const matchesSearch = (c.name || "").includes(search) || 
                           (c.name_kana || "").includes(search) || 
                           (c.phone || "").includes(search) ||
                           (c.customer_no || "").includes(search);
      
      if (selectedStore === "すべて") return matchesSearch;
      return matchesSearch && store === selectedStore;
    })
    .sort((a, b) => {
      const getParts = (s: string = "") => {
        // Match prefix-number (e.g., a-1, ka-2, min-10)
        const match = s.match(/^([a-z]+)-(\d+)/i);
        if (match) {
          return { prefix: match[1].toLowerCase(), num: parseInt(match[2]), hasFormat: true };
        }
        return { prefix: s.toLowerCase() || "{zz", num: 999999, hasFormat: false };
      };
      
      const partsA = getParts(a.customer_no);
      const partsB = getParts(b.customer_no);

      // 1. Items with invalid format always go to the very bottom
      if (partsA.hasFormat && !partsB.hasFormat) return -1;
      if (!partsA.hasFormat && partsB.hasFormat) return 1;

      // 2. Rule: 'min' prefix group always comes after other groups
      if (partsA.prefix === "min" && partsB.prefix !== "min") return 1;
      if (partsA.prefix !== "min" && partsB.prefix === "min") return -1;

      // 3. Sort by prefix alphabetically (a, ka, sa...)
      if (partsA.prefix !== partsB.prefix) {
        return partsA.prefix.localeCompare(partsB.prefix);
      }

      // 4. If same prefix, sort by number
      return partsA.num - partsB.num;
    });

  const stores = ["すべて", ...allowedStores];

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length}名のお客様を削除してもよろしいですか？`)) return;
    
    const res = await bulkDeleteCustomers(selectedIds);
    if (res.success) {
      toast.success("選択したお客様を削除しました");
      setSelectedIds([]);
      load();
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const handleMergeClick = () => {
    if (selectedIds.length < 2) return;
    setIsMergeOpen(true);
  };

  const handleAutoMerge = async () => {
    // Group customers by name + number
    const groups: Record<string, Customer[]> = {};
    customers.forEach(c => {
      if (!c.name || !c.customer_no) return;
      const key = `${c.name}_${c.customer_no}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    const duplicates = Object.values(groups).filter(g => g.length > 1);
    if (duplicates.length === 0) {
      toast.info("重複しているお客様は見つかりませんでした");
      return;
    }

    if (!confirm(`${duplicates.length}組の重複が見つかりました。一括で統合しますか？\n（不足している項目は自動的に補完されます）`)) return;

    setLoading(true);
    let successCount = 0;
    for (const group of duplicates) {
      const master = group[0];
      const others = group.slice(1).map(c => c.id);
      
      // Intelligent Merge Data: Fill missing fields in master from others
      const mergedData: Partial<Customer> = { ...master };
      group.forEach(c => {
        if (!mergedData.phone && c.phone) mergedData.phone = c.phone;
        if (!mergedData.name_kana && c.name_kana) mergedData.name_kana = c.name_kana;
        if (!mergedData.address && c.address) mergedData.address = c.address;
        if (!mergedData.birthday && c.birthday) mergedData.birthday = c.birthday;
      });

      const res = await mergeCustomers(master.id, others, mergedData);
      if (res.success) successCount++;
    }

    toast.success(`${successCount}組の重複を統合しました`);
    load();
  };

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white pb-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1 flex items-center gap-2">
              お客様管理
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black tracking-widest">
                ALL {customers.length}
              </span>
            </h1>
            <p className="opacity-90 text-sm font-medium">
              {search || selectedStore !== "すべて" ? (
                <span className="text-blue-200">検索・絞り込み結果: {filtered.length}名</span>
              ) : (
                "顧客名簿とカルテの確認ができます。"
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAutoMerge}
              size="icon" 
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-lg shadow-emerald-900/20"
              title="重複を自動統合"
            >
              <ArrowRightLeft size={20} />
            </Button>
            <Button 
              onClick={() => setIsScanOpen(true)}
              size="icon" 
              className="rounded-full bg-blue-500 hover:bg-blue-600 border-none text-white shadow-lg shadow-blue-900/20"
              title="紙カルテをスキャン"
            >
              <Scan size={20} />
            </Button>
            <Button 
              onClick={() => setIsAddOpen(true)}
              size="icon" 
              className="rounded-full bg-white/20 hover:bg-white/30 border-none text-white"
            >
              <UserPlus size={20} />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-200" size={18} />
          <Input 
            placeholder="名前・フリガナ・電話番号で検索" 
            className="bg-white/20 border-none text-white placeholder:text-orange-100 pl-10 h-11 rounded-xl focus-visible:ring-white/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {stores.map(s => (
            <button
              key={s}
              onClick={() => setSelectedStore(s)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                selectedStore === s 
                  ? "bg-white text-orange-600 shadow-md" 
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {s}{s !== "すべて" ? "店" : ""}
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <button 
              onClick={toggleSelectAll}
              className="text-[10px] font-black uppercase tracking-widest text-orange-100 flex items-center gap-1.5 hover:text-white transition-colors"
            >
              {selectedIds.length === filtered.length ? <CheckCircle size={14} /> : <Circle size={14} />}
              {selectedIds.length === filtered.length ? "全選択を解除" : "すべて選択"}
            </button>
            {selectedIds.length >= 2 && (
              <Button 
                onClick={handleMergeClick}
                size="sm"
                className="h-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 border-none font-black text-[10px] px-3 flex items-center gap-1.5 shadow-lg shadow-blue-900/20 mr-2"
              >
                <ArrowRightLeft size={12} />
                統合
              </Button>
            )}
            {selectedIds.length > 0 && (
              <Button 
                onClick={handleBulkDelete}
                size="sm"
                variant="destructive"
                className="h-8 rounded-lg bg-white text-rose-600 hover:bg-rose-50 border-none font-black text-[10px] px-3 flex items-center gap-1.5 shadow-lg shadow-black/10"
              >
                <Trash2 size={12} />
                {selectedIds.length}名を削除
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="-mt-4 px-4 space-y-3">
        {loading ? (
          <div className="p-10 text-center text-slate-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
            <p className="text-slate-400">お客様が見つかりませんでした</p>
          </div>
        ) : (
          filtered.map((customer) => (
            <div key={customer.id} className="relative group">
              <button 
                onClick={(e) => toggleSelect(customer.id, e)}
                className={cn(
                  "absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md",
                  selectedIds.includes(customer.id) 
                    ? "bg-blue-600 text-white scale-110" 
                    : "bg-white text-slate-300 hover:text-blue-500 scale-100"
                )}
              >
                {selectedIds.includes(customer.id) ? <CheckCircle size={18} /> : <Circle size={18} />}
              </button>
              
              <Link href={`/staff-portal/customers/${customer.id}`}>
                <div className={cn(
                  "bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all ml-2",
                  selectedIds.includes(customer.id) ? "border-blue-500 bg-blue-50/30" : "border-slate-100"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-xs font-black uppercase tracking-tighter shrink-0",
                    customer.has_allergy ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                  )}>
                    {(() => {
                      const match = (customer.customer_no || "").match(/^([a-z]+)/i);
                      return match ? match[1].toUpperCase() : (customer.name || "?")[0];
                    })()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {customer.customer_no && (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-100">
                          No.{customer.customer_no}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{customer.name || "名称なし"}</span>
                      {customer.has_allergy && (
                        <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle size={10} /> アレルギー
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mb-1">{customer.name_kana}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Phone size={12} className="text-slate-300" /> {customer.phone || "---"}
                      </div>
                      {(customer.store_name || (customer as any).main_store) && (
                        <div className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                          {customer.store_name || (customer as any).main_store}
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      <ScanPaperDialog 
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onExtracted={handleExtracted}
      />

      <AddCustomerDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={load}
      />

      <MergeCustomerDialog
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        selectedCustomers={customers.filter(c => selectedIds.includes(c.id))}
        onSuccess={() => {
          setSelectedIds([]);
          load();
        }}
      />
    </div>
  );
}
