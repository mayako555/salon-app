'use server';
import { randomBytes, createHash } from 'node:crypto';
import { adminDb as untypedDb } from './firebase-admin';
const adminDb = untypedDb as import("firebase-admin/firestore").Firestore;
import { requireCustomerAccess } from './customer-record-access';
import { readIndustryForms, templateById } from './industry-forms';
import { calculateRiskFlags, type ServiceType } from './counseling-model';
import { INTAKE_TTL, validIntakeSession, validateIntakeSubmission } from './intake-validation';
function sessionRef(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('QRコードが無効です');
  return adminDb.collection('counseling_intake_sessions').doc(createHash('sha256').update(token).digest('hex'));
}
export async function createCounselingIntake(customerId: string) {
  try {
    const { ctx } = await requireCustomerAccess(customerId);
    const company = await adminDb.collection('companies').doc(ctx.companyId!).get();
    const settings = readIndustryForms(company.data()?.industryForms);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + INTAKE_TTL;
    await sessionRef(token).set({ companyId: ctx.companyId, customerId, template: templateById(settings.counselingTemplateId, 'counseling'), createdAt: Date.now(), expiresAt });
    return { success: true as const, token, expiresAt };
  } catch { return { success: false as const, error: '入力用QRを発行できませんでした。顧客とシート設定を確認してください。' }; }
}
export async function getPublicIntakeInfo(token: string) {
  try {
    const session = (await sessionRef(token).get()).data();
    if (!validIntakeSession(session, Date.now())) throw new Error('expired');
    const company = await adminDb.collection('companies').doc(session!.companyId).get();
    if (!company.exists || company.data()?.status === 'inactive') throw new Error('inactive');
    return { success: true as const, name: String(company.data()?.name || 'サロン'), template: session!.template as import('./industry-forms').FormTemplate, completed: !!session!.responseId };
  } catch { return { success: false as const, error: 'このQRコードは無効か有効期限が切れています。スタッフに再発行を依頼してください。' }; }
}
export async function submitCounselingIntake(token: string, data: { name: string; phone: string; answers: unknown; services?: ServiceType[]; signature?: string; consent: boolean; gender?: string; profile?: Record<string, unknown> }) {
  try {
    const ref = sessionRef(token);
    await adminDb.runTransaction(async (tx: import("firebase-admin/firestore").Transaction) => {
      const session = (await tx.get(ref)).data();
      if (!validIntakeSession(session, Date.now())) throw new Error('QRの有効期限が切れました。スタッフに再発行を依頼してください。');
      const customerRef = adminDb.collection('customers').doc(session!.customerId);
      const [customer, company] = await Promise.all([tx.get(customerRef), tx.get(adminDb.collection('companies').doc(session!.companyId))]);
      if (!customer.exists || customer.data()?.companyId !== session!.companyId || !company.exists || company.data()?.status === 'inactive') throw new Error('現在このシートは使用できません');
      if (session!.responseId) return; // A retried submission never duplicates or overwrites an answer.
      const clean = validateIntakeSubmission(session!.template, data);
      const risk = session!.template.legacy ? calculateRiskFlags(clean.answers, clean.service_types) : { riskLevel: 'none', riskFlags: [] };
      const record = adminDb.collection('counseling_responses').doc();
      tx.set(record, { ...clean, companyId: session!.companyId, customer_id: session!.customerId, form_snapshot: session!.template, gender: data.gender === 'male' ? 'male' : data.gender === 'female' ? 'female' : 'other', risk_level: risk.riskLevel, risk_flags: risk.riskFlags, consent: true, signed_at: new Date(), created_at: new Date() });
      tx.update(ref, { responseId: record.id, consumedAt: Date.now() });
    });
    return { success: true as const };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : '送信できませんでした。もう一度お試しください。' }; }
}
