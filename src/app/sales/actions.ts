"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  getDoc,
  limit
} from "firebase/firestore";
import { SalesMasterItem, seedSalesMasterData } from "./seeds";
import { addAuditLog } from "../audit/actions";
import { addCustomer } from "@/lib/customers";
import { syncInventoryFromSale } from "../inventory/inventory-actions";
import { getCurrentUserContext } from "@/lib/auth-server";

export type SalesSource = "checkout" | "hotpepper" | "manual";

export type SalesRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  store_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customer_name: string;
  last_name?: string;
  first_name?: string;
  last_name_kana?: string;
  first_name_kana?: string;
  customer_type: "新規" | "リピ" | "不明";
  menu_course: string;
  tech_sales: number;
  product_sales: number;
  is_nominated: boolean;
  nomination_fee: number;
  discount: number;
  discount_reason: string;
  portal_fee: number;
  hpb_points: number; 
  reservation_route: string;
  payment_method: string;
  hair_material: string;
  options: string;
  cancel_fee: number;
  status: "draft" | "closed";
  source: SalesSource;
  source_reservation_id?: string; // Links back to the original reservation
  next_booking_date?: string; // 次回予約日
  treatment_excluded?: boolean; // 除外トリートメントフラグ
  next_booking_time?: string; // 次回予約時間
  next_booking_staff_name?: string; // 次回予約担当者
  next_booking_nominated?: boolean; // 次回予約指名
  next_booking_line_reminder?: boolean; // 2日前のリマインダー送付
  customer_id?: string;
  is_minimo?: boolean;
  treatment_minutes?: number; // 稼働率計算用
  merge_status?: "CSV_ONLY" | "MERGED_PRIMARY" | "MANUAL_ONLY" | "MERGED_SOURCE" | "DELETED";
  merged_into_id?: string;
  companyId?: string; // Tenant isolation
  created_at: any; // Firestore Timestamp
};

const SALES_COLLECTION = "sales";

const MASTER_COLLECTION = "sales_master";

export async function resetSalesMasterData() {
  try {
    const colRef = collection(db, MASTER_COLLECTION);
    const snapshot = await getDocs(colRef);
    
    // 一括削除（Batch処理）
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    
    // 最新データをシード
    await seedSalesMasterData();
    
    revalidatePath("/staff-portal/sales/master");
    return { success: true };
  } catch (error: any) {
    console.error("Error resetting master data:", error);
    return { success: false, error: error.message };
  }
}

export async function getStoreMasterData(store: string): Promise<SalesMasterItem[]> {
  try {
    const colRef = collection(db, "sales_master");
    const q = query(
      colRef, 
      where("isActive", "==", true),
      where("store", "in", [store, "共通"])
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      const allDocs = await getDocs(collection(db, "sales_master"));
      if (allDocs.empty) {
        await seedSalesMasterData();
        return getStoreMasterData(store);
      }
    }

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      };
    }) as SalesMasterItem[];
  } catch (error) {
    console.error("Error fetching store master data:", error);
    return [];
  }
}

