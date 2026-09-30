'use server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import type { Firestore, DocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { scope } from '@/lib/accounting/service';
import { AccountingError, DEFAULT_CATEGORIES, amountValue, dateValue, digest, duplicateExpense, validId } from '@/lib/accounting/model';
import * as Papa from 'papaparse';
const database = adminDb as Firestore;
export type Entry = {
    date: string;
    amount: number;
    category: string;
    paymentMethod: string;
    store_name: string;
    counterparty: string;
    description: string;
};
async function safe<T>(fn: () => Promise<T>) { try {
    return { ok: true as const, data: await fn() };
}
catch (e) {
    return { ok: false as const, error: e instanceof AccountingError ? e.message : '保存できませんでした。ログイン状態と入力内容を確認してください。' };
} }
function clean(input: Entry): Entry {
    const string = (v: unknown, max: number) => { if (typeof v !== 'string' || v.length > max)
        throw new AccountingError('INVALID', '入力内容が長すぎるか不正です。'); return v.trim(); };
    const row = { date: dateValue(input.date), amount: amountValue(input.amount), category: string(input.category, 100), paymentMethod: string(input.paymentMethod, 60), store_name: string(input.store_name, 100), counterparty: string(input.counterparty, 200), description: string(input.description, 1000) };
    if (!row.category || !row.store_name || !row.paymentMethod)
        throw new AccountingError('INVALID', 'カテゴリ・支払方法・店舗を入力してください。');
    return row;
}
export async function expenseSettings() {
    return safe(async () => {
        const s = await scope();
        const [settings, cats, list] = await Promise.all([s.root.collection('accounting_preferences').doc('expenses').get(), s.root.collection('expense_categories').get(), database.collection('expenses').where('companyId', '==', s.tenant).orderBy('date', 'desc').limit(100).get()]);
        const saved=cats.docs.map(d=>({id:d.id,name:String(d.data().name)}));
        const categories=[...DEFAULT_CATEGORIES.map((name,index)=>saved.find(c=>c.id===`default_${index}`)||({id:`default_${index}`,name})),...saved.filter(c=>!/^default_[0-8]$/.test(c.id))];
        return { method: settings.data()?.method || 'manual', categories: Array.from(new Set(categories.map(c=>c.name))), customCategories: categories, rows: list.docs.map((d: DocumentSnapshot) => { const r = d.data()!; return { id: d.id, date: r.date, amount: r.amount, category: r.category, store_name: r.store_name, description: r.description, paymentMethod: r.paymentMethod || '未設定', counterparty: r.counterparty || '', source: r.source || (r.is_imported ? 'csv' : 'manual'), receiptId: r.receiptId || null }; }) };
    });
}
export async function setExpenseMethod(method: string) { return safe(async () => { const s = await scope(true); if (!['manual', 'api', 'csv'].includes(method))
    throw new AccountingError('INVALID', '管理方法を選んでください。'); await s.root.collection('accounting_preferences').doc('expenses').set({ method }); }); }
export async function saveCategory(name: string, id?: string) { return safe(async () => { const s = await scope(true); if (!name.trim() || name.length > 100)
    throw new AccountingError('INVALID', 'カテゴリ名を入力してください。'); const ref = s.root.collection('expense_categories').doc(id ? validId(id) : digest(name.trim())); await ref.set({ name: name.trim(), companyId: s.tenant }); }); }
