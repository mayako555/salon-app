import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { createPublicBooking, BookingError } from '../availability/booking-core';
import { DEFAULT_AVAILABILITY, publicDates } from '../availability/model';

// In-memory transactional repository: verifies orchestration and scope without production data.
// Transactions are serialized, so this does not substitute for an emulator's lock-contention test.
type Row = Record<string, unknown>;
class Ref {
  constructor(public path:string, private repo: Repository) {}
  get id() {return this.path.split('/').at(-1)!;}
  collection(name:string) {return new Query(`${this.path}/${name}`,this.repo);}
}
class Query {
  constructor(public path:string,private repo:Repository,public filters: [string,unknown][] = [],public max = Infinity) {}
  doc(id = randomUUID()) {return new Ref(`${this.path}/${id}`,this.repo);}
  where(field:string,op:string,value:unknown) {assert.equal(op,'==');return new Query(this.path,this.repo,[...this.filters,[field,value]],this.max);}
  limit(max:number) {return new Query(this.path,this.repo,this.filters,max);}
}
class Repository {
  data = new Map<string,Row>(); tail:Promise<unknown> = Promise.resolve();
  collection(name:string) {return new Query(name,this);}
  snapshot(ref:Ref) {const d=this.data.get(ref.path);return {id:ref.id,exists:!!d,data:()=>d};}
  async runTransaction<T>(fn:(tx:unknown)=>Promise<T>): Promise<T> {
    const next=this.tail.then(async()=>{
      const pending: [Ref,Row][]=[];
      const tx={get:async(ref:Ref|Query)=>{
        if(ref instanceof Ref) return this.snapshot(ref);
        if(['reservations','shifts','staff_profiles','sales_master'].includes(ref.path)) assert.ok(ref.filters.some(([key,value])=>key==='companyId' && value==='tenant-a'),'every operational query is tenant scoped');
        const docs=[...this.data].filter(([path,d])=>path.startsWith(ref.path+'/') && path.split('/').length===ref.path.split('/').length+1 && ref.filters.every(([key,value])=>d[key]===value)).slice(0,ref.max).map(([path])=>this.snapshot(new Ref(path,this)));
        return {docs,size:docs.length};
      },create:(ref:Ref,data:Row)=>{assert.ok(!this.data.has(ref.path));pending.push([ref,data]);},set:(ref:Ref,data:Row)=>pending.push([ref,data])};
      const result=await fn(tx);
      pending.forEach(([ref,d])=>this.data.set(ref.path,d));return result;
    });
    this.tail=next.catch(()=>undefined);return next;
  }
}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function setup() {
 const repo=new Repository(), token='a'.repeat(43), date=publicDates(Date.now(),7)[0];
 repo.data.set(`public_availability_links/${hash(token)}`,{companyId:'tenant-a',storeId:'store-a',enabled:true});
 repo.data.set('companies/tenant-a',{status:'active',features:{reservations:true}});
 repo.data.set('sales_master/store-a',{companyId:'tenant-a',itemType:'store',name:'店舗A',isActive:true});
 repo.data.set('companies/tenant-a/availability_settings/store-a',{...DEFAULT_AVAILABILITY,enabled:true,bookingEnabled:true,companyId:'tenant-a',token});
 repo.data.set('staff_profiles/staff-a',{companyId:'tenant-a',name:'担当',is_active:true});
 repo.data.set('shifts/shift-a',{companyId:'tenant-a',date,staff_id:'staff-a',type:'work',segments:[{store:'store-a',start_time:'09:00',end_time:'18:00'}]});
 const input={requestId:randomUUID(),menuId:'default',menuName:'施術（60分）',duration:60,date,time:'10:00',name:'テスト利用者',phone:'09012345678',consent:true};
 return {repo,token,input,db:repo as unknown as Firestore};
}
test('booking creates one scoped reservation, safe receipt, and retries idempotently',async()=>{
 const {repo,token,input,db}=setup();
 const a=await createPublicBooking(token,input,db), b=await createPublicBooking(token,input,db);
 assert.deepEqual(a,b);
 const records=[...repo.data].filter(([path])=>path.startsWith('reservations/'));
 assert.equal(records.length,1);assert.equal(records[0][1].companyId,'tenant-a');
 assert.equal(records[0][1].staff_id,'staff-a');assert.equal(records[0][1].source,'public_booking');
 assert.ok(!JSON.stringify(a).includes(input.phone));assert.ok(!JSON.stringify(a).includes(input.name));
 await assert.rejects(()=>createPublicBooking(token,{...input,name:'別人'},db),(e:unknown)=>e instanceof BookingError && e.status===409);
});
test('two different requests for the same capacity do not both confirm',async()=>{
 const {repo,token,input,db}=setup();
 const outcomes=await Promise.allSettled([createPublicBooking(token,input,db),createPublicBooking(token,{...input,requestId:randomUUID(),phone:'09087654321'},db)]);
 assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
 assert.equal([...repo.data.keys()].filter(p=>p.startsWith('reservations/')).length,1);
});
test('disabled booking, foreign store, stale menu and existing busy periods reject writes',async()=>{
 for(const scenario of ['disabled','foreign-store','stale-menu','busy']) {
  const {repo,token,input,db}=setup();
  if(scenario==='disabled') repo.data.get('companies/tenant-a/availability_settings/store-a')!.bookingEnabled=false;
  if(scenario==='foreign-store') repo.data.get('sales_master/store-a')!.companyId='tenant-b';
  if(scenario==='stale-menu') input.duration=90;
  if(scenario==='busy') repo.data.set('reservations/existing',{companyId:'tenant-a',date:input.date,start_time:'09:30',end_time:'10:30',staff_id:'staff-a',store_name:'店舗A',status:'booked'});
  const count=repo.data.size;
  await assert.rejects(()=>createPublicBooking(token,input,db));assert.equal(repo.data.size,count);
 }
});
test('foreign tenant reservations never alter this tenant booking',async()=>{
 const {repo,token,input,db}=setup();
 repo.data.set('reservations/foreign',{companyId:'tenant-b',date:input.date,start_time:'09:00',end_time:'18:00',staff_id:'staff-a',store_name:'店舗A',status:'booked'});
 assert.ok((await createPublicBooking(token,input,db)).reference);
});
test('repeat contact is throttled while idempotent retry still succeeds',async()=>{
 const {token,input,db}=setup();
 let last;
 for(const time of ['09:00','10:00','11:00']) {last={...input,time,requestId:randomUUID()};await createPublicBooking(token,last,db);}
 await assert.rejects(()=>createPublicBooking(token,{...input,time:'12:00',requestId:randomUUID()},db),(e:unknown)=>e instanceof BookingError && e.status===429);
 assert.ok((await createPublicBooking(token,last,db)).reference);
});
