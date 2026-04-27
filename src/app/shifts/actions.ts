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

export type StoreLocation = "六甲" | "元町" | "神戸";
export type ShiftType = "work" | "holiday" | "paid_leave" | "requested_holiday";

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
};

const SHIFTS_COLLECTION = "shifts";

export async function getMonthlyShifts(year: number, month: number): Promise<ShiftRecord[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    const colRef = collection(db, SHIFTS_COLLECTION);
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
    })) as ShiftRecord[];
  } catch (error) {
    console.error("Error fetching monthly shifts:", error);
    return [];
  }
}

export async function saveShift(data: Omit<ShiftRecord, "id"> & { id?: string }) {
  try {
    const colRef = collection(db, SHIFTS_COLLECTION);
    let recordId = data.id;

    if (recordId) {
      const docRef = doc(db, SHIFTS_COLLECTION, recordId);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp()
      });
      
      await addAuditLog({
        table_name: SHIFTS_COLLECTION,
        record_id: recordId,
        action: "UPDATE",
        old_data: null, // In a real app, we might fetch the old data first
        new_data: data,
        actor: "Admin"
      });
    } else {
      const docRef = await addDoc(colRef, {
        ...data,
        created_at: serverTimestamp()
      });
      recordId = docRef.id;

      await addAuditLog({
        table_name: SHIFTS_COLLECTION,
        record_id: recordId,
        action: "INSERT",
        old_data: null,
        new_data: data,
        actor: "Admin"
      });
    }

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
  excludeWeekends: boolean;
}) {
  try {
    const { staffIds, dateRange, type, segments, excludeWeekends } = params;
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const batch = writeBatch(db);
    const colRef = collection(db, SHIFTS_COLLECTION);
    const staffList = await getStaffList();

    const dates: string[] = [];
    let curr = new Date(start);
    while (curr <= end) {
      const day = curr.getDay();
      const isWeekend = day === 0 || day === 6;
      if (!excludeWeekends || !isWeekend) {
        dates.push(curr.toISOString().split("T")[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }

    const recordsCount = staffIds.length * dates.length;
    if (recordsCount > 500) {
      return { success: false, error: "一度に登録できる件数は500件までです。" };
    }

    for (const staffId of staffIds) {
      const staff = staffList.find(s => s.id === staffId);
      const staffName = staff?.name || "不明";

      for (const date of dates) {
        const newDocRef = doc(colRef);
        batch.set(newDocRef, {
          staff_id: staffId,
          staff_name: staffName,
          date,
          type,
          segments: type === "work" ? segments : [],
          created_at: serverTimestamp()
        });
      }
    }

    await batch.commit();

    await addAuditLog({
      table_name: SHIFTS_COLLECTION,
      record_id: `bulk-${Date.now()}`,
      action: "INSERT",
      old_data: null,
      new_data: { 
        message: `Bulk added ${recordsCount} shifts`,
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
      type: "requested_holiday",
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
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HolidayRequest[];
  } catch (error) {
    console.error("Error fetching staff holiday requests:", error);
    return [];
  }
}

export async function getAllHolidayRequests(year: number, month: number): Promise<HolidayRequest[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  try {
    const colRef = collection(db, HOLIDAY_REQUESTS_COLLECTION);
    const q = query(
      colRef, 
      where("date", ">=", `${targetPrefix}-01`), 
      where("date", "<=", `${targetPrefix}-31`),
      orderBy("date", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HolidayRequest[];
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
        // Change from 'requested_holiday' to 'holiday'
        batch.update(shiftDocRef, {
          type: "holiday",
          updated_at: serverTimestamp()
        });
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
