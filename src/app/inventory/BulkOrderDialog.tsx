"use client";

import { useState } from "react";
import { bulkRequestOrders } from "./inventory-actions";
import { InventoryItem } from "./types";
import { VENDORS } from "./constants";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, X, CheckCircle2, ShoppingCart } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BulkOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  storeName: string;
  onSuccess: () => void;
}

export default function BulkOrderDialog({ isOpen, onOpenChange, items, storeName, onSuccess }: BulkOrderDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group items by base name (e.g. "フラットラッシュ C")
  const groups: Record<string, InventoryItem[]> = {};
  items.forEach(item => {
    if (item.category !== "lash") return;
    const baseName = item.name;
    if (!groups[baseName]) groups[baseName] = [];
    groups[baseName].push(item);
  });

  // Extract lengths from subCategory (e.g. "Cカール / 11mm" -> 11 or "J8" -> 8)
  const getLength = (sub: string) => {
    // Try to find digits in the string
    const match = sub.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const handleQtyChange = (id: string, val: string) => {
    const num = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, num) }));
  };

  const handleSubmit = async () => {
    const orderItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = items.find(i => i.id === id);
        return { 
          itemId: id, 
          itemName: item?.name || "Unknown", 
          count: qty, 
          storeName 
        };
      });

    if (orderItems.length === 0) {
      alert("発注する商品の数量を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bulkRequestOrders(orderItems, "スタッフ");
      if (res.success) {
        setQuantities({});
        onSuccess();
        onOpenChange(false);
      } else {
        alert("エラーが発生しました: " + res.error);
      }
    } catch (err) {
      alert("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals per vendor
  const vendorTotals: Record<string, number> = {};
  Object.entries(quantities).forEach(([id, qty]) => {
    if (qty <= 0) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    const vendor = item.vendor || "その他";
    const price = item.price || (item as any).costPrice || 1848; 
    vendorTotals[vendor] = (vendorTotals[vendor] || 0) + (price * qty);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl h-[90vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-900 text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <ShoppingCart className="text-blue-400" />
                一括発注マトリックス
              </DialogTitle>
              <p className="text-slate-400 text-sm font-medium mt-1">必要な数量を各ボックスに入力して一括申請できます。</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-slate-50">
          {/* Shipping Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.keys(vendorTotals).map(vendorName => {
              const vendor = VENDORS[vendorName as keyof typeof VENDORS];
              const total = vendorTotals[vendorName];
              const threshold = vendor?.threshold || 0;
              const isFree = threshold > 0 ? total >= threshold : true;
              
              return (
                <div key={vendorName} className={cn(
                  "p-4 rounded-2xl border flex flex-col gap-1",
                  isFree ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
                )}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{vendorName}</span>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-black text-slate-900">¥{total.toLocaleString()}</span>
                    {threshold > 0 && !isFree && (
                      <span className="text-[10px] font-black text-rose-600 animate-bounce">
                        あと ¥{(threshold - total).toLocaleString()}で送料無料
                      </span>
                    )}
                    {isFree && threshold > 0 && (
                      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> 送料無料達成！
                      </span>
                    )}
                  </div>
                  {threshold > 0 && (
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", isFree ? "bg-emerald-500" : "bg-amber-500")}
                        style={{ width: `${Math.min(100, (total / threshold) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {Object.entries(groups).map(([baseName, groupItems]) => {
            // Sort by length
            const sorted = [...groupItems].sort((a, b) => getLength(a.subCategory!) - getLength(b.subCategory!));
            
            return (
              <div key={baseName} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100/50 px-6 py-4 border-b border-slate-200">
                  <h4 className="font-black text-slate-900 flex items-center gap-2">
                    <Package size={16} className="text-slate-400" />
                    {baseName}
                  </h4>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {sorted.map(item => {
                      const len = getLength(item.subCategory!);
                      const isLow = item.currentStock <= item.threshold;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex flex-col gap-2 p-3 rounded-2xl border transition-all",
                            quantities[item.id] > 0 ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100" : "border-slate-100 bg-slate-50"
                          )}
                        >
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-400">{len}mm</span>
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded-md",
                              isLow ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-500"
                            )}>
                              在:{item.currentStock}
                            </span>
                          </div>
                          <Input 
                            type="number"
                            min="0"
                            placeholder="0"
                            value={quantities[item.id] || ""}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            className="h-10 text-center font-black rounded-xl border-none shadow-sm focus-visible:ring-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="p-8 bg-white border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="text-slate-400 text-xs font-bold">
              選択中のアイテム: <span className="text-slate-900 font-black">{Object.values(quantities).filter(v => v > 0).length}</span> 件
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl font-bold h-14 px-8">キャンセル</Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || Object.values(quantities).filter(v => v > 0).length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black h-14 px-10 shadow-xl shadow-blue-100 disabled:opacity-30 flex items-center gap-2"
              >
                {isSubmitting ? "送信中..." : (
                  <>
                    <CheckCircle2 size={20} />
                    まとめて発注申請する
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
