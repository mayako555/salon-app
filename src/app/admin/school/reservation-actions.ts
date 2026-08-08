"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, serverTimestamp, orderBy } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { getCurrentUserContext, UserContext } from "@/lib/auth-server";
import { SchoolReservation, SchoolPayment, SchoolSalesRecord, SchoolReservationStatus, SchoolPaymentStatus } from "./types";

const RESERVATIONS_COL = "school_reservations";
const PAYMENTS_COL = "school_payments";
const SALES_COL = "school_sales";

async function logImpersonationAction(ctx: UserContext, action: "INSERT"|"UPDATE"|"DELETE", table: string, recordId: string, newData: any = null, oldData: any = null) {
  if (ctx.isImpersonating && ctx.originalSystemOwnerUid) {
    const { addAuditLog } = await import("@/app/audit/actions");
    await addAuditLog({
      table_name: table,
      record_id: recordId,
      action: action,
      old_data: oldData,
      new_data: { ...newData, original_system_owner_uid: ctx.originalSystemOwnerUid, company_id: ctx.companyId },
      actor: ctx.uid // Actually actor is the impersonated UID or system owner UID? `ctx.uid` is the system owner's UID
    });
  }
}


export async function getReservations(): Promise<SchoolReservation[]> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const q = query(
      collection(db, RESERVATIONS_COL),
      where("companyId", "==", ctx.companyId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SchoolReservation[];
    return results.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  } catch (error: any) {
    console.error("Error fetching reservations:", error);
    return [];
  }
}

export async function addReservation(payload: Omit<SchoolReservation, "id" | "companyId" | "createdAt" | "updatedAt">) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const docRef = await addDoc(collection(db, RESERVATIONS_COL), {
      ...payload,
      companyId: ctx.companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await logImpersonationAction(ctx, "INSERT", RESERVATIONS_COL, docRef.id, payload);
    
    // If it's created as 'completed', we should generate sales right away
    if (payload.status === "completed") {
      await syncReservationSales(docRef.id, { ...payload, companyId: ctx.companyId } as any);
    }

    revalidatePath("/admin/school/reservations");
    return { success: true };
  } catch (error: any) {
    console.error("Error adding reservation:", error);
    return { success: false, error: error.message };
  }
}

export async function updateReservation(id: string, payload: Partial<Omit<SchoolReservation, "id" | "companyId" | "createdAt" | "updatedAt">>) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const { adminDb } = await import("@/lib/firebase-admin");
    const resRef = adminDb.collection(RESERVATIONS_COL).doc(id);

    await adminDb.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(resRef);
      if (!snap.exists) throw new Error("Reservation not found");
      const currentData = snap.data() as SchoolReservation;
      if (currentData.companyId !== ctx.companyId && !(ctx.role === "systemOwner" && !ctx.isImpersonating)) {
        throw new Error("Unauthorized tenant access");
      }

      const newFinalAmount = payload.final_amount !== undefined ? payload.final_amount : currentData.final_amount;
      const currentPaidAmount = currentData.paid_amount || 0;
      const newRemaining = Math.max(0, newFinalAmount - currentPaidAmount);

      transaction.update(resRef, {
        ...payload,
        remaining_amount: newRemaining,
        updatedAt: new Date()
      });
    });

    await logImpersonationAction(ctx, "UPDATE", RESERVATIONS_COL, id, payload);

    // We need to sync sales if status is or became completed, or if price changed while completed
    // To do this reliably, we use admin SDK
    const updatedSnap = await resRef.get();
    if (updatedSnap.exists) {
      const data = updatedSnap.data() as SchoolReservation;
      if (data.status === "completed") {
        await syncReservationSales(id, data);
      } else {
        // If status changed from completed to something else, we should ideally delete or zero out the sales.
        // For safety, let's delete the sales record if it's no longer completed.
        await removeReservationSales(id, ctx.companyId);
      }
    }

    revalidatePath("/admin/school/reservations");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating reservation:", error);
    return { success: false, error: error.message };
  }
}

