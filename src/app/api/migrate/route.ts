import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTIONS = [
  "staff_profiles",
  "customers",
  "sales",
  "sales_master",
  "contracts",
  "monthly_statements",
  "shifts",
  "attendance",
  "time_adjustments",
  "tasks",
  "evaluations",
  "rules",
  "expenses",
  "stores",
  "audit_logs"
];

const DEFAULT_COMPANY_ID = "company_default";

export async function GET() {
  try {
    let totalUpdated = 0;
    
    for (const colName of COLLECTIONS) {
      const snapshot = await adminDb.collection(colName).get();
      let batch = adminDb.batch();
      let count = 0;
      
      for (const doc of snapshot.docs) {
        if (!doc.data().companyId) {
          batch.update(doc.ref, { companyId: DEFAULT_COMPANY_ID });
          count++;
          totalUpdated++;
        }
        
        if (count === 400) {
          await batch.commit();
          batch = adminDb.batch();
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
    }

    return NextResponse.json({ success: true, totalUpdated });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
