"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { getCurrentUserContext } from "@/lib/auth-server";

const TASKS_COLLECTION = "tasks";

export type TaskPriority = 1 | 2 | 3 | 4 | 5;
export type TaskCategory = "経営" | "開発" | "採用" | "助成金" | "人事" | "経理" | "店舗運営" | "SNS" | "マーケティング" | "営業" | "個人" | "その他";
export type TaskStatus = "未着手" | "進行中" | "保留" | "完了";

export type NotificationRule = {
  id: string;
  notificationType: "datetime" | "days_before" | "hours_before" | "minutes_before";
  notificationOffset: number; // Value for days/hours/minutes. 0 if datetime
  scheduledAt: string | null; // Calculated ISO date string
  sentAt: string | null; // Null if not sent
  notificationStatus: "pending" | "sent" | "failed";
  notificationChannel: "app" | "email" | "line";
};

export type Task = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  category: TaskCategory;
  project?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee: string; // Staff ID or "unassigned"
  dueDate: string; // YYYY-MM-DD format
  dueTime: string; // HH:mm format
  repeatRule?: string;
  notificationRules: NotificationRule[];
  tags: string[];
  attachments: string[];
  createdBy: string;
  updatedBy: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
};

// Check if current user has permission
async function enforceAdminAccess() {
  const profile = await getCurrentUserContext();
  if (!profile) throw new Error("認証されていません");
  if (!["systemOwner", "companyOwner", "admin", "manager"].includes(profile.role)) {
    throw new Error("アクセス権限がありません");
  }
  return profile;
}

export async function getTasks(): Promise<Task[]> {
  try {
    const profile = await enforceAdminAccess();
    if (!profile.companyId && profile.role !== "systemOwner") {
      throw new Error("会社情報が紐付いていません");
    }

    const colRef = collection(db, TASKS_COLLECTION);
    
    // System owner can see all (or we could force them to select a company, but for now filter by companyId)
    const userCompanyId = profile.companyId || "system_default";
    const q = profile.role === "systemOwner" && !profile.companyId
      ? query(colRef, orderBy("createdAt", "desc"))
      : query(colRef, where("companyId", "==", userCompanyId));

    const snapshot = await getDocs(q);
    
    let tasks = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate().toISOString() : data.completedAt,
      } as Task;
    });

    if (profile.role !== "systemOwner" || profile.companyId) {
      tasks.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

export async function createTask(data: Omit<Task, "id" | "companyId" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "completedAt">) {
  try {
    const profile = await enforceAdminAccess();
    
    if (!profile.companyId && profile.role !== "systemOwner") {
      throw new Error("会社IDが見つかりません。");
    }

    const colRef = collection(db, TASKS_COLLECTION);
    const docData = {
      ...data,
      companyId: profile.companyId || "system_default",
      createdBy: profile.uid,
      updatedBy: profile.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completedAt: data.status === "完了" ? serverTimestamp() : null
    };

    const docRef = await addDoc(colRef, docData);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating task:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTask(id: string, data: Partial<Task>) {
  try {
    const profile = await enforceAdminAccess();
    
    const docRef = doc(db, TASKS_COLLECTION, id);
    const existing = await getDoc(docRef);
    
    if (!existing.exists()) throw new Error("タスクが見つかりません");
    
    const existingData = existing.data();
    const userCompanyId = profile.companyId || "system_default";
    if (existingData.companyId !== userCompanyId && profile.role !== "systemOwner") {
      throw new Error("他社のタスクは編集できません");
    }

    const updateData: any = {
      ...data,
      updatedBy: profile.uid,
      updatedAt: serverTimestamp()
    };

    if (data.status === "完了" && existingData.status !== "完了") {
      updateData.completedAt = serverTimestamp();
    } else if (data.status && data.status !== "完了") {
      updateData.completedAt = null;
    }

    await updateDoc(docRef, updateData);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating task:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTask(id: string) {
  try {
    const profile = await enforceAdminAccess();
    
    const docRef = doc(db, TASKS_COLLECTION, id);
    const existing = await getDoc(docRef);
    
    if (!existing.exists()) throw new Error("タスクが見つかりません");
    
    const existingData = existing.data();
    const userCompanyId = profile.companyId || "system_default";
    if (existingData.companyId !== userCompanyId && profile.role !== "systemOwner") {
      throw new Error("他社のタスクは削除できません");
    }

    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return { success: false, error: error.message };
  }
}
