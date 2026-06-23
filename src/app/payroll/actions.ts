"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  doc, 
  writeBatch,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { getContractsList } from "@/app/contracts/actions";
import { getMonthlySales } from "@/app/sales/actions";
import { getMonthlyAllowances } from "@/app/allowances/actions";
import { getMonthlyAttendance, AttendanceRecord } from "@/app/attendance/actions";
import { getMonthlyShifts, ShiftRecord } from "@/app/shifts/actions";
import { addAuditLog } from "@/app/audit/actions";
import { calculatePayrollTaxes } from "@/lib/tax-calculator";

function normalizeStaffName(name: string) {
  if (!name) return "";
  return name.replace(/[\s　]+/g, "")
    .replace(/凜/g, "凛")
    .replace(/邊/g, "辺")
    .replace(/齊|齋/g, "斉")
    .replace(/澤/g, "沢")
    .replace(/濱/g, "浜")
    .replace(/嶋/g, "島")
    .replace(/﨑|嵜/g, "崎")
    .replace(/髙/g, "高");
}

// Helper function to extract contracts active in a specific month, keeping only the latest one per staff member
function getActiveContractsForMonth(contracts: any[], year: number, month: number) {
  const startOfMonthStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonthStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // 1. Filter to contracts active during the target month
  const active = contracts.filter(c => {
    const fromStr = c.valid_from;
    const toStr = c.valid_to;
    return fromStr <= endOfMonthStr && (!toStr || toStr >= startOfMonthStr);
  });

  // 2. Group by staff_id and keep only the latest one (newest valid_from)
  const latestByStaff: Record<string, any> = {};
  for (const c of active) {
    const existing = latestByStaff[c.staff_id];
    if (!existing || c.valid_from > existing.valid_from) {
      latestByStaff[c.staff_id] = c;
    }
  }

  return Object.values(latestByStaff);
}

export type MonthlyStatement = {
  id: string;
  staff_id: string;
  staff_name: string;
  target_month: string;
  type: "salary" | "reward";
  base_amount: number;
  total_allowances: number;
  total_deductions: number;
  final_paid_amount: number;
  status: "draft" | "closed";
  work_location?: string;
  note?: string;
  adjustments?: {
    tech_cashless_sales_override?: number;
    retail_cashless_sales_override?: number;
    transport_fee_override?: number;
    health_insurance_override?: number;
    pension_override?: number;
    employment_insurance_override?: number;
    income_tax_override?: number;
    resident_tax_override?: number;
    childcare_support_override?: number;
    already_paid_amount_override?: number; // 支払済振込額 (交通費の一括前払い分などを控除するため)
    advance_deduction_override?: number; // 立替・購入代金の天引き (税金計算に影響させずに手取りから引く)
    custom_adjustments?: { name: string; amount: number }[];
  };
  details: {
    base_tech_salary: number;
    base_product_salary: number;
    nomination_reward: number;
    transport_fee: number;
    cashless_deduction: number;
    tax_addition: number; 
    review_allowance?: number;
    blog_allowance?: number;
    executive_allowance?: number;
    social_insurance?: {
      employment: number;
      health: number;
      pension: number;
      income_tax: number;
      resident_tax: number;
      childcare?: number;
    };
    hourly_wage?: number;
    metrics: {
      total_tech_sales: number;
      total_product_sales: number;
      nomination_count: number;
      cashless_sales_total: number;
      worked_days?: number;
      worked_hours?: number;
    };
  };
  created_at: any;
  updated_at?: any;
};

const STATEMENTS_COLLECTION = "monthly_statements";

