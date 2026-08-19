"use server";
import { db } from "@/lib/firestore-admin-wrapper";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp 
} from "@/lib/firestore-admin-wrapper";
import { addAuditLog } from "@/app/audit/actions";
import { getStaffList } from "@/app/staff/actions";
import { getMonthlySales, SalesRecord } from "@/app/sales/actions";
import { getMonthlyReviews } from "@/app/admin/reviews/actions";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc, setTenantOwnedDoc } from "@/lib/tenant-ownership";
import { getCurrentUserContext } from "@/lib/auth-server";


export type AllowanceType = "review" | "blog" | "sns" | "treatment" | "transport" | "nomination" | "other";

// ... existing code ...

export async function submitTransportRequest(data: {
  staff_id: string,
  staff_name: string,
  target_month: string,
  amount: number,
  details: string
}) {
  try {
    // Get staff contract to find transport limit
    let transportLimit = 15000; // Default limit
    try {
      const contractsSnapshot = await getDocs(query(collection(db, "staff_contracts"), where("staff_id", "==", data.staff_id)));
      let latestContract: any = null;
      contractsSnapshot.forEach(doc => {
         const cData = doc.data();
         if (!cData.deleted && (!latestContract || cData.valid_from > latestContract.valid_from)) {
            latestContract = cData;
         }
      });
      if (latestContract && latestContract.transport_fee_limit !== undefined) {
         transportLimit = Number(latestContract.transport_fee_limit);
      }
    } catch (err) {
      console.warn("Failed to fetch contract for transport limit:", err);
    }

    const cappedAmount = Math.min(data.amount, transportLimit);
    const targetDetails = { 
      context: data.details, 
      is_request: true, 
      status: "pending",
      original_requested_amount: data.amount,
      was_capped: data.amount > transportLimit
    };

    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const payload = {
      staff_id: data.staff_id,
      staff_name: data.staff_name,
      target_month: data.target_month,
      type: "transport",
      amount: cappedAmount,
      target_details: targetDetails,
      created_at: serverTimestamp()
    };

    const docRef = await addTenantOwnedDoc(colRef, payload);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error submitting transport request:", error);
    return { success: false, error: error.message };
  }
}

export type AllowanceRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  target_month: string; // YYYY-MM
  type: AllowanceType;
  amount: number;
  store_name?: string;
  target_details?: any; // JSON
  created_at: string;
};

const ALLOWANCES_COLLECTION = "allowances";

export async function getMonthlyAllowances(year: number, month: number): Promise<AllowanceRecord[]> {
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const q = query(colRef, where("target_month", "==", targetPrefix));
    
    const snapshot = await getDocs(q);
    
    
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
      };
    }) as any[];

    // メモリ上でソート
    records.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return records as AllowanceRecord[];
  } catch (error) {
    console.error("Error fetching allowances:", error);
    return [];
  }
}

const ALLOWANCE_CHECKS_COLLECTION = "allowance_checks";

export type AllowanceTaskStatus = {
  staff_id: string;
  staff_name: string;
  target_month: string;
  is_checked: boolean;
  total_amount: number;
  allowances: AllowanceRecord[];
  nomination_count: number;
  nominations: SalesRecord[];
  nomination_fee_unit: number;
  review_count_auto: number;
  nomination_store_breakdown?: Record<string, number>;
  review_store_breakdown?: Record<string, number>;
  treatments: SalesRecord[];
  treatment_count_auto: number;
  treatment_store_breakdown?: Record<string, number>;
};

function normalizeStaffName(name: string) {
  if (!name) return "";
  return name.replace(/[\s　]+/g, "")
    .replace(/凜/g, "凛")
    .replace(/邊/g, "辺")
    .replace(/齊|齋/g, "斉")
    .replace(/澤/g, "沢")
    .replace(/濱/g, "浜")
    .replace(/嶋/g, "島")
    .replace(/﨑|嵜/g, "崎")
    .replace(/髙/g, "高");
}

