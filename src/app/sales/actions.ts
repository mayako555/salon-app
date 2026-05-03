"use server";

import Papa from "papaparse";
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
  writeBatch,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { SalesMasterItem, seedSalesMasterData } from "./seeds";
import { addAuditLog } from "../audit/actions";
import { revalidatePath } from "next/cache";

export type SalesSource = "checkout" | "hotpepper" | "manual";

export type SalesRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  store_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customer_name: string;
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
  next_booking_date?: string; // 次回予約日
  next_booking_time?: string; // 次回予約時間
  next_booking_line_reminder?: boolean; // 2日前のリマインダー送付
  customer_id?: string;
  is_minimo?: boolean;
  created_at: any; // Firestore Timestamp
};

const SALES_COLLECTION = "sales";

export async function getStoreMasterData(store: string): Promise<SalesMasterItem[]> {
  try {
    const colRef = collection(db, "sales_master");
    const q = query(colRef, where("store", "==", store), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      const allDocs = await getDocs(collection(db, "sales_master"));
      if (allDocs.empty) {
        await seedSalesMasterData();
        return getStoreMasterData(store);
      }
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SalesMasterItem[];
  } catch (error) {
    console.error("Error fetching store master data:", error);
    return [];
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
    const customerName = formData.get("customer_name") as string || "名無し";
    const customerId = formData.get("customer_id") as string || null;
    const customerType = formData.get("customer_type") as "新規" | "リピ" | "不明";
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
    const isMinimo = formData.get("is_minimo") === "true" || reservationRoute.includes("ミニモ");

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
      next_booking_line_reminder: nextBookingLineReminder,
      is_minimo: isMinimo,
      status: "draft",
      source: "checkout" as SalesSource,
      created_at: serverTimestamp()
    };

    const colRef = collection(db, SALES_COLLECTION);
    const docRef = await addDoc(colRef, payload);

    // --- LINE Automation Trigger ---
    if (customerId && nextBookingDate) {
      const customer = await getCustomerById(customerId);
      if (customer?.line_user_id) {
        await sendBookingConfirmation(
          customer.name,
          customer.line_user_id,
          nextBookingDate,
          nextBookingTime
        );
      }
    }

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
    return { success: true };
  } catch (error: any) {
    console.error("Error adding checkout to Firestore:", error);
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

    // Step 1: Group rows by Accounting ID or unique visit identifier
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

    // Step 2: Process each group as a single sales record
    Object.values(groups).forEach(groupRows => {
      const firstRow = groupRows[0];
      
      const staffRow = groupRows.find(r => r["スタッフ"] || r["担当スタッフ"] || r["スタッフ名"]) || firstRow;
      const rawStaffName = staffRow["スタッフ"] || staffRow["担当スタッフ"] || staffRow["スタッフ名"] || "フリー";
      // Trim all spaces to avoid "佐藤 瑠美" vs "佐藤瑠美"
      const staffName = String(rawStaffName).replace(/\s+/g, "");
      
      const rawDate = String(firstRow["会計日"] || firstRow["来店日"] || "");
      const rawTime = String(firstRow["会計時間"] || "");
      const rawCustomerName = firstRow["お客様名"] || firstRow["顧客名"] || "HotPepper経由";
      const customerName = String(rawCustomerName).trim();
      
      const parseMoney = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        return parseInt(val.toString().replace(/[^\d-]/g, ""), 10) || 0;
      };

      let techSales = 0;
      let prodSales = 0;
      let discount = 0;
      let hpbPoints = 0;
      let nominationFee = 0;
      let menuCourses: string[] = [];
      let discountReasons: string[] = [];

      groupRows.forEach(row => {
        const category = String(row["区分"] || row["カテゴリ"] || "");
        const amount = parseMoney(row["金額"]);
        const menu = String(row["メニュー・店販・割引・サービス・オプション"] || row["予約メニュー"] || "");
        const isCancel = String(row["会計区分"] || "").includes("取り消し");
        const val = isCancel ? -Math.abs(amount) : amount;
        
        if (category.includes("店販")) {
          prodSales += val;
        } else if (category.includes("割引") || menu.includes("割引") || (val < 0 && !isCancel)) {
          // It's a discount if category/menu says so, OR if it's a negative amount in a normal 'accounting' row
          discount += Math.abs(val);
          if (menu && !discountReasons.includes(menu)) discountReasons.push(menu);
        } else if (category.includes("施術")) {
          techSales += val;
        } else if (category.includes("その他") || category.includes("サービス")) {
           if (menu.includes("指名料")) nominationFee += val;
           else techSales += val;
        } else {
           techSales += val;
        }
        
        if (menu && !menuCourses.includes(menu) && !menu.includes("割引") && !menu.includes("指名料")) {
          menuCourses.push(menu);
        }
        
        hpbPoints += parseMoney(row["ポイント使用"] || row["利用ポイント"] || "0");
      });

      const isNominated = nominationFee > 0;

      // Date & Time formatting
      let dateFormatted = "";
      if (rawDate.length === 8 && /^\d+$/.test(rawDate)) {
        dateFormatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      } else {
        const dateMatch = rawDate.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        dateFormatted = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : new Date().toISOString().split("T")[0];
      }

      let timeFormatted = "00:00";
      if (rawTime && /^\d+$/.test(rawTime)) {
        const paddedTime = rawTime.padStart(6, '0');
        timeFormatted = `${paddedTime.substring(0, 2)}:${paddedTime.substring(2, 4)}`;
      } else {
        const timeMatch = rawDate.match(/(\d{1,2}):(\d{2})/) || rawTime.match(/(\d{1,2}):(\d{2})/);
        timeFormatted = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : "00:00";
      }

      const docRef = doc(colRef);
      batch.set(docRef, {
        staff_id: "unknown",
        staff_name: staffName,
        store_name: storeName,
        date: dateFormatted,
        time: timeFormatted,
        customer_name: customerName,
        customer_no: firstRow["お客様番号"] || "",
        customer_type: groupRows.some(r => (r["新規再来"] || "").includes("新規")) ? "新規" : "リピ",
        menu_course: menuCourses.slice(0, 3).join(", "),
        tech_sales: techSales,
        product_sales: prodSales,
        is_nominated: isNominated,
        nomination_fee: nominationFee,
        discount: discount,
        discount_reason: discountReasons.length > 0 ? discountReasons.join(", ") : "CSV一括読込",
        portal_fee: 0,
        hpb_points: hpbPoints,
        reservation_route: firstRow["予約経路"] || "ホットペッパー",
        payment_method: firstRow["支払方法"] || "不明",
        hair_material: "",
        options: "",
        cancel_fee: 0,
        status: "draft",
        source: "hotpepper" as SalesSource,
        created_at: serverTimestamp()
      });
      importCount++;
    });

    await batch.commit();
    revalidatePath("/staff-portal");
    revalidatePath("/staff-portal/sales");
    return { success: true, count: importCount };
  } catch (error: any) {
    console.error("Error importing CSV to Firestore:", error);
    return { success: false, error: error.message };
  }
}

