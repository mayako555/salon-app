"use client";

import { useState, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Minus, 
  AlertTriangle, 
  History, 
  Search, 
  Filter, 
  Boxes,
  ArrowRightLeft,
  ChevronDown,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Edit2,
  Save,
  DollarSign,
  Download
} from "lucide-react";
import { 
  updateStock, 
  requestOrder,
  updateOrderStatus,
  resetAndSeedInventory,
  updateInventoryItem
} from "./inventory-actions";
import { 
  InventoryItem, 
  InventoryLog, 
  InventoryOrder 
} from "./types";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "@/lib/firestore-server";
import BulkOrderDialog from "./BulkOrderDialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = [
  { id: "all", label: "すべて", icon: Boxes },
  { id: "lash", label: "ラッシュ（毛材）", icon: Package },
  { id: "product", label: "店販品・物販", icon: ExternalLink },
  { id: "consumable", label: "消耗品・備品", icon: History },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stock" | "orders">("stock");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState("六甲");
  const [isBulkOrderOpen, setIsBulkOrderOpen] = useState(false);

  // Selection for adjustment modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustCount, setAdjustCount] = useState(1);
  const [adjustReason, setAdjustReason] = useState<"sale" | "usage" | "restock" | "disposal" | "order_request">("usage");

  // Selection for Master Editing
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "inventory"), where("storeName", "==", selectedStore));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryItem[]);
      
      const qLog = query(collection(db, "inventory_logs"), where("storeName", "==", selectedStore), orderBy("date", "desc"), limit(20));
      const snapLog = await getDocs(qLog);
      setLogs(snapLog.docs.map(doc => ({ 
        id: doc.id, ...doc.data(), date: doc.data().date?.toDate() || new Date() 
      })) as InventoryLog[]);
      
      const qOrder = query(collection(db, "inventory_orders"), where("storeName", "==", selectedStore), orderBy("createdAt", "desc"));
      const snapOrder = await getDocs(qOrder);
      setOrders(snapOrder.docs.map(doc => ({ 
        id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() 
      })) as InventoryOrder[]);
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStore]);

  const handleResetSeed = async () => {
    if (!confirm("最新の発注マスターデータにリセットしますか？（現在の在庫数もリセットされます）")) return;
    setLoading(true);
    const res = await resetAndSeedInventory(selectedStore);
    if (res.success) {
      await loadData();
    } else {
      alert("リセットに失敗しました: " + res.error);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (item.subCategory?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
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

  const lowStockItems = items.filter(item => item.currentStock <= item.threshold);

  const handleAdjustStock = async () => {
    if (!adjustingItem) return;
    if (adjustReason === "order_request") {
      const res = await requestOrder(adjustingItem.id, adjustCount, "スタッフ");
      if (res.success) {
        setAdjustingItem(null);
        setAdjustCount(1);
        setActiveTab("orders");
        loadData();
      }
      return;
    }
    const finalCount = (adjustReason === "restock") ? adjustCount : -adjustCount;
    const res = await updateStock(adjustingItem.id, finalCount, adjustReason as any, "スタッフ操作");
    if (res.success) {
      setAdjustingItem(null);
      setAdjustCount(1);
      loadData();
    }
  };

  const handleUpdateMaster = async () => {
    if (!editingItem) return;
    const res = await updateInventoryItem(editingItem.id, editFormData);
    if (res.success) {
      setEditingItem(null);
      loadData();
    } else {
      alert("更新に失敗しました");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: InventoryOrder["status"]) => {
    const res = await updateOrderStatus(orderId, status, "管理者");
    if (res.success) loadData();
  };

  const handleExportCSV = () => {
    const headers = ["店舗", "カテゴリー", "商品名", "詳細", "現在庫", "単位", "仕入れ単価", "在庫評価額", "発注先"];
    const rows = filteredItems.map(item => [
      selectedStore,
      item.category,
      item.name,
      item.subCategory || "",
      item.currentStock,
      item.unit,
      item.price || 0,
      (item.price || 0) * item.currentStock,
      item.vendor
    ]);

    const csvContent = [
      "\uFEFF" + headers.join(","), // Add BOM for Excel
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `在庫一覧_${selectedStore}_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">在庫・発注管理</h1>
            <div className="flex gap-2">
              <Button 
                onClick={handleResetSeed}
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-rose-500 border-rose-100 hover:bg-rose-50 font-black text-[10px] gap-2"
              >
                <History size={14} /> マスター更新
              </Button>
              <Button 
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-emerald-600 border-emerald-100 hover:bg-emerald-50 font-black text-[10px] gap-2"
              >
                <Download size={14} /> CSV出力 (税理士提出用)
              </Button>
            </div>
          </div>
          <p className="text-slate-500 font-medium">発注表に基づいた全 {items.length} 種類のアイテムを管理しています。</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          {["六甲", "神戸", "元町"].map(store => (
            <button
              key={store}
              onClick={() => setSelectedStore(store)}
              className={cn(
                "px-8 py-2.5 rounded-xl text-sm font-black transition-all",
                selectedStore === store 
                  ? "bg-slate-900 text-white shadow-lg" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {store}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-200">
        {[
          { id: "stock", label: "在庫一覧", icon: Boxes },
          { id: "orders", label: "発注管理", icon: ShoppingCart }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-4 px-2 text-sm font-black transition-all relative flex items-center gap-2",
              activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === "orders" && orders.filter(o => o.status === "pending").length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {orders.filter(o => o.status === "pending").length}
              </span>
            )}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      {activeTab === "stock" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2.5rem] shadow-sm">
              <h3 className="font-black text-rose-900 flex items-center justify-between mb-6">
                <span className="flex items-center gap-2"><AlertTriangle size={18} /> 発注アラート</span>
                <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full">{lowStockItems.length}</span>
              </h3>
              <div className="space-y-3">
                {lowStockItems.slice(0, 4).map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-rose-100">
                    <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold mb-3">{item.subCategory}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-black text-rose-600">{item.currentStock}<span className="text-[10px] ml-1 opacity-50">{item.unit}</span></span>
                      <Button size="sm" onClick={() => { setAdjustingItem(item); setAdjustReason("order_request"); }} className="h-7 text-[10px] font-black bg-rose-600">発注申請</Button>
                    </div>
                  </div>
                ))}
                {lowStockItems.length === 0 && <p className="text-center py-6 text-xs font-bold text-emerald-600">在庫不足はありません</p>}
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm">
              <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2"><History size={18} /> 最近の履歴</h3>
              <div className="space-y-4">
                {logs.slice(0, 6).map(log => (
                  <div key={log.id} className="flex gap-3 items-start border-b border-slate-50 pb-3 last:border-0">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", log.count > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                      {log.count > 0 ? <Plus size={14} /> : <Minus size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-slate-800 truncate">{log.itemName}</p>
                      <p className="text-[9px] text-slate-400">{log.type === "sale" ? "レジ連動" : "手動調整"}</p>
                    </div>
                    <span className={cn("text-xs font-black", log.count > 0 ? "text-emerald-600" : "text-rose-600")}>{log.count > 0 ? "+" : ""}{log.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* List Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex bg-slate-50 p-1 rounded-2xl overflow-x-auto no-scrollbar shrink-0">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                      activeCategory === cat.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <cat.icon size={14} /> {cat.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-3 text-slate-300" size={16} />
                <input 
                  type="text" placeholder="商品名・サイズ・カールで検索..." 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <Button onClick={() => setIsBulkOrderOpen(true)} className="h-12 px-6 rounded-2xl bg-slate-900 font-black gap-2 shrink-0">
                <ShoppingCart size={18} /> 一括発注
              </Button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">商品名・詳細</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">現在庫</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">仕入れ単価</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">発注先</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">状態</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="py-24 text-center font-black text-slate-300">読み込み中...</td></tr>
                  ) : filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{item.subCategory}</p>
                          </div>
                          <button 
                            onClick={() => { setEditingItem(item); setEditFormData(item); }}
                            className="p-2 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={cn("text-2xl font-black tabular-nums", item.currentStock <= item.threshold ? "text-rose-600" : "text-slate-900")}>
                          {item.currentStock}<span className="text-[10px] ml-1 opacity-30">{item.unit || "個"}</span>
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-sm font-black text-slate-700 tabular-nums">
                          ¥{(item.price || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-lg">{item.vendor}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {item.currentStock <= item.threshold ? (
                          <span className="text-rose-500 font-black text-[10px] flex items-center justify-center gap-1"><AlertTriangle size={12} /> 不足</span>
                        ) : (
                          <span className="text-emerald-500 font-black text-[10px] flex items-center justify-center gap-1"><CheckCircle2 size={12} /> 充足</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setAdjustingItem(item); setAdjustReason("usage"); }} className="h-9 px-4 rounded-xl font-black text-xs">使用</Button>
                          <Button size="sm" onClick={() => { setAdjustingItem(item); setAdjustReason("order_request"); }} className="h-9 px-4 rounded-xl font-black text-xs bg-blue-600 shadow-lg shadow-blue-100">発注</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Order Management */
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">申請内容</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">数量</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ステータス</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-900">{order.itemName}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{order.staffName} が申請</p>
                      </td>
                      <td className="px-8 py-6 text-center font-black text-xl">{order.count}</td>
                      <td className="px-8 py-6 text-center">
                        <span className={cn(
                          "text-[10px] font-black px-3 py-1 rounded-full",
                          order.status === "pending" ? "bg-amber-100 text-amber-600" :
                          order.status === "ordered" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                        )}>{order.status}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {order.status === "pending" && <Button onClick={() => handleUpdateOrderStatus(order.id, "ordered")} size="sm" className="bg-slate-900 rounded-xl font-black">注文済みにする</Button>}
                        {order.status === "ordered" && <Button onClick={() => handleUpdateOrderStatus(order.id, "received")} size="sm" className="bg-emerald-600 rounded-xl font-black">届いた(入荷)</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black mb-2">{adjustReason === "order_request" ? "発注の申請" : "在庫の調整"}</h3>
            <p className="text-slate-400 font-bold mb-8">{adjustingItem.name} ({adjustingItem.subCategory})</p>
            
            <div className="bg-slate-50 p-8 rounded-3xl text-center mb-8">
              <div className="flex items-center justify-center gap-10">
                <button onClick={() => setAdjustCount(Math.max(1, adjustCount - 1))} className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-xl border border-slate-200">-</button>
                <span className="text-6xl font-black tabular-nums">{adjustCount}</span>
                <button onClick={() => setAdjustCount(adjustCount + 1)} className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-xl border border-slate-200">+</button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setAdjustingItem(null)} className="flex-1 h-14 rounded-2xl font-black">キャンセル</Button>
              <Button onClick={handleAdjustStock} className="flex-1 h-14 rounded-2xl font-black bg-blue-600 shadow-xl shadow-blue-100">確定する</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Master Modal */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-md bg-white rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Edit2 className="text-blue-600" />
              マスタ情報の編集
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">仕入れ単価 (¥)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="number"
                  value={editFormData.price || 0}
                  onChange={(e) => setEditFormData({...editFormData, price: parseInt(e.target.value)})}
                  className="w-full h-12 bg-slate-50 border-none rounded-xl pl-10 pr-4 font-black text-xl focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">現在の在庫数</label>
              <input 
                type="number"
                value={editFormData.currentStock || 0}
                onChange={(e) => setEditFormData({...editFormData, currentStock: parseInt(e.target.value)})}
                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-black text-xl focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">発注アラートしきい値</label>
              <input 
                type="number"
                value={editFormData.threshold || 0}
                onChange={(e) => setEditFormData({...editFormData, threshold: parseInt(e.target.value)})}
                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-black text-xl focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">商品名</label>
              <input 
                type="text"
                value={editFormData.name || ""}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">発注先（ベンダー）</label>
              <input 
                type="text"
                value={editFormData.vendor || ""}
                onChange={(e) => setEditFormData({...editFormData, vendor: e.target.value})}
                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setEditingItem(null)} className="rounded-xl font-bold">キャンセル</Button>
            <Button onClick={handleUpdateMaster} className="bg-slate-900 text-white rounded-xl font-black px-8 flex items-center gap-2">
              <Save size={18} />
              設定を保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkOrderDialog 
        isOpen={isBulkOrderOpen} onOpenChange={setIsBulkOrderOpen}
        items={items} storeName={selectedStore} onSuccess={loadData}
      />
    </div>
  );
}
