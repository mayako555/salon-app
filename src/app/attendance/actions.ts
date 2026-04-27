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
  serverTimestamp 
} from "firebase/firestore";
import { addAuditLog } from "@/app/audit/actions";

export type AttendanceStatus = "normal" | "leave" | "absence";

export type AttendanceRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  date: string; // YYYY-MM-DD
  clock_in: string | null; // ISO string
  clock_out: string | null; // ISO string
  break_minutes: number;
  status: AttendanceStatus;
};

const ATTENDANCE_COLLECTION = "attendance";

export async function getDailyAttendance(dateStr: string): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(colRef, where("date", "==", dateStr));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AttendanceRecord[];
  } catch (error) {
    console.error("Error fetching daily attendance:", error);
    return [];
  }
}

export async function getMonthlyAttendance(year: number, month: number): Promise<AttendanceRecord[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(
      colRef, 
      where("date", ">=", `${targetPrefix}-01`), 
      where("date", "<=", `${targetPrefix}-31`),
      orderBy("date", "asc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AttendanceRecord[];
  } catch (error) {
    console.error("Error fetching monthly attendance:", error);
    return [];
  }
}

export async function recordClockIn(staffId: string, staffName: string) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const payload = {
      staff_id: staffId,
      staff_name: staffName,
      date: dateStr,
      clock_in: now.toISOString(),
      clock_out: null, 
      break_minutes: 60,
      status: "normal",
      created_at: serverTimestamp()
    };

    const docRef = await addDoc(colRef, payload);
    
    await addAuditLog({
      table_name: ATTENDANCE_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: payload,
      actor: staffName
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error recording clock in:", error);
    return { success: false, error: error.message };
  }
}

export async function recordClockOut(staffId: string) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    
    // Find the active shift (clock_out is null)
    const q = query(
      colRef, 
      where("staff_id", "==", staffId), 
      where("date", "==", dateStr),
      where("clock_out", "==", null)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
      const updatePayload = {
        clock_out: now.toISOString(),
        updated_at: serverTimestamp()
      };
      await updateDoc(docRef, updatePayload);

      await addAuditLog({
        table_name: ATTENDANCE_COLLECTION,
        record_id: docId,
        action: "UPDATE",
        old_data: snapshot.docs[0].data(),
        new_data: updatePayload,
        actor: snapshot.docs[0].data().staff_name
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error recording clock out:", error);
    return { success: false, error: error.message };
  }
}
export async function handleQRScan(staffId: string) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    
    // 1. Fetch Staff Name
    const staffDoc = await getDocs(query(collection(db, "staff_profiles"), where("__name__", "==", staffId)));
    if (staffDoc.empty) return { success: false, error: "スタッフが見つかりません" };
    const staffName = staffDoc.docs[0].data().name;

    // 2. Check for active session (not clocked out yet today)
    const qActive = query(
      colRef, 
      where("staff_id", "==", staffId), 
      where("date", "==", dateStr),
      where("clock_out", "==", null)
    );
    const activeSnapshot = await getDocs(qActive);

    if (!activeSnapshot.empty) {
      // Already clocked in, perform clock out
      const res = await recordClockOut(staffId);
      return { success: true, action: "OUT", name: staffName };
    } else {
      // Not clocked in, perform clock in
      const res = await recordClockIn(staffId, staffName);
      return { success: true, action: "IN", name: staffName };
    }
  } catch (error: any) {
    console.error("QR Scan Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAttendanceRecord(id: string, data: Partial<AttendanceRecord>) {
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, id);
    const updatePayload = {
      ...data,
      updated_at: serverTimestamp()
    };
    await updateDoc(docRef, updatePayload);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating attendance:", error);
    return { success: false, error: error.message };
  }
}
