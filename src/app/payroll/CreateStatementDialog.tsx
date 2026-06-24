"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calculator, Calendar, User, ShieldAlert, BadgeCheck, Clock } from "lucide-react";
import { createManualStatement, getStaffPayrollDefaultValues } from "./actions";
import { toast } from "sonner";
import { calculatePayrollTaxes } from "@/lib/tax-calculator";
import { useAuth } from "@/lib/auth-context";

type StaffProfileSimple = {
  id: string;
  name: string;
};

export default function CreateStatementDialog({ 
  staffList,
  defaultYear,
  defaultMonth,
  initialStaffId,
  triggerBtn,
  onSuccess 
}: { 
  staffList: StaffProfileSimple[];
  defaultYear: number;
  defaultMonth: number;
  initialStaffId?: string;
  triggerBtn?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [staffId, setStaffId] = useState(initialStaffId || "");
  const [targetYear, setTargetYear] = useState(defaultYear.toString());
  const [targetMonth, setTargetMonth] = useState(String(defaultMonth).padStart(2, "0"));
  const [type, setType] = useState<"salary" | "reward">("salary");

  // Money State
  const [baseAmount, setBaseAmount] = useState("");
  const [transportAllowance, setTransportAllowance] = useState("");
  const [nominationAllowance, setNominationAllowance] = useState("");
  const [reviewAllowance, setReviewAllowance] = useState("");
  const [blogAllowance, setBlogAllowance] = useState("");
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
  const [hourlyWage, setHourlyWage] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [note, setNote] = useState("");

  const { availableStores } = useAuth();
  const [storeSales, setStoreSales] = useState<Record<string, {
    techSales: string;
    techCashless: string;
    productSales: string;
    productCashless: string;
  }>>({});

  const [contractType, setContractType] = useState<string>("");
  const [contractData, setContractData] = useState<any>(null);

  // Reward Assistant State
  const [techSales, setTechSales] = useState("");
  const [productSales, setProductSales] = useState("");
  const [techCashless, setTechCashless] = useState("");
  const [productCashless, setProductCashless] = useState("");
  const [techCommission, setTechCommission] = useState(0);
  const [productCommission, setProductCommission] = useState(0);

  const updateStoreSales = (storeName: string, field: string, value: string) => {
    const current = storeSales[storeName] || {
      techSales: "",
      techCashless: "",
      productSales: "",
      productCashless: ""
    };
    const updatedStoreData = {
      ...current,
      [field]: value
    };
    const updated = {
      ...storeSales,
      [storeName]: updatedStoreData
    };
    setStoreSales(updated);

    // Calculate totals
    let totalTech = 0;
    let totalTechCashless = 0;
    let totalProd = 0;
    let totalProdCashless = 0;

    const stores = availableStores;
    stores.forEach(s => {
      const data = updated[s] || { techSales: "", techCashless: "", productSales: "", productCashless: "" };
      totalTech += Number(data.techSales) || 0;
      totalTechCashless += Number(data.techCashless) || 0;
      totalProd += Number(data.productSales) || 0;
      totalProdCashless += Number(data.productCashless) || 0;
    });

    setTechSales(totalTech > 0 ? totalTech.toString() : "");
    setTechCashless(totalTechCashless > 0 ? totalTechCashless.toString() : "");
    setProductSales(totalProd > 0 ? totalProd.toString() : "");
    setProductCashless(totalProdCashless > 0 ? totalProdCashless.toString() : "");

    recalculateReward(
      totalTech > 0 ? totalTech.toString() : "",
      totalProd > 0 ? totalProd.toString() : "",
      totalTechCashless > 0 ? totalTechCashless.toString() : "",
      totalProdCashless > 0 ? totalProdCashless.toString() : ""
    );
  };

  // Contract Warning Banner State
  const [contractWarning, setContractWarning] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setContractType("");
      setStaffId("");
      setBaseAmount("");
      setTransportAllowance("");
      setNominationAllowance("");
      setReviewAllowance("");
      setBlogAllowance("");
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
      setHourlyWage("");
      setWorkLocation("");
      setNote("");
      setContractWarning(null);
      setContractData(null);
      setTechSales("");
      setProductSales("");
      setTechCashless("");
      setProductCashless("");
      setStoreSales({});
      setTechCommission(0);
      setProductCommission(0);
    } else if (initialStaffId) {
      setStaffId(initialStaffId);
    }
  };

  // Load defaults when staff, year, or month changes (only when dialog is open)
  useEffect(() => {
    if (!isOpen || !staffId) {
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
          // @ts-ignore
          setContractType(d.contract_type || "");
          setContractData(d.contract || null);
          setBaseAmount(d.base_amount.toString());
          setTransportAllowance((d.transportAllowance || 0).toString());
          setNominationAllowance((d.nominationAllowance || 0).toString());
          setReviewAllowance((d.reviewAllowance || 0).toString());
          setBlogAllowance((d.blogAllowance || 0).toString());
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
          setHourlyWage(d.hourly_wage ? d.hourly_wage.toString() : "0");
          setWorkLocation(d.work_location || "");

          // Prefill store-by-store sales
          if (d.storeSalesBreakdown) {
            const formatted: any = {};
            Object.entries(d.storeSalesBreakdown).forEach(([store, sVal]: [string, any]) => {
              formatted[store] = {
                techSales: sVal.techSales > 0 ? sVal.techSales.toString() : "",
                techCashless: sVal.techCashless > 0 ? sVal.techCashless.toString() : "",
                productSales: sVal.productSales > 0 ? sVal.productSales.toString() : "",
                productCashless: sVal.productCashless > 0 ? sVal.productCashless.toString() : ""
              };
            });
            setStoreSales(formatted);

            let totalTech = 0;
            let totalTechCashless = 0;
            let totalProd = 0;
            let totalProdCashless = 0;
            Object.values(d.storeSalesBreakdown).forEach((sVal: any) => {
              totalTech += sVal.techSales || 0;
              totalTechCashless += sVal.techCashless || 0;
              totalProd += sVal.productSales || 0;
              totalProdCashless += sVal.productCashless || 0;
            });
            setTechSales(totalTech > 0 ? totalTech.toString() : "");
            setTechCashless(totalTechCashless > 0 ? totalTechCashless.toString() : "");
            setProductSales(totalProd > 0 ? totalProd.toString() : "");
            setProductCashless(totalProdCashless > 0 ? totalProdCashless.toString() : "");
          } else {
            setStoreSales({});
            setTechSales("");
            setProductSales("");
            setTechCashless("");
            setProductCashless("");
          }

          toast.success("スタッフの当月実績と契約データから初期値を自動入力しました（編集可能です）");
        } else if (res.error) {
          // Gracefully reset forms so they can key in manually from scratch
          setContractType("");
          setBaseAmount("");
          setTransportAllowance("");
          setNominationAllowance("");
          setReviewAllowance("");
          setBlogAllowance("");
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
          setHourlyWage("");
          setWorkLocation("");
          setNote("");
          setContractData(null);
          setContractWarning("該当スタッフの契約情報が登録されていません。");
        }
      } catch (err) {
        console.error("Error loading defaults:", err);
      }
    }
    
    loadDefaults();
  }, [isOpen, staffId, targetYear, targetMonth]);

  // Dynamic client-side tax auto-calculation
  useEffect(() => {
    if (type !== "salary") {
      // Clear deductions for outsourcing/reward types
      setHealth("0");
      setPension("0");
      setEmployment("0");
      setIncomeTax("0");
      setChildcare("0");
      return;
    }

    const baseVal = Number(baseAmount) || 0;
    const transportVal = Number(transportAllowance) || 0;
    const fixedAllowances = (contractType === "monthly" || contractType === "tier_monthly")
      ? ((contractData?.business_allowance || 0) + (contractData?.attendance_allowance || 0))
      : 0;

    const otherAllowances = (Number(nominationAllowance) || 0) + 
                            (Number(reviewAllowance) || 0) + 
                            (Number(blogAllowance) || 0) + 
                            (Number(executiveAllowance) || 0) + 
                            fixedAllowances;

    if (baseVal <= 0) return; // Don't calculate if no base pay is set yet

    const taxes = calculatePayrollTaxes({
      baseSalary: baseVal,
      allowances: otherAllowances,
      transportFee: transportVal,
      dependentsCount: 0
    });

    setHealth(taxes.healthInsurance.toString());
    setPension(taxes.pension.toString());
    setEmployment(taxes.employmentInsurance.toString());
    setIncomeTax(taxes.incomeTax.toString());
    setChildcare(taxes.childcareSupport ? taxes.childcareSupport.toString() : "0");
  }, [baseAmount, transportAllowance, nominationAllowance, reviewAllowance, blogAllowance, executiveAllowance, type]);

  // Calculations
  const numBase = Number(baseAmount) || 0;
  const numTransport = Number(transportAllowance) || 0;
  const numNomination = Number(nominationAllowance) || 0;
  const numReview = Number(reviewAllowance) || 0;
  const numBlog = Number(blogAllowance) || 0;
  const numExecutive = Number(executiveAllowance) || 0;
  const fixedAllowances = (contractType === "monthly" || contractType === "tier_monthly")
    ? ((contractData?.business_allowance || 0) + (contractData?.attendance_allowance || 0))
    : 0;
  const numAllowance = numTransport + numNomination + numReview + numBlog + numExecutive + fixedAllowances;

  const numTaxAdd = Number(taxAddition) || 0;

  const numHealth = type === "salary" ? (Number(health) || 0) : 0;
  const numPension = type === "salary" ? (Number(pension) || 0) : 0;
  const numEmployment = type === "salary" ? (Number(employment) || 0) : 0;
  const numIncomeTax = type === "salary" ? (Number(incomeTax) || 0) : 0;
  const numResidentTax = type === "salary" ? (Number(residentTax) || 0) : 0;
  const numChildcare = type === "salary" ? (Number(childcare) || 0) : 0;

  const totalDeductions = numHealth + numPension + numEmployment + numIncomeTax + numResidentTax + numChildcare;
  const finalPaidAmount = numBase + numAllowance + numTaxAdd - totalDeductions;

  const handleHourlyWageChange = (val: string) => {
    setHourlyWage(val);
    const wage = Number(val) || 0;
    const hours = Number(workedHours) || 0;
    setBaseAmount(Math.floor(wage * hours).toString());
  };

  const handleWorkedHoursChange = (val: string) => {
    setWorkedHours(val);
    const wage = Number(hourlyWage) || 0;
    const hours = Number(val) || 0;
    setBaseAmount(Math.floor(wage * hours).toString());
  };

  const recalculateReward = (ts: string, ps: string, tc: string, pc: string) => {
    if (!contractData) return;
    const techSalesNum = Number(ts) || 0;
    const prodSalesNum = Number(ps) || 0;
    const techCashlessNum = Number(tc) || 0;
    const prodCashlessNum = Number(pc) || 0;

    const techRatio = contractData.tech_sales_ratio || 0;
    const prodRatio = contractData.product_sales_ratio || 0;
    const cashlessRatio = contractData.deduction_cashless_ratio || 0;

    const techTax = Math.floor(techSalesNum * 0.1);
    const techCashlessFee = cashlessRatio > 0 ? Math.floor(techCashlessNum * (cashlessRatio / 100)) : 0;
    const commTech = Math.max(0, techSalesNum - techTax - techCashlessFee);
    const baseTech = Math.floor(commTech * (techRatio / 100));

    const prodTax = Math.floor(prodSalesNum * 0.1);
    const prodCashlessFee = cashlessRatio > 0 ? Math.floor(prodCashlessNum * (cashlessRatio / 100)) : 0;
    const commProd = Math.max(0, prodSalesNum - prodTax - prodCashlessFee);
    const baseProd = Math.floor(commProd * (prodRatio / 100));

    setTechCommission(baseTech);
    setProductCommission(baseProd);
    setBaseAmount((baseTech + baseProd).toString());
  };

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
        note: note,
        details: {
          base_tech_salary: type === "reward" ? techCommission : 0,
          base_product_salary: type === "reward" ? productCommission : 0,
          nomination_reward: numNomination,
          transport_fee: numTransport,
          review_allowance: numReview,
          blog_allowance: numBlog,
          executive_allowance: numExecutive,
          cashless_deduction: 0,
          tax_addition: numTaxAdd,
          hourly_wage: Number(hourlyWage) || 0,
          social_insurance: type === "salary" ? {
            health: numHealth,
            pension: numPension,
            employment: numEmployment,
            income_tax: numIncomeTax,
            resident_tax: numResidentTax,
            childcare: numChildcare
          } : undefined,
          metrics: {
            total_tech_sales: Number(techSales) || 0,
            total_product_sales: Number(productSales) || 0,
            nomination_count: 0,
            cashless_sales_total: (Number(techCashless) || 0) + (Number(productCashless) || 0),
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
        setBlogAllowance("");
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
        setNote("");
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
        {triggerBtn || (
          <Button className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold h-10 shadow-md shadow-rose-200">
            <Plus size={16} />
            <span>明細を新規作成</span>
          </Button>
        )}
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

          {/* 時給計算アシスタント */}
          {type === "salary" && contractType !== "monthly" && contractType !== "tier_monthly" && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-blue-100/60 pb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                  時給計算アシスタント（パート・時給制スタッフ用）
                </h4>
                <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Hourly Auto-Calc
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">時給 (円)</label>
                  <Input 
                    type="number" 
                    value={hourlyWage} 
                    onChange={(e) => handleHourlyWageChange(e.target.value)}
                    placeholder="例: 1000"
                    className="h-9 text-xs rounded-lg font-bold border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">労働時間 (時間)</label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={workedHours} 
                    onChange={(e) => handleWorkedHoursChange(e.target.value)}
                    placeholder="例: 80.5"
                    className="h-9 text-xs rounded-lg font-bold border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">自動計算された基本給 (円)</label>
                  <div className="h-9 flex items-center justify-start px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-700 tabular-nums">
                    ¥{Math.floor((Number(hourlyWage) || 0) * (Number(workedHours) || 0)).toLocaleString()}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold italic">
                ※ 時給または労働時間を入力すると、下の「基本給 / 歩合報酬ベース」が自動的に連動して更新されます。
              </p>
            </div>
          )}

          {/* 業務委託 計算アシスタント */}
          {type === "reward" && contractData && (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100/60 pb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-600 animate-pulse" />
                  業務委託・歩合計算アシスタント（店舗別入力）
                </h4>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Commission Auto-Calc
                </span>
              </div>
              
              <div className="space-y-3">
                {availableStores.map(store => {
                  const data = storeSales[store] || { techSales: "", techCashless: "", productSales: "", productCashless: "" };
                  return (
                    <div key={store} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm space-y-2">
                      <div className="text-[11px] font-black text-slate-700 border-b border-slate-50 pb-1 flex items-center gap-1">
                        <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
                        {store}店
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 block">技術売上 (総額)</label>
                          <Input 
                            type="number" 
                            value={data.techSales} 
                            onChange={(e) => updateStoreSales(store, "techSales", e.target.value)} 
                            className="h-8 text-xs rounded font-bold border-slate-200" 
                            placeholder="例: 100000" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 block">うちキャッシュレス</label>
                          <Input 
                            type="number" 
                            value={data.techCashless} 
                            onChange={(e) => updateStoreSales(store, "techCashless", e.target.value)} 
                            className="h-8 text-xs rounded font-bold border-slate-200" 
                            placeholder="0" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 block">商品売上 (総額)</label>
                          <Input 
                            type="number" 
                            value={data.productSales} 
                            onChange={(e) => updateStoreSales(store, "productSales", e.target.value)} 
                            className="h-8 text-xs rounded font-bold border-slate-200" 
                            placeholder="例: 5000" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 block">うちキャッシュレス</label>
                          <Input 
                            type="number" 
                            value={data.productCashless} 
                            onChange={(e) => updateStoreSales(store, "productCashless", e.target.value)} 
                            className="h-8 text-xs rounded font-bold border-slate-200" 
                            placeholder="0" 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 合計表示 */}
              <div className="bg-slate-900 text-white p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between text-xs font-bold shadow-sm gap-2">
                <div>合計売上（自動集計結果）:</div>
                <div className="flex flex-wrap gap-4 text-slate-300">
                  <span>技術: <strong className="text-emerald-400">¥{(Number(techSales) || 0).toLocaleString()}</strong> (内キャッシュレス: ¥{(Number(techCashless) || 0).toLocaleString()})</span>
                  <span>商品: <strong className="text-emerald-400">¥{(Number(productSales) || 0).toLocaleString()}</strong> (内キャッシュレス: ¥{(Number(productCashless) || 0).toLocaleString()})</span>
                </div>
              </div>

              {type === "reward" && contractData && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between text-xs font-bold shadow-sm border border-emerald-100 mt-2">
                  <div>自動計算の歩合詳細:</div>
                  <div className="flex flex-wrap gap-4">
                    <span>技術歩合: <strong>¥{techCommission.toLocaleString()}</strong> ({contractData.tech_sales_ratio || 0}%)</span>
                    <span>商品売上手当: <strong>¥{productCommission.toLocaleString()}</strong> ({contractData.product_sales_ratio || 0}%)</span>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 font-semibold italic mt-2">
                ※ 各店舗の売上を入力すると、自動的に合算され、契約情報（技術歩合 {contractData.tech_sales_ratio}% / 商品歩合 {contractData.product_sales_ratio}% / 手数料 {contractData.deduction_cashless_ratio}%）に基づき「歩合報酬ベース」が自動計算されます。
              </p>
            </div>
          )}

          {/* Earnings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 border-b pb-1.5 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-3.5 bg-rose-500 rounded-sm"></span> 支給・支払額の入力
              </div>
              <div className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-black border border-rose-100 flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                <span>総支給額 (基本給 + 手当):</span>
                <span className="text-sm font-black text-rose-800">¥{((Number(baseAmount) || 0) + (Number(transportAllowance) || 0) + (Number(nominationAllowance) || 0) + (Number(reviewAllowance) || 0) + (Number(blogAllowance) || 0) + (Number(executiveAllowance) || 0)).toLocaleString()}</span>
              </div>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">
                  {type === "reward" 
                    ? "技術歩合報酬ベース (円)" 
                    : (contractType === "monthly" || contractType === "tier_monthly") 
                      ? "基本給 (円)" 
                      : "基本給 (時給ベース) (円)"}
                </label>
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
                <label className="text-[10px] font-bold text-slate-500 block mb-1">手当の内訳 (円)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">通勤手当</span>
                    <Input 
                      type="number" 
                      placeholder="通勤手当"
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
                    <span className="text-[9px] text-slate-400 font-bold block">口コミ手当</span>
                    <Input 
                      type="number" 
                      placeholder="口コミ"
                      value={reviewAllowance} 
                      onChange={(e) => setReviewAllowance(e.target.value)}
                      className="h-8 text-xs rounded font-bold border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">ブログ手当</span>
                    <Input 
                      type="number" 
                      placeholder="ブログ手当"
                      value={blogAllowance} 
                      onChange={(e) => setBlogAllowance(e.target.value)}
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

          {/* Memo / Notes */}
          <div className="space-y-3 animate-in slide-in-from-top-3 duration-200">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1 border-b pb-1.5">
              <span className="w-1.5 h-3.5 bg-slate-500 rounded-sm"></span> 自由記載メモ (明細書下部に表示)
            </h3>
            <div className="space-y-1">
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-20 text-xs rounded-lg p-3 font-medium border border-slate-200 resize-none"
                placeholder="特記事項や計算の補足などがあれば入力してください..."
              />
            </div>
          </div>

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
