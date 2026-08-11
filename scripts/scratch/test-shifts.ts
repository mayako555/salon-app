import { getMonthlyShifts } from "../../src/app/shifts/actions";
import { adminDb } from "../../src/lib/firebase-admin";
// Mock getCurrentUserContext
jest.mock("../../src/lib/auth-server", () => ({
  getCurrentUserContext: async () => ({
    uid: "mywaum7DTUNLrm4b5chd",
    role: "systemOwner",
    companyId: "company_default"
  })
}));

async function run() {
  const shifts = await getMonthlyShifts(2026, 8);
  console.log(`Returned ${shifts.length} shifts for August 2026`);
}
run();
