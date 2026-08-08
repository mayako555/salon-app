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
import { seedSalesMasterData } from "./seeds";
import { SalesMasterItem } from "@/types/master";
import { addAuditLog } from "../audit/actions";
import { addCustomer } from "@/lib/customers";
import { syncInventoryFromSale } from "../inventory/inventory-actions";
import { getCurrentUserContext } from "@/lib/auth-server";
import { requireFeature } from "@/lib/feature-utils";

export async function mapReservationToSalesRecord(res: any): Promise<SalesRecord> {
  let treatmentMinutes = 60;
  if (res.start_time && res.end_time) {
    const [h1, m1] = res.start_time.split(":").map(Number);
    const [h2, m2] = res.end_time.split(":").map(Number);
    treatmentMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  }

  const cName = (res.customer_name && res.customer_name !== "-") ? res.customer_name : (res.customer_kana && res.customer_kana !== "-" ? res.customer_kana : "予定");
  const nameParts = cName !== "予定" ? cName.split(/[\s　]+/) : ["予定", ""];
  
  const kanaStr = res.customer_kana && res.customer_kana !== "-" ? res.customer_kana : (cName !== "予定" ? cName : "");
  const kanaParts = kanaStr.split(/[\s　]+/);

  return {
    id: "new",
    staff_id: res.staff_id,
    staff_name: res.staff_name,
    store_name: res.store_name,
    date: res.date,
    time: res.start_time,
    customer_id: res.customer_id,
    customer_name: cName,
    last_name: nameParts[0] || "",
    first_name: nameParts[1] || "",
    last_name_kana: kanaParts[0] || "",
    first_name_kana: kanaParts[1] || "",
    customer_type: "不明",
    menu_course: res.menu_name || "",
    tech_sales: res.expected_price || 0,
    product_sales: 0,
    is_nominated: false,
    nomination_fee: 0,
    discount: 0,
    discount_reason: "",
    portal_fee: 0,
    reservation_route: res.portal === "HPB" ? "HOT PEPPER Beauty" : (res.portal || "Direct"),
    status: "draft",
    payment_method: "cash",
    hpb_points: 0,
    source: "checkout",
    source_reservation_id: res.id,
    hair_material: "",
    options: "",
    cancel_fee: 0,
    treatment_minutes: treatmentMinutes,
    created_at: Date.now()
  };
}

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
  payment_status?: string;
  split_payments?: { method: string, amount: number }[];
  note?: string;
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
  if (ctx.companyId) await requireFeature(ctx.companyId, "sales");
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
  if (ctx.companyId) await requireFeature(ctx.companyId, "sales");
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
    
    // Strict CSV-driven: only hotpepper source records are used for aggregation.
    filteredSales = sales.filter(s => 
      s.companyId === ctx.companyId && 
      s.source === "hotpepper" &&
      s.merge_status !== "DELETED"
    );

    const { getStaffList } = await import("../staff/actions");
    const staffList = await getStaffList({ includeResigned: true });
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

