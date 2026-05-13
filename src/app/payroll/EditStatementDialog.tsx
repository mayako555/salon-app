"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Edit3, 
  Clock, 
  Calendar, 
  Save, 
  Loader2, 
  TrendingDown, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Trash2,
  Wallet
} from "lucide-react";
import { MonthlyStatement, updateStatementMetrics } from "./actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EditStatementDialog({ stmt, onUpdate }: { stmt: MonthlyStatement, onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Attendance States
  const [hours, setHours] = useState(stmt.details.metrics?.worked_hours?.toString() || "0");
  const [days, setDays] = useState(stmt.details.metrics?.worked_days?.toString() || "0");
  
  // Override States
  const [techCashless, setTechCashless] = useState(stmt.adjustments?.tech_cashless_sales_override?.toString() || "");
  const [retailCashless, setRetailCashless] = useState(stmt.adjustments?.retail_cashless_sales_override?.toString() || "");
  const [transportFee, setTransportFee] = useState(stmt.adjustments?.transport_fee_override?.toString() || "");
  
  // Deduction States
  const [health, setHealth] = useState(stmt.adjustments?.health_insurance_override?.toString() || "");
  const [pension, setPension] = useState(stmt.adjustments?.pension_override?.toString() || "");
  const [employment, setEmployment] = useState(stmt.adjustments?.employment_insurance_override?.toString() || "");
  const [incomeTax, setIncomeTax] = useState(stmt.adjustments?.income_tax_override?.toString() || "");
  const [residentTax, setResidentTax] = useState(stmt.adjustments?.resident_tax_override?.toString() || "");
  
  // Custom Adjustments
  const [customAdjusts, setCustomAdjusts] = useState<{name: string, amount: number}[]>(stmt.adjustments?.custom_adjustments || []);

  const addCustomAdjust = () => setCustomAdjusts([...customAdjusts, { name: "", amount: 0 }]);
  const removeCustomAdjust = (i: number) => setCustomAdjusts(customAdjusts.filter((_, idx) => idx !== i));
  const updateCustomAdjust = (i: number, field: 'name' | 'amount', val: any) => {
    const next = [...customAdjusts];
    next[i] = { ...next[i], [field]: val };
    setCustomAdjusts(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const adjustments = {
        tech_cashless_sales_override: techCashless ? parseFloat(techCashless) : undefined,
        retail_cashless_sales_override: retailCashless ? parseFloat(retailCashless) : undefined,
        transport_fee_override: transportFee ? parseInt(transportFee) : undefined,
        health_insurance_override: health ? parseInt(health) : undefined,
        pension_override: pension ? parseInt(pension) : undefined,
        employment_insurance_override: employment ? parseInt(employment) : undefined,
        income_tax_override: incomeTax ? parseInt(incomeTax) : undefined,
        resident_tax_override: residentTax ? parseInt(residentTax) : undefined,
        custom_adjustments: customAdjusts.filter(a => a.name && a.amount !== 0)
      };

      const res = await updateStatementMetrics(stmt.id, {
        worked_hours: parseFloat(hours),
        worked_days: parseInt(days),
        adjustments
      });
      
      if (res.success) {
        setIsOpen(false);
        onUpdate();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("更新中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
          <Edit3 size={14} />
          <span className="sr-only">詳細編集</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Wallet size={20} className="text-blue-600" />
            明細の詳細編集 <span className="text-sm font-normal text-slate-400">({stmt.staff_name})</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="attendance" className="font-bold">勤怠・売上</TabsTrigger>
              <TabsTrigger value="deductions" className="font-bold">控除・税金</TabsTrigger>
              <TabsTrigger value="adjustments" className="font-bold">その他調整</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Calendar size={12} />
                    出勤日数
                  </label>
                  <div className="relative">
                    <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none font-bold" />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">日</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Clock size={12} />
                    労働時間
                  </label>
                  <div className="relative">
                    <input type="number" step="0.1" value={hours} onChange={e => setHours(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none font-bold" />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">時間</span>
                  </div>
                </div>
              </div>

              {stmt.type === "reward" && (
                <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingDown size={14} className="text-rose-500" />
                    売上手動補正（キャッシュレス分）
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">技術キャッシュレス (¥)</label>
                      <input type="number" value={techCashless} onChange={e => setTechCashless(e.target.value)} placeholder={stmt.details.metrics.cashless_sales_total.toString()} className="w-full h-9 px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500/10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">店販キャッシュレス (¥)</label>
                      <input type="number" value={retailCashless} onChange={e => setRetailCashless(e.target.value)} placeholder="0" className="w-full h-9 px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500/10 text-sm" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">※ 入力がない場合は自動計算された値が使用されます</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deductions" className="space-y-6">
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-4">
                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} />
                  法定控除・税金の上書き
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">健康保険 (¥)</label>
                    <input type="number" value={health} onChange={e => setHealth(e.target.value)} placeholder={stmt.details.social_insurance?.health.toString() || "0"} className="w-full h-9 px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-rose-500/10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">厚生年金 (¥)</label>
                    <input type="number" value={pension} onChange={e => setPension(e.target.value)} placeholder={stmt.details.social_insurance?.pension.toString() || "0"} className="w-full h-9 px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-rose-500/10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">雇用保険 (¥)</label>
                    <input type="number" value={employment} onChange={e => setEmployment(e.target.value)} placeholder={stmt.details.social_insurance?.employment.toString() || "0"} className="w-full h-9 px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-rose-500/10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">所得税 (¥)</label>
                    <input type="number" value={incomeTax} onChange={e => setIncomeTax(e.target.value)} placeholder={stmt.details.social_insurance?.income_tax.toString() || "0"} className="w-full h-9 px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-rose-500/10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">住民税 (¥)</label>
                    <input type="number" value={residentTax} onChange={e => setResidentTax(e.target.value)} placeholder={stmt.details.social_insurance?.resident_tax.toString() || "0"} className="w-full h-9 px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-rose-500/10 text-sm" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">交通費の上書き (¥)</label>
                <input type="number" value={transportFee} onChange={e => setTransportFee(e.target.value)} placeholder={stmt.details.transport_fee.toString()} className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    個別調整項目
                  </h4>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomAdjust} className="h-7 text-[10px] font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-2">
                    <Plus size={12} className="mr-1" />
                    項目を追加
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {customAdjusts.map((adj, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" placeholder="項目名 (例: 掃除手当)" value={adj.name} onChange={e => updateCustomAdjust(idx, 'name', e.target.value)} className="flex-1 h-9 px-3 border border-slate-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-blue-500/10" />
                      <div className="relative w-28">
                        <input type="number" placeholder="金額" value={adj.amount} onChange={e => updateCustomAdjust(idx, 'amount', parseInt(e.target.value))} className="w-full h-9 px-3 border border-slate-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-blue-500/10 pr-6" />
                        <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">¥</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomAdjust(idx)} className="h-9 w-9 text-slate-300 hover:text-rose-500">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 mt-auto">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] gap-2 font-bold shadow-lg shadow-blue-900/20">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? "保存中..." : "明細を更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
