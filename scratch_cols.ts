import Papa from "papaparse";
import crypto from "crypto";

export function detectCsvColumns(data: any[], meta: any) {
  let dateCol: string | number | null = null;
  let amountCol: string | number | null = null;
  let descCol: string | number | null = null;

  if (meta.fields && meta.fields.length > 0) {
    for (const f of meta.fields) {
      if (f.includes("日付") || f.includes("利用日")) dateCol = f;
      if (f.includes("出金") || f.includes("お引出し") || f.includes("金額") || f.includes("支払")) amountCol = f;
      if (f.includes("摘要") || f.includes("内容") || f.includes("利用店")) descCol = f;
    }
  } else if (data.length > 0) {
    const firstRow = data[0];
    for (let i = 0; i < firstRow.length; i++) {
      const val = String(firstRow[i]);
      if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(val)) dateCol = i;
      if (!isNaN(Number(val.replace(/,/g, ''))) && Number(val.replace(/,/g, '')) > 0) {
        if (amountCol === null) amountCol = i; // just guess the first number column
      }
      if (val.length > 3 && isNaN(Number(val))) descCol = i;
    }
  }
  
  if (dateCol !== null && amountCol !== null && descCol !== null) {
    return { date: dateCol, amount: amountCol, description: descCol };
  }
  return null;
}
