'use client';
import {useId} from 'react';
import {Input} from '@/components/ui/input';
import type {CustomerNameParts} from '@/lib/customer-name';
export default function CustomerNameFields({value,onChange,requireKana=false}:{value:CustomerNameParts;onChange:(value:CustomerNameParts)=>void;requireKana?:boolean}) {
 const id=useId();
 return <fieldset className="space-y-3"><legend className="font-bold text-sm mb-2">お名前</legend><div className="grid grid-cols-2 gap-3">{([
 ['last_name','姓（漢字）','山田','family-name'],['first_name','名（漢字）','花子','given-name'],['last_name_kana','セイ（フリガナ）','ヤマダ','off'],['first_name_kana','メイ（フリガナ）','ハナコ','off']
 ] as const).map(([key,label,placeholder,autoComplete])=><div key={key}><label htmlFor={`${id}-${key}`} className="text-sm font-bold block mb-2">{label}{(!key.endsWith('_kana')||requireKana)&&<span className="text-rose-500"> *</span>}</label><Input id={`${id}-${key}`} name={key} value={value[key]} placeholder={placeholder} maxLength={50} required={!key.endsWith('_kana')||requireKana} autoComplete={autoComplete} onChange={e=>onChange({...value,[key]:e.target.value})}/></div>)}</div></fieldset>;
}
