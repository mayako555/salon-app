'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { getIndustryFormSettings } from '@/lib/industry-form-actions';
import { templateById, type FormTemplate } from '@/lib/industry-forms';
import { getCustomerById } from '@/lib/customers';
import { getStaffList } from '@/app/staff/actions';
import { getKarteByCustomer, type KarteRecord } from '@/lib/karte';
import IndustryKarteForm from './IndustryKarteForm';
export default function KarteFormRouter({ children, editing = false }: { children: ReactNode; editing?: boolean }) {
  const { id, karteId } = useParams<{ id: string; karteId?: string }>();
  const [data, setData] = useState<{ template: FormTemplate; name: string; staff: { id: string; name: string }[]; record?: KarteRecord } | null>(null);
  const [error, setError] = useState(false); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true; setData(null); setError(false);
    const timeout = setTimeout(() => { live = false; setError(true); }, 20000);
    async function load() {
      const [settings, customer, staff, records] = await Promise.all([getIndustryFormSettings(), getCustomerById(id), getStaffList(), editing ? getKarteByCustomer(id) : Promise.resolve([])]);
      const record = records.find(r => r.id === karteId);
      if (!customer || (editing && !record)) throw new Error('not found');
      const template = editing ? record?.form_snapshot || templateById('eyelash-karte-v1', 'karte') : templateById(settings.karteTemplateId, 'karte');
      if (live) setData({ template, name: customer.name, staff, record });
    }
    load().catch(() => { if (live) setError(true); }).finally(() => clearTimeout(timeout));
    return () => { live = false; clearTimeout(timeout); };
  }, [id, karteId, editing, attempt]);
  if (error) return <div className="p-8" role="alert">カルテを読み込めませんでした。<button className="underline ml-3" onClick={() => setAttempt(a => a + 1)}>再読み込み</button></div>;
  if (!data) return <p className="p-8">カルテを読み込み中…</p>;
  if (data.template.legacy) return children;
  return <IndustryKarteForm customerId={id} customerName={data.name} template={data.template} staff={data.staff} initial={data.record} />;
}
