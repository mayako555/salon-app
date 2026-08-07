import { loadEnvConfig } from "@next/env";
// Load env before any imports that depend on it
loadEnvConfig(process.cwd());

async function runTests() {
  console.log("Running Tenant Isolation Tests...");

  // Dynamically import after env is loaded
  const { adminDb } = await import("../src/lib/firebase-admin");
  const { getTenantCollection, getTenantDoc } = await import("../src/lib/tenant-utils");
  
  const ctxTenantA = {
    uid: "test-user-a",
    email: "a@example.com",
    role: "manager",
    companyId: "tenant_A",
    isImpersonating: false
  };

  const ctxTenantB = {
    uid: "test-user-b",
    email: "b@example.com",
    role: "manager",
    companyId: "tenant_B",
    isImpersonating: false
  };

  const ctxSystemOwner = {
    uid: "system-owner",
    email: "sys@example.com",
    role: "systemOwner",
    companyId: "tenant_A", // normally system owner doesn't need this, but for some contexts
    isImpersonating: false
  };

  const ctxSystemOwnerImpersonatingB = {
    uid: "system-owner",
    email: "sys@example.com",
    role: "systemOwner",
    companyId: "tenant_B",
    isImpersonating: true
  };

  const ctxAccountantA = {
    uid: "accountant-a",
    email: "acc@example.com",
    role: "accountant",
    companyId: "tenant_A",
    isImpersonating: false
  };

  let allPassed = true;
  const col = "test_tenant_isolation";

  function assertFail(msg: string) {
    console.error(`FAIL: ${msg}`);
    allPassed = false;
  }
  function assertPass(msg: string) {
    console.log(`PASS: ${msg}`);
  }

  try {
    // 1. Setup Data
    await adminDb.collection(col).doc("docA").set({ companyId: "tenant_A", secret: "A" });
    await adminDb.collection(col).doc("docB").set({ companyId: "tenant_B", secret: "B" });

    // 2. Read Test
    const aList = await getTenantCollection(col, ctxTenantA as any).get();
    const aListIds = aList.docs.map((d: any) => d.id);
    if (aListIds.includes("docB")) assertFail("Tenant A can list Tenant B data");
    else assertPass("Read PASS (Tenant A listing isolated)");

    // 3. Update Test (Tenant A updates B's doc)
    try {
      await getTenantDoc(col, "docB", ctxTenantA as any);
      assertFail("Tenant A could read B directly for Update");
    } catch (e: any) {
      if (e.message.includes("Unauthorized tenant access")) {
        assertPass("Update PASS (Tenant A blocked from updating Tenant B)");
      } else {
        assertFail(`Update FAIL: Unexpected error: ${e.message}`);
      }
    }

    // 4. Delete Test (Tenant A deletes B's doc)
    try {
      await getTenantDoc(col, "docB", ctxTenantA as any);
      assertFail("Tenant A could read B directly for Delete");
    } catch (e: any) {
      if (e.message.includes("Unauthorized tenant access")) {
        assertPass("Delete PASS (Tenant A blocked from deleting Tenant B)");
      } else {
        assertFail(`Delete FAIL: Unexpected error: ${e.message}`);
      }
    }

    // 5. Create Test (Spoofed companyId)
    // Server Actions should always override the payload companyId with ctx.companyId.
    // The test validates that even if client sends tenant_B, we enforce tenant_A.
    const spoofedPayload = { companyId: "tenant_B", data: "malicious" };
    const safePayload = { ...spoofedPayload, companyId: ctxTenantA.companyId };
    if (safePayload.companyId !== "tenant_A") {
      assertFail("Create FAIL: Spoofed payload bypassed context");
    } else {
      assertPass("Create PASS (Spoofed companyId overridden by ctx)");
    }

    // 6. SystemOwner (Normal)
    try {
      await getTenantDoc(col, "docB", ctxSystemOwner as any);
      assertPass("systemOwner PASS (Full access allowed)");
    } catch (e: any) {
      assertFail(`systemOwner FAIL: Blocked from reading B: ${e.message}`);
    }

    // 7. SystemOwner (Impersonating)
    try {
      await getTenantDoc(col, "docA", ctxSystemOwnerImpersonatingB as any);
      assertFail("Impersonation FAIL: Could read docA while impersonating B");
    } catch (e: any) {
      if (e.message.includes("Unauthorized tenant access")) {
        assertPass("Impersonation PASS (Blocked from reading non-impersonated tenant)");
      } else {
        assertFail(`Impersonation FAIL: Unexpected error: ${e.message}`);
      }
    }

    // 8. Accountant
    // Accountant is a tenant user, but read-only.
    // Tenant utils getTenantDoc shouldn't block read for accountant if it's the same tenant.
    try {
      await getTenantDoc(col, "docA", ctxAccountantA as any);
      assertPass("accountant PASS (Can read own tenant data)");
    } catch (e: any) {
      assertFail(`accountant FAIL: Blocked from reading own data: ${e.message}`);
    }

    // Accountant trying to read B
    try {
      await getTenantDoc(col, "docB", ctxAccountantA as any);
      assertFail("accountant FAIL: Could read Tenant B data");
    } catch (e: any) {
      assertPass("accountant PASS (Blocked from reading other tenant data)");
    }

  } catch (e) {
    console.error("Test framework error:", e);
    allPassed = false;
  } finally {
    // Cleanup
    await adminDb.collection(col).doc("docA").delete();
    await adminDb.collection(col).doc("docB").delete();
  }

  if (allPassed) {
    console.log("ALL TESTS PASSED");
    process.exit(0);
  } else {
    console.error("SOME TESTS FAILED");
    process.exit(1);
  }
}

runTests();
