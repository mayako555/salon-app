import type { SalesRecord } from "@/types/sales";

type SaleAmountFields = Pick<
  SalesRecord,
  "tech_sales" | "product_sales" | "nomination_fee" | "cancel_fee" | "discount"
>;

/**
 * 売上管理画面と同じ定義で、1会計の総売上を計算する。
 * 支払手段やHPBポイントは売上額そのものを変えないため控除しない。
 */
export function getSaleGrossAmount(sale: SaleAmountFields): number {
  return (
    Number(sale.tech_sales || 0) +
    Number(sale.product_sales || 0) +
    Number(sale.nomination_fee || 0) +
    Number(sale.cancel_fee || 0) -
    Number(sale.discount || 0)
  );
}
