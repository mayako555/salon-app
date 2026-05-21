"use server";

import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";

export type KarteRecord = {
  id: string;
  customer_id: string;
  staff_id: string;
  staff_name: string;
  date: any;
  service_type: 'eyelash_ext' | 'lash_lift' | 'eyebrow' | 'and_healthy';
  visit_type: 'new' | 'repeat' | 'refill'; // 付け足し/付け替え等
  
  // Design Details (Specialized by Service)
  design: {
    // まつ毛共通
    curl?: string;
    thickness?: string;
    length?: string; // e.g. "9-11-10"
    count?: number;
    style?: string;
    
    // アイブロウ共通
    shape?: string;
    wax_type?: string;
    thinning?: boolean; // 間引き
    brow_perm?: boolean; // 眉パーマ
    stencil?: boolean; // ステンシル
    
    // パーマ詳細
    perm_solution_1_time?: number; // 1液放置時間
    perm_solution_2_time?: number; // 2液放置時間
    
    // オプション・詳細
    options?: string[];
    hair_material?: string; // セーブル/カシミア等
    
    // まつ毛詳細カウント (左右別)
    left_remaining?: number;
    right_remaining?: number;
    left_added?: number;
    right_added?: number;
    left_total?: number;
    right_total?: number;
  };
  
  before_photo_url?: string;
  after_photo_url?: string;
  photos?: { url: string; description: string }[];
  treatment_photos?: { url: string; description: string }[];
  edit_history?: {
    edited_at: any;
    edited_by_id: string;
    edited_by_name: string;
    previous_data: any;
  }[];
  eye_diagram_url?: string; // 手書きの目のマーク・デザインマップ
  past_karte_photos?: { url: string; description: string }[];
  notes?: string;
  created_at: any;
};

const KARTE_COLLECTION = "karte_records";

export async function addKarteRecord(data: Omit<KarteRecord, 'id' | 'created_at' | 'edit_history'>) {
  try {
    const colRef = collection(db, KARTE_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...data,
      created_at: serverTimestamp(),
      edit_history: []
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding karte record:", error);
    return { success: false, error: error.message };
  }
}

export async function editKarteRecord(karteId: string, newData: Partial<KarteRecord>, editorId: string, editorName: string) {
  try {
    const { doc, getDoc, updateDoc } = await import("firebase/firestore");
    const docRef = doc(db, KARTE_COLLECTION, karteId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return { success: false, error: "Karte not found" };
    }
    
    const oldData = snapshot.data() as KarteRecord;
    const historyEntry = {
      edited_at: new Date().toISOString(),
      edited_by_id: editorId,
      edited_by_name: editorName,
      previous_data: { ...oldData }
    };
    
    const updatedHistory = [...(oldData.edit_history || []), historyEntry];
    
    // Clean up newData so we don't accidentally overwrite id or created_at
    const cleanData = { ...newData };
    delete cleanData.id;
    delete cleanData.created_at;
    delete cleanData.edit_history;

    await updateDoc(docRef, {
      ...cleanData,
      edit_history: updatedHistory
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error editing karte record:", error);
    return { success: false, error: error.message };
  }
}

export async function getKarteByCustomer(customerId: string): Promise<KarteRecord[]> {
  try {
    const colRef = collection(db, KARTE_COLLECTION);
    const q = query(colRef, where("customer_id", "==", customerId));
    const snapshot = await getDocs(q);
    
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as KarteRecord[];
    
    // Sort in-memory by date descending to avoid composite index requirement
    records.sort((a, b) => {
      const timeA = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
      const timeB = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
      return (timeB || 0) - (timeA || 0);
    });
    
    return records;
  } catch (error) {
    console.error("Error fetching karte records:", error);
    return [];
  }
}
