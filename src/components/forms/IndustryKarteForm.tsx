'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addKarteRecord, editKarteRecord, type KarteRecord } from '@/lib/karte';
import type { FormTemplate } from '@/lib/industry-forms';
import type { DrawingDocument } from '@/lib/drawing-document';
import { Button } from '@/components/ui/button';
import KarteDrawingCanvas from './KarteDrawingCanvas';
import { toast } from 'sonner';
export default function IndustryKarteForm({ customerId, customerName, template, staff, initial }: {
  customerId: string; customerName: string; template: FormTemplate; staff: { id: string; name: string }[]; initial?: KarteRecord;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial ? new Date(initial.date).toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE'));
  const [staffId, setStaffId] = useState(initial?.staff_id || staff[0]?.id || '');
  const [answers, setAnswers] = useState<Record<string, string>>(initial?.form_answers || {});
  const [notes, setNotes] = useState(initial?.notes || '');
  const [drawing, setDrawing] = useState<{ url: string; document?: DrawingDocument }>({ url: initial?.eye_diagram_url || '', document: initial?.drawing_document });
  const [saving, setSaving] = useState(false);
  return <form className="max-w-4xl mx-auto p-6 space-y-6" onSubmit={async e => {
    e.preventDefault(); setSaving(true);
    try {
      const selected = staff.find(s => s.id === staffId); if (!selected) throw new Error('担当者を選択してください');
      const data = { customer_id: customerId, staff_id: staffId, staff_name: selected.name, date: new Date(date + 'T12:00:00'), service_type: template.industry, visit_type: initial?.visit_type || 'repeat', design: {}, notes, form_snapshot: template, form_answers: answers, eye_diagram_url: drawing.url, ...(drawing.document ? { drawing_document: drawing.document } : {}) } as Omit<KarteRecord, 'id' | 'created_at'>;
      const result = initial ? await editKarteRecord(initial.id, data, '', '') : await addKarteRecord(data);
      if (!result.success) throw new Error(result.error);
      toast.success('カルテを保存しました'); router.push(`/staff-portal/customers/${customerId}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : '保存できませんでした'); } finally { setSaving(false); }
  }}>
    <Button type="button" variant="outline" onClick={() => router.back()}>戻る</Button><h1 className="text-2xl font-bold">{template.name}{initial ? '編集' : '作成'}</h1><p>{customerName} 様</p>
    <div className="grid sm:grid-cols-2 gap-4"><label>施術日<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="block border rounded-xl p-3 w-full" /></label><label>担当<select required value={staffId} onChange={e => setStaffId(e.target.value)} className="block border rounded-xl p-3 w-full"><option value="">選択してください</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
    {template.fields.map(field => <label className="block font-bold" key={field.id}>{field.label}<textarea className="mt-2 block w-full border rounded-xl p-3 font-normal" rows={3} maxLength={4000} value={answers[field.id] || ''} onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })} /></label>)}
    <section className="bg-white rounded-2xl p-4 space-y-3"><h2 className="font-bold">手書きメモ</h2><KarteDrawingCanvas initialDataUrl={initial?.eye_diagram_url} initialDocument={initial?.drawing_document} onSave={(url, document) => setDrawing({ url, document })} /></section>
    <label className="block">備考<textarea className="mt-2 block w-full border rounded-xl p-3" value={notes} maxLength={10000} onChange={e => setNotes(e.target.value)} /></label>
    <Button type="submit" disabled={saving}>{saving ? '保存中…' : 'カルテを保存'}</Button>
  </form>;
}
