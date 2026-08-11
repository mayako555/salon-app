"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { collection, getDocsUnfiltered, query, where, orderBy } from "@/lib/firestore-admin-wrapper";

const COMPANIES_COLLECTION = "companies";
const FEEDBACK_COLLECTION = "test_feedbacks";

export async function getTestTenantsData() {
  try {
    // 1. Get tenants with plan "Test" or "Beta"
    const colRef = collection(db, COMPANIES_COLLECTION);
    const snap = await getDocsUnfiltered(colRef);
    const tenants = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(t => t.plan === "Test" || t.plan === "Beta");
      
    // 2. Get feedbacks for these tenants
    const feedbackRef = collection(db, FEEDBACK_COLLECTION);
    const feedbackSnap = await getDocsUnfiltered(query(feedbackRef, orderBy("timestamp", "desc")));
    const feedbacks = feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    return { success: true, tenants, feedbacks };
  } catch (error: any) {
    console.error("Error fetching test tenants data:", error);
    return { success: false, error: error.message };
  }
}
