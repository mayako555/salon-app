"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { FAQItem } from "./types";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getTenantCollection, getTenantDoc } from "@/lib/tenant-utils";

const FAQS_COLLECTION = "faqs";

export async function getFaqs(options?: { includeUnpublished?: boolean, category?: string }) {
  try {
    const ctx = await getCurrentUserContext();
    let query: any = getTenantCollection(FAQS_COLLECTION, ctx);
    
    if (options?.category) {
      query = query.where("category", "==", options.category);
    }
    
    // We only filter by is_published on the client/help-center side.
    // Admin side usually wants to see everything.
    if (options?.includeUnpublished === false) {
       query = query.where("is_published", "==", true);
    }

    const snapshot = await query.orderBy("created_at", "desc").get();
    
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString(),
      updated_at: doc.data().updated_at?.toDate().toISOString(),
    })) as FAQItem[];
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return [];
  }
}

export async function getFaqById(id: string) {
  try {
    const ctx = await getCurrentUserContext();
    const doc = await getTenantDoc(FAQS_COLLECTION, id, ctx);
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate().toISOString(),
      updated_at: data.updated_at?.toDate().toISOString(),
    } as FAQItem;
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    return null;
  }
}

export async function saveFaq(data: Partial<FAQItem>) {
  try {
    const ctx = await getCurrentUserContext();
    const isNew = !data.id;
    
    if (!isNew) {
      await getTenantDoc(FAQS_COLLECTION, data.id!, ctx);
    }

    const ref = isNew 
      ? adminDb.collection(FAQS_COLLECTION).doc() 
      : adminDb.collection(FAQS_COLLECTION).doc(data.id!);

    const payload = {
      ...data,
      search_terms: data.search_terms || [],
      target_roles: data.target_roles || [],
      is_published: data.is_published || false,
      updated_at: FieldValue.serverTimestamp(),
    };

    if (isNew) {
      Object.assign(payload, { 
        created_at: FieldValue.serverTimestamp(),
        companyId: ctx.companyId 
      });
    }

    delete payload.id; // don't store id inside the document fields

    await ref.set(payload, { merge: true });
    
    return { success: true, id: ref.id };
  } catch (error: any) {
    console.error("Error saving FAQ:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFaq(id: string) {
  try {
    const ctx = await getCurrentUserContext();
    await getTenantDoc(FAQS_COLLECTION, id, ctx);
    await adminDb.collection(FAQS_COLLECTION).doc(id).delete();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting FAQ:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleFaqPublish(id: string, isPublished: boolean) {
  try {
    const ctx = await getCurrentUserContext();
    await getTenantDoc(FAQS_COLLECTION, id, ctx);
    await adminDb.collection(FAQS_COLLECTION).doc(id).update({
      is_published: isPublished,
      updated_at: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling FAQ publish state:", error);
    return { success: false, error: error.message };
  }
}