export async function duplicateSalesMasterItem(id: string) {
  try {
    const docRef = doc(db, MASTER_COLLECTION, id);
    const snap = await getDocs(query(collection(db, MASTER_COLLECTION), where("__name__", "==", id)));
    if (snap.empty) return { success: false, error: "Item not found" };
    
    const data = snap.docs[0].data();
    const { id: _, created_at: __, updated_at: ___, ...rest } = data;
    
    const newPayload = {
      ...rest,
      name: `${rest.name} (コピー)`,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    const res = await addDoc(collection(db, MASTER_COLLECTION), newPayload);
    revalidatePath("/staff-portal/sales/master");
    return { success: true, id: res.id };
  } catch (error: any) {
    console.error("Error duplicating master item:", error);
    return { success: false, error: error.message };
  }
}

export async function getSaleByReservationId(resId: string): Promise<SalesRecord | null> {
  try {
    const ctx = await getCurrentUserContext();
    const q = query(
      collection(db, SALES_COLLECTION),
      where("source_reservation_id", "==", resId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as SalesRecord;
    
    if (!ctx.companyId) return null;
    if (data.companyId !== ctx.companyId) return null;
    
    return data;
  } catch (error) {
    console.error("Error fetching sale by res id:", error);
    return null;
  }
}

export async function executeSeed() {
  return await seedSalesMasterData();
}

export async function getMonthlySales(year: number, month: number): Promise<SalesRecord[]> {
  try {
    const ctx = await getCurrentUserContext();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const { adminDb } = await import("@/lib/firebase-admin");
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .orderBy("date", "asc")
      .get();
    const sales = snapshot.docs.map((d: any) => {
      const data = d.data();
      // Firestore TimestampやDateオブジェクトなどのシリアライズ不可能なオブジェクトをプレーンな値に変換
      const serializedData: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof (value as any).toMillis === 'function') {
          serializedData[key] = (value as any).toMillis();
        } else if (value instanceof Date) {
          serializedData[key] = value.getTime();
        } else {
          serializedData[key] = value;
        }
      }
      
      return {
        id: d.id,
        ...serializedData
      };
    }) as SalesRecord[];

    let filteredSales = sales;
    if (!ctx.companyId) {
      throw new Error("会社IDが指定されていません");
    }
    
    // Filter strictly to HotPepper-based truth records for 1-yen accuracy, per user request
    filteredSales = sales.filter(s => 
      s.companyId === ctx.companyId && 
      (s.merge_status === "CSV_ONLY" || s.merge_status === "MERGED_PRIMARY")
    );

    const { getStaffList } = await import("../staff/actions");
    const staffList = await getStaffList();
    filteredSales = filteredSales.map(sale => {
      if (sale.staff_id) {
        const staff = staffList.find(s => s.id === sale.staff_id);
        if (staff && staff.name) {
          return { ...sale, staff_name: staff.name };
        }
      }
      return sale;
    });

    return filteredSales;
  } catch (error: any) {
    console.error("Error fetching sales from Firestore:", error);
    return [];
  }
}

import { sendBookingConfirmation } from "@/lib/line";
import { getCustomerById } from "@/lib/customers";

export async function addCheckout(formData: FormData) {
  try {
    const staffId = formData.get("staff_id") as string;
    const staffName = formData.get("staff_name") as string;
    const storeName = formData.get("store_name") as string;
    const date = formData.get("date") as string;
    const time = formData.get("time") as string || "00:00";
    
    // Name handling
    const lastName = formData.get("last_name") as string || "";
    const firstName = formData.get("first_name") as string || "";
    const lastNameKana = formData.get("last_name_kana") as string || "";
    const firstNameKana = formData.get("first_name_kana") as string || "";
    
    const customerName = (lastName + " " + firstName).trim() || "名無し";
    const customerNameKana = (lastNameKana + " " + firstNameKana).trim() || "";
    
    let customerId = formData.get("customer_id") as string || null;
    const customerType = formData.get("customer_type") as "新規" | "リピ" | "不明";
    
    // Auto-create customer if ID is missing and we have a name
    if (!customerId && (lastName || firstName)) {
      const newCustomerRes = await addCustomer({
        name: customerName,
        last_name: lastName,
        first_name: firstName,
        name_kana: customerNameKana,
        last_name_kana: lastNameKana,
        first_name_kana: firstNameKana,
        phone: "",
        gender: "female", // Default
        allergies: [],
        has_allergy: false,
        notes: "会計時に自動登録されました"
      });
      if (newCustomerRes.success) {
        customerId = newCustomerRes.id || null;
      }
    }

    const menuCourse = formData.get("menu_course") as string || "";
    const options = formData.get("options") as string || "";
    const techSales = parseInt(formData.get("tech_sales") as string || "0", 10);
    const prodSales = parseInt(formData.get("product_sales") as string || "0", 10);
    const isNominated = formData.get("is_nominated") === "true";
    const nominationFee = parseInt(formData.get("nomination_fee") as string || "0", 10);
    const discount = parseInt(formData.get("discount") as string || "0", 10);
    const discountReason = formData.get("discount_reason") as string || "";
    const portalFee = parseInt(formData.get("portal_fee") as string || "0", 10);
    const hpbPoints = parseInt(formData.get("hpb_points") as string || "0", 10);
    const cancelFee = parseInt(formData.get("cancel_fee") as string || "0", 10);
    const paymentMethod = formData.get("payment_method") as string || "現金";
    const reservationRoute = formData.get("reservation_route") as string || "その他";
    const hairMaterial = formData.get("hair_material") as string || "";
    
    // Next Booking Fields
    const nextBookingDate = formData.get("next_booking_date") as string || "";
    const nextBookingTime = formData.get("next_booking_time") as string || "";
    const nextBookingLineReminder = formData.get("next_booking_line_reminder") === "true";
    const nextBookingStaffName = formData.get("next_booking_staff_name") as string || staffName;
    const isMinimo = formData.get("is_minimo") === "true" || reservationRoute.includes("ミニモ");
    const treatmentMinutes = parseInt(formData.get("treatment_minutes") as string || "60", 10);
    const sourceReservationId = formData.get("source_reservation_id") as string || "";

    if (!staffName || !date) {
      return { success: false, error: "必須項目が入力されていません。" };
    }

    if (sourceReservationId) {
      const q = query(collection(db, SALES_COLLECTION), where("source_reservation_id", "==", sourceReservationId), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { success: false, error: "この予約はすでに会計済みです（二重会計エラー）。" };
      }
    }

    const payload = {
      staff_id: staffId || "staff-" + staffName,
      staff_name: staffName,
      store_name: storeName,
      date,
      time,
      customer_name: customerName,
      last_name: lastName,
      first_name: firstName,
      last_name_kana: lastNameKana,
      first_name_kana: firstNameKana,
      customer_id: customerId,
      customer_type: customerType,
      menu_course: menuCourse,
      tech_sales: techSales,
      product_sales: prodSales,
      is_nominated: isNominated,
      nomination_fee: nominationFee,
      discount: discount,
      discount_reason: discountReason,
      portal_fee: portalFee,
      hpb_points: hpbPoints,
      reservation_route: reservationRoute,
      payment_method: paymentMethod,
      hair_material: hairMaterial,
      options: options,
      cancel_fee: cancelFee,
      next_booking_date: nextBookingDate,
      next_booking_time: nextBookingTime,
      next_booking_staff_name: nextBookingStaffName,
      next_booking_line_reminder: nextBookingLineReminder,
      is_minimo: isMinimo,
      treatment_minutes: treatmentMinutes,
      status: "draft",
      source: "checkout" as SalesSource,
      source_reservation_id: sourceReservationId || null,
      created_at: serverTimestamp()
    };

    const colRef = collection(db, SALES_COLLECTION);
    let docRef: any;

    // Fetch existing unmerged CSV records for this date
    const qFuzzy = query(colRef, where("date", "==", date), where("source", "==", "hotpepper"));
    const fuzzySnap = await getDocs(qFuzzy);
    const existingCsvRecords = fuzzySnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
      .filter((d: any) => d.merge_status !== "DELETED" && d.merge_status !== "MERGED_PRIMARY");

    let hpMatch = null;
    const payloadTotal = payload.tech_sales + payload.product_sales + payload.nomination_fee - payload.discount;
    const pStaff = String(payload.staff_name || "").replace(/\s+/g, "");
    
    // Priority 1: Exact Reservation ID match
    if (sourceReservationId) {
      hpMatch = existingCsvRecords.find((d: any) => d.source_reservation_id === sourceReservationId);
    }
    
    // Priority 2: Date + Staff + Time (+/- 15 mins) + Amount
    if (!hpMatch) {
      const timeToMins = (t: string) => {
         if(!t || !t.includes(":")) return 0;
         const [h, m] = t.split(":").map(Number);
         return h * 60 + m;
      };
      const pMins = timeToMins(payload.time);
      
      const possibleMatches = existingCsvRecords.filter((d: any) => {
         const dTotal = (d.tech_sales || 0) + (d.product_sales || 0) + (d.nomination_fee || 0) - (d.discount || 0);
         const dStaff = String(d.staff_name || "").replace(/\s+/g, "");
         const isSameStaff = dStaff === pStaff || dStaff === "フリー" || pStaff === "フリー";
         const dMins = timeToMins(d.time);
         const timeDiff = Math.abs(pMins - dMins);
         
         return dTotal === payloadTotal && isSameStaff && timeDiff <= 15;
      });
      if (possibleMatches.length === 1) {
          hpMatch = possibleMatches[0];
      }
    }
    
    // Priority 3: Date + Staff + Amount + Name (Normalized)
    if (!hpMatch) {
      const cleanPName = payload.customer_name.replace(/\s+/g, "");
      const possibleMatches = existingCsvRecords.filter((d: any) => {
         const dTotal = (d.tech_sales || 0) + (d.product_sales || 0) + (d.nomination_fee || 0) - (d.discount || 0);
         const dStaff = String(d.staff_name || "").replace(/\s+/g, "");
         const isSameStaff = dStaff === pStaff || dStaff === "フリー" || pStaff === "フリー";
         const cleanDName = String(d.customer_name || "").replace(/\s+/g, "");
         
         return dTotal === payloadTotal && isSameStaff && cleanDName === cleanPName;
      });
      if (possibleMatches.length === 1) {
          hpMatch = possibleMatches[0];
      }
    }

    if (hpMatch) {
      const hpData = hpMatch as any;
      // We found a CSV record. 
      // 1. Save the new manual record as MERGED_SOURCE
      // 2. Update the existing CSV record as MERGED_PRIMARY and append manual data
      
      docRef = await addDoc(colRef, {
        ...payload,
        merge_status: "MERGED_SOURCE",
        merged_into_id: hpData.id
      });
      
      const mergedPayload = {
        customer_type: payload.customer_type,
        customer_id: payload.customer_id,
        options: payload.options || hpData.options,
        payment_method: payload.payment_method,
        payment_status: "paid",
        reservation_route: hpData.reservation_route || payload.reservation_route,
        hpb_points: (hpData.hpb_points !== 0) ? hpData.hpb_points : payload.hpb_points,
        menu_course: hpData.menu_course || payload.menu_course,
        next_booking_date: payload.next_booking_date,
        next_booking_time: payload.next_booking_time,
        merge_status: "MERGED_PRIMARY",
        updated_at: serverTimestamp()
      };
      
      await updateDoc(hpData.ref, mergedPayload);
    } else {
      docRef = await addDoc(colRef, {
        ...payload,
        merge_status: "MANUAL_ONLY"
      });
    }
    
    // Automatically update reservation status if linked
    if (sourceReservationId) {
      const { updateReservationStatus } = await import('@/app/reservations/actions');
      await updateReservationStatus(sourceReservationId, 'completed');
      
      // If customer was newly created or linked, make sure reservation is updated with customer ID
      if (customerId) {
        await updateDoc(doc(db, 'reservations', sourceReservationId), {
          customer_id: customerId,
          updated_at: serverTimestamp()
        });
      }
    }

    // --- Create Auto Reservation for Next Booking ---
    if (nextBookingDate && nextBookingTime) {
      try {
        const h = parseInt(nextBookingTime.split(":")[0] || "0", 10);
        const m = parseInt(nextBookingTime.split(":")[1] || "0", 10);
        const endTotalMins = h * 60 + m + treatmentMinutes;
        const endHour = Math.floor(endTotalMins / 60);
        const endMin = endTotalMins % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        const { addReservation } = await import("@/app/reservations/actions");
        const resData = await addReservation({
          store_name: storeName,
          staff_id: "staff-" + nextBookingStaffName,
          staff_name: nextBookingStaffName,
          type: "reservation",
          customer_id: customerId || undefined,
          customer_name: customerName || undefined,
          customer_kana: lastNameKana ? `${lastNameKana} ${firstNameKana}`.trim() : undefined,
          date: nextBookingDate,
          start_time: nextBookingTime,
          end_time: endTime,
          menu_name: menuCourse || "次回予約",
          status: "booked",
          is_next_booking: true,
          expected_price: techSales + prodSales - discount,
        });
        
        if (resData.success && resData.id) {
          await updateDoc(docRef, { next_reservation_id: resData.id });
        }
      } catch (e) {
        console.error("Failed to auto-create next reservation:", e);
      }
    }

    // --- Inventory Sync ---
    await syncInventoryFromSale({ id: docRef.id, ...payload }, "deduct");

    await addAuditLog({
      table_name: SALES_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: { staffName, date, total: techSales + prodSales },
      actor: "POS端末"
    });

    revalidatePath("/staff-portal");
    revalidatePath("/staff-portal/sales");
    revalidatePath("/payroll");
    revalidatePath("/audit");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding checkout to Firestore:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCheckout(id: string, formData: FormData) {
  try {
    const staffId = formData.get("staff_id") as string;
    const staffName = formData.get("staff_name") as string;
    const storeName = formData.get("store_name") as string;
    const date = formData.get("date") as string;
    const time = formData.get("time") as string || "00:00";
    
    // Name handling
    const lastName = formData.get("last_name") as string || "";
    const firstName = formData.get("first_name") as string || "";
    const lastNameKana = formData.get("last_name_kana") as string || "";
    const firstNameKana = formData.get("first_name_kana") as string || "";
    
    const customerName = (lastName + " " + firstName).trim() || "名無し";
    const customerNameKana = (lastNameKana + " " + firstNameKana).trim() || "";
    
    let customerId = formData.get("customer_id") as string || null;
    const customerType = formData.get("customer_type") as "新規" | "リピ" | "不明";
    
    // Auto-create customer if ID is missing and we have a name
    if (!customerId && (lastName || firstName)) {
      const newCustomerRes = await addCustomer({
        name: customerName,
        last_name: lastName,
        first_name: firstName,
        name_kana: customerNameKana,
        last_name_kana: lastNameKana,
        first_name_kana: firstNameKana,
        phone: "",
        gender: "female",
        allergies: [],
        has_allergy: false,
        notes: "会計更新時に自動登録されました"
      });
      if (newCustomerRes.success) {
        customerId = newCustomerRes.id || null;
      }
    }

    const menuCourse = formData.get("menu_course") as string || "";
    const options = formData.get("options") as string || "";
    const techSales = parseInt(formData.get("tech_sales") as string || "0", 10);
    const prodSales = parseInt(formData.get("product_sales") as string || "0", 10);
    const isNominated = formData.get("is_nominated") === "true";
    const nominationFee = parseInt(formData.get("nomination_fee") as string || "0", 10);
    const discount = parseInt(formData.get("discount") as string || "0", 10);
    const discountReason = formData.get("discount_reason") as string || "";
    const portalFee = parseInt(formData.get("portal_fee") as string || "0", 10);
    const hpbPoints = parseInt(formData.get("hpb_points") as string || "0", 10);
    const cancelFee = parseInt(formData.get("cancel_fee") as string || "0", 10);
    const paymentMethod = formData.get("payment_method") as string || "現金";
    const reservationRoute = formData.get("reservation_route") as string || "その他";
    const hairMaterial = formData.get("hair_material") as string || "";
    
    const nextBookingDate = formData.get("next_booking_date") as string || "";
    const nextBookingTime = formData.get("next_booking_time") as string || "";
    const nextBookingLineReminder = formData.get("next_booking_line_reminder") === "true";
    const nextBookingStaffName = formData.get("next_booking_staff_name") as string || staffName;
    const isMinimo = formData.get("is_minimo") === "true" || reservationRoute.includes("ミニモ");
    const treatmentMinutes = parseInt(formData.get("treatment_minutes") as string || "60", 10);

    if (!staffName || !date) {
      return { success: false, error: "必須項目が入力されていません。" };
    }

    const payload = Object.fromEntries(
      Object.entries({
        staff_id: staffId || "staff-" + staffName,
        staff_name: staffName,
        store_name: storeName,
        date,
        time,
        customer_name: customerName,
        last_name: lastName,
        first_name: firstName,
        last_name_kana: lastNameKana,
        first_name_kana: firstNameKana,
        customer_id: customerId || null,
        customer_type: customerType,
        menu_course: menuCourse,
        tech_sales: techSales,
        product_sales: prodSales,
        is_nominated: isNominated,
        nomination_fee: nominationFee,
        discount: discount,
        discount_reason: discountReason,
        portal_fee: portalFee,
        hpb_points: hpbPoints,
        reservation_route: reservationRoute,
        payment_method: paymentMethod,
        hair_material: hairMaterial,
        options: options,
        cancel_fee: cancelFee,
        next_booking_date: nextBookingDate,
        next_booking_time: nextBookingTime,
        next_booking_staff_name: nextBookingStaffName,
        next_booking_line_reminder: nextBookingLineReminder,
        is_minimo: isMinimo,
        treatment_minutes: treatmentMinutes,
        updated_at: serverTimestamp()
      }).filter(([_, v]) => v !== undefined)
    );

    const docRef = doc(db, SALES_COLLECTION, id);
    const oldDoc = await getDoc(docRef);
    const oldData = oldDoc.exists() ? oldDoc.data() : null;
    
    await updateDoc(docRef, payload);

    if (oldData?.source_reservation_id && customerId) {
      // Ensure the source reservation is linked to this customer
      await updateDoc(doc(db, 'reservations', oldData.source_reservation_id), {
        customer_id: customerId,
        updated_at: serverTimestamp()
      });
    }

    // --- Auto Create/Update Reservation for Next Booking ---
    if (nextBookingDate && nextBookingTime) {
      try {
        const h = parseInt(nextBookingTime.split(":")[0] || "0", 10);
        const m = parseInt(nextBookingTime.split(":")[1] || "0", 10);
        const endTotalMins = h * 60 + m + treatmentMinutes;
        const endHour = Math.floor(endTotalMins / 60);
        const endMin = endTotalMins % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        const { addReservation, updateReservationTime, getReservationById } = await import("@/app/reservations/actions");
        
        let existingResId = oldData?.next_reservation_id;
        let shouldCreate = !existingResId;

        if (existingResId) {
          // Verify it still exists
          const existingRes = await getReservationById(existingResId);
          if (existingRes) {
            // Update time and date
            const resRef = doc(db, "reservations", existingResId);
            await updateDoc(resRef, {
              date: nextBookingDate,
              start_time: nextBookingTime,
              end_time: endTime,
              staff_name: nextBookingStaffName,
              staff_id: "staff-" + nextBookingStaffName,
              menu_name: menuCourse || "次回予約",
              expected_price: techSales + prodSales - discount,
              updated_at: serverTimestamp()
            });
            shouldCreate = false;
          } else {
            shouldCreate = true;
          }
        }

        if (shouldCreate) {
          const resData = await addReservation({
            store_name: storeName,
            staff_id: "staff-" + nextBookingStaffName,
            staff_name: nextBookingStaffName,
            type: "reservation",
            customer_id: customerId || undefined,
            customer_name: customerName || undefined,
            customer_kana: lastNameKana ? `${lastNameKana} ${firstNameKana}`.trim() : undefined,
            date: nextBookingDate,
            start_time: nextBookingTime,
            end_time: endTime,
            menu_name: menuCourse || "次回予約",
            status: "booked",
            is_next_booking: true,
            expected_price: techSales + prodSales - discount,
          });
          
          if (resData.success && resData.id) {
            await updateDoc(docRef, { next_reservation_id: resData.id });
          }
        }
      } catch (e) {
        console.error("Failed to auto-update next reservation:", e);
      }
    }

    revalidatePath("/staff-portal/sales");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating checkout in Firestore:", error);
    return { success: false, error: error.message };
  }
}

export async function importHotPepperCsv(formData: FormData) {
  try {
    const file = formData.get("csv_file") as File;
    const storeName = formData.get("store_name") as string || "不明店舗";
    
    const ctx = await getCurrentUserContext();
    const companyId = ctx.companyId;

    if (!file) return { success: false, error: "ファイルが選択されていません。" };

    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder("shift-jis");
    const text = decoder.decode(arrayBuffer);
    
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
    const rows = parsed.data as any[];

    // Helper for date formatting
    const formatDate = (rawDate: string) => {
      let dateFormatted = rawDate;
      if (rawDate.includes("/")) {
        const parts = rawDate.split("/");
        dateFormatted = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (rawDate.includes("-")) {
        const parts = rawDate.split("-");
        dateFormatted = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (rawDate.length === 8) {
        dateFormatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      }
      return dateFormatted;
    };

    // Step 1: Group rows by Accounting ID and collect min/max dates
    const groups: Record<string, any[]> = {};
    let minDate = "9999-99-99";
    let maxDate = "0000-00-00";

    rows.forEach(row => {
      const accountingId = row["会計ID"] || row["予約ID"] || "";
      const customerName = String(row["お客様名"] || row["顧客名"] || row["顧客氏名"] || row["customer"] || "不明").trim();
      let rawDate = String(row["会計日"] || row["来店日"] || "");
      let rawTime = String(row["会計時間"] || row["来店時間"] || "");
      
      if (!rawDate) {
        const dateTime = String(row["来店日時"] || row["予約日時"] || row["日時"] || "");
        if (dateTime.includes(" ")) {
          const parts = dateTime.split(" ");
          rawDate = parts[0];
          rawTime = parts[1];
        } else if (dateTime) {
          rawDate = dateTime;
        }
      }
      
      const groupId = accountingId || `${customerName}_${rawDate}_${rawTime}`;
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(row);

      const fDate = formatDate(rawDate);
      if (fDate && fDate < minDate) minDate = fDate;
      if (fDate && fDate > maxDate) maxDate = fDate;
    });

    const colRef = collection(db, SALES_COLLECTION);
    
    // Step 2: Fetch existing records to prevent duplicates and find manual records to merge
    const existingCsvRecords: any[] = [];
    const unmergedManualRecords: any[] = [];

    if (minDate !== "9999-99-99" && maxDate !== "0000-00-00") {
      const q = query(colRef, 
        where("date", ">=", minDate), 
        where("date", "<=", maxDate)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const d = doc.data();
        // Ignore DELETED and MERGED_SOURCE records
        if (d.merge_status === "DELETED" || d.merge_status === "MERGED_SOURCE") return;

        if (d.source === "hotpepper") {
          existingCsvRecords.push({ id: doc.id, ...d });
        } else {
          unmergedManualRecords.push({ id: doc.id, ref: doc.ref, ...d });
        }
      });
    }

    const batch = writeBatch(db);
    let importCount = 0;
    let skipCount = 0;
    let mergedCount = 0;

    // Step 3: Process each group
    Object.values(groups).forEach(groupRows => {
      const firstRow = groupRows[0];
      const rawStaffName = groupRows.find(r => r["スタッフ"] || r["担当スタッフ"] || r["スタッフ名"])?.["スタッフ"] || "フリー";
      const staffName = String(rawStaffName).replace(/\s+/g, "");
      let rawDate = String(firstRow["会計日"] || firstRow["来店日"] || "");
      let rawTime = String(firstRow["会計時間"] || firstRow["来店時間"] || "");
      
      if (!rawDate) {
        const dateTime = String(firstRow["来店日時"] || firstRow["予約日時"] || firstRow["日時"] || "");
        if (dateTime.includes(" ")) {
          const parts = dateTime.split(" ");
          rawDate = parts[0];
          rawTime = parts[1];
        } else if (dateTime) {
          rawDate = dateTime;
        }
      }
      
      const customerName = String(
        firstRow["お客様名"] || 
        firstRow["顧客名"] || 
        firstRow["顧客氏名"] || 
        firstRow["来店者名"] || 
        firstRow["予約者名"] || 
        firstRow["氏名"] ||
        firstRow["カナ氏名"] ||
        "HotPepper経由"
      ).trim();
      
      const parseMoney = (val: any) => {
        if (val === undefined || val === null) return 0;
        return parseInt(val.toString().replace(/[^\d-]/g, ""), 10) || 0;
      };

      let techSales = 0, prodSales = 0, discount = 0, hpbPoints = 0, nominationFee = 0;
      let menuCourses: string[] = [], discountReasons: string[] = [], optionsList: string[] = [];

      groupRows.forEach(row => {
        const category = String(row["区分"] || "");
        const amount = parseMoney(row["金額"]);
        const menu = String(row["メニュー・店販・割引・サービス・オプション"] || "");
        const isCancel = String(row["会計区分"] || "").includes("取り消し");
        const val = isCancel ? -Math.abs(amount) : amount;
        
        if (category.includes("店販")) prodSales += val;
        else if (category.includes("割引") || val < 0) {
          discount += isCancel ? -Math.abs(amount) : Math.abs(amount);
          if (menu && !discountReasons.includes(menu)) discountReasons.push(menu);
        } else if (category.includes("施術")) techSales += val;
        else if (menu.includes("指名料")) nominationFee += val;
        else techSales += val;

        if (menu && String(row["カテゴリ"] || "").includes("オプション")) {
          if (!optionsList.includes(menu)) optionsList.push(menu);
        } else if (menu && !menuCourses.includes(menu) && !menu.includes("割引") && !menu.includes("指名料") && !category.includes("店販")) {
          menuCourses.push(menu);
        }
        
        hpbPoints += isCancel ? -Math.abs(parseMoney(row["ポイント使用"])) : Math.abs(parseMoney(row["ポイント使用"]));
      });

      if (groupRows.some(r => String(r["会計区分"] || "").includes("取り消し")) && (techSales + prodSales === 0)) return;

      const dateFormatted = formatDate(rawDate);
      let timeFormatted = rawTime.includes(":") ? rawTime : `${rawTime.padStart(4, '0').substring(0, 2)}:${rawTime.padStart(4, '0').substring(2, 4)}`;

      const csvTotal = techSales + prodSales + nominationFee - discount;
      
      // Deduplication check: Is this CSV record already imported?
      // Match by date, time, staff, and total amount, or name.
      const isAlreadyImported = existingCsvRecords.some(r => {
         const rTotal = (r.tech_sales || 0) + (r.product_sales || 0) + (r.nomination_fee || 0) - (r.discount || 0);
         return r.date === dateFormatted && 
                r.time === timeFormatted && 
                rTotal === csvTotal && 
                (r.customer_name === customerName || r.staff_name === staffName);
      });

      if (isAlreadyImported) {
        skipCount++;
        return; // Skip this duplicate CSV record
      }

      // Find matching manual record to merge
      let manualMatch = null;
      
      // Priority 1: Exact Reservation ID match (if we had it in CSV, but usually it's in the row)
      const accountingId = firstRow["会計ID"] || firstRow["予約ID"] || "";
      if (accountingId) {
         manualMatch = unmergedManualRecords.find(m => m.source_reservation_id === accountingId);
      }
      
      // Priority 2: Date + Staff + Time (+/- 15 mins) + Amount
      if (!manualMatch) {
         const timeToMins = (t: string) => {
            if(!t || !t.includes(":")) return 0;
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
         };
         const csvMins = timeToMins(timeFormatted);
         
         const possibleMatches = unmergedManualRecords.filter(m => {
            const mTotal = (m.tech_sales || 0) + (m.product_sales || 0) + (m.nomination_fee || 0) - (m.discount || 0);
            const isSameStaff = m.staff_name === staffName || m.staff_name === "フリー" || staffName === "フリー";
            const mMins = timeToMins(m.time);
            const timeDiff = Math.abs(csvMins - mMins);
            
            return m.date === dateFormatted && mTotal === csvTotal && isSameStaff && timeDiff <= 15;
         });
         if (possibleMatches.length === 1) {
             manualMatch = possibleMatches[0];
         }
      }
      
      // Priority 3: Date + Staff + Amount + Name (Normalized)
      if (!manualMatch) {
         const cleanCustomerName = customerName.replace(/\s+/g, "");
         const possibleMatches = unmergedManualRecords.filter(m => {
            const mTotal = (m.tech_sales || 0) + (m.product_sales || 0) + (m.nomination_fee || 0) - (m.discount || 0);
            const isSameStaff = m.staff_name === staffName || m.staff_name === "フリー" || staffName === "フリー";
            const cleanMName = String(m.customer_name || "").replace(/\s+/g, "");
            
            return m.date === dateFormatted && mTotal === csvTotal && isSameStaff && cleanMName === cleanCustomerName;
         });
         if (possibleMatches.length === 1) {
             manualMatch = possibleMatches[0];
         }
      }

      let paymentMethod = "未入力";
      let paymentStatus = "unpaid";
      let note = "";
      const docRef = doc(colRef);

      if (manualMatch) {
        paymentMethod = manualMatch.payment_method || "未入力";
        paymentStatus = manualMatch.payment_status || "unpaid";
        note = manualMatch.note || "";
        
        // Mark manual record as MERGED_SOURCE instead of deleting
        batch.update(manualMatch.ref, {
           merge_status: "MERGED_SOURCE",
           merged_into_id: docRef.id,
           updated_at: serverTimestamp()
        });
        
        // Remove from unmerged list so it's not merged again
        const idx = unmergedManualRecords.findIndex(m => m.id === manualMatch.id);
        if (idx !== -1) unmergedManualRecords.splice(idx, 1);
        
        mergedCount++;
      }

      batch.set(docRef, {
        companyId: companyId || "company_default",
        staff_id: "unknown",
        staff_name: staffName,
        store_name: storeName,
        date: dateFormatted,
        time: timeFormatted,
        customer_name: customerName,
        customer_type: groupRows.some(r => (r["新規再来"] || "").includes("新規")) ? "新規" : "リピ",
        menu_course: menuCourses.slice(0, 3).join(", "),
        options: optionsList.join(", "),
        tech_sales: techSales,
        product_sales: prodSales,
        is_nominated: nominationFee !== 0,
        nomination_fee: nominationFee,
        discount: discount,
        discount_reason: discountReasons.join(", ") || "CSV一括読込",
        hpb_points: hpbPoints,
        reservation_route: "ホットペッパー",
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        note: note,
        status: "draft",
        merge_status: manualMatch ? "MERGED_PRIMARY" : "CSV_ONLY",
        source: "hotpepper" as SalesSource,
        created_at: serverTimestamp()
      });
      importCount++;
    });

    await batch.commit();
    revalidatePath("/staff-portal/sales");
    return { success: true, count: importCount, skipped: skipCount, merged: mergedCount };
  } catch (error: any) {
    console.error("Error importing CSV:", error);
    return { success: false, error: error.message };
  }
}

export async function closeDailySales(date: string) {
  try {
    const colRef = collection(db, SALES_COLLECTION);
    const q = query(colRef, where("date", "==", date), where("status", "==", "draft"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { success: true, count: 0 };
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.update(d.ref, { status: "closed" }));
    await batch.commit();
    return { success: true, count: snapshot.size };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSale(id: string, deletedByStaffName?: string) {
  try {
    const docRef = doc(db, SALES_COLLECTION, id);
    const snap = await getDocs(query(collection(db, SALES_COLLECTION), where("__name__", "==", id)));
    if (!snap.empty) {
      const saleData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
      await syncInventoryFromSale(saleData, "return");
      
      // 削除時に元の予約のステータスを戻す
      if (saleData.source_reservation_id) {
        try {
          await updateDoc(doc(db, "reservations", saleData.source_reservation_id), { 
            status: "booked",
            updated_at: serverTimestamp()
          });
        } catch (e) {
          console.error("Failed to revert reservation status:", e);
        }
      }

      await addAuditLog({
        table_name: SALES_COLLECTION,
        record_id: id,
        action: "DELETE",
        old_data: saleData,
        new_data: null,
        actor: deletedByStaffName || "不明スタッフ"
      });
    }
    await deleteDoc(docRef);
    revalidatePath("/staff-portal/sales");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearMonthlyCsvImports(year: number, month: number) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const q = query(collection(db, SALES_COLLECTION), where("date", ">=", startDate), where("date", "<=", endDate));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach(d => {
      if (d.data().source === "hotpepper") {
        batch.delete(d.ref);
        count++;
      }
    });
    if (count > 0) await batch.commit();
    revalidatePath("/staff-portal/sales");
    return { success: true, count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
