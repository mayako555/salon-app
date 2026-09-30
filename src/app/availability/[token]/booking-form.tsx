'use client';
import { useRef, useState } from 'react';
import type { BookingInput, PublicMenu } from '@/lib/availability/model';
import type { BookingReceipt } from '@/lib/availability/booking';
export default function BookingForm({token,date,time,storeName,menu,onClose,onBooked}: {token:string; date:string; time:string; storeName:string; menu:PublicMenu; onClose:()=>void; onBooked:()=>void}) {
  const [name,setName] = useState(''), [phone,setPhone] = useState(''), [consent,setConsent] = useState(false);
  const [confirm,setConfirm] = useState(false), [sending,setSending] = useState(false), [error,setError] = useState('');
  const [receipt,setReceipt] = useState<BookingReceipt | null>(null);
  const [uncertain,setUncertain] = useState(false);
  const request = useRef<BookingInput | null>(null);
  const website = useRef<HTMLInputElement>(null);
  async function submit() {
    if(sending) return;
    // Keep the exact request after a timeout: retrying must not create another booking.
    if(!request.current) request.current = {requestId:crypto.randomUUID(),menuId:menu.id,duration:menu.duration,menuName:menu.name,date,time,name,phone,consent,website:website.current?.value || ''};
    setSending(true); setError('');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(),25000);
    try {
      const response = await fetch(`/api/availability/${encodeURIComponent(token)}/book`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request.current),signal:controller.signal});
      const body = await response.json();
      if(!response.ok) {setUncertain(response.status >= 500); if(response.status < 500) request.current = null; throw new Error(body.error);}
      setReceipt(body.receipt); setUncertain(false); onBooked();
    } catch(e) {
      if(request.current) setUncertain(true);
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : '通信が途切れました。重複を防ぐため、この画面の「同じ内容で再送信」を押してください。');
    } finally {clearTimeout(timeout); setSending(false);}
  }
  return <section aria-labelledby="booking-heading" className="rounded-2xl border border-emerald-200 bg-white p-5 space-y-4 shadow-sm">
    {receipt ? <><h2 id="booking-heading" className="text-xl font-bold text-emerald-800" tabIndex={-1}>予約が確定しました</h2><p>{receipt.storeName}<br/>{receipt.date} {receipt.time}〜{receipt.endTime}<br/>{receipt.menuName}</p><p className="break-all">受付番号：<strong>{receipt.reference}</strong></p><p className="text-sm text-slate-600">この画面を保存してください。変更・キャンセルは店舗へ受付番号をお伝えください。確認メール・LINEの自動送信はありません。</p><button className="border rounded-lg px-4 py-2" onClick={onClose}>空席カレンダーに戻る</button></> : <>
    <h2 id="booking-heading" className="text-xl font-bold">{confirm ? '予約内容の確認' : 'お客様情報'}</h2>
    <p className="font-semibold">{storeName}<br/>{date} {time}〜<br/>{menu.name}（{menu.duration}分）</p>
    {!confirm ? <form className="space-y-4" onSubmit={e => {e.preventDefault();setConfirm(true);setError('');}}>
      <label className="block">お名前<input required maxLength={80} autoComplete="name" className="mt-1 block w-full border rounded-lg p-3" value={name} onChange={e => setName(e.target.value)}/></label>
      <label className="block">電話番号<input required maxLength={30} type="tel" autoComplete="tel" className="mt-1 block w-full border rounded-lg p-3" value={phone} onChange={e => setPhone(e.target.value)}/></label>
      <div aria-hidden="true" className="hidden"><input ref={website} tabIndex={-1} autoComplete="off" name="website"/></div>
      <label className="flex items-start gap-2 text-sm"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>入力情報を予約管理・店舗からの連絡に使用することに同意します。</label>
      <p className="text-sm text-slate-500">担当者は店舗側で割り当てます。料金・施術内容の詳細は店舗にご確認ください。</p>
      <div className="flex gap-4"><button type="button" onClick={onClose} className="border rounded-lg px-4 py-2">戻る</button><button className="bg-emerald-700 text-white rounded-lg px-4 py-2">内容を確認</button></div>
    </form> : <><p>{name}<br/>{phone}</p><p className="text-sm text-slate-600">確定時に最新の空き状況を確認します。他のお客様の予約状況によって受付できない場合があります。</p><div className="flex flex-wrap gap-3">{!uncertain && <button disabled={sending} className="border rounded-lg px-4 py-2" onClick={() => {request.current=null;setConfirm(false);}}>入力を修正</button>}<button disabled={sending} className="bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-50" onClick={submit}>{sending ? '予約を確認中…' : uncertain ? '同じ内容で再送信' : '予約を確定する'}</button></div>{uncertain && <p className="text-sm">予約結果が未確認です。別の枠で予約し直さず、再送信するか店舗にお問い合わせください。</p>}</>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    </>}
  </section>;
}
