"use client";

import { useEffect, useState } from "react";
import { 
  getMasterItems, 
  upsertMasterItem, 
  deleteMasterItem, 
  toggleItemStatus,
  updateMasterItemOrder,
  updateMasterItemOrders,
  duplicateMasterItem,
  migrateStoreNames
} from "@/app/sales/master-actions";
import { resetSalesMasterData } from "@/app/sales/actions";
import { SalesMasterItem } from "@/types/master";
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
  Clock,
  Tag,
  Copy,
  Store,
  CreditCard,
  HelpCircle
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
  onDelete,
  onDuplicate,
  onOrderChange
}: { 
  item: SalesMasterItem; 
  index: number; 
  filteredCount: number; 
  onToggle: (id: string, current: boolean) => void;
  onEdit: (item: SalesMasterItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOrderChange: (id: string, newOrder: number) => void;
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

  const [orderVal, setOrderVal] = useState(item.sortOrder ?? index);

  useEffect(() => {
    setOrderVal(item.sortOrder ?? index);
  }, [item.sortOrder, index]);

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
            item.itemType === 'discount' ? 'bg-rose-500' :
            item.itemType === 'paymentMethod' ? 'bg-fuchsia-500' :
            item.itemType === 'store' ? 'bg-indigo-500' :
            'bg-slate-300'
          )} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5 rounded-md border-slate-200 text-slate-400">
                {item.store}
              </Badge>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{item.category}</span>
              <div className="flex items-center bg-slate-100 rounded-md overflow-hidden border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 pl-2">#</span>
                <input 
                  type="number"
                  className="w-12 h-5 bg-transparent border-none text-[10px] font-bold text-slate-600 focus:ring-0 p-0 text-center no-spinners"
                  value={orderVal}
                  onChange={(e) => setOrderVal(parseInt(e.target.value) || 0)}
                  onBlur={() => {
                    if (orderVal !== (item.sortOrder ?? index)) {
                      onOrderChange(item.id!, orderVal);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>
            </div>
            <h3 className="font-black text-slate-800 truncate">{item.name}</h3>
            {item.hpbName && <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.hpbName}</p>}
          </div>

            <div className="text-right flex flex-col items-end gap-1 px-4 border-l border-slate-50">
              {item.itemType === 'store' || item.itemType === 'reservationRoute' || item.itemType === 'paymentMethod' ? (
                <div className="flex flex-col items-end">
                  {item.itemType === 'store' && (
                    <>
                      <p className="text-xs font-black text-slate-700">営業時間</p>
                      <p className="text-sm font-black text-slate-500">{item.openTime || "10:00"} - {item.closeTime || "19:00"}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-lg font-black text-slate-900 tracking-tight">
                    {item.itemType === 'discount' ? '-¥' : '¥'}{(item.price || 0).toLocaleString()}
                  </p>
                  {item.duration && <p className="text-[10px] font-black text-slate-400 flex items-center gap-1"><Clock size={10} /> {item.duration}</p>}
                </>
              )}
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
              className="rounded-xl h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-slate-50"
              onClick={() => onDuplicate(item.id!)}
              title="複製する"
            >
              <Copy size={16} />
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
  const { profile, availableStores } = useAuth();
  const [items, setItems] = useState<SalesMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<Partial<SalesMasterItem> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any | null>(null);
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  
  const [hasPendingOrderChanges, setHasPendingOrderChanges] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<Record<string, number>>({});

  const handleMigrate = async (isDryRun: boolean = true) => {
    setIsMigrating(true);
    try {
      const res = await migrateStoreNames(isDryRun);
      if (res.success) {
        setMigrationResult(res);
        setIsMigrationDialogOpen(true);
        if (!isDryRun) {
          toast.success("店舗名データの本番移行が完了しました！");
        } else {
          toast.success("データ移行シミュレーション（ドライラン）が完了しました。結果を確認してください。");
        }
      } else {
        toast.error("店舗名の移行に失敗しました: " + res.error);
      }
    } catch (error: any) {
      toast.error("エラーが発生しました: " + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

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

    // Track pending changes
    setPendingOrders(prev => {
      const newPending = { ...prev };
      updatedWithOrder.forEach(item => {
        newPending[item.id!] = item.sortOrder!;
      });
      return newPending;
    });
    setHasPendingOrderChanges(true);
  };

  const handleSaveOrderChanges = async () => {
    const updates = Object.entries(pendingOrders).map(([id, sortOrder]) => ({ id, sortOrder }));
    if (updates.length === 0) return;

    setLoading(true);
    const res = await updateMasterItemOrders(updates);
    if (res.success) {
      toast.success("並び順を保存しました");
      setHasPendingOrderChanges(false);
      setPendingOrders({});
      loadItems();
    } else {
      toast.error("エラー: " + res.error);
      setLoading(false);
    }
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
        store: "共通",
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

  const filteredItems = items.filter(item => {
    if (storeFilter !== "all" && item.store !== storeFilter) return false;
    
    if (typeFilter !== "all") {
      if (typeFilter === "menu") {
        const menuTypes = ["menu", "coupon", "messageCoupon", "option", "fee"];
        if (!menuTypes.includes(item.itemType)) return false;
      } else if (typeFilter === "product") {
        if (item.itemType !== "product") return false;
      } else if (typeFilter === "reservationRoute") {
        if (item.itemType !== "reservationRoute") return false;
      } else if (typeFilter === "paymentMethod") {
        if (item.itemType !== "paymentMethod") return false;
      } else if (typeFilter === "discount") {
        if (item.itemType !== "discount") return false;
      } else if (typeFilter === "store") {
        if (item.itemType !== "store") return false;
      }
    }

    if (search) {
      const s = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(s) ||
        item.category?.toLowerCase().includes(s) ||
        item.hpbName?.toLowerCase().includes(s)
      );
    }
    return true;
  }).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

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
              <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
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

          {isMigrationDialogOpen && migrationResult && (
            <Dialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
              <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white border border-slate-200">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-slate-800 font-black">
                    <Database className="w-5 h-5 text-indigo-500" />
                    店舗名データ移行 {migrationResult.isDryRun ? "シミュレーション" : "実行結果"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className={`p-4 rounded-xl border text-sm font-bold ${migrationResult.isDryRun ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    <p>
                      {migrationResult.isDryRun 
                        ? "⚠️ これはシミュレーション（ドライラン）です。データベースはまだ書き換えられていません。" 
                        : "🎉 データベースの移行更新が正常に完了しました！"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">特定した正式 store_id 対応表</h4>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-mono space-y-1">
                      {Object.entries(migrationResult.idMapReport || {}).map(([name, id]: any) => (
                        <div key={id} className="flex justify-between">
                          <span className="text-slate-600 font-bold">{name}</span>
                          <span className="text-indigo-600 font-bold">{id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">処理対象レコード総数</span>
                      <span className="text-lg font-black text-slate-800">{migrationResult.report.totalProcessed} 件</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">{migrationResult.isDryRun ? "変換対象レコード数" : "更新完了レコード数"}</span>
                      <span className="text-lg font-black text-emerald-600">{migrationResult.report.updatedCount} 件</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">スキップ件数 (ID設定済)</span>
                      <span className="text-lg font-black text-slate-500">{migrationResult.report.skippedCount} 件</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">未変換件数 (名寄せ対象外)</span>
                      <span className="text-lg font-black text-rose-600">{migrationResult.report.unconvertedCount} 件</span>
                    </div>
                  </div>

                  {migrationResult.report.unconvertedValues && migrationResult.report.unconvertedValues.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">未変換の店舗名（名寄せ漏れ、空欄）のリスト</span>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-rose-700 max-h-32 overflow-y-auto font-mono">
                        {migrationResult.report.unconvertedValues.map((v: string, idx: number) => (
                          <div key={idx}>・{v}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setIsMigrationDialogOpen(false)} className="rounded-xl font-bold">
                    閉じる
                  </Button>
                  {migrationResult.isDryRun && (
                    <Button 
                      onClick={async () => {
                        if (confirm("シミュレーション結果に問題はありませんか？\n本番のデータ移行を開始し、既存の売上・顧客・予約データに店舗IDを付与します。")) {
                          setIsMigrationDialogOpen(false);
                          await handleMigrate(false); // 本番移行を実行
                        }
                      }}
                      className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black px-6 shadow-md"
                    >
                      本番データ移行を実行
                    </Button>
                  )}
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => {
              setEditingItem({ store: "共通", itemType: "menu", isActive: true });
              setTypeFilter("menu");
              setIsDialogOpen(true);
            }} className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md font-black text-white px-4 h-11">
              <Plus size={16} className="mr-1" /> メニュー追加
            </Button>
            <Button onClick={() => {
              setEditingItem({ store: "共通", itemType: "product", category: "店販", isActive: true });
              setTypeFilter("product");
              setIsDialogOpen(true);
            }} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md font-black text-white px-4 h-11">
              <Zap size={16} className="mr-1" /> 商品追加
            </Button>
            <Button onClick={() => {
              setEditingItem({ store: "共通", itemType: "reservationRoute", category: "予約経路", price: 0, isActive: true });
              setTypeFilter("reservationRoute");
              setIsDialogOpen(true);
            }} className="rounded-xl bg-amber-600 hover:bg-amber-700 shadow-md font-black text-white px-4 h-11">
              <Database size={16} className="mr-1" /> 予約経路追加
            </Button>
            <Button onClick={() => {
              setEditingItem({ store: "共通", itemType: "discount", category: "割引", isActive: true });
              setTypeFilter("menu");
              setIsDialogOpen(true);
            }} className="rounded-xl bg-rose-500 hover:bg-rose-600 shadow-md font-black text-white px-4 h-11">
              <Tag size={16} className="mr-1" /> 割引追加
            </Button>
            <Button onClick={() => {
              setEditingItem({ store: "共通", itemType: "paymentMethod", category: "支払い方法", price: 0, isActive: true });
              setTypeFilter("paymentMethod");
              setIsDialogOpen(true);
            }} className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 shadow-md font-black text-white px-4 h-11">
              <CreditCard size={16} className="mr-1" /> 支払い追加
            </Button>
            <Button onClick={() => {
              setEditingItem({ store: "共通", itemType: "store", category: "店舗", price: 0, isActive: true });
              setTypeFilter("store");
              setIsDialogOpen(true);
            }} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md font-black text-white px-4 h-11">
              <Store size={16} className="mr-1" /> 店舗追加
            </Button>
            <Button 
              onClick={() => handleMigrate(true)} 
              disabled={isMigrating}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 shadow-md font-black text-white px-4 h-11"
              title="旧店舗名（六甲、神戸、元町等）で登録された売上・顧客・予約データの、新店舗名IDへの統一移行シミュレーションを実行します"
            >
              {isMigrating ? "シミュレーション中..." : "店舗名データ移行（シミュレーション）"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
        {[
          { id: "all", label: "すべて", icon: Database },
          { id: "menu", label: "メニュー・クーポン", icon: Plus },
          { id: "product", label: "店販商品", icon: Zap },
          { id: "reservationRoute", label: "予約経路", icon: ArrowUpDown },
          { id: "paymentMethod", label: "支払い方法", icon: CreditCard },
          { id: "discount", label: "割引", icon: Tag },
          { id: "store", label: "店舗", icon: Store },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all",
              typeFilter === tab.id 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
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
                {["all", "共通", ...availableStores].map(s => (
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
                      onDuplicate={async (id) => {
                        const res = await duplicateMasterItem(id);
                        if (res.success) {
                          toast.success("アイテムを複製しました");
                          loadItems();
                        } else {
                          toast.error("複製に失敗しました");
                        }
                      }}
                      onOrderChange={(id, newOrder) => {
                        // 楽観的UI更新
                        setItems(prev => {
                          const newItems = prev.map(p => p.id === id ? { ...p, sortOrder: newOrder } : p);
                          return newItems.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
                        });
                        
                        // トラッキング
                        setPendingOrders(prev => ({
                          ...prev,
                          [id]: newOrder
                        }));
                        setHasPendingOrderChanges(true);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              {editingItem?.itemType === 'product' ? <Zap className="text-emerald-500" /> : 
               editingItem?.itemType === 'reservationRoute' ? <Database className="text-amber-500" /> : 
               editingItem?.itemType === 'paymentMethod' ? <CreditCard className="text-fuchsia-500" /> : 
               <Plus className="text-blue-500" />}
              {editingItem?.id ? "アイテムを編集" : 
               editingItem?.itemType === 'product' ? "店販商品を新規作成" :
               editingItem?.itemType === 'reservationRoute' ? "予約経路を新規作成" :
               editingItem?.itemType === 'paymentMethod' ? "支払い方法を新規作成" :
               editingItem?.itemType === 'store' ? "店舗を新規作成" :
               "メニューを新規作成"}
            </DialogTitle>
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
                  {/* Dynamic or static depending on context, but here they can still set which store it applies to. 
                      Since they are adding stores, maybe we don't want to restrict this list. For now we use the unique stores from items */}
                  {Array.from(new Set(items.filter(i => i.itemType === 'store').map(i => i.name))).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {/* Fallbacks */}
                  {!items.some(i => i.itemType === 'store') && (
                    <>
                      {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
                    </>
                  )}
                </select>
              </div>
              {(editingItem?.itemType === 'menu' || editingItem?.itemType === 'coupon' || editingItem?.itemType === 'messageCoupon' || editingItem?.id) && (
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
                    <option value="product">店販商品</option>
                    <option value="option">オプション</option>
                    <option value="discount">割引</option>
                    <option value="fee">キャンセル料</option>
                    <option value="reservationRoute">予約経路</option>
                    <option value="paymentMethod">支払い方法</option>
                    <option value="store">店舗</option>
                  </select>
                </div>
              )}
            </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                <Input 
                  value={editingItem?.name || ""} 
                  onChange={(e) => setEditingItem({ ...editingItem!, name: e.target.value })}
                  className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                  placeholder={
                    editingItem?.itemType === 'reservationRoute' ? "例：ホットペッパー、インスタなど" : 
                    editingItem?.itemType === 'paymentMethod' ? "例：現金、PayPayなど" : 
                    editingItem?.itemType === 'store' ? "例：渋谷本店、横浜店など" : "名前を入力"
                  }
                />
              </div>
            {editingItem?.itemType === 'store' && (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Open Time (開店時間)</label>
                  <Input 
                    type="time"
                    value={editingItem?.openTime || "10:00"} 
                    onChange={(e) => setEditingItem({ ...editingItem!, openTime: e.target.value })}
                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Close Time (閉店時間)</label>
                  <Input 
                    type="time"
                    value={editingItem?.closeTime || "19:00"} 
                    onChange={(e) => setEditingItem({ ...editingItem!, closeTime: e.target.value })}
                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LINE OA ID (公式LINE ID)</label>
                    <button 
                      type="button" 
                      onClick={() => setIsHelpOpen(true)}
                      className="text-slate-300 hover:text-blue-500 transition-colors"
                      title="LINE連携設定マニュアルを開く"
                    >
                      <HelpCircle size={12} />
                    </button>
                  </div>
                  <Input 
                    value={editingItem?.lineOaId || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem!, lineOaId: e.target.value })}
                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                    placeholder="@123abcde"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LIFF ID</label>
                    <button 
                      type="button" 
                      onClick={() => setIsHelpOpen(true)}
                      className="text-slate-300 hover:text-blue-500 transition-colors"
                      title="LIFF ID取得マニュアルを開く"
                    >
                      <HelpCircle size={12} />
                    </button>
                  </div>
                  <Input 
                    value={editingItem?.liffId || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem!, liffId: e.target.value })}
                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                    placeholder="1234567890-abcdefgh"
                  />
                </div>
              </div>
              </>
            )}

            {editingItem?.itemType !== 'reservationRoute' && editingItem?.itemType !== 'paymentMethod' && editingItem?.itemType !== 'store' && (
              <div className="grid grid-cols-2 gap-4">
                {editingItem?.itemType !== 'product' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Major Category (大分類タブ)</label>
                      <select 
                        className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-sm"
                        value={editingItem?.majorCategory || ""}
                        onChange={(e) => setEditingItem({ ...editingItem!, majorCategory: e.target.value })}
                      >
                        <option value="">選択（デフォルト: 施術）</option>
                        <option value="施術">施術</option>
                        <option value="店販">店販</option>
                        <option value="割引・サービス">割引・サービス</option>
                        <option value="オプション">オプション</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category (小分類タブ)</label>
                      <select 
                        className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-sm"
                        value={editingItem?.category || ""}
                        onChange={(e) => setEditingItem({ ...editingItem!, category: e.target.value })}
                      >
                        <option value="">選択してください</option>
                        {(!editingItem?.majorCategory || editingItem?.majorCategory === "施術") && (
                          <optgroup label="施術">
                            <option value="新規クーポン">新規クーポン</option>
                            <option value="再来クーポン">再来クーポン</option>
                            <option value="通常メニュー">通常メニュー</option>
                          </optgroup>
                        )}
                        {(!editingItem?.majorCategory || editingItem?.majorCategory === "店販") && (
                          <optgroup label="店販">
                            <option value="店販">店販</option>
                            <option value="社販">社販</option>
                          </optgroup>
                        )}
                        {(!editingItem?.majorCategory || editingItem?.majorCategory === "割引・サービス") && (
                          <optgroup label="割引・サービス">
                            <option value="割引">割引</option>
                            <option value="サービス">サービス</option>
                          </optgroup>
                        )}
                        {(!editingItem?.majorCategory || editingItem?.majorCategory === "オプション") && (
                          <optgroup label="オプション">
                            <option value="毛質変更">毛質変更</option>
                            <option value="オプション">オプション</option>
                            <option value="付け替えオフ">付け替えオフ</option>
                          </optgroup>
                        )}
                        <option value="その他">その他</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price</label>
                  <Input 
                    type="number"
                    value={editingItem?.price ?? 0} 
                    onChange={(e) => setEditingItem({ ...editingItem!, price: parseInt(e.target.value) || 0 })}
                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                  />
                </div>
              </div>
            )}

            {(editingItem?.itemType === 'menu' || editingItem?.itemType === 'coupon' || editingItem?.itemType === 'messageCoupon') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (所要時間)</label>
                    <Input 
                      value={editingItem?.duration || ""} 
                      onChange={(e) => setEditingItem({ ...editingItem!, duration: e.target.value })}
                      className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                      placeholder="例：1時間、90分など"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HPB Name</label>
                    <Input 
                      value={editingItem?.hpbName || ""} 
                      onChange={(e) => setEditingItem({ ...editingItem!, hpbName: e.target.value })}
                      className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                      placeholder="ホットペッパー上の名前"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Restrictions (制約)</label>
                  <Input 
                    value={editingItem?.restrictions || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem!, restrictions: e.target.value })}
                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                  <Input 
                    value={editingItem?.notes || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem!, notes: e.target.value })}
                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                  />
                </div>
              </>
            )}

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
                  <span className="text-sm font-bold text-slate-700">有効</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingItem?.trackInventory} 
                    onChange={(e) => setEditingItem({ ...editingItem!, trackInventory: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-200"
                  />
                  <span className="text-sm font-bold text-slate-700">在庫連動する</span>
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

      {hasPendingOrderChanges && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button 
            onClick={handleSaveOrderChanges}
            disabled={loading}
            className="rounded-full bg-blue-600 hover:bg-blue-700 font-black text-white h-14 px-8 shadow-2xl shadow-blue-500/30 active:scale-95 transition-all text-lg"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
            ) : (
              <Save size={20} className="mr-3" />
            )}
            順番の変更を保存する
          </Button>
        </div>
      )}
    </div>
  );
}
