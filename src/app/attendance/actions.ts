"use server";

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
  effective_clock_in?: string | null;
  effective_clock_out?: string | null;
  is_effective_manual?: boolean;
  break_minutes: number;
  status: AttendanceStatus;
  store?: string; // Which store they clocked into
  is_auto_clock_out?: boolean;
};

const ATTENDANCE_COLLECTION = "attendance";

export async function getDailyAttendance(dateStr: string): Promise<AttendanceRecord[]> {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const snapshot = await adminDb
      .collection(ATTENDANCE_COLLECTION)
      .where("date", "==", dateStr)
      .get();
    
    const records = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      } as any;
    }) as AttendanceRecord[];
    
    return await autoFixMissingClockOuts(records, adminDb);
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
    const { adminDb } = await import("@/lib/firebase-admin");
    
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      } as any;
    }) as AttendanceRecord[];

    return await autoFixMissingClockOuts(records, adminDb);
  } catch (error) {
    console.error("Error fetching monthly attendance:", error);
    return [];
  }
}

async function autoFixMissingClockOuts(records: AttendanceRecord[], adminDb: any): Promise<AttendanceRecord[]> {
  const todayStr = new Date().toISOString().split("T")[0];
  const needsFix = records.filter(r => !r.clock_out && r.date < todayStr);
  
  if (needsFix.length === 0) return records;

  const staffSnap = await adminDb.collection("staff_profiles").get();
  const staffProfiles = staffSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  
  // Only apply to "employee" (正社員)
  const employeeIds = new Set(staffProfiles.filter((s: any) => s.employment_type === "employee").map((s: any) => s.id));
  const employeeRecords = needsFix.filter(r => employeeIds.has(r.staff_id));
  
  if (employeeRecords.length === 0) return records;

  const datesToFetch = Array.from(new Set(employeeRecords.map(r => r.date)));
  const shiftPromises = datesToFetch.map(date => 
    adminDb.collection("shifts").where("date", "==", date).get()
  );
  
  const shiftSnaps = await Promise.all(shiftPromises);
  const shifts: any[] = [];
  shiftSnaps.forEach(snap => {
    snap.docs.forEach((doc: any) => shifts.push({ id: doc.id, ...doc.data() }));
  });

  const batch = adminDb.batch();
  let updatedCount = 0;

  for (const record of employeeRecords) {
    const shift = shifts.find(s => s.staff_id === record.staff_id && s.date === record.date);
    if (shift && shift.segments && shift.segments.length > 0) {
      // Filter by store if applicable
      const targetSegments = record.store 
        ? shift.segments.filter((s: any) => s.store === record.store) 
        : shift.segments;
      const segmentsToUse = targetSegments.length > 0 ? targetSegments : shift.segments;
      
      const shiftEnds = segmentsToUse.map((s: any) => s.end_time).sort();
      const lastEnd = shiftEnds[shiftEnds.length - 1]; // e.g. "19:00"
      
      const endDate = new Date(`${record.date}T${lastEnd}:00`);
      endDate.setHours(endDate.getHours() - 1); // 1 hour before shift end
      
      const autoOutTime = endDate.toISOString();
      const docRef = adminDb.collection(ATTENDANCE_COLLECTION).doc(record.id);
      
      batch.update(docRef, {
        clock_out: autoOutTime,
        effective_clock_out: autoOutTime,
        is_auto_clock_out: true,
        updated_at: new Date()
      });
      
      record.clock_out = autoOutTime;
      record.effective_clock_out = autoOutTime;
      record.is_auto_clock_out = true;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
  }

  return records;
}

export async function recordClockIn(staffId: string, staffName: string, store?: string) {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    
    let effectiveIn = now.toISOString();
    
    // Fetch shift to calculate effectiveIn
    const shiftSnap = await adminDb.collection("shifts")
      .where("staff_id", "==", staffId)
      .where("date", "==", dateStr)
      .get();
    
    if (!shiftSnap.empty) {
      const shift = shiftSnap.docs[0].data();
      if (shift.segments && shift.segments.length > 0) {
        const targetSegments = store 
          ? shift.segments.filter((s: any) => s.store === store) 
          : shift.segments;
        const segmentsToUse = targetSegments.length > 0 ? targetSegments : shift.segments;
        
        const shiftStarts = segmentsToUse.map((s: any) => s.start_time).sort();
        const scheduledStart = shiftStarts[0];
        const schedIn = new Date(`${dateStr}T${scheduledStart}:00`);
        
        if (now < schedIn) {
          effectiveIn = schedIn.toISOString();
        }
      }
    }

    const payload = {
      staff_id: staffId,
      staff_name: staffName,
      date: dateStr,
      clock_in: now.toISOString(),
      clock_out: null, 
      effective_clock_in: effectiveIn,
      effective_clock_out: null,
      break_minutes: 60,
      status: "normal",
      store: store || "不明",
      created_at: new Date()
    };

    const docRef = await adminDb.collection(ATTENDANCE_COLLECTION).add(payload);
    
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
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    
    // Find the active shift (clock_out is null)
    const snapshot = await adminDb.collection(ATTENDANCE_COLLECTION)
      .where("staff_id", "==", staffId)
      .where("date", "==", dateStr)
      .where("clock_out", "==", null)
      .get();
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      
      const clockOutTime = now.toISOString();
      let effectiveIn = snapshot.docs[0].data().effective_clock_in || snapshot.docs[0].data().clock_in;
      let effectiveOut = clockOutTime;

      // Fetch shift for this day
      const shiftSnap = await adminDb.collection("shifts")
        .where("staff_id", "==", staffId)
        .where("date", "==", dateStr)
        .get();
      
      if (!shiftSnap.empty) {
        const shift = shiftSnap.docs[0].data();
        if (shift.segments && shift.segments.length > 0) {
          const attStore = snapshot.docs[0].data().store;
          const targetSegments = attStore 
            ? shift.segments.filter((s: any) => s.store === attStore) 
            : shift.segments;
          const segmentsToUse = targetSegments.length > 0 ? targetSegments : shift.segments;
          
          const shiftEnds = segmentsToUse.map((s: any) => s.end_time).sort();
          const scheduledEnd = shiftEnds[shiftEnds.length - 1];
          const schedOut = new Date(`${dateStr}T${scheduledEnd}:00`);
          
          if (now > schedOut) {
            effectiveOut = schedOut.toISOString();
          }
        }
      }

      const updatePayload = {
        clock_out: clockOutTime,
        effective_clock_in: effectiveIn,
        effective_clock_out: effectiveOut,
        updated_at: new Date()
      };
      
      await adminDb.collection(ATTENDANCE_COLLECTION).doc(docId).update(updatePayload);

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

export async function handleQRScan(staffId: string, store?: string) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    
    const staffDoc = await getDocs(query(collection(db, "staff_profiles"), where("__name__", "==", staffId)));
    if (staffDoc.empty) return { success: false, error: "スタッフが見つかりません" };
    const staffName = staffDoc.docs[0].data().name;

    const qActive = query(
      colRef, 
      where("staff_id", "==", staffId), 
      where("date", "==", dateStr),
      where("clock_out", "==", null)
    );
    const activeSnapshot = await getDocs(qActive);

    if (!activeSnapshot.empty) {
      const res = await recordClockOut(staffId);
      return { success: true, action: "OUT", name: staffName };
    } else {
      const res = await recordClockIn(staffId, staffName, store);
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

export async function getAllStaffProfiles() {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const snap = await adminDb.collection("staff_profiles").get();
    return {
      success: true,
      data: snap.docs.map((doc: any) => ({
        id: doc.id,
        name: doc.data().name,
        role: doc.data().role || "staff"
      }))
    };
  } catch (error: any) {
    console.error("Error fetching staff profiles:", error);
    return { success: false, error: error.message };
  }
}

export async function getKioskStaffList() {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const snap = await adminDb.collection("staff_profiles").get();
    const staffList = snap.docs.map((doc: any) => {
      const data = doc.data();
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
        id: doc.id,
        ...serializedData
      };
    });
    
    // Default fallback to company_default since kiosk has no session context
    const filteredStaff = staffList.filter((s: any) => {
      const sCompanyId = s.companyId || "company_default";
      return sCompanyId === "company_default";
    });

    return filteredStaff.sort((a: any, b: any) => {
      const aIsRetired = a.employment_status === "retired";
      const bIsRetired = b.employment_status === "retired";
      if (aIsRetired && !bIsRetired) return 1;
      if (!aIsRetired && bIsRetired) return -1;
      
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || "").localeCompare(b.name || "", "ja");
    });
  } catch (error: any) {
    console.error("Error fetching kiosk staff list:", error);
    return [];
  }
}

