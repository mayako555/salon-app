import { upsertContract } from "./src/app/contracts/actions";

async function run() {
  const data = {
    staff_id: "BiMuCrlroHTOKhYECVJH",
    staff_name: "萩原有以",
    contract_type: "hourly" as const,
    grade: "P1", // Default part-time grade
    job_title: "パート",
    hourly_wage: 1190,
    monthly_base_salary: 0,
    business_allowance: 0,
    attendance_allowance: 0,
    service_year_allowance: 0,
    tech_sales_quota: 0,
    tech_sales_threshold: 0,
    tech_sales_ratio: 0,
    product_sales_ratio: 10,
    nomination_fee: 300,
    transport_fee_limit: 15000,
    deduction_consumption_tax: false,
    deduction_cashless_ratio: 0,
    deduction_minimo_fee: false,
    deduction_rakuten_fee: false,
    deduction_nailie_fee: false,
    deduction_nomination_fee: false,
    valid_from: "2026-05-01",
    valid_to: null,
    custom_allowances: [],
  };

  const res = await upsertContract(data, "overwrite");
  console.log(JSON.stringify(res, null, 2));
}

run();
