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
import { getCurrentUserContext } from "@/lib/auth-server";
import { getTenantCollection, getTenantDoc } from "@/lib/tenant-utils";

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
  break_start?: string | null;
  break_end?: string | null;
  break_minutes: number;
  status: AttendanceStatus;
  store?: string; // Which store they clocked into
  is_auto_clock_out?: boolean;
};

const ATTENDANCE_COLLECTION = "attendance";

export async function getDailyAttendance(dateStr: string): Promise<AttendanceRecord[]> {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const snapshot = await getTenantCollection(ATTENDANCE_COLLECTION, ctx)
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
    
    return await autoFixMissingClockOuts(records, adminDb, ctx);
  } catch (error) {
    console.error("Error fetching daily attendance:", error);
    return [];
  }
}

export async function getMonthlyAttendance(year: number, month: number): Promise<AttendanceRecord[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const snapshot = await getTenantCollection(ATTENDANCE_COLLECTION, ctx)
      .where("date", ">=", `${targetPrefix}-01`)
      .where("date", "<=", `${targetPrefix}-31`)
      .orderBy("date", "asc")
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

    return await autoFixMissingClockOuts(records, adminDb, ctx);
  } catch (error) {
    console.error("Error fetching monthly attendance:", error);
    return [];
  }
}

