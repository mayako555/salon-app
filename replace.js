const fs = require('fs');
const file = "/Users/mayako/.gemini/antigravity/scratch/salon-app/src/app/payroll/actions.ts";
let content = fs.readFileSync(file, "utf8");

const helper = `
function calculateProductCommission(sales: any[], contract: any, cashlessRetail: number) {
  let customBaseSum = 0;
  let customOriginalSum = 0;

  for (const sale of sales) {
    if (sale.product_sales > 0 && sale.menu_course) {
      const menus = sale.menu_course.split(/ \\+ |\\, /);
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
`;

if (!content.includes("calculateProductCommission")) {
  content = content.replace('export async function generateStatements', helper + '\nexport async function generateStatements');
}

// 1. generateStatements: monthly
content = content.replace(
  'const productCommission = Math.floor(productSalesTaxFree * (contract.product_sales_ratio / 100));',
  'const productCommission = calculateProductCommission(staffSales, contract, effectiveCashlessRetail);'
);

// 2. generateStatements: tier_monthly
content = content.replace(
  'const baseProductSalary = Math.floor(commissionableProductSales * (contract.product_sales_ratio / 100));',
  'const baseProductSalary = calculateProductCommission(staffSales, contract, effectiveCashlessRetail);'
);

// 3. updateStatementMetrics: monthly
// Need to find the exact line in updateStatementMetrics. In updateStatementMetrics, it uses staffSales, and effectiveCashlessRetail doesn't exist, we must use `cashlessProductSales`.
// Let's create `cashlessProductSales` in updateStatementMetrics for monthly?
// Wait, `cashlessProductSales` is calculated in `updateStatementMetrics` only for `outsourcing`. For `monthly`, it's not needed (no cashless fee deducted).