// Transactional sync to prevent double sales
async function syncReservationSales(reservationId: string, data: SchoolReservation) {
  const { adminDb } = await import("@/lib/firebase-admin");
  
  await adminDb.runTransaction(async (transaction: any) => {
    const salesQuery = adminDb.collection(SALES_COL)
      .where("companyId", "==", data.companyId)
      .where("reservation_id", "==", reservationId)
      .where("source_type", "==", "reservation");
    
    const salesSnap = await transaction.get(salesQuery);
    
    const salesData = {
      companyId: data.companyId,
      reservation_id: reservationId,
      student_id: data.student_id,
      student_name: data.student_name || "",
      course_id: data.course_id,
      course_name: data.course_name || "",
      date: data.date, // sales date matches course date
      amount: data.final_amount,
      tax_amount: data.tax_amount,
      tax_included: true, // Assuming internal calculation is tax included
      payment_method: "multiple", // Since payment could be split, we might just put multiple or track it
      source_type: "reservation",
      source_id: reservationId,
      updatedAt: new Date()
    };

    if (salesSnap.empty) {
      // Create new
      const newRef = adminDb.collection(SALES_COL).doc();
      transaction.set(newRef, {
        ...salesData,
        createdAt: new Date()
      });
    } else {
      // Update existing
      const existingRef = salesSnap.docs[0].ref;
      transaction.update(existingRef, salesData);
    }
  });
}

async function removeReservationSales(reservationId: string, companyId: string) {
  const { adminDb } = await import("@/lib/firebase-admin");
  const salesQuery = adminDb.collection(SALES_COL)
    .where("companyId", "==", companyId)
    .where("reservation_id", "==", reservationId)
    .where("source_type", "==", "reservation");
  
  const salesSnap = await salesQuery.get();
  const batch = adminDb.batch();
  salesSnap.docs.forEach((doc: any) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function deleteReservation(id: string) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    await removeReservationSales(id, ctx.companyId);
    await deleteDoc(doc(db, RESERVATIONS_COL, id));
    
    await logImpersonationAction(ctx, "DELETE", RESERVATIONS_COL, id);

    revalidatePath("/admin/school/reservations");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting reservation:", error);
    return { success: false, error: error.message };
  }
}

// --- Payments ---

export async function addPayment(payload: Omit<SchoolPayment, "id" | "companyId" | "createdAt">) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    // Fetch reservation to get snapshots
    const { adminDb } = await import("@/lib/firebase-admin");
    const resRef = adminDb.collection(RESERVATIONS_COL).doc(payload.reservation_id);
    const resSnap = await resRef.get();
    if (!resSnap.exists) throw new Error("Reservation not found");
    const resData = resSnap.data() as SchoolReservation;

    // Add payment
    await addDoc(collection(db, PAYMENTS_COL), {
      ...payload,
      companyId: ctx.companyId,
      student_name: resData.student_name || "",
      course_name: resData.course_name || "",
      createdAt: serverTimestamp(),
    });

    // Update reservation's paid_amount and payment_status transactionally
    await adminDb.runTransaction(async (transaction: any) => {
      const transResSnap = await transaction.get(resRef);
      if (!transResSnap.exists) throw new Error("Reservation not found");
      
      const transResData = transResSnap.data() as SchoolReservation;
      
      // Calculate new paid amount. If refund, subtract.
      const amountChange = payload.payment_type === "refund" ? -payload.amount : payload.amount;
      const newPaidAmount = (transResData.paid_amount || 0) + amountChange;
      const newRemaining = transResData.final_amount - newPaidAmount;
      
      let newPaymentStatus: SchoolPaymentStatus = "unpaid";
      if (newPaidAmount >= transResData.final_amount) {
        newPaymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "partial";
      } else if (newPaidAmount < 0) {
        newPaymentStatus = "refunded";
      }
      
      transaction.update(resRef, {
        paid_amount: newPaidAmount,
        remaining_amount: newRemaining,
        payment_status: newPaymentStatus,
        updatedAt: new Date()
      });
    });

    await logImpersonationAction(ctx, "INSERT", PAYMENTS_COL, "new", payload);

    revalidatePath("/admin/school/reservations");
    return { success: true };
  } catch (error: any) {
    console.error("Error adding payment:", error);
    return { success: false, error: error.message };
  }
}

