import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getTenantCollection, getTenantDoc } from "@/lib/tenant-utils";

export async function GET() {
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
    companyId: "tenant_A",
    isImpersonating: false
  };

  const logs: string[] = [];

  try {
    await adminDb.collection("test_tenant_isolation").doc("docA").set({
      companyId: "tenant_A",
      secret: "tenant_A_secret"
    });
    
    await adminDb.collection("test_tenant_isolation").doc("docB").set({
      companyId: "tenant_B",
      secret: "tenant_B_secret"
    });

    let passed = true;
    
    const aList = await getTenantCollection("test_tenant_isolation", ctxTenantA as any).get();
    const aListIds = aList.docs.map((d: any) => d.id);
    if (aListIds.includes("docB")) {
      logs.push("FAIL: Tenant A can list Tenant B data");
      passed = false;
    } else {
      logs.push("PASS: Tenant A listing isolated");
    }

    try {
      await getTenantDoc("test_tenant_isolation", "docB", ctxTenantA as any);
      logs.push("FAIL: Tenant A can read Tenant B directly");
      passed = false;
    } catch (e: any) {
      if (e.message.includes("Unauthorized tenant access")) {
        logs.push("PASS: Tenant A cannot read Tenant B directly");
      } else {
        logs.push(`FAIL: Unexpected error message: ${e.message}`);
        passed = false;
      }
    }

    try {
      await getTenantDoc("test_tenant_isolation", "docB", ctxSystemOwner as any);
      logs.push("PASS: SystemOwner can read Tenant B directly");
    } catch (e: any) {
      logs.push(`FAIL: SystemOwner cannot read Tenant B directly ${e.message}`);
      passed = false;
    }

    await adminDb.collection("test_tenant_isolation").doc("docA").delete();
    await adminDb.collection("test_tenant_isolation").doc("docB").delete();

    return NextResponse.json({ passed, logs });
  } catch (e: any) {
    return NextResponse.json({ passed: false, error: e.message, logs });
  }
}
