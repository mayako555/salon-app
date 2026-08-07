import { useState } from "react";
import { ProductCommissionRule } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Gift } from "lucide-react";

interface Props {
  rules: ProductCommissionRule[];
  onChange: (rules: ProductCommissionRule[]) => void;
}

export default function ProductCommissionSettingsPanel({ rules, onChange }: Props) {
  const handleAdd = () => {
    onChange([...rules, { keyword: "", salesPrice: 0, baseAmount: 0, commissionRate: 10 }]);
  };

  const handleRemove = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof ProductCommissionRule, value: string | number) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    onChange(newRules);
  };

  return (
    <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white mt-8">
      <CardHeader className="bg-amber-50 border-b border-amber-100">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Gift className="text-amber-500" /> 特別店販手当設定
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              特定の商品が売れた際に、通常歩合とは別に固定の歩合を支給するルールを設定します。
            </CardDescription>
          </div>
          <Button onClick={handleAdd} variant="outline" size="sm" className="bg-white hover:bg-amber-50 text-amber-600 border-amber-200">
            <Plus size={16} className="mr-1" /> 追加
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-medium">
            設定されたルールはありません
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-xs font-bold text-slate-500">対象メニュー/商品名（キーワード）</label>
                  <Input 
                    placeholder="例: リルジュ"
                    value={rule.keyword}
                    onChange={(e) => handleChange(idx, "keyword", e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="w-[150px] space-y-1">
                  <label className="text-xs font-bold text-slate-500">販売価格(除外額)</label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min={0}
                      value={rule.salesPrice || ""}
                      onChange={(e) => handleChange(idx, "salesPrice", parseInt(e.target.value) || 0)}
                      className="bg-white pr-8 text-right font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
                  </div>
                  <p className="text-[10px] text-slate-400">税込 (例: 4840)</p>
                </div>
                <div className="w-[150px] space-y-1">
                  <label className="text-xs font-bold text-slate-500">歩合対象金額</label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min={0}
                      value={rule.baseAmount || ""}
                      onChange={(e) => handleChange(idx, "baseAmount", parseInt(e.target.value) || 0)}
                      className="bg-white pr-8 text-right font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
                  </div>
                  <p className="text-[10px] text-slate-400">税抜 (例: 4300)</p>
                </div>
                <div className="w-[120px] space-y-1">
                  <label className="text-xs font-bold text-slate-500">歩合率</label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min={0}
                      max={100}
                      value={rule.commissionRate || ""}
                      onChange={(e) => handleChange(idx, "commissionRate", parseFloat(e.target.value) || 0)}
                      className="bg-white pr-8 text-right font-bold text-amber-600"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)} className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50">
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
            
            <div className="text-xs text-slate-500 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <strong className="text-blue-600">※計算の仕組みについて</strong><br/>
              ・レジのメニューに「キーワード」が含まれている場合、<strong className="text-slate-700">（歩合対象金額 × 歩合率）</strong>の手当が支給されます。<br/>
              ・基本の店販歩合が二重に計算されないよう、全体の店販売上から「販売価格(除外額)」がマイナスされます。<br/>
              ・例: リルジュ（販売価格 4840円、歩合対象 4300円、歩合率 10%）の場合、手当は 430円 となります。
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
