import 'server-only';
import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin';
import { getCurrentUserContext } from '../auth-server';
import { normalizedExternalName,resolveExternalStaff,type StaffAlias,type MappingStaff } from './model';
const db=adminDb as Firestore;
export const aliasKey=(name:string)=>createHash('sha256').update(normalizedExternalName(name)).digest('hex');
export async function mappingScope() {
 const ctx=await getCurrentUserContext();
 if(!ctx.companyId || !ctx.uid || ctx.isImpersonating || !['companyOwner','admin'].includes(ctx.role)) throw new Error('店舗オーナーまたは管理者で操作してください。');
 return {ctx,companyId:ctx.companyId,root:db.collection('companies').doc(ctx.companyId)};
}
export async function loadStaffAliases(companyId:string):Promise<StaffAlias[]> {
 const snap=await db.collection('companies').doc(companyId).collection('staff_aliases').get();
 return snap.docs.map(d=>({externalName:String(d.data().externalName),staffId:String(d.data().staffId)}));
}
export async function reportUnmatchedStaff(companyId:string,names:string[]) {
 for(const name of [...new Set(names)].filter(n=>n && !['フリー','指名なし','unknown'].includes(n)).slice(0,200)) {
  const key=aliasKey(name); const ref=db.collection('tasks').doc(`staff_mapping_${aliasKey(companyId)}_${key}`);
  await db.runTransaction(async tx=>{
   const [alias,task]=await Promise.all([tx.get(db.collection('companies').doc(companyId).collection('staff_aliases').doc(key)),tx.get(ref)]);
   if(alias.exists) return;
   if(task.exists && task.data()?.status==='pending') return;
   tx.set(ref,{companyId,type:'staff_mapping',status:'pending',staff_id:'',staff_name:'',customer_id:'',customer_name:'',content:`HOT PEPPER Beautyの「${name}」をスタッフと紐づけてください。`,externalName:name,actionUrl:'/admin/settings/mappings',created_at:FieldValue.serverTimestamp()});
  });
 }
}
export async function mapStaffRecord<T extends {staff_id?:string;staff_name?:string}>(row:T,staff:MappingStaff[],aliases:StaffAlias[]):Promise<T> {
 const match=resolveExternalStaff(row.staff_name || '',staff,aliases,row.staff_id);
 return match ? {...row,staff_id:match.id,staff_name:match.name} : row;
}
