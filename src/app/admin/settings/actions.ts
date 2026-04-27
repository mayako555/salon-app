"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";

export type MasterItem = {
  id: string;
  name: string;
  price: number;
};

export type MasterData = {
  menus: MasterItem[];
  materials: MasterItem[];
  options: MasterItem[];
};

const MASTER_COLLECTION = "master_data";

// Initial seed data
const initialSeed: MasterData = {
  menus: [
    { id: "m1", name: "60", price: 5900 },
    { id: "m2", name: "80", price: 7500 },
    { id: "m3", name: "100", price: 8300 },
    { id: "m4", name: "120", price: 9840 },
    { id: "m5", name: "140", price: 11340 },
    { id: "m6", name: "160", price: 12800 },
    { id: "m7", name: "180", price: 13860 },
    { id: "m8", name: "200", price: 15000 },
    { id: "m9", name: "つけほ", price: 15000 },
    { id: "m10", name: "パーマ", price: 9000 },
    { id: "m11", name: "下パーマ", price: 3500 },
  ],
  materials: [
    { id: "h1", name: "しるく", price: 0 },
    { id: "h2", name: "セーブル", price: 1100 },
    { id: "h3", name: "カシミア", price: 2200 },
    { id: "h4", name: "ブラウンカシミア", price: 2980 },
  ],
  options: [
    { id: "o1", name: "アイシャンプー", price: 550 },
    { id: "o2", name: "トリートメント", price: 1100 },
    { id: "o3", name: "スペシャルケア", price: 2200 },
  ]
};

export async function getMasterData(): Promise<MasterData> {
  try {
    const colRef = collection(db, MASTER_COLLECTION);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      // Auto-seed if empty
      console.log("Master data empty, seeding initial data...");
      await updateMasterData(initialSeed);
      return initialSeed;
    }

    const data: MasterData = { menus: [], materials: [], options: [] };
    snapshot.docs.forEach(doc => {
      const type = doc.id as keyof MasterData;
      const items = doc.data().items as MasterItem[];
      if (data[type]) data[type] = items;
    });

    return data;
  } catch (error) {
    console.error("Error fetching master data:", error);
    return initialSeed; // Fallback
  }
}

export async function updateMasterData(data: MasterData) {
  try {
    const batch = writeBatch(db);
    
    // We store each category as a single document for simplicity in this MVP
    // Better for atomic updates of the whole list
    batch.set(doc(db, MASTER_COLLECTION, "menus"), { items: data.menus });
    batch.set(doc(db, MASTER_COLLECTION, "materials"), { items: data.materials });
    batch.set(doc(db, MASTER_COLLECTION, "options"), { items: data.options });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error updating master data:", error);
    return { success: false, error };
  }
}