export async function prepareExpenses(rows: Entry[], source: 'manual' | 'csv') {
    return safe(async () => {
        const s = await scope(true);
        if (!['manual', 'csv'].includes(source) || !rows.length || rows.length > 100)
            throw new AccountingError('INVALID', '一度に100件まで登録できます。');
        const cleaned = rows.map(clean);
        const dates = cleaned.map(r => r.date).sort();
        const snap = await database.collection('expenses').where('companyId', '==', s.tenant).where('date', '>=', dates[0]).where('date', '<=', dates[dates.length - 1]).get();
        const existing = snap.docs.map((d: DocumentSnapshot) => d.data() as Entry);
        const preview = cleaned.map((r, index) => ({ ...r, index, duplicate: existing.some((e: Entry) => duplicateExpense(r, e)) || cleaned.slice(0, index).some(e => duplicateExpense(r, e)) }));
        const ref = s.root.collection('expense_import_batches').doc();
        await ref.create({ companyId: s.tenant, uid: s.ctx.uid, source, rows: preview, status: 'preview', createdAt: Date.now() });
        return { id: ref.id, rows: preview };
    });
}
export async function prepareCsv(text: string) {
    if (typeof text !== 'string' || text.length > 200000)
        return { ok: false as const, error: 'CSVは200KB以内にしてください。' };
    const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true });
    if (parsed.errors.length)
        return { ok: false as const, error: 'CSVの列数・引用符を確認してください。' };
    return prepareExpenses(parsed.data.map(r => ({ date: r['日付'], amount: Number(r['金額']), category: r['カテゴリ'], paymentMethod: r['支払方法'] || '未設定', store_name: r['店舗'], counterparty: r['取引先'] || '', description: r['摘要'] || '' })), 'csv');
}
export async function commitExpenses(batchId: string, selected: number[], duplicateConfirmed: boolean, receipt?: FormData) {
    return safe(async () => {
        const s = await scope(true);
        const ref = s.root.collection('expense_import_batches').doc(validId(batchId));
        if (!Array.isArray(selected) || !selected.length || selected.length > 100 || selected.some(i => !Number.isInteger(i)))
            throw new AccountingError('INVALID', '登録する行を選んでください。');
        const file = receipt?.get('receipt');
        let image: {
            data: string;
            mime: string;
        } | null = null;
        if (file instanceof File && file.size) {
            if (file.size > 450000)
                throw new AccountingError('FILE', '領収書画像は450KB以内にしてください。');
            const buffer = Buffer.from(await file.arrayBuffer());
            const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
            const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
            if (!png && !jpeg)
                throw new AccountingError('FILE', 'PNGまたはJPEG画像を選んでください。');
            image = { data: buffer.toString('base64'), mime: png ? 'image/png' : 'image/jpeg' };
        }
        await database.runTransaction(async (tx: Transaction) => {
            const d = (await tx.get(ref)).data();
            if (!d || d.companyId !== s.tenant || d.uid !== s.ctx.uid || d.status !== 'preview' || Date.now() - d.createdAt > 3600000)
                throw new AccountingError('BATCH', '確認画面を作り直してください。');
            const rows = d.rows.filter((r: {
                index: number;
            }) => selected.includes(r.index));
            if (rows.length !== new Set(selected).size || rows.some((r: {
                duplicate: boolean;
            }) => r.duplicate) && !duplicateConfirmed)
                throw new AccountingError('DUPLICATE', '同じ経費の可能性があります。重複候補を確認してください。');
            const dates = rows.map((r: Entry) => r.date).sort();
            const recent = await tx.get(database.collection('expenses').where('companyId', '==', s.tenant).where('date', '>=', dates[0]).where('date', '<=', dates[dates.length - 1]));
            if (!duplicateConfirmed && rows.some((row: Entry) => recent.docs.some(doc => duplicateExpense(row, doc.data() as Entry))))
                throw new AccountingError('DUPLICATE', '確認後に同じ経費が登録されています。重複候補を確認してください。');
            if (image && rows.length !== 1)
                throw new AccountingError('FILE', '領収書は1件の手入力経費に添付してください。');
            for (const row of rows) {
                const id = digest([s.tenant, batchId, row.index]);
                const record = database.collection('expenses').doc(id);
                const receiptId = image ? randomUUID() : null;
                tx.create(record, { ...clean(row), companyId: s.tenant, source: d.source, is_imported: d.source === 'csv', staff_id: s.ctx.profileId || s.ctx.uid, staff_name: '', import_batch_id: batchId, receiptId, created_at: new Date() });
                if (image)
                    tx.create(s.root.collection('expense_receipts').doc(receiptId!), { ...image, companyId: s.tenant, expenseId: id });
            }
            tx.update(ref, { status: 'committed', committedAt: Date.now(), count: rows.length });
            tx.create(s.root.collection('accounting_audit_logs').doc(), { event: 'EXPENSES_CREATED', companyId: s.tenant, userId: s.ctx.uid, count: rows.length, timestamp: new Date().toISOString() });
        });
        revalidatePath('/admin/expenses');
        revalidatePath('/staff-portal/expenses');
        return { count: selected.length };
    });
}
