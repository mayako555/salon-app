import { AccountingError, amountValue, csvCell, dateValue, digest, type Candidate } from './model';
export type CsvFormat = 'freee' | 'moneyforward' | 'yayoi_online';
export type CsvMapping = {
    category: string;
    account: string;
    tax: string;
    offsetAccount: string;
    offsetTax: string;
    invoice: string;
    confirmed: boolean;
};
const headerFreee = ['収支区分', '管理番号', '発生日', '決済期日', '取引先コード', '取引先', '勘定科目', '税区分', '金額', '税計算区分', '税額', '備考', '品目', '部門', 'メモタグ', 'セグメント1', 'セグメント2', 'セグメント3', '決済日', '決済口座', '決済金額'];
const headerMf = ['取引No', '取引日', '借方勘定科目', '借方補助科目', '借方部門', '借方取引先', '借方税区分', '借方インボイス', '借方金額(円)', '借方税額', '貸方勘定科目', '貸方補助科目', '貸方部門', '貸方取引先', '貸方税区分', '貸方インボイス', '貸方金額(円)', '貸方税額', '摘要', '仕訳メモ', 'タグ', 'MF仕訳タイプ', '決算整理仕訳', '作成日時', '作成者', '最終更新日時', '最終更新者'];
export function accountingCsv(format: CsvFormat, items: Candidate[], m: CsvMapping) {
    if (!['freee', 'moneyforward', 'yayoi_online'].includes(format) || m.confirmed !== true || !m.category || !m.account || !m.tax)
        throw new AccountingError('CSV', 'カテゴリ・科目・税区分を確認してください。');
    for (const v of [m.category, m.account, m.tax, m.offsetAccount, m.offsetTax, m.invoice])
        if (typeof v !== 'string' || v.length > 100 || /^[\s]*[=+@-]/.test(v))
            throw new AccountingError('CSV', '科目・税区分の入力を確認してください。');
    if (format !== 'freee' && !m.offsetAccount)
        throw new AccountingError('CSV', '相手科目を設定してください。');
    if (format === 'moneyforward' && !['適格', '80％控除', '70％控除', '50％控除', '30％控除', '控除なし'].includes(m.invoice))
        throw new AccountingError('CSV', 'インボイス区分を明示してください。');
    if (items.length === 0 || items.some(i => i.category !== m.category))
        throw new AccountingError('CSV', '対象カテゴリを確認してください。');
    const rows: unknown[][] = [];
    for (const [index, i] of items.entries()) {
        dateValue(i.date);
        amountValue(i.amount);
        const date = i.date.replace(/-/g, '/');
        const memo = `${i.store} / ${i.payment} / ${i.memo}`;
        if (format === 'freee') {
            rows.push([i.kind === 'sale' ? '収入' : '支出', digest([i.kind, i.id]).slice(0, 20), date, '', '', '', m.account, m.tax, i.amount, '税込', '', memo, '', '', '', '', '', '', '', '', '']);
            continue;
        }
        const debit = i.kind === 'expense' ? m.account : m.offsetAccount, credit = i.kind === 'sale' ? m.account : m.offsetAccount;
        const dt = i.kind === 'expense' ? m.tax : m.offsetTax, ct = i.kind === 'sale' ? m.tax : m.offsetTax;
        if (format === 'moneyforward')
            rows.push([index + 1, date, debit, '', '', '', dt, m.invoice, i.amount, '', credit, '', '', '', ct, m.invoice, i.amount, '', memo.slice(0, 200), 'SALON AGENT ' + digest([i.kind, i.id]).slice(0, 20), '', 'インポート', '', '', '', '', '']);
        else {
            if (debit.length > 12 || credit.length > 12 || i.amount > 999999999)
                throw new AccountingError('CSV', '弥生会計オンラインの科目名12文字・金額9桁の制限を確認してください。');
            rows.push(['2000', '', '', date, debit, '', '', dt, i.amount, '', credit, '', '', ct, i.amount, '', memo.slice(0, 30), '', '', '', '', '', '0', '', '', '', '']);
        }
    }
    return '\uFEFF' + (format === 'freee' ? [headerFreee, ...rows] : format === 'moneyforward' ? [headerMf, ...rows] : rows).map(r => r.map(csvCell).join(',')).join('\r\n');
}
