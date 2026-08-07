import Papa from "papaparse";
import { MasterIncomeTaxRow } from "@/types/payroll";

interface ParsedTaxRow {
  min_taxable_amount: number;
  max_taxable_amount: number | null;
  kou_amounts: {
    "0": number;
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
    "6": number;
    "7": number;
  };
  otsu_amount: number;
  formula_type: string | null;
}

/**
 * Parses and validates a CSV for the monthly income tax table.
 * Expected Headers:
 * min_amount, max_amount, kou_0, kou_1, kou_2, kou_3, kou_4, kou_5, kou_6, kou_7, otsu, formula_type
 */
export function parseIncomeTaxCsv(csvString: string): { success: boolean, data?: ParsedTaxRow[], error?: string } {
  try {
    const parsed = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors.length > 0) {
      return { success: false, error: `CSVパースエラー: ${parsed.errors[0].message}` };
    }

    const rows = parsed.data as any[];
    const result: ParsedTaxRow[] = [];

    // Validation
    let previousMax: number | null = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const min = row["min_amount"];
      const maxStr = row["max_amount"];
      const max = maxStr === null || maxStr === "" || maxStr === undefined || String(maxStr).toLowerCase() === "null" ? null : Number(maxStr);

      if (typeof min !== "number" || isNaN(min)) {
        return { success: false, error: `行 ${i + 1}: min_amount が不正です (${row["min_amount"]})` };
      }

      if (max !== null && (typeof max !== "number" || isNaN(max))) {
        return { success: false, error: `行 ${i + 1}: max_amount が不正です (${row["max_amount"]})` };
      }

      if (max !== null && min >= max) {
        return { success: false, error: `行 ${i + 1}: min_amount が max_amount より大きいです` };
      }

      // Check gaps/overlaps
      if (previousMax !== null && min !== previousMax) {
        return { success: false, error: `行 ${i + 1}: 前の行との間に隙間または重複があります (前max: ${previousMax}, 今回min: ${min})` };
      }

      const kou = {
        "0": Number(row["kou_0"]) || 0,
        "1": Number(row["kou_1"]) || 0,
        "2": Number(row["kou_2"]) || 0,
        "3": Number(row["kou_3"]) || 0,
        "4": Number(row["kou_4"]) || 0,
        "5": Number(row["kou_5"]) || 0,
        "6": Number(row["kou_6"]) || 0,
        "7": Number(row["kou_7"]) || 0,
      };

      const otsu = Number(row["otsu"]) || 0;
      
      // Ensure no丙欄 for monthly (Validation requirement: 月額表には丙欄を含めない)
      if (row["hei_amount"] !== undefined || row["hei"] !== undefined) {
         return { success: false, error: `月額表のCSVには丙欄を含めないでください` };
      }

      result.push({
        min_taxable_amount: min,
        max_taxable_amount: max,
        kou_amounts: kou,
        otsu_amount: otsu,
        formula_type: row["formula_type"] ? String(row["formula_type"]) : null,
      });

      previousMax = max;
    }

    if (result.length === 0) {
      return { success: false, error: "有効なデータ行がありません" };
    }

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: `エラーが発生しました: ${e.message}` };
  }
}
