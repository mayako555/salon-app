"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp,
  limit
} from "@/lib/firestore-admin-wrapper";
import { generateSNSContent as generateAI } from "@/lib/gemini";
import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getStaffList } from "@/app/staff/actions";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";


export type SNSPostStatus = "uncreated" | "draft" | "posted";

export type SNSPost = {
  id: string;
  account: string;
  genre: string;
  platform: string;
  theme: string;
  content: string;
  status: SNSPostStatus;
  target_date: string;
  scheduled_time?: string;
  created_at?: any;
  updated_at?: any;
};

const SNS_POSTS_COLLECTION = "sns_posts";

export async function getDailySNSPosts(date: string): Promise<SNSPost[]> {
  try {
    const ctx = await getCurrentUserContext();
    const colRef = collection(db, SNS_POSTS_COLLECTION);
    const q = query(colRef, where("target_date", "==", date));
    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at || null,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at || null
      };
    }) as SNSPost[];

    if (ctx.role !== "systemOwner") {
      const staffList = await getStaffList(); // Filtered by companyId
      const allowedAccounts = new Set(
        staffList.flatMap(s => s.sns_accounts || [])
      );
      return posts.filter(p => allowedAccounts.has(p.account));
    }

    return posts;
  } catch (error) {
    console.error("Error fetching SNS posts:", error);
    return [];
  }
}

export async function saveSNSPost(data: Partial<SNSPost> & { account: string; target_date: string }) {
  try {
    const colRef = collection(db, SNS_POSTS_COLLECTION);
    
    if (data.id) {
      // Update
      const docRef = doc(db, SNS_POSTS_COLLECTION, data.id);
      const updateData = { ...data };
      delete updateData.id;
      await updateTenantOwnedDoc(docRef, {
        ...updateData,
        updated_at: serverTimestamp()
      });
      revalidatePath("/dashboard");
      revalidatePath("/staff-portal");
      return { success: true, id: data.id };
    } else {
      // Create
      const docRef = await addTenantOwnedDoc(colRef, {
        ...data,
        status: data.status || "uncreated",
        content: data.content || "",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      revalidatePath("/dashboard");
      revalidatePath("/staff-portal");
      return { success: true, id: docRef.id };
    }
  } catch (error: any) {
    console.error("Error saving SNS post:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSNSPost(id: string) {
  try {
    const docRef = doc(db, SNS_POSTS_COLLECTION, id);
    await updateTenantOwnedDoc(docRef, { is_deleted: true }); // Using soft delete for safety
    revalidatePath("/dashboard");
    revalidatePath("/staff-portal");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSNSPostStatus(id: string, status: SNSPostStatus) {
  try {
    const docRef = doc(db, SNS_POSTS_COLLECTION, id);
    await updateTenantOwnedDoc(docRef, {
      status,
      updated_at: serverTimestamp()
    });
    revalidatePath("/dashboard");
    revalidatePath("/staff-portal");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateSNSContent(params: {
  account: string;
  genre: string;
  platform: string;
  theme: string;
}) {
  return await generateAI(params);
}
