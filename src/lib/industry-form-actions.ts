'use server';
import { adminDb as untypedDb } from '@/lib/firebase-admin';
const adminDb = untypedDb as import("firebase-admin/firestore").Firestore;
import { getCurrentUserContext } from '@/lib/auth-server';
import { readIndustryForms, validateIndustryForms, type IndustryForms } from './industry-forms';
export async function getIndustryFormSettings() {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId || ['guest', 'accountant'].includes(ctx.role)) throw new Error('権限がありません');
  const company = await adminDb.collection('companies').doc(ctx.companyId).get();
  if (!company.exists) throw new Error('テナントが見つかりません');
  return readIndustryForms(company.data()?.industryForms);
}
export async function saveIndustryFormSettings(settings: IndustryForms) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId || !['systemOwner', 'companyOwner', 'admin'].includes(ctx.role)) throw new Error('管理者権限が必要です');
    await adminDb.collection('companies').doc(ctx.companyId).update({ industryForms: validateIndustryForms(settings), updatedAt: new Date() });
    return { success: true };
  } catch { return { success: false, error: '設定を保存できませんでした。業種・シートの選択と管理者権限を確認してください。' }; }
}
