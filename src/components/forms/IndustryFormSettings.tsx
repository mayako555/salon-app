'use client';
import { useEffect, useState } from 'react';
import { INDUSTRIES, FORM_TEMPLATES, defaultIndustryForms, templateById, type IndustryForms, type Industry } from '@/lib/industry-forms';
import { getIndustryFormSettings, saveIndustryFormSettings } from '@/lib/industry-form-actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
export function IndustryFormFields({ value, onChange }: { value: IndustryForms; onChange: (value: IndustryForms) => void }) {
  return <div className="space-y-4">
    <label className="block text-sm font-bold">業種<select className="mt-2 block w-full rounded-xl border p-3 bg-white" value={value.industry} onChange={e => onChange(defaultIndustryForms(e.target.value as Industry))}>{INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
    {(['karte', 'counseling'] as const).map(kind => {
      const key = kind === 'karte' ? 'karteTemplateId' : 'counselingTemplateId';
      const template = templateById(value[key], kind);
      return <label key={kind} className="block text-sm font-bold">{kind === 'karte' ? '施術カルテ' : 'お客様入力用カウンセリングシート'}
        <select className="mt-2 block w-full rounded-xl border p-3 bg-white" value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })}>{FORM_TEMPLATES.filter(t => t.kind === kind).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <span className="block mt-2 text-xs font-normal text-slate-500">{template.legacy ? '現在のまつ毛・眉用の項目を使用します。' : template.fields.map(f => f.label).join(' ／ ')}</span>
      </label>;
    })}
    <p className="text-xs text-slate-500">業種を変更するとおすすめのシートに切り替わります。複合サロンはそれぞれ別の業種のシートも選べます。保存済みのカルテ・回答は変更されません。</p>
  </div>;
}
export default function IndustryFormSettings() {
  const [value, setValue] = useState<IndustryForms | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; setError(false); getIndustryFormSettings().then(v => { if (live) setValue(v); }).catch(() => { if (live) setError(true); }); return () => { live = false; }; }, [attempt]);
  return <section className="rounded-3xl bg-white border p-6 space-y-5"><h2 className="text-xl font-bold">業種・カルテ・カウンセリング設定</h2>
    {error ? <p role="alert">設定を読み込めませんでした。<Button variant="outline" onClick={() => setAttempt(a => a + 1)}>再読み込み</Button></p> : !value ? <p>設定を読み込み中…</p> : <><IndustryFormFields value={value} onChange={setValue} /><Button disabled={saving} onClick={async () => { setSaving(true); try { const result = await saveIndustryFormSettings(value); if (result.success) toast.success('業種とシート設定を保存しました'); else toast.error(result.error); } catch { toast.error('保存できませんでした'); } finally { setSaving(false); } }}>{saving ? '保存中…' : '業種・シート設定を保存'}</Button></>}
  </section>;
}
