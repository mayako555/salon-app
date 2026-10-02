import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { ensureFeatureDefaults } from '@/types/master';
import { calculateAvailability, minutes, publicDates, selectMenu, timeLabel, validateBooking, validateSettings, type AvailabilitySettings, type Busy, type Worker, type WorkShift } from './model';
export class BookingError extends Error { constructor(public status: number, message: string) {super(message);} }
const digest = (s:string) => createHash('sha256').update(s).digest('hex');
export type BookingReceipt = { reference: string; storeName: string; date: string; time: string; endTime: string; menuName: string };
/** Reads, capacity check, staff allocation and reservation creation share one transaction.
 * The tenant/day mutex serializes simultaneous public bookings, including across stores.
 * Idempotency is tenant+link+request scoped; a retry returns the same receipt without creating another row.
 */
export async function createPublicBooking(token: string, raw: unknown, database: Firestore): Promise<BookingReceipt> {
  let input;
  try {input = validateBooking(raw);} catch(e) {throw new BookingError(400,e instanceof Error ? e.message : '入力内容を確認してください。');}
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new BookingError(404,'このリンクでは予約できません。');
  const now = Date.now();
  if (![...publicDates(now), ...publicDates(now,7)].includes(input.date)) throw new BookingError(400,'予約日を選び直してください。');
  const linkId = digest(token);
  const fingerprint = digest(JSON.stringify(input));
  return database.runTransaction(async tx => {
    const link = (await tx.get(database.collection('public_availability_links').doc(linkId))).data();
    if (!link?.enabled || typeof link.companyId !== 'string' || link.companyId.includes('/') || typeof link.storeId !== 'string' || link.storeId.includes('/')) throw new BookingError(404,'このリンクでは予約できません。');
    const root = database.collection('companies').doc(link.companyId);
    const requestRef = root.collection('availability_booking_requests').doc(digest(`${linkId}:${input.requestId}`));
    const previous = (await tx.get(requestRef)).data();
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new BookingError(409,'送信内容が変わりました。画面を開き直してください。');
      return previous.receipt as BookingReceipt;
    }
    const [company, store, config] = await Promise.all([
      tx.get(root), tx.get(database.collection('sales_master').doc(link.storeId)), tx.get(root.collection('availability_settings').doc(link.storeId))
    ]);
    const c = company.data(), s = store.data(), configData = config.data();
    if (!c || c.status === 'inactive' || !ensureFeatureDefaults(c.features,c.companyType === 'system_owner').reservations || !s || s.companyId !== link.companyId || s.itemType !== 'store' || s.isActive === false || !configData?.enabled || configData.companyId !== link.companyId || configData.token !== token || configData.bookingEnabled !== true) throw new BookingError(403,'現在ネット予約を受け付けていません。');
    const settings = validateSettings(configData as AvailabilitySettings);
    let menu;
    try {menu = selectMenu(settings,input.menuId);} catch {throw new BookingError(409,'メニューが変更されました。選び直してください。');}
    if (menu.duration !== input.duration || menu.name !== input.menuName) throw new BookingError(409,'メニューが変更されました。空き状況を更新して選び直してください。');
    const mutex = root.collection('availability_booking_days').doc(input.date);
    await tx.get(mutex);
    const phoneLimit = root.collection('availability_booking_limits').doc(digest(`${link.storeId}:${input.phone}`));
    const [limit, shifts, reservations, staff, stores] = await Promise.all([
      tx.get(phoneLimit),
      tx.get(database.collection('shifts').where('companyId','==',link.companyId).where('date','==',input.date).limit(2001)),
      tx.get(database.collection('reservations').where('companyId','==',link.companyId).where('date','==',input.date).limit(2001)),
      tx.get(database.collection('staff_profiles').where('companyId','==',link.companyId).limit(501)),
      tx.get(database.collection('sales_master').where('companyId','==',link.companyId).where('itemType','==','store'))
    ]);
    const limitData = limit.data();
    const recent = limitData?.windowStart > now - 1800000;
    if (recent && limitData!.count >= 3) throw new BookingError(429,'短時間に複数の予約が送信されました。店舗へお問い合わせください。');
    if (shifts.size > 2000 || reservations.size > 2000 || staff.size > 500) throw new BookingError(503,'予約を確認できません。店舗へお問い合わせください。');
    const workers = staff.docs.map(d => ({...d.data(),id:d.id} as Worker)).sort((a,b) => a.id.localeCompare(b.id));
    const shiftData = shifts.docs.map(d => d.data() as WorkShift), busy = reservations.docs.map(d => d.data() as Busy);
    const aliases = [link.storeId,String(s.name)], otherStores = stores.docs.filter(d => d.id !== link.storeId).flatMap(d => [d.id,String(d.data().name)]);
    const selected = {...settings,duration:menu.duration};
    const assigned = workers.find(w => calculateAvailability(selected,[input.date],aliases,workers,shiftData,busy,Date.now(),otherStores,w.id)[0].times.includes(input.time));
    if (!assigned) throw new BookingError(409,'この枠は受付できなくなりました。空き状況を更新して選び直してください。');
    const reference = digest(`${link.companyId}:${linkId}:${input.requestId}`).slice(0,24).toUpperCase();
    const receipt: BookingReceipt = {reference,storeName:String(s.name),date:input.date,time:input.time,endTime:timeLabel(minutes(input.time)+menu.duration),menuName:menu.name};
    const reservation = database.collection('reservations').doc();
    tx.create(reservation, {
      companyId:link.companyId,store_name:String(s.name),staff_id:assigned.id,staff_name:assigned.name,
      type:'reservation',customer_name:input.name,customer_phone:input.phone,date:input.date,
      start_time:input.time,end_time:receipt.endTime,menu_name:menu.name,status:'booked',portal:'Direct',
      source:'public_booking',is_confirmed:true,is_nominated:false,memo:`ネット予約 受付番号: ${reference}`,
      public_booking_reference:reference,created_at:FieldValue.serverTimestamp(),updated_at:FieldValue.serverTimestamp()
    });
    tx.set(mutex,{updatedAt:FieldValue.serverTimestamp()});
    tx.set(phoneLimit,{windowStart:recent ? limitData!.windowStart : now,count:recent ? limitData!.count+1 : 1});
    tx.create(requestRef,{fingerprint,receipt,reservationId:reservation.id,createdAt:FieldValue.serverTimestamp()});
    tx.create(root.collection('availability_audit').doc(),{event:'PUBLIC_BOOKING_CREATED',storeId:link.storeId,reservationId:reservation.id,timestamp:new Date().toISOString()});
    return receipt;
  });
}
