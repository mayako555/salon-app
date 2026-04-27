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

export type Customer = {
  id: string;
  customer_no?: string; // お客様No.
  first_visit_date?: string; // 初来店日
  name: string;
  name_kana: string;
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
  
  // 来店きっかけ
  referral_source?: string[]; // 複数選択可
  referral_name?: string; // 紹介者名
  
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
  
  created_at: any;
  updated_at: any;
};

const CUSTOMERS_COLLECTION = "customers";

export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const colRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(colRef, orderBy("name_kana", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
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
    return { id: snapshot.id, ...snapshot.data() } as Customer;
  } catch (error) {
    console.error("Error fetching customer by ID:", error);
    return null;
  }
}

export async function addCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const colRef = collection(db, CUSTOMERS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding customer:", error);
    return { success: false, error: error.message };
  }
}
