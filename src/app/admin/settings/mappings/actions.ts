'use server';
import { FieldPath,FieldValue,type Firestore } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { aliasKey,loadStaffAliases,mappingScope } from '@/lib/external-mapping/service';
import { externalStaffName,isHotPepperRecord,normalizedExternalName,resolveExternalStaff } from '@/lib/external-mapping/model';
const db=adminDb as Firestore;
export async function getMappings() {
 const s=await mappingScope();
 const [staff,aliases,sales,reservations]=await Promise.all([db.collection('staff_profiles').where('companyId','==',s.companyId).get(),loadStaffAliases(s.companyId),db.collection('sales').where('companyId','==',s.companyId).limit(5001).get(),db.collection('reservations').where('companyId','==',s.companyId).limit(5001).get()]);
 const staffList=staff.docs.map(d=>({id:d.id,name:String(d.data().name)}));
 const unknown=new Map<string,{name:string;count:number}>();
 for(const document of [...sales.docs,...reservations.docs]) {
  const row=document.data(),name=externalStaffName(row);
  if(!isHotPepperRecord(row) || !name || ['フリー','指名なし','unknown'].includes(name) || resolveExternalStaff(name,staffList,aliases,row.staff_id)) continue;
  const key=normalizedExternalName(name);const item=unknown.get(key) || {name,count:0};item.count++;unknown.set(key,item);
 }
 return {staff:staffList,aliases,unmatched:[...unknown.values()],limited:sales.size>5000 || reservations.size>5000};
}
export async function saveStaffAlias(externalName:string,staffId:string) {
 const s=await mappingScope();
 if(typeof externalName!=='string' || !externalName.trim() || externalName.length>100 || !staffId || staffId.includes('/')) throw new Error('スタッフを選んでください。');
 const key=aliasKey(externalName);
 await db.runTransaction(async tx=>{
  const ref=db.collection('staff_profiles').doc(staffId); const staff=await tx.get(ref);
  if(!staff.exists || staff.data()?.companyId!==s.companyId) throw new Error('スタッフを選んでください。');
  tx.set(s.root.collection('staff_aliases').doc(key),{provider:'hotpepper',externalName:externalName.trim(),staffId,updatedBy:s.ctx.uid,updatedAt:FieldValue.serverTimestamp()});
  tx.set(db.collection('tasks').doc(`staff_mapping_${aliasKey(s.companyId)}_${key}`),{companyId:s.companyId,status:'completed',updated_at:FieldValue.serverTimestamp()},{merge:true});
  tx.create(s.root.collection('mapping_audit').doc(),{event:'STAFF_ALIAS_SAVED',externalName,staffId,userId:s.ctx.uid,createdAt:FieldValue.serverTimestamp()});
 });
 return {success:true};
}
export async function applyStaffAlias(externalName:string, cursors:Partial<Record<'sales'|'reservations',string|null>>={}) {
 const s=await mappingScope();
 if(typeof externalName!=='string' || !externalName.trim() || externalName.length>100) throw new Error('外部名を確認してください。');
 for(const value of Object.values(cursors)) if(value!==null && (typeof value!=='string' || !value || value.includes('/') || value.length>1500)) throw new Error('続行位置を確認してください。');
 const key=aliasKey(externalName);let updated=0;
 const next:typeof cursors={};
 // Page by document ID, not mutable staff names. Normalization covers case and spaces.
 for(const collection of ['sales','reservations'] as const) {
  if(cursors[collection]===null) {next[collection]=null;continue;}
  let query=db.collection(collection).where('companyId','==',s.companyId).orderBy(FieldPath.documentId()).limit(201);
  if(cursors[collection]) query=query.startAfter(cursors[collection]);
  const records=await query.get();
  const page=records.docs.slice(0,200);
  for(const document of page) {
   const preview=document.data();
   if(!isHotPepperRecord(preview) || normalizedExternalName(externalStaffName(preview))!==normalizedExternalName(externalName)) continue;
   updated+=await db.runTransaction(async tx=>{
    const [record,alias]=await Promise.all([tx.get(document.ref),tx.get(s.root.collection('staff_aliases').doc(key))]);
    const row=record.data(),a=alias.data();
    if(!row || row.companyId!==s.companyId || !a || !isHotPepperRecord(row) || normalizedExternalName(externalStaffName(row))!==normalizedExternalName(externalName)) return 0;
    const target=await tx.get(db.collection('staff_profiles').doc(a.staffId));
    if(!target.exists || target.data()?.companyId!==s.companyId) throw new Error('紐づけ先を確認してください。');
    if(row.staff_id && row.staff_id!=='unknown') return 0;
    tx.update(document.ref,{external_staff_name:externalStaffName(row),staff_id:a.staffId,staff_name:String(target.data()!.name),updated_at:FieldValue.serverTimestamp()});
    tx.create(s.root.collection('mapping_audit').doc(),{event:'STAFF_ALIAS_APPLIED',collection,recordId:record.id,staffId:a.staffId,userId:s.ctx.uid,createdAt:FieldValue.serverTimestamp()});
    return 1;
   });
  }
  next[collection]=records.size>200?page.at(-1)!.id:null;
 }
 return {updated,cursors:next,hasMore:Object.values(next).some(Boolean)};
}
