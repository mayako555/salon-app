'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getMappings,saveStaffAlias,applyStaffAlias} from './actions';
export default function Page() {
 const [data,setData]=useState<Awaited<ReturnType<typeof getMappings>>|null>(null),[error,setError]=useState(''),[name,setName]=useState(''),[staff,setStaff]=useState(''),[busy,setBusy]=useState(false);
 const [cursors,setCursors]=useState<Record<string,Partial<Record<'sales'|'reservations',string|null>>>>({});
 const load=()=>getMappings().then(setData).catch(()=>setError('設定を取得できません。管理者でログインしてください。'));
 useEffect(()=>{void load();},[]);
 async function save() {setBusy(true);setError('');try {await saveStaffAlias(name,staff);await load();setName('');setStaff('');}catch {setError('保存できませんでした。入力内容と権限を確認してください。');}finally {setBusy(false);}}
 return <main className="max-w-3xl mx-auto space-y-5"><Link href="/admin/settings">← 設定</Link><h1 className="text-2xl font-bold">外部スタッフ名の紐づけ</h1><p>HOT PEPPER Beautyの「RUMI」などの別名を、SALON AGENTのスタッフに登録します。次回の取込みから自動適用されます。</p>{error&&<p role="alert">{error}</p>}{!data ? <p>読み込み中…</p> : <>
 {data.limited&&<p>確認対象が多いため、一部のデータを表示しています。</p>}
 <section className="border rounded-xl p-5 bg-white space-y-3"><h2 className="font-bold">未紐づけ {data.unmatched.length}名</h2>{data.unmatched.map(n=><button key={n.name} disabled={busy} className="block text-blue-700" onClick={()=>setName(n.name)}>{n.name}（{n.count}件）を設定</button>)}
 <label className="block">外部サービスのスタッフ名<input className="block border rounded p-2 w-full" maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label><label className="block">SALON AGENTのスタッフ<select className="block border rounded p-2 w-full" value={staff} onChange={e=>setStaff(e.target.value)} disabled={busy}><option value="">選択してください</option>{data.staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button disabled={busy||!name.trim()||!staff} className="bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50" onClick={save}>紐づけを保存</button></section>
 <section className="space-y-3"><h2 className="font-bold">登録済み</h2><p className="text-sm">過去分への適用は確認後に行います。既に別スタッフIDが登録されたデータは上書きしません。1回につき売上・予約それぞれ200件を確認します。件数が多い場合は続けて適用できます。</p>{data.aliases.map(a=><article className="border rounded p-4" key={a.externalName}>{a.externalName} → {data.staff.find(s=>s.id===a.staffId)?.name || 'スタッフが見つかりません'}<button disabled={busy} className="block text-blue-700 mt-2" onClick={async()=>{if(!confirm(`「${a.externalName}」の未紐づけの過去データへ適用しますか？`))return;setBusy(true);try{const r=await applyStaffAlias(a.externalName,cursors[a.externalName]);setCursors(v=>({...v,[a.externalName]:r.hasMore?r.cursors:{}}));setError(`${r.updated}件に適用しました。${r.hasMore?'まだ確認するデータがあります。続けて適用してください。':'過去データの確認が完了しました。'}`);await load();}catch{setError('処理できませんでした。再度確認してください。');}finally{setBusy(false);}}}>過去の未紐づけデータへ適用</button></article>)}</section></>}
 </main>;
}