export async function closeDailySales(date: string) {
  try {
    const colRef = collection(db, SALES_COLLECTION);
    const q = query(colRef, where("date", "==", date), where("status", "==", "draft"));
    
    const getDocsPromise = async () => {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { success: true, count: 0 };

      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { status: "closed" });
      });
      
      await batch.commit();

      await addAuditLog({
        table_name: SALES_COLLECTION,
        record_id: `daily-close-${date}`,
        action: "CLOSE_ACCOUNTING",
        old_data: { date, status: "draft" },
        new_data: { date, status: "closed", count: snapshot.size },
        actor: "管理者"
      });

      return { success: true, count: snapshot.size };
    };

    const res = await Promise.race([
      getDocsPromise(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore operation timed out (15s)")), 15000)
      )
    ]);

    revalidatePath("/staff-portal");
    revalidatePath("/staff-portal/sales");
    return res as any;
  } catch (error: any) {
    console.error("Error closing sales in Firestore:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSale(id: string) {
  try {
    const docRef = doc(db, SALES_COLLECTION, id);
    // Use actual delete for cleanup
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(docRef);

    revalidatePath("/staff-portal/sales");
    revalidatePath("/sales");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting sale:", error);
    return { success: false, error: error.message };
  }
}

export async function clearMonthlyCsvImports(year: number, month: number) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const colRef = collection(db, SALES_COLLECTION);
    // Use a simpler query that doesn't require composite indexes
    const q = query(
      colRef, 
      where("date", ">=", startDate), 
      where("date", "<=", endDate)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { success: true, count: 0, message: "対象データが見つかりませんでした。" };

    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach(d => {
      const data = d.data();
      // Broaden filter to catch old records without 'source' field
      const isHotPepper = 
        data.source === "hotpepper" || 
        String(data.reservation_route).includes("ホットペッパー") ||
        String(data.reservation_route).includes("HOT PEPPER") ||
        data.discount_reason === "CSV一括読込";

      if (isHotPepper) {
        batch.delete(d.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    revalidatePath("/sales");
    return { success: true, count, message: `${count}件の取り込みデータを削除しました。` };
  } catch (error: any) {
    console.error("Error clearing CSV imports:", error);
    return { success: false, error: error.message };
  }
}
