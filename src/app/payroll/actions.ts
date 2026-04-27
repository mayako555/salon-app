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

  // 2. Clear old draft statements for this month
  const qDraft = query(colRef, where("target_month", "==", targetMonth), where("status", "==", "draft"));
  const draftSnapshot = await getDocs(qDraft);
  const batch = writeBatch(db);
  draftSnapshot.docs.forEach(d => {
    batch.delete(d.ref);
  });
  await batch.commit();

  const newBatch = writeBatch(db);

  // 3. Fetch dependencies
  const contracts = await getContractsList(); // from the active ones
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
          
          // Subtract break time
          diffMins -= (record.break_minutes || 0);

          // Cap at 8 hours (480 minutes) per shift to fit scheduled bounds
          if (diffMins > 480) {
             diffMins = 480;
          }

          workedHours += (diffMins / 60);
       }
    });

    workedHours = Math.round(workedHours * 10) / 10;
    
    // Fallbacks if no live punches yet
    const finalWorkedDays = workedDays > 0 ? workedDays : 21;
    const finalWorkedHours = workedHours > 0 ? workedHours : (contract.contract_type === "hourly" ? 80 : 168);

    if (contract.contract_type === "hourly") {
      // ===== HOURLY WAGE CALCULATION ======
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

      const intermediatePaidAmount = baseHourlySalary + allowanceTotal;
      
      // Calculate tax and deductions for standard employees
      // They typically don't have invoice additions; tax logic might involve deduction strings (源泉など) 
      // but for MVP consistency we'll just push flat amounts unless designated otherwise.
      const taxAddition = 0; // Employees don't invoice add
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
        details: {
          base_tech_salary: 0,
          base_product_salary: 0,
          nomination_reward: 0,
          transport_fee: 0,
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
      totalTechSales += sale.tech_sales;
      totalProductSales += sale.product_sales;
      totalPortalFees += (sale.portal_fee || 0);
      
      if (sale.is_nominated) nominationCount += 1;

      if (sale.payment_method !== "現金" && sale.payment_method !== "不明") {
         cashlessTechSales += sale.tech_sales;
         cashlessProductSales += sale.product_sales;
      }
    }

    // ====== MIDDLE ROUTER FOR CONTRACTS NEEDING SALES AGGREGATION ======
    if (contract.contract_type === "monthly") {
      // ===== MONTHLY WAGE CALCULATION (e.g. Shibata) ======
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

      const base_amount = baseMonthlySalary + totalCommission;
      const cashlessDeduction = 0;
      const taxAddition = 0;
      
      const transportFee = 17950; // Mock fixed commuter pass

      // Run Japanese Tax Calculation
      const taxes = calculatePayrollTaxes({
        baseSalary: base_amount,
        allowances: allowanceTotal,
        transportFee: transportFee,
        dependentsCount: 0
      });

      const totalDeductions = taxes.totalSocialInsurances + taxes.incomeTax + taxes.residentTax;

      // Final = payments - deductions (grossWithTransport is payments + transport, but final paid is exactly grossWithTransport - totalDeductions)
      const grossWithTransport = base_amount + allowanceTotal + transportFee;
      let final_paid = grossWithTransport - totalDeductions;

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
        details: {
          base_tech_salary: techCommission,
          base_product_salary: productCommission,
          nomination_reward: nominationReward,
          transport_fee: transportFee,
          cashless_deduction: cashlessDeduction,
          tax_addition: taxAddition,
          social_insurance: {
             employment: taxes.employmentInsurance,
             health: taxes.healthInsurance,
             pension: taxes.pension,
             income_tax: taxes.incomeTax,
             resident_tax: taxes.residentTax
          },
          metrics: {
            total_tech_sales: totalTechSales,
            total_product_sales: totalProductSales, 
            nomination_count: nominationCount,
            cashless_sales_total: cashlessTechSales + cashlessProductSales,
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
      // ===== TIER MONTHLY WAGE CALCULATION (e.g. Ohtani) ======
      const techSalesTaxFree = Math.floor(totalTechSales / 1.1);
      const productSalesTaxFree = Math.floor(totalProductSales / 1.1);
      
      const personalTaxFreeSales = techSalesTaxFree + productSalesTaxFree;
      const baseMonthlySalary = contract.monthly_base_salary || 280000;
      
      let incentive = 0;
      if (personalTaxFreeSales >= 400000) {
          // Increment is 5,000 per 50,000 threshold starting at 400,000.
          // 400k-449k -> math.floor(400k/50k)*5000 - 35000 = 8*5k - 35k = 5000
          // 650k -> math.floor(650k/50k)*5k - 35k = 13*5k - 35k = 30000
          incentive = Math.floor(personalTaxFreeSales / 50000) * 5000 - 35000;
      }
      
      const nominationReward = nominationCount * contract.nomination_fee; // Ohtani's table doesn't mention flat nomination but handles it via allowances or zeroing it out.
      const allowanceTotal = staffAllowances.reduce((acc: any, curr: any) => acc + curr.amount, 0) + contractCustomAllowanceTotal;

      const intermediatePaidAmount = baseMonthlySalary + incentive + nominationReward + allowanceTotal;
      const taxAddition = 0; 
      const finalPaidAmount = intermediatePaidAmount + taxAddition;

      const statementPayload = {
        staff_id: contract.staff_id,
        staff_name: contract.staff_name || "不明",
        target_month: targetMonth,
        type: "salary", 
        base_amount: baseMonthlySalary + incentive, // Treating incentive as part of base performance salary for UI consistency
        total_allowances: allowanceTotal,
        total_deductions: 0,
        final_paid_amount: finalPaidAmount,
        status: "draft",
        details: {
          base_tech_salary: incentive, // We map the total incentive here so the UI can represent it
          base_product_salary: 0,
          nomination_reward: nominationReward,
          transport_fee: 0,
          cashless_deduction: 0,
          tax_addition: taxAddition,
          metrics: {
            total_tech_sales: totalTechSales,
            total_product_sales: totalProductSales, 
            nomination_count: nominationCount,
            cashless_sales_total: cashlessTechSales + cashlessProductSales,
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

    // ====== OUTSOURCING COMMISSION CALCULATION (Sato Excel Model) ======
    // 1. Tech Base Calculation
    const techTaxDeduction = Math.floor(totalTechSales * 0.1); 
    const techCashlessFee = contract.deduction_cashless_ratio > 0 ? Math.floor(cashlessTechSales * (contract.deduction_cashless_ratio / 100)) : 0;
    
    const commissionableTechSales = Math.max(0, totalTechSales - techTaxDeduction - techCashlessFee - totalPortalFees);
    const baseTechSalaryFloat = commissionableTechSales * (contract.tech_sales_ratio / 100);
    const baseTechSalary = Math.floor(baseTechSalaryFloat);
    
    // 2. Product Base Calculation
    const productTaxDeduction = Math.floor(totalProductSales * 0.1);
    const productCashlessFee = contract.deduction_cashless_ratio > 0 ? Math.floor(cashlessProductSales * (contract.deduction_cashless_ratio / 100)) : 0;
    
    const commissionableProductSales = Math.max(0, totalProductSales - productTaxDeduction - productCashlessFee);
    const baseProductSalaryFloat = commissionableProductSales * (contract.product_sales_ratio / 100);
    const baseProductSalary = Math.floor(baseProductSalaryFloat);
    
    // 3. Nomination is rewarded flatly based on count (e.g. 550 flat per sub-item)
    const nominationReward = nominationCount * contract.nomination_fee;
    
    let baseAmount = baseTechSalary + baseProductSalary + nominationReward;

    // 4. Allowances
    const allowanceTotal = staffAllowances.reduce((acc, curr) => acc + curr.amount, 0) + contractCustomAllowanceTotal;

    // 5. Final Calculations (Invoice Additions & Manager allowances)
    let intermediatePaidAmount = baseAmount + allowanceTotal;
    
    let taxAddition = 0;
    // If they are an invoice issuer (we assume they are unless explicitly marked to 'deduct' tax in the old logic)
    // Actually, Sato's excel adds 10% to the final computed rewards.
    if (!contract.deduction_consumption_tax) {
       // Since the db flag was "deduction_consumption_tax", false means "don't deduct, give it to them" -> Add 10% tax!
       taxAddition = Math.floor(intermediatePaidAmount * 0.1); 
    }

    const finalPaidAmount = intermediatePaidAmount + taxAddition;
    
    // Summarizing deductions purely for the UI display format
    // Total deductions here technically represent the burden assumed by the staff *before* commission multiplication, 
    // but the UI expects a pure "-¥" for display. 
    // Wait, the UI uses `total_deductions` to subtract from `base_amount + total_allowances`!
    // Since our `baseAmount` is ALREADY reduced, we shouldn't subtract them again!
    // So `totalDeductions` as an out-of-pocket UI metric should just be 0, or we alter the math representation to be "Raw Sales Base -> Deductions -> Commission = Final".
    // Since the database specifies `target_details`, let's just emit totalDeductions = 0, and cleanly display that tax is an *Addition* instead of a Deduction in the new Excel model.
    const totalDeductions = 0;

    // Create statement
    const statementPayload = {
      staff_id: contract.staff_id,
      staff_name: contract.staff_name || "不明",
      target_month: targetMonth,
      type: "reward", // Assuming reward for contracts, salary for normal employments
      base_amount: baseAmount,
      total_allowances: allowanceTotal,
      total_deductions: totalDeductions,
      final_paid_amount: finalPaidAmount,
      status: "draft",
      details: {
        base_tech_salary: baseTechSalary,
        base_product_salary: baseProductSalary,
        nomination_reward: nominationReward,
        transport_fee: 0, // Mock
        cashless_deduction: techCashlessFee + productCashlessFee,
        tax_addition: taxAddition,
        social_insurance: undefined,
        metrics: {
          total_tech_sales: totalTechSales,
          total_product_sales: totalProductSales,
          nomination_count: nominationCount,
          cashless_sales_total: cashlessTechSales + cashlessProductSales
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
    console.error("Error closing statements:", error);
    return { success: false, error: error.message };
  }
}
