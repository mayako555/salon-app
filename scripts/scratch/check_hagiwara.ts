import { getStaffList } from "./src/app/staff/actions";
import { getContractsList } from "./src/app/contracts/actions";

async function check() {
  const staff = await getStaffList();
  const contracts = await getContractsList();
  
  console.log("--- STAFF ---");
  staff.forEach(s => console.log(`${s.id}: ${s.name} (${s.employment_type})`));
  
  console.log("\n--- CONTRACTS ---");
  contracts.forEach(c => console.log(`${c.staff_id}: ${c.staff_name} (${c.contract_type})`));
}

check();
