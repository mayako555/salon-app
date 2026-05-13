"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query, 
  where,
  orderBy, 
  serverTimestamp,
  getDoc,
  setDoc
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

export type TrainingStatus = "not_started" | "free_model" | "paid_model" | "ready_for_check" | "passed";

export type CurriculumItem = {
  id: string;
  name: string;
  free_model_target: number;
  paid_model_target: number;
  description: string;
  evaluation_criteria: string[];
};

export type StaffTrainingProgress = {
  id: string; // staffId_curriculumId
  staff_id: string;
  curriculum_id: string;
  status: TrainingStatus;
  free_count: number;
  paid_count: number;
  next_check_date?: string;
  passed_at?: any;
};

export type OJTSession = {
  id: string;
  staff_id: string;
  date: string;
  instructor_id: string;
  instructor_name: string;
  location: string;
  duration_hours: number;
  duration_minutes: number;
  job_role: string;
  subject_name: string; // 科目名 (例: エクステンション基礎知識)
  curriculum_content: string; // 科目の内容 (例: マネキンかき分けデモンストレーション)
  content: string; // 訓練の具体的内容（指導内容）
  acquired_skills: string; // 訓練により身についたこと
  created_at?: any;
};

export type ModelRecord = {
  id: string;
  staff_id: string;
  curriculum_id: string;
  curriculum_name: string;
  date: string;
  model_name: string;
  model_phone: string;
  model_type: "free" | "paid";
  photo_before?: string[];
  photo_after?: string[];
  reflection: string;
  created_at?: any;
};

export type EvaluationRecord = {
  id: string;
  staff_id: string;
  curriculum_id: string;
  evaluator_id: string;
  scores: Record<string, number>;
  total_score: number;
  result: "pass" | "fail" | "recheck";
  comment: string;
  date: any;
};

const CURRICULUM_COLLECTION = "training_curriculum";
const PROGRESS_COLLECTION = "staff_training_progress";
const MODEL_RECORDS_COLLECTION = "training_model_records";
const EVALUATIONS_COLLECTION = "training_evaluations";

// --- Curriculum ---

export async function getCurriculum(): Promise<CurriculumItem[]> {
  const colRef = collection(db, CURRICULUM_COLLECTION);
  const snap = await getDocs(query(colRef, orderBy("name", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CurriculumItem));
}

export async function saveCurriculumItem(data: Partial<CurriculumItem>) {
  const colRef = collection(db, CURRICULUM_COLLECTION);
  if (data.id) {
    const docRef = doc(db, CURRICULUM_COLLECTION, data.id);
    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
  } else {
    await addDoc(colRef, { ...data, created_at: serverTimestamp() });
  }
  revalidatePath("/training");
  return { success: true };
}

// --- Progress ---

export async function getStaffProgress(staffId: string): Promise<StaffTrainingProgress[]> {
  const colRef = collection(db, PROGRESS_COLLECTION);
  const q = query(colRef, where("staff_id", "==", staffId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffTrainingProgress));
}

export async function updateProgress(staffId: string, curriculumId: string, updates: Partial<StaffTrainingProgress>) {
  const docId = `${staffId}_${curriculumId}`;
  const docRef = doc(db, PROGRESS_COLLECTION, docId);
  
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    await updateDoc(docRef, { ...updates, updated_at: serverTimestamp() });
  } else {
    await setDoc(docRef, {
      staff_id: staffId,
      curriculum_id: curriculumId,
      status: "not_started",
      free_count: 0,
      paid_count: 0,
      ...updates,
      created_at: serverTimestamp()
    });
  }
  revalidatePath("/training");
  return { success: true };
}

// --- Model Records ---

export async function saveModelRecord(data: Partial<ModelRecord>) {
  const colRef = collection(db, MODEL_RECORDS_COLLECTION);
  let docId = data.id;
  
  if (docId) {
    const docRef = doc(db, MODEL_RECORDS_COLLECTION, docId);
    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
  } else {
    const res = await addDoc(colRef, { ...data, created_at: serverTimestamp() });
    docId = res.id;
    
    // Auto-increment progress counts
    if (data.staff_id && data.curriculum_id) {
      const progId = `${data.staff_id}_${data.curriculum_id}`;
      const progRef = doc(db, PROGRESS_COLLECTION, progId);
      const progSnap = await getDoc(progRef);
      
      const current = progSnap.exists() ? progSnap.data() : { free_count: 0, paid_count: 0, status: "not_started" };
      const isPaid = data.model_type === "paid";
      
      const updates: any = {};
      if (isPaid) {
        updates.paid_count = (current.paid_count || 0) + 1;
      } else {
        updates.free_count = (current.free_count || 0) + 1;
      }
      
      await updateProgress(data.staff_id, data.curriculum_id, updates);
    }

    // --- Sync to Customer Management ---
    try {
      if (data.model_phone) {
        const customerCol = collection(db, "customers");
        const q = query(customerCol, where("tel", "==", data.model_phone));
        const snap = await getDocs(q);
        
        const customerData = {
          name: data.model_name,
          tel: data.model_phone,
          tags: data.model_type === "paid" ? ["ミニモ", "モデル"] : ["モデル"],
          last_visit: data.date,
          notes: `【新人教育モデル】${data.curriculum_name}の練習モデルとして来店`,
          updated_at: serverTimestamp()
        };

        if (snap.empty) {
          await addDoc(customerCol, {
            ...customerData,
            created_at: serverTimestamp()
          });
        } else {
          const docId = snap.docs[0].id;
          await updateDoc(doc(db, "customers", docId), customerData);
        }
      }
    } catch (err) {
      console.error("Failed to sync customer:", err);
    }
  }
  revalidatePath("/training");
  return { success: true, id: docId };
}

export async function getModelRecords(staffId: string, curriculumId?: string): Promise<ModelRecord[]> {
  const colRef = collection(db, MODEL_RECORDS_COLLECTION);
  let q = query(colRef, where("staff_id", "==", staffId), orderBy("date", "desc"));
  if (curriculumId) {
    q = query(colRef, where("staff_id", "==", staffId), where("curriculum_id", "==", curriculumId), orderBy("date", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ModelRecord));
}

// --- Evaluations ---

export async function recordEvaluation(data: Partial<EvaluationRecord>) {
  const colRef = collection(db, EVALUATIONS_COLLECTION);
  const res = await addDoc(colRef, { ...data, date: serverTimestamp() });
  
  // Update training status if passed
  if (data.result === "pass" && data.staff_id && data.curriculum_id) {
    await updateProgress(data.staff_id, data.curriculum_id, {
      status: "passed",
      passed_at: serverTimestamp()
    });
  }
  
  revalidatePath("/training");
  return { success: true, id: res.id };
}

// --- OJT Sessions (Subsidy Form 9) ---

export async function saveOJTSession(data: Partial<OJTSession>) {
  const colRef = collection(db, "training_ojt_sessions");
  const res = await addDoc(colRef, {
    ...data,
    created_at: serverTimestamp()
  });
  revalidatePath("/training");
  return { success: true, id: res.id };
}

export async function getOJTSessions(staffId: string): Promise<OJTSession[]> {
  const colRef = collection(db, "training_ojt_sessions");
  const q = query(colRef, where("staff_id", "==", staffId), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OJTSession));
}
