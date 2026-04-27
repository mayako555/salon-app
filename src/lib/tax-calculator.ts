/**
 * Official Japanese Payroll Taxation Simulator (Reiwa 6/7 Target)
 * 
 * Provides automated extraction of standard Japanese payroll deductions:
 * 1. Employment Insurance (雇用保険) => 0.6% of Gross 
 * 2. Health Insurance (健康保険) => Approx 5.06% of Standard Bracket (Hyogo)
 * 3. Employee Pension (厚生年金) => 9.15% of Standard Bracket
 * 4. Income Tax (所得税) => Using progressive approximation against withholding tables
 */

export function calculatePayrollTaxes(params: {
  baseSalary: number;
  allowances: number;
  transportFee: number;
  dependentsCount: number;
}) {
  const { baseSalary, allowances, transportFee, dependentsCount } = params;

  // 1. 総支給額 (通勤手当含む)
  const grossWithTransport = baseSalary + allowances + transportFee;
  if (grossWithTransport <= 0) {
    return { employmentInsurance: 0, healthInsurance: 0, pension: 0, incomeTax: 0, residentTax: 0, totalSocialInsurances: 0 };
  }

  // --- 雇用保険 (Employment Insurance) ---
  // 一般の事業: 労働者負担 0.6% (0.006)
  const employmentInsurance = Math.floor(grossWithTransport * 0.006);

  // --- 標準報酬月額 (Standard Remuneration Bracket) 算定 ---
  // 簡易的なテーブルマッピング (20万〜30万の主要レンジをカバー)
  let standardRemuneration = Math.floor(grossWithTransport / 10000) * 10000;
  if (grossWithTransport >= 230000 && grossWithTransport < 250000) standardRemuneration = 240000;
  else if (grossWithTransport >= 250000 && grossWithTransport < 270000) standardRemuneration = 260000;
  else if (grossWithTransport >= 270000 && grossWithTransport < 290000) standardRemuneration = 280000;

  // --- 社会保険料 (Social Insurances) ---
  // 健康保険 (兵庫県・協会けんぽ基準 約5.06%) / 厚生年金 (全国一律 9.15%)
  const healthInsurance = Math.round(standardRemuneration * 0.0506); 
  const pension = Math.round(standardRemuneration * 0.0915);

  const totalSocialInsurances = employmentInsurance + healthInsurance + pension;

  // --- 所得税 (Income Tax - Withholding/源泉徴収税額) ---
  // 課税対象額 = (基本給 + 手当類) - 社会保険料合計 (※通勤手当は所得税法上非課税)
  const taxableBase = (baseSalary + allowances) - totalSocialInsurances;

  let incomeTax = 0;
  if (taxableBase >= 88000) {
    // 令和6年度 源泉徴収税額表（甲欄・扶養0人）の近似ロジック
    if (taxableBase >= 88000 && taxableBase < 100000) incomeTax = 300;
    else if (taxableBase < 150000) incomeTax = 2400 + Math.floor((taxableBase - 150000) * 0.02);
    else if (taxableBase >= 186000 && taxableBase < 189000) incomeTax = 6110;
    else if (taxableBase >= 189000 && taxableBase < 192000) incomeTax = 6380;
    else if (taxableBase >= 192000 && taxableBase < 195000) incomeTax = 6650;
    else if (taxableBase >= 200000) incomeTax = Math.floor(taxableBase * 0.038); 
    else incomeTax = Math.floor(taxableBase * 0.031); 
  }
  
  if (incomeTax < 0) incomeTax = 0;

  // 住民税 (Resident Tax)
  // 住民税は前年度の所得に基づくため自動計算不可能。
  // 本システムでは一律0(またはマスタ値)とし、経理担当からのCSVインポート時に更新させる前提とする。
  const residentTax = 0; 

  return {
    employmentInsurance,
    healthInsurance,
    pension,
    incomeTax,
    residentTax,
    totalSocialInsurances
  };
}
