export type SalesSource = "checkout" | "hotpepper" | "manual" | "csv_estimated";

export type SalesRecord = {
  id: string;
  staff_id: string;
  staff_name: string;
  store_name: string;
  date: string;
  time: string;
  customer_name: string;
  last_name?: string;
  first_name?: string;
  last_name_kana?: string;
  first_name_kana?: string;
  customer_type: "新規" | "リピ" | "不明";
  menu_course: string;
  tech_sales: number;
  product_sales: number;
  is_nominated: boolean;
  nomination_fee: number;
  discount: number;
  discount_reason: string;
  portal_fee: number;
  hpb_points: number;
  reservation_route: string;
  payment_method: string;
  payment_status?: string;
  split_payments?: { method: string; amount: number }[];
  note?: string;
  hair_material: string;
  options: string;
  cancel_fee: number;
  status: "draft" | "closed";
  source: SalesSource;
  source_reservation_id?: string;
  next_booking_date?: string;
  treatment_excluded?: boolean;
  next_booking_time?: string;
  next_booking_staff_name?: string;
  next_booking_nominated?: boolean;
  next_booking_line_reminder?: boolean;
  customer_id?: string;
  is_minimo?: boolean;
  treatment_minutes?: number;
  merge_status?: "CSV_ONLY" | "MERGED_PRIMARY" | "MANUAL_ONLY" | "MERGED_SOURCE" | "DELETED";
  merged_into_id?: string;
  companyId?: string;
  store_id?: string;
  product_details?: string;
  /** CSV上の会計・予約識別子。既存データとの互換性のため任意項目。 */
  accounting_id?: string;
  reservation_id?: string;
  /** クーポン最適化で使用する、取込時点の文言スナップショット。 */
  coupon_name?: string;
  coupon_description?: string;
  menu_category?: string;
  menu_items?: Array<{
    name: string;
    category: string;
    grossPrice: number;
  }>;
  /** 学割・モデル・社員施術等を後から設定で除外するためのタグ。 */
  segment_tags?: string[];
  is_cancelled?: boolean;
  import_batch_id?: string;
  created_at: unknown;
  updated_at?: unknown;
};
