import { createHash } from 'node:crypto';
import * as Papa from 'papaparse';

/** Strict decoding: never replace undecodable bytes and then classify damaged account names. */
export function decodeAccountingText(bytes: Uint8Array): string {
  for (const encoding of ['utf-8', 'shift_jis']) {
    try {
      const text = new TextDecoder(encoding, { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
      if (!text.includes('\uFFFD') && !text.includes('\0')) return text;
    } catch { /* Try the next supported encoding. */ }
  }
  throw new Error('文字コードを読み取れません。弥生から取引データを再出力してください。');
}

// Import candidates only. Unknown accounts and compound journals require separate review.
const expenseAccounts = new Set(['通信費','広告宣伝費','水道光熱費','地代家賃','消耗品費','支払手数料','外注工賃','外注費','税理士・弁護士報酬','会議費','雑費','諸会費','旅費交通費','接待交際費','荷造運賃','修繕費','保険料','損害保険料','新聞図書費','賃借料','リース料']);
const excludedAccounts = new Set(['普通預金','当座預金','定期預金','現金','売上','売上高','売掛金','事業主貸','事業主借','クレジットカード','未払金','未払費用','借入金','長期借入金','短期借入金']);

export function parseYayoiImport(text: string) {
  if (text.includes('\uFFFD')) throw new Error('文字化けがあるため取込みを中止しました。元のファイルをアップロードしてください。');
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { header: false, skipEmptyLines: 'greedy' });
  const rows = parsed.data;
  if (!rows.some(row => /^(2000|2110|2100|2101)$/.test(row[0]?.trim()))) return null;
  if (parsed.errors.length || rows.some(row => row.length !== 27)) throw new Error('弥生オンラインの取引データ（27列）を確認してください。');
  const fileKey = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return rows.map((row, index) => {
    const date = row[3].replace(/\//g, '-');
    const amount = Number(row[8]);
    const creditAmount = Number(row[14]);
    const dateValue = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dateValue.getTime()) || dateValue.toISOString().slice(0,10) !== date || !/^-?\d+$/.test(row[8]) || !/^-?\d+$/.test(row[14]) || !Number.isSafeInteger(amount) || !Number.isSafeInteger(creditAmount)) {
      throw new Error(`${index + 1}行目の日付・金額を確認してください。取込みは行っていません。`);
    }
    const account = row[4].trim();
    const simple = row[0] === '2000' && amount > 0 && amount === creditAmount;
    const classification = !simple ? '要確認' : expenseAccounts.has(account) ? '経費' : excludedAccounts.has(account) ? '対象外' : '要確認';
    return { no: index + 1, date, category: account, amount, description: row[16],
      classification, source: 'yayoi' as const, import_key: `${fileKey}_${index}`,  payment_method: row[10], is_duplicate_sales: false, is_transfer: false,
      reason: classification === '経費' ? '科目に基づく経費候補です。内容を確認してください。' : classification === '要確認' ? '給与・税金・仕入・資産・未対応科目や複合仕訳等は自動登録しません。別途確認してください。' : 'この科目は経費取込みの対象外です。' };
  });
}
