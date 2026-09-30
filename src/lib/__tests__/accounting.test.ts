import test from 'node:test';
import assert from 'node:assert/strict';
import { accountingPermission, deliveryId, dateValue, amountValue, duplicateExpense, freeePayload, moneyForwardPayload, standardCsv, validId, type Candidate, type Mapping } from '../accounting/model';
import { seal, unseal } from '../accounting/vault';
import { accountingCsv } from '../accounting/csv';
import Papa from 'papaparse';
import type { UserContext } from '../authorization';
const ctx: UserContext = { uid: 'owner', companyId: 'tenant-a', role: 'companyOwner', salonIds: [] };
const item: Candidate = { id: 'expense-1', kind: 'expense', date: '2026-09-30', amount: 1100, category: '材料費', store: '岡本', memo: 'テスト', payment: 'カード', source: 'manual', sourceHash: 'hash' };
const mapping: Mapping = { category: '材料費', accountId: 101, taxCode: 21, settlement: 'unsettled', confirmed: true };
test('accounting denies unscoped, staff, and impersonation even for system owners', () => {
    for (const c of [{ ...ctx, companyId: undefined }, { ...ctx, role: 'staff' as const }, { ...ctx, role: 'systemOwner' as const }, { ...ctx, isImpersonating: true }])
        assert.throws(() => accountingPermission(c, true));
    assert.equal(accountingPermission(ctx, true), 'tenant-a');
    assert.equal(accountingPermission({ ...ctx, role: 'accountant' }), 'tenant-a');
    assert.throws(() => accountingPermission({ ...ctx, role: 'accountant' }, true));
});
test('token ciphertext is bound to tenant and credential; tampering fails', () => {
    process.env.ACCOUNTING_KEY_V1 = Buffer.alloc(32, 7).toString('base64');
    const value = { access_token: 'secret-access', refresh_token: 'secret-refresh' };
    const encrypted = seal(value, 'tenant-a', 'credential-1');
    assert.ok(!JSON.stringify(encrypted).includes('secret-access'));
    assert.deepEqual(unseal(encrypted, 'tenant-a', 'credential-1'), value);
    assert.throws(() => unseal(encrypted, 'tenant-b', 'credential-1'));
    assert.throws(() => unseal(encrypted, 'tenant-a', 'credential-2'));
    assert.throws(() => unseal({ ...encrypted, tag: Buffer.alloc(16).toString('base64') }, 'tenant-a', 'credential-1'));
    assert.notEqual(seal(value, 'tenant-a', 'credential-1').iv, encrypted.iv);
});
test('missing encryption key fails closed', () => { const old = process.env.ACCOUNTING_KEY_V1; delete process.env.ACCOUNTING_KEY_V1; assert.throws(() => seal('x', 'a', 'b')); process.env.ACCOUNTING_KEY_V1 = old; });
test('delivery identity survives reconnection and edits but separates tenant/provider/company/type', () => {
    const c = { provider: 'freee' as const, providerCompanyId: '1' };
    const id = deliveryId('a', c, item);
    assert.equal(deliveryId('a', c, { ...item, amount: 2200 } as Candidate), id);
    for (const other of [deliveryId('b', c, item), deliveryId('a', { ...c, providerCompanyId: '2' }, item), deliveryId('a', { ...c, provider: 'moneyforward' }, item), deliveryId('a', c, { ...item, kind: 'sale' })])
        assert.notEqual(other, id);
});
test('validation rejects path traversal, invalid dates, and noninteger or negative amounts', () => {
    for (const id of ['../b', 'a/b', '', 'a'.repeat(200)])
        assert.throws(() => validId(id));
    for (const date of ['2026-02-30', '2026-13-01', '09/30/2026'])
        assert.throws(() => dateValue(date));
    for (const amount of [-1, 0, 1.5, NaN, Infinity])
        assert.throws(() => amountValue(amount));
    assert.equal(dateValue('2024-02-29'), '2024-02-29');
});
test('same-day same-amount expenses in different stores/vendors are not automatically duplicates', () => {
    const a = { date: '2026-09-30', amount: 1100, store_name: '岡本', counterparty: 'ABC', description: ' 材料 ' };
    assert.equal(duplicateExpense(a, { ...a, counterparty: 'ＡＢＣ', description: '材料' }), true);
    assert.equal(duplicateExpense(a, { ...a, store_name: '元町' }), false);
    assert.equal(duplicateExpense(a, { ...a, counterparty: '別会社' }), false);
});
test('freee sends explicit user tax and account with no fabricated cash settlement', () => {
    const p = freeePayload('1', item, mapping, 'reference');
    assert.equal(p.type, 'expense');
    assert.equal(p.details[0].amount, 1100);
    assert.equal(p.details[0].tax_code, 21);
    assert.ok(!('payments' in p));
    assert.throws(() => freeePayload('1', item, { ...mapping, confirmed: false }, 'r'));
    assert.throws(() => freeePayload('1', item, { ...mapping, accountId: 'opaque' }, 'r'));
});
test('MoneyForward reverses sides for revenue and keeps opaque account IDs', () => {
    const m = { ...mapping, accountId: 'opaque-income', taxCode: 'tax-id', offsetAccountId: 'receivable', offsetTaxId: 'not-taxable' };
    const p = moneyForwardPayload({ ...item, kind: 'sale' }, m, 'ref');
    assert.equal(p.journal.branches[0].creditor.account_id, 'opaque-income');
    assert.equal(p.journal.branches[0].debitor.account_id, 'receivable');
    assert.equal(p.journal.branches[0].creditor.value, p.journal.branches[0].debitor.value);
    assert.throws(() => moneyForwardPayload(item, { ...m, offsetAccountId: undefined }, 'r'));
});
test('CSV safely quotes multiline text and spreadsheet formulas', () => {
    const csv = standardCsv([{ ...item, memo: '=HYPERLINK("x")\nnext,line' }]);
    const parsed = Papa.parse<string[]>(csv).data;
    assert.equal(parsed[1][5], '\'=HYPERLINK("x")\nnext,line');
    assert.equal(parsed[1].length, 8);
});
const csvMapping = { category: '材料費', account: '消耗品費', tax: '課対仕入10%', offsetAccount: '未払金', offsetTax: '', invoice: '適格', confirmed: true };
test('provider CSV rows match documented column counts and directions', () => {
    for (const [format, columns, header] of [['freee', 21, true], ['moneyforward', 27, true], ['yayoi_online', 27, false]] as const) {
        const parsed = Papa.parse<string[]>(accountingCsv(format, [item], csvMapping)).data;
        assert.equal(parsed.length, header ? 2 : 1);
        for (const row of parsed)
            assert.equal(row.length, columns);
    }
    const yayoi = Papa.parse<string[]>(accountingCsv('yayoi_online', [item], csvMapping)).data[0];
    assert.equal(yayoi[4], '消耗品費');
    assert.equal(yayoi[10], '未払金');
    assert.equal(yayoi[8], yayoi[14]);
    assert.equal(yayoi[0], '2000');
});
test('CSV rejects unconfirmed tax decisions and mismatched categories', () => {
    assert.throws(() => accountingCsv('freee', [item], { ...csvMapping, confirmed: false }));
    assert.throws(() => accountingCsv('freee', [item], { ...csvMapping, category: '広告費' }));
    assert.throws(() => accountingCsv('moneyforward', [item], { ...csvMapping, invoice: '' }));
    assert.throws(() => accountingCsv('yayoi_online', [item], { ...csvMapping, account: '非常に長い科目名を勝手に切り捨てない' }));
});
test('HTTP adapter never blindly retries an uncertain write and redacts external responses', async () => {
    const { apiJson } = await import('../accounting/http');
    const original = globalThis.fetch;
    let calls = 0;
    try {
        globalThis.fetch = async () => { calls++; return new Response('sensitive-token', { status: 500 }); };
        await assert.rejects(apiJson('https://example.invalid', { method: 'POST' }), (e: any) => e.uncertain === true && !e.message.includes('sensitive-token'));
        assert.equal(calls, 1);
        calls = 0;
        globalThis.fetch = async () => { calls++; throw new Error('secret-access-token'); };
        await assert.rejects(apiJson('https://example.invalid', { method: 'POST' }), (e: any) => e.uncertain === true && !e.message.includes('secret-access-token'));
        assert.equal(calls, 1);
    }
    finally {
        globalThis.fetch = original;
    }
});
test('HTTP adapter bounds read retries and respects long Retry-After', async () => {
    const { apiJson } = await import('../accounting/http');
    const original = globalThis.fetch;
    let calls = 0;
    try {
        globalThis.fetch = async () => { calls++; return calls === 1 ? new Response('', { status: 503 }) : Response.json({ ok: true }); };
        assert.deepEqual(await apiJson('https://example.invalid', {}, true), { ok: true });
        assert.equal(calls, 2);
        calls = 0;
        globalThis.fetch = async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '120' } }); };
        await assert.rejects(apiJson('https://example.invalid', {}, true), (e: any) => e.code === 'RATE_LIMIT');
        assert.equal(calls, 1);
    }
    finally {
        globalThis.fetch = original;
    }
});
