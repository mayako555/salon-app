"use server";

import { db } from "@/lib/firebase";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";
import {
  collection,
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

const APPLICANTS_COLLECTION = "applicants";

export type ApplicantStatus = 
  | "応募受付" 
  | "サロン見学調整中"
  | "サロン見学予定"
  | "サロン見学済"
  | "サロン見学キャンセル"
  | "面接調整中" 
  | "面接確定" 
  | "面接済" 
  | "面接キャンセル"
  | "内定" 
  | "採用" 
  | "不採用" 
  | "辞退"
  | "見学のみ終了"
  | "退職済";

export type Applicant = {
  id: string;
  application_date?: string; // 応募日
  name: string;
  name_kana: string;
  age?: number | string; // 年齢
  category?: string; // 区分
  phone: string;
  email: string;
  instagram_account?: string; // インスタグラムのアカウント名
  desired_role: string;
  application_source: string;
  status: ApplicantStatus;
  salon_tour_date?: string; // サロン見学日
  interview_date?: string; // 面接日
  recruitment_cost?: string | number; // 採用費用（成果報酬）
  school_name?: string; // 学校名
  decision_date?: string; // 採用決定日
  join_date?: string; // 入社日
  contract_type?: string; // 契約形態
  interviewer?: string; // 担当者名（面接官）
  notes?: string; // 備考
  resume_url?: string; // For the resume file attachment
  skills?: string[]; // 習得技術
  tech_quality?: {
    finish?: number; // 仕上がりの綺麗さ (1-5)
    retention?: number; // 持ちの良さ (1-5)
    low_risk?: number; // お直しリスクの低さ (1-5)
  };
  service_quality?: {
    counseling?: number; // カウンセリング力 (1-5)
    language?: number; // 言葉遣い (1-5)
    atmosphere?: number; // 雰囲気 (1-5)
  };
  proposed_salary?: string | number; // 提案月給
  requires_trial_review?: boolean; // 試用期間後の見直し有無
  interview_memo?: string; // 面接メモ
  created_at?: any;
  updated_at?: any;
};

export async function getApplicants(): Promise<Applicant[]> {
  try {
    const colRef = collection(db, APPLICANTS_COLLECTION);
    const q = query(colRef, orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : (data.updated_at || null)
      };
    }) as Applicant[];
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return [];
  }
}

export async function createApplicant(data: Omit<Applicant, "id" | "created_at" | "updated_at">) {
  try {
    const colRef = collection(db, APPLICANTS_COLLECTION);
    const docRef = await addTenantOwnedDoc(colRef, {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating applicant:", error);
    return { success: false, error: error.message };
  }
}

export async function updateApplicant(id: string, data: Partial<Applicant>) {
  try {
    const docRef = doc(db, APPLICANTS_COLLECTION, id);
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;
    
    await updateTenantOwnedDoc(docRef, {
      ...updateData,
      updated_at: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating applicant:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteApplicant(id: string) {
  try {
    const docRef = doc(db, APPLICANTS_COLLECTION, id);
    await deleteTenantOwnedDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting applicant:", error);
    return { success: false, error: error.message };
  }
}