export async function getMonthlyStatements(year: number, month: number, staffId?: string): Promise<MonthlyStatement[]> {
  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  try {
    const colRef = collection(db, STATEMENTS_COLLECTION);
    let q = query(colRef, where("target_month", "==", targetMonth));
    
    if (staffId) {
      q = query(colRef, where("target_month", "==", targetMonth), where("staff_id", "==", staffId));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MonthlyStatement[];
  } catch (error) {
    console.error("Error fetching monthly statements:", error);
    return [];
  }
}

export async function getAllStatements(): Promise<MonthlyStatement[]> {
  try {
    const colRef = collection(db, STATEMENTS_COLLECTION);
    const q = query(colRef, orderBy("target_month", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MonthlyStatement[];
  } catch (error) {
    console.error("Error fetching all statements:", error);
    return [];
  }
}

function calculateProductCommission(sales: any[], contract: any, cashlessRetail: number) {
  let customBaseSum = 0;
  let customOriginalSum = 0;

  for (const sale of sales) {
    if (sale.product_sales > 0 && sale.menu_course) {
      const menus = sale.menu_course.split(/ \+ |\, /);
      for (const m of menus) {
        if (m.includes("コーティング")) {
          customBaseSum += 1500;
          customOriginalSum += 1760;
        } else if (m.includes("リルジュ")) {
          customBaseSum += 4300;
          customOriginalSum += 4840;
        }
      }
    }
  }

  const totalProductSales = sales.reduce((acc, s) => acc + s.product_sales, 0);
  const standardProductSales = Math.max(0, totalProductSales - customOriginalSum);
  
  let standardCommissionable = 0;
  if (contract.contract_type === "outsourcing" || contract.contract_type === "tier_monthly") {
    const taxDeduction = Math.floor(standardProductSales * 0.1);
    const standardCashlessFee = contract.deduction_cashless_ratio > 0 
      ? Math.floor(Math.max(0, cashlessRetail - customOriginalSum) * (contract.deduction_cashless_ratio / 100)) 
      : 0;
    standardCommissionable = Math.max(0, standardProductSales - taxDeduction - standardCashlessFee);
  } else {
    // monthly
    standardCommissionable = Math.floor(standardProductSales / 1.1);
  }

  const customCommission = Math.floor(customBaseSum * (contract.product_sales_ratio / 100));
  const standardCommission = Math.floor(standardCommissionable * (contract.product_sales_ratio / 100));

  return customCommission + standardCommission;
}

export async function generateStatements(year: number, month: number) {
  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  
  // 1. Check if closed
  const colRef = collection(db, STATEMENTS_COLLECTION);
  const qClosed = query(colRef, where("target_month", "==", targetMonth), where("status", "==", "closed"));
  const closedSnapshot = await getDocs(qClosed);
  
  if (!closedSnapshot.empty) {
    return { success: false, error: "すでに締め処理が完了している月です。再計算できません。" };
  }

  // 2. Fetch existing draft statements to preserve manual adjustments and hours
  const qDraft = query(colRef, where("target_month", "==", targetMonth), where("status", "==", "draft"));
  const draftSnapshot = await getDocs(qDraft);
  
  const preservationMap: Record<string, { 
    adjustments: MonthlyStatement["adjustments"],
    worked_hours?: number,
    worked_days?: number
  }> = {};

  draftSnapshot.docs.forEach(d => {
    const data = d.data() as MonthlyStatement;
    preservationMap[data.staff_id] = {
      adjustments: data.adjustments,
      worked_hours: data.details.metrics.worked_hours,
      worked_days: data.details.metrics.worked_days
    };
  });

  const batch = writeBatch(db);
  draftSnapshot.docs.forEach(d => {
    batch.delete(d.ref);
  });
  await batch.commit();

  const newBatch = writeBatch(db);

  // 3. Fetch dependencies
  const contracts = await getContractsList(); 
  const activeContracts = getActiveContractsForMonth(contracts, year, month);
  const sales = await getMonthlySales(year, month);
  const allowances = await getMonthlyAllowances(year, month);
  const attendances = await getMonthlyAttendance(year, month);
  const shifts = await getMonthlyShifts(year, month);

  await addAuditLog({
     table_name: "monthly_statements",
     record_id: `target-${targetMonth}`,
     action: "CALCULATE",
     old_data: null,
     new_data: { message: `Generated Payroll for ${activeContracts.length} active staff members` },
     actor: "System Administrator"
  });

  // 4. Calculate for each contract
  for (const contract of activeContracts) {
    const staffNameNormal = normalizeStaffName(contract.staff_name);
    const staffSales = sales.filter((s: any) => s.staff_name && normalizeStaffName(s.staff_name) === staffNameNormal);
    const staffAllowances = allowances.filter((a: any) => a.staff_name && normalizeStaffName(a.staff_name) === staffNameNormal);
    const staffAttendances = attendances.filter((a: AttendanceRecord) => a.staff_name && normalizeStaffName(a.staff_name) === staffNameNormal);
    const staffPaidLeaves = shifts.filter((s: ShiftRecord) => s.staff_id === contract.staff_id && s.type === "paid_leave").length;

    const storesWorkedSet = new Set<string>();
    staffAttendances.forEach((att: any) => {
      if (att.store) {
        storesWorkedSet.add(att.store);
      }
    });
    const storesWorked = Array.from(storesWorkedSet).filter(Boolean);
    const storeLocation = storesWorked.length > 0 ? storesWorked.join("・") : "";

    // Get preserved adjustments and metrics
    const preserved = preservationMap[contract.staff_id];
    const preservedAdjusts = preserved?.adjustments;

    // Track custom contract allowances
    const contractCustomAllowanceTotal = (contract.custom_allowances || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);

    // Categorized Database Allowances
    const transportAllowanceDb = staffAllowances
      .filter((a: any) => a.type === "transport")
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const nominationAllowanceDb = staffAllowances
      .filter((a: any) => a.type === "nomination")
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const reviewAllowanceDb = staffAllowances
      .filter((a: any) => a.type === "review")
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const blogAllowanceDb = staffAllowances
      .filter((a: any) => ["blog", "sns"].includes(a.type))
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const otherAllowanceDb = staffAllowances
      .filter((a: any) => ["other", "treatment"].includes(a.type))
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    // Track real attendance data
    const workedDays = staffAttendances.length;
    let workedHours = 0;

    staffAttendances.forEach((record: AttendanceRecord) => {
       const start = record.effective_clock_in ? new Date(record.effective_clock_in) : (record.clock_in ? new Date(new Date(record.clock_in).getTime() + 30 * 60 * 1000) : null);
       const end = record.effective_clock_out ? new Date(record.effective_clock_out) : (record.clock_out ? new Date(record.clock_out) : null);
       if (start && end) {
          const diffMs = end.getTime() - start.getTime();
          let diffMins = Math.floor(diffMs / 60000);
          
          diffMins -= (record.break_minutes || 0);

          if (diffMins > 480) {
             diffMins = 480;
          }

          workedHours += (diffMins / 60);
       }
    });

    workedHours = Math.round(workedHours * 10) / 10;
    
    // Use preserved values if no real attendance exists or if preserved exists
    const finalWorkedDays = workedDays > 0 ? workedDays : (preserved?.worked_days ?? 21);
    let finalWorkedHours = workedHours > 0 ? workedHours : (preserved?.worked_hours ?? (contract.contract_type === "hourly" ? 0 : 168));

    if (contract.contract_type === "hourly") {
      let totalMinutesWorked = 0;
      for (const att of staffAttendances) {
        const start = att.effective_clock_in ? new Date(att.effective_clock_in) : (att.clock_in ? new Date(new Date(att.clock_in).getTime() + 30 * 60 * 1000) : null);
        const end = att.effective_clock_out ? new Date(att.effective_clock_out) : (att.clock_out ? new Date(att.clock_out) : null);
        if (start && end && att.status === "normal") {
          const inMs = start.getTime();
          const outMs = end.getTime();
          const workedMinsRaw = Math.floor((outMs - inMs) / 60000);
          const workedMinsNet = Math.max(0, workedMinsRaw - att.break_minutes);
          totalMinutesWorked += workedMinsNet;
        }
      }

      const totalHours = totalMinutesWorked > 0 ? (totalMinutesWorked / 60) : (preserved?.worked_hours ?? 0);
      const baseHourlySalary = Math.floor(totalHours * (contract.hourly_wage || 0));
      finalWorkedHours = totalHours;

      const allowanceTotal = transportAllowanceDb + nominationAllowanceDb + reviewAllowanceDb + blogAllowanceDb + otherAllowanceDb + contractCustomAllowanceTotal;
      const customAdjustTotal = (preservedAdjusts?.custom_adjustments || []).reduce((acc, curr) => acc + curr.amount, 0);

      const intermediatePaidAmount = baseHourlySalary + allowanceTotal + customAdjustTotal;
      const taxAddition = 0; 
      const finalPaidAmount = intermediatePaidAmount + taxAddition;

      const statementPayload = {
        staff_id: contract.staff_id,
        staff_name: contract.staff_name || "不明",
        target_month: targetMonth,
        type: "salary", 
        base_amount: baseHourlySalary,
        total_allowances: allowanceTotal,
        total_deductions: 0,
        final_paid_amount: finalPaidAmount,
        status: "draft",
        adjustments: preservedAdjusts,
        work_location: storeLocation,
        details: {
          base_tech_salary: 0,
          base_product_salary: 0,
          nomination_reward: nominationAllowanceDb,
          transport_fee: preservedAdjusts?.transport_fee_override ?? transportAllowanceDb,
          cashless_deduction: 0,
          tax_addition: taxAddition,
          review_allowance: reviewAllowanceDb,
          blog_allowance: blogAllowanceDb,
          executive_allowance: otherAllowanceDb + contractCustomAllowanceTotal,
          metrics: {
            total_tech_sales: 0,
            total_product_sales: 0, 
            nomination_count: 0,
            cashless_sales_total: 0,
            worked_days: finalWorkedDays,
            worked_hours: finalWorkedHours,
            paid_leaves: staffPaidLeaves
          }
        },
        created_at: serverTimestamp()
      };

      const newDocRef = doc(colRef);
      newBatch.set(newDocRef, statementPayload);
      continue;
    }

    // Sales Aggregation
    let totalTechSales = 0;
    let totalProductSales = 0;
    let nominationCount = 0;
    let cashlessTechSales = 0;
    let cashlessProductSales = 0;
    let totalPortalFees = 0;

    for (const sale of staffSales) {
      const netTechSales = Math.max(0, sale.tech_sales - (sale.discount || 0));
      totalTechSales += netTechSales;
      totalProductSales += sale.product_sales;
      totalPortalFees += (sale.portal_fee || 0);
      
      if (sale.is_nominated) nominationCount += 1;

      if (sale.payment_method !== "現金" && sale.payment_method !== "不明") {
         cashlessTechSales += netTechSales;
         cashlessProductSales += sale.product_sales;
      }
    }

    // Apply preserved sales overrides
    const effectiveCashlessTech = preservedAdjusts?.tech_cashless_sales_override ?? cashlessTechSales;
    const effectiveCashlessRetail = preservedAdjusts?.retail_cashless_sales_override ?? cashlessProductSales;

    if (contract.contract_type === "monthly") {
      const techSalesTaxFree = Math.floor(totalTechSales / 1.1);
      const productSalesTaxFree = Math.floor(totalProductSales / 1.1);
      
      const quota = contract.tech_sales_quota || 0;
      let techCommission = 0;
      if (techSalesTaxFree > quota) {
         techCommission = Math.floor((techSalesTaxFree - quota) * (contract.tech_sales_ratio / 100));
      }
      
      const productCommission = calculateProductCommission(staffSales, contract, effectiveCashlessRetail);
      const nominationReward = nominationCount * contract.nomination_fee;
      
      const baseMonthlySalary = contract.monthly_base_salary || 0;
      const totalCommission = techCommission + productCommission + nominationReward;
      const allowanceTotal = transportAllowanceDb + nominationAllowanceDb + reviewAllowanceDb + blogAllowanceDb + otherAllowanceDb + contractCustomAllowanceTotal;
      const customAdjustTotal = (preservedAdjusts?.custom_adjustments || []).reduce((acc, curr) => acc + curr.amount, 0);

      const base_amount = baseMonthlySalary + totalCommission;
      const transportFee = preservedAdjusts?.transport_fee_override ?? 17950; 

      const taxes = calculatePayrollTaxes({
        baseSalary: base_amount,
        allowances: allowanceTotal + customAdjustTotal,
        transportFee: transportFee,
        dependentsCount: 0
      });

      // Apply overrides for taxes if preserved
      const health = preservedAdjusts?.health_insurance_override ?? taxes.healthInsurance;
      const pension = preservedAdjusts?.pension_override ?? taxes.pension;
      const employment = preservedAdjusts?.employment_insurance_override ?? taxes.employmentInsurance;
      const incomeTax = preservedAdjusts?.income_tax_override ?? taxes.incomeTax;
      const residentTax = preservedAdjusts?.resident_tax_override ?? taxes.residentTax;
      const childcare = preservedAdjusts?.childcare_support_override ?? (taxes.childcareSupport || 0);

      const totalDeductions = health + pension + employment + incomeTax + residentTax + childcare;
      const final_paid = base_amount + allowanceTotal + transportFee + customAdjustTotal - totalDeductions;

      const statementPayload = {
        staff_id: contract.staff_id,
        staff_name: contract.staff_name || "不明",
        target_month: targetMonth,
        type: "salary", 
        base_amount: base_amount,
        total_allowances: allowanceTotal,
        total_deductions: totalDeductions,
        final_paid_amount: final_paid,
        status: "draft",
        adjustments: preservedAdjusts,
        work_location: storeLocation,
        details: {
          base_tech_salary: techCommission,
          base_product_salary: productCommission,
          nomination_reward: nominationReward,
          transport_fee: transportFee,
          cashless_deduction: 0,
          tax_addition: 0,
          social_insurance: {
             employment, health, pension, income_tax: incomeTax, resident_tax: residentTax, childcare
          },
          review_allowance: reviewAllowanceDb,
          blog_allowance: blogAllowanceDb,
          executive_allowance: otherAllowanceDb + contractCustomAllowanceTotal,
          metrics: {
            total_tech_sales: totalTechSales,
            total_product_sales: totalProductSales, 
            nomination_count: nominationCount,
            cashless_sales_total: effectiveCashlessTech + effectiveCashlessRetail,
            worked_days: finalWorkedDays,
            worked_hours: finalWorkedHours,
            paid_leaves: staffPaidLeaves
          }
        },
        created_at: serverTimestamp()
      };

      const newDocRef = doc(colRef);
      newBatch.set(newDocRef, statementPayload);
      continue;
    }

    if (contract.contract_type === "tier_monthly") {
      const techSalesTaxFree = Math.floor(totalTechSales / 1.1);
      const productSalesTaxFree = Math.floor(totalProductSales / 1.1);
      const personalTaxFreeSales = techSalesTaxFree + productSalesTaxFree;
      const baseMonthlySalary = contract.monthly_base_salary || 280000;
      
      let incentive = 0;
      if (personalTaxFreeSales >= 400000) {
          incentive = Math.floor(personalTaxFreeSales / 50000) * 5000 - 35000;
      }
      
      const nominationReward = nominationCount * contract.nomination_fee;
      const allowanceTotal = transportAllowanceDb + nominationAllowanceDb + reviewAllowanceDb + blogAllowanceDb + otherAllowanceDb + contractCustomAllowanceTotal;
      const customAdjustTotal = (preservedAdjusts?.custom_adjustments || []).reduce((acc, curr) => acc + curr.amount, 0);

      const intermediatePaidAmount = baseMonthlySalary + incentive + nominationReward + allowanceTotal + customAdjustTotal;
      const finalPaidAmount = intermediatePaidAmount;

      const statementPayload = {
        staff_id: contract.staff_id,
        staff_name: contract.staff_name || "不明",
        target_month: targetMonth,
        type: "salary", 
        base_amount: baseMonthlySalary + incentive,
        total_allowances: allowanceTotal,
        total_deductions: 0,
        final_paid_amount: finalPaidAmount,
        status: "draft",
        adjustments: preservedAdjusts,
        work_location: storeLocation,
        details: {
          base_tech_salary: incentive,
          base_product_salary: 0,
          nomination_reward: nominationReward,
          transport_fee: preservedAdjusts?.transport_fee_override ?? transportAllowanceDb,
          cashless_deduction: 0,
          tax_addition: 0,
          review_allowance: reviewAllowanceDb,
          blog_allowance: blogAllowanceDb,
          executive_allowance: otherAllowanceDb + contractCustomAllowanceTotal,
          metrics: {
            total_tech_sales: totalTechSales,
            total_product_sales: totalProductSales, 
            nomination_count: nominationCount,
            cashless_sales_total: effectiveCashlessTech + effectiveCashlessRetail,
            worked_days: finalWorkedDays,
            worked_hours: finalWorkedHours,
            paid_leaves: staffPaidLeaves
          }
        },
        created_at: serverTimestamp()
      };

      const newDocRef = doc(colRef);
      newBatch.set(newDocRef, statementPayload);
      continue;
    }

    // ====== OUTSOURCING ======
    const techTaxDeduction = Math.floor(totalTechSales * 0.1); 
    const techCashlessFee = contract.deduction_cashless_ratio > 0 ? Math.floor(effectiveCashlessTech * (contract.deduction_cashless_ratio / 100)) : 0;
    
    const commissionableTechSales = Math.max(0, totalTechSales - techTaxDeduction - techCashlessFee - totalPortalFees);
    const baseTechSalary = Math.floor(commissionableTechSales * (contract.tech_sales_ratio / 100));
    const productCashlessFee = contract.deduction_cashless_ratio > 0 ? Math.floor(effectiveCashlessRetail * (contract.deduction_cashless_ratio / 100)) : 0;
    
    const baseProductSalary = calculateProductCommission(staffSales, contract, effectiveCashlessRetail);
    
    const nominationReward = nominationCount * contract.nomination_fee;
    let baseAmount = baseTechSalary + baseProductSalary + nominationReward;

    const allowanceTotal = transportAllowanceDb + nominationAllowanceDb + reviewAllowanceDb + blogAllowanceDb + otherAllowanceDb + contractCustomAllowanceTotal;
    const customAdjustTotal = (preservedAdjusts?.custom_adjustments || []).reduce((acc, curr) => acc + curr.amount, 0);

    let intermediatePaidAmount = baseAmount + allowanceTotal + customAdjustTotal;
    let taxAddition = 0;
    if (!contract.deduction_consumption_tax) {
       taxAddition = Math.floor(intermediatePaidAmount * 0.1); 
    }

    const finalPaidAmount = intermediatePaidAmount + taxAddition;

    const statementPayload = {
      staff_id: contract.staff_id,
      staff_name: contract.staff_name || "不明",
      target_month: targetMonth,
      type: "reward", 
      base_amount: baseAmount,
      total_allowances: allowanceTotal,
      total_deductions: 0,
      final_paid_amount: finalPaidAmount,
      status: "draft",
      adjustments: preservedAdjusts,
      work_location: storeLocation,
      details: {
        base_tech_salary: baseTechSalary,
        base_product_salary: baseProductSalary,
        nomination_reward: nominationReward,
        transport_fee: preservedAdjusts?.transport_fee_override ?? transportAllowanceDb,
        cashless_deduction: techCashlessFee + productCashlessFee,
        tax_addition: taxAddition,
        social_insurance: undefined,
        review_allowance: reviewAllowanceDb,
        blog_allowance: blogAllowanceDb,
        executive_allowance: otherAllowanceDb + contractCustomAllowanceTotal,
        metrics: {
          total_tech_sales: totalTechSales,
          total_product_sales: totalProductSales,
          nomination_count: nominationCount,
          cashless_sales_total: effectiveCashlessTech + effectiveCashlessRetail,
          paid_leaves: staffPaidLeaves
        }
      },
      created_at: serverTimestamp()
    };

    const newDocRef = doc(colRef);
    newBatch.set(newDocRef, statementPayload);
  }

  await newBatch.commit();
  return { success: true };
}

export async function closeMonthlyStatements(year: number, month: number) {
  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  try {
    const colRef = collection(db, STATEMENTS_COLLECTION);
    const q = query(colRef, where("target_month", "==", targetMonth), where("status", "==", "draft"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { success: false, error: "該当月のデータが見つかりません" };
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(d.ref, { status: "closed", updated_at: serverTimestamp() });
    });
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateStatementMetrics(
  id: string, 
  data: { 
    worked_hours?: number; 
    worked_days?: number;
    adjustments?: MonthlyStatement["adjustments"];
  }
) {
  try {
    const docRef = doc(db, STATEMENTS_COLLECTION, id);
    const snap = await getDocs(query(collection(db, STATEMENTS_COLLECTION), where("__name__", "==", id)));
    if (snap.empty) return { success: false, error: "データが見つかりません" };
    
    const currentData = snap.docs[0].data() as MonthlyStatement;
    if (currentData.status === "closed") return { success: false, error: "確定済みのデータは編集できません" };

    const newMetrics = {
      ...currentData.details.metrics,
      worked_hours: data.worked_hours ?? currentData.details.metrics.worked_hours,
      worked_days: data.worked_days ?? currentData.details.metrics.worked_days
    };

    const newAdjustments = data.adjustments || currentData.adjustments;
    const contracts = await getContractsList();
    const [targetYear, targetMonth] = currentData.target_month.split("-").map(Number);
    const activeContracts = getActiveContractsForMonth(contracts, targetYear, targetMonth);
    const contract = activeContracts.find(c => c.staff_id === currentData.staff_id);

    let baseAmount = currentData.base_amount;
    let transportFee = newAdjustments?.transport_fee_override ?? currentData.details.transport_fee;

    if (contract && contract.contract_type === "hourly") {
      baseAmount = Math.floor((newMetrics.worked_hours || 0) * (contract.hourly_wage || 0));
    }

    const social = currentData.details.social_insurance ? {
      ...currentData.details.social_insurance,
      health: newAdjustments?.health_insurance_override ?? currentData.details.social_insurance.health,
      pension: newAdjustments?.pension_override ?? currentData.details.social_insurance.pension,
      employment: newAdjustments?.employment_insurance_override ?? currentData.details.social_insurance.employment,
      income_tax: newAdjustments?.income_tax_override ?? currentData.details.social_insurance.income_tax,
      resident_tax: newAdjustments?.resident_tax_override ?? currentData.details.social_insurance.resident_tax,
      childcare: newAdjustments?.childcare_support_override ?? currentData.details.social_insurance.childcare ?? 0,
    } : undefined;

    const totalDeductions = social ? (social.health + social.pension + social.employment + social.income_tax + social.resident_tax + (social.childcare || 0)) : currentData.total_deductions;
    const customAdjustTotal = (newAdjustments?.custom_adjustments || []).reduce((acc, curr) => acc + curr.amount, 0);

    const finalPaidAmount = baseAmount + currentData.total_allowances + customAdjustTotal - totalDeductions + (currentData.details.tax_addition || 0);

    await updateDoc(docRef, {
      base_amount: baseAmount,
      total_deductions: totalDeductions,
      final_paid_amount: finalPaidAmount,
      adjustments: newAdjustments,
      "details.metrics": newMetrics,
      "details.social_insurance": social,
      "details.transport_fee": transportFee,
      updated_at: serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating statement:", error);
    return { success: false, error: error.message };
  }
}

export async function createManualStatement(data: {
  staff_id: string;
  staff_name: string;
  target_month: string;
  type: "salary" | "reward";
  base_amount: number;
  total_allowances: number;
  total_deductions: number;
  final_paid_amount: number;
  work_location?: string;
  note?: string;
  details: MonthlyStatement["details"];
}) {
  try {
    const colRef = collection(db, STATEMENTS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...data,
      status: "draft",
      created_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: "monthly_statements",
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: { staff_name: data.staff_name, target_month: data.target_month },
      actor: "管理者"
    });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating manual statement:", error);
    return { success: false, error: error.message };
  }
}

export async function getStaffPayrollDefaultValues(staffId: string, year: number, month: number) {
  try {
    const contracts = await getContractsList();
    const activeContracts = getActiveContractsForMonth(contracts, year, month);
    const contract = activeContracts.find(c => c.staff_id === staffId);
    if (!contract) {
      return { success: false, error: "該当スタッフの契約情報が登録されていません。" };
    }

    // Retrieve staff profile to get fallback hourly_wage
    const staffSnap = await getDocs(query(collection(db, "staff_profiles"), where("__name__", "==", staffId)));
    let staffProfileHourlyWage = 0;
    if (!staffSnap.empty) {
      staffProfileHourlyWage = staffSnap.docs[0].data().hourly_wage || 0;
    }
    const finalHourlyWage = contract.hourly_wage || staffProfileHourlyWage || 0;
    
    const sales = await getMonthlySales(year, month);
    const allowances = await getMonthlyAllowances(year, month);
    const attendances = await getMonthlyAttendance(year, month);
    
    const staffNameNormal = normalizeStaffName(contract.staff_name);
    const staffSales = sales.filter((s: any) => s.staff_name && normalizeStaffName(s.staff_name) === staffNameNormal);
    const staffAllowances = allowances.filter((a: any) => a.staff_name && normalizeStaffName(a.staff_name) === staffNameNormal);
    const staffAttendances = attendances.filter((a: any) => a.staff_name && normalizeStaffName(a.staff_name) === staffNameNormal);

    const storesWorkedSet = new Set<string>();
    staffAttendances.forEach((att: any) => {
      if (att.store) {
        storesWorkedSet.add(att.store);
      }
    });
    const storesWorked = Array.from(storesWorkedSet).filter(Boolean);
    const storeLocation = storesWorked.length > 0 ? storesWorked.join("・") : "";

    const storeSalesBreakdown: Record<string, {
      techSales: number;
      techCashless: number;
      productSales: number;
      productCashless: number;
    }> = {};

    for (const sale of staffSales) {
      const storeName = sale.store_name || "不明";
      if (!storeSalesBreakdown[storeName]) {
        storeSalesBreakdown[storeName] = { techSales: 0, techCashless: 0, productSales: 0, productCashless: 0 };
      }
      const netTechSales = Math.max(0, sale.tech_sales - (sale.discount || 0));
      storeSalesBreakdown[storeName].techSales += netTechSales;
      storeSalesBreakdown[storeName].productSales += sale.product_sales;
      if (sale.payment_method !== "現金" && sale.payment_method !== "不明") {
        storeSalesBreakdown[storeName].techCashless += netTechSales;
        storeSalesBreakdown[storeName].productCashless += sale.product_sales;
      }
    }

    // Calculate worked days & hours
    const workedDays = staffAttendances.length;
    let workedHours = 0;
    staffAttendances.forEach((record: any) => {
       const start = record.effective_clock_in ? new Date(record.effective_clock_in) : (record.clock_in ? new Date(new Date(record.clock_in).getTime() + 30 * 60 * 1000) : null);
       const end = record.effective_clock_out ? new Date(record.effective_clock_out) : (record.clock_out ? new Date(record.clock_out) : null);
       if (start && end) {
          const diffMs = end.getTime() - start.getTime();
          let diffMins = Math.floor(diffMs / 60000);
          diffMins -= (record.break_minutes || 0);
          if (diffMins > 480) diffMins = 480;
          workedHours += (diffMins / 60);
       }
    });
    workedHours = Math.round(workedHours * 10) / 10;
    const finalWorkedDays = workedDays > 0 ? workedDays : 21;
    const finalWorkedHours = workedHours > 0 ? workedHours : (contract.contract_type === "hourly" ? 0 : 168);

    const contractCustomAllowanceTotal = (contract.custom_allowances || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const type: "salary" | "reward" = contract.contract_type === "outsourcing" ? "reward" : "salary";
    let base_amount = 0;
    let taxAddition = 0;
    
    let health = 0;
    let pension = 0;
    let employment = 0;
    let incomeTax = 0;
    let residentTax = 0;
    let childcare = 0;

    // Categorized Database Allowances
    const transportAllowanceDb = staffAllowances
      .filter((a: any) => a.type === "transport")
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);
    
    const nominationAllowanceDb = staffAllowances
      .filter((a: any) => a.type === "nomination")
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const reviewAllowanceDb = staffAllowances
      .filter((a: any) => a.type === "review")
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const blogAllowanceDb = staffAllowances
      .filter((a: any) => ["blog", "sns"].includes(a.type))
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const otherAllowanceDb = staffAllowances
      .filter((a: any) => ["other", "treatment"].includes(a.type))
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    let nominationCount = 0;
    for (const sale of staffSales) {
      if (sale.is_nominated) nominationCount += 1;
    }
    const nominationReward = nominationCount * (contract.nomination_fee || 0);

    let transportAllowance = transportAllowanceDb;
    let nominationAllowance = nominationAllowanceDb + nominationReward;
    let reviewAllowance = reviewAllowanceDb;
    let blogAllowance = blogAllowanceDb;
    let executiveAllowance = otherAllowanceDb + contractCustomAllowanceTotal;

    if (contract.contract_type === "hourly") {
      let totalMinutesWorked = 0;
      for (const att of staffAttendances) {
        const start = att.effective_clock_in ? new Date(att.effective_clock_in) : (att.clock_in ? new Date(new Date(att.clock_in).getTime() + 30 * 60 * 1000) : null);
        const end = att.effective_clock_out ? new Date(att.effective_clock_out) : (att.clock_out ? new Date(att.clock_out) : null);
        if (start && end && att.status === "normal") {
          const inMs = start.getTime();
          const outMs = end.getTime();
          const workedMinsRaw = Math.floor((outMs - inMs) / 60000);
          const workedMinsNet = Math.max(0, workedMinsRaw - att.break_minutes);
          totalMinutesWorked += workedMinsNet;
        }
      }
      const totalHours = totalMinutesWorked > 0 ? (totalMinutesWorked / 60) : 0;
      base_amount = Math.floor(totalHours * finalHourlyWage);

      const totalAllowancesTmp = transportAllowance + nominationAllowance + reviewAllowance + blogAllowance + executiveAllowance;
      const taxes = calculatePayrollTaxes({
        baseSalary: base_amount,
        allowances: totalAllowancesTmp - transportAllowance,
        transportFee: transportAllowance,
        dependentsCount: 0
      });
      health = taxes.healthInsurance;
      pension = taxes.pension;
      employment = taxes.employmentInsurance;
      incomeTax = taxes.incomeTax;
      residentTax = taxes.residentTax;
      childcare = taxes.childcareSupport || 0;
    } else if (contract.contract_type === "monthly") {
      let totalTechSales = 0;
      let totalProductSales = 0;
      
      for (const sale of staffSales) {
        const netTechSales = Math.max(0, sale.tech_sales - (sale.discount || 0));
        totalTechSales += netTechSales;
        totalProductSales += sale.product_sales;
      }

      const techSalesTaxFree = Math.floor(totalTechSales / 1.1);
      const productSalesTaxFree = Math.floor(totalProductSales / 1.1);
      
      const quota = contract.tech_sales_quota || 0;
      let techCommission = 0;
      if (techSalesTaxFree > quota) {
         techCommission = Math.floor((techSalesTaxFree - quota) * (contract.tech_sales_ratio / 100));
      }
      
      const productCommission = calculateProductCommission(staffSales, contract, 0);
      
      base_amount = (contract.monthly_base_salary || 0) + techCommission + productCommission;
      transportAllowance = 17950; // Standard transport fee for monthly contracts

      const totalAllowancesTmp = transportAllowance + nominationAllowance + reviewAllowance + blogAllowance + executiveAllowance;
      const taxes = calculatePayrollTaxes({
        baseSalary: base_amount,
        allowances: totalAllowancesTmp - transportAllowance,
        transportFee: transportAllowance,
        dependentsCount: 0
      });
      health = taxes.healthInsurance;
      pension = taxes.pension;
      employment = taxes.employmentInsurance;
      incomeTax = taxes.incomeTax;
      residentTax = taxes.residentTax;
      childcare = taxes.childcareSupport || 0;
    } else if (contract.contract_type === "tier_monthly") {
      let totalTechSales = 0;
      let totalProductSales = 0;
      
      for (const sale of staffSales) {
        const netTechSales = Math.max(0, sale.tech_sales - (sale.discount || 0));
        totalTechSales += netTechSales;
        totalProductSales += sale.product_sales;
      }

      const techSalesTaxFree = Math.floor(totalTechSales / 1.1);
      const productSalesTaxFree = Math.floor(totalProductSales / 1.1);
      const personalTaxFreeSales = techSalesTaxFree + productSalesTaxFree;
      const baseMonthlySalary = contract.monthly_base_salary || 280000;
      
      let incentive = 0;
      if (personalTaxFreeSales >= 400000) {
          incentive = Math.floor(personalTaxFreeSales / 50000) * 5000 - 35000;
      }
      
      base_amount = baseMonthlySalary + incentive;
      transportAllowance = 17950; // Standard transport fee

      const totalAllowancesTmp = transportAllowance + nominationAllowance + reviewAllowance + blogAllowance + executiveAllowance;
      const taxes = calculatePayrollTaxes({
        baseSalary: base_amount,
        allowances: totalAllowancesTmp - transportAllowance,
        transportFee: transportAllowance,
        dependentsCount: 0
      });
      health = taxes.healthInsurance;
      pension = taxes.pension;
      employment = taxes.employmentInsurance;
      incomeTax = taxes.incomeTax;
      residentTax = taxes.residentTax;
      childcare = taxes.childcareSupport || 0;
    } else if (contract.contract_type === "outsourcing") {
      let totalTechSales = 0;
      let totalProductSales = 0;
      let cashlessTechSales = 0;
      let cashlessProductSales = 0;
      let totalPortalFees = 0;
      
      for (const sale of staffSales) {
        const netTechSales = Math.max(0, sale.tech_sales - (sale.discount || 0));
        totalTechSales += netTechSales;
        totalProductSales += sale.product_sales;
        totalPortalFees += (sale.portal_fee || 0);
        if (sale.payment_method !== "現金" && sale.payment_method !== "不明") {
           cashlessTechSales += netTechSales;
           cashlessProductSales += sale.product_sales;
        }
      }

      const techTaxDeduction = Math.floor(totalTechSales * 0.1); 
      const techCashlessFee = contract.deduction_cashless_ratio > 0 ? Math.floor(cashlessTechSales * (contract.deduction_cashless_ratio / 100)) : 0;
      const commissionableTechSales = Math.max(0, totalTechSales - techTaxDeduction - techCashlessFee - totalPortalFees);
      const baseTechSalary = Math.floor(commissionableTechSales * (contract.tech_sales_ratio / 100));

      const cashlessProductSalesTmp = staffSales.filter(s => s.payment_method !== "現金" && s.payment_method !== "不明").reduce((sum, s) => sum + s.product_sales, 0);
      const effectiveCashlessRetailTmp = cashlessProductSalesTmp;
      const baseProductSalary = calculateProductCommission(staffSales, contract, effectiveCashlessRetailTmp);
      
      base_amount = baseTechSalary + baseProductSalary;

      const totalAllowancesTmp = transportAllowance + nominationAllowance + reviewAllowance + blogAllowance + executiveAllowance;
      const intermediatePaidAmount = base_amount + totalAllowancesTmp;
      if (!contract.deduction_consumption_tax) {
         taxAddition = Math.floor(intermediatePaidAmount * 0.1); 
      }
    }

    const total_allowances = transportAllowance + nominationAllowance + reviewAllowance + blogAllowance + executiveAllowance;

    return {
      success: true,
      data: {
        type,
        contract_type: contract.contract_type,
        contract,
        base_amount,
        total_allowances,
        transportAllowance,
        nominationAllowance,
        reviewAllowance,
        blogAllowance,
        executiveAllowance,
        taxAddition,
        health,
        pension,
        employment,
        incomeTax,
        residentTax,
        childcare,
        workedDays: finalWorkedDays,
        workedHours: finalWorkedHours,
        hourly_wage: finalHourlyWage,
        work_location: storeLocation,
        storeSalesBreakdown
      }
    };
  } catch (error: any) {
    console.error("Error generating default payslip values:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteStatement(id: string) {
  try {
    const docRef = doc(db, STATEMENTS_COLLECTION, id);
    const snap = await getDocs(query(collection(db, STATEMENTS_COLLECTION), where("__name__", "==", id)));
    if (snap.empty) return { success: false, error: "データが見つかりません" };
    
    const currentData = snap.docs[0].data() as MonthlyStatement;
    if (currentData.status === "closed") return { success: false, error: "確定済みのデータは削除できません" };

    await deleteDoc(docRef);

    await addAuditLog({
      table_name: "monthly_statements",
      record_id: id,
      action: "DELETE",
      old_data: { staff_name: currentData.staff_name, target_month: currentData.target_month },
      new_data: null,
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting statement:", error);
    return { success: false, error: error.message };
  }
}

export async function updateManualStatement(id: string, data: {
  base_amount: number;
  total_allowances: number;
  total_deductions: number;
  final_paid_amount: number;
  work_location?: string;
  note?: string;
  status?: "draft" | "closed";
  adjustments?: MonthlyStatement["adjustments"];
  details: MonthlyStatement["details"];
}) {
  try {
    const docRef = doc(db, STATEMENTS_COLLECTION, id);
    const snap = await getDocs(query(collection(db, STATEMENTS_COLLECTION), where("__name__", "==", id)));
    if (snap.empty) return { success: false, error: "データが見つかりません" };
    
    const currentData = snap.docs[0].data() as MonthlyStatement;
    if (currentData.status === "closed" && data.status !== "draft") {
      return { success: false, error: "確定済みのデータは編集できません" };
    }

    const updatePayload: any = {
      base_amount: data.base_amount,
      total_allowances: data.total_allowances,
      total_deductions: data.total_deductions,
      final_paid_amount: data.final_paid_amount,
      work_location: data.work_location ?? "",
      note: data.note ?? "",
      details: data.details,
      updated_at: serverTimestamp()
    };

    if (data.adjustments !== undefined) {
      updatePayload.adjustments = data.adjustments;
    }

    if (data.status) {
      updatePayload.status = data.status;
    }

    await updateDoc(docRef, updatePayload);

    await addAuditLog({
      table_name: "monthly_statements",
      record_id: id,
      action: "UPDATE",
      old_data: { staff_name: currentData.staff_name, target_month: currentData.target_month, status: currentData.status },
      new_data: { staff_name: currentData.staff_name, target_month: currentData.target_month, status: data.status || currentData.status },
      actor: "管理者"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating manual statement:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStatementStatus(id: string, status: "draft" | "closed") {
  try {
    const docRef = doc(db, STATEMENTS_COLLECTION, id);
    const snap = await getDocs(query(collection(db, STATEMENTS_COLLECTION), where("__name__", "==", id)));
    if (snap.empty) return { success: false, error: "データが見つかりません" };
    
    const currentData = snap.docs[0].data() as MonthlyStatement;

    await updateDoc(docRef, {
      status,
      updated_at: serverTimestamp()
    });
    
    await addAuditLog({
      table_name: "monthly_statements",
      record_id: id,
      action: "UPDATE",
      old_data: { staff_name: currentData.staff_name, target_month: currentData.target_month, status: currentData.status },
      new_data: { staff_name: currentData.staff_name, target_month: currentData.target_month, status },
      actor: "管理者"
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating statement status:", error);
    return { success: false, error: error.message };
  }
}
