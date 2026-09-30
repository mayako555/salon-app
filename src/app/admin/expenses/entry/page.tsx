'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import * as api from './actions';
import type { Entry } from './actions';
export default function EntryPage() { const { profile } = useAuth(); return <Screen key={profile?.companyId || 'none'}/>; }
function Screen() {
    const { availableStores } = useAuth();
    const [data, setData] = useState<any>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [preview, setPreview] = useState<any>(null), [selected, setSelected] = useState<number[]>([]), [confirmDuplicates, setConfirmDuplicates] = useState(false), [category, setCategory] = useState(''), [file, setFile] = useState<File | null>(null);
    const [entry, setEntry] = useState<Entry>({ date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }), amount: 0, category: '材料費', paymentMethod: '現金', store_name: '', counterparty: '', description: '' });
    async function load() { const r = await api.expenseSettings(); if (r.ok)
        setData(r.data);
    else
        setMessage(r.error); }
    useEffect(() => { void load(); }, []);
    async function task(fn: () => Promise<void>) { setBusy(true); setMessage(''); try {
        await fn();
        await load();
    }
    catch {
        setMessage('通信できませんでした。再読込して登録結果を確認してください。');
    }
    finally {
        setBusy(false);
    } }
    function show(p: any) { setPreview(p); setSelected(p.rows.filter((r: any) => !r.duplicate).map((r: any) => r.index)); setConfirmDuplicates(false); }
    const input = 'border rounded-lg bg-white p-2 w-full';
    const button = 'bg-blue-600 rounded-lg px-4 py-2 text-white disabled:opacity-40';
    return <main className="max-w-5xl p-6 mx-auto space-y-6"><Link href="/admin/expenses">← 経費管理</Link><h1 className="text-3xl font-bold">経費を登録</h1><p>会計ソフトは不要です。登録した経費はSALON AGENTの経費集計に反映されます。</p>{message && <p role="alert" className="bg-amber-50 p-4">{message}</p>}
 {data && <><section className="rounded-xl border p-5 bg-white space-y-3"><h2 className="text-xl font-bold">経費の管理方法を選んでください</h2><div className="flex gap-3 flex-wrap">{[['manual', '直接入力する'], ['api', '会計ソフトと連携する'], ['csv', 'CSVから取り込む']].map(([v, l]) => <button key={v} disabled={busy} className={data.method === v ? button : 'border rounded-lg px-4 py-2'} onClick={() => void task(async () => { const r = await api.setExpenseMethod(v); if (!r.ok)
            setMessage(r.error); })}>{l}</button>)}</div><p className="text-sm">いつでも変更・併用できます。</p>{data.method === 'api' && <Link className="block text-blue-600" href="/admin/settings/integrations/accounting">会計連携の設定へ（現在は確認付き送信。APIからの経費取込は準備中）</Link>}</section>
 <section className="rounded-xl border p-5 bg-white space-y-4"><h2 className="text-xl font-bold">手入力</h2><div className="grid md:grid-cols-2 gap-4">
 <label>日付<input className={input} type="date" value={entry.date} onChange={e => setEntry({ ...entry, date: e.target.value })}/></label><label>金額（税込・円）<input className={input} type="number" min="1" step="1" value={entry.amount || ''} onChange={e => setEntry({ ...entry, amount: Number(e.target.value) })}/></label>
 <label>カテゴリ<select className={input} value={entry.category} onChange={e => setEntry({ ...entry, category: e.target.value })}>{data.categories.map((c: string) => <option key={c}>{c}</option>)}</select></label><label>支払方法<select className={input} value={entry.paymentMethod} onChange={e => setEntry({ ...entry, paymentMethod: e.target.value })}>{['現金', 'クレジットカード', '銀行振込', 'QR決済', 'その他'].map(v => <option key={v}>{v}</option>)}</select></label>
 <label>店舗<select className={input} value={entry.store_name} onChange={e => setEntry({ ...entry, store_name: e.target.value })}><option value="">店舗を選択</option>{availableStores.filter(s => !['共通', '全店舗'].includes(s)).map(s => <option key={s}>{s}</option>)}</select></label><label>取引先<input className={input} value={entry.counterparty} onChange={e => setEntry({ ...entry, counterparty: e.target.value })}/></label>
 <label>摘要・メモ<textarea className={input} value={entry.description} onChange={e => setEntry({ ...entry, description: e.target.value })}/></label><label>領収書画像（任意・JPEG/PNG・450KB以内）<input type="file" accept="image/jpeg,image/png" onChange={e => setFile(e.target.files?.[0] || null)}/></label></div>
 <button className={button} disabled={busy} onClick={() => void task(async () => { const r = await api.prepareExpenses([entry], 'manual'); if (r.ok)
            show(r.data);
        else
            setMessage(r.error); })}>登録内容を確認</button></section>
 <section className="border rounded-xl bg-white p-5 space-y-3"><h2 className="font-bold text-xl">カテゴリの追加・編集</h2><input aria-label="新しいカテゴリ" className={input} value={category} onChange={e => setCategory(e.target.value)}/><button className={button} disabled={busy || !category.trim()} onClick={() => void task(async () => { const r = await api.saveCategory(category); if (r.ok)
            setCategory('');
        else
            setMessage(r.error); })}>カテゴリ追加</button>{data.customCategories.map((c: any) => <p key={c.id}>{c.name} <button className="text-blue-600 underline" onClick={() => { const name = prompt('新しいカテゴリ名（登録済み経費の名称は保持します）', c.name); if (name)
            void task(async () => { const r = await api.saveCategory(name, c.id); if (!r.ok)
                setMessage(r.error); }); }}>編集</button></p>)}</section>
 <section className="border rounded-xl bg-white p-5 space-y-3"><h2 className="font-bold text-xl">CSV取込</h2><p>UTF-8、最大100件。見出し：日付,金額,カテゴリ,支払方法,店舗,取引先,摘要</p><p>日付はYYYY-MM-DD、金額は円単位の整数です。重複候補は確認してから登録します。</p><input aria-label="経費CSV" disabled={busy} type="file" accept=".csv,text/csv" onChange={e => { const csv = e.target.files?.[0]; if (csv)
            void task(async () => { setFile(null); const r = await api.prepareCsv(await csv.text()); if (r.ok)
                show(r.data);
            else
                setMessage(r.error); }); }}/></section>
 {preview && <section className="border rounded-xl bg-blue-50 p-5 space-y-3"><h2 className="font-bold text-xl">登録前の確認</h2>{preview.rows.map((r: any) => <label key={r.index} className="block"><input type="checkbox" checked={selected.includes(r.index)} onChange={e => setSelected(e.target.checked ? [...selected, r.index] : selected.filter(i => i !== r.index))}/> {r.date} {r.store_name} {r.category} {r.amount}円 {r.counterparty} {r.duplicate && <strong className="text-amber-800">同じ経費の可能性があります</strong>}</label>)}<label className="block"><input type="checkbox" checked={confirmDuplicates} onChange={e => setConfirmDuplicates(e.target.checked)}/> 重複候補も別の経費として登録することを確認しました</label><button className={button} disabled={busy || !selected.length} onClick={() => void task(async () => { const form = new FormData(); if (file)
            form.set('receipt', file); const r = await api.commitExpenses(preview.id, selected, confirmDuplicates, form); if (r.ok) {
            setPreview(null);
            setFile(null);
            setMessage(`${r.data.count}件登録しました。`);
        }
        else
            setMessage(r.error); })}>選択した経費を登録</button></section>}
 <section className="space-y-3"><h2 className="font-bold text-xl">最近の経費（すべての入力元・最新100件）</h2>{data.rows.map((r: any) => <article key={r.id} className="border rounded-lg bg-white p-3"><p>{r.date} ／ {r.store_name} ／ {r.category} ／ {Number(r.amount).toLocaleString()}円 <span className="bg-slate-100 rounded px-2">{({ manual: '手入力', csv: 'CSV', freee: 'freee', moneyforward: 'マネーフォワード', yayoi: '弥生' } as Record<string, string>)[r.source] || r.source}</span></p><p>{r.counterparty} {r.description} ／ {r.paymentMethod}</p>{r.receiptId && <a className="text-blue-600 underline" href={'/api/accounting/receipts/' + r.receiptId} target="_blank" rel="noreferrer">領収書を表示</a>}</article>)}</section>
 </>}
 </main>;
}
