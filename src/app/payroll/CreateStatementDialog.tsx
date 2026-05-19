"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calculator, Calendar, User, ShieldAlert, BadgeCheck } from "lucide-react";
import { createManualStatement, getStaffPayrollDefaultValues } from "./actions";
import { toast } from "sonner";

type StaffProfileSimple = {
  id: string;
  name: string;
};

export default function CreateStatementDialog({ 
  staffList,
  defaultYear,
  defaultMonth,
  onSuccess 
}: { 
  staffList: StaffProfileSimple[];
  defaultYear: number;
  defaultMonth: number;
  onSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [staffId, setStaffId] = useState("");
  const [targetYear, setTargetYear] = useState(defaultYear.toString());
  const [targetMonth, setTargetMonth] = useState(String(defaultMonth).padStart(2, "0"));
  const [type, setType] = useState<"salary" | "reward">("salary");

  // Money State
  const [baseAmount, setBaseAmount] = useState("");
  const [transportAllowance, setTransportAllowance] = useState("");
  const [nominationAllowance, setNominationAllowance] = useState("");
  const [reviewAllowance, setReviewAllowance] = useState("");
  const [executiveAllowance, setExecutiveAllowance] = useState("");
  const [taxAddition, setTaxAddition] = useState("");

  // Deductions State (Salary only)
  const [health, setHealth] = useState("");
  const [pension, setPension] = useState("");
  const [employment, setEmployment] = useState("");
  const [incomeTax, setIncomeTax] = useState("");
  const [residentTax, setResidentTax] = useState("");
  const [childcare, setChildcare] = useState("");

  // Metrics State
  const [workedDays, setWorkedDays] = useState("");
  const [workedHours, setWorkedHours] = useState("");
  const [workLocation, setWorkLocation] = useState("");

  // Contract Warning Banner State
  const [contractWarning, setContractWarning] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setStaffId("");
      setBaseAmount("");
      setTransportAllowance("");
      setNominationAllowance("");
      setReviewAllowance("");
      setExecutiveAllowance("");
      setTaxAddition("");
      setHealth("");
      setPension("");
      setEmployment("");
      setIncomeTax("");
      setResidentTax("");
      setChildcare("");
      setWorkedDays("");
      setWorkedHours("");
      setWorkLocation("");
      setContractWarning(null);
    }
  };

  // Load defaults when staff, year, or month changes
  useEffect(() => {
    if (!staffId) {
      setContractWarning(null);
      return;
    }
    
    async function loadDefaults() {
      const year = Number(targetYear);
      const month = Number(targetMonth);
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return;
      
      try {
        setContractWarning(null);
        const res = await getStaffPayrollDefaultValues(staffId, year, month);
        if (res.success && res.data) {
          const d = res.data;
          setType(d.type);
          setBaseAmount(d.base_amount.toString());
          setTransportAllowance((d.transportAllowance || 0).toString());
          setNominationAllowance((d.nominationAllowance || 0).toString());
          setReviewAllowance((d.reviewAllowance || 0).toString());
          setExecutiveAllowance((d.executiveAllowance || 0).toString());
          setTaxAddition(d.taxAddition.toString());
          
          setHealth(d.health.toString());
          setPension(d.pension.toString());
          setEmployment(d.employment.toString());
          setIncomeTax(d.incomeTax.toString());
          setResidentTax(d.residentTax.toString());
          setChildcare(d.childcare ? d.childcare.toString() : "0");
          
          setWorkedDays(d.workedDays.toString());
          setWorkedHours(d.workedHours.toString());
          setWorkLocation(d.work_location || "");
          toast.success("スタッフの当月実績と契約データから初期値を自動入力しました（編集可能です）");
        } else if (res.error) {
          // Gracefully reset forms so they can key in manually from scratch
          setBaseAmount("");
          setTransportAllowance("");
          setNominationAllowance("");
          setReviewAllowance("");
          setExecutiveAllowance("");
          setTaxAddition("");
          setHealth("");
          setPension("");
          setEmployment("");
          setIncomeTax("");
          setResidentTax("");
          setChildcare("");
          setWorkedDays("");
          setWorkedHours("");
          setWorkLocation("");
          setContractWarning("該当スタッフの契約情報が登録されていません。");
        }
      } catch (err) {
        console.error("Error loading defaults:", err);
      }
    }
    
    loadDefaults();
  }, [staffId, targetYear, targetMonth]);

  // Calculations
  const numBase = Number(baseAmount) || 0;
  const numTransport = Number(transportAllowance) || 0;
  const numNomination = Number(nominationAllowance) || 0;
  const numReview = Number(reviewAllowance) || 0;
  const numExecutive = Number(executiveAllowance) || 0;
  const numAllowance = numTransport + numNomination + numReview + numExecutive;

  const numTaxAdd = Number(taxAddition) || 0;

  const numHealth = type === "salary" ? (Number(health) || 0) : 0;
  const numPension = type === "salary" ? (Number(pension) || 0) : 0;
  const numEmployment = type === "salary" ? (Number(employment) || 0) : 0;
  const numIncomeTax = type === "salary" ? (Number(incomeTax) || 0) : 0;
  const numResidentTax = type === "salary" ? (Number(residentTax) || 0) : 0;
  const numChildcare = type === "salary" ? (Number(childcare) || 0) : 0;

  const totalDeductions = numHealth + numPension + numEmployment + numIncomeTax + numResidentTax + numChildcare;
  const finalPaidAmount = numBase + numAllowance + numTaxAdd - totalDeductions;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) {
      toast.error("スタッフを選択してください");
      return;
    }

    const selectedStaffName = staffList.find(s => s.id === staffId)?.name || "不明";
    const formattedMonth = `${targetYear}-${targetMonth}`;

    setIsSaving(true);
    try {
      const payload = {
        staff_id: staffId,
        staff_name: selectedStaffName,
        target_month: formattedMonth,
        type,
        base_amount: numBase,
        total_allowances: numAllowance,
        total_deductions: totalDeductions,
        final_paid_amount: finalPaidAmount,
        work_location: workLocation,
        details: {
          base_tech_salary: type === "reward" ? numBase : 0,
          base_product_salary: 0,
          nomination_reward: numNomination,
          transport_fee: numTransport,
          review_allowance: numReview,
          executive_allowance: numExecutive,
          cashless_deduction: 0,
          tax_addition: numTaxAdd,
          social_insurance: type === "salary" ? {
            health: numHealth,
            pension: numPension,
            employment: numEmployment,
            income_tax: numIncomeTax,
            resident_tax: numResidentTax,
            childcare: numChildcare
          } : undefined,
          metrics: {
            total_tech_sales: 0,
            total_product_sales: 0,
            nomination_count: 0,
            cashless_sales_total: 0,
            worked_days: Number(workedDays) || undefined,
            worked_hours: Number(workedHours) || undefined
          }
        }
      };

      const res = await createManualStatement(payload);
      if (res.success) {
        toast.success(`${selectedStaffName}様の明細書を新規作成しました！`);
        setIsOpen(false);
        // Reset state
        setStaffId("");
        setBaseAmount("");
        setTransportAllowance("");
        setNominationAllowance("");
        setReviewAllowance("");
        setExecutiveAllowance("");
        setTaxAddition("");
        setHealth("");
        setPension("");
        setEmployment("");
        setIncomeTax("");
        setResidentTax("");
        setChildcare("");
        setWorkedDays("");
        setWorkedHours("");
        setWorkLocation("");
        if (onSuccess) onSuccess();
      } else {
        toast.error(`作成エラー: ${res.error}`);
      }
    } catch (error) {
      toast.error("保存中に予期せぬエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold h-10 shadow-md shadow-rose-200">
          <Plus size={16} />
          <span>明細を新規作成</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Calculator className="text-rose-500 w-5 h-5 animate-pulse" />
            給与・報酬明細の新規作成
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            手動で独自の給与明細や業務委託報酬の明細書を作成・登録します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 mt-4">

          {contractWarning && (
            <div className="bg-amber-50 border border-amber-200/80 text-amber-800 p-4 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-200">
              <ShieldAlert className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-amber-900">⚠️ 契約データ未登録（手動入力モード）</p>
                <p className="text-[11px] font-medium leading-relaxed text-amber-700">
                  {contractWarning} 指名件数や基本給などの当月実績の自動計算は行われませんが、すべての項目を下部に入力して明細書を作成いただけます。
                </p>
              </div>
            </div>
          )}
          
          {/* Target Month & Staff selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                <Calendar size={12} /> 対象月
              </label>
              <div className="flex gap-1.5">
                <Input 
                  type="number" 
                  value={targetYear} 
                  onChange={(e) => setTargetYear(e.target.value)}
                  placeholder="年" 
                  className="h-9 text-xs rounded-lg font-bold"
                  required
                />
                <Input 
                  type="number" 
                  value={targetMonth} 
                  onChange={(e) => setTargetMonth(e.target.value.padStart(2, "0"))}
                  placeholder="月" 
                  className="h-9 text-xs rounded-lg font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                <User size={12} /> 対象スタッフ
              </label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="h-9 text-xs rounded-lg font-bold bg-white border-slate-200">
                  <SelectValue placeholder="スタッフを選択..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="font-medium">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                契約種別
              </label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="h-9 text-xs rounded-lg font-bold bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary" className="font-bold text-blue-700">正社員・パート給与</SelectItem>
                  <SelectItem value="reward" className="font-bold text-emerald-700">業務委託報酬</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Earnings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 border-b pb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-rose-500 rounded-sm"></span> 支給・支払額の入力
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">基本給 / 歩合報酬ベース (円)</label>
                <Input 
                  type="number" 
                  placeholder="例: 280000"
                  value={baseAmount} 
                  onChange={(e) => setBaseAmount(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold border-slate-200 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">出勤場所 / 店舗</label>
                <Input 
                  type="text" 
                  placeholder="例: 六甲・神戸"
                  value={workLocation} 
                  onChange={(e) => setWorkLocation(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold border-slate-200 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">手当の内訳 (円)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">交通費</span>
                    <Input 
                      type="number" 
                      placeholder="交通費"
                      value={transportAllowance} 
                      onChange={(e) => setTransportAllowance(e.target.value)}
                      className="h-8 text-xs rounded font-bold border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">指名手当</span>
                    <Input 
                      type="number" 
                      placeholder="指名手当"
                      value={nominationAllowance} 
                      onChange={(e) => setNominationAllowance(e.target.value)}
                      className="h-8 text-xs rounded font-bold border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">口コミ・ブログ</span>
                    <Input 
                      type="number" 
                      placeholder="口コミ"
                      value={reviewAllowance} 
                      onChange={(e) => setReviewAllowance(e.target.value)}
                      className="h-8 text-xs rounded font-bold border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">役職・その他</span>
                    <Input 
                      type="number" 
                      placeholder="その他"
                      value={executiveAllowance} 
                      onChange={(e) => setExecutiveAllowance(e.target.value)}
                      className="h-8 text-xs rounded font-bold border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {type === "reward" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">消費税加算額 (10%) (円)</label>
                  <Input 
                    type="number" 
                    placeholder="例: 29500"
                    value={taxAddition} 
                    onChange={(e) => setTaxAddition(e.target.value)}
                    className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">出勤実績（任意入力）</label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      placeholder="日数"
                      value={workedDays} 
                      onChange={(e) => setWorkedDays(e.target.value)}
                      className="h-10 text-xs rounded-lg text-center"
                    />
                    <Input 
                      type="number" 
                      placeholder="時間"
                      value={workedHours} 
                      onChange={(e) => setWorkedHours(e.target.value)}
                      className="h-10 text-xs rounded-lg text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social Insurance Deductions (Salary only) */}
          {type === "salary" && (
            <div className="space-y-3 animate-in slide-in-from-top-3 duration-200">
              <h3 className="text-xs font-bold text-slate-700 border-b pb-1.5 flex items-center gap-1">
                <span className="w-1.5 h-3.5 bg-blue-500 rounded-sm"></span> 控除額（健康保険・税金等）の入力
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 block">健康保険料</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={health} 
                    onChange={(e) => setHealth(e.target.value)}
                    className="h-9 text-xs rounded-lg font-medium border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 block">厚生年金保険</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={pension} 
                    onChange={(e) => setPension(e.target.value)}
                    className="h-9 text-xs rounded-lg font-medium border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 block">雇用保険料</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={employment} 
                    onChange={(e) => setEmployment(e.target.value)}
                    className="h-9 text-xs rounded-lg font-medium border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 block">所得税</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={incomeTax} 
                    onChange={(e) => setIncomeTax(e.target.value)}
                    className="h-9 text-xs rounded-lg font-medium border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 block">住民税</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={residentTax} 
                    onChange={(e) => setResidentTax(e.target.value)}
                    className="h-9 text-xs rounded-lg font-medium border-slate-200"
                  />
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 block">子ども・子育て支援金</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={childcare} 
                    onChange={(e) => setChildcare(e.target.value)}
                    className="h-9 text-xs rounded-lg font-medium border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Calculation Output Card */}
          <div className="p-4 rounded-xl border bg-slate-900 text-white space-y-3 shadow-lg shadow-slate-100">
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold border-b border-slate-800 pb-2">
              <span>リアルタイム計算プレビュー</span>
              <span className={`px-2 py-0.5 rounded font-black text-[9px] ${type === "salary" ? "bg-blue-900/60 text-blue-300" : "bg-emerald-950 text-emerald-300"}`}>
                {type === "salary" ? "給与明細" : "業務委託明細"}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-500 text-[10px]">支給ベース額</p>
                <p className="font-black text-sm text-slate-200">¥{numBase.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">手当・加算合計</p>
                <p className="font-black text-sm text-emerald-400">+¥{(numAllowance + numTaxAdd).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">控除額合計</p>
                <p className="font-black text-sm text-rose-400">-¥{totalDeductions.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-sm font-bold text-slate-200">差し引き支給額 (差引支給額)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                ¥{finalPaidAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t pt-4 bg-slate-50 -mx-6 -mb-6 px-6 py-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="h-10 text-xs rounded-lg font-bold border-slate-200"
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="h-10 text-xs rounded-lg font-black bg-rose-600 hover:bg-rose-500 text-white min-w-[120px] shadow-md shadow-rose-200"
            >
              {isSaving ? "明細を作成中..." : "明細を確定・保存"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