export async function bulkImportAttendanceRecords(records: Omit<AttendanceRecord, "id">[]) {
  try {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const batchPromises = records.map(async (r) => {
      const q = query(
        colRef, 
        where("staff_id", "==", r.staff_id), 
        where("date", "==", r.date)
      );
      const snap = await getDocs(q);
      
      const payload = {
        ...r,
        created_at: serverTimestamp()
      };

      if (!snap.empty) {
        const docRef = doc(db, ATTENDANCE_COLLECTION, snap.docs[0].id);
        await updateDoc(docRef, {
          ...payload,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(colRef, payload);
      }
    });

    await Promise.all(batchPromises);
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk importing attendance:", error);
    return { success: false, error: error.message };
  }
}

export async function verifyStaffPassword(staffId: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const staffDocSnap = await getDocs(query(collection(db, "staff_profiles"), where("__name__", "==", staffId)));
    if (staffDocSnap.empty) {
      return { success: false, error: "スタッフが見つかりません" };
    }
    const staffData = staffDocSnap.docs[0].data();
    const email = staffData.email;
    if (!email) {
      return { success: false, error: "メールアドレスが設定されていません" };
    }

    const apiKey = "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98";
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    if (!res.ok) {
      return { success: false, error: "パスワードが正しくありません" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in verifyStaffPassword:", error);
    return { success: false, error: "通信エラーが発生しました" };
  }
}
