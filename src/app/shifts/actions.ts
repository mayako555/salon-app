"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { addAuditLog } from "@/app/audit/actions";
import { getStaffList } from "@/app/staff/actions";
import { getCurrentUserContext } from "@/lib/auth-server";

export type StoreLocation = "六甲" | "元町" | "神戸";
export type ShiftType = "work" | "holiday" | "paid_leave" | "requested_holiday" | "requested_paid_leave";

export type ShiftSegment = {
  start_time: string;
  end_time: string;
  store: StoreLocation;
};

export type ShiftRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
  segments?: ShiftSegment[];
  request_id?: string; // Link to holiday_request if any
  created_at?: any;
  updated_at?: any;
};

const SHIFTS_COLLECTION = "shifts";

export async function getMonthlyShifts(year: number, month: number): Promise<ShiftRecord[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    const ctx = await getCurrentUserContext();
    const colRef = collection(db, SHIFTS_COLLECTION);
    const q = query(
      colRef, 
      where("date", ">=", `${targetPrefix}-01`), 
      where("date", "<=", `${targetPrefix}-31`),
      orderBy("date", "asc")
    );
    const snapshot = await getDocs(q);
    
    const shifts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      };
    }) as ShiftRecord[];
    
    // In-memory filter by companyId
    if (ctx.role !== "systemOwner") {
      const allowedCompany = ctx.companyId || "company_default";
      const staffList = await getStaffList(); // Already filtered by companyId
      const allowedStaffIds = new Set(staffList.map(s => s.id));
      
      return shifts.filter(s => allowedStaffIds.has(s.staff_id));
    }
    
    return shifts;
  } catch (error) {
    console.error("Error fetching monthly shifts:", error);
    return [];
  }
}

export async function getShiftsForDate(dateStr: string): Promise<ShiftRecord[]> {
  try {
    const ctx = await getCurrentUserContext();
    const colRef = collection(db, SHIFTS_COLLECTION);
    const q = query(colRef, where("date", "==", dateStr));
    const snapshot = await getDocs(q);
    
    const shifts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      };
    }) as ShiftRecord[];

    if (ctx.role !== "systemOwner") {
      const staffList = await getStaffList();
      const allowedStaffIds = new Set(staffList.map(s => s.id));
      return shifts.filter(s => allowedStaffIds.has(s.staff_id));
    }

    return shifts;
  } catch (error) {
    console.error("Error fetching shifts for date:", error);
    return [];
  }
}