export async function checkoutReservation(reservationId: string, salesData: Partial<SalesRecord>) {
  try {
    const ctx = await getCurrentUserContext();
  if (ctx.companyId) await requireFeature(ctx.companyId, "sales");
    if (!ctx.companyId) throw new Error("認証エラー");

    // Check if sales record already exists for this reservation
    const q = query(
      collection(db, SALES_COLLECTION),
      where("source_reservation_id", "==", reservationId),
      limit(1)
    );
    const snap = await getDocs(q);
    
    let saleId = "";
    if (!snap.empty) {
      saleId = snap.docs[0].id;
      const docRef = doc(db, SALES_COLLECTION, saleId);
      await updateDoc(docRef, {
        ...salesData,
        updated_at: serverTimestamp()
      });
    } else {
      const { id, ...dataToCreate } = salesData;
      const docRef = await addDoc(collection(db, SALES_COLLECTION), {
        ...dataToCreate,
        source_reservation_id: reservationId,
        companyId: ctx.companyId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      saleId = docRef.id;
    }

    // Also update reservation status
    const { updateReservationStatus } = await import("@/app/reservations/actions");
    await updateReservationStatus(reservationId, "completed");

    revalidatePath("/sales");
    revalidatePath("/staff-portal/sales");
    revalidatePath("/staff-portal/reservations");
    return { success: true, id: saleId };
  } catch (err: any) {
    console.error(err);
    throw new Error(err.message || "会計処理に失敗しました");
  }
}

export async function updatePaymentInfo(id: string, paymentMethod: string, paymentStatus: string, note: string, splitPayments?: { method: string, amount: number }[]) {
  try {
    const ctx = await getCurrentUserContext();
  if (ctx.companyId) await requireFeature(ctx.companyId, "sales");
    if (!ctx.companyId) throw new Error("認証エラー");

    const docRef = doc(db, SALES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("データが見つかりません");
    const data = snap.data();
    if (data.companyId !== ctx.companyId) throw new Error("権限がありません");

    const updates: any = {
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      note: note,
      updated_at: serverTimestamp()
    };
    if (splitPayments !== undefined) {
      updates.split_payments = splitPayments;
    }

    await updateDoc(docRef, updates);

    // Mark the source reservation as completed if it exists
    if (data.source_reservation_id) {
      const { updateReservationStatus } = await import("@/app/reservations/actions");
      await updateReservationStatus(data.source_reservation_id, "completed");
    }

    await addAuditLog({
      action: "UPDATE",
      table_name: SALES_COLLECTION,
      record_id: id,
      old_data: { payment_method: data.payment_method, payment_status: data.payment_status, note: data.note, split_payments: data.split_payments },
      new_data: { payment_method: paymentMethod, payment_status: paymentStatus, note: note, split_payments: splitPayments },
      actor: ctx.uid || "unknown",
    });

    revalidatePath("/sales");
    revalidatePath("/staff-portal/sales");
    revalidatePath("/dashboard");
    revalidatePath("/admin/sales/debug");
    return { success: true };
  } catch (err: any) {
    console.error(err);
    throw new Error(err.message || "更新に失敗しました");
  }
}

export async function importHotPepperCsv(formData: FormData) {
  try {
    const file = formData.get("csv_file") as File;
    const storeName = formData.get("store_name") as string || "不明店舗";
    
    const ctx = await getCurrentUserContext();
  if (ctx.companyId) await requireFeature(ctx.companyId, "sales");
    const companyId = ctx.companyId;

    if (!file) return { success: false, error: "ファイルが選択されていません。" };

    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder("shift-jis");
    const text = decoder.decode(arrayBuffer);
    
    // Fetch master items to calculate duration
    const { getMasterItems } = await import("./master-actions");
    const masterItems = await getMasterItems("all");
    
    // Helper to parse duration string (e.g. "90分", "1.5h", "1時間30分") to minutes
    const parseDurationToMinutes = (durationStr: string | undefined): number => {
      if (!durationStr) return 60;
      let totalMinutes = 0;
      const hoursMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*(?:時間|h)/i);
      const minutesMatch = durationStr.match(/(\d+)\s*分/);
      
      if (hoursMatch) totalMinutes += parseFloat(hoursMatch[1]) * 60;
      if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);
      
      if (totalMinutes === 0) {
        const justNumber = parseInt(durationStr, 10);
        if (!isNaN(justNumber)) return justNumber;
        return 60; // Default
      }
      return totalMinutes;
    };
    
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
      if (fDate && fDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        if (fDate < minDate) minDate = fDate;
        if (fDate > maxDate) maxDate = fDate;
      }
    });

    const colRef = collection(db, SALES_COLLECTION);
    
    const existingCsvRecords: any[] = [];
    const existingReservations: any[] = [];

    if (minDate !== "9999-99-99" && maxDate !== "0000-00-00") {
      const q = query(colRef, 
        where("date", ">=", minDate), 
        where("date", "<=", maxDate)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.source === "hotpepper" && d.companyId === companyId) {
          existingCsvRecords.push({ id: doc.id, ...d });
        }
      });
      
      const resQ = query(collection(db, "reservations"), 
        where("date", ">=", minDate), 
        where("date", "<=", maxDate)
      );
      const resSnapshot = await getDocs(resQ);
      resSnapshot.forEach(doc => {
        const d = doc.data();
        if (d.companyId === companyId || !d.companyId) {
          existingReservations.push({ id: doc.id, ...d });
        }
      });
    }

    let importCount = 0;
    let skipCount = 0;

    const { getStaffList } = await import("../staff/actions");
    const staffs = await getStaffList({ includeResigned: true });

    // Step 3: Process each group
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    const commitPromises: Promise<void>[] = [];

    const commitCurrentBatch = () => {
      if (operationCount > 0) {
        commitPromises.push(currentBatch.commit());
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    };

    for (const groupRows of Object.values(groups)) {
      const firstRow = groupRows[0];
      const rawStaffName = groupRows.find(r => r["スタッフ"] || r["担当スタッフ"] || r["スタッフ名"])?.["スタッフ"] || "フリー";
      const staffName = String(rawStaffName).replace(/\s+/g, "");
      
      const staffMatch = staffs.find(s => s.name.replace(/\s+/g, "") === staffName);
      const staffId = staffMatch ? staffMatch.id : "unknown";

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
        firstRow["お客様（カナ）"] ||
        firstRow["お客様(カナ)"] ||
        firstRow["お客様名（カナ）"] ||
        firstRow["お客様名(カナ)"] ||
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

      if (groupRows.some(r => String(r["会計区分"] || "").includes("取り消し")) && (techSales + prodSales === 0)) continue;

      const dateFormatted = formatDate(rawDate);
      let timeFormatted = rawTime.includes(":") ? rawTime : `${rawTime.padStart(4, '0').substring(0, 2)}:${rawTime.padStart(4, '0').substring(2, 4)}`;

      const csvTotal = techSales + prodSales + nominationFee - discount;
      
      // Strict architecture: We only check if THIS EXACT CSV RECORD was already imported.
      const isAlreadyImported = existingCsvRecords.some(r => {
         const rTotal = (r.tech_sales || 0) + (r.product_sales || 0) + (r.nomination_fee || 0) - (r.discount || 0);
         return r.date === dateFormatted && 
                r.time === timeFormatted && 
                rTotal === csvTotal && 
                (r.customer_name === customerName || r.staff_name === staffName);
      });

      if (isAlreadyImported) {
        skipCount++;
        continue; // Skip this duplicate CSV record
      }

      const docRef = doc(colRef);

      currentBatch.set(docRef, {
        companyId: companyId || "company_default",
        staff_id: staffId,
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
        payment_method: "未入力",
        payment_status: "unpaid",
        hair_material: "",
        note: "",
        status: "closed",
        source: "hotpepper" as SalesSource,
        merge_status: "CSV_ONLY",
        created_at: serverTimestamp()
      });

      // --- 予約自動生成 (CSV推定予約) ---
      // バッチ処理等を見据えた推定予約の重複チェック
      const isResAlreadyImported = existingReservations.some(r => {
        if (r.source_sales_id && r.source_sales_id === docRef.id) return true;
        return r.companyId === (companyId || "company_default") &&
               r.store_name === storeName &&
               r.staff_name === staffName &&
               r.customer_name === customerName &&
               r.date === dateFormatted &&
               r.end_time === timeFormatted &&
               (r.expected_price || 0) === csvTotal;
      });

      if (!isResAlreadyImported) {
        const resDocRef = doc(collection(db, "reservations"));
        
        // 所要時間の計算（複数メニュー時は合計する。セットメニューの場合はマスタのセット時間が適用される）
        let durationMinutes = 0;
        let matchedAny = false;
        if (menuCourses.length > 0) {
          for (const menu of menuCourses) {
            const matchedItem = masterItems.find(mi => mi.name === menu || mi.hpbName === menu);
            if (matchedItem && matchedItem.duration) {
              durationMinutes += parseDurationToMinutes(matchedItem.duration);
              matchedAny = true;
            }
          }
        }
        if (!matchedAny || durationMinutes === 0) {
          durationMinutes = 60;
        }

        // Calculate start time
        const [endH, endM] = timeFormatted.split(":").map(Number);
        let totalM = (endH || 0) * 60 + (endM || 0) - durationMinutes;
        if (totalM < 0) totalM += 24 * 60;
        const startH = Math.floor(totalM / 60);
        const startM = totalM % 60;
        const startTimeFormatted = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

        currentBatch.set(resDocRef, {
          companyId: companyId || "company_default",
          store_name: storeName,
          staff_id: staffId,
          staff_name: staffName,
          type: "reservation",
          customer_name: customerName,
          date: dateFormatted,
          start_time: startTimeFormatted,
          end_time: timeFormatted,
          menu_name: menuCourses.slice(0, 3).join(", "),
          portal: "HPB",
          status: "completed",
          customer_type: groupRows.some(r => (r["新規再来"] || "").includes("新規")) ? "新規" : "再来",
          source: "csv_estimated",
          source_sales_id: docRef.id,
          is_confirmed: false,
          expected_price: csvTotal,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        operationCount++;
      }
      // ---------------------------------
      operationCount++; // for the sales doc

      importCount++;
      if (operationCount >= 400) {
        commitCurrentBatch();
      }
    }

    commitCurrentBatch();
    await Promise.all(commitPromises);
    revalidatePath("/staff-portal/sales");
    return { success: true, count: importCount, skipped: skipCount, merged: 0 };
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
