"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, query, where, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { addAuditLog } from "@/app/audit/actions";

export type ReservationStatus = "booked" | "arrived" | "completed" | "cancelled";
export type ReservationPortal = "HPB" | "Minimo" | "Nailie" | "Rakuten" | "Direct" | "Other";

export type Reservation = {
  id: string;
  store_name: string;
  staff_id: string;
  staff_name: string;
  customer_id?: string;
  customer_name: string;
  customer_kana?: string;
  customer_phone?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  menu_name: string;
  portal: ReservationPortal;
  status: ReservationStatus;
  customer_type?: "新規" | "再来" | "モデル" | "不明";
  is_next_booking?: boolean;
  is_caution?: boolean;
  bed_number?: string;
  memo?: string;
  expected_price?: number;
  created_at: any;
  updated_at: any;
};

const RESERVATIONS_COLLECTION = "reservations";

export async function getReservations(store: string, dateStr: string): Promise<Reservation[]> {
  try {
    const colRef = collection(db, RESERVATIONS_COLLECTION);
    // Fetching for a specific date
    let q = query(colRef, where("date", "==", dateStr));
    
    // If not "全店舗", we have to filter by store in memory or add to query.
    // For simplicity, fetch by date, filter by store in memory to avoid needing composite indexes.
    const snapshot = await getDocs(q);
    
    const results = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at
      } as Reservation;
    });

    if (store !== "全店舗") {
      return results.filter(r => r.store_name === store).sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return results.sort((a, b) => a.start_time.localeCompare(b.start_time));
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }
}

export async function addReservation(data: Omit<Reservation, "id" | "created_at" | "updated_at">) {
  try {
    const colRef = collection(db, RESERVATIONS_COLLECTION);
    
    // Remove undefined values
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

    const newDoc = await addDoc(colRef, {
      ...cleanData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    await addAuditLog({
      table_name: RESERVATIONS_COLLECTION,
      record_id: newDoc.id,
      action: "INSERT",
      old_data: null,
      new_data: { date: data.date, customer_name: data.customer_name, staff_name: data.staff_name },
      actor: "System"
    });

    return { success: true, id: newDoc.id };
  } catch (error: any) {
    console.error("Error adding reservation:", error);
    return { success: false, error: error.message };
  }
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  try {
    const docRef = doc(db, RESERVATIONS_COLLECTION, id);
    await updateDoc(docRef, { 
      status, 
      updated_at: serverTimestamp() 
    });

    await addAuditLog({
      table_name: RESERVATIONS_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: { status: "unknown" },
      new_data: { status },
      actor: "System"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating reservation status:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteReservation(id: string) {
  try {
    const docRef = doc(db, RESERVATIONS_COLLECTION, id);
    await deleteDoc(docRef);

    await addAuditLog({
      table_name: RESERVATIONS_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: null,
      new_data: null,
      actor: "System"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting reservation:", error);
    return { success: false, error: error.message };
  }
}

export async function updateReservationTime(id: string, staff_name: string, start_time: string, end_time: string) {
  try {
    const docRef = doc(db, RESERVATIONS_COLLECTION, id);
    await updateDoc(docRef, { 
      staff_name,
      start_time,
      end_time,
      updated_at: serverTimestamp() 
    });

    await addAuditLog({
      table_name: RESERVATIONS_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: null,
      new_data: { staff_name, start_time, end_time },
      actor: "System"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating reservation time:", error);
    return { success: false, error: error.message };
  }
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  try {
    const docRef = doc(db, RESERVATIONS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      created_at: data.created_at?.toMillis?.() || data.created_at,
      updated_at: data.updated_at?.toMillis?.() || data.updated_at
    } as Reservation;
  } catch (error) {
    console.error("Error fetching reservation by id:", error);
    return null;
  }
}
