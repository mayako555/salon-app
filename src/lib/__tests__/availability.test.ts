import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAvailability, DEFAULT_AVAILABILITY, publicDates, availabilityTenant, validateSettings, type Busy, type WorkShift } from '../availability/model';
import { isPublicAuthPath } from '../auth-transition';
const date = '2026-10-01';
const now = Date.parse('2026-10-01T08:00:00+09:00');
const settings = { ...DEFAULT_AVAILABILITY, enabled:true, open:'09:00', close:'12:00', leadMinutes:0 };
const workers = [{id:'a',name:'A'}, {id:'b',name:'B'}];
const shift: WorkShift = {date,staff_id:'a',type:'work',segments:[{store:'store1',start_time:'09:00',end_time:'12:00'}]};
const reservation: Busy = {date,staff_id:'a',staff_name:'A',store_name:'store1',start_time:'10:00',end_time:'11:00',status:'booked'};
function slots(res: Busy[] = [], shifts = [shift], config = settings) {return calculateAvailability(config,[date],['store1'],workers,shifts,res,now)[0].times;}
test('slots require full duration within opening and confirmed work shift', () => {
 assert.deepEqual(slots(),['09:00','09:30','10:00','10:30','11:00']);
 assert.deepEqual(slots([],[]),[]);
 assert.deepEqual(slots([],[{...shift,type:'holiday'}]),[]);
 assert.deepEqual(slots([],[{...shift,segments:[{store:'other',start_time:'09:00',end_time:'12:00'}]}]),[]);
});
test('busy ranges exclude overlaps but allow adjacent bookings and cancelled reservations', () => {
 assert.deepEqual(slots([reservation]),['09:00','11:00']);
 assert.deepEqual(slots([{...reservation,status:'cancelled'}]),slots());
});
test('breaks, missing staff and duplicate shifts fail closed', () => {
 assert.deepEqual(slots([],[{...shift,segments:[{store:'store1',start_time:'09:00',end_time:'10:00'},{store:'store1',start_time:'11:00',end_time:'12:00'}]}]),['09:00','11:00']);
 assert.deepEqual(slots([],[shift,shift]),[]);
 assert.deepEqual(calculateAvailability(settings,[date],['store1'],[],[shift],[],now)[0].times,[]);
});
test('capacity and unknown assignments cannot yield false free slots', () => {
 const shifts = [shift,{...shift,staff_id:'b'}];
 assert.deepEqual(slots([reservation],shifts),['09:00','11:00']);
 assert.deepEqual(slots([reservation],shifts,{...settings,capacity:2}),slots());
 assert.deepEqual(slots([{...reservation,staff_id:'missing',staff_name:''}],shifts,{...settings,capacity:2}),['09:00','11:00']);
});
test('same worker booked in another store stays busy; another worker does not consume this store capacity', () => {
 const calculate = (r:Busy) => calculateAvailability(settings,[date],['store1'],workers,[shift],[r],now,['store2'])[0].times;
 assert.deepEqual(calculate({...reservation,store_name:'store2'}),['09:00','11:00']);
 assert.deepEqual(calculate({...reservation,staff_id:'b',staff_name:'B',store_name:'store2'}),slots());
});
test('malformed reservation time errors instead of reporting free time', () => {
 assert.throws(() => slots([{...reservation,end_time:'bad'}]));
 assert.throws(() => slots([{...reservation,end_time:'09:00'}]));
});
test('lead time uses Japan time and dates roll over at Japan midnight', () => {
 assert.deepEqual(slots([], [shift], {...settings,leadMinutes:180}),['11:00']);
 assert.equal(publicDates(Date.parse('2026-09-30T15:00:00Z'))[0],'2026-10-01');
 assert.equal(publicDates(now,7)[0],'2026-10-08');
 assert.throws(() => publicDates(now,14));
});
test('public result contains only dates and times, no private fields', () => {
 const output = calculateAvailability(settings,[date],['store1'],workers,[shift],[{...reservation,customer_name:'PRIVATE'} as Busy],now);
 assert.deepEqual(Object.keys(output[0]).sort(),['date','times']);
 assert.ok(!JSON.stringify(output).includes('PRIVATE'));
});
test('management requires tenant admin, with no impersonation', () => {
 const ctx = {uid:'u',companyId:'tenant',role:'companyOwner' as const,salonIds:[]};
 assert.equal(availabilityTenant(ctx),'tenant');
 assert.throws(() => availabilityTenant({...ctx,role:'staff'}));
 assert.throws(() => availabilityTenant({...ctx,isImpersonating:true}));
 assert.throws(() => availabilityTenant({...ctx,companyId:undefined}));
});
test('public auth bypass is confined to availability route', () => {
 assert.equal(isPublicAuthPath('/availability/abc'),true);
 assert.equal(isPublicAuthPath('/availability-admin'),false);
 assert.equal(isPublicAuthPath('/admin/settings/availability'),false);
});
test('invalid settings reject unlimited horizon/capacity or invalid hours', () => {
 assert.throws(() => validateSettings({...settings,capacity:0}));
 assert.throws(() => validateSettings({...settings,duration:0}));
 assert.throws(() => validateSettings({...settings,close:'08:00'}));
});

test('menu duration changes the available start times and displayed rows', async () => {
 const {publicMenus, selectMenu, timeRows} = await import('../availability/model');
 const menus = [{id:'short',name:'短時間',duration:30},{id:'long',name:'長時間',duration:120}];
 const configured = validateSettings({...settings,menus});
 assert.equal(publicMenus(configured).length,2);
 assert.deepEqual(slots([], [shift], {...settings,duration:selectMenu(configured,'long').duration}),['09:00','09:30','10:00']);
 assert.deepEqual(timeRows(settings),['09:00','09:30','10:00','10:30','11:00','11:30']);
 assert.throws(()=>selectMenu(configured,'foreign-menu'));
 assert.throws(()=>validateSettings({...settings,menus:[menus[0],menus[0]]}));
 assert.equal(validateSettings(settings).bookingEnabled,false);
});
test('booking assignment checks each worker without ignoring other staff reservations', () => {
 const shifts=[shift,{...shift,staff_id:'b'}];
 const config={...settings,capacity:2};
 assert.deepEqual(calculateAvailability(config,[date],['store1'],workers,shifts,[reservation],now,[],'a')[0].times,['09:00','11:00']);
 assert.deepEqual(calculateAvailability(config,[date],['store1'],workers,shifts,[reservation],now,[],'b')[0].times,slots());
});
test('booking rejects invalid contact, consent, honeypot and malformed IDs', async () => {
 const {validateBooking} = await import('../availability/model');
 const input={requestId:'11111111-1111-4111-8111-111111111111',menuId:'default',duration:60,menuName:'施術（60分）',date,time:'09:00',name:'利用者',phone:'０９０-１２３４-５６７８',consent:true};
 assert.equal(validateBooking(input).phone,'09012345678');
 for(const change of [{consent:false},{phone:'abc'},{name:''},{requestId:'../other'},{website:'bot'},{time:'24:00'},{duration:1}]) assert.throws(()=>validateBooking({...input,...change}));
});
