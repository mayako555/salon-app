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
import { addAuditLog } from "@/app/audit/actions";
import { calculatePayrollTaxes } from "@/lib/tax-calculator";

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
  adjustments?: {
    tech_cashless_sales_override?: number;
    retail_cashless_sales_override?: number;
    transport_fee_override?: number;
    health_insurance_override?: number;
    pension_override?: number;
    employment_insurance_override?: number;
    income_tax_override?: number;
    resident_tax_override?: number;
    custom_adjustments?: { name: string; amount: number }[];
  };
  details: {
    base_tech_salary: number;
    base_product_salary: number;
    nomination_reward: number;
    transport_fee: number;
    cashless_deduction: number;
    tax_addition: number; 
    social_insurance?: {
      employment: number;
      health: number;
      pension: number;
      income_tax: number;
      resident_tax: number;
    };
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

export async function generateStatements(year: number, month: number) {
  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  
  // 1. Check if closed
  const colRef = collection(db, STATEMENTS_COLLECTION);
  const qClosed = query(colRef, where("target_month", "==", targetMonth), where("status", "==", "closed"));
  const closedSnapshot = await getDocs(qClosed);
  
  if (!closedSnapshot.empty) {
    return { success: false, error: "すでに締め処理が完了している月です。再計算できません。" };
  }

  // 2. Fetch existing draft statements to preserve manual adjustments
  const qDraft = query(colRef, where("target_month", "==", targetMonth), where("status", "==", "draft"));
  const draftSnapshot = await getDocs(qDraft);
  
  const adjustmentMap: Record<string, MonthlyStatement["adjustments"]> = {};
  draftSnapshot.docs.forEach(d => {
    const data = d.data() as MonthlyStatement;
    if (data.adjustments) {
      adjustmentMap[data.staff_id] = data.adjustments;
    }
  });

  const batch = writeBatch(db);
  draftSnapshot.docs.forEach(d => {
    batch.delete(d.ref);
  });
  await batch.commit();

  const newBatch = writeBatch(db);

  // 3. Fetch dependencies
  const contracts = await getContractsList(); 
  const sales = await getMonthlySales(year, month);
  const allowances = await getMonthlyAllowances(year, month);
  const attendances = await getMonthlyAttendance(year, month);

  await addAuditLog({
     table_name: "monthly_statements",
     record_id: `target-${targetMonth}`,
     action: "CALCULATE",
     old_data: null,
     new_data: { message: `Generated Payroll for ${contracts.length} active staff members` },
     actor: "System Administrator"
  });

  // 4. Calculate for each contract
  for (const contract of contracts) {
    const staffSales = sales.filter((s: any) => s.staff_name === contract.staff_name);
    const staffAllowances = allowances.filter((a: any) => a.staff_name === contract.staff_name);
    const staffAttendances = attendances.filter((a: AttendanceRecord) => a.staff_name === contract.staff_name);

    // Get preserved adjustments
    const preservedAdjusts = adjustmentMap[contract.staff_id];

    // Track custom contract allowances
    const contractCustomAllowanceTotal = (contract.custom_allowances || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);

    // Track real attendance data
    const workedDays = staffAttendances.length;
    let workedHours = 0;

    staffAttendances.forEach((record: AttendanceRecord) => {
       if (record.clock_in && record.clock_out) {
          const inTime = new Date(record.clock_in);
          const outTime = new Date(record.clock_out);
          const diffMs = outTime.getTime() - inTime.getTime();
          let diffMins = Math.floor(diffMs / 60000);
          
          diffMins -= (record.break_minutes || 0);

          if (diffMins > 480) {
             diffMins = 480;
          }

          workedHours += (diffMins / 60);
       }
    });

    workedHours = Math.round(workedHours * 10) / 10;
    
    const finalWorkedDays = workedDays > 0 ? workedDays : 21;
    const finalWorkedHours = workedHours > 0 ? workedHours : (contract.contract_type === "hourly" ? 80 : 168);

    if (contract.contract_type === "hourly") {
      let totalMinutesWorked = 0;
      for (const att of staffAttendances) {
        if (att.clock_in && att.clock_out && att.status === "normal") {
          const inMs = new Date(att.clock_in).getTime();
          const outMs = new Date(att.clock_out).getTime();
          const workedMinsRaw = Math.floor((outMs - inMs) / 60000);
          const workedMinsNet = Math.max(0, workedMinsRaw - att.break_minutes);
          totalMinutesWorked += workedMinsNet;
        }
      }

      const totalHours = totalMinutesWorked / 60;
      const baseHourlySalary = Math.floor(totalHours * (contract.hourly_wage || 0));

      const allowanceTotal = staffAllowances.reduce((acc, curr) => acc + curr.amount, 0) + contractCustomAllowanceTotal;
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
        details: {
          base_tech_salary: 0,
          base_product_salary: 0,
          nomination_reward: 0,
          transport_fee: preservedAdjusts?.transport_fee_override ?? 0,
          cashless_deduction: 0,
          tax_addition: taxAddition,
          metrics: {
            total_tech_sales: 0,
            total_product_sales: 0, 
            nomination_count: 0,
            cashless_sales_total: 0,
            worked_days: finalWorkedDays,
            worked_hours: finalWorkedHours
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
      
      const productCommission = Math.floor(productSalesTaxFree * (contract.product_sales_ratio / 100));
      const nominationReward = nominationCount * contract.nomination_fee;
      
      const baseMonthlySalary = contract.monthly_base_salary || 0;
      const totalCommission = techCommission + productCommission + nominationReward;
      const allowanceTotal = staffAllowances.reduce((acc: any, curr: any) => acc + curr.amount, 0) + contractCustomAllowanceTotal;
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

      const totalDeductions = health + pension + employment + incomeTax + residentTax;
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
        details: {
          base_tech_salary: techCommission,
          base_product_salary: productCommission,
          nomination_reward: nominationReward,
          transport_fee: transportFee,
          cashless_deduction: 0,
          tax_addition: 0,
          social_insurance: {
             employment, health, pension, income_tax: incomeTax, resident_tax: residentTax
          },
          metrics: {
            total_tech_sales: totalTechSales,
            total_product_sales: totalProductSales, 
            nomination_count: nominationCount,
            cashless_sales_total: effectiveCashlessTech + effectiveCashlessRetail,
            worked_days: finalWorkedDays,
            worked_hours: finalWorkedHours
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
      const allowanceTotal = staffAllowances.reduce((acc: any, curr: any) => acc + curr.amount, 0) + contractCustomAllowanceTotal;
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
        details: {
          base_tech_salary: incentive,
          base_product_salary: 0,
          nomination_reward: nominationReward,
          transport_fee: preservedAdjusts?.transport_fee_override ?? 0,
          cashless_deduction: 0,
          tax_addition: 0,
          metrics: {
            total_tech_sales: totalTechSales,
            total_product_sales: totalProductSales, 
            nomination_count: nominationCount,
            cashless_sales_total: effectiveCashlessTech + effectiveCashlessRetail,
            worked_days: finalWorkedDays,
            worked_hours: finalWorkedHours
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
    
    const productTaxDeduction = Math.floor(totalProductSales * 0.1);
    const productCashlessFee = contract.deduction_cashless_ratio > 0 ? Math.floor(effectiveCashlessRetail * (contract.deduction_cashless_ratio / 100)) : 0;
    
    const commissionableProductSales = Math.max(0, totalProductSales - productTaxDeduction - productCashlessFee);
    const baseProductSalary = Math.floor(commissionableProductSales * (contract.product_sales_ratio / 100));
    
    const nominationReward = nominationCount * contract.nomination_fee;
    let baseAmount = baseTechSalary + baseProductSalary + nominationReward;

    const allowanceTotal = staffAllowances.reduce((acc, curr) => acc + curr.amount, 0) + contractCustomAllowanceTotal;
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
      details: {
        base_tech_salary: baseTechSalary,
        base_product_salary: baseProductSalary,
        nomination_reward: nominationReward,
        transport_fee: preservedAdjusts?.transport_fee_override ?? 0,
        cashless_deduction: techCashlessFee + productCashlessFee,
        tax_addition: taxAddition,
        social_insurance: undefined,
        metrics: {
          total_tech_sales: totalTechSales,
          total_product_sales: totalProductSales,
          nomination_count: nominationCount,
          cashless_sales_total: effectiveCashlessTech + effectiveCashlessRetail
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
    const contract = contracts.find(c => c.staff_id === currentData.staff_id);

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
    } : undefined;

    const totalDeductions = social ? (social.health + social.pension + social.employment + social.income_tax + social.resident_tax) : currentData.total_deductions;
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
