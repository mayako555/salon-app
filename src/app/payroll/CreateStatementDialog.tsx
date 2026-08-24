"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AllowanceFields, { AllowanceValues } from "./AllowanceFields";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [businessAllowance, setBusinessAllowance] = useState("");
  const [attendanceAllowance, setAttendanceAllowance] = useState("");
  const [separateAllowanceDisplay, setSeparateAllowanceDisplay] = useState(false);
  const [techIncentive, setTechIncentive] = useState("");
  const [productCommission, setProductCommission] = useState("");
  const [taxAddition, setTaxAddition] = useState("");

  // Deductions State (Salary only)
  const [health, setHealth] = useState("");
  const [pension, setPension] = useState("");
  const [employment, setEmployment] = useState("");
  const [incomeTax, setIncomeTax] = useState("");
  const [residentTax, setResidentTax] = useState("");
  const [childcare, setChildcare] = useState("");

  const [alreadyPaidAmount, setAlreadyPaidAmount] = useState("");
  const [advanceDeduction, setAdvanceDeduction] = useState("");

  // Metrics State
  const [workedDays, setWorkedDays] = useState("");
  const [workedHours, setWorkedHours] = useState("");
  const [paidLeaves, setPaidLeaves] = useState("");
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

  const [productSalesItems, setProductSalesItems] = useState<{ name: string, price: number, store: string, commissionBase?: number, commission?: number }[]>([]);

  // Reward Assistant State
  const [techSales, setTechSales] = useState("");
  const [productSales, setProductSales] = useState("");
  const [techCashless, setTechCashless] = useState("");
  const [productCashless, setProductCashless] = useState("");
  const [rewardTechCommission, setRewardTechCommission] = useState(0);
  const [rewardProductCommission, setRewardProductCommission] = useState(0);

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
      setBusinessAllowance("");
      setAttendanceAllowance("");
      setTechIncentive("");
      setProductCommission("");
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
      setRewardTechCommission(0);
      setRewardProductCommission(0);
      setProductSalesItems([]);
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
          setBusinessAllowance((d.businessAllowance || 0).toString());
          setAttendanceAllowance((d.attendanceAllowance || 0).toString());
          setTechIncentive((d.techIncentive || 0).toString());
          setProductCommission((d.productCommission || 0).toString());
          setTaxAddition(d.taxAddition.toString());
          
          setHealth(d.health.toString());
          setPension(d.pension.toString());
          setEmployment(d.employment.toString());
          setIncomeTax(d.incomeTax.toString());
          setResidentTax(d.residentTax.toString());
          setChildcare(d.childcare ? d.childcare.toString() : "0");
          
          setWorkedDays(d.workedDays.toString());
          setWorkedHours(d.workedHours.toString());
          setPaidLeaves((d.paidLeaves || 0).toString());
          setHourlyWage(d.hourly_wage ? d.hourly_wage.toString() : "0");
          setWorkLocation(d.work_location || "");

          setAlreadyPaidAmount("");
          setAdvanceDeduction("");

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
            setProductSalesItems(d.productSalesBreakdownItems || []);
          } else {
            setStoreSales({});
            setTechSales("");
            setProductSales("");
            setTechCashless("");
            setProductCashless("");
            setProductSalesItems([]);
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
          setAlreadyPaidAmount("");
          setAdvanceDeduction("");
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

    // Consumption-tax additions apply to contractor rewards only.
    // Clear any value left behind when switching the form to salary/part-time payroll.
    setTaxAddition("0");

    const baseVal = Number(baseAmount) || 0;
    const transportVal = Number(transportAllowance) || 0;
    const numBusiness = Number(businessAllowance) || 0;
    const numAttendance = Number(attendanceAllowance) || 0;
    const numTechInc = Number(techIncentive) || 0;
    const numProdComm = Number(productCommission) || 0;

    const otherAllowances = (Number(nominationAllowance) || 0) + 
                            (Number(reviewAllowance) || 0) + 
                            (Number(blogAllowance) || 0) + 
                            (Number(executiveAllowance) || 0) + 
                            numBusiness +
                            numAttendance;

    if (baseVal <= 0) return; // Don't calculate if no base pay is set yet

    const taxes = calculatePayrollTaxes({
      baseSalary: baseVal + numTechInc + numProdComm,
      allowances: otherAllowances,
      transportFee: transportVal,
      dependentsCount: 0
    });

    setHealth(taxes.healthInsurance.toString());
    setPension(taxes.pension.toString());
    setEmployment(taxes.employmentInsurance.toString());
    setIncomeTax(taxes.incomeTax.toString());
    setChildcare(taxes.childcareSupport ? taxes.childcareSupport.toString() : "0");
  }, [baseAmount, transportAllowance, nominationAllowance, reviewAllowance, blogAllowance, executiveAllowance, businessAllowance, attendanceAllowance, techIncentive, productCommission, type]);

  // Calculations
  const numBase = Number(baseAmount) || 0;
  const numTransport = Number(transportAllowance) || 0;
  const numNomination = Number(nominationAllowance) || 0;
  const numReview = Number(reviewAllowance) || 0;
  const numBlog = Number(blogAllowance) || 0;
  const numExecutive = Number(executiveAllowance) || 0;
  const numBusiness = Number(businessAllowance) || 0;
  const numAttendance = Number(attendanceAllowance) || 0;
  const numTechInc = Number(techIncentive) || 0;
  const numProdComm = Number(productCommission) || 0;
  const numAllowance = numTransport + numNomination + numReview + numBlog + numExecutive + numBusiness + numAttendance;

  const numTaxAdd = Number(taxAddition) || 0;

  const numHealth = type === "salary" ? (Number(health) || 0) : 0;
  const numPension = type === "salary" ? (Number(pension) || 0) : 0;
  const numEmployment = type === "salary" ? (Number(employment) || 0) : 0;
  const numIncomeTax = type === "salary" ? (Number(incomeTax) || 0) : 0;
  const numResidentTax = type === "salary" ? (Number(residentTax) || 0) : 0;
  const numChildcare = type === "salary" ? (Number(childcare) || 0) : 0;

  const totalDeductions = numHealth + numPension + numEmployment + numIncomeTax + numResidentTax + numChildcare;
  const finalPaidAmount = numBase + numTechInc + numProdComm + numAllowance + numTaxAdd - totalDeductions;

  const numAlreadyPaid = Number(alreadyPaidAmount) || 0;
  const numAdvanceDeduction = Number(advanceDeduction) || 0;
  const transferAmount = finalPaidAmount - numAlreadyPaid - numAdvanceDeduction;

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

    setRewardTechCommission(baseTech);
    setRewardProductCommission(baseProd);
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
        allowance_display_mode: separateAllowanceDisplay ? "separate" as const : "combined" as const,
        status: "draft",
        adjustments: {
          transport_fee_override: numTransport,
          health_insurance_override: numHealth,
          pension_override: numPension,
          employment_insurance_override: numEmployment,
          income_tax_override: numIncomeTax,
          resident_tax_override: numResidentTax,
          childcare_support_override: numChildcare,
          already_paid_amount_override: numAlreadyPaid,
          advance_deduction_override: numAdvanceDeduction,
        },
        details: {
          base_tech_salary: type === "reward" ? rewardTechCommission : numTechInc,
          base_product_salary: type === "reward" ? rewardProductCommission : numProdComm,
          nomination_reward: numNomination,
          transport_fee: numTransport,
          review_allowance: numReview,
          blog_allowance: numBlog,
          executive_allowance: numExecutive,
          business_allowance: numBusiness,
          attendance_allowance: numAttendance,
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
            worked_hours: Number(workedHours) || undefined,
            paid_leaves: Number(paidLeaves) || 0
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
        setBusinessAllowance("");
        setAttendanceAllowance("");
        setTechIncentive("");
        setProductCommission("");
        setTaxAddition("");
        setHealth("");
        setPension("");
        setEmployment("");
        setIncomeTax("");
        setResidentTax("");
        setChildcare("");
        setWorkedDays("");
        setWorkedHours("");
        setPaidLeaves("");
        setWorkLocation("");
        setNote("");
        setAlreadyPaidAmount("");
        setAdvanceDeduction("");
        
        if (typeof window !== "undefined") {
          window.location.reload();
        }
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
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg flex flex-col shadow-sm border border-emerald-100 mt-2 gap-2">
                  <div className="font-bold border-b border-emerald-100 pb-1 flex justify-between items-center text-xs">
                    <span>自動計算の歩合詳細:</span>
                    <span className="text-[10px] text-emerald-600 font-normal">※給与明細の印刷にはこの計算内訳は出力されません</span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-[11px] leading-relaxed">
                    <div>
                      <span className="font-bold">【技術歩合】</span>
                      <span>
                        税抜技術売上 ¥{Math.floor((Number(techSales) || 0) / 1.1).toLocaleString()} から
                        {contractData.deduction_cashless_ratio > 0 ? ` キャッシュレス決済手数料相当額 ¥${(Math.floor((Number(techCashless) || 0) * (contractData.deduction_cashless_ratio / 100))).toLocaleString()} (${contractData.deduction_cashless_ratio}%) を引いた` : "消費税を引いた"}
                        金額の {contractData.tech_sales_ratio || 0}% ➔ <strong className="text-emerald-700">¥{rewardTechCommission.toLocaleString()}</strong>
                      </span>
                    </div>
                    {rewardProductCommission > 0 && (
                      <div>
                        <span className="font-bold">【商品歩合】</span>
                        <span>
                          税抜商品売上 ¥{Math.floor((Number(productSales) || 0) / 1.1).toLocaleString()} から
                          {contractData.deduction_cashless_ratio > 0 ? ` キャッシュレス決済手数料相当額 ¥${(Math.floor((Number(productCashless) || 0) * (contractData.deduction_cashless_ratio / 100))).toLocaleString()} (${contractData.deduction_cashless_ratio}%) を引いた` : "消費税を引いた"}
                          金額の {contractData.product_sales_ratio || 0}% ➔ <strong className="text-emerald-700">¥{rewardProductCommission.toLocaleString()}</strong>
                        </span>
                      </div>
                    )}
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
                <span className="text-sm font-black text-rose-800">¥{(
                  (Number(baseAmount) || 0) + 
                  (Number(techIncentive) || 0) + 
                  (Number(productCommission) || 0) + 
                  (Number(transportAllowance) || 0) + 
                  (Number(nominationAllowance) || 0) + 
                  (Number(reviewAllowance) || 0) + 
                  (Number(blogAllowance) || 0) + 
                  (Number(executiveAllowance) || 0) +
                  (Number(businessAllowance) || 0) +
                  (Number(attendanceAllowance) || 0)
                ).toLocaleString()}</span>
              </div>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
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

                {type === "salary" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 bg-rose-50/30 p-2 rounded-lg border border-rose-100/50">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">技術インセンティブ (円)</span>
                        <Input 
                          type="number" 
                          placeholder="技術インセンティブ"
                          value={techIncentive} 
                          onChange={(e) => setTechIncentive(e.target.value)}
                          className="h-9 text-xs rounded-lg font-bold border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">商品歩合（店販手当） (円)</span>
                        <Input 
                          type="number" 
                          placeholder="商品歩合"
                          value={productCommission} 
                          onChange={(e) => setProductCommission(e.target.value)}
                          className="h-9 text-xs rounded-lg font-bold border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Calculation Details / Walkthrough */}
                    <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-[10px] space-y-2 text-slate-600 font-medium">
                      {/* Tech Incentive Breakdown */}
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-800 flex justify-between border-b pb-0.5 border-slate-200">
                          <span>【技術インセンティブ計算内訳】</span>
                          <span className="text-[9px] text-slate-400 font-normal">税抜売上ベース</span>
                        </div>
                        {contractType === "tier_monthly" ? (
                          <div className="leading-relaxed">
                            <p>・当月総技術売上 (税抜): <strong className="text-slate-700">¥{Math.floor((Number(techSales) || 0) / 1.1).toLocaleString()}</strong> (税込 ¥{(Number(techSales) || 0).toLocaleString()})</p>
                            <p>・当月総商品売上 (税抜): <strong className="text-slate-700">¥{Math.floor((Number(productSales) || 0) / 1.1).toLocaleString()}</strong> (税込 ¥{(Number(productSales) || 0).toLocaleString()})</p>
                            <p>・合計個人売上 (税抜): <strong className="text-rose-700">¥{(Math.floor((Number(techSales) || 0) / 1.1) + Math.floor((Number(productSales) || 0) / 1.1)).toLocaleString()}</strong></p>
                            
                            {(contractData?.tech_sales_threshold || 0) > 0 ? (
                              <div className="mt-1.5 pt-1 border-t border-slate-100 font-bold text-slate-700">
                                <p>・技術売上ノルマ額 (税込): <strong>¥{(contractData.tech_sales_threshold).toLocaleString()}</strong></p>
                                {(Number(techSales) || 0) > (contractData.tech_sales_threshold) ? (
                                  <p className="text-rose-700 mt-0.5">
                                    ※ ノルマ超過分 (¥{((Number(techSales) || 0) - contractData.tech_sales_threshold).toLocaleString()}) 
                                    の {contractData.tech_sales_ratio || 10}% を支給 (算出インセンティブ: ¥{(Number(techIncentive) || 0).toLocaleString()}円)
                                  </p>
                                ) : (
                                  <p className="text-slate-400 font-normal italic mt-0.5">※ 技術売上がノルマ額に達していないため、インセンティブは ¥0 です。</p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-1 font-bold text-slate-700">
                                ※ 40万円以上の売上に対し、5万円ごとに5,000円支給 (算出インセンティブ: ¥{(Number(techIncentive) || 0).toLocaleString()}円)
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="leading-relaxed">
                            <p>・技術売上 (税抜): <strong className="text-slate-700">¥{Math.floor((Number(techSales) || 0) / 1.1).toLocaleString()}</strong> (税込 ¥{(Number(techSales) || 0).toLocaleString()})</p>
                            <p>・売上ノルマ額: <strong className="text-slate-700">¥{(contractData?.tech_sales_quota || 0).toLocaleString()}</strong></p>
                            {Math.floor((Number(techSales) || 0) / 1.1) > (contractData?.tech_sales_quota || 0) ? (
                              <p className="mt-1">
                                ノルマ超過分 (¥{(Math.floor((Number(techSales) || 0) / 1.1) - (contractData?.tech_sales_quota || 0)).toLocaleString()}) 
                                の {contractData?.tech_sales_ratio || 0}% ➔ <strong className="text-rose-700">¥{(Number(techIncentive) || 0).toLocaleString()}</strong>
                              </p>
                            ) : (
                              <p className="mt-0.5 text-slate-400 italic">※技術売上がノルマ額に達していないため、インセンティブは ¥0 です。</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Product Commission Details */}
                      <div className="space-y-1">
                        <details className="group">
                          <summary className="font-extrabold text-slate-800 flex justify-between items-center cursor-pointer border-b pb-0.5 border-slate-200 select-none">
                            <span>【店販売上・商品歩合の内訳】</span>
                            <span className="text-[9px] text-rose-500 font-bold group-open:hidden">▼ クリックして明細を表示</span>
                            <span className="text-[9px] text-slate-400 group-open:inline hidden">▲ 閉じる</span>
                          </summary>
                          <div className="mt-1.5 space-y-2 bg-white p-2.5 rounded border border-slate-100 leading-relaxed text-slate-500">
                            {/* Individual products list */}
                            {productSalesItems.length > 0 ? (
                              <div className="space-y-1 mb-2">
                                <p className="text-[9.5px] font-extrabold text-slate-700 border-b border-slate-100 pb-0.5">商品別売上明細 (10%手当対象):</p>
                                {productSalesItems.map((item, idx) => {
                                  const netPrice = item.commissionBase ?? Math.floor(item.price / 1.1);
                                  const comm = item.commission ?? Math.floor(netPrice * 0.1);
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[9px] border-b border-slate-50 pb-0.5 group/item">
                                      <span className="truncate max-w-[180px] text-slate-600 font-bold">・{item.name} ({item.store})</span>
                                      <div className="flex items-center gap-1.5 tabular-nums">
                                        <span>
                                          ¥{item.price.toLocaleString()} (税抜 ¥{netPrice.toLocaleString()}) ➔ <strong className="text-emerald-700">¥{comm.toLocaleString()}</strong>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`「${item.name}」を除外して商品歩合を再計算しますか？`)) {
                                              const updated = productSalesItems.filter((_, i) => i !== idx);
                                              setProductSalesItems(updated);
                                              // Recalculate total sales and commission
                                              const newTotalSales = updated.reduce((sum, current) => sum + current.price, 0);
                                              const newComm = updated.reduce((sum, current) => {
                                                const base = current.commissionBase ?? Math.floor(current.price / 1.1);
                                                return sum + (current.commission ?? Math.floor(base * 0.1));
                                              }, 0);
                                              
                                              setProductSales(newTotalSales > 0 ? newTotalSales.toString() : "0");
                                              setProductCommission(newComm.toString());
                                            }
                                          }}
                                          className="text-rose-500 hover:text-rose-700 font-bold px-1 hover:bg-rose-50 rounded text-[9px]"
                                          title="除外する"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[9px] text-slate-400 italic mb-2">※ 商品別の売上明細はありません。</p>
                            )}

                            <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                              {availableStores.map(store => {
                                const storeData = storeSales[store];
                                if (!storeData || (!storeData.productSales && !storeData.techSales)) return null;
                                // Calculate filtered store product sales
                                const storeFilteredProd = productSalesItems
                                  .filter(item => item.store === store)
                                  .reduce((sum, item) => sum + item.price, 0);

                                return (
                                  <div key={store} className="flex justify-between items-center text-[9px] text-slate-400">
                                    <span>{store}店 合計:</span>
                                    <span>
                                      技術 ¥{(Number(storeData.techSales) || 0).toLocaleString()} / 
                                      店販 <strong className="text-slate-600">¥{storeFilteredProd.toLocaleString()}</strong>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="pt-1.5 text-[9.5px] font-bold text-slate-700 flex justify-between items-center border-t border-slate-100">
                              <span>商品売上合計 (税抜):</span>
                              <span>¥{Math.floor((Number(productSales) || 0) / 1.1).toLocaleString()} (税込 ¥{(Number(productSales) || 0).toLocaleString()})</span>
                            </div>
                            <p className="mt-1 text-slate-500 text-[9px] leading-relaxed">
                              ※ 歩合ルール: 商品ごとに10%の手当が店販手当として適用されます。
                              (算出歩合給: <strong className="text-rose-700">¥{(Number(productCommission) || 0).toLocaleString()}円</strong>)
                            </p>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <AllowanceFields
                isSalary={type === "salary"}
                values={{ transport: transportAllowance, nomination: nominationAllowance, review: reviewAllowance, blog: blogAllowance, executive: executiveAllowance, business: businessAllowance, attendance: attendanceAllowance }}
                onChange={(key: keyof AllowanceValues, value) => ({ transport: setTransportAllowance, nomination: setNominationAllowance, review: setReviewAllowance, blog: setBlogAllowance, executive: setExecutiveAllowance, business: setBusinessAllowance, attendance: setAttendanceAllowance })[key](value)}
                separateDisplay={separateAllowanceDisplay}
                onSeparateDisplayChange={setSeparateAllowanceDisplay}
              />
              {false && <div className="space-y-1">
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
                  {type === "salary" && (
                    <>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold block">業務手当</span>
                        <Input 
                          type="number" 
                          placeholder="業務手当"
                          value={businessAllowance} 
                          onChange={(e) => setBusinessAllowance(e.target.value)}
                          className="h-8 text-xs rounded font-bold border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold block">皆勤手当</span>
                        <Input 
                          type="number" 
                          placeholder="皆勤手当"
                          value={attendanceAllowance} 
                          onChange={(e) => setAttendanceAllowance(e.target.value)}
                          className="h-8 text-xs rounded font-bold border-slate-200"
                        />
                      </div>
                      <label className="col-span-2 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-2.5 cursor-pointer">
                        <Checkbox
                          checked={separateAllowanceDisplay}
                          onCheckedChange={(checked) => setSeparateAllowanceDisplay(checked === true)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block text-[10px] font-bold text-slate-700">給与明細で固定給の内訳を個別表示する</span>
                          <span className="block text-[9px] text-slate-500 mt-0.5">ベース給・皆勤手当・業務手当を別々の行で表示します</span>
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </div>}

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
                  <div className="grid grid-cols-3 gap-2">
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
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="有給日数"
                      value={paidLeaves}
                      onChange={(e) => setPaidLeaves(e.target.value)}
                      className="h-10 text-xs rounded-lg text-center"
                      aria-label="有給取得日数"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400">出勤日数 / 勤務時間 / 有給取得日数（シフトの「有給」から自動反映・手入力可）</p>
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

          {/* Other Adjustments */}
          <div className="space-y-3 animate-in slide-in-from-top-3 duration-200">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1 border-b pb-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-sm"></span> その他の調整 (円)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">支払済振込額 (先払い分等)</span>
                <Input 
                  type="number" 
                  value={alreadyPaidAmount} 
                  onChange={(e) => setAlreadyPaidAmount(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  placeholder="例: 15000"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">立替金・購入代控除</span>
                <Input 
                  type="number" 
                  value={advanceDeduction} 
                  onChange={(e) => setAdvanceDeduction(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  placeholder="例: 5000"
                />
              </div>
            </div>
          </div>

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
              <span className="text-sm font-black text-slate-200 font-mono tracking-tight">
                ¥{finalPaidAmount.toLocaleString()}
              </span>
            </div>

            {numAlreadyPaid > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">支払済振込額 (控除):</span>
                <span className="font-bold text-rose-400">-¥{numAlreadyPaid.toLocaleString()}</span>
              </div>
            )}
            {numAdvanceDeduction > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">立替金・購入代控除:</span>
                <span className="font-bold text-rose-400">-¥{numAdvanceDeduction.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-sm font-bold text-slate-200">最終振込支給額</span>
              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                ¥{transferAmount.toLocaleString()}
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
