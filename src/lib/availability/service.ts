import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin';
import { getCurrentUserContext } from '../auth-server';
import { ensureFeatureDefaults } from '@/types/master';
import { availabilityTenant, calculateAvailability, publicMenus, selectMenu, timeRows, DEFAULT_AVAILABILITY, publicDates, validateSettings, type AvailabilitySettings, type PublicAvailability, type Busy, type WorkShift, type Worker } from './model';
const db = adminDb as Firestore;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
function validId(id: string) { if (!id || id.includes('/') || id.length > 200) throw new Error('店舗を確認してください。'); return id; }
async function companyActive(companyId: string) {
  const company = (await db.collection('companies').doc(companyId).get()).data();
  if (!company || company.status === 'inactive' || !ensureFeatureDefaults(company.features, company.companyType === 'system_owner').reservations) throw new Error('利用できません。');
}
async function scope() {
  const ctx = await getCurrentUserContext(); const companyId = availabilityTenant(ctx);
  await companyActive(companyId);
  return { companyId, uid: ctx.uid, root: db.collection('companies').doc(companyId).collection('availability_settings') };
}
export async function listAvailabilitySettings() {
  const s = await scope();
  const [stores, configs] = await Promise.all([db.collection('sales_master').where('companyId','==',s.companyId).where('itemType','==','store').get(), s.root.get()]);
  return stores.docs.filter(d => d.data().isActive !== false).map(d => {
    const config = configs.docs.find(c => c.id === d.id)?.data();
    return { id: d.id, name: String(d.data().name), settings: config ? validateSettings(config as AvailabilitySettings) : DEFAULT_AVAILABILITY, token: config?.token as string || '' };
  });
}
export async function saveAvailabilitySettings(storeId: string, input: AvailabilitySettings, rotate = false) {
  const s = await scope(); validId(storeId); const settings = validateSettings(input);
  const storeRef = db.collection('sales_master').doc(storeId); const ref = s.root.doc(storeId);
  return db.runTransaction(async tx => {
    const [store, previous] = await Promise.all([tx.get(storeRef), tx.get(ref)]);
    const data = store.data(); const old = previous.data();
    if (!data || data.companyId !== s.companyId || data.itemType !== 'store' || data.isActive === false) throw new Error('店舗を確認してください。');
    const token: string = !rotate && old?.token ? old.token : randomBytes(32).toString('base64url');
    if (old?.token && old.token !== token) tx.delete(db.collection('public_availability_links').doc(hash(old.token)));
    tx.set(ref, { ...settings, token, companyId: s.companyId, updatedAt: new Date().toISOString() });
    tx.set(db.collection('public_availability_links').doc(hash(token)), { companyId: s.companyId, storeId, enabled: settings.enabled });
    tx.create(db.collection('companies').doc(s.companyId).collection('availability_audit').doc(), { userId: s.uid, storeId, event: settings.enabled ? 'AVAILABILITY_PUBLISHED' : 'AVAILABILITY_DISABLED', rotated: rotate, timestamp: new Date().toISOString() });
    return token;
  });
}
export async function readPublicAvailability(token: string, offset: number, menuId?: string): Promise<PublicAvailability | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const now = Date.now(), dates = publicDates(now, offset);
  const linkRef = db.collection('public_availability_links').doc(hash(token));
  const link = (await linkRef.get()).data();
  if (!link?.enabled) return null;
  const companyId = validId(link.companyId), storeId = validId(link.storeId);
  await companyActive(companyId);
  const settingsRef = db.collection('companies').doc(companyId).collection('availability_settings').doc(storeId);
  const [store, config] = await Promise.all([db.collection('sales_master').doc(storeId).get(), settingsRef.get()]);
  const storeData = store.data(), settings = config.data();
  if (!storeData || storeData.companyId !== companyId || storeData.itemType !== 'store' || storeData.isActive === false || !settings?.enabled || settings.companyId !== companyId || settings.token !== token) return null;
  const range = (collection: string) => db.collection(collection).where('companyId','==',companyId).where('date','>=',dates[0]).where('date','<=',dates[6]).limit(2001).get();
  const [shifts, reservations, staff, stores] = await Promise.all([range('shifts'), range('reservations'), db.collection('staff_profiles').where('companyId','==',companyId).limit(501).get(), db.collection('sales_master').where('companyId','==',companyId).where('itemType','==','store').get()]);
  if (shifts.size > 2000 || reservations.size > 2000 || staff.size > 500) throw new Error('表示範囲を超えています。');
  const aliases = [storeId, String(storeData.name)];
  const checked = validateSettings(settings as AvailabilitySettings);
  const menu = selectMenu(checked, menuId);
  const selected = {...checked, duration: menu.duration};
  const days = calculateAvailability(selected, dates, aliases, staff.docs.map(d => ({ ...d.data(), id: d.id } as Worker)), shifts.docs.map(d => d.data() as WorkShift), reservations.docs.map(d => d.data() as Busy), now, stores.docs.filter(d => d.id !== storeId).flatMap(d => [d.id, String(d.data().name)]));
  const eligibleDays = calculateAvailability(selected, dates, aliases, staff.docs.map(d => ({...d.data(),id:d.id} as Worker)), shifts.docs.map(d => d.data() as WorkShift), [], now);
  // Recheck publication after reads; never cache public results across revocation.
  const current = (await linkRef.get()).data();
  if (!current?.enabled) return null;
  return { storeName: String(storeData.name), duration: menu.duration, days, eligibleDays, timeRows: timeRows(selected), menus: publicMenus(checked), menuId: menu.id, bookingEnabled: checked.bookingEnabled === true, updatedAt: new Date(now).toISOString() };
}
