'use server';
import * as service from '@/lib/accounting/service';
import { AccountingError, standardCsv, type ProviderId, type Mapping } from '@/lib/accounting/model';
async function safe<T>(fn: () => Promise<T>) { try {
    return { ok: true as const, data: await fn() };
}
catch (e) {
    return { ok: false as const, error: e instanceof AccountingError ? e.message : '処理できませんでした。ログイン状態と設定を確認してください。' };
} }
export async function overview() { return safe(() => service.getOverview()); }
export async function connectFreee(provider: ProviderId = 'freee') { return safe(() => service.startOAuth(provider)); }
export async function chooseCompany(credential: string, company: string) { return safe(() => service.selectCompany(credential, company)); }
export async function disconnectAccounting(id: string) { return safe(() => service.disconnect(id)); }
export async function getAccounts(id: string) { return safe(() => service.accounts(id)); }
export async function setMapping(id: string, m: Mapping) { return safe(() => service.saveMapping(id, m)); }
export async function createPreview(id: string, from: string, to: string) { return safe(() => service.preview(id, from, to)); }
export async function approveRun(id: string, ids: string[]) { return safe(() => service.approve(id, ids)); }
export async function sendNext(id: string) { return safe(() => service.executeOne(id)); }
export async function exportStandard(from: string, to: string) { return safe(async () => standardCsv(await service.candidates(await service.scope(), from, to))); }
export async function exportProviderCsv(from: string, to: string, format: import('@/lib/accounting/csv').CsvFormat, mapping: import('@/lib/accounting/csv').CsvMapping) {
    return safe(async () => {
        const { accountingCsv } = await import('@/lib/accounting/csv');
        const s = await service.scope();
        const items = (await service.candidates(s, from, to)).filter(i => i.category === mapping.category);
        const csv = accountingCsv(format, items, mapping);
        await s.root.collection('accounting_csv_exports').add({ companyId: s.tenant, provider: format, userId: s.ctx.uid, createdAt: new Date().toISOString(), status: 'exported', sourceIds: items.map(i => i.kind + ':' + i.id), count: items.length });
        return { csv, count: items.length };
    });
}
export async function confirmCsvNotImported(id: string) { return safe(() => service.markCsvNotImported(id)); }
export async function excludeFromSync(runId: string, ids: string[]) { return safe(() => service.excludeRows(runId, ids)); }
