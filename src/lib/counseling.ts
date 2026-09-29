"use server";
import { adminDb as untypedDb } from './firebase-admin';
const adminDb = untypedDb as import("firebase-admin/firestore").Firestore;
import { requireCustomerAccess, serializeRecord } from './customer-record-access';
import { cleanFormAnswers } from './industry-forms';
import { calculateRiskFlags, type CounselingResponse } from './counseling-model';
export type { CounselingResponse, ServiceType } from './counseling-model';
export async function getCounselingByCustomer(customerId: string): Promise<CounselingResponse[]> {
  const { ctx } = await requireCustomerAccess(customerId);
  const snapshot = await adminDb.collection('counseling_responses').where('customer_id', '==', customerId).get();
  return snapshot.docs.filter((d: import("firebase-admin/firestore").QueryDocumentSnapshot) => !d.data().companyId || d.data().companyId === ctx.companyId)
    .map((d: import("firebase-admin/firestore").QueryDocumentSnapshot) => serializeRecord({ ...d.data(), id: d.id }) as CounselingResponse)
    .sort((a: CounselingResponse, b: CounselingResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
export async function updateCounselingResponse(id: string, data: Partial<CounselingResponse>) {
  try {
    const ref = adminDb.collection('counseling_responses').doc(id);
    const snapshot = await ref.get(); const old = snapshot.data();
    const { ctx } = await requireCustomerAccess(old?.customer_id);
    if (!old || (old.companyId && old.companyId !== ctx.companyId)) throw new Error('権限がありません');
    const answers = old.form_snapshot && !old.form_snapshot.legacy ? cleanFormAnswers(old.form_snapshot, data.answers) : data.answers;
    if (!answers || JSON.stringify(answers).length > 50000) throw new Error('回答が無効です');
    const risk = old.form_snapshot && !old.form_snapshot.legacy ? null : calculateRiskFlags(answers, old.service_types || []);
    await ref.update({ answers, ...(risk ? { risk_level: risk.riskLevel, risk_flags: risk.riskFlags } : {}), updated_at: new Date(), updated_by: ctx.uid });
    return { success: true };
  } catch { return { success: false, error: '回答を更新できませんでした' }; }
}

// Authenticated staff import of an existing paper questionnaire.
export async function addCounselingResponse(data: Omit<CounselingResponse, 'id' | 'created_at'>) {
  try {
    const { ctx } = await requireCustomerAccess(data.customer_id);
    const record = await adminDb.collection('counseling_responses').add({ ...data, companyId: ctx.companyId, created_at: new Date() });
    return { success: true, id: record.id };
  } catch { return { success: false, error: 'カウンセリングを保存できませんでした' }; }
}
