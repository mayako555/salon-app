import { db } from "../src/lib/firebase";
import { collection, getDocs, setDoc, doc, Timestamp } from "firebase/firestore";

/**
 * Migration Script for Payroll V2.
 * Purpose: Initializes all active staff with default social insurance & tax history records.
 * 
 * Usage:
 * Run this via node/ts-node after backing up the production DB.
 */
async function runMigration() {
  console.log("Starting Staff Payroll V2 Migration...");
  
  const staffSnap = await getDocs(collection(db, "staff_profiles"));
  console.log(`Found ${staffSnap.docs.length} staff records.`);

  let migrated = 0;
  
  for (const staffDoc of staffSnap.docs) {
    const data = staffDoc.data();
    if (data.employment_status !== "active") {
      continue;
    }

    const tenantId = data.companyId;
    if (!tenantId) {
      console.warn(`Staff ${staffDoc.id} has no companyId, skipping.`);
      continue;
    }

    // 1. Setup default Income Tax History
    const taxHistoryRef = doc(collection(db, "staff_income_tax_history"));
    await setDoc(taxHistoryRef, {
      tenant_id: tenantId,
      staff_id: staffDoc.id,
      withholding_tax_category: "甲欄", // Default for most primary employees
      dependents_count_for_withholding: 0,
      secondary_salary_declaration_submitted: false,
      effective_from: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
      effective_to: null,
      declaration_submitted: true,
      notes: "Auto-migrated by V2 initialization script",
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      updated_by: "system_migration"
    });

    // 2. Setup default Social Insurance History (assuming NOT enrolled by default to be safe)
    const socialRef = doc(collection(db, "staff_social_insurance_history"));
    await setDoc(socialRef, {
      tenant_id: tenantId,
      staff_id: staffDoc.id,
      health_insurance_enrolled: data.employment_type === "employee", 
      pension_enrolled: data.employment_type === "employee",
      health_insurance_standard_monthly_remuneration: 250000, // Dummy fallback, admin must fix
      pension_standard_monthly_remuneration: 250000,
      health_insurance_grade: 1,
      pension_grade: 1,
      effective_from: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
      effective_to: null,
      effective_from_month: 202601,
      effective_to_month: null,
      decision_type: "manual_registration",
      notification_date: null,
      source: "Migration Script",
      notes: "Auto-migrated dummy record. Please update with correct remuneration bracket.",
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      updated_by: "system_migration"
    });

    migrated++;
  }

  console.log(`Migration completed. Migrated ${migrated} active staff profiles.`);
}

// execute
// runMigration();
