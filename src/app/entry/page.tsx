'use client';
import CustomerNameFields from '@/components/forms/CustomerNameFields';
import {emptyCustomerName,joinedCustomerName} from '@/lib/customer-name';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPublicIntakeInfo, submitCounselingIntake } from '@/lib/intake-actions';
import type { FormTemplate } from '@/lib/industry-forms';
import LegacyEntryForm from './LegacyEntryForm';
import { Button } from '@/components/ui/button';
function Entry() {
  const token = useSearchParams().get('token') || '';
  const [info, setInfo] = useState<{ name: string; template: FormTemplate; completed: boolean } | null>(null);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [names, setNames] = useState({...emptyCustomerName}); const [phone, setPhone] = useState(''); const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => { let live = true; getPublicIntakeInfo(token).then(r => { if (!live) return; if (r.success) setInfo(r); else setError(r.error); }).catch(() => { if (live) setError('シートを読み込めません。時間をおいて開き直してください。'); }); return () => { live = false; }; }, [token]);
  if (!info) return <p className="p-8 text-center" role={error ? 'alert' : undefined}>{error || 'シートを読み込み中…'}</p>;
  if (info.completed) return <main className="max-w-lg mx-auto p-8"><h1 className="text-xl font-bold">回答を受け付けました</h1><p className="mt-4">ご入力ありがとうございます。スタッフにお声がけください。</p></main>;
  if (info.template.legacy) return <LegacyEntryForm token={token} salonName={info.name} />;
  return <main className="max-w-xl mx-auto p-5 pb-16"><p className="text-slate-500 mb-2">{info.name}</p><h1 className="text-2xl font-bold">{info.template.name}</h1><p className="text-sm mt-3">ご希望をお聞かせください。わからない項目は空欄のままで構いません。</p>
    <form className="mt-6 space-y-5" onSubmit={async e => { e.preventDefault(); setSaving(true); setError(''); try { const result = await submitCounselingIntake(token, { name: joinedCustomerName(names).name, phone, answers, consent, profile: {...names,...joinedCustomerName(names)} }); if (result.success) setInfo({ ...info, completed: true }); else setError(result.error); } catch { setError('送信できませんでした。入力を残したまま再試行できます。'); } finally { setSaving(false); } }}>
      <CustomerNameFields value={names} onChange={setNames}/>
      <label className="block font-bold">電話番号（必須）<input required type="tel" autoComplete="tel" maxLength={30} className="block w-full border rounded-xl p-3 mt-2" value={phone} onChange={e => setPhone(e.target.value)} /></label>
      {info.template.fields.map(field => <label className="block font-bold" key={field.id}>{field.label}<textarea className="block w-full border rounded-xl p-3 mt-2 font-normal" rows={3} maxLength={4000} value={answers[field.id] || ''} onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })} /></label>)}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />入力内容をこのサロンでのカウンセリングに使用することに同意します。</label>
      {error && <p role="alert" className="text-red-600">{error}</p>}<Button className="w-full" disabled={saving || !consent}>{saving ? '送信中…' : '回答を送信'}</Button>
    </form>
  </main>;
}
export default function Page() { return <Suspense fallback={<p className="p-8">読み込み中…</p>}><Entry /></Suspense>; }
