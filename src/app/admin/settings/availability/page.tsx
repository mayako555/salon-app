'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getSettings, saveSettings } from './actions';
import type { AvailabilitySettings } from '@/lib/availability/model';

type Store = Awaited<ReturnType<typeof getSettings>>[number];
function StoreCard({ store }: { store: Store }) {
  const [settings, setSettings] = useState(store.settings);
  const [token, setToken] = useState(store.token);
  const [published, setPublished] = useState(store.settings.enabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/availability/${token}` : '';
  function change<K extends keyof AvailabilitySettings>(key: K, value: AvailabilitySettings[K]) { setSettings(s => ({ ...s, [key]: value })); }
  async function save(rotate = false) {
    if (rotate && !window.confirm('現在のリンクは使えなくなります。リンクを再発行しますか？')) return;
    setBusy(true); setMessage('');
    try { setToken(await saveSettings(store.id, settings, rotate)); setPublished(settings.enabled); setMessage(settings.enabled ? '公開設定を保存しました。' : '公開を停止しました。'); }
    catch { setMessage('保存できませんでした。権限・店舗・入力内容を確認してください。'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border bg-white p-6 space-y-4">
    <h2 className="text-xl font-bold">{store.name} <span className="text-sm text-slate-500">{published ? '公開中' : '非公開'}</span></h2>
    <label className="flex gap-2"><input type="checkbox" checked={settings.enabled} onChange={e => change('enabled',e.target.checked)} disabled={busy}/>お客様向けの空き状況を公開する</label>
    <label className="flex gap-2"><input type="checkbox" checked={settings.bookingEnabled === true} onChange={e => change('bookingEnabled',e.target.checked)} disabled={busy}/>○の枠からネット予約を受け付ける</label>
    <fieldset className="border rounded-xl p-4 space-y-3"><legend className="font-bold">公開するメニュー</legend><p className="text-sm text-slate-500">所要時間には準備・片付けも含めてください。未登録の場合は下の施術時間を使います。</p>
      {(settings.menus || []).map((menu,i) => <div key={menu.id} className="flex flex-wrap gap-2">
        <input aria-label={`メニュー${i+1}の名称`} placeholder="メニュー名" maxLength={80} className="border rounded p-2 flex-1 min-w-32" value={menu.name} disabled={busy} onChange={e => change('menus',settings.menus!.map(m => m.id === menu.id ? {...m,name:e.target.value} : m))}/>
        <select aria-label={`メニュー${i+1}の所要時間`} className="border rounded p-2" value={menu.duration} disabled={busy} onChange={e => change('menus',settings.menus!.map(m => m.id === menu.id ? {...m,duration:Number(e.target.value)} : m))}>{[30,60,90,120,150,180].map(n => <option key={n} value={n}>{n}分</option>)}</select>
        <button disabled={busy} className="text-rose-700" onClick={() => change('menus',settings.menus!.filter(m => m.id !== menu.id))}>削除</button>
      </div>)}
      <button disabled={busy || (settings.menus?.length || 0) >= 12} className="text-blue-700" onClick={() => change('menus',[...(settings.menus || []),{id:crypto.randomUUID(),name:'',duration:60}])}>＋ メニューを追加</button>
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label>施術時間<select className="block border rounded p-2 w-full" value={settings.duration} disabled={busy} onChange={e => change('duration',Number(e.target.value))}>{[30,60,90,120,150,180].map(n => <option key={n} value={n}>{n}分</option>)}</select></label>
      <label>同時に施術できる人数<input className="block border rounded p-2 w-full" type="number" min={1} max={20} value={settings.capacity} disabled={busy} onChange={e => change('capacity',Number(e.target.value))}/></label>
      <label>受付開始<input className="block border rounded p-2 w-full" type="time" value={settings.open} disabled={busy} onChange={e => change('open',e.target.value)}/></label>
      <label>施術終了時刻<input className="block border rounded p-2 w-full" type="time" value={settings.close} disabled={busy} onChange={e => change('close',e.target.value)}/></label>
      <label>直前の枠を除外<select className="block border rounded p-2 w-full" value={settings.leadMinutes} disabled={busy} onChange={e => change('leadMinutes',Number(e.target.value))}>{[0,30,60,120,180,1440].map(n => <option key={n} value={n}>{n === 1440 ? '24時間前まで' : `${n}分前まで`}</option>)}</select></label>
    </div>
    <p className="text-sm text-slate-600">登録済みの出勤シフトと予約・予定をもとに、14日先までの空き枠を30分刻みで表示します。休憩はシフトを分けて登録してください。シフトがない日は空き枠を表示しません。</p>
    <div className="flex flex-wrap gap-3"><button className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => save()}>{busy ? '保存中…' : '設定を保存'}</button>{token && <button className="border rounded-lg px-4 py-2" disabled={busy} onClick={() => save(true)}>リンクを再発行</button>}</div>
    {published && url && <div className="border-t pt-4 space-y-3"><label className="block">共有リンク<input aria-label={`${store.name}の共有リンク`} className="block w-full border rounded p-2 text-sm" readOnly value={url}/></label><div className="flex gap-4"><button className="text-blue-700 underline" onClick={async () => {try {await navigator.clipboard.writeText(url); setMessage('リンクをコピーしました。');} catch {setMessage('上のリンクを選択してコピーしてください。');}}}>リンクをコピー</button><a href={url} target="_blank" rel="noreferrer" className="text-blue-700 underline">表示を確認</a></div><QRCodeSVG value={url} size={160} marginSize={4}/><p className="text-sm text-slate-500">このリンクは全てのお客様に共通で共有できます。ネット予約を有効にすると、お客様が○から予約できます。</p></div>}
    <p role="status" className="text-sm">{message}</p>
  </section>;
}
export default function AvailabilitySettingsPage() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; getSettings().then(data => {if(active) setStores(data);}).catch(() => {if(active) setError('設定を読み込めませんでした。店舗オーナーまたは管理者でログインし、予約機能が有効か確認してください。');}); return () => {active = false;}; }, []);
  return <div className="max-w-3xl mx-auto space-y-6"><Link href="/admin/settings" className="text-blue-700">← 設定に戻る</Link><h1 className="text-2xl font-bold">お客様向けの空き状況リンク</h1><p>店舗ごとのリンクをLINEやホームページで共有できます。お客様の名前、予約内容、担当者名は公開されません。</p>{error ? <p role="alert">{error}</p> : !stores ? <p role="status">読み込み中…</p> : stores.length ? stores.map(s => <StoreCard key={s.id} store={s}/>) : <p>店舗を登録すると公開設定ができます。</p>}</div>;
}