export async function deletePayment(paymentId: string) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role === "accountant") throw new Error("Read-only access");
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const { adminDb } = await import("@/lib/firebase-admin");
    
    await adminDb.runTransaction(async (transaction: any) => {
      const paymentRef = adminDb.collection(PAYMENTS_COL).doc(paymentId);
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists) throw new Error("Payment not found");
      const paymentData = paymentSnap.data() as SchoolPayment;

      const resRef = adminDb.collection(RESERVATIONS_COL).doc(paymentData.reservation_id);
      const resSnap = await transaction.get(resRef);
      
      if (paymentData.companyId !== ctx.companyId && !(ctx.role === "systemOwner" && !ctx.isImpersonating)) {
        throw new Error("Unauthorized tenant access");
      }

      if (resSnap.exists) {
        const resData = resSnap.data() as SchoolReservation;
        if (resData.companyId !== ctx.companyId && !(ctx.role === "systemOwner" && !ctx.isImpersonating)) {
          throw new Error("Unauthorized tenant access");
        }
        const amountChange = paymentData.payment_type === "refund" ? -paymentData.amount : paymentData.amount;
        
        // Reverse the payment
        const newPaidAmount = Math.max(0, (resData.paid_amount || 0) - amountChange);
        const newRemaining = Math.max(0, resData.final_amount - newPaidAmount);

        let newPaymentStatus: SchoolPaymentStatus = "unpaid";
        if (newPaidAmount >= resData.final_amount) {
          newPaymentStatus = "paid";
        } else if (newPaidAmount > 0) {
          newPaymentStatus = "partial";
        }

        transaction.update(resRef, {
          paid_amount: newPaidAmount,
          remaining_amount: newRemaining,
          payment_status: newPaymentStatus,
          updatedAt: new Date()
        });
      }

      transaction.delete(paymentRef);
    });

    await logImpersonationAction(ctx, "DELETE", PAYMENTS_COL, paymentId);

    revalidatePath("/admin/school/reservations");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return { success: false, error: error.message };
  }
}

export async function getPaymentsByReservation(reservationId: string): Promise<SchoolPayment[]> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("テナントIDが見つかりません");

    const q = query(
      collection(db, PAYMENTS_COL),
      where("companyId", "==", ctx.companyId),
      where("reservation_id", "==", reservationId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || null)
      };
    }) as SchoolPayment[];
    return results.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return [];
  }
}

export async function getAllPayments(): Promise<SchoolPayment[]> {
  try {
    const ctx = await getCurrentUserContext();
    const q = query(
      collection(db, PAYMENTS_COL),
      where("companyId", "==", ctx.companyId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || null)
      };
    }) as SchoolPayment[];
    return results.sort((a, b) => {
      const ta = a.payment_date ? new Date(a.payment_date).getTime() : 0;
      const tb = b.payment_date ? new Date(b.payment_date).getTime() : 0;
      return tb - ta;
    });
  } catch (error: any) {
    console.error("Error fetching all payments:", error);
    return [];
  }
}

export async function getAllSales(): Promise<SchoolSalesRecord[]> {
  try {
    const ctx = await getCurrentUserContext();
    const q = query(
      collection(db, SALES_COL),
      where("companyId", "==", ctx.companyId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || null),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || null)
      };
    }) as SchoolSalesRecord[];
    return results.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  } catch (error: any) {
    console.error("Error fetching all sales:", error);
    return [];
  }
}
