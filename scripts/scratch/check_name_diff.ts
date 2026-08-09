import { getStaffList } from "./src/app/staff/actions";
import { getMonthlySales } from "./src/app/sales/actions";

async function check() {
  const staff = await getStaffList();
  const sales = await getMonthlySales(2026, 5); // 5月のデータをチェック
  
  const target = "柴田真凛";
  const profileName = staff.find(p => p.name.includes(target))?.name;
  const salesName = Array.from(new Set(sales.map(s => s.staff_name))).find(n => n?.includes(target));
  
  console.log("--- NAME COMPARISON ---");
  console.log(`Profile Name: "${profileName}" (Length: ${profileName?.length})`);
  console.log(`Sales Name:   "${salesName}" (Length: ${salesName?.length})`);
  
  if (profileName && salesName) {
    for (let i = 0; i < Math.max(profileName.length, salesName.length); i++) {
      console.log(`Char ${i}: Profile(${profileName[i]?.charCodeAt(0)}) vs Sales(${salesName[i]?.charCodeAt(0)})`);
    }
  }
}

check();
