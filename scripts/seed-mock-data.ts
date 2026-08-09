import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// NOTE: Set GOOGLE_APPLICATION_CREDENTIALS in env to run this script

if (getApps().length === 0) {
  initializeApp(); // Uses ADC or GOOGLE_APPLICATION_CREDENTIALS
}
const db = getFirestore();

// Usage: npx tsx scripts/seed-mock-data.ts <companyId>
const companyId = process.argv[2];
if (!companyId) {
  console.error("Please provide a companyId. Example: npx tsx scripts/seed-mock-data.ts my-test-company");
  process.exit(1);
}

const COURSES_COL = "school_courses";
const STUDENTS_COL = "school_students";
const RESERVATIONS_COL = "school_reservations";
const PAYMENTS_COL = "school_payments";
const SALES_COL = "school_sales";
const STAFF_COL = "staff_profiles";
const CUSTOMERS_COL = "customers";

async function run() {
  console.log(`Starting mock data generation for companyId: ${companyId}`);

  // 1. Create Mock Staff
  const staffRef1 = db.collection(STAFF_COL).doc();
  const staffRef2 = db.collection(STAFF_COL).doc();
  
  await staffRef1.set({
    companyId,
    name: "山田 太郎",
    role: "manager",
    employment_type: "employee",
    employment_status: "active",
    is_active: true,
    is_trainee: false,
    max_holiday_requests: 3,
    created_at: new Date()
  });

  await staffRef2.set({
    companyId,
    name: "佐藤 花子",
    role: "staff",
    employment_type: "employee",
    employment_status: "active",
    is_active: true,
    is_trainee: false,
    max_holiday_requests: 3,
    created_at: new Date()
  });

  // 2. Create Mock Customers
  const customerRef = db.collection(CUSTOMERS_COL).doc();
  await customerRef.set({
    companyId,
    name: "鈴木 一郎",
    name_kana: "スズキ イチロウ",
    phone: "090-0000-0000",
    created_at: new Date()
  });

  // 3. Create Mock Courses (School)
  const courseRef = db.collection(COURSES_COL).doc();
  await courseRef.set({
    companyId,
    name: "ネイリストベーシックコース",
    description: "基礎から学ぶ初心者向けコース",
    price: 300000,
    duration_minutes: 120,
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 4. Create Mock Students (School)
  const studentRef = db.collection(STUDENTS_COL).doc();
  await studentRef.set({
    companyId,
    name: "田中 美咲",
    phone: "080-1111-2222",
    email: "test@example.com",
    memo: "テスト受講生",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 5. Create Mock Reservations (School)
  const resRef = db.collection(RESERVATIONS_COL).doc();
  await resRef.set({
    companyId,
    student_id: studentRef.id,
    student_name: "田中 美咲",
    course_id: courseRef.id,
    course_name: "ネイリストベーシックコース",
    staff_id: staffRef1.id,
    staff_name: "山田 太郎",
    date: new Date().toISOString().split('T')[0], // Today
    start_time: "10:00",
    end_time: "12:00",
    course_price: 300000,
    discount_amount: 0,
    tax_amount: 30000,
    final_amount: 330000,
    paid_amount: 100000,
    remaining_amount: 230000,
    status: "completed",
    payment_status: "partial",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 6. Create Mock Payments (School)
  const payRef = db.collection(PAYMENTS_COL).doc();
  await payRef.set({
    companyId,
    reservation_id: resRef.id,
    student_name: "田中 美咲",
    course_name: "ネイリストベーシックコース",
    amount: 100000,
    payment_method: "cash",
    payment_type: "payment",
    payment_date: new Date().toISOString().split('T')[0],
    createdAt: new Date()
  });

  // 7. Create Mock Sales (School)
  const salesRef = db.collection(SALES_COL).doc();
  await salesRef.set({
    companyId,
    reservation_id: resRef.id,
    student_id: studentRef.id,
    student_name: "田中 美咲",
    course_id: courseRef.id,
    course_name: "ネイリストベーシックコース",
    date: new Date().toISOString().split('T')[0],
    amount: 330000,
    tax_amount: 30000,
    tax_included: true,
    payment_method: "multiple",
    source_type: "reservation",
    source_id: resRef.id,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log("Successfully seeded mock data.");
  process.exit(0);
}

run().catch(console.error);
