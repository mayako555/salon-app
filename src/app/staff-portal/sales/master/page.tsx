"use client";

import { useEffect, useState } from "react";
import { 
  getMasterItems, 
  upsertMasterItem, 
  deleteMasterItem, 
  toggleItemStatus,
  updateMasterItemOrder
} from "@/app/sales/master-actions";
import { resetSalesMasterData } from "@/app/sales/actions";
import { SalesMasterItem } from "@/app/sales/seeds";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check, 
  AlertTriangle,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Zap,
  MoreVertical,
  ChevronRight,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// --- Sortable Item Component ---
function SortableItem({ 
  item, 
  index, 
  filteredCount, 
  onToggle, 
  onEdit, 
  onDelete 
}: { 
  item: SalesMasterItem; 
  index: number; 
  filteredCount: number; 
  onToggle: (id: string, current: boolean) => void;
  onEdit: (item: SalesMasterItem) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as any,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn(
        "group border-none shadow-sm hover:shadow-xl transition-all rounded-2xl overflow-hidden",
        !item.isActive ? 'opacity-60 bg-slate-50' : 'bg-white',
        isDragging && "shadow-2xl ring-2 ring-blue-500 ring-offset-2 scale-[1.02] z-50"
      )}>
        <CardContent className="p-4 flex items-center gap-4">
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-600 transition-colors">
            <GripVertical size={20} />
          </div>

          <div className={cn(
            "w-2 h-12 rounded-full",
            item.itemType === 'menu' ? 'bg-blue-400' :
            item.itemType === 'coupon' ? 'bg-rose-400' :
            item.itemType === 'messageCoupon' ? 'bg-amber-400' :
            'bg-slate-300'
          )} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5 rounded-md border-slate-200 text-slate-400">
                {item.store}
              </Badge>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{item.category}</span>
              <Badge variant="secondary" className="text-[9px] font-bold h-5 bg-slate-100 text-slate-500">
                #{item.sortOrder || index}
              </Badge>
            </div>
            <h3 className="font-black text-slate-800 truncate">{item.name}</h3>
            {item.hpbName && <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.hpbName}</p>}
          </div>

          <div className="text-right flex flex-col items-end gap-1 px-4 border-l border-slate-50">
            <p className="text-lg font-black text-slate-900 tracking-tight">¥{item.price.toLocaleString()}</p>
            {item.duration && <p className="text-[10px] font-black text-slate-400 flex items-center gap-1"><Clock size={10} /> {item.duration}</p>}
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-xl h-10 w-10",
                item.isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'
              )}
              onClick={() => onToggle(item.id!, item.isActive)}
            >
              {item.isActive ? <Check size={18} /> : <X size={18} />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-slate-50"
              onClick={() => onEdit(item)}
            >
              <Edit2 size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-slate-50"
              onClick={() => onDelete(item.id!)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to merge classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default function MasterManagementPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<SalesMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<Partial<SalesMasterItem> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [bulkText, setBulkText] = useState("");

  useEffect(() => {
    loadItems();
  }, [storeFilter]);

  async function loadItems() {
    setLoading(true);
    const data = await getMasterItems(storeFilter);
    setItems(data);
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.store || !editingItem?.itemType) {
      toast.error("必須項目を入力してください");
      return;
    }

    const res = await upsertMasterItem(editingItem);
    if (res.success) {
      toast.success("保存しました");
      setIsDialogOpen(false);
      loadItems();
    } else {
      toast.error("エラー: " + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    const res = await deleteMasterItem(id);
    if (res.success) {
      toast.success("削除しました");
      loadItems();
    } else {
      toast.error("エラー: " + res.error);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    const res = await toggleItemStatus(id, !current);
    if (res.success) {
      toast.success(current ? "非表示にしました" : "表示にしました");
      loadItems();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag starts after 8px movement to allow clicking
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredItems.findIndex(item => item.id === active.id);
    const newIndex = filteredItems.findIndex(item => item.id === over.id);

    const newItems = arrayMove(filteredItems, oldIndex, newIndex);
    
    // Optimistic update
    const updatedWithOrder = newItems.map((item, idx) => ({
      ...item,
      sortOrder: idx
    }));
    
    // Apply locally
    setItems(prev => {
      const otherItems = prev.filter(p => !newItems.find(n => n.id === p.id));
      return [...otherItems, ...updatedWithOrder].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    });

    // Persist to Firestore
    toast.promise(
      Promise.all(updatedWithOrder.map(item => updateMasterItemOrder(item.id!, item.sortOrder!))),
      {
        loading: '順番を保存中...',
        success: '順番を保存しました',
        error: '順番の保存に失敗しました'
      }
    );
  };

  const handleBulkImport = async () => {
    const lines = bulkText.trim().split("\n");
    let count = 0;
    
    for (const line of lines) {
      const [category, name, price, duration, hpbName, restrictions, notes] = line.split("|").map(s => s?.trim());
      if (!name) continue;

      // Determine itemType based on category
      let itemType: SalesMasterItem["itemType"] = "menu";
      if (category.includes("クーポン")) itemType = "coupon";
      if (category.includes("メッセージ")) itemType = "messageCoupon";
      if (category.includes("オプション")) itemType = "option";
      if (category.includes("割引")) itemType = "discount";
      if (category.includes("料")) itemType = "fee";

      await upsertMasterItem({
        store: category.includes("六甲") ? "六甲" : "共通",
        itemType,
        category,
        name,
        price: parseInt(price.replace(/[^0-9-]/g, "")) || 0,
        duration,
        hpbName,
        restrictions,
        notes,
        isActive: true
      });
      count++;
    }

    toast.success(`${count}件のアイテムをインポートしました`);
    setBulkText("");
    loadItems();
  };

  const handleReset = async () => {
    if (resetConfirmText !== "リセット") return;
    
    setLoading(true);
    setIsResetDialogOpen(false);
    const res = await resetSalesMasterData();
    if (res.success) {
      toast.success("マスタデータを初期化しました");
      setResetConfirmText("");
      loadItems();
    } else {
      toast.error("エラー: " + res.error);
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase()) ||
    item.hpbName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Database className="text-blue-600" /> メニュー・商品設定
          </h1>
          <p className="text-slate-500 font-medium">メニュー、クーポン、店販品の管理</p>
        </div>
        <div className="flex gap-3">
          {profile?.role === 'admin' && (
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 shadow-sm font-bold"
                >
                  <AlertTriangle size={16} className="mr-2" /> マスタ初期化
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-rose-600 flex items-center gap-2">
                    <AlertTriangle /> マスタデータの初期化
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-sm text-rose-700 leading-relaxed">
                    この操作を行うと、現在登録されているすべてのメニュー、クーポン、商品データが削除され、定義ファイルにある最新の初期データに置き換わります。<br />
                    <strong>※この操作は取り消せません。</strong>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500">実行するには、下のボックスに「リセット」と入力してください。</p>
                    <Input 
                      placeholder="リセット" 
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-black text-center text-lg"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)} className="rounded-xl font-bold">キャンセル</Button>
                  <Button 
                    onClick={handleReset} 
                    disabled={resetConfirmText !== "リセット"}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black px-8 shadow-lg shadow-rose-100 disabled:opacity-30"
                  >
                    初期化を実行する
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-slate-200 hover:bg-slate-100 shadow-sm font-bold text-slate-600">
                一括インポート
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>メニュー・商品データの一括読み込み</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-xs text-slate-500">区分|施術名|価格|所要時間|HPBクーポン名|制約|その他の形式で入力してください。</p>
                <textarea 
                  className="w-full h-64 p-3 text-xs border rounded-xl bg-slate-50 font-mono"
                  placeholder="新規クーポン｜上パーマ｜4500｜1.5h｜... "
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <Button onClick={handleBulkImport} className="w-full h-12 rounded-xl bg-slate-900 font-black text-white">
                  インポート実行
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => {
            setEditingItem({ store: "共通", itemType: "menu", isActive: true });
            setIsDialogOpen(true);
          }} className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 font-black text-white px-6">
            <Plus size={18} className="mr-1" /> 新規作成
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white pb-6">
            <CardTitle className="text-sm uppercase tracking-widest font-black flex items-center gap-2">
              <Filter size={14} /> Filter & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-300" size={16} />
                <Input 
                  placeholder="検索..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 bg-slate-50 border-none rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Store Filter</label>
              <div className="grid grid-cols-1 gap-1">
                {["all", "共通", "六甲", "神戸", "元町"].map(s => (
                  <button
                    key={s}
                    onClick={() => setStoreFilter(s)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      storeFilter === s 
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                      : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {s === "all" ? "すべて" : s}
                    {storeFilter === s && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-1 md:col-span-3 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse">データを読み込み中...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-100">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="text-slate-300" size={24} />
              </div>
              <p className="text-slate-400 font-bold">データが見つかりません</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={filteredItems.map(i => i.id!)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredItems.map((item, index) => (
                    <SortableItem 
                      key={item.id}
                      item={item}
                      index={index}
                      filteredCount={filteredItems.length}
                      onToggle={handleToggle}
                      onEdit={(item) => {
                        setEditingItem(item);
                        setIsDialogOpen(true);
                      }}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{editingItem?.id ? "アイテムを編集" : "新規アイテム作成"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store</label>
                <select 
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-sm"
                  value={editingItem?.store}
                  onChange={(e) => setEditingItem({ ...editingItem!, store: e.target.value as any })}
                >
                  <option value="共通">共通</option>
                  <option value="六甲">六甲</option>
                  <option value="神戸">神戸</option>
                  <option value="元町">元町</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Type</label>
                <select 
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-sm"
                  value={editingItem?.itemType}
                  onChange={(e) => setEditingItem({ ...editingItem!, itemType: e.target.value as any })}
                >
                  <option value="menu">通常メニュー</option>
                  <option value="coupon">クーポン</option>
                  <option value="messageCoupon">メッセージクーポン</option>
                  <option value="option">オプション</option>
                  <option value="discount">割引</option>
                  <option value="fee">キャンセル料</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
              <Input 
                value={editingItem?.name} 
                onChange={(e) => setEditingItem({ ...editingItem!, name: e.target.value })}
                className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select 
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-sm"
                  value={editingItem?.category}
                  onChange={(e) => setEditingItem({ ...editingItem!, category: e.target.value })}
                >
                  <option value="">選択してください</option>
                  <option value="アイブロウメニュー">アイブロウメニュー</option>
                  <option value="マツエクメニュー">マツエクメニュー</option>
                  <option value="まつ毛パーマメニュー">まつ毛パーマメニュー</option>
                  <option value="毛質変更">毛質変更</option>
                  <option value="付け替えオフ">付け替えオフ</option>
                  <option value="その他オプション">その他オプション</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price</label>
                <Input 
                  type="number"
                  value={editingItem?.price} 
                  onChange={(e) => setEditingItem({ ...editingItem!, price: parseInt(e.target.value) || 0 })}
                  className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (所要時間)</label>
                <Input 
                  value={editingItem?.duration} 
                  onChange={(e) => setEditingItem({ ...editingItem!, duration: e.target.value })}
                  className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HPB Name</label>
                <Input 
                  value={editingItem?.hpbName} 
                  onChange={(e) => setEditingItem({ ...editingItem!, hpbName: e.target.value })}
                  className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Restrictions (制約)</label>
              <Input 
                value={editingItem?.restrictions} 
                onChange={(e) => setEditingItem({ ...editingItem!, restrictions: e.target.value })}
                className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
              <Input 
                value={editingItem?.notes} 
                onChange={(e) => setEditingItem({ ...editingItem!, notes: e.target.value })}
                className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sort Order (表示順)</label>
                <Input 
                  type="number"
                  value={editingItem?.sortOrder || 0} 
                  onChange={(e) => setEditingItem({ ...editingItem!, sortOrder: parseInt(e.target.value) || 0 })}
                  className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                />
              </div>
              <div className="space-y-2 pt-6 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingItem?.isActive} 
                    onChange={(e) => setEditingItem({ ...editingItem!, isActive: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-200"
                  />
                  <span className="text-sm font-bold text-slate-700">有効（表示する）</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-2xl font-bold h-12 px-6">キャンセル</Button>
              <Button type="submit" className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-white h-12 px-8 shadow-xl shadow-blue-200">
                <Save size={18} className="mr-2" /> 保存する
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
