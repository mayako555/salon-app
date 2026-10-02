export type CustomerNameParts={last_name:string;first_name:string;last_name_kana:string;first_name_kana:string};
export const emptyCustomerName:CustomerNameParts={last_name:'',first_name:'',last_name_kana:'',first_name_kana:''};
export function joinedCustomerName(parts:CustomerNameParts) {
 return {name:[parts.last_name.trim(),parts.first_name.trim()].filter(Boolean).join(' '),name_kana:[parts.last_name_kana.trim(),parts.first_name_kana.trim()].filter(Boolean).join(' ')};
}
export function cleanCustomerNameParts(value:Record<string,unknown>):CustomerNameParts {
 const parts={...emptyCustomerName};
 for(const key of Object.keys(parts) as (keyof CustomerNameParts)[]) {
  if(typeof value[key]!=='string'||(value[key] as string).length>50)throw new Error('姓・名を確認してください');
  parts[key]=(value[key] as string).trim();
 }
 if(!parts.last_name||!parts.first_name)throw new Error('姓と名を入力してください');
 return parts;
}
