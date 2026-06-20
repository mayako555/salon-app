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
  type?: "reservation" | "schedule"; // Added for schedules
  customer_id?: string;
  customer_name?: string; // Optional for schedules
  customer_kana?: string;
  customer_phone?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  menu_name?: string; // Can be title for schedule
  portal?: ReservationPortal;
  status: ReservationStatus;
  customer_type?: "新規" | "再来" | "モデル" | "不明";
  is_next_booking?: boolean;
  is_nominated?: boolean;
  is_line_reminder?: boolean;
  is_caution?: boolean;
  bed_number?: string;
  memo?: string;
  expected_price?: number;
  same_day_cancel_count?: number; // Optional flag to show on calendar
  customer_notes?: string;
  customer_allergies?: string[];
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
    
    let results = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at
      } as Reservation;
    });

    // Populate same_day_cancel_count
    const customerIds = Array.from(new Set(results.map(r => r.customer_id).filter(Boolean))) as string[];
    if (customerIds.length > 0) {
      // Split into chunks of 10 for 'in' queries
      const { doc, getDoc } = await import('firebase/firestore');
      const counts: Record<string, number> = {};
      const customerInfo: Record<string, { notes: string, allergies: string[] }> = {};
      
      const { collection, getDocs, query, where, documentId } = await import('firebase/firestore');
      
      // Chunk into 10s for 'in' queries
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < customerIds.length; i += chunkSize) {
        chunks.push(customerIds.slice(i, i + chunkSize));
      }
      
      await Promise.all(chunks.map(async chunk => {
        const q = query(collection(db, 'customers'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(cSnap => {
          const data = cSnap.data();
          counts[cSnap.id] = data.same_day_cancel_count || 0;
          customerInfo[cSnap.id] = {
            notes: data.notes || "",
            allergies: data.allergies || []
          };
        });
      }));

      results = results.map(r => {
        if (r.customer_id && customerInfo[r.customer_id]) {
          return { 
            ...r, 
            same_day_cancel_count: counts[r.customer_id],
            customer_notes: customerInfo[r.customer_id].notes,
            customer_allergies: customerInfo[r.customer_id].allergies
          };
        }
        return r;
      });
    }

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

export async function updateReservationStatus(id: string, status: ReservationStatus, isCustomerFault: boolean = true) {
  try {
    const docRef = doc(db, RESERVATIONS_COLLECTION, id);
    
    // Get the reservation first to check if it's a same-day cancellation
    const snap = await getDoc(docRef);
    if (snap.exists() && status === 'cancelled' && isCustomerFault) {
      const resData = snap.data();
      const todayJst = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });
      const todayDateStr = new Date(todayJst).toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (resData.date === todayDateStr && resData.customer_id) {
        // It's a same-day cancellation for a known customer
        const { getCustomerById, updateCustomer } = await import('@/lib/customers');
        const customer = await getCustomerById(resData.customer_id);
        
        if (customer) {
          const currentCount = customer.same_day_cancel_count || 0;
          const newCount = currentCount + 1;
          
          // Update customer count
          await updateCustomer(customer.id, { same_day_cancel_count: newCount });
          
          // Determine fee
          let fee = "無し";
          if (newCount === 2) fee = "2000円";
          else if (newCount === 3 || newCount === 4) fee = "50%";
          else if (newCount >= 5) fee = "100%";
          
          // Create cancellation record
          const { addSameDayCancellation } = await import('@/app/customers/cancellations');
          await addSameDayCancellation({
            customer_id: customer.id,
            reservation_id: id,
            cancel_date: todayDateStr,
            cancel_count: newCount,
            cancel_fee_type: fee,
            is_karte_recorded: false,
            is_line_sent: false,
            is_salonboard_updated: false,
            is_fee_notified: false,
            is_fee_collected_at_visit: false,
            memo: "",
          });
        }
      }
    }

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

export async function updateReservation(id: string, data: Partial<Omit<Reservation, "id" | "created_at" | "updated_at">>) {
  try {
    const docRef = doc(db, RESERVATIONS_COLLECTION, id);
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    
    await updateDoc(docRef, { 
      ...cleanData,
      updated_at: serverTimestamp() 
    });

    await addAuditLog({
      table_name: RESERVATIONS_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: null,
      new_data: cleanData,
      actor: "System"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating reservation:", error);
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
