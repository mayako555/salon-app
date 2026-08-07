"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUserContext } from "@/lib/auth-server";
import { FieldValue } from "firebase-admin/firestore";
import { getTenantCollection } from "@/lib/tenant-utils";

export type BankAccount = {
  id?: string;
  companyId: string;
  name: string;
  type: string; // 'manual' for now
  created_at?: string;
};

export type BankBalance = {
  id?: string;
  companyId: string;
  account_id: string;
  balance_date: string; // YYYY-MM-DD
  amount: number;
  created_at?: string;
  updated_at?: string;
};

// Check if user has permission (companyOwner or systemOwner)
async function checkFundsPermission() {
  const auth = await getCurrentUserContext();
  if (!auth) return null;
  if (auth.role !== "companyOwner" && auth.role !== "systemOwner") return null;
  return auth;
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  try {
    const auth = await checkFundsPermission();
    if (!auth) return [];

    const snapshot = await getTenantCollection("bank_accounts", auth)
      .orderBy("created_at", "asc")
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString()
    } as BankAccount));
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return [];
  }
}

export async function addBankAccounts(names: string[]) {
  try {
    const auth = await checkFundsPermission();
    if (!auth) return { success: false, error: "Permission denied" };

    const batch = adminDb.batch();
    names.forEach(name => {
      if (!name.trim()) return;
      const ref = adminDb.collection("bank_accounts").doc();
      batch.set(ref, {
        companyId: auth.companyId,
        name: name.trim(),
        type: "manual",
        created_at: FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error adding bank accounts:", error);
    return { success: false, error: error.message };
  }
}

export async function saveBankBalances(balanceDate: string, balances: { account_id: string, amount: number }[]) {
  try {
    const auth = await checkFundsPermission();
    if (!auth) return { success: false, error: "Permission denied" };

    const batch = adminDb.batch();

    // To implement UPSERT logic properly without failing if multiple exist, we need to query existing first
    for (const b of balances) {
      const snapshot = await getTenantCollection("bank_balances", auth)
        .where("account_id", "==", b.account_id)
        .where("balance_date", "==", balanceDate)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        // Update
        const existingDoc = snapshot.docs[0];
        batch.update(existingDoc.ref, {
          amount: b.amount,
          updated_at: FieldValue.serverTimestamp()
        });
      } else {
        // Insert
        const ref = adminDb.collection("bank_balances").doc();
        batch.set(ref, {
          companyId: auth.companyId,
          account_id: b.account_id,
          balance_date: balanceDate,
          amount: b.amount,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp()
        });
      }
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error saving bank balances:", error);
    return { success: false, error: error.message };
  }
}

export async function getFundsDashboardData() {
  try {
    const auth = await checkFundsPermission();
    if (!auth) return { success: false, error: "Permission denied" };

    const accounts = await getBankAccounts();
    
    // Fetch all balances for the company
    const balancesSnapshot = await getTenantCollection("bank_balances", auth).get();
      
    const allBalances = balancesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      updated_at: doc.data().updated_at?.toDate().toISOString(),
      created_at: doc.data().created_at?.toDate().toISOString()
    } as BankBalance));

    // Group by balance_date
    const balancesByDate: Record<string, { total: number, date: string, last_updated: string, details: Record<string, number> }> = {};
    
    allBalances.forEach((b: BankBalance) => {
      if (!balancesByDate[b.balance_date]) {
        balancesByDate[b.balance_date] = { total: 0, date: b.balance_date, last_updated: b.updated_at || b.created_at || new Date().toISOString(), details: {} };
      }
      balancesByDate[b.balance_date].total += b.amount;
      balancesByDate[b.balance_date].details[b.account_id] = b.amount;
      
      // Keep track of the most recent update across accounts for this date
      if (b.updated_at && new Date(b.updated_at) > new Date(balancesByDate[b.balance_date].last_updated)) {
        balancesByDate[b.balance_date].last_updated = b.updated_at;
      }
    });

    // Sort dates desc
    const sortedDates = Object.keys(balancesByDate).sort((a, b) => b.localeCompare(a));
    
    const latestDate = sortedDates.length > 0 ? sortedDates[0] : null;
    const previousDate = sortedDates.length > 1 ? sortedDates[1] : null;

    let currentTotal = 0;
    let previousTotal = 0;
    let diff = 0;
    let lastUpdated = null;
    let latestDetails: Record<string, number> = {};

    if (latestDate) {
      currentTotal = balancesByDate[latestDate].total;
      lastUpdated = balancesByDate[latestDate].last_updated;
      latestDetails = balancesByDate[latestDate].details;
    }

    if (previousDate) {
      previousTotal = balancesByDate[previousDate].total;
    }

    if (latestDate && previousDate) {
      diff = currentTotal - previousTotal;
    }

    // Chart data (sorted asc for chart)
    const chartData = sortedDates.reverse().map(d => ({
      date: d,
      total: balancesByDate[d].total
    }));

    return {
      success: true,
      data: {
        accounts,
        currentTotal,
        diff,
        latestDate,
        lastUpdated,
        latestDetails,
        chartData
      }
    };

  } catch (error: any) {
    console.error("Error fetching funds dashboard data:", error);
    return { success: false, error: error.message };
  }
}
