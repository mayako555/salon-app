import { getTenants } from "../../src/app/admin/master/system/tenant-actions";

async function run() {
  console.log("Calling getTenants...");
  try {
    const tenants = await getTenants();
    console.log(`Success! Found ${tenants.length} tenants.`);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
