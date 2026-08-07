"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUserContext } from "@/lib/auth-server";
import { Timestamp } from "firebase-admin/firestore";
import { addAuditLog } from "../audit/actions";
import { MonthlyStatementV2, StatementStatus } from "@/types/payroll";
import { getTenantDoc } from "@/lib/tenant-utils";


// Transition statement status
export async function updateStatementStatus(statementId: string, newStatus: StatementStatus, reason?: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("Unauthorized");

  const docRef = adminDb.collection("monthly_statements_v2").doc(statementId);
  const doc = await getTenantDoc("monthly_statements_v2", statementId, ctx);
  const data = doc.data() as MonthlyStatementV2;
  
  // Rule: paid -> directly edit forbidden.
  if (data.status === "paid" && newStatus !== "cancelled") {
    throw new Error("Cannot change status of a paid statement. Please use cancellation or correction flow.");
  }
  
  // Hard delete is prevented by security rules and this backend. 
  // We only change statuses.
  await docRef.update({
    status: newStatus,
    updated_at: Timestamp.now()
  });
  
  await addAuditLog({
    action: `UPDATE`,
    table_name: `payroll_statements`,
    record_id: statementId,
    actor: ctx.uid || "system",
    old_data: { status: data.status },
    new_data: { 
      status: newStatus, 
      reason: reason || "N/A",
      companyId: data.tenant_id
    }
  });
  
  return { success: true };
}

// Generate Snapshot is done during `calculated` stage inherently when saving the statement.
// But if user hits "Recalculate", we log it.
export async function logRecalculation(statementId: string, previousSnapshot: any) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("Unauthorized");

  await addAuditLog({
    action: `CALCULATE`,
    table_name: `payroll_statements`,
    record_id: statementId,
    actor: ctx.uid || "system",
    old_data: previousSnapshot,
    new_data: { memo: `Statement was recalculated. Old snapshot archived.`, companyId: ctx.companyId }
    // we could store previousSnapshot stringified in a separate audit payload table if needed
  });
}
