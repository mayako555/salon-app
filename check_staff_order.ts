import { getStaffList } from "./src/app/staff/actions";

async function check() {
  const staff = await getStaffList();
  console.log("--- STAFF ORDER ---");
  staff.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
       .forEach(s => console.log(`${s.sort_order}: ${s.name}`));
}

check();
