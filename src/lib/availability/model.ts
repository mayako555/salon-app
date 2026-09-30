import type { UserContext } from '../authorization';
export type PublicMenu = { id: string; name: string; duration: number };
export type AvailabilitySettings = { bookingEnabled?: boolean; menus?: PublicMenu[]; enabled: boolean; duration: number; open: string; close: string; capacity: number; leadMinutes: number };
export const DEFAULT_AVAILABILITY: AvailabilitySettings = { enabled: false, duration: 60, open: '09:00', close: '18:00', capacity: 1, leadMinutes: 60 };
export type AvailabilityDay = { date: string; times: string[] };
export type PublicAvailability = { storeName: string; duration: number; updatedAt: string; days: AvailabilityDay[]; eligibleDays: AvailabilityDay[]; timeRows: string[]; menus: PublicMenu[]; menuId: string; bookingEnabled: boolean };
export function minutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== '24:00') throw new Error('時刻を確認してください。');
  const [h, m] = value.split(':').map(Number); return h * 60 + m;
}
export function validateSettings(value: AvailabilitySettings): AvailabilitySettings {
  if (typeof value.enabled !== 'boolean' || ![30,60,90,120,150,180].includes(value.duration) || !Number.isInteger(value.capacity) || value.capacity < 1 || value.capacity > 20 || ![0,30,60,120,180,1440].includes(value.leadMinutes) || minutes(value.open) >= minutes(value.close)) throw new Error('公開設定を確認してください。');
  const menus = validateMenus(value.menus);
  if (value.bookingEnabled !== undefined && typeof value.bookingEnabled !== "boolean") throw new Error("予約受付設定を確認してください。");
  return { bookingEnabled: value.bookingEnabled === true, menus, enabled: value.enabled, duration: value.duration, open: value.open, close: value.close, capacity: value.capacity, leadMinutes: value.leadMinutes };
}
export function availabilityTenant(ctx: UserContext) {
  if (!ctx.uid || !ctx.companyId || ctx.isImpersonating || !['companyOwner','admin'].includes(ctx.role)) throw new Error('店舗オーナーまたは管理者でログインしてください。');
  return ctx.companyId;
}
export function publicDates(now: number, offset = 0) {
  if (![0,7].includes(offset)) throw new Error('日付を確認してください。');
  const today = new Date(now + 9 * 3600000).toISOString().slice(0,10);
  return Array.from({ length: 7 }, (_,i) => new Date(Date.parse(today + 'T00:00:00+09:00') + (offset + i) * 86400000 + 9 * 3600000).toISOString().slice(0,10));
}
export type WorkShift = { date: string; staff_id: string; type: string; segments?: {store: string; start_time: string; end_time: string}[] };
export type Busy = { date: string; staff_id?: string; staff_name?: string; store_name: string; start_time: string; end_time: string; status: string };
export type Worker = { id: string; name: string; is_active?: boolean; employment_status?: string };
const overlap = (a:number,b:number,c:number,d:number) => a < d && c < b;
/** Fail closed on malformed busy periods. Never return reservation or staff data. */
export function calculateAvailability(settings: AvailabilitySettings, dates: string[], aliases: string[], workers: Worker[], shifts: WorkShift[], reservations: Busy[], now: number, otherStores: string[] = [], candidateId?: string): AvailabilityDay[] {
  validateSettings(settings);
  const active = workers.filter(w => w.is_active !== false && !['retired','leave'].includes(w.employment_status || ''));
  const busy = reservations.filter(r => r.status !== 'cancelled').map(r => {
    const start = minutes(r.start_time), end = minutes(r.end_time);
    if (start >= end) throw new Error('予約時刻を確認してください。');
    return { ...r, start, end };
  });
  return dates.map(date => {
    const times: string[] = [];
    for (let start = minutes(settings.open); start + settings.duration <= minutes(settings.close); start += 30) {
      const end = start + settings.duration;
      const time = `${Math.floor(start/60)}`.padStart(2,'0') + ':' + `${start%60}`.padStart(2,'0');
      if (Date.parse(`${date}T${time}:00+09:00`) < now + settings.leadMinutes * 60000) continue;
      const conflicts = busy.filter(r => r.date === date && overlap(start,end,r.start,r.end));
      // Unknown store labels remain blocking; only verified other stores are excluded from capacity.
      const localConflicts = conflicts.filter(r => aliases.includes(r.store_name) || !otherStores.includes(r.store_name));
      if (localConflicts.length >= settings.capacity) continue;
      const free = active.filter(w => !candidateId || w.id === candidateId).some(w => {
        const daily = shifts.filter(s => s.date === date && s.staff_id === w.id);
        if (daily.length !== 1 || daily[0].type !== 'work') return false;
        const working = daily[0].segments?.some(seg => aliases.includes(seg.store) && minutes(seg.start_time) <= start && minutes(seg.end_time) >= end);
        if (!working) return false;
        return !conflicts.some(r => {
          const names = active.filter(other => other.name && other.name === r.staff_name);
          const assigned = active.find(other => other.id === r.staff_id) || (names.length === 1 ? names[0] : undefined);
          return !assigned || assigned.id === w.id;
        });
      });
      if (free) times.push(time);
    }
    return { date, times };
  });
}

