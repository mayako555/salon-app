"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { collection, getDocs, getDoc, query, where, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, limit } from "@/lib/firestore-admin-wrapper";
import { addAuditLog } from "@/app/audit/actions";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";


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
  source?: "manual" | "hotpepper" | "csv_estimated"; // 予約の発生元
  source_sales_id?: string; // 生成元となった売上データのID
  is_confirmed?: boolean; // 推定予約を手動で確定したかどうかのフラグ
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
    
    const { getCurrentUserContext } = await import("@/lib/auth-server");
    const { requireFeature } = await import("@/lib/feature-utils");
    const ctx = await getCurrentUserContext();
  if (ctx.companyId) await requireFeature(ctx.companyId, "reservations");
    if (!ctx.companyId) throw new Error("会社IDが指定されていません");

    let results = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at
      } as Reservation & { companyId?: string };
    });

    results = results.filter(r => r.companyId === ctx.companyId);

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
      const masterCol = collection(db, "sales_master");
      const masterSnap = await getDocs(query(masterCol, where("itemType", "==", "store"), where("isActive", "==", true)));
      const storeObjects = masterSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || "" }));

      const storeNameToIdMap = new Map<string, string>();
      storeObjects.forEach(s => {
        storeNameToIdMap.set(s.id, s.id);
        storeNameToIdMap.set(s.name, s.id);
        storeNameToIdMap.set(s.name.replace(/店$/, ""), s.id);
        const shortName = s.name.replace(/店$/, "").replace(/^Jasmine\s*Lash\s*/i, "");
        storeNameToIdMap.set(shortName, s.id);
        if (shortName.endsWith("道")) {
          storeNameToIdMap.set(shortName.slice(0, -1), s.id);
        }
      });

      const targetStoreId = storeNameToIdMap.get(store) || storeNameToIdMap.get(store.replace(/店$/, "")) || store;

      return results.filter(r => {
        const rStoreId = storeNameToIdMap.get(r.store_name) || storeNameToIdMap.get(r.store_name.replace(/店$/, "")) || r.store_name;
        return rStoreId === targetStoreId;
      }).sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return results.sort((a, b) => a.start_time.localeCompare(b.start_time));
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }
}

export async function addReservation(data: Omit<Reservation, "id" | "created_at" | "updated_at">) {
  try {
    const { getCurrentUserContext } = await import("@/lib/auth-server");
    const { requireFeature } = await import("@/lib/feature-utils");
    const ctx = await getCurrentUserContext();
  if (ctx.companyId) await requireFeature(ctx.companyId, "reservations");
    if (!ctx.companyId) throw new Error("会社IDが指定されていません");

    const colRef = collection(db, RESERVATIONS_COLLECTION);
    
    // Remove undefined values
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    cleanData.companyId = ctx.companyId;

    const newDoc = await addTenantOwnedDoc(colRef, {
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

    // 次回予約確定時の即時LINE自動送信トリガー
    if (data.customer_id && data.type !== "schedule") {
      try {
        const customerDoc = await getDoc(doc(db, "customers", data.customer_id));
        const customerData = customerDoc.exists() ? customerDoc.data() : null;
        const lineUserId = customerData?.line_user_id;

        if (lineUserId) {
          const settingsDoc = await getDoc(doc(db, "line_automation_settings", ctx.companyId));
          const settingsData = settingsDoc.exists() ? settingsDoc.data() : null;

          if (settingsData?.nextBookingEnabled && settingsData?.nextBookingTemplate) {
            const { replaceLineTemplate } = await import("@/lib/lineTemplate");
            const { sendAndLogLineMessage } = await import("@/lib/line");

            const nextReservationDate = new Date(data.date);
            const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][nextReservationDate.getDay()];
            const formattedDate = `${nextReservationDate.getMonth() + 1}月${nextReservationDate.getDate()}日(${dayOfWeek})`;

            const message = replaceLineTemplate(settingsData.nextBookingTemplate, {
              customer_name: data.customer_name || "",
              store_name: data.store_name,
              date: data.date,
              time: data.start_time,
              menu_name: data.menu_name || "",
              staff_name: data.staff_name || "",
              reservation_url: `https://bshare.jp/link-line/`,
              store_phone: "",
              next_reservation_date: formattedDate,
              next_reservation_time: data.start_time
            });

            await sendAndLogLineMessage({
              customerId: data.customer_id,
              accountingId: "",
              lineUserId: lineUserId,
              messageType: "next_booking",
              messageBody: message,
              storeName: data.store_name,
              companyId: ctx.companyId
            });
          }
        }
      } catch (lineError) {
        console.error("Failed to process automatic LINE next booking message:", lineError);
      }
    }

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

    const updates: any = { 
      status, 
      updated_at: serverTimestamp() 
    };

    if (status === 'completed') {
      updates.is_confirmed = true;
    }

    await updateTenantOwnedDoc(docRef, updates);

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
    await deleteTenantOwnedDoc(docRef);

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
    
    await updateTenantOwnedDoc(docRef, { 
      ...cleanData,
      updated_at: serverTimestamp() 
    });

    // Sync to sales record if it exists
    if (cleanData.staff_id || cleanData.staff_name) {
      const q = query(
        collection(db, "sales"),
        where("source_reservation_id", "==", id),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const saleDoc = snap.docs[0];
        await updateTenantOwnedDoc(doc(db, "sales", saleDoc.id), {
          ...(cleanData.staff_id && { staff_id: cleanData.staff_id }),
          ...(cleanData.staff_name && { staff_name: cleanData.staff_name }),
          updated_at: serverTimestamp()
        });
      }
    }

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

export async function updateReservationTime(id: string, staff_name: string, start_time: string, end_time: string, staff_id?: string) {
  try {
    const docRef = doc(db, RESERVATIONS_COLLECTION, id);
    const updateData: any = { 
      staff_name,
      start_time,
      end_time,
      updated_at: serverTimestamp() 
    };
    if (staff_id) {
      updateData.staff_id = staff_id;
    }
    await updateTenantOwnedDoc(docRef, updateData);

    await addAuditLog({
      table_name: RESERVATIONS_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: null,
      new_data: updateData,
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
    
    const { getCurrentUserContext } = await import("@/lib/auth-server");
    const { requireFeature } = await import("@/lib/feature-utils");
    const ctx = await getCurrentUserContext();
  if (ctx.companyId) await requireFeature(ctx.companyId, "reservations");
    if (ctx.role !== "systemOwner") {
      if (!ctx.companyId || data.companyId !== ctx.companyId) {
        return null;
      }
    } else {
      if (ctx.companyId && data.companyId !== ctx.companyId) {
        return null;
      }
    }

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
