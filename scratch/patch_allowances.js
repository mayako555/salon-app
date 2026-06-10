const fs = require('fs');
const path = './src/app/allowances/actions.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'export async function getMonthlyAllowanceTasks(year: number, month: number): Promise<AllowanceTaskStatus[]> {',
  `export async function getMonthlyAllowanceTasks(year: number, month: number): Promise<AllowanceTaskStatus[]> {
  console.log("getMonthlyAllowanceTasks called", year, month);`
);

code = code.replace(
  'const staffList = await getStaffList();',
  `console.log("Fetching staff list...");
    const staffList = await getStaffList();
    console.log("Staff list fetched:", staffList.length);`
);

code = code.replace(
  'const snapshot = await getDocs(q);',
  `console.log("Fetching allowances...");
    const snapshot = await getDocs(q);
    console.log("Allowances fetched:", snapshot.docs.length);`
);

code = code.replace(
  'const monthlySales = await getMonthlySales(year, month);',
  `console.log("Fetching monthly sales...");
    const monthlySales = await getMonthlySales(year, month);
    console.log("Monthly sales fetched:", monthlySales.length);`
);

code = code.replace(
  'const monthlyReviews = await getMonthlyReviews(year, month);',
  `console.log("Fetching monthly reviews...");
    const monthlyReviews = await getMonthlyReviews(year, month);
    console.log("Monthly reviews fetched:", monthlyReviews.length);`
);

fs.writeFileSync(path, code);
