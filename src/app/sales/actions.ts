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
  getDoc
} from "firebase/firestore";
import { SalesMasterItem, seedSalesMasterData } from "./seeds";
import { addAuditLog } from "../audit/actions";
import { addCustomer } from "@/lib/customers";
import { syncInventoryFromSale } from "../inventory/inventory-actions";

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
  next_booking_time?: string; // 次回予約時間
  next_booking_staff_name?: string; // 次回予約担当者
  next_booking_line_reminder?: boolean; // 2日前のリマインダー送付
  customer_id?: string;
  is_minimo?: boolean;
  treatment_minutes?: number; // 稼働率計算用
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
    const q = query(
      collection(db, SALES_COLLECTION),
      where("source_reservation_id", "==", resId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as SalesRecord;
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
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const colRef = collection(db, SALES_COLLECTION);
    const q = query(
      colRef, 
      where("date", ">=", startDate), 
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );

    const getDocsWithTimeout = Promise.race([
      getDocs(q),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore fetch timed out (10s)")), 10000)
      )
    ]);

    const snapshot = await getDocsWithTimeout as any;
    return snapshot.docs.map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at || null
      };
    }) as SalesRecord[];
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
    const docRef = await addDoc(colRef, payload);
    
    // Automatically update reservation status if linked
    if (sourceReservationId) {
      const { updateReservationStatus } = await import('@/app/reservations/actions');
      await updateReservationStatus(sourceReservationId, 'completed');
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
    
    if (!file) return { success: false, error: "ファイルが選択されていません。" };

    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder("shift-jis");
    const text = decoder.decode(arrayBuffer);
    
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
    const rows = parsed.data as any[];

    // Step 1: Group rows by Accounting ID
    const groups: Record<string, any[]> = {};
    rows.forEach(row => {
      const accountingId = row["会計ID"] || row["予約ID"] || "";
      const customerName = row["お客様名"] || row["顧客名"] || row["顧客氏名"] || row["customer"] || "不明";
      const rawDate = row["会計日"] || row["来店日"] || "";
      const rawTime = row["会計時間"] || row["来店時間"] || "";
      
      const groupId = accountingId || `${customerName}_${rawDate}_${rawTime}`;
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(row);
    });

    const batch = writeBatch(db);
    const colRef = collection(db, SALES_COLLECTION);
    let importCount = 0;

    // Step 2: Process each group
    Object.values(groups).forEach(groupRows => {
      const firstRow = groupRows[0];
      const rawStaffName = groupRows.find(r => r["スタッフ"] || r["担当スタッフ"] || r["スタッフ名"])?.["スタッフ"] || "フリー";
      const staffName = String(rawStaffName).replace(/\s+/g, "");
      const rawDate = String(firstRow["会計日"] || firstRow["来店日"] || "");
      const rawTime = String(firstRow["会計時間"] || "");
      const customerName = String(firstRow["お客様名"] || firstRow["顧客名"] || "HotPepper経由").trim();
      
      const parseMoney = (val: any) => {
        if (val === undefined || val === null) return 0;
        return parseInt(val.toString().replace(/[^\d-]/g, ""), 10) || 0;
      };

      let techSales = 0, prodSales = 0, discount = 0, hpbPoints = 0, nominationFee = 0;
      let menuCourses: string[] = [], discountReasons: string[] = [];

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

        if (menu && !menuCourses.includes(menu) && !menu.includes("割引") && !menu.includes("指名料")) menuCourses.push(menu);
        hpbPoints += isCancel ? -Math.abs(parseMoney(row["ポイント使用"])) : Math.abs(parseMoney(row["ポイント使用"]));
      });

      if (groupRows.some(r => String(r["会計区分"] || "").includes("取り消し")) && (techSales + prodSales === 0)) return;

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

      let timeFormatted = rawTime.includes(":") ? rawTime : `${rawTime.padStart(4, '0').substring(0, 2)}:${rawTime.padStart(4, '0').substring(2, 4)}`;

      const docRef = doc(colRef);
      batch.set(docRef, {
        staff_id: "unknown",
        staff_name: staffName,
        store_name: storeName,
        date: dateFormatted,
        time: timeFormatted,
        customer_name: customerName,
        customer_type: groupRows.some(r => (r["新規再来"] || "").includes("新規")) ? "新規" : "リピ",
        menu_course: menuCourses.slice(0, 3).join(", "),
        tech_sales: techSales,
        product_sales: prodSales,
        is_nominated: nominationFee !== 0,
        nomination_fee: nominationFee,
        discount: discount,
        discount_reason: discountReasons.join(", ") || "CSV一括読込",
        hpb_points: hpbPoints,
        reservation_route: "ホットペッパー",
        status: "draft",
        source: "hotpepper" as SalesSource,
        created_at: serverTimestamp()
      });
      importCount++;
    });

    await batch.commit();
    revalidatePath("/staff-portal/sales");
    return { success: true, count: importCount };
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

export async function deleteSale(id: string) {
  try {
    const docRef = doc(db, SALES_COLLECTION, id);
    const snap = await getDocs(query(collection(db, SALES_COLLECTION), where("__name__", "==", id)));
    if (!snap.empty) {
      const saleData = { id: snap.docs[0].id, ...snap.docs[0].data() };
      await syncInventoryFromSale(saleData, "return");
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