export async function saveShift(data: Omit<ShiftRecord, "id"> & { id?: string }) {
  try {
    const colRef = collection(db, SHIFTS_COLLECTION);
    let recordId = data.id;

    // 1. Konsolidate: Find all existing records for this staff and date
    // This cleans up duplicates that might have been created by multiple bulk saves
    const q = query(
      colRef, 
      where("staff_id", "==", data.staff_id),
      where("date", "==", data.date)
    );
    const existingDocs = await getDocs(q);
    
    // Remove undefined values to avoid Firestore errors
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as any;
    delete cleanedData.id;

    const batch = writeBatch(db);

    if (recordId) {
      // Update the specific record
      const docRef = doc(db, SHIFTS_COLLECTION, recordId);
      batch.update(docRef, {
        ...cleanedData,
        updated_at: serverTimestamp()
      });

      // Delete OTHER records for the same day if they exist (cleanup)
      existingDocs.docs.forEach(d => {
        if (d.id !== recordId) {
          batch.delete(d.ref);
        }
      });
    } else {
      // If no ID provided but a record exists for this day, update the first one found
      if (!existingDocs.empty) {
        const firstDoc = existingDocs.docs[0];
        recordId = firstDoc.id;
        batch.update(firstDoc.ref, {
          ...cleanedData,
          updated_at: serverTimestamp()
        });
        
        // Delete others
        existingDocs.docs.slice(1).forEach(d => {
          batch.delete(d.ref);
        });
      } else {
        // Truly a new record
        const newDocRef = doc(colRef);
        recordId = newDocRef.id;
        batch.set(newDocRef, {
          ...cleanedData,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
    }

    await batch.commit();

    await addAuditLog({
      table_name: SHIFTS_COLLECTION,
      record_id: recordId,
      action: "UPDATE",
      old_data: null,
      new_data: cleanedData,
      actor: "Admin"
    });

    return { success: true, id: recordId };
  } catch (error: any) {
    console.error("Error saving shift:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteShift(id: string) {
  try {
    await deleteDoc(doc(db, SHIFTS_COLLECTION, id));
    
    await addAuditLog({
      table_name: SHIFTS_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: null,
      new_data: null,
      actor: "Admin"
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting shift:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkSaveShifts(params: {
  staffIds: string[];
  dateRange: { start: string; end: string };
  type: ShiftType;
  segments?: ShiftSegment[];
  activeDaysOfWeek: number[];
}) {
  try {
    const { staffIds, dateRange, type, segments, activeDaysOfWeek } = params;
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const colRef = collection(db, SHIFTS_COLLECTION);
    const staffList = await getStaffList();

    const dates: string[] = [];
    let curr = new Date(start);
    while (curr <= end) {
      const day = curr.getDay();
      if (activeDaysOfWeek.includes(day)) {
        dates.push(curr.toISOString().split("T")[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }

    const recordsCount = staffIds.length * dates.length;

    // 既存の同日シフトを取得して削除対象にする
    const qExisting = query(
      colRef,
      where("date", ">=", dateRange.start),
      where("date", "<=", dateRange.end)
    );
    const existingSnap = await getDocs(qExisting);
    const existingDocsToDelete = existingSnap.docs.filter(d => {
       const data = d.data();
       return staffIds.includes(data.staff_id) && dates.includes(data.date);
    });

    let currentBatch = writeBatch(db);
    let operationCount = 0;
    
    const commitBatchIfNeeded = async () => {
      if (operationCount >= 450) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    };

    // 既存シフトを削除
    for (const d of existingDocsToDelete) {
      currentBatch.delete(d.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // 新規シフトを追加
    for (const staffId of staffIds) {
      const staff = staffList.find(s => s.id === staffId);
      const staffName = staff?.name || "不明";

      for (const date of dates) {
        const newDocRef = doc(colRef);
        currentBatch.set(newDocRef, {
          staff_id: staffId,
          staff_name: staffName,
          date,
          type,
          segments: type === "work" ? segments : [],
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        operationCount++;
        await commitBatchIfNeeded();
      }
    }

    // 残りのバッチをコミット
    if (operationCount > 0) {
      await currentBatch.commit();
    }

    await addAuditLog({
      table_name: SHIFTS_COLLECTION,
      record_id: `bulk-${Date.now()}`,
      action: "INSERT",
      old_data: null,
      new_data: { 
        message: `Bulk updated ${recordsCount} shifts`,
        staff_count: staffIds.length,
        days_count: dates.length,
        type
      },
      actor: "Admin"
    });

    return { success: true, count: recordsCount };
  } catch (error: any) {
    console.error("Error in bulkSaveShifts:", error);
    return { success: false, error: error.message };
  }
}
export type HolidayRequest = {
  id: string;
  staff_id: string;
  staff_name: string;
  date: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  shift_id?: string; // Link to the shift record
  created_at: any;
};

const HOLIDAY_REQUESTS_COLLECTION = "holiday_requests";

export async function submitHolidayRequest(data: Omit<HolidayRequest, "id" | "status" | "created_at">) {
  try {
    const batch = writeBatch(db);
    // 1. Create the holiday request record first to get its ID
    const holidayColRef = collection(db, HOLIDAY_REQUESTS_COLLECTION);
    const holidayDocRef = doc(holidayColRef);
    const holidayPayload = {
      ...data,
      status: "pending",
      created_at: serverTimestamp()
    };
    
    // 2. Create the shift record and link it to the request
    const shiftColRef = collection(db, SHIFTS_COLLECTION);
    const newShiftRef = doc(shiftColRef);
    const shiftData: Omit<ShiftRecord, "id"> = {
      staff_id: data.staff_id,
      staff_name: data.staff_name,
      date: data.date,
      type: data.reason === "有給休暇" ? "requested_paid_leave" : "requested_holiday",
      segments: [],
      request_id: holidayDocRef.id // Store the link to the request
    };
    
    batch.set(newShiftRef, {
      ...shiftData,
      created_at: serverTimestamp()
    });

    // 3. Update holiday payload with shift_id and set it
    batch.set(holidayDocRef, {
      ...holidayPayload,
      shift_id: newShiftRef.id // Store the link to the shift
    });
    
    await batch.commit();

    await addAuditLog({
      table_name: HOLIDAY_REQUESTS_COLLECTION,
      record_id: holidayDocRef.id,
      action: "INSERT",
      old_data: null,
      new_data: { ...holidayPayload, shift_data: shiftData },
      actor: data.staff_name
    });

    return { success: true, id: holidayDocRef.id };
  } catch (error: any) {
    console.error("Error submitting holiday request:", error);
    return { success: false, error: error.message };
  }
}

export async function getStaffHolidayRequests(staffId: string): Promise<HolidayRequest[]> {
  try {
    const colRef = collection(db, HOLIDAY_REQUESTS_COLLECTION);
    const q = query(colRef, where("staff_id", "==", staffId), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null)
      };
    }) as HolidayRequest[];
  } catch (error) {
    console.error("Error fetching staff holiday requests:", error);
    return [];
  }
}

export async function getAllHolidayRequests(year: number, month: number): Promise<HolidayRequest[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  try {
    const ctx = await getCurrentUserContext();
    const colRef = collection(db, HOLIDAY_REQUESTS_COLLECTION);
    const q = query(
      colRef, 
      where("date", ">=", `${targetPrefix}-01`), 
      where("date", "<=", `${targetPrefix}-31`),
      orderBy("date", "asc")
    );
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null)
      };
    }) as HolidayRequest[];    if (ctx.role !== "systemOwner") {
      const staffList = await getStaffList();
      const allowedStaffIds = new Set(staffList.map(s => s.id));
      return requests.filter(r => allowedStaffIds.has(r.staff_id));
    }

    return requests;
  } catch (error) {
    console.error("Error fetching all holiday requests:", error);
    return [];
  }
}

export async function updateHolidayRequestStatus(id: string, status: "approved" | "rejected") {
  try {
    const holidayDocRef = doc(db, HOLIDAY_REQUESTS_COLLECTION, id);
    const holidaySnap = await getDoc(holidayDocRef);
    
    if (!holidaySnap.exists()) {
      return { success: false, error: "申請が見つかりませんでした" };
    }
    
    const holidayData = { id: holidaySnap.id, ...holidaySnap.data() } as HolidayRequest;
    const batch = writeBatch(db);
    
    // 1. Update the request status
    batch.update(holidayDocRef, { 
      status, 
      updated_at: serverTimestamp() 
    });
    
    // 2. Sync with the shift record if shift_id exists
    if (holidayData.shift_id) {
      const shiftDocRef = doc(db, SHIFTS_COLLECTION, holidayData.shift_id);
      
      if (status === "approved") {
        // Change from 'requested_holiday' to 'holiday', or 'requested_paid_leave' to 'paid_leave'
        const shiftSnap = await getDoc(shiftDocRef);
        let newType: ShiftType = "holiday";
        if (shiftSnap.exists()) {
          const currentType = shiftSnap.data().type;
          if (currentType === "requested_paid_leave") {
            newType = "paid_leave";
          }
        }
        
        batch.update(shiftDocRef, {
          type: newType,
          updated_at: serverTimestamp()
        });

        // 3. Deduct paid_leave_balance if it's a paid leave
        if (newType === "paid_leave") {
          const staffSnap = await getDocs(query(collection(db, "staff_profiles"), where("__name__", "==", holidayData.staff_id)));
          if (!staffSnap.empty) {
            const staffDoc = staffSnap.docs[0];
            const currentBalance = staffDoc.data().paid_leave_balance || 0;
            batch.update(doc(db, "staff_profiles", staffDoc.id), {
              paid_leave_balance: Math.max(0, currentBalance - 1),
              updated_at: serverTimestamp()
            });
          }
        }
      } else {
        // If rejected, remove the shift record entirely
        batch.delete(shiftDocRef);
      }
    }
    
    await batch.commit();

    await addAuditLog({
      table_name: HOLIDAY_REQUESTS_COLLECTION,
      record_id: id,
      action: "UPDATE",
      old_data: holidayData,
      new_data: { status },
      actor: "Admin"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating holiday request status:", error);
    return { success: false, error: error.message };
  }
}
