'use client';
import { useEffect, useState } from 'react';
import { INDUSTRIES, FORM_TEMPLATES, enabledTemplateIds, type IndustryForms } from '@/lib/industry-forms';
import { getStoreIndustryFormSettings, saveIndustryFormSettings } from '@/lib/industry-form-actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
export function IndustryFormFields({ value, onChange, section = 'all' }: { value: IndustryForms; onChange: (value: IndustryForms) => void; section?: 'all' | 'industries' | 'templates' }) {
  const industries = value.industries || [value.industry];
  return <div className="space-y-5">
    {section !== 'templates' && <fieldset><legend className="font-bold mb-2">業種（複数選択可）</legend><div className="flex flex-wrap gap-3">{INDUSTRIES.map(i => <label key={i.id} className="border rounded-xl p-3 flex gap-2"><input type="checkbox" checked={industries.includes(i.id)} onChange={e => {
      const next = e.target.checked ? [...industries,i.id] : industries.filter(id=>id!==i.id);
      if (!next.length) return;
      onChange({...value,industry:next[0],industries:next});
    }}/>{i.name}</label>)}</div></fieldset>}
    {section !== 'industries' && (['karte','counseling'] as const).map(kind => {
      const ids=enabledTemplateIds(value,kind);
      const key=kind==='karte'?'karteTemplateIds':'counselingTemplateIds';
      const primary=kind==='karte'?'karteTemplateId':'counselingTemplateId';
      return <fieldset key={kind}><legend className="font-bold mb-2">{kind==='karte'?'使用する施術カルテ':'お客様入力用カウンセリングシート'}（複数選択可）</legend><div className="grid sm:grid-cols-2 gap-2">{FORM_TEMPLATES.filter(t=>t.kind===kind).map(t=><label key={t.id} className="border rounded-xl p-3 flex gap-2 items-start"><input type="checkbox" className="mt-1" checked={ids.includes(t.id)} onChange={e=>{
        const next=e.target.checked?[...ids,t.id]:ids.filter(id=>id!==t.id); if(!next.length)return;
        onChange({...value,[key]:next,[primary]:next[0]});
      }}/><span>{t.name}<small className="block text-slate-500">{industries.includes(t.industry)?'選択した業種のシート':''}</small></span></label>)}</div></fieldset>;
    })}
    <p className="text-sm text-slate-500">各項目を1つ以上選択してください。業種を変えてもシート選択は消えません。保存済みのカルテ・回答はそのまま残ります。</p>
  </div>;
}
export default function IndustryFormSettings() {
  const [stores,setStores]=useState<Awaited<ReturnType<typeof getStoreIndustryFormSettings>>>([]);
  const [storeId,setStoreId]=useState('');
  const [value,setValue]=useState<IndustryForms|null>(null);
  const [error,setError]=useState(false); const [saving,setSaving]=useState(false); const [loaded,setLoaded]=useState(false);
  const [attempt,setAttempt]=useState(0); const [step,setStep]=useState(0);
  useEffect(()=>{let live=true;setError(false);setLoaded(false); const timer=setTimeout(()=>{if(live){setError(true);setLoaded(true);live=false;}},20000);
    getStoreIndustryFormSettings().then(rows=>{if(live){setStores(rows);setStoreId(rows[0]?.id||'');setValue(rows[0]?.settings||null);setLoaded(true);}}).catch(()=>{if(live){setError(true);setLoaded(true);}}).finally(()=>clearTimeout(timer));
    return()=>{live=false;clearTimeout(timer);};},[attempt]);
  const selected=stores.find(s=>s.id===storeId);
  return <section className="rounded-3xl bg-white border p-6 space-y-5"><h2 className="text-xl font-bold">店舗の初期設定：業種・カルテ・カウンセリング</h2>
    {error?<p role="alert">設定を読み込めませんでした。<Button variant="outline" onClick={()=>setAttempt(a=>a+1)}>再読み込み</Button></p>:!loaded?<p role="status">店舗設定を読み込み中…</p>:!stores.length?<p>先に店舗運用マスタで店舗を登録してください。</p>:value&&<>
      <label className="block font-bold">設定する店舗<select disabled={saving} className="block border rounded-xl p-3 w-full mt-2" value={storeId} onChange={e=>{setStoreId(e.target.value);setValue(stores.find(s=>s.id===e.target.value)!.settings);setStep(0);}}>{stores.map(s=><option key={s.id} value={s.id}>{s.name} — {s.inherited?'初期設定を確認':'設定済み'}</option>)}</select></label>
      <p className="text-sm">{selected?.inherited?'既存の会社設定を引き継いでいます。この店舗の内容を確認して保存してください。':'この店舗だけの設定です。いつでも変更できます。'}</p>
      <ol className="flex gap-3 text-sm" aria-label="初期設定の手順">{['業種を選ぶ','シートを選ぶ','確認して保存'].map((label,i)=><li key={label} className={step===i?'font-bold text-blue-700':'text-slate-500'} aria-current={step===i?'step':undefined}>{i+1}. {label}</li>)}</ol>
      {step<2?<IndustryFormFields value={value} onChange={setValue} section={step===0?'industries':'templates'}/>:<div className="space-y-2"><p>店舗：{selected?.name}</p><p>業種：{(value.industries||[value.industry]).map(id=>INDUSTRIES.find(i=>i.id===id)?.name).join('・')}</p>{(['karte','counseling'] as const).map(kind=><p key={kind}>{kind==='karte'?'カルテ':'カウンセリング'}：{enabledTemplateIds(value,kind).map(id=>FORM_TEMPLATES.find(t=>t.id===id)?.name).join('、')}</p>)}</div>}
      <div className="flex gap-3">{step>0&&<Button variant="outline" disabled={saving} onClick={()=>setStep(s=>s-1)}>戻る</Button>}{step<2?<Button onClick={()=>setStep(s=>s+1)}>次へ</Button>:<Button disabled={saving} onClick={async()=>{setSaving(true);try{const result=await saveIndustryFormSettings(value,storeId);if(!result.success)throw new Error(result.error);setStores(rows=>rows.map(s=>s.id===storeId?{...s,settings:value,inherited:false}:s));toast.success(`${selected?.name}の初期設定を保存しました`);}catch(e){toast.error(e instanceof Error?e.message:'保存できませんでした');}finally{setSaving(false);}}}>{saving?'保存中…':'この店舗の設定を保存'}</Button>}</div>
    </>}
  </section>;
}
