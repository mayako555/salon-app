"use server";
import { cleanKartePatch } from "./karte-validation";
import { adminDb as untypedDb } from './firebase-admin';
const adminDb = untypedDb as import("firebase-admin/firestore").Firestore;
import { requireCustomerAccess, serializeRecord } from './customer-record-access';
import { getIndustryFormSettings } from './industry-form-actions';
import { templateById, cleanFormAnswers, type FormTemplate } from './industry-forms';
export type KarteRecord = {
  drawing_document?: import("./drawing-document").DrawingDocument;
  form_snapshot?: FormTemplate;
  form_answers?: Record<string, string>;
  id: string;
  customer_id: string;
  staff_id: string;
  staff_name: string;
  date: any;
  service_type: 'eyelash_ext' | 'lash_lift' | 'eyebrow' | 'and_healthy' | 'hair' | 'nail' | 'esthetic' | 'relaxation' | 'general';
  visit_type: 'new' | 'repeat' | 'refill'; // 付け足し/付け替え等
  
  // Design Details (Specialized by Service)
  design: {
    // まつ毛共通
    curl?: string;
    thickness?: string;
    length?: string; // e.g. "9-11-10"
    count?: number;
    style?: string;
    
    // アイブロウ共通
    shape?: string;
    wax_type?: string;
    thinning?: boolean; // 間引き
    brow_perm?: boolean; // 眉パーマ
    stencil?: boolean; // ステンシル
    
    // パーマ詳細
    perm_solution_1_time?: number; // 1液放置時間
    perm_solution_2_time?: number; // 2液放置時間
    
    // オプション・詳細
    options?: string[];
    hair_material?: string; // セーブル/カシミア等
    
    // まつ毛詳細カウント (左右別)
    left_remaining?: number;
    right_remaining?: number;
    left_added?: number;
    right_added?: number;
    left_total?: number;
    right_total?: number;
  };
  
  before_photo_url?: string;
  after_photo_url?: string;
  photos?: { url: string; description: string }[];
  treatment_photos?: { url: string; description: string }[];
  edit_history?: {
    edited_at: any;
    edited_by_id: string;
    edited_by_name: string;
    previous_data: any;
  }[];
  eye_diagram_url?: string; // 手書きの目のマーク・デザインマップ
  past_karte_photos?: { url: string; description: string }[];
  notes?: string;
  created_at: any;
};


export async function addKarteRecord(data: Omit<KarteRecord, 'id' | 'created_at' | 'edit_history'>) {
  try {
    const { ctx } = await requireCustomerAccess(data.customer_id);
    const settings = await getIndustryFormSettings();
    const template = templateById(settings.karteTemplateId, 'karte');
    if (data.form_snapshot?.id !== template.id && !(template.legacy && !data.form_snapshot)) throw new Error('シート設定が変更されました。画面を開き直してください');
    const { form_snapshot, form_answers, ...rest } = data;
    const doc = await adminDb.collection('karte_records').add({ ...cleanKartePatch(rest), customer_id: data.customer_id, companyId: ctx.companyId,
      form_snapshot: template, form_answers: template.legacy ? {} : cleanFormAnswers(template, form_answers),
      created_at: new Date(), edit_history: [] });
    return { success: true, id: doc.id };
  } catch { return { success: false, error: '保存できませんでした。顧客・シート設定と入力内容を確認してください。' }; }
}
export async function editKarteRecord(karteId: string, newData: Partial<KarteRecord>, _editorId: string, _editorName: string) {
  try {
    const ref = adminDb.collection('karte_records').doc(karteId);
    const initial = await ref.get();
    const { ctx } = await requireCustomerAccess(initial.data()?.customer_id);
    await adminDb.runTransaction(async (tx: import("firebase-admin/firestore").Transaction) => {
      const snapshot = await tx.get(ref); const old = snapshot.data();
      if (!old || old.customer_id !== initial.data()?.customer_id || (old.companyId && old.companyId !== ctx.companyId)) throw new Error('権限がありません');
      const { id, customer_id, created_at, edit_history, form_snapshot, form_answers, ...patch } = newData;
      // Preserve the original form definition when tenant settings change.
      const previous = { ...old }; delete previous.edit_history;
      await tx.update(ref, { ...cleanKartePatch(patch), companyId: ctx.companyId,
        ...(old.form_snapshot && !old.form_snapshot.legacy ? { form_answers: cleanFormAnswers(old.form_snapshot, form_answers ?? old.form_answers) } : {}),
        edit_history: [...(old.edit_history || []), { edited_at: new Date().toISOString(), edited_by_id: ctx.uid, edited_by_name: ctx.profileId || ctx.uid, previous_data: previous }] });
    });
    return { success: true };
  } catch { return { success: false, error: 'カルテを更新できませんでした' }; }
}
export async function getKarteByCustomer(customerId: string): Promise<KarteRecord[]> {
  const { ctx } = await requireCustomerAccess(customerId);
  const snapshot = await adminDb.collection('karte_records').where('customer_id', '==', customerId).get();
  return snapshot.docs.filter((d: import("firebase-admin/firestore").QueryDocumentSnapshot) => !d.data().companyId || d.data().companyId === ctx.companyId)
    .map((d: import("firebase-admin/firestore").QueryDocumentSnapshot) => serializeRecord({ ...d.data(), id: d.id }) as KarteRecord)
    .sort((a: KarteRecord, b: KarteRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
