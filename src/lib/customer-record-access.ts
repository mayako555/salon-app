import 'server-only';
import { adminDb as untypedDb } from './firebase-admin';
const adminDb = untypedDb as import("firebase-admin/firestore").Firestore;
import { getCurrentUserContext } from './auth-server';
export async function requireCustomerAccess(customerId: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId || ['guest', 'accountant'].includes(ctx.role) || !customerId || customerId.includes('/')) throw new Error('権限がありません');
  const customer = await adminDb.collection('customers').doc(customerId).get();
  if (!customer.exists || customer.data()?.companyId !== ctx.companyId) throw new Error('顧客が見つかりません');
  return { ctx, customer };
}
export function serializeRecord(value: any): any {
  if (value == null) return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(serializeRecord);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeRecord(v)]));
  return value;
}
