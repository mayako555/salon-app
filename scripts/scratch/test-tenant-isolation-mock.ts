import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === "session") return { value: "mock_session" };
      if (name === "impersonated_company_id") return { value: "company_lumichan_test" };
      return undefined;
    }
  })
}));

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifySessionCookie: async () => ({ uid: "maya_uid", email: "maya@jasmine-lash.com" })
  },
  adminDb: {
    collection: (col: string) => ({
      where: () => ({
        limit: () => ({
          get: async () => ({
            empty: false,
            docs: [{
              data: () => ({
                role: "systemOwner",
                companyId: "company_default",
                salonIds: []
              })
            }]
          })
        })
      }),
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({ schoolEnabled: false, schoolName: "" })
        })
      })
    })
  }
}));

import { getCurrentUserContext } from "../../src/lib/auth-server";

async function runTest() {
  console.log("Running getCurrentUserContext with mocked headers...");
  const ctx = await getCurrentUserContext();
  console.log(ctx);
  if (ctx.companyId === "company_lumichan_test" && ctx.isImpersonating) {
    console.log("✅ Success! Impersonation overrides companyId correctly.");
  } else {
    console.error("❌ Failed!");
  }
}

runTest();