export async function getMonthlyAllowanceTasks(year: number, month: number): Promise<AllowanceTaskStatus[]> {
  
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    // 1. 全在籍スタッフ取得
    
    const staffList = await getStaffList();
    
    
    // 2. その月の全手当取得
    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const q = query(colRef, where("target_month", "==", targetPrefix));
    const snapshot = await getDocs(q);
    const allAllowances = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
      };
    }) as AllowanceRecord[];

    // 3. その月のチェック完了状態を取得
    const checksRef = collection(db, ALLOWANCE_CHECKS_COLLECTION);
    const checksQ = query(checksRef, where("target_month", "==", targetPrefix));
    const checksSnapshot = await getDocs(checksQ);
    const checkedStaffIds = new Set(checksSnapshot.docs.map(d => d.data().staff_id));

    // 4. その月の全売上取得（指名数カウント用）
    
    const monthlySales = await getMonthlySales(year, month);
    

    // 5. その月の全口コミ取得（★5自動カウント用）
    
    const monthlyReviews = await getMonthlyReviews(year, month);
    

    // 6. スタッフごとに集計
    const tasks: AllowanceTaskStatus[] = staffList.map(staff => {
      // 古いデータは staff_id が staff-名前 だったりするので名前でもマッチさせる
      const staffAllowances = allAllowances.filter(a => a.staff_id === staff.id || a.staff_name === staff.name);
      const totalAmount = staffAllowances.reduce((sum, a) => sum + a.amount, 0);
      
      // staffAllowancesをメモリ上でソート
      staffAllowances.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // 指名データを抽出（名前でマッチング）
      const staffNameNormal = normalizeStaffName(staff.name);
      const staffNominations = monthlySales.filter(s => {
        const saleStaffNameNormal = normalizeStaffName(s.staff_name);
        return saleStaffNameNormal === staffNameNormal && s.is_nominated;
      });

      // ★5口コミを抽出（返信テキストやスタッフ名でマッチング）
      const staffReviews = monthlyReviews.filter(r => {
        if (r.rating !== 5) return false;
        if (r.staff_name && normalizeStaffName(r.staff_name) === staffNameNormal) return true;
        // fallback to checking reply_text for staff name or katakana
        if (r.reply_text) {
          const kanji = staffNameNormal;
          const kana = staff.name_kana ? normalizeStaffName(staff.name_kana) : "";
          if (kanji && r.reply_text.includes(kanji)) return true;
          if (kana && r.reply_text.includes(kana)) return true;
          if (staff.last_name && r.reply_text.includes(staff.last_name)) return true;
        }
        return false;
      });

      // Group nominations by store
      const nominationStoreBreakdown: Record<string, number> = {};
      staffNominations.forEach(s => {
        const store = s.store_name || "不明";
        nominationStoreBreakdown[store] = (nominationStoreBreakdown[store] || 0) + 1;
      });

      // Group reviews by store
      const reviewStoreBreakdown: Record<string, number> = {};
      staffReviews.forEach(r => {
        const store = r.store_name || "不明";
        reviewStoreBreakdown[store] = (reviewStoreBreakdown[store] || 0) + 1;
      });

      // トリートメントデータを抽出
      const staffTreatments = monthlySales.filter(s => {
        if (s.treatment_excluded) return false;

        const saleStaffNameNormal = normalizeStaffName(s.staff_name);
        if (saleStaffNameNormal !== staffNameNormal) return false;
        
        const menuStr = (s.menu_course || "").toUpperCase();
        const optionStr = (s.options || "").toUpperCase();
        
        const menuMatch = menuStr.includes("トリートメント") || menuStr.includes("TR") || menuStr.includes("スペシャルケア");
        const optionsMatch = optionStr.includes("トリートメント") || optionStr.includes("TR") || optionStr.includes("スペシャルケア");
        
        return menuMatch || optionsMatch;
      });

      // Group treatments by store
      const treatmentStoreBreakdown: Record<string, number> = {};
      staffTreatments.forEach(s => {
        const store = s.store_name || "不明";
        treatmentStoreBreakdown[store] = (treatmentStoreBreakdown[store] || 0) + 1;
      });

      return {
        staff_id: staff.id,
        staff_name: staff.name,
        target_month: targetPrefix,
        is_checked: checkedStaffIds.has(staff.id),
        total_amount: totalAmount,
        allowances: staffAllowances,
        nomination_count: staffNominations.length,
        nominations: staffNominations,
        nomination_fee_unit: staff.nomination_fee || 300,
        review_count_auto: staffReviews.length,
        nomination_store_breakdown: nominationStoreBreakdown,
        review_store_breakdown: reviewStoreBreakdown,
        treatments: staffTreatments,
        treatment_count_auto: staffTreatments.length,
        treatment_store_breakdown: treatmentStoreBreakdown
      };
    });

     return tasks;
  } catch (error) {
    console.error("Error fetching allowance tasks:", error);
    return [];
  }
}

