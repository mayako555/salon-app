"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, serverTimestamp, orderBy } from "@/lib/firestore-admin-wrapper";
import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/auth-server";
import { SchoolCourse, SchoolStudent, SchoolReservation, SchoolPayment, SchoolSalesRecord } from "./types";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";


const COURSES_COL = "school_courses";
const STUDENTS_COL = "school_students";
const RESERVATIONS_COL = "school_reservations";
const PAYMENTS_COL = "school_payments";
const SALES_COL = "school_sales";

// --- Courses ---

export async function getCourses(): Promise<SchoolCourse[]> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const q = query(
      collection(db, COURSES_COL),
      where("companyId", "==", ctx.companyId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SchoolCourse[];
  } catch (error: any) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

export async function addCourse(payload: Omit<SchoolCourse, "id" | "companyId" | "createdAt" | "updatedAt">) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    await addTenantOwnedDoc(collection(db, COURSES_COL), {
      ...payload,
      companyId: ctx.companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    revalidatePath("/admin/school/courses");
    return { success: true };
  } catch (error: any) {
    console.error("Error adding course:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCourse(id: string, payload: Partial<Omit<SchoolCourse, "id" | "companyId" | "createdAt" | "updatedAt">>) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    // Consider verifying companyId of the document before update for extra security
    const docRef = doc(db, COURSES_COL, id);
    await updateTenantOwnedDoc(docRef, {
      ...payload,
      updatedAt: serverTimestamp()
    });
    
    revalidatePath("/admin/school/courses");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating course:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCourse(id: string) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    await deleteTenantOwnedDoc(doc(db, COURSES_COL, id));
    revalidatePath("/admin/school/courses");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting course:", error);
    return { success: false, error: error.message };
  }
}

// --- Students ---

export async function getStudents(): Promise<SchoolStudent[]> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const q = query(
      collection(db, STUDENTS_COL),
      where("companyId", "==", ctx.companyId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SchoolStudent[];
  } catch (error: any) {
    console.error("Error fetching students:", error);
    return [];
  }
}

export async function addStudent(payload: Omit<SchoolStudent, "id" | "companyId" | "createdAt" | "updatedAt">) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    await addTenantOwnedDoc(collection(db, STUDENTS_COL), {
      ...payload,
      companyId: ctx.companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    revalidatePath("/admin/school/students");
    return { success: true };
  } catch (error: any) {
    console.error("Error adding student:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStudent(id: string, payload: Partial<Omit<SchoolStudent, "id" | "companyId" | "createdAt" | "updatedAt">>) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const docRef = doc(db, STUDENTS_COL, id);
    await updateTenantOwnedDoc(docRef, {
      ...payload,
      updatedAt: serverTimestamp()
    });
    
    revalidatePath("/admin/school/students");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating student:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteStudent(id: string) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    await deleteTenantOwnedDoc(doc(db, STUDENTS_COL, id));
    revalidatePath("/admin/school/students");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting student:", error);
    return { success: false, error: error.message };
  }
}
