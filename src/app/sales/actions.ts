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
  customer_id?: string;
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
    return snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data()
    })) as SalesRecord[];
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

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data as any[];

    const batch = writeBatch(db);
    const colRef = collection(db, SALES_COLLECTION);
    let importCount = 0;

    rows.forEach((row, i) => {
      const rawDate = row["来店日"] || row["来店日時"] || row["予約日時"] || row["date"] || "";
      const staffName = row["担当スタッフ"] || row["スタッフ名"] || row["担当者"] || row["staff"] || "フリー";
      const techSales = parseInt(row["技術売上"] || row["tech_sales"] || "0", 10);
      const prodSales = parseInt(row["店販売上"] || row["product_sales"] || "0", 10);
      const isNominated = (row["指名"] || row["指名有無"] || row["nomination"] || "").includes("指名") || parseInt(row["指名料"] || "0") > 0;

      if (!rawDate && !staffName && techSales === 0) return;

      const dateMatch = rawDate.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      let dateFormatted = new Date().toISOString().split("T")[0];
      if (dateMatch) {
         dateFormatted = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      }

      const docRef = doc(colRef);
      batch.set(docRef, {
        staff_id: "unknown",
        staff_name: staffName,
        store_name: storeName,
        date: dateFormatted,
        time: "00:00",
        customer_name: "HotPepper経由",
        customer_type: "不明",
        menu_course: "CSV取込データ",
        tech_sales: isNaN(techSales) ? 0 : techSales,
        product_sales: isNaN(prodSales) ? 0 : prodSales,
        is_nominated: isNominated,
        nomination_fee: isNominated ? 550 : 0,
        discount: 0,
        discount_reason: "",
        portal_fee: 0,
        hpb_points: parseInt(row["ポイント使用"] || row["hpb_points"] || "0", 10) || 0,
        reservation_route: "ホットペッパー",
        payment_method: row["支払方法"] || "不明",
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
