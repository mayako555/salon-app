export type MappingStaff = {id:string;name:string};
export type StaffAlias = {externalName:string;staffId:string};
export function normalizedExternalName(name:string) {return name.normalize('NFKC').replace(/[\s　]+/g,'').toLocaleLowerCase('en-US');}
export function resolveExternalStaff(name:string, staff:MappingStaff[], aliases:StaffAlias[], currentId?:string) {
  if(currentId && staff.some(s=>s.id===currentId)) return staff.find(s=>s.id===currentId)!;
  const key=normalizedExternalName(name);
  if(!key || ['フリー','指名なし','未設定','unknown'].includes(key)) return null;
  const alias=aliases.find(a=>normalizedExternalName(a.externalName)===key);
  if(alias) return staff.find(s=>s.id===alias.staffId) || null;
  const exact=staff.filter(s=>normalizedExternalName(s.name)===key);
  return exact.length===1 ? exact[0] : null;
}
export function externalStaffName(row:Record<string,unknown>) {
  return String(row.external_staff_name || row.staff_name || '');
}
export function isHotPepperRecord(row:Record<string,unknown>) {return row.source==='hotpepper' || row.source==='csv_estimated' || row.portal==='HPB';}
