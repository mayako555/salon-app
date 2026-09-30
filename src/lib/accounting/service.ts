import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import type { Firestore, Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { adminDb } from '../firebase-admin';
import { getCurrentUserContext } from '../auth-server';
import { getSaleGrossAmount } from '../sales-metrics';
import { AccountingError, accountingPermission, validId, digest, deliveryId, dateValue, amountValue, validateMapping, type Token, type Candidate, type Mapping, type Connection, type ProviderId } from './model';
import { seal, unseal, checkVault } from './vault';
import { getProvider, providerConfig } from './providers';
const database = adminDb as Firestore;
export async function scope(write = false) {
    const ctx = await getCurrentUserContext();
    const tenant = accountingPermission(ctx, write);
    return { ctx, tenant, root: database.collection('companies').doc(tenant) };
}
type Scope = Awaited<ReturnType<typeof scope>>;
function audit(s: Scope, event: string, extra: Record<string, unknown> = {}) {
    return { companyId: s.tenant, userId: s.ctx.uid, provider: 'freee', event, timestamp: new Date().toISOString(), ...extra };
}
export async function startOAuth(provider: ProviderId = 'freee') {
    const s = await scope(true);
    checkVault();
    const c = providerConfig(provider);
    const verifier = randomBytes(32).toString('base64url');
    const raw = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session)
        throw new AccountingError('AUTH', '再ログインしてください。');
    await s.root.collection('accounting_oauth_states').doc(digest(raw)).create({ uid: s.ctx.uid, companyId: s.tenant, nonceHash: digest(nonce), sessionHash: digest(session), provider, verifier: seal(verifier, s.tenant, digest(raw)), expiresAt: Date.now() + 600000, used: false });
    cookieStore.set('accounting_oauth', nonce, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/accounting', maxAge: 600 });
    return getProvider(provider).connect(raw, c.redirect, createHash('sha256').update(verifier).digest('base64url'));
}
export async function finishOAuth(state: string, code: string, provider: ProviderId = 'freee') {
    const s = await scope(true);
    const jar = await cookies();
    const nonce = jar.get('accounting_oauth')?.value;
    const session = jar.get('session')?.value;
    if (!/^[\w-]{43}$/.test(state) || !nonce || !session || !code || code.length > 4096)
        throw new AccountingError('STATE', '認証を最初からやり直してください。');
    const ref = s.root.collection('accounting_oauth_states').doc(digest(state));
    const verifier = await database.runTransaction(async (tx: Transaction) => {
        const d = (await tx.get(ref)).data();
        if (!d || d.provider !== provider || d.used || d.expiresAt < Date.now() || d.companyId !== s.tenant || d.uid !== s.ctx.uid || d.nonceHash !== digest(nonce) || d.sessionHash !== digest(session))
            throw new AccountingError('STATE', '認証を最初からやり直してください。');
        tx.update(ref, { used: true });
        return unseal<string>(d.verifier, s.tenant, digest(state));
    });
    jar.delete({ name: 'accounting_oauth', path: '/api/accounting' });
    const token = await getProvider(provider).exchange(code, providerConfig(provider).redirect, verifier);
    const companies = await getProvider(provider).getCompanies(token.access_token);
    if (!companies.length)
        throw new AccountingError('COMPANY', '接続できる事業所がありません。');
    const credential = s.root.collection('accounting_credentials').doc();
    const batch = database.batch();
    batch.create(credential, { companyId: s.tenant, provider, sealed: seal(token, s.tenant, credential.id), expiresAt: Date.now() + token.expires_in * 1000, status: 'active', refreshing: false, companies, createdAt: new Date().toISOString() });
    batch.create(s.root.collection('accounting_audit_logs').doc(), audit(s, 'ACCOUNTING_CONNECTED', { credentialId: credential.id, provider }));
    await batch.commit();
}
async function connection(s: Scope, id: string): Promise<Connection> {
    const d = (await s.root.collection('accounting_connections').doc(validId(id)).get()).data();
    if (!d || d.companyId !== s.tenant || d.status === 'disconnected')
        throw new AccountingError('CONNECTION', '接続先を確認してください。');
    return { id, provider: d.provider, providerCompanyId: d.providerCompanyId, companyName: d.companyName, credentialId: d.credentialId, status: d.status, lastSyncedAt: d.lastSyncedAt || null };
}
async function tokenFor(s: Scope, c: Connection, force = false): Promise<string> {
    const ref = s.root.collection('accounting_credentials').doc(validId(c.credentialId));
    let refreshToken = '';
    const existing = await database.runTransaction(async (tx: Transaction) => {
        const d = (await tx.get(ref)).data();
        if (!d || d.companyId !== s.tenant || d.status !== 'active')
            throw new AccountingError('REAUTH', '会計ソフトとの連携が切れています。再連携してください。');
        if (d.refreshing)
            throw new AccountingError('REFRESH_PENDING', '認証更新中です。更新結果を確認できない場合は再連携してください。');
        const token = unseal<Token>(d.sealed, s.tenant, c.credentialId);
        if (!force && d.expiresAt > Date.now() + 60000)
            return token.access_token;
        refreshToken = token.refresh_token;
        tx.update(ref, { refreshing: true });
        return '';
    });
    if (existing)
        return existing;
    try {
        const updated = await getProvider(c.provider).refreshToken(refreshToken);
        await database.runTransaction(async (tx: Transaction) => {
            const d = (await tx.get(ref)).data();
            if (d?.status !== 'active' || !d.refreshing)
                throw new AccountingError('REAUTH', '再連携してください。');
            tx.update(ref, { sealed: seal(updated, s.tenant, c.credentialId), expiresAt: Date.now() + updated.expires_in * 1000, refreshing: false });
            tx.create(s.root.collection('accounting_audit_logs').doc(), audit(s, 'ACCOUNTING_TOKEN_REFRESHED', { credentialId: c.credentialId, provider: c.provider }));
        });
        return updated.access_token;
    }
    catch {
        await ref.update({ status: 'reauth_required', refreshing: false });
        throw new AccountingError('REAUTH', '会計ソフトとの連携が切れています。再連携してください。');
    }
}
export async function selectCompany(credentialId: string, companyId: string) {
    const s = await scope(true);
    const ref = s.root.collection('accounting_credentials').doc(validId(credentialId));
    const d = (await ref.get()).data();
    if (!d || d.companyId !== s.tenant || d.status !== 'active')
        throw new AccountingError('REAUTH', '認証を確認してください。');
    const company = d.companies.find((c: {
        id: string;
    }) => c.id === companyId);
    if (!company)
        throw new AccountingError('COMPANY', '認可された事業所を選択してください。');
    const id = digest([d.provider, companyId]);
    await database.runTransaction(async (tx: Transaction) => {
        const conn = s.root.collection('accounting_connections').doc(id);
        const old = (await tx.get(conn)).data();
        tx.set(conn, { companyId: s.tenant, provider: d.provider, providerCompanyId: companyId, companyName: company.name, credentialId, legalEntityId: 'default', status: 'connected', lastSyncedAt: old?.lastSyncedAt || null, updatedAt: new Date().toISOString() });
        tx.create(s.root.collection('accounting_audit_logs').doc(), audit(s, 'ACCOUNTING_CONNECTED', { connectionId: id, provider: d.provider }));
    });
}
export async function getOverview() {
    const s = await scope();
    const [cons, creds, runs, maps, exports] = await Promise.all(['accounting_connections', 'accounting_credentials', 'accounting_sync_runs', 'accounting_mappings', 'accounting_csv_exports'].map(n => n === 'accounting_sync_runs' ? s.root.collection(n).orderBy('createdAt', 'desc').limit(30).get() : s.root.collection(n).get()));
    const configured: Record<string, boolean> = {};
    for (const p of ['freee', 'moneyforward'] as const) {
        try {
            checkVault();
            providerConfig(p);
            configured[p] = true;
        }
        catch {
            configured[p] = false;
        }
    }
    const credentials = creds.docs.map((d: DocumentSnapshot) => ({ id: d.id, ...d.data() }));
    return { exports: exports.docs.map(d => ({ id: d.id, ...d.data() })), configured, canWrite: s.ctx.role !== 'accountant', connections: cons.docs.map((d: DocumentSnapshot) => {
            const v = d.data()!;
            const credential = credentials.find((c: any) => c.id === v.credentialId) as any;
            return { id: d.id, provider: v.provider, providerCompanyId: v.providerCompanyId, companyName: v.companyName, status: v.status === 'disconnected' ? 'disconnected' : credential?.status !== 'active' ? 'reauth_required' : credential.refreshing ? 'reauth_required' : v.status, lastSyncedAt: v.lastSyncedAt || null };
        }), pending: credentials.filter((d: any) => d.status === 'active').map((d: any) => ({ id: d.id, provider: d.provider, companies: d.companies })),
        runs: runs.docs.map((d: DocumentSnapshot) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30),
        mappings: maps.docs.map((d: DocumentSnapshot) => ({ id: d.id, ...d.data() })) };
}
export async function disconnect(id: string) {
    const s = await scope(true);
    const c = await connection(s, id);
    // Shared credentials are disconnected together; delivery records survive reconnects.
    const cons = await s.root.collection('accounting_connections').where('credentialId', '==', c.credentialId).get();
    const ref = s.root.collection('accounting_credentials').doc(c.credentialId);
    const d = (await ref.get()).data();
    const batch = database.batch();
    batch.update(ref, { status: 'disconnected', sealed: null, refreshing: false });
    cons.docs.forEach((v: DocumentSnapshot) => batch.update(v.ref, { status: 'disconnected' }));
    batch.create(s.root.collection('accounting_audit_logs').doc(), audit(s, 'ACCOUNTING_DISCONNECTED', { connectionId: id, provider: c.provider }));
    await batch.commit();
    if (d?.sealed) {
        try {
            const t = unseal<Token>(d.sealed, s.tenant, c.credentialId);
            await getProvider(c.provider).disconnect(t.access_token);
        }
        catch {
            return { revoked: false };
        }
    }
    return { revoked: true };
}
export async function accounts(id: string) {
    const s = await scope();
    const c = await connection(s, id);
    let token = await tokenFor(s, c);
    try {
        return await getProvider(c.provider).getAccounts(token, c.providerCompanyId);
    }
    catch (e) {
        if (!(e instanceof AccountingError) || e.code !== 'REAUTH')
            throw e;
        token = await tokenFor(s, c, true);
        return getProvider(c.provider).getAccounts(token, c.providerCompanyId);
    }
}
export async function saveMapping(id: string, m: Mapping) {
    const s = await scope(true);
    const c = await connection(s, id);
    const clean = validateMapping(m);
    const list = await accounts(id);
    if (!list.some(a => a.id === clean.accountId) || (c.provider === 'moneyforward' && !list.some(a => a.id === clean.offsetAccountId)))
        throw new AccountingError('MAPPING', '接続先の勘定科目を選んでください。');
    await s.root.collection('accounting_mappings').doc(digest([id, m.category])).set({ ...clean, connectionId: id, companyId: s.tenant });
}
export async function candidates(s: Scope, from: string, to: string): Promise<Candidate[]> {
    dateValue(from);
    dateValue(to);
    if (from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000)
        throw new AccountingError('RANGE', '期間は1年以内にしてください。');
    const result: Candidate[] = [];
    for (const kind of ['sale', 'expense'] as const) {
        const snap = await database.collection(kind === 'sale' ? 'sales_master' : 'expenses').where('companyId', '==', s.tenant).where('date', '>=', from).where('date', '<=', to).limit(501).get();
        if (snap.size > 500)
            throw new AccountingError('LIMIT', '対象が多いため期間を短くしてください。');
        for (const doc of snap.docs) {
            const d = doc.data();
            if (d.companyId !== s.tenant)
                throw new AccountingError('TENANT', '事業者情報を確認してください。');
            if (kind === 'sale' && (d.status !== 'closed' || d.is_cancelled || d.merged_into_id || ['DELETED', 'MERGED_SOURCE'].includes(d.merge_status) || d.source === 'csv_estimated'))
                continue;
            const amount = kind === 'sale' ? getSaleGrossAmount({ tech_sales: d.tech_sales, product_sales: d.product_sales, nomination_fee: d.nomination_fee, cancel_fee: d.cancel_fee, discount: d.discount }) : d.amount;
            if (!Number.isSafeInteger(amount) || amount <= 0)
                continue;
            const item = { id: doc.id, kind, date: d.date, amount, category: kind === 'sale' ? '売上' : String(d.category || 'その他'), store: String(d.store_name || ''), memo: [d.counterparty, d.description || d.note].filter(Boolean).join(' '), payment: String(d.paymentMethod || d.payment_method || '未設定'), source: kind === 'sale' ? 'manual' : d.source || (d.is_imported ? 'csv' : 'manual') };
            result.push({ ...item, sourceHash: digest(d) } as Candidate);
        }
    }
    return result;
}
export async function preview(id: string, from: string, to: string) {
    const s = await scope(true);
    const c = await connection(s, id);
    const items = await candidates(s, from, to);
    const mapSnap = await s.root.collection('accounting_mappings').where('connectionId', '==', id).get();
    const mappings = mapSnap.docs.map((d: DocumentSnapshot) => d.data() as Mapping);
    const exports = await s.root.collection('accounting_csv_exports').get();
    const rows = [];
    for (const item of items) {
        const delivery = (await s.root.collection('accounting_deliveries').doc(deliveryId(s.tenant, c, item)).get()).data();
        const mapping = mappings.find((m: Mapping) => m.category === item.category);
        const csvBlocked = exports.docs.some(d => { const e = d.data(); return e.status !== 'not_imported' && (e.provider === c.provider || (e.provider === 'yayoi_online' && c.provider === 'yayoi')) && e.sourceIds.includes(item.kind + ':' + item.id); });
        rows.push({ ...item, mapping: mapping || null, status: csvBlocked ? 'csv_review' : delivery?.status || 'pending', blocked: csvBlocked || !!delivery || !mapping || item.source === c.provider });
    }
    if (rows.length > 100)
        throw new AccountingError('LIMIT', '一度に100件までです。期間を短くしてください。');
    const ref = s.root.collection('accounting_sync_runs').doc();
    await ref.create({ companyId: s.tenant, connectionId: id, provider: c.provider, companyName: c.companyName, from, to, createdAt: new Date().toISOString(), status: 'preview', rows });
    return { id: ref.id, rows };
}
export async function approve(runId: string, ids: string[]) {
    const s = await scope(true);
    const ref = s.root.collection('accounting_sync_runs').doc(validId(runId));
    if (!ids.length || ids.length > 100)
        throw new AccountingError('EMPTY', '送信する行を選んでください。');
    await database.runTransaction(async (tx: Transaction) => {
        const d = (await tx.get(ref)).data();
        if (!d || d.companyId !== s.tenant || d.status !== 'preview')
            throw new AccountingError('RUN', '候補を作り直してください。');
        const rows = d.rows.filter((r: Candidate & {
            blocked: boolean;
        }) => ids.includes(r.kind + ':' + r.id));
        if (rows.length !== new Set(ids).size || rows.some((r: {
            blocked: boolean;
        }) => r.blocked))
            throw new AccountingError('RUN', '送信対象を確認してください。');
        tx.update(ref, { rows, status: 'approved', approvedBy: s.ctx.uid, approvedAt: new Date().toISOString() });
        tx.create(s.root.collection('accounting_audit_logs').doc(), audit(s, 'ACCOUNTING_SYNC_STARTED', { runId, provider: d.provider }));
    });
}
export async function executeOne(runId: string) {
    const s = await scope(true);
    const ref = s.root.collection('accounting_sync_runs').doc(validId(runId));
    const run = (await ref.get()).data();
    if (!run || run.companyId !== s.tenant || !['approved', 'partial', 'running'].includes(run.status))
        throw new AccountingError('RUN', '承認済みの同期を選んでください。');
    const c = await connection(s, run.connectionId);
    const token = await tokenFor(s, c);
    const row = run.rows.find((r: any) => ['pending', 'failed'].includes(r.status));
    if (!row)
        return { done: true };
    const source = await database.collection(row.kind === 'sale' ? 'sales_master' : 'expenses').doc(validId(row.id)).get();
    if (source.data()?.companyId !== s.tenant || digest(source.data()) !== row.sourceHash)
        throw new AccountingError('STALE', '元データが変更されています。候補を作り直してください。');
    const ledger = s.root.collection('accounting_deliveries').doc(deliveryId(s.tenant, c, row));
    await database.runTransaction(async (tx: Transaction) => {
        const [rs, ls, cs] = await Promise.all([tx.get(ref), tx.get(ledger), tx.get(s.root.collection('accounting_credentials').doc(c.credentialId))]);
        const current = rs.data();
        const existing = ls.data();
        if (cs.data()?.status !== 'active' || !current || !['approved', 'partial', 'running'].includes(current.status))
            throw new AccountingError('RUN', '同期を実行できません。');
        if (existing && !(existing.status === 'failed' && existing.runId === runId))
            throw new AccountingError('DUPLICATE', '送信済み、または結果確認が必要です。');
        const rows = current.rows.map((r: any) => r.kind === row.kind && r.id === row.id ? { ...r, status: 'sending' } : r);
        tx.set(ledger, { companyId: s.tenant, runId, status: 'sending', sourceId: row.id, kind: row.kind, sourceHash: row.sourceHash, updatedAt: new Date().toISOString() });
        tx.update(ref, { rows, status: 'running' });
    });
    let externalId = '', status = 'succeeded', error = '';
    try {
        try {
            externalId = await getProvider(c.provider).createTransaction(token, c.providerCompanyId, row, row.mapping, ledger.id.slice(0, 24));
        }
        catch (e) {
            if (!(e instanceof AccountingError) || e.code !== 'REAUTH' || e.uncertain)
                throw e;
            const refreshed = await tokenFor(s, c, true);
            externalId = await getProvider(c.provider).createTransaction(refreshed, c.providerCompanyId, row, row.mapping, ledger.id.slice(0, 24));
        }
    }
    catch (e) {
        status = e instanceof AccountingError && !e.uncertain ? 'failed' : 'uncertain';
        error = e instanceof AccountingError ? e.message : '処理結果を確認してください。';
    }
    await database.runTransaction(async (tx: Transaction) => {
        const latest = (await tx.get(ref)).data()!;
        const rows = latest.rows.map((r: any) => r.kind === row.kind && r.id === row.id ? { ...r, status, error, externalId } : r);
        const done = rows.every((r: any) => !['pending', 'sending'].includes(r.status));
        const allOk = rows.every((r: any) => r.status === 'succeeded');
        tx.update(ledger, { status, externalId, error, updatedAt: new Date().toISOString() });
        tx.update(ref, { rows, status: done ? (allOk ? 'completed' : 'partial') : 'approved' });
        if (status === 'succeeded')
            tx.update(s.root.collection('accounting_connections').doc(c.id), { lastSyncedAt: new Date().toISOString() });
        if (done)
            tx.create(s.root.collection('accounting_audit_logs').doc(), audit(s, allOk ? 'ACCOUNTING_SYNC_COMPLETED' : 'ACCOUNTING_SYNC_FAILED', { runId, provider: c.provider }));
    });
    return { done: status !== 'succeeded', status };
}
export async function markCsvNotImported(id: string) {
    const s = await scope(true);
    const ref = s.root.collection('accounting_csv_exports').doc(validId(id));
    await database.runTransaction(async (tx: Transaction) => { const d = (await tx.get(ref)).data(); if (!d || d.companyId !== s.tenant)
        throw new AccountingError('CSV', '出力履歴を確認してください。'); tx.update(ref, { status: 'not_imported', confirmedBy: s.ctx.uid, confirmedAt: new Date().toISOString() }); tx.create(s.root.collection('accounting_audit_logs').doc(), audit(s, 'ACCOUNTING_CSV_NOT_IMPORTED', { provider: d.provider, exportId: id })); });
}
export async function excludeRows(runId: string, ids: string[]) {
    const s = await scope(true);
    const ref = s.root.collection('accounting_sync_runs').doc(validId(runId));
    const run = (await ref.get()).data();
    if (!run || run.companyId !== s.tenant || run.status !== 'preview' || !ids.length)
        throw new AccountingError('RUN', '確認前の候補を選んでください。');
    const c = await connection(s, run.connectionId);
    await database.runTransaction(async (tx: Transaction) => {
        const latest = (await tx.get(ref)).data();
        if (latest?.status !== 'preview')
            throw new AccountingError('RUN', '候補を作り直してください。');
        const rows = latest.rows.filter((r: Candidate) => ids.includes(r.kind + ':' + r.id));
        if (rows.length !== new Set(ids).size)
            throw new AccountingError('RUN', '対象を確認してください。');
        const refs = rows.map((r: Candidate) => s.root.collection('accounting_deliveries').doc(deliveryId(s.tenant, c, r)));
        const docs = await Promise.all(refs.map((r: import('firebase-admin/firestore').DocumentReference) => tx.get(r)));
        if (docs.some(d => d.exists))
            throw new AccountingError('RUN', '既に送信済み、または処理中の行があります。');
        rows.forEach((r: Candidate, index: number) => tx.create(refs[index], { companyId: s.tenant, status: 'excluded', sourceId: r.id, kind: r.kind, runId }));
        tx.update(ref, { rows: latest.rows.map((r: Candidate) => ids.includes(r.kind + ':' + r.id) ? { ...r, status: 'excluded', blocked: true } : r) });
        tx.create(s.root.collection('accounting_audit_logs').doc(), audit(s, 'ACCOUNTING_EXCLUDED', { runId, provider: c.provider, count: rows.length }));
    });
}
