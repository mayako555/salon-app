'use server';
import { adminDb as rawDb } from '@/lib/firebase-admin';
const adminDb=rawDb as import('firebase-admin/firestore').Firestore;
import { getCurrentUserContext } from '@/lib/auth-server';
import { requireCustomerAccess } from './customer-record-access';
import { formStores, customerStoreForms } from './store-industry-forms';
import { readIndustryForms, validateIndustryForms, type IndustryForms } from './industry-forms';
export async function getIndustryFormSettings() {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId || ['guest', 'accountant'].includes(ctx.role)) throw new Error('権限がありません');
  const company = await adminDb.collection('companies').doc(ctx.companyId).get();
  if (!company.exists) throw new Error('テナントが見つかりません');
  return readIndustryForms(company.data()?.industryForms);
}
export async function getStoreIndustryFormSettings() {
  const ctx = await getCurrentUserContext();
  const stores = await formStores(ctx);
  const company = await adminDb.collection('companies').doc(ctx.companyId!).get();
  if (!company.exists || company.data()?.status === 'inactive') throw new Error('設定を確認してください');
  return stores.map(store => ({ id: store.id, name: String(store.data().name), inherited: store.data().industryForms == null, settings: readIndustryForms(store.data().industryForms ?? company.data()?.industryForms) }));
}
export async function getCustomerIndustryFormSettings(customerId: string) {
  const {ctx,customer} = await requireCustomerAccess(customerId);
  return customerStoreForms(ctx, customer.data()!);
}
export async function saveIndustryFormSettings(settings: IndustryForms, storeId: string) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId || !['systemOwner', 'companyOwner', 'admin'].includes(ctx.role)) throw new Error('管理者権限が必要です');
    const store = (await formStores(ctx)).find(d => d.id === storeId);
    if (!store) throw new Error('店舗を選択してください');
    const clean = validateIndustryForms(settings);
    await adminDb.runTransaction(async tx => {
      const current = await tx.get(store.ref);
      if (current.data()?.companyId !== ctx.companyId || current.data()?.itemType !== 'store' || current.data()?.isActive === false) throw new Error('店舗を確認してください');
      tx.update(store.ref, { industryForms: clean, updatedAt: new Date() });
    });
    return { success: true };
  } catch { return { success: false, error: '保存できませんでした。店舗・シートの選択と管理者権限を確認してください。' }; }
}
