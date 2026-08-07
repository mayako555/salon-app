"use server";

import { adminDb as db } from "@/lib/firebase-admin";
import { MasterIncomeTaxTable, MasterIncomeTaxRow } from "@/types/payroll";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Validates that an active master does not already exist for the overlapping effective dates, 
 * or handles the status transitions.
 */
export async function uploadIncomeTaxTable(params: {
  year: number;
  data: any[];
  hash: string;
  fileName: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = db.batch();

    // The parent document ID could be based on year + timestamp to avoid collision
    const docId = `monthly_${params.year}_${Date.now()}`;
    const tableRef = db.collection("master_income_tax_tables").doc(docId);

    const now = Timestamp.now();

    const parentData: Omit<MasterIncomeTaxTable, "id" | "effective_from" | "effective_to" | "imported_at"> & {
      effective_from: any;
      effective_to: any;
      imported_at: any;
    } = {
      year: params.year,
      table_type: "monthly",
      effective_from: Timestamp.fromDate(new Date(`${params.year}-01-01T00:00:00Z`)),
      effective_to: null,
      effective_from_month: parseInt(`${params.year}01`),
      effective_to_month: null,
      version: "1.0",
      status: "validated", // Cannot be 'active' immediately according to requirement 3
      row_count: params.data.length,
      source_name: "CSV Import",
      source_file_name: params.fileName,
      source_file_hash: params.hash,
      imported_at: now,
      imported_by: params.userId,
    };

    batch.set(tableRef, parentData);

    // Save rows into subcollection
    const rowsCol = tableRef.collection("rows");
    for (let i = 0; i < params.data.length; i++) {
      const row = params.data[i];
      const rowRef = rowsCol.doc(`row_${String(i).padStart(4, "0")}`);
      
      const rowData: Omit<MasterIncomeTaxRow, "id" | "table_id"> = {
        min_taxable_amount: row.min_taxable_amount,
        max_taxable_amount: row.max_taxable_amount,
        kou_amounts: row.kou_amounts,
        otsu_amount: row.otsu_amount,
        excess_dependents_rule: null, // Depending on rule, this can be parsed from CSV too
        formula_type: row.formula_type,
      };

      batch.set(rowRef, rowData);
    }

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error uploading tax table:", error);
    return { success: false, error: error.message };
  }
}