export function validateMenus(value: unknown): PublicMenu[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 12) throw new Error('メニューは12件以内で登録してください。');
  const menus = value.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 80 || ![30,60,90,120,150,180].includes(item.duration)) throw new Error('メニュー名と所要時間を確認してください。');
    return {id:item.id, name:item.name.trim(), duration:item.duration};
  });
  if (new Set(menus.map(m => m.id)).size !== menus.length) throw new Error('メニューが重複しています。');
  return menus;
}
export function publicMenus(settings: AvailabilitySettings): PublicMenu[] {
  return settings.menus?.length ? settings.menus : [{id:'default',name:`施術（${settings.duration}分）`,duration:settings.duration}];
}
export function selectMenu(settings: AvailabilitySettings, id?: string): PublicMenu {
  const menus = publicMenus(settings); const menu = id ? menus.find(m => m.id === id) : menus[0];
  if (!menu) throw new Error('メニューを選び直してください。');
  return menu;
}
export function timeLabel(time: number) {return `${Math.floor(time/60)}`.padStart(2,'0') + ':' + `${time%60}`.padStart(2,'0');}
export function timeRows(settings: AvailabilitySettings) {
  const rows: string[] = []; for(let t = minutes(settings.open); t < minutes(settings.close); t += 30) rows.push(timeLabel(t)); return rows;
}
export type BookingInput = { requestId: string; menuId: string; duration: number; menuName: string; date: string; time: string; name: string; phone: string; consent: boolean; website?: string };
export function validateBooking(input: unknown): BookingInput {
  if (!input || typeof input !== 'object') throw new Error('入力内容を確認してください。');
  const d = input as Record<string, unknown>;
  if (typeof d.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(d.requestId) || typeof d.menuId !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(d.menuId) || typeof d.date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(d.date) || typeof d.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time) || typeof d.name !== 'string' || !d.name.trim() || d.name.trim().length > 80 || /[\x00-\x1f\x7f]/.test(d.name) || typeof d.phone !== 'string' || d.phone.length > 30 || d.consent !== true || d.website) throw new Error('氏名・電話番号・確認事項を入力してください。');
  if (!Number.isInteger(d.duration) || ![30,60,90,120,150,180].includes(d.duration as number) || typeof d.menuName !== 'string' || d.menuName.length > 80) throw new Error('メニューを選び直してください。');
  const phone = d.phone.normalize('NFKC').replace(/[\s()-]/g,'');
  if (!/^0[0-9]{9,10}$/.test(phone)) throw new Error('電話番号を確認してください。');
  return {requestId:d.requestId,menuId:d.menuId,duration:d.duration as number,menuName:d.menuName,date:d.date,time:d.time,name:d.name.trim(),phone,consent:true};
}
