"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FAQItem } from "../admin/faqs/types";
import { getCurrentUserContext } from "@/lib/auth-server";

export async function getPublishedFaqs() {
  try {
    const authStatus = await getCurrentUserContext();
    if (!authStatus) return [];
    
    // Fallback if role is not perfectly mapped. 'staff' is the lowest common denominator
    const userRole = authStatus.role || "staff";

    // Firestore allows array-contains for a single value.
    // If target_roles contains userRole, or we fetch all published and filter in memory.
    // Given the size of FAQs, fetching all published and filtering in memory is usually safer and faster for now.
    
    const snapshot = await adminDb.collection("faqs")
      .where("is_published", "==", true)
      .orderBy("created_at", "desc")
      .get();
      
    const allPublished = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as FAQItem[];

    // Filter by role
    return allPublished.filter(faq => {
      if (!faq.target_roles || faq.target_roles.length === 0) return true; // accessible to all
      return faq.target_roles.includes(userRole);
    });

  } catch (error) {
    console.error("Error fetching published FAQs:", error);
    return [];
  }
}