export async function markAllowanceChecked(staff_id: string, target_month: string) {
  try {
    const checkId = `${staff_id}_${target_month}`;
    const checkRef = doc(db, ALLOWANCE_CHECKS_COLLECTION, checkId);
    await setTenantOwnedDoc(checkRef, {
      staff_id,
      target_month,
      updated_at: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch(error: any) {
    console.error("Error marking checked:", error);
    return { success: false, error: error.message };
  }
}

export async function unmarkAllowanceChecked(staff_id: string, target_month: string) {
  try {
    const checkId = `${staff_id}_${target_month}`;
    await deleteTenantOwnedDoc(doc(db, ALLOWANCE_CHECKS_COLLECTION, checkId));
    return { success: true };
  } catch(error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStaffAllowanceTask(data: {
  staff_id: string;
  staff_name: string;
  target_month: string;
  allowances: { type: AllowanceType, amount: number, store_name: string, target_details?: any }[];
}) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) {
      return { success: false, error: "Unauthorized" };
    }
    
    const batch = writeBatch(db);
    let addedCount = 0;
    
    // Create new allowances
    for (const item of data.allowances) {
       if (item.amount > 0) {
         const docRef = doc(collection(db, ALLOWANCES_COLLECTION));
          batch.set(docRef, {
            companyId: ctx.companyId,
            staff_id: data.staff_id,
            staff_name: data.staff_name,
            target_month: data.target_month,
            type: item.type,
            amount: item.amount,
            store_name: item.store_name,
            target_details: item.target_details || {},
            created_at: serverTimestamp()
          });
         addedCount++;
       }
    }

    // Mark as checked
    const checkId = `${data.staff_id}_${data.target_month}`;
    const checkRef = doc(db, ALLOWANCE_CHECKS_COLLECTION, checkId);
    batch.set(checkRef, {
      companyId: ctx.companyId,
      staff_id: data.staff_id,
      target_month: data.target_month,
      updated_at: serverTimestamp()
    }, { merge: true });

    await batch.commit();

    await addAuditLog({
      table_name: ALLOWANCE_CHECKS_COLLECTION,
      record_id: checkId,
      action: "UPDATE",
      old_data: null,
      new_data: { staff_name: data.staff_name, target_month: data.target_month, items_added: addedCount },
      actor: "Admin"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error saving task:", error);
    return { success: false, error: error.message };
  }
}

export async function getStaffAllowanceHistory(staff_id: string): Promise<AllowanceRecord[]> {
  try {
    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const q = query(
      colRef, 
      where("staff_id", "==", staff_id),
      orderBy("created_at", "desc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
      };
    }) as AllowanceRecord[];
  } catch (error) {
    console.error("Error fetching staff allowance history:", error);
    return [];
  }
}

export async function addAllowance(formData: FormData) {
  try {
    const staffName = formData.get("staff_name") as string;
    const targetMonth = formData.get("target_month") as string; // YYYY-MM
    const type = formData.get("type") as AllowanceType;
    const amount = parseInt(formData.get("amount") as string || "0", 10);
    const storeName = formData.get("store_name") as string || "";
    const detailText = formData.get("detail_text") as string || "";

    if (!staffName || !targetMonth || !type) {
      return { success: false, error: "必須項目が入力されていません。" };
    }

    const colRef = collection(db, ALLOWANCES_COLLECTION);
    const payload = {
      staff_id: "staff-" + staffName, // Mock UUID or look up from staff profiles if needed
      staff_name: staffName,
      target_month: targetMonth,
      type,
      amount,
      store_name: storeName,
      target_details: { context: detailText },
      created_at: serverTimestamp()
    };

    const docRef = await addTenantOwnedDoc(colRef, payload);

    await addAuditLog({
      table_name: ALLOWANCES_COLLECTION,
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: payload,
      actor: "Admin"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding allowance:", error);
    return { success: false, error: error.message || "エラーが発生しました。" };
  }
}

export async function deleteAllowance(id: string) {
  try {
    await deleteTenantOwnedDoc(doc(db, ALLOWANCES_COLLECTION, id));

    await addAuditLog({
      table_name: ALLOWANCES_COLLECTION,
      record_id: id,
      action: "DELETE",
      old_data: null,
      new_data: null,
      actor: "Admin"
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting allowance:", error);
    return { success: false, error: error.message || "エラーが発生しました。" };
  }
}

export async function toggleTreatmentExclusion(saleId: string, exclude: boolean) {
  try {
    const saleRef = doc(db, "sales", saleId);
    await updateTenantOwnedDoc(saleRef, { treatment_excluded: exclude });
    return { success: true };
  } catch (err: any) {
    console.error("Error toggling treatment exclusion:", err);
    return { success: false, error: err.message };
  }
}
