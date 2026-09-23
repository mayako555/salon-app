"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateContractorCommission,
  contractorCommissionTotal,
  type ContractorCommissionLineDraft,
  type ContractorCommissionMethod,
} from "@/lib/contractor-commission";
import { Plus, Trash2 } from "lucide-react";

type MenuRate = { menu_name: string; ratio: number };

export default function ContractorCommissionLines({
  enabled,
  onEnabledChange,
  lines,
  onChange,
  defaultRate,
  menuSpecificRates,
  initialCalculationBase,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  lines: ContractorCommissionLineDraft[];
  onChange: (lines: ContractorCommissionLineDraft[]) => void;
  defaultRate: number;
  menuSpecificRates: MenuRate[];
  initialCalculationBase: number;
}) {
  const addLine = (method: ContractorCommissionMethod = "default", menuRate?: MenuRate) => {
    onChange([
      ...lines,
      {
        id: `commission-${Date.now()}-${lines.length}`,
        method,
        label: menuRate?.menu_name || (method === "custom" ? "任意歩合" : "通常技術"),
        calculationBase: lines.length === 0 ? String(initialCalculationBase || 0) : "0",
        rate: String(menuRate?.ratio ?? defaultRate ?? 0),
      },
    ]);
  };

  const toggle = (checked: boolean) => {
    if (checked && lines.length === 0) addLine();
    onEnabledChange(checked);
  };

  const updateLine = (id: string, patch: Partial<ContractorCommissionLineDraft>) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const chooseMethod = (id: string, value: string) => {
    if (value === "default") {
      updateLine(id, { method: "default", label: "通常技術", rate: String(defaultRate || 0) });
      return;
    }
    if (value === "custom") {
      updateLine(id, { method: "custom", label: "任意歩合" });
      return;
    }
    const menuIndex = Number(value.replace("menu-", ""));
    const menuRate = menuSpecificRates[menuIndex];
    if (menuRate) updateLine(id, { method: "menu_specific", label: menuRate.menu_name, rate: String(menuRate.ratio) });
  };

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
      <label className="flex cursor-pointer items-center gap-2 font-bold text-amber-900">
        <Checkbox checked={enabled} onCheckedChange={(value) => toggle(value === true)} />
        計算方法が異なる売上を分けて計算する
      </label>
      <p className="mt-1 text-[10px] leading-relaxed text-amber-700">
        例：通常施術50%・メイクレッスン60%。各行の「歩合対象額」は重複しない金額を入力してください。
      </p>

      {enabled && (
        <div className="mt-3 space-y-2">
          {lines.map((line) => (
            <div key={line.id} className="grid gap-2 rounded-lg border border-amber-200 bg-white p-2 md:grid-cols-[1.4fr_1fr_0.65fr_1fr_auto] md:items-end">
              <div>
                <label className="mb-1 block text-[9px] font-bold text-slate-500">計算方法</label>
                <Select value={line.method === "menu_specific" ? `menu-${Math.max(0, menuSpecificRates.findIndex((rate) => rate.menu_name === line.label))}` : line.method} onValueChange={(value) => chooseMethod(line.id, value)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">通常技術（{defaultRate}%）</SelectItem>
                    {menuSpecificRates.map((rate, index) => (
                      <SelectItem key={`${rate.menu_name}-${index}`} value={`menu-${index}`}>{rate.menu_name}（{rate.ratio}%）</SelectItem>
                    ))}
                    <SelectItem value="custom">任意の計算</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold text-slate-500">区分名</label>
                <Input className="h-9 text-xs" value={line.label} onChange={(e) => updateLine(line.id, { label: e.target.value, method: "custom" })} />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold text-slate-500">歩合率</label>
                <Input className="h-9 text-xs" type="number" min="0" max="100" value={line.rate} onChange={(e) => updateLine(line.id, { rate: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold text-slate-500">歩合対象額</label>
                <Input className="h-9 text-xs" type="number" min="0" value={line.calculationBase} onChange={(e) => updateLine(line.id, { calculationBase: e.target.value })} />
                <p className="mt-1 text-right font-bold text-emerald-700">報酬 ¥{calculateContractorCommission(Number(line.calculationBase), Number(line.rate)).toLocaleString()}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={() => onChange(lines.filter((item) => item.id !== line.id))} aria-label={`${line.label}を削除`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addLine("custom")}><Plus className="mr-1 h-3.5 w-3.5" />計算行を追加</Button>
            <strong className="text-sm text-amber-900">技術歩合合計 ¥{contractorCommissionTotal(lines).toLocaleString()}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
