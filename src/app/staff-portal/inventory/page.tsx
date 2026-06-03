"use client";

import { useState, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Search, 
  Boxes,
  CheckCircle2,
  ShoppingCart,
  Clock,
  CheckCircle,
  Truck
} from "lucide-react";
import { 
  updateStock, 
  requestOrder,
  updateOrderStatus
} from "../../inventory/inventory-actions";
import { 
  InventoryItem, 
  InventoryOrder 
} from "../../inventory/types";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import BulkOrderDialog from "../../inventory/BulkOrderDialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = [
  { id: "all", label: "すべて", icon: Boxes },
  { id: "material", label: "業務用・商材", icon: Package },
  { id: "product", label: "店販品", icon: Package },
  { id: "consumable", label: "消耗品", icon: Package },
];

export default function StaffInventoryPage() {
  const { profile, selectedStore } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"stock" | "status">("stock");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustCount, setAdjustCount] = useState(1);
  const [adjustReason, setAdjustReason] = useState<"usage" | "order_request">("usage");
  const [isBulkOrderOpen, setIsBulkOrderOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "inventory"), where("storeName", "==", selectedStore));
      const snapshot = await getDocs(q);
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryItem[];
      
      // Sort items by curl and length
      fetchedItems.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        const getSortInfo = (sub: string = "") => {
          const curlMatch = sub.match(/^([A-Z]+)/);
          const lenMatch = sub.match(/(\d+)/);
          const curl = curlMatch ? curlMatch[1] : "";
          const len = lenMatch ? parseInt(lenMatch[1]) : 0;
          const curlOrder: Record<string, number> = { "J": 1, "JC": 2, "C": 3, "CC": 4, "D": 5 };
          return { order: curlOrder[curl] || 99, len };
        };
        const infoA = getSortInfo(a.subCategory);
        const infoB = getSortInfo(b.subCategory);
        if (infoA.order !== infoB.order) return infoA.order - infoB.order;
        return infoA.len - infoB.len;
      });
      setItems(fetchedItems);
      
      const qOrder = query(collection(db, "inventory_orders"), where("storeName", "==", selectedStore), orderBy("createdAt", "desc"), limit(30));
      const snapOrder = await getDocs(qOrder);
      setOrders(snapOrder.docs.map(doc => ({ 
        id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() 
      })) as InventoryOrder[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStore]);

  const handleAction = async () => {
    if (!adjustingItem) return;
    if (adjustReason === "order_request") {
      const res = await requestOrder(adjustingItem.id, adjustCount, profile?.name || "スタッフ");
      if (res.success) {
        setAdjustingItem(null);
        setAdjustCount(1);
        setActiveTab("status");
        loadData();
      }
      return;
    }
    const res = await updateStock(adjustingItem.id, -adjustCount, "usage", profile?.name || "スタッフ");
    if (res.success) {
      setAdjustingItem(null);
      setAdjustCount(1);
      loadData();
    }
  };

  const handleReceived = async (orderId: string) => {
    const res = await updateOrderStatus(orderId, "received", profile?.name || "スタッフ");
    if (res.success) loadData();
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (item.subCategory?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900">在庫・発注申請</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedStore}店 スタッフ用</p>
        </div>
        <div className="bg-slate-950 text-white px-4 py-2 rounded-xl text-xs font-black">
          {selectedStore}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1 rounded-2xl">
        <button 
          onClick={() => setActiveTab("stock")}
          className={cn(
            "py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
            activeTab === "stock" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          )}
        >
          <Boxes size={16} /> 在庫確認・申請
        </button>
        <button 
          onClick={() => setActiveTab("status")}
          className={cn(
            "py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
            activeTab === "status" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          )}
        >
          <Truck size={16} /> 届きました（入荷）
          {orders.filter(o => o.status === "ordered").length > 0 && (
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {activeTab === "stock" ? (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" placeholder="商品名で検索..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
              />
            </div>
            <Button 
              onClick={() => setIsBulkOrderOpen(true)}
              className="h-12 px-6 rounded-2xl bg-slate-900 font-black gap-2 shrink-0 shadow-lg shadow-black/10"
            >
              <ShoppingCart size={18} /> 一括申請
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black transition-all whitespace-nowrap",
                  activeCategory === cat.id ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-100"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 truncate">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{item.subCategory}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-xl font-black tabular-nums",
                      item.currentStock <= item.threshold ? "text-rose-600" : "text-slate-900"
                    )}>
                      {item.currentStock}
                      <span className="text-[10px] ml-1 opacity-40">{item.unit}</span>
                    </span>
                    {item.currentStock <= item.threshold && (
                      <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">不足</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setAdjustingItem(item); setAdjustReason("usage"); }}
                    className="h-10 px-4 rounded-xl font-black text-[10px] border-slate-200"
                  >
                    使用
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => { setAdjustingItem(item); setAdjustReason("order_request"); }}
                    className="h-10 px-4 rounded-xl font-black text-[10px] bg-blue-600 shadow-lg shadow-blue-100"
                  >
                    申請
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">入荷待ちのアイテム</h2>
          <div className="space-y-3">
            {orders.filter(o => o.status !== "received").map(order => (
              <div key={order.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-black text-slate-900">{order.itemName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{order.count}個 を申請中</p>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
                    order.status === "pending" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {order.status === "pending" ? "申請中" : "発注済み"}
                  </span>
                </div>
                
                {order.status === "ordered" ? (
                  <Button 
                    onClick={() => handleReceived(order.id)}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100"
                  >
                    <CheckCircle size={18} /> 届きました（入荷）
                  </Button>
                ) : (
                  <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 gap-2 italic">
                    <Clock size={14} /> 管理者が発注するのをお待ちください
                  </div>
                )}
              </div>
            ))}
            {orders.filter(o => o.status !== "received").length === 0 && (
              <div className="text-center py-20 text-slate-300 font-black italic">
                現在、入荷待ちのアイテムはありません
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black mb-1">{adjustReason === "order_request" ? "発注の申請" : "使用報告"}</h3>
            <p className="text-slate-400 font-bold text-xs mb-6 truncate">{adjustingItem.name} ({adjustingItem.subCategory})</p>
            
            <div className="bg-slate-50 p-6 rounded-2xl text-center mb-6">
              <div className="flex items-center justify-center gap-8">
                <button onClick={() => setAdjustCount(Math.max(1, adjustCount - 1))} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-lg border border-slate-200">-</button>
                <span className="text-4xl font-black tabular-nums">{adjustCount}</span>
                <button onClick={() => setAdjustCount(adjustCount + 1)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-lg border border-slate-200">+</button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setAdjustingItem(null)} className="flex-1 h-12 rounded-xl font-black text-slate-400">閉じる</Button>
              <Button onClick={handleAction} className="flex-1 h-12 rounded-xl font-black bg-blue-600 shadow-xl shadow-blue-100">
                {adjustReason === "order_request" ? "申請する" : "確定する"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BulkOrderDialog 
        isOpen={isBulkOrderOpen} onOpenChange={setIsBulkOrderOpen}
        items={items} storeName={selectedStore} onSuccess={loadData}
      />
    </div>
  );
}
