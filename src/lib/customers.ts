"use server";

import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { getCurrentUserContext } from "./auth-server";

export type Customer = {
  id: string;
  companyId?: string;
  customer_no?: string; // お客様No.
  first_visit_date?: string; // 初来店日
  name: string; // Full name (e.g. "藤 衣")
  last_name?: string; // 名字
  first_name?: string; // 名前
  name_kana: string; // Full kana (e.g. "フジ マイ")
  last_name_kana?: string; // 名字フリガナ
  first_name_kana?: string; // 名前フリガナ
  gender: 'male' | 'female' | 'other';
  phone: string;
  postal_code?: string; // 郵便番号
  address?: string;
  email?: string;
  email_marketing_allowed?: boolean; // メール配信 可/不可
  birthday?: string;
  blood_type?: string; // 血液型
  occupation?: string;
  dm_allowed?: boolean; // DM 可/不可
  line_user_id?: string; // LINE ユーザーID
  is_minimo?: boolean; // ミニモからの集客かどうか
  
  // 来店きっかけ
  referral_source?: string[]; // 複数選択可
  referral_name?: string; // 紹介者名 (Text)
  referred_by_id?: string; // 紹介元顧客ID (System linkage)
  
  // 写真・SNS同意
  photo_permission?: 'yes' | 'no';
  sns_permission?: 'yes' | 'no';
  sns_permission_scope?: 'full' | 'eyes' | 'brows' | 'no';
  
  // Health / Allergies (Summary)
  allergies: string[];
  has_allergy: boolean; 
  risk_level?: 'red' | 'yellow' | 'none'; // UIで強調するため
  risk_flags?: string[]; // 具体的な注意内容のリスト
  
  // Service Specific (Most Recent) - For quick access in lists
  latest_counseling?: {
    menu_type: string;
    date: any;
  };
  
  chart_image_urls?: string[]; // スキャンしたカルテ画像のURLリスト
  notes?: string; // 自由記述のメモ
  store_name?: string; // 所属店舗 (例: "神戸", "六甲")
  same_day_cancel_count?: number; // 当日キャンセル回数
  
  created_at: any;
  updated_at: any;
};

const CUSTOMERS_COLLECTION = "customers";

export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const ctx = await getCurrentUserContext();
    const colRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(colRef, orderBy("name_kana", "asc"));
    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        created_at: data.created_at?.toMillis?.() || data.created_at || null,
        updated_at: data.updated_at?.toMillis?.() || data.updated_at || null
      };
    }) as Customer[];

    if (!ctx.companyId) throw new Error("会社IDが指定されていません");
    
    return customers.filter(c => c.companyId === ctx.companyId);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return { 
      id: snapshot.id, 
      ...data,
      created_at: data.created_at?.toMillis?.() || data.created_at || null,
      updated_at: data.updated_at?.toMillis?.() || data.updated_at || null
    } as Customer;
  } catch (error) {
    console.error("Error fetching customer by ID:", error);
    return null;
  }
}

export async function addCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("会社IDが指定されていません");

    const colRef = collection(db, CUSTOMERS_COLLECTION);
    
    // Filter out undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(colRef, {
      ...cleanData,
      companyId: ctx.companyId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding customer:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    const docRef = doc(db, CUSTOMERS_COLLECTION, id);
    
    // Filter out undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(docRef, {
      ...cleanData,
      updated_at: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const { doc, deleteDoc } = await import("firebase/firestore");
    const docRef = doc(db, CUSTOMERS_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkDeleteCustomers(ids: string[]) {
  try {
    const { writeBatch, doc } = await import("firebase/firestore");
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, CUSTOMERS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk deleting customers:", error);
    return { success: false, error: error.message };
  }
}

export async function mergeCustomers(masterId: string, duplicateIds: string[], mergedData?: Partial<Customer>) {
  try {
    const { writeBatch, doc, collection, query, where, getDocs, updateDoc } = await import("firebase/firestore");
    const batch = writeBatch(db);
    
    // 0. Update Master Data if provided
    if (mergedData) {
      // Filter out ID and timestamps from mergedData
      const { id, created_at, updated_at, ...cleanData } = mergedData as any;
      const masterRef = doc(db, CUSTOMERS_COLLECTION, masterId);
      batch.update(masterRef, { ...cleanData, updated_at: serverTimestamp() });
    }

    // 1. Migrate Karte Records
    const karteCol = collection(db, "karte_records");
    for (const dupId of duplicateIds) {
      const q = query(karteCol, where("customer_id", "==", dupId));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        batch.update(doc(db, "karte_records", d.id), { customer_id: masterId });
      });
    }

    // 2. Migrate Sales Records
    const salesCol = collection(db, "sales");
    for (const dupId of duplicateIds) {
      const q = query(salesCol, where("customerId", "==", dupId));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        batch.update(doc(db, "sales", d.id), { customerId: masterId });
      });
    }

    // 3. Delete Duplicate Customers
    for (const dupId of duplicateIds) {
      batch.delete(doc(db, CUSTOMERS_COLLECTION, dupId));
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error merging customers:", error);
    return { success: false, error: error.message };
  }
}
