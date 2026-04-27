"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Loader2, 
  Search, 
  Filter,
  CheckCircle2,
  Circle,
  Edit2
} from "lucide-react";
import Link from "next/link";
import { getMasterItems, upsertMasterItem, deleteMasterItem, toggleItemStatus } from "@/app/sales/master-actions";
import { SalesMasterItem } from "@/app/sales/seeds";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STORES = ["六甲", "神戸", "元町"];
const ITEM_TYPES = [
  { id: "menu", label: "通常メニュー" },
  { id: "coupon", label: "クーポン" },
  { id: "messageCoupon", label: "メッセージクーポン" }
];

export default function MasterDataPage() {
  const [items, setItems] = useState<SalesMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("六甲");
  const [selectedType, setSelectedType] = useState<string>("menu");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<Partial<SalesMasterItem> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [selectedStore]);

  const fetchItems = async () => {
    setLoading(true);
    const data = await getMasterItems(selectedStore);
    setItems(data);
    setLoading(false);
  };

  const filteredItems = items.filter(item => 
    item.itemType === selectedType && 
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const res = await toggleItemStatus(id, !currentStatus);
    if (res.success) {
      setItems(items.map(item => item.id === id ? { ...item, isActive: !currentStatus } : item));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この項目を削除してもよろしいですか？")) return;
    const res = await deleteMasterItem(id);
    if (res.success) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setIsSaving(true);
    const res = await upsertMasterItem({
      ...editingItem,
      store: selectedStore as any,
      itemType: selectedType as any
    });
    
    if (res.success) {
      setEditingItem(null);
      fetchItems();
    } else {
      alert("保存に失敗しました: " + res.error);
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sales" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">POSマスタ管理</h1>
              <p className="text-xs text-slate-500 font-normal">店舗別のメニュー・クーポン設定</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {STORES.map(store => (
              <button
                key={store}
                onClick={() => setSelectedStore(store)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  selectedStore === store 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {store}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-white border border-slate-200 p-1 rounded-lg w-full md:w-auto">
            {ITEM_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  selectedType === type.id 
                    ? "bg-emerald-50 text-emerald-700 font-bold" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="名称・カテゴリで検索..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white"
              />
            </div>
            <Button 
              onClick={() => setEditingItem({ 
                store: selectedStore as any, 
                itemType: selectedType as any,
                isActive: true,
                price: 0,
                category: "",
                name: ""
              })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-6"
            >
              <Plus size={18} />
              新規追加
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-12 text-center">有効</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead className="min-w-[200px]">名称</TableHead>
                  <TableHead className="text-right">価格 (円)</TableHead>
                  <TableHead className="text-center">指名可</TableHead>
                  <TableHead className="text-center">設備可</TableHead>
                  <TableHead className="w-24 text-right pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                      <Loader2 className="animate-spin mx-auto mb-2" />
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                      データが見つかりません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id} className={!item.isActive ? "bg-slate-50/50 opacity-60" : ""}>
                      <TableCell className="text-center">
                        <button onClick={() => handleToggleStatus(item.id!, item.isActive)}>
                          {item.isActive ? (
                            <CheckCircle2 className="text-emerald-500 w-5 h-5 mx-auto" />
                          ) : (
                            <Circle className="text-slate-300 w-5 h-5 mx-auto" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                          {item.category || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-700">
                        ¥{item.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.staffAssignable ? "bg-blue-100 text-blue-700" : "text-slate-300"}`}>
                          {item.staffAssignable ? "スタッフ" : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.equipmentAssignable ? "bg-purple-100 text-purple-700" : "text-slate-300"}`}>
                          {item.equipmentAssignable ? "設備" : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id!)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSave}>
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-lg">
                  {editingItem.id ? "マスタ項目の編集" : "新規項目の登録"}
                </CardTitle>
                <p className="text-xs text-slate-500 font-normal">
                  {selectedStore}店 / {ITEM_TYPES.find(t => t.id === selectedType)?.label}
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">カテゴリ</label>
                  <Input 
                    required
                    value={editingItem.category || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    placeholder="例: カット, クーポン, キャンペーン"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">名称</label>
                  <Input 
                    required
                    value={editingItem.name || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="例: スタンダードカット"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">価格 (円)</label>
                  <Input 
                    type="number"
                    required
                    value={editingItem.price || 0} 
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingItem.staffAssignable} 
                      onChange={(e) => setEditingItem({ ...editingItem, staffAssignable: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                    />
                    スタッフ指名可
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingItem.equipmentAssignable} 
                      onChange={(e) => setEditingItem({ ...editingItem, equipmentAssignable: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                    />
                    設備割当可
                  </label>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditingItem(null)} disabled={isSaving}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : "保存する"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
