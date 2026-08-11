import { getTenants } from "../../src/app/admin/master/system/tenant-actions";
async function run() {
  const tenants = await getTenants();
  console.log(tenants);
}
run().catch(console.error);
