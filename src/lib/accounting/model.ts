import { createHash } from 'node:crypto';
import type { UserContext } from '../authorization';
export type ProviderId = 'freee' | 'moneyforward' | 'yayoi';
export type Source = 'manual' | ProviderId | 'csv';
export type Token = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
};
export type Company = {
    id: string;
    name: string;
};
export type Account = {
    id: number | string;
    name: string;
};
export type Candidate = {
    id: string;
    kind: 'sale' | 'expense';
    date: string;
    amount: number;
    category: string;
    store: string;
    memo: string;
    payment: string;
    source: Source;
    sourceHash: string;
};
export type Mapping = {
    category: string;
    accountId: number | string;
    taxCode: number | string;
    offsetAccountId?: string;
    offsetTaxId?: string;
    settlement: 'unsettled';
    confirmed: boolean;
};
export type Connection = {
    id: string;
    provider: ProviderId;
    providerCompanyId: string;
    companyName: string;
    credentialId: string;
    status: string;
    lastSyncedAt: string | null;
};
export class AccountingError extends Error {
    constructor(public code: string, message: string, public uncertain = false) { super(message); }
}
export function accountingPermission(ctx: UserContext, write = false) {
    if (!ctx.companyId || !['companyOwner', 'admin', 'accountant'].includes(ctx.role) || ctx.isImpersonating || (write && ctx.role === 'accountant')) {
        throw new AccountingError('FORBIDDEN', '事業者オーナーまたは管理者の権限が必要です。');
    }
    return ctx.companyId;
}
export function validId(value: string) {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(value))
        throw new AccountingError('INVALID', '識別子が不正です。');
    return value;
}
export function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function deliveryId(companyId: string, connection: Pick<Connection, 'provider' | 'providerCompanyId'>, item: Pick<Candidate, 'kind' | 'id'>) {
    return digest([companyId, connection.provider, connection.providerCompanyId, item.kind, item.id]);
}
export function dateValue(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
        throw new AccountingError('INVALID', '日付を確認してください。');
    return value;
}
export function amountValue(value: number) {
    if (!Number.isSafeInteger(value) || value <= 0 || value > 1000000000)
        throw new AccountingError('INVALID', '金額は1円以上の整数で入力してください。');
    return value;
}
export function validateMapping(m: Mapping): Mapping {
    const id = (v: unknown) => typeof v === 'number' ? Number.isSafeInteger(v) && v >= 0 : typeof v === 'string' && v.length > 0 && v.length < 200;
    if (!m.category?.trim() || m.category.length > 100 || !id(m.accountId) || !id(m.taxCode) || m.settlement !== 'unsettled' || m.confirmed !== true)
        throw new AccountingError('INVALID', '科目・税区分と未決済での登録を確認してください。');
    return { category: m.category.trim(), accountId: m.accountId, taxCode: m.taxCode, settlement: 'unsettled', confirmed: true, ...(m.offsetAccountId ? { offsetAccountId: m.offsetAccountId, offsetTaxId: m.offsetTaxId || '' } : {}) };
}
export function moneyForwardPayload(item: Candidate, m: Mapping, reference: string) {
    validateMapping(m);
    dateValue(item.date);
    amountValue(item.amount);
    if (!m.offsetAccountId || !m.offsetTaxId || typeof m.accountId !== 'string' || typeof m.taxCode !== 'string')
        throw new AccountingError('MAPPING', '相手科目と両側の税区分を設定してください。');
    const main = { account_id: m.accountId, tax_id: m.taxCode, value: item.amount };
    const offset = { account_id: m.offsetAccountId, tax_id: m.offsetTaxId, value: item.amount };
    return { journal: { transaction_date: item.date, journal_type: 'journal_entry', memo: 'SALON AGENT ' + reference, branches: [{ creditor: item.kind === 'sale' ? main : offset, debitor: item.kind === 'sale' ? offset : main, remark: `${item.store} / ${item.payment} / ${item.memo}`.slice(0, 200) }] } };
}
export function freeePayload(companyId: string, item: Candidate, m: Mapping, reference: string) {
    validateMapping(m);
    dateValue(item.date);
    amountValue(item.amount);
    if (typeof m.accountId !== "number" || m.accountId <= 0 || typeof m.taxCode !== "number" || m.taxCode > 2147483647)
        throw new AccountingError("MAPPING", "freeeの科目・税区分コードを確認してください。");
    if (!/^\d+$/.test(companyId) || Number(companyId) <= 0)
        throw new AccountingError('INVALID', '事業所IDを確認してください。');
    return { company_id: Number(companyId), issue_date: item.date, type: item.kind === 'sale' ? 'income' : 'expense', ref_number: reference,
        details: [{ account_item_id: m.accountId, tax_code: m.taxCode, amount: item.amount, description: `${item.store} / ${item.payment} / ${item.memo}`.slice(0, 200) }] };
}
export function csvCell(value: unknown) {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text))
        text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}
export function standardCsv(items: Candidate[]) {
    return '\uFEFF' + [['日付', '金額', 'カテゴリ', '支払方法', '店舗', '摘要', '入力元', '元レコードID'], ...items.map(i => [i.date, i.amount, i.category, i.payment, i.store, i.memo, i.source, i.id])].map(row => row.map(csvCell).join(',')).join('\r\n');
}
export const DEFAULT_CATEGORIES = ['材料費', '広告費', '家賃', '水道光熱費', '通信費', '消耗品', '交通費', '外注費', 'その他'];
export function duplicateExpense(a: {
    date: string;
    amount: number;
    store_name: string;
    counterparty?: string;
    description: string;
}, b: typeof a) {
    const normalize = (v?: string) => (v || '').normalize('NFKC').replace(/\s/g, '').toLowerCase();
    return a.date === b.date && a.amount === b.amount && normalize(a.store_name) === normalize(b.store_name) && normalize(a.counterparty) === normalize(b.counterparty) && normalize(a.description) === normalize(b.description);
}
