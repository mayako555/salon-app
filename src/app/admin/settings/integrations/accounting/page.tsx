'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import * as api from './actions';
import type { CsvFormat, CsvMapping } from '@/lib/accounting/csv';
import type { Account, ProviderId } from '@/lib/accounting/model';
const labels: Record<string, string> = { connected: '連携済み', disconnected: '未連携', reauth_required: '再認証が必要', error: 'エラー' };
const states: Record<string, string> = { excluded: '同期対象外', csv_review: 'CSV出力済み・取込状況を確認', preview: '確認前', approved: '承認済み', running: '処理中・結果確認が必要', completed: '完了', partial: '一部エラー', pending: '未同期', succeeded: '同期済み', failed: 'エラー', uncertain: '結果確認が必要', sending: '結果確認が必要' };
function download(csv: string) { const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'salon-agent-accounting.csv'; a.click(); URL.revokeObjectURL(url); }
export default function AccountingPage() {
    const { profile } = useAuth();
    return <AccountingScreen key={profile?.companyId || 'none'}/>;
}
function AccountingScreen() {
    const [data, setData] = useState<any>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [selected, setSelected] = useState(''), [accounts, setAccounts] = useState<Account[]>([]);
    const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01'), [to, setTo] = useState(new Date().toISOString().slice(0, 10));
    const [csvFormat, setCsvFormat] = useState<CsvFormat>('freee'), [csvMap, setCsvMap] = useState<CsvMapping>({ category: '売上', account: '', tax: '', offsetAccount: '', offsetTax: '', invoice: '', confirmed: false });
    const [offset, setOffset] = useState(''), [offsetTax, setOffsetTax] = useState('');
    const [category, setCategory] = useState('売上'), [account, setAccount] = useState(''), [tax, setTax] = useState(''), [confirmed, setConfirmed] = useState(false), [preview, setPreview] = useState<any>(null), [checked, setChecked] = useState<string[]>([]);
    async function load() { const r = await api.overview(); if (r.ok)
        setData(r.data);
    else
        setMessage(r.error); }
    useEffect(() => { void load(); if (new URLSearchParams(location.search).get('oauth') === 'error')
        setMessage('認証を完了できませんでした。再度連携してください。'); }, []);
    async function task(fn: () => Promise<void>) { setBusy(true); setMessage(''); try {
        await fn();
        await load();
    }
    catch {
        setMessage('通信できませんでした。処理結果を履歴で確認してください。');
    }
    finally {
        setBusy(false);
    } }
    async function send(id: string) { for (let n = 0; n < 100; n++) {
        const r = await api.sendNext(id);
        if (!r.ok) {
            setMessage(r.error);
            break;
        }
        if (r.data.done)
            break;
    } await load(); }
    const button = 'rounded-xl bg-blue-600 text-white px-4 py-2 disabled:opacity-40';
    const input = 'border rounded-lg p-2 bg-white';
    return <main className="max-w-6xl mx-auto p-6 space-y-6">
  <Link href="/admin/settings/integrations" className="text-blue-600">← 外部サービス連携</Link><h1 className="text-3xl font-bold">会計ソフト</h1>
  <p>連携は任意です。<Link className="text-blue-600 underline" href="/admin/expenses/entry">経費の手入力・CSV取込</Link>は会計ソフトなしで利用できます。</p>
  {message && <p role="alert" className="p-4 bg-amber-50 rounded-xl">{message}</p>}
  {!data ? <p role="status">{message ? "設定を読み込めませんでした。再ログインして開き直してください。" : "設定を読み込み中…"}</p> : <>
   <div className="grid md:grid-cols-3 gap-4">{[['freee', 'freee会計'], ['moneyforward', 'マネーフォワード クラウド'], ['yayoi', '弥生会計']].map(([id, name]) => <section className="border rounded-2xl bg-white p-5 space-y-3" key={id}>
    <h2 className="font-bold text-xl">{name}</h2><p>{id !== 'yayoi' ? 'OAuth認証' : 'API連携は準備中'}</p>
    {data.connections.filter((c: any) => c.provider === id).map((c: any) => <div key={c.id}><strong>{c.companyName}</strong><p>{labels[c.status] || 'エラー'}</p><p>最終同期：{c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString('ja-JP') : '未実行'}</p>{c.status !== 'disconnected' && <button disabled={busy || !data.canWrite} className="text-red-700 underline" onClick={() => { if (confirm('この認証に紐づく接続先をすべて解除します。送信済み履歴は残ります。'))
                void task(async () => { const r = await api.disconnectAccounting(c.id); setMessage(r.ok ? (r.data.revoked ? '解除しました。' : 'ローカル接続を解除しました。freee側でもアプリの許可を取り消してください。') : r.error); }); }}>連携を解除</button>}</div>)}
    {id !== 'yayoi' ? <><button className={button} disabled={busy || !data.configured[id] || !data.canWrite} onClick={() => void task(async () => { const r = await api.connectFreee(id as ProviderId); if (r.ok)
                location.assign(r.data);
            else
                setMessage(r.error); })}>{name}と連携</button>{!data.configured[id] && <p className="text-sm text-slate-600">運営側の接続設定が必要です。</p>}</> : <p className="text-sm text-slate-600">公式仕様・利用条件の確認後に提供します。下の標準CSVは各社専用形式ではありません。</p>}
   </section>)}</div>
   {data.pending.length > 0 && <section className="p-5 border rounded-xl"><h2 className="font-bold">認可した事業所を接続先に設定</h2>{data.pending.map((p: any) => <div key={p.id} className="flex flex-wrap gap-2 mt-3">{p.companies.map((c: any) => <button key={c.id} disabled={busy || !data.canWrite} className={button} onClick={() => void task(async () => { const r = await api.chooseCompany(p.id, c.id); if (!r.ok)
            setMessage(r.error); })}>{p.provider}：{c.name} を使用</button>)}</div>)}</section>}
   <section className="border rounded-2xl p-5 space-y-4 bg-white"><h2 className="font-bold text-xl">送信先と科目設定</h2>
    <select aria-label="送信先" value={selected} className={input} onChange={e => { setSelected(e.target.value); setPreview(null); setAccounts([]); setAccount(''); setConfirmed(false); setOffset(''); setOffsetTax(''); }}><option value="">事業所を選択</option>{data.connections.filter((c: any) => c.status === 'connected').map((c: any) => <option value={c.id} key={c.id}>{c.companyName}</option>)}</select>
    <button className={button} disabled={!selected || busy} onClick={() => void task(async () => { const r = await api.getAccounts(selected); if (r.ok)
            setAccounts(r.data);
        else
            setMessage(r.error); })}>勘定科目を取得</button>
    <div className="flex flex-wrap gap-2"><input aria-label="経費カテゴリまたは売上" className={input} value={category} onChange={e => { setCategory(e.target.value); setConfirmed(false); }} placeholder="カテゴリ（売上・材料費など）"/><select aria-label="勘定科目" className={input} value={account} onChange={e => { setAccount(e.target.value); setConfirmed(false); }}><option value="">勘定科目</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><input aria-label="freee税区分コード" className={input} value={tax} onChange={e => { setTax(e.target.value); setConfirmed(false); }} placeholder="税区分コード／ID"/></div>
    {data.connections.find((c: any) => c.id === selected)?.provider === 'moneyforward' && <div className="flex gap-2"><select aria-label="相手勘定科目" className={input} value={offset} onChange={e => { setOffset(e.target.value); setConfirmed(false); }}><option value="">未収・未払の相手科目を選択</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><input aria-label="相手科目の税区分ID" className={input} value={offsetTax} onChange={e => { setOffsetTax(e.target.value); setConfirmed(false); }} placeholder="相手科目の税区分ID"/></div>}
    <p className="text-sm">税区分は会計ソフトの設定を確認して入力してください。現在は税込金額の未決済取引を作成します。現金・カード等の決済登録、入金消込は会計ソフト側で行ってください。異なる税率が混ざる売上は送信しないでください。</p>
    <label className="block"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/> 科目・税区分・税込金額と、未決済登録になることを確認しました</label>
    <button disabled={busy || !selected || !account || tax === '' || !confirmed || !data.canWrite} className={button} onClick={() => void task(async () => { const r = await api.setMapping(selected, { category, accountId: data.connections.find((c: any) => c.id === selected)?.provider === 'freee' ? Number(account) : account, taxCode: data.connections.find((c: any) => c.id === selected)?.provider === 'freee' ? Number(tax) : tax, ...(offset ? { offsetAccountId: offset, offsetTaxId: offsetTax } : {}), settlement: 'unsettled', confirmed }); setMessage(r.ok ? '対応表を保存しました。' : r.error); })}>対応表を保存</button>
    {data.mappings.filter((m: any) => m.connectionId === selected).map((m: any) => <p key={m.id}>{m.category} → 科目ID {m.accountId} ／ 税区分 {m.taxCode} ／ 未決済</p>)}
   </section>
   <section className="border rounded-2xl p-5 space-y-4 bg-white"><h2 className="font-bold text-xl">売上・経費の確認と手動同期</h2><p>確定済み売上と登録済み経費が対象です。過去データも確認した行だけ送信します。</p><div className="flex flex-wrap gap-3"><input type="date" aria-label="開始日" className={input} value={from} onChange={e => setFrom(e.target.value)}/><input type="date" aria-label="終了日" className={input} value={to} onChange={e => setTo(e.target.value)}/><button className={button} disabled={busy || !selected || !data.canWrite} onClick={() => void task(async () => { const r = await api.createPreview(selected, from, to); if (r.ok) {
            setPreview(r.data);
            setChecked([]);
        }
        else
            setMessage(r.error); })}>連携候補を作成</button><button className={button} disabled={busy} onClick={() => void task(async () => { const r = await api.exportStandard(from, to); if (r.ok)
            download(r.data);
        else
            setMessage(r.error); })}>標準CSVダウンロード</button></div>
    {preview && <><p>対象：{preview.rows.length}件 ／ 選択：{checked.length}件</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['選択', '日付', '種類', '店舗', 'カテゴリ', '金額', '状態'].map(h => <th className="p-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{preview.rows.map((r: any) => { const key = r.kind + ':' + r.id; return <tr className="border-t" key={key}><td><input aria-label={`${r.date} ${r.amount}円を選択`} type="checkbox" disabled={r.blocked || busy} checked={checked.includes(key)} onChange={e => setChecked(e.target.checked ? [...checked, key] : checked.filter(i => i !== key))}/></td><td>{r.date}</td><td>{r.kind === 'sale' ? '売上' : '経費'}</td><td>{r.store}</td><td>{r.category}</td><td>{r.amount.toLocaleString()}円</td><td>{!r.mapping ? '科目設定が必要' : ['freee', 'moneyforward', 'yayoi'].includes(r.source) ? '同じサービス由来のため対象外' : states[r.status] || r.status}</td></tr>; })}</tbody></table></div><button className={button} disabled={busy || !checked.length} onClick={() => { if (confirm(`${checked.length}件を、表示した会計事業所に未決済取引として送信します。内容を確認しましたか？`))
            void task(async () => { const r = await api.approveRun(preview.id, checked); if (!r.ok) {
                setMessage(r.error);
                return;
            } const id = preview.id; setPreview(null); await send(id); }); }}>確認した内容を会計ソフトへ送信</button><button disabled={busy || !checked.length} className="ml-3 border rounded-lg p-2" onClick={() => { if (confirm('選択した行をこの会計事業所への同期対象外にしますか？'))
            void task(async () => { const r = await api.excludeFromSync(preview.id, checked); if (r.ok) {
                setPreview(null);
                setChecked([]);
                setMessage('同期対象外にしました。');
            }
            else
                setMessage(r.error); }); }}>選択行を同期対象外にする</button></>}
   </section>
   <section className="border rounded-xl p-5 bg-white space-y-3"><h2 className="font-bold text-xl">会計ソフト別CSV（カテゴリ単位）</h2><p>上の期間を使います。出力は同期完了ではありません。取込前に会計ソフトの確認画面で内容・重複・税区分を確認してください。</p><select className={input} aria-label="CSV形式" value={csvFormat} onChange={e => setCsvFormat(e.target.value as CsvFormat)}><option value="freee">freee 取引形式・未決済</option><option value="moneyforward">マネーフォワード 仕訳帳形式</option><option value="yayoi_online">弥生会計オンライン 27列形式</option></select><div className="grid md:grid-cols-2 gap-2">{([['category', '対象カテゴリ（売上・材料費など）'], ['account', '勘定科目名'], ['tax', '税区分名（ソフトの正式表記）'], ['offsetAccount', '相手科目名（freeeは不要）'], ['offsetTax', '相手科目の税区分'], ['invoice', 'MFインボイス区分（適格・80％控除等）']] as const).map(([key, label]) => <label key={key}>{label}<input className={input} value={csvMap[key]} onChange={e => setCsvMap({ ...csvMap, [key]: e.target.value, confirmed: false })}/></label>)}</div><label className="block"><input type="checkbox" checked={csvMap.confirmed} onChange={e => setCsvMap({ ...csvMap, confirmed: e.target.checked })}/> このカテゴリの対象行に適用する科目・税区分を確認しました</label><button className={button} disabled={busy || !csvMap.confirmed} onClick={() => void task(async () => { const r = await api.exportProviderCsv(from, to, csvFormat, csvMap); if (r.ok) {
            download(r.data.csv);
            setMessage(`${r.data.count}件をCSV出力しました。同期済みにはしていません。`);
        }
        else
            setMessage(r.error); })}>確認した設定でCSVを保存</button><p className="text-sm">弥生の対象は会計オンラインです。デスクトップ・Next共通の互換性は保証しません。文字コードを選べる取込画面ではUTF-8を指定してください。</p></section>
   <section className="space-y-3"><h2 className="text-xl font-bold">CSV出力履歴</h2>{data.exports.map((e: any) => <p className="border p-3" key={e.id}>{e.createdAt} ／ {e.provider} ／ {e.count}件 ／ {e.status === 'not_imported' ? '未取込を確認済み' : '出力済み（同期完了ではありません）'} {e.status !== 'not_imported' && <button className="text-blue-600 underline" disabled={busy || !data.canWrite} onClick={() => { if (confirm('このCSVを会計ソフトに取り込んでいないことを確認しましたか？取り込んでいた場合は二重登録になります。'))
            void task(async () => { const r = await api.confirmCsvNotImported(e.id); if (!r.ok)
                setMessage(r.error); }); }}>未取込を確認してAPI送信を可能にする</button>}</p>)}</section>
   <section className="space-y-3"><h2 className="text-xl font-bold">同期履歴</h2>{data.runs.length === 0 && <p>履歴はありません。</p>}{data.runs.map((run: any) => <details className="border rounded-xl bg-white p-4" key={run.id}><summary>{new Date(run.createdAt).toLocaleString('ja-JP')} ／ {run.companyName} ／ {states[run.status]} ／ {run.rows.length}件（成功 {run.rows.filter((r: any) => r.status === 'succeeded').length}・エラー {run.rows.filter((r: any) => r.status === 'failed').length}）</summary><p className="text-sm my-2">「結果確認が必要」の行は重複防止のため自動再送しません。会計ソフトで登録結果を確認してください。</p>{run.rows.map((r: any) => <p key={r.kind + r.id}>{r.date} {r.kind === 'sale' ? '売上' : '経費'} {r.amount}円：{states[r.status] || r.status} {r.error || ''}</p>)}{['approved', 'partial', 'running'].includes(run.status) && <button className={button} disabled={busy || !data.canWrite} onClick={() => void task(() => send(run.id))}>未送信・再送可能なエラーのみ実行</button>}</details>)}</section>
  </>}
 </main>;
}
