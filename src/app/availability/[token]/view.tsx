'use client';
import { useEffect, useState } from 'react';
import type { PublicAvailability, PublicMenu } from '@/lib/availability/model';
import BookingForm from './booking-form';
const dayLabel = (date:string) => new Date(`${date}T00:00:00+09:00`).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short',timeZone:'Asia/Tokyo'});
export default function AvailabilityView({ token }: { token: string }) {
  const [offset,setOffset] = useState(0), [revision,setRevision] = useState(0), [menuId,setMenuId] = useState('');
  const [data,setData] = useState<PublicAvailability | null>(null), [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [booking,setBooking] = useState<{date:string;time:string;menu:PublicMenu;storeName:string} | null>(null);
  useEffect(() => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(),20000); let active=true;
    fetch(`/api/availability/${encodeURIComponent(token)}?offset=${offset}&menu=${encodeURIComponent(menuId)}`,{signal:controller.signal,cache:'no-store',credentials:'omit'})
      .then(async response => {const body=await response.json();if(!response.ok) throw new Error(body.error);return body as PublicAvailability;})
      .then(body => {if(active) setData(body);})
      .catch(e => {if(active) setError(e instanceof Error && e.name !== 'AbortError' ? e.message : '通信に時間がかかっています。再読み込みしてください。');})
      .finally(() => {clearTimeout(timeout);if(active) setLoading(false);});
    return () => {active=false;controller.abort();clearTimeout(timeout);};
  },[token,offset,revision,menuId]);
  function reload(nextOffset=offset,nextMenu=menuId) {setLoading(true);setData(null);setError('');setOffset(nextOffset);setMenuId(nextMenu);setRevision(n=>n+1);}
  return <main className="min-h-screen bg-slate-50 px-3 py-8 text-slate-900"><div className="max-w-4xl mx-auto space-y-5">
    <header><p className="text-xs tracking-widest text-slate-500">SALON AGENT</p><h1 className="mt-2 text-2xl font-bold">{booking?.storeName || data?.storeName || 'サロン'}の空席確認</h1><p className="mt-2 text-sm text-slate-600">メニューを選んで、空いている日時をご確認ください。</p></header>
    {booking ? <BookingForm key={`${booking.date}:${booking.time}:${booking.menu.id}`} token={token} {...booking} onBooked={() => {setData(null);}} onClose={() => {setBooking(null);reload();}}/> : <>
    <nav aria-label="表示期間" className="flex gap-3"><button disabled={loading || offset===0} onClick={()=>reload(0)} className="border rounded-lg bg-white px-4 py-2 disabled:opacity-40">直近7日</button><button disabled={loading || offset===7} onClick={()=>reload(7)} className="border rounded-lg bg-white px-4 py-2 disabled:opacity-40">次の7日</button><button disabled={loading} onClick={()=>reload()} className="ml-auto text-blue-700 disabled:opacity-40">更新</button></nav>
    {loading ? <p role="status">空き状況を確認しています…</p> : error ? <p role="alert" className="bg-white rounded-xl p-6">{error}</p> : data && <>
      <label className="block font-semibold">メニュー<select className="mt-2 block w-full border rounded-xl bg-white p-3" value={data.menuId} onChange={e=>reload(offset,e.target.value)}>{data.menus.map(menu=><option key={menu.id} value={menu.id}>{menu.name} ／ {menu.duration}分</option>)}</select></label>
      <p className="text-sm">○ 空きあり　× 空きなし　－ 受付対象外</p>
      <p className="text-sm text-slate-600">{data.bookingEnabled ? '○を押すと予約に進めます。' : 'ご予約は店舗へお問い合わせください。'} <span className="sm:hidden">表は横にスクロールできます。</span></p>
      <div className="overflow-x-auto rounded-xl border bg-white" tabIndex={0} role="region" aria-label="週間空席カレンダー">
        <table className="w-full min-w-[600px] border-collapse text-center"><caption className="sr-only">{data.storeName} {data.duration}分の施術の空席状況（日本時間）</caption>
          <thead><tr><th scope="col" className="sticky left-0 z-10 bg-slate-100 p-3 border-b">時間</th>{data.days.map(day=><th scope="col" key={day.date} className="bg-slate-100 p-3 border-b whitespace-nowrap">{dayLabel(day.date)}</th>)}</tr></thead>
          <tbody>{data.timeRows.map(time=><tr key={time}><th scope="row" className="sticky left-0 bg-white p-3 border-b text-sm">{time}</th>{data.days.map((day,i)=>{
            const free=day.times.includes(time), eligible=data.eligibleDays[i]?.times.includes(time);
            return <td key={day.date} className="border-b border-l p-1">{free ? data.bookingEnabled ? <button className="w-full min-h-11 rounded-md font-bold text-xl text-emerald-700 hover:bg-emerald-50 focus-visible:outline-2" aria-label={`${dayLabel(day.date)} ${time}を予約`} onClick={()=>setBooking({date:day.date,time,menu:data.menus.find(m=>m.id===data.menuId)!,storeName:data.storeName})}>○</button> : <span className="text-xl text-emerald-700" aria-label="空きあり">○</span> : <span className={eligible ? 'text-slate-500' : 'text-slate-300'} aria-label={eligible ? '空きなし' : '受付対象外'}>{eligible ? '×' : '－'}</span>}</td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">日本時間 ／ 確認時刻：{new Date(data.updatedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}<br/>表示は確認時点の目安です。受付対象外の日時については店舗へお問い合わせください。</p>
    </>}
    </>}
  </div></main>;
}
