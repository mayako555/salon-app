"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Edit3, 
  Clock, 
  Calendar, 
  Save, 
  Loader2, 
  ShieldCheck, 
  Wallet,
  Calculator,
  User,
  MessageSquare
} from "lucide-react";
import { MonthlyStatement, updateManualStatement } from "./actions";
import { getMonthlySales, SalesRecord } from "../sales/actions";
import { toast } from "sonner";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculatePayrollTaxes } from "@/lib/tax-calculator";

export default function EditStatementDialog({ stmt }: { stmt: MonthlyStatement }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States prefilled with the stmt values
  const [hourlyBasePay, setHourlyBasePay] = useState("0");

  const [techSalary, setTechSalary] = useState(stmt.details.base_tech_salary?.toString() || "0");
  const [productSalary, setProductSalary] = useState((stmt.details.base_product_salary || 0).toString());
  const [transportAllowance, setTransportAllowance] = useState((stmt.details.transport_fee || 0).toString());
  const [nominationAllowance, setNominationAllowance] = useState((stmt.details.nomination_reward || 0).toString());
  // @ts-ignore
  const [reviewAllowance, setReviewAllowance] = useState((stmt.details.review_allowance || 0).toString());
  // @ts-ignore
  const [blogAllowance, setBlogAllowance] = useState((stmt.details.blog_allowance || 0).toString());
  
  const allocated = 
    (stmt.details.transport_fee || 0) + 
    (stmt.details.nomination_reward || 0) + 
    // @ts-ignore
    (stmt.details.review_allowance || 0) + 
    // @ts-ignore
    (stmt.details.blog_allowance || 0) + 
    // @ts-ignore
    (stmt.details.executive_allowance || 0);
  const unallocated = (stmt.total_allowances || 0) - allocated;
  const initialExecutive = (stmt.details.executive_allowance || 0) + (unallocated > 0 ? unallocated : 0);

  // @ts-ignore
  const [executiveAllowance, setExecutiveAllowance] = useState(initialExecutive.toString());
  const [taxAddition, setTaxAddition] = useState((stmt.details.tax_addition || 0).toString());

  // Deductions State (Salary only)
  const [health, setHealth] = useState(stmt.details.social_insurance?.health.toString() || "0");
  const [pension, setPension] = useState(stmt.details.social_insurance?.pension.toString() || "0");
  const [employment, setEmployment] = useState(stmt.details.social_insurance?.employment.toString() || "0");
  const [incomeTax, setIncomeTax] = useState(stmt.details.social_insurance?.income_tax?.toString() || "");
  const [residentTax, setResidentTax] = useState(stmt.details.social_insurance?.resident_tax?.toString() || "");
  const [childcare, setChildcare] = useState(stmt.details.social_insurance?.childcare?.toString() || "");

  const [alreadyPaidAmount, setAlreadyPaidAmount] = useState(stmt.adjustments?.already_paid_amount_override?.toString() || "");
  const [advanceDeduction, setAdvanceDeduction] = useState(stmt.adjustments?.advance_deduction_override?.toString() || "");

  // Metrics State
  const [workedDays, setWorkedDays] = useState(stmt.details.metrics?.worked_days?.toString() || "");
  const [workedHours, setWorkedHours] = useState(stmt.details.metrics?.worked_hours?.toString() || "0");
  const [hourlyWage, setHourlyWage] = useState(stmt.details.hourly_wage?.toString() || "0");
  const [workLocation, setWorkLocation] = useState(stmt.work_location || "");
  const [note, setNote] = useState(stmt.note || "");
  const [contractType, setContractType] = useState<string>("");
  const [contractData, setContractData] = useState<any>(null);
  const [manualMonthlyBase, setManualMonthlyBase] = useState<string>("");

  const [productSalesRecords, setProductSalesRecords] = useState<SalesRecord[]>([]);
  const [allSalesRecords, setAllSalesRecords] = useState<SalesRecord[]>([]);
  const [showProductSales, setShowProductSales] = useState(false);

  // Prefill hourly wage from staff profile and fetch contract type on open
  useEffect(() => {
    if (isOpen && stmt.staff_id) {
      const fetchStaffWageAndContract = async () => {
        try {
          const docRef = doc(db, "staff_profiles", stmt.staff_id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // If statement hourly_wage is 0/empty, prefill with staff profile hourly_wage!
            const savedWageOnStmt = Number(stmt.details.hourly_wage) || 0;
            if (savedWageOnStmt === 0 && data.hourly_wage) {
              setHourlyWage(data.hourly_wage.toString());
              
              // Also update the base basic pay if workedHours is already set
              const hours = Number(workedHours) || 0;
              if (hours > 0) {
                setTechSalary(Math.floor(data.hourly_wage * hours).toString());
              }
            }
          }

          // Fetch contract type
          const contractsSnap = await getDocs(query(collection(db, "staff_contracts"), where("staff_id", "==", stmt.staff_id)));
          if (!contractsSnap.empty) {
            const contractDataDb = contractsSnap.docs[0].data();
            setContractType(contractDataDb.contract_type || "");
            setContractData(contractDataDb);
          }
        } catch (err) {
          console.error("Error fetching staff wage or contract:", err);
        }
      };
      fetchStaffWageAndContract();

      const [year, month] = stmt.target_month.split('-');
      if (year && month) {
        getMonthlySales(Number(year), Number(month)).then(sales => {
          const matchedSales = sales.filter(s => 
            (s.staff_id === stmt.staff_id || s.staff_name === stmt.staff_name)
          );
          setAllSalesRecords(matchedSales);
          setProductSalesRecords(matchedSales.filter(s => s.product_sales > 0));
        });
      }

      // Initialize hourlyBasePay after contractType is determined
      if (stmt.type === "salary" && contractType !== "monthly" && contractType !== "tier_monthly") {
         setHourlyBasePay((stmt.base_amount - (stmt.details.base_tech_salary || 0) - (stmt.details.base_product_salary || 0)).toString());
      } else {
         const baseVal = (contractData?.monthly_base_salary ?? (stmt.base_amount - (stmt.details.base_tech_salary || 0) - (stmt.details.base_product_salary || 0)));
         setManualMonthlyBase(baseVal.toString());
      }
    }
  }, [isOpen, stmt.staff_id, stmt.staff_name, stmt.target_month]);

  // Manual tax calculation trigger
  const handleRecalculateTaxes = () => {
    const baseVal = (Number(techSalary) || 0) + (Number(productSalary) || 0);
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
    toast.success("税金・保険料を再計算しました");
  };

  // Calculations
  const isHourly = stmt.type === "salary" && contractType !== "monthly" && contractType !== "tier_monthly";
  const numTech = Number(techSalary) || 0;
  const numProduct = Number(productSalary) || 0;
  const monthlyBaseSalary = (contractType === "monthly" || contractType === "tier_monthly")
    ? (manualMonthlyBase !== "" ? (Number(manualMonthlyBase) || 0) : (contractData?.monthly_base_salary ?? (stmt.base_amount - (stmt.details.base_tech_salary || 0) - (stmt.details.base_product_salary || 0))))
    : (isHourly ? Number(hourlyBasePay) : 0);
  const numBase = monthlyBaseSalary + numTech + numProduct;
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

  const numHealth = stmt.type === "salary" ? (Number(health) || 0) : 0;
  const numPension = stmt.type === "salary" ? (Number(pension) || 0) : 0;
  const numEmployment = stmt.type === "salary" ? (Number(employment) || 0) : 0;
  const numIncomeTax = stmt.type === "salary" ? (Number(incomeTax) || 0) : 0;
  const numResidentTax = stmt.type === "salary" ? (Number(residentTax) || 0) : 0;
  const numChildcare = stmt.type === "salary" ? (Number(childcare) || 0) : 0;
  
  const numAlreadyPaid = Number(alreadyPaidAmount) || 0;
  const numAdvanceDeduction = Number(advanceDeduction) || 0;

  const totalDeductions = numHealth + numPension + numEmployment + numIncomeTax + numResidentTax + numChildcare;
  const finalPaidAmount = numBase + numAllowance + numTaxAdd - totalDeductions;
  const transferAmount = finalPaidAmount - numAlreadyPaid - numAdvanceDeduction;

  const handleHourlyWageChange = (val: string) => {
    setHourlyWage(val);
    const wage = Number(val) || 0;
    const hours = Number(workedHours) || 0;
    setHourlyBasePay(Math.floor(wage * hours).toString());
  };

  const handleWorkedHoursChange = (val: string) => {
    setWorkedHours(val);
    const wage = Number(hourlyWage) || 0;
    const hours = Number(val) || 0;
    setHourlyBasePay(Math.floor(wage * hours).toString());
  };

  const handleSave = async (status: "draft" | "closed") => {
    setIsSubmitting(true);
    try {
      const payload = {
        base_amount: numBase,
        total_allowances: numAllowance,
        total_deductions: totalDeductions,
        final_paid_amount: finalPaidAmount,
        work_location: workLocation,
        note: note,
        status: status,
        adjustments: {
          ...stmt.adjustments,
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
          ...stmt.details,
          base_tech_salary: numTech,
          base_product_salary: numProduct,
          nomination_reward: numNomination,
          transport_fee: numTransport,
          // @ts-ignore
          review_allowance: numReview,
          // @ts-ignore
          blog_allowance: numBlog,
          // @ts-ignore
          executive_allowance: numExecutive,
          tax_addition: numTaxAdd,
          hourly_wage: Number(hourlyWage) || 0,
          social_insurance: stmt.type === "salary" ? {
            health: numHealth,
            pension: numPension,
            employment: numEmployment,
            income_tax: numIncomeTax,
            resident_tax: numResidentTax,
            childcare: numChildcare
          } : undefined,
          metrics: {
            ...stmt.details.metrics,
            worked_days: Number(workedDays) || undefined,
            worked_hours: Number(workedHours) || undefined
          }
        }
      };

      const res = await updateManualStatement(stmt.id, payload);
      if (res.success) {
        toast.success(`${stmt.staff_name}様の明細書を${status === "closed" ? "確定" : "一時保存"}しました！`);
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(`更新エラー: ${res.error}`);
      }
    } catch (err) {
      toast.error("更新中にエラーが発生しました");
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
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mt-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Calculator className="text-blue-500 w-5 h-5 animate-pulse" />
              給与・報酬明細の編集
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                const toastId = toast.loading("最新のデータを取得中...");
                const [year, month] = stmt.target_month.split('-');
                const { getStaffPayrollDefaultValues } = await import('./actions');
                const res = await getStaffPayrollDefaultValues(stmt.staff_id, Number(year), Number(month));
                if (res.success && res.data) {
                  const d = res.data as any;
                  setTransportAllowance((d.transportAllowance || 0).toString());
                  setNominationAllowance((d.nominationAllowance || 0).toString());
                  setReviewAllowance((d.reviewAllowance || 0).toString());
                  setBlogAllowance((d.blogAllowance || 0).toString());
                  setExecutiveAllowance((d.executiveAllowance || 0).toString());
                  setTechSalary((d.base_amount - (d.details?.base_product_salary || d.baseProductSalary || 0)).toString());
                  setProductSalary((d.details?.base_product_salary || d.baseProductSalary || 0).toString());
                  setTaxAddition((d.taxAddition || 0).toString());
                  setWorkedDays((d.workedDays || "").toString());
                  setWorkedHours((d.workedHours || "0").toString());
                  setHourlyWage((d.hourly_wage || 0).toString());
                  if (d.health !== undefined) setHealth((d.health || 0).toString());
                  if (d.pension !== undefined) setPension((d.pension || 0).toString());
                  if (d.employment !== undefined) setEmployment((d.employment || 0).toString());
                  if (d.incomeTax !== undefined) setIncomeTax((d.incomeTax || 0).toString());
                  if (d.residentTax !== undefined) setResidentTax((d.residentTax || 0).toString());
                  if (d.childcare !== undefined) setChildcare((d.childcare || 0).toString());
                  toast.success("最新の売上・手当データで数値を上書きしました", { id: toastId });
                } else {
                  toast.error(`データの取得に失敗しました: ${(res as any).error || "不明なエラー"}`, { id: toastId });
                }
              }}
              className="h-8 text-xs font-bold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <Loader2 className="w-3 h-3 mr-1" />
              最新の売上・手当を取得
            </Button>
          </div>
          <DialogDescription className="text-slate-500 text-xs">
            対象スタッフ：{stmt.staff_name} 様 ({stmt.target_month.replace("-", "年")}月度 / {stmt.type === "salary" ? "正社員・パート給与" : "業務委託報酬"})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6 mt-4">
          
          {/* Target Month & Staff (Disabled) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 opacity-80">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                <Calendar size={12} /> 対象月（編集不可）
              </span>
              <Input value={stmt.target_month} disabled className="h-9 text-xs rounded-lg font-bold bg-slate-100 border-slate-200" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                <User size={12} /> 対象スタッフ（編集不可）
              </span>
              <Input value={stmt.staff_name} disabled className="h-9 text-xs rounded-lg font-bold bg-slate-100 border-slate-200" />
            </div>
          </div>

          {/* 時給計算アシスタント - 技術歩合のみ自動計算 */}
          {stmt.type === "salary" && contractType !== "monthly" && contractType !== "tier_monthly" && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-blue-100/60 pb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
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
              <p className="text-[9px] text-slate-400 font-medium">
                ※ 時給または労働時間を入力すると、下の「基本給 / 歩合報酬ベース」が自動的に連動して更新されます。
              </p>
            </div>
          )}

          {/* 基本情報（正社員・固定給用） */}
          {stmt.type === "salary" && (contractType === "monthly" || contractType === "tier_monthly") && (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100/60 pb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  基本契約情報（正社員・固定給）
                </h4>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Fixed Salary Contract
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block">ベース基本給 (手打ち編集可)</span>
                  <Input 
                    type="number" 
                    value={manualMonthlyBase} 
                    onChange={(e) => setManualMonthlyBase(e.target.value)}
                    className="h-9 text-xs rounded-lg font-bold border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block">固定手当 合計</span>
                  <div className="h-9 flex items-center justify-start px-3 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-700 tabular-nums">
                    ¥{((contractData?.business_allowance || 0) + (contractData?.attendance_allowance || 0)).toLocaleString()}
                  </div>
                  {((contractData?.business_allowance || 0) > 0 || (contractData?.attendance_allowance || 0) > 0) && (
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      (業務手当: ¥{(contractData?.business_allowance || 0).toLocaleString()} / 皆勤手当: ¥{(contractData?.attendance_allowance || 0).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Earnings Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 border-b pb-1.5 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-3.5 bg-blue-500 rounded-sm"></span> 支給・支払額の入力
              </div>
              <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black border border-blue-100 flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                <span>総支給額 (基本給 + 手当):</span>
                <span className="text-sm font-black text-blue-800">¥{(numBase + numAllowance).toLocaleString()}</span>
              </div>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                {isHourly && (
                  <div className="mb-2">
                    <label className="text-[10px] font-bold text-slate-500 block">基本給 (時給ベース) (円)</label>
                    <Input 
                      type="number" 
                      value={hourlyBasePay} 
                      onChange={(e) => setHourlyBasePay(e.target.value)}
                      className="h-10 text-xs rounded-lg font-bold border-slate-200 focus:ring-blue-500"
                    />
                  </div>
                )}
                <label className="text-[10px] font-bold text-slate-500 block mt-2">
                  {stmt.type === "reward" 
                    ? "技術歩合報酬ベース (円)" 
                    : "技術歩合/インセンティブ (円)"}
                </label>
                <Input 
                  type="number" 
                  value={techSalary} 
                  onChange={(e) => setTechSalary(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold border-slate-200 focus:ring-blue-500"
                />
                <label className="text-[10px] font-bold text-slate-500 block mt-2">店販歩合 (円)</label>
                <Input 
                  type="number" 
                  value={productSalary} 
                  onChange={(e) => setProductSalary(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold border-slate-200 focus:ring-blue-500"
                  placeholder="0"
                />
                {stmt.type === "reward" && (() => {
                  const defaultRatio = contractData?.tech_sales_ratio || 0;
                  const menuSpecificRates = contractData?.menu_specific_rates || [];
                  const deductionCashlessRatio = contractData?.deduction_cashless_ratio || 0;
                  
                  // Sort and categorize sales records by matched menu specific rates
                  const breakdown: Record<string, { sales: number; ratio: number; count: number }> = {};
                  let totalOtherSales = 0;
                  let totalOtherCount = 0;
                  let totalCashlessTech = 0;

                  allSalesRecords.forEach(s => {
                    const netTech = Math.max(0, (s.tech_sales || 0) - (s.discount || 0));
                    const isCashless = s.payment_method !== "現金" && s.payment_method !== "不明" && s.payment_method !== "";
                    if (isCashless) {
                      totalCashlessTech += netTech;
                    }

                    let matchedRate = defaultRatio;
                    let matchedName = "通常技術";
                    if (menuSpecificRates.length > 0 && s.menu_course) {
                      for (const spec of menuSpecificRates) {
                        if (spec.menu_name && s.menu_course.includes(spec.menu_name)) {
                          matchedRate = spec.ratio;
                          matchedName = spec.menu_name;
                          break;
                        }
                      }
                    }

                    if (matchedName === "通常技術") {
                      totalOtherSales += netTech;
                      totalOtherCount++;
                    } else {
                      if (!breakdown[matchedName]) {
                        breakdown[matchedName] = { sales: 0, ratio: matchedRate, count: 0 };
                      }
                      breakdown[matchedName].sales += netTech;
                      breakdown[matchedName].count++;
                    }
                  });

                  return (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <p className="font-bold text-slate-700 border-b pb-1">業務委託費用 算出計算（参考内訳）</p>
                      
                      {/* Tech sales ratio table */}
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="text-slate-400 font-bold border-b border-slate-200/60">
                            <th className="pb-1">メニュー区分 (歩合率)</th>
                            <th className="pb-1 text-right">当月売上額</th>
                            <th className="pb-1 text-right">歩合報酬</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {Object.entries(breakdown).map(([name, val]) => {
                            const comm = Math.floor(val.sales * 0.9 * (val.ratio / 100)); // 10% tax deduction base
                            return (
                              <tr key={name} className="text-slate-600">
                                <td className="py-1">{name} ({val.ratio}%) <span className="text-[8px] font-normal text-slate-400">({val.count}件)</span></td>
                                <td className="py-1 text-right">¥{val.sales.toLocaleString()}</td>
                                <td className="py-1 text-right text-emerald-600">¥{comm.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                          {totalOtherSales > 0 && (
                            <tr className="text-slate-600">
                              <td className="py-1">通常施術 ({defaultRatio}%) <span className="text-[8px] font-normal text-slate-400">({totalOtherCount}件)</span></td>
                              <td className="py-1 text-right">¥{totalOtherSales.toLocaleString()}</td>
                              <td className="py-1 text-right text-emerald-600">¥{Math.floor(totalOtherSales * 0.9 * (defaultRatio / 100)).toLocaleString()}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Cashless Fee Deduction display */}
                      {deductionCashlessRatio > 0 && (
                        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                          <span>キャッシュレス決済手数料控除 ({deductionCashlessRatio}%対象):</span>
                          <span>-¥{Math.floor(totalCashlessTech * (deductionCashlessRatio / 100)).toLocaleString()}</span>
                        </div>
                      )}
                      
                      <p className="text-[8px] text-slate-400 leading-normal">
                        ※上記は売上レコード(CSV)から自動計算された目安額です。確定額は左の「技術歩合報酬ベース」に入力してください。
                      </p>
                    </div>
                  );
                })()}
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
                      placeholder="口コミ手当"
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
                  <div className="space-y-1 col-span-2">
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

              {stmt.type === "reward" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">消費税加算額 (10%) (円)</label>
                  <Input 
                    type="number" 
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
          {stmt.type === "salary" && (
            <div className="space-y-3 animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b pb-1.5">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-1.5 h-3.5 bg-blue-500 rounded-sm"></span> 社会保険・法定控除の入力 (円)
                </h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRecalculateTaxes}
                  className="h-7 text-[10px] text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 px-2"
                >
                  <Calculator className="w-3 h-3 mr-1" />
                  自動再計算
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">健康保険料</label>
                  <Input 
                    type="number" 
                    value={health} 
                    onChange={(e) => setHealth(e.target.value)}
                    className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">厚生年金保険料</label>
                  <Input 
                    type="number" 
                    value={pension} 
                    onChange={(e) => setPension(e.target.value)}
                    className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">雇用保険料</label>
                  <Input 
                    type="number" 
                    value={employment} 
                    onChange={(e) => setEmployment(e.target.value)}
                    className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">所得税（源泉徴収）</label>
                  <Input 
                    type="number" 
                    value={incomeTax} 
                    onChange={(e) => setIncomeTax(e.target.value)}
                    className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">住民税</label>
                  <Input 
                    type="number" 
                    value={residentTax} 
                    onChange={(e) => setResidentTax(e.target.value)}
                    className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block text-blue-600 flex items-center gap-1 font-bold">
                    子ども・子育て支援金
                  </label>
                  <Input 
                    type="number" 
                    value={childcare} 
                    onChange={(e) => setChildcare(e.target.value)}
                    className="h-10 text-xs rounded-lg font-bold border-blue-200 bg-blue-50/20 text-blue-900"
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block" title="6ヶ月一括払いの定期代等、すでに前払い済みの金額を最終振込額から引く場合に入力します。">支払済振込額 (先払い分)</label>
                <Input 
                  type="number" 
                  value={alreadyPaidAmount} 
                  onChange={(e) => setAlreadyPaidAmount(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold border-slate-200"
                  placeholder="例: 15000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block" title="商品購入や立替等、手取りから天引きする金額">立替金・購入代控除</label>
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

          {/* Real-time Calculation Summary */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-lg">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-2">計算結果のプレビュー</h4>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">総支給額 (基本給 + 手当合計 + 消費税):</span>
              <span className="font-bold text-slate-200">
                ¥{(numBase + numAllowance + numTaxAdd).toLocaleString()}
              </span>
            </div>
            {stmt.type === "salary" && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">控除額合計 (社会保険・税等):</span>
                <span className="font-bold text-red-400">-¥{totalDeductions.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-sm font-bold text-slate-300">
                差し引き支給額:
              </span>
              <span className="text-xl font-black text-slate-300">
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
              <span className="text-sm font-bold text-slate-300">
                最終振込支給額:
              </span>
              <span className="text-2xl font-black text-emerald-400">
                ¥{transferAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end flex-wrap">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="h-10 rounded-lg text-xs"
            >
              キャンセル
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={isSubmitting}
              className="h-10 rounded-lg border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save size={14} className="text-slate-500" />
                  一時保存
                </>
              )}
            </Button>
            <Button 
              type="button" 
              onClick={() => handleSave("closed")}
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  確定（ロック）する
                </>
              )}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
