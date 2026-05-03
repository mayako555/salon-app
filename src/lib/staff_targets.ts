import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc,
  serverTimestamp 
} from "firebase/firestore";

export type StaffTarget = {
  staff_id: string;
  month: string; // YYYY-MM
  target: number;
  updated_at?: any;
};

const TARGETS_COLLECTION = "staff_targets";

/**
 * 特定の月の全スタッフの目標を取得する
 */
export async function getMonthlyStaffTargets(month: string): Promise<Record<string, number>> {
  try {
    const colRef = collection(db, TARGETS_COLLECTION);
    const q = query(colRef, where("month", "==", month));
    const snapshot = await getDocs(q);
    
    const targets: Record<string, number> = {};
    snapshot.docs.forEach(d => {
      const data = d.data();
      targets[data.staff_id] = data.target;
    });
    return targets;
  } catch (error) {
    console.error("Error fetching staff targets:", error);
    return {};
  }
}

/**
 * スタッフの目標を保存する
 */
export async function updateStaffTarget(staffId: string, month: string, target: number) {
  try {
    const docId = `${staffId}_${month}`;
    const docRef = doc(db, TARGETS_COLLECTION, docId);
    
    await setDoc(docRef, {
      staff_id: staffId,
      month,
      target,
      updated_at: serverTimestamp(),
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating staff target:", error);
    return { success: false, error: error.message };
  }
}
