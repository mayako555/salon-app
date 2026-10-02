import 'server-only';
import { adminDb as rawDb } from './firebase-admin';
const adminDb=rawDb as import('firebase-admin/firestore').Firestore;
import type { UserContext } from './authorization';
import { readIndustryForms } from './industry-forms';
export async function formStores(ctx: UserContext) {
  if (!ctx.companyId || ['guest','accountant'].includes(ctx.role)) throw new Error('権限がありません');
  const rows = await adminDb.collection('sales_master').where('companyId','==',ctx.companyId).where('itemType','==','store').get();
  return rows.docs.filter(d => d.data().isActive !== false && (['systemOwner','companyOwner','admin'].includes(ctx.role) || ctx.salonIds.includes(d.id) || ctx.salonIds.includes(d.data().name)));
}
export async function customerStoreForms(ctx: UserContext, customer: Record<string, unknown>) {
  const stores = await formStores(ctx);
  const matches = stores.filter(d => d.id === customer.store_name || d.data().name === customer.store_name);
  const store = matches.length === 1 ? matches[0] : !customer.store_name && stores.length === 1 ? stores[0] : undefined;
  if (!store) throw new Error('顧客の所属店舗と店舗権限を確認してください');
  const company = await adminDb.collection('companies').doc(ctx.companyId!).get();
  if (!company.exists || company.data()?.status === 'inactive') throw new Error('店舗設定を確認してください');
  return { storeId: store.id, storeName: String(store.data().name), settings: readIndustryForms(store.data().industryForms ?? company.data()?.industryForms) };
}
