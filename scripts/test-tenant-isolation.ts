import { getReservations } from "../src/app/reservations/actions";
import { getAllCustomers } from "../src/lib/customers";
import { getStaffList } from "../src/app/staff/actions";
import * as authServer from "../src/lib/auth-server";

// Mock the module
jest.mock("../src/lib/auth-server", () => ({
  getCurrentUserContext: jest.fn()
}));

async function runTests() {
  console.log("Starting Tenant Isolation Tests...");
  console.log("===================================");

  // Test 1: Franchise User (companyId: 'rumi_salon')
  console.log("\\n[Test 1] Franchise User (companyId: 'rumi_salon')");
  (authServer.getCurrentUserContext as jest.Mock).mockResolvedValue({
    uid: "test_rumi",
    role: "companyOwner",
    companyId: "rumi_salon",
    salonIds: ["Rumi店"]
  });

  try {
    const customers = await getAllCustomers();
    console.log(`- Customers visible: ${customers.length}`);
    const isJasmineVisible = customers.some(c => c.companyId === "company_default");
    console.log(`- Can see Jasmine Lash customers?: ${isJasmineVisible ? 'YES (FAIL)' : 'NO (PASS)'}`);
    
    const staff = await getStaffList();
    console.log(`- Staff visible: ${staff.length}`);
    const isJasmineStaffVisible = staff.some(s => s.companyId === "company_default");
    console.log(`- Can see Jasmine Lash staff?: ${isJasmineStaffVisible ? 'YES (FAIL)' : 'NO (PASS)'}`);
  } catch (e: any) {
    console.log(`- Error: ${e.message}`);
  }

  // Test 2: Jasmine Lash User (companyId: 'company_default')
  console.log("\\n[Test 2] Jasmine Lash User (companyId: 'company_default')");
  (authServer.getCurrentUserContext as jest.Mock).mockResolvedValue({
    uid: "test_jasmine",
    role: "systemOwner",
    companyId: "company_default",
    salonIds: ["六甲店", "神戸店"]
  });

  try {
    const customers = await getAllCustomers();
    console.log(`- Customers visible: ${customers.length}`);
    const isRumiVisible = customers.some(c => c.companyId === "rumi_salon");
    console.log(`- Can see Rumi Salon customers?: ${isRumiVisible ? 'YES (FAIL)' : 'NO (PASS)'}`);
    
    const staff = await getStaffList();
    console.log(`- Staff visible: ${staff.length}`);
  } catch (e: any) {
    console.log(`- Error: ${e.message}`);
  }

  // Test 3: User without companyId
  console.log("\\n[Test 3] User without companyId (Undefined)");
  (authServer.getCurrentUserContext as jest.Mock).mockResolvedValue({
    uid: "test_nocompany",
    role: "staff",
    companyId: undefined,
    salonIds: []
  });

  try {
    const customers = await getAllCustomers();
    console.log(`- Customers visible: ${customers.length}`);
  } catch (e: any) {
    console.log(`- Expected Error caught: ${e.message}`);
  }

  console.log("\\nTests complete.");
}

runTests().catch(console.error);