async function autoFixMissingClockOuts(records: AttendanceRecord[], adminDb: any, ctx: any): Promise<AttendanceRecord[]> {
  const todayStr = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
  const needsFix = records.filter(r => !r.clock_out && r.date < todayStr);
  
  if (needsFix.length === 0) return records;

  const staffSnap = await getTenantCollection("staff_profiles", ctx).get();
  const staffProfiles = staffSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  
  // Only apply to "employee" (正社員)
  const employeeIds = new Set(staffProfiles.filter((s: any) => s.employment_type === "employee").map((s: any) => s.id));
  const employeeRecords = needsFix.filter(r => employeeIds.has(r.staff_id));
  
  if (employeeRecords.length === 0) return records;



  const batch = adminDb.batch();
  let updatedCount = 0;

  for (const record of employeeRecords) {
    if (!record.clock_in) continue;
    const clockInTime = new Date(record.clock_in);
    if (isNaN(clockInTime.getTime())) continue;

    const endDate = new Date(clockInTime.getTime() + 7 * 60 * 60 * 1000); // 7 hours after clock in
    const autoOutTime = endDate.toISOString();
    
    await getTenantDoc(ATTENDANCE_COLLECTION, record.id, ctx);
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

  if (updatedCount > 0) {
    await batch.commit();
  }

  return records;
}

export async function recordClockIn(staffId: string, staffName: string, store?: string) {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    // UTC time converted to JST for calculating the correct "today" string
    const dateStr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    let effectiveIn = now.toISOString();
    
    // Fetch shift to calculate effectiveIn
    const shiftSnap = await getTenantCollection("shifts", ctx)
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
        const schedIn = new Date(`${dateStr}T${scheduledStart}:00+09:00`);
        
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
      storeId: "", // FC or QR clock-in doesn't have it currently, but we can pass it later.
      companyId: ctx.companyId,
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

export async function recordFcClockIn(staffId: string, staffName: string, store?: string) {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    // UTC time converted to JST for calculating the correct "today" string
    const dateStr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // For franchise, we simply use the current time
    let effectiveIn = now.toISOString();

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
      storeId: "",
      is_fc: true,
      companyId: ctx.companyId,
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
    console.error("Error recording FC clock in:", error);
    return { success: false, error: error.message };
  }
}

export async function recordClockOut(staffId: string) {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    // UTC time converted to JST for calculating the correct "today" string
    const dateStr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // Find the active shift (clock_out is null)
    const snapshot = await getTenantCollection(ATTENDANCE_COLLECTION, ctx)
      .where("staff_id", "==", staffId)
      .where("date", "==", dateStr)
      .where("clock_out", "==", null)
      .get();
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await getTenantDoc(ATTENDANCE_COLLECTION, docId, ctx);
      
      const clockOutTime = now.toISOString();
      let effectiveIn = snapshot.docs[0].data().effective_clock_in || snapshot.docs[0].data().clock_in;
      let effectiveOut = clockOutTime;

      // Fetch shift for this day
      const shiftSnap = await getTenantCollection("shifts", ctx)
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
          const schedOut = new Date(`${dateStr}T${scheduledEnd}:00+09:00`);
          
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

export async function recordFcClockOut(staffId: string) {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    // UTC time converted to JST for calculating the correct "today" string
    const dateStr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // Find the active shift (clock_out is null)
    const snapshot = await getTenantCollection(ATTENDANCE_COLLECTION, ctx)
      .where("staff_id", "==", staffId)
      .where("date", "==", dateStr)
      .where("clock_out", "==", null)
      .get();
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await getTenantDoc(ATTENDANCE_COLLECTION, docId, ctx);
      
      const clockOutTime = now.toISOString();
      let effectiveIn = snapshot.docs[0].data().effective_clock_in || snapshot.docs[0].data().clock_in;
      
      // For franchise, effective out is exactly clock out
      let effectiveOut = clockOutTime;

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
    console.error("Error recording FC clock out:", error);
    return { success: false, error: error.message };
  }
}

export async function handleQRScan(staffId: string, store?: string) {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    const dateStr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    const staffDoc = await getTenantCollection("staff_profiles", ctx).where("__name__", "==", staffId).get();
    if (staffDoc.empty) return { success: false, error: "スタッフが見つかりません" };
    const staffName = staffDoc.docs[0].data().name;

    const activeSnapshot = await getTenantCollection(ATTENDANCE_COLLECTION, ctx)
      .where("staff_id", "==", staffId)
      .where("date", "==", dateStr)
      .where("clock_out", "==", null)
      .get();

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
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    await getTenantDoc(ATTENDANCE_COLLECTION, id, ctx);
    const docRef = adminDb.collection(ATTENDANCE_COLLECTION).doc(id);
    const updatePayload = {
      ...data,
      updated_at: new Date()
    };
    await docRef.update(updatePayload);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating attendance:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAttendanceRecords(ids: string[]) {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    
    for (const id of ids) {
      await getTenantDoc(ATTENDANCE_COLLECTION, id, ctx);
    }
    
    const batch = adminDb.batch();
    
    for (const id of ids) {
      const docRef = adminDb.collection(ATTENDANCE_COLLECTION).doc(id);
      batch.delete(docRef);
    }
    
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting attendance records:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllStaffProfiles() {
  try {
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const snap = await getTenantCollection("staff_profiles", ctx).get();
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

export async function getKioskStaffList(companyId: string) {
  if (!companyId) throw new Error("会社IDが指定されていません");

  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const now = new Date();
    const dateStr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
    const attendanceSnap = await adminDb.collection("attendance").where("companyId", "==", companyId).where("date", "==", dateStr).get();
    const todayRecords = attendanceSnap.docs.map((doc: any) => doc.data());

    const snap = await adminDb.collection("staff_profiles").where("companyId", "==", companyId).get();

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

      const staffRecords = todayRecords.filter((r: any) => r.staff_id === doc.id);
      const activeRecord = staffRecords.find((r: any) => !r.clock_out);
      const hasClockedInToday = staffRecords.length > 0;
      
      let today_status = "none";
      if (activeRecord) {
        today_status = "working";
      } else if (hasClockedInToday) {
        today_status = "finished";
      }

      return {
        id: doc.id,
        ...serializedData,
        today_status
      };
    });
    
    const filteredStaff = staffList.filter((s: any) => 
      s.companyId === companyId && 
      s.status !== "resigned" && 
      s.employment_status !== "resigned" && 
      s.employment_status !== "retired"
    );

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
    const ctx = await getCurrentUserContext();
    const { adminDb } = await import("@/lib/firebase-admin");
    const colRef = adminDb.collection(ATTENDANCE_COLLECTION);
    const batchPromises = records.map(async (r) => {
      const snap = await getTenantCollection(ATTENDANCE_COLLECTION, ctx)
        .where("staff_id", "==", r.staff_id)
        .where("date", "==", r.date)
        .get();
      
      const payload = {
        ...r,
        companyId: ctx.companyId,
        created_at: new Date()
      };

      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await getTenantDoc(ATTENDANCE_COLLECTION, docId, ctx);
        const docRef = colRef.doc(docId);
        await docRef.update({
          ...payload,
          updated_at: new Date()
        });
      } else {
        await colRef.add(payload);
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
    const ctx = await getCurrentUserContext();
    const staffDocSnap = await getTenantCollection("staff_profiles", ctx).where("__name__", "==", staffId).get();
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

export async function verifyKioskToken(companyId: string, storeId: string, token: string): Promise<boolean> {
  if (!companyId || !storeId || !token) return false;
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const snap = await adminDb.collection("kiosk_settings")
      .where("companyId", "==", companyId)
      .where("storeName", "==", storeId)
      .get();

    if (snap.empty) return false;
    const data = snap.docs[0].data();
    return data.token === token && data.enabled === true;
  } catch (error) {
    console.error("Token verification failed:", error);
    return false;
  }
}

export async function recordKioskAction(
  companyId: string,
  storeId: string,
  staffId: string,
  staffName: string,
  actionType: "IN" | "OUT" | "BREAK_START" | "BREAK_END"
) {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    
    let linkWithShifts = false;
    const companyDoc = await adminDb.collection("companies").doc(companyId).get();
    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      const isSystemOwner = companyData?.companyType === "system_owner";
      const policy = companyData?.attendancePolicy || (
        isSystemOwner
          ? { roundingEnabled: true, roundingIntervalMinutes: 30, linkWithShifts: true }
          : { roundingEnabled: false, roundingIntervalMinutes: 0, linkWithShifts: false }
      );
      linkWithShifts = !!policy.linkWithShifts;
    }

    const now = new Date();
    // UTC time converted to JST for calculating the correct "today" string
    const dateStr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

    // IN / OUT
    if (actionType === "IN") {
      if (linkWithShifts) {
        return await recordClockIn(staffId, staffName, storeId);
      } else {
        return await recordFcClockIn(staffId, staffName, storeId);
      }
    }
    
    if (actionType === "OUT") {
      if (linkWithShifts) {
        return await recordClockOut(staffId);
      } else {
        return await recordFcClockOut(staffId);
      }
    }

    // BREAK_START / BREAK_END
    const snapshot = await adminDb.collection(ATTENDANCE_COLLECTION)
      .where("companyId", "==", companyId)
      .where("staff_id", "==", staffId)
      .where("date", "==", dateStr)
      .where("clock_out", "==", null)
      .get();
      
    if (snapshot.empty) {
      return { success: false, error: "出勤していません" };
    }

    const docId = snapshot.docs[0].id;
    const currentData = snapshot.docs[0].data();
    const updatePayload: any = { updated_at: new Date() };

    if (actionType === "BREAK_START") {
      updatePayload.break_start = now.toISOString();
      updatePayload.break_end = null;
    } else if (actionType === "BREAK_END") {
      updatePayload.break_end = now.toISOString();
      if (currentData.break_start) {
        // Calculate break duration in minutes
        const start = new Date(currentData.break_start).getTime();
        const end = now.getTime();
        const diffMins = Math.floor((end - start) / 60000);
        updatePayload.break_minutes = (currentData.break_minutes || 0) + diffMins;
      }
    }

    await adminDb.collection(ATTENDANCE_COLLECTION).doc(docId).update(updatePayload);
    
    await addAuditLog({
      table_name: ATTENDANCE_COLLECTION,
      record_id: docId,
      action: "UPDATE",
      old_data: currentData,
      new_data: updatePayload,
      actor: staffName
    });

    return { success: true };

  } catch (error: any) {
    console.error("Error in recordKioskAction:", error);
    return { success: false, error: error.message };
  }
}
