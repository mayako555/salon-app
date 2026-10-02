'use client';
import {useId,useState} from 'react';

/** Keeps the existing YYYY-MM-DD storage format. Partial selections remain local. */
export default function BirthdaySelect({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 const id=useId();
 const [parts,setParts]=useState(()=>{const [year='',month='',day='']=value.split('-');return {year,month,day};});
 const today=new Date();
 const currentYear=today.getFullYear();
 const years=Array.from({length:currentYear-1900+1},(_,i)=>currentYear-i);
 const monthLimit=Number(parts.year)===currentYear?today.getMonth()+1:12;
 const daysInMonth=parts.month?new Date(Number(parts.year)||2000,Number(parts.month),0).getDate():31;
 const dayLimit=Number(parts.year)===currentYear&&Number(parts.month)===today.getMonth()+1?Math.min(daysInMonth,today.getDate()):daysInMonth;
 function change(key:'year'|'month'|'day',value:string) {
  const next={...parts,[key]:value};
  if(Number(next.year)===currentYear&&Number(next.month)>today.getMonth()+1){next.month='';next.day='';}
  const max=next.month?new Date(Number(next.year)||2000,Number(next.month),0).getDate():31;
  if(Number(next.day)>max || (Number(next.year)===currentYear&&Number(next.month)===today.getMonth()+1&&Number(next.day)>today.getDate()))next.day='';
  setParts(next);
  onChange(next.year&&next.month&&next.day?`${next.year}-${next.month}-${next.day}`:'');
 }
 const options={year:years.map(String),month:Array.from({length:monthLimit},(_,i)=>String(i+1).padStart(2,'0')),day:Array.from({length:dayLimit},(_,i)=>String(i+1).padStart(2,'0'))};
 return <fieldset><legend className="text-xs font-bold text-slate-400 mb-1.5 ml-1">生年月日</legend><div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">{([['year','年'],['month','月'],['day','日']] as const).map(([key,label])=><div key={key}><label htmlFor={`${id}-${key}`} className="sr-only">生年月日の{label}</label><select id={`${id}-${key}`} value={parts[key]} onChange={e=>change(key,e.target.value)} className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-2"><option value="">{label}</option>{options[key].map(n=><option key={n} value={n}>{Number(n)}{label}</option>)}</select></div>)}</div></fieldset>;
}
