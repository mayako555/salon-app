import { getMonthlySales } from "./src/app/sales/actions";

async function check() {
  const sales = await getMonthlySales(2026, 5);
  const names = Array.from(new Set(sales.map(s => s.staff_name)));
  console.log("--- UNIQUE NAMES IN SALES ---");
  names.forEach(n => console.log(`"${n}" (Type: ${typeof n})`));
}

check();
