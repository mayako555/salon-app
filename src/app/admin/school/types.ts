export type SchoolCourse = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  createdAt: any;
  updatedAt: any;
};

export type SchoolStudent = {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string;
  memo: string;
  createdAt: any;
  updatedAt: any;
};

export type SchoolReservationStatus = "reserved" | "completed" | "cancelled" | "no_show";
export type SchoolPaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type SchoolReservation = {
  id: string;
  companyId: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  staff_id: string;
  staff_name: string;
  contract_date?: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD (Attendance date)
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  course_price: number;
  discount_amount: number;
  final_amount: number;
  tax_rate: number;
  tax_amount: number;
  status: SchoolReservationStatus;
  payment_status: SchoolPaymentStatus;
  paid_amount: number;
  remaining_amount: number;
  memo: string;
  completed_at?: any;
  cancelled_at?: any;
  createdAt: any;
  updatedAt: any;
};

export type SchoolPaymentType = "deposit" | "balance" | "full" | "refund";

export type SchoolPayment = {
  id: string;
  companyId: string;
  reservation_id: string;
  student_id: string;
  student_name?: string; // Snapshot
  course_name?: string; // Snapshot
  payment_date: string; // YYYY-MM-DD
  amount: number;
  payment_method: string;
  payment_type: SchoolPaymentType;
  memo: string;
  createdAt: any;
};

export type SchoolSalesRecord = {
  id: string;
  companyId: string;
  reservation_id: string;
  student_id: string;
  student_name?: string; // Snapshot
  course_id: string;
  course_name?: string; // Snapshot
  date: string; // YYYY-MM-DD (typically date of course completion)
  amount: number;
  tax_amount: number;
  tax_included: boolean;
  payment_method: string;
  source_type: "reservation";
  source_id: string; // usually same as reservation_id
  createdAt: any;
  updatedAt: any;
};
