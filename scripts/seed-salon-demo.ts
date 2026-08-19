import { adminDb } from "../src/lib/firebase-admin";
const db = adminDb;

const companyId = "nQOSGbsgzhUG2BTLKACU";

async function run() {
  console.log(`Starting custom demo data generation for companyId: ${companyId}`);

  const batch = db.batch();

  // 0. Stores Master (Table Setup)
  const storesMaster = [
    { id: "demo-store-omotesando", name: "Salon表参道店" },
    { id: "demo-store-shibuya", name: "Salon渋谷店" },
    { id: "demo-store-namba", name: "Salon難波店" },
    { id: "demo-store-umeda", name: "Salon梅田店" }
  ];

  for (const store of storesMaster) {
    const ref = db.collection("stores").doc(store.id);
    batch.set(ref, {
      companyId,
      name: store.name,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 1. Staff Profiles
  const staffData = [
    {
      id: "demo-staff-1",
      name: "木村 沙織",
      name_kana: "キムラ サオリ",
      role: "storeManager",
      employment_type: "employee",
      employment_status: "active",
      email: "kimura.demo@example.com",
      is_active: true,
      store: "Salon表参道店",
      created_at: new Date()
    },
    {
      id: "demo-staff-2",
      name: "長谷川 麗奈",
      name_kana: "ハセガワ レイナ",
      role: "staff",
      employment_type: "employee", // パート/時給
      employment_status: "active",
      email: "hasegawa.demo@example.com",
      is_active: true,
      store: "Salon渋谷店",
      created_at: new Date()
    },
    {
      id: "demo-staff-3",
      name: "渡辺 美優",
      name_kana: "ワタナベ ミユ",
      role: "staff",
      employment_type: "contractor", // 業務委託
      employment_status: "active",
      email: "watanabe.demo@example.com",
      is_active: true,
      store: "Salon難波店",
      created_at: new Date()
    }
  ];

  for (const s of staffData) {
    const ref = db.collection("staff_profiles").doc(s.id);
    batch.set(ref, {
      ...s,
      companyId,
      created_at: new Date()
    });
  }

  // 2. Staff Contracts
  const contractData = [
    {
      id: "contract-saori",
      staff_id: "demo-staff-1",
      staff_name: "木村 沙織",
      contract_type: "fixed_salary", // 固定給
      monthly_base_salary: 280000,
      transport_allowance: 15000,
      valid_from: "2026-01-01",
      valid_to: "2027-12-31"
    },
    {
      id: "contract-reina",
      staff_id: "demo-staff-2",
      staff_name: "長谷川 麗奈",
      contract_type: "hourly", // 時給
      hourly_wage: 1100,
      transport_allowance: 10000,
      valid_from: "2026-01-01",
      valid_to: "2027-12-31"
    },
    {
      id: "contract-miyu",
      staff_id: "demo-staff-3",
      staff_name: "渡辺 美優",
      contract_type: "tier_monthly", // 業務委託パーセンテージ
      nomination_fee: 500,
      valid_from: "2026-01-01",
      valid_to: "2027-12-31"
    }
  ];

  for (const c of contractData) {
    const ref = db.collection("staff_contracts").doc(c.id);
    batch.set(ref, {
      ...c,
      companyId,
      created_at: new Date()
    });
  }

  // 3. Pos Sales Data (July & August 2026)
  const sales = [
    // Saori Sales (employee) - Salon表参道店
    { staff_name: "木村 沙織", date: "2026-07-02", tech_sales: 8500, product_sales: 1200, is_nominated: true, store_name: "Salon表参道店" },
    { staff_name: "木村 沙織", date: "2026-07-05", tech_sales: 9000, product_sales: 0, is_nominated: false, store_name: "Salon表参道店" },
    { staff_name: "木村 沙織", date: "2026-07-10", tech_sales: 6500, product_sales: 2500, is_nominated: true, store_name: "Salon表参道店", menu_course: "トリートメント" },
    { staff_name: "木村 沙織", date: "2026-08-01", tech_sales: 9500, product_sales: 0, is_nominated: true, store_name: "Salon表参道店" },
    // Reina Sales (hourly) - Salon渋谷店
    { staff_name: "長谷川 麗奈", date: "2026-07-03", tech_sales: 5500, product_sales: 0, is_nominated: true, store_name: "Salon渋谷店" },
    { staff_name: "長谷川 麗奈", date: "2026-07-12", tech_sales: 8000, product_sales: 1500, is_nominated: false, store_name: "Salon渋谷店" },
    { staff_name: "長谷川 麗奈", date: "2026-08-02", tech_sales: 6500, product_sales: 800, is_nominated: true, store_name: "Salon渋谷店" },
    // Miyu Sales (commission) - Salon難波店 & Salon梅田店
    { staff_name: "渡辺 美優", date: "2026-07-01", tech_sales: 12000, product_sales: 3000, is_nominated: true, store_name: "Salon難波店" },
    { staff_name: "渡辺 美優", date: "2026-07-15", tech_sales: 14000, product_sales: 0, is_nominated: true, store_name: "Salon難波店" },
    { staff_name: "渡辺 美優", date: "2026-07-20", tech_sales: 9000, product_sales: 1500, is_nominated: false, store_name: "Salon梅田店" },
    { staff_name: "渡辺 美優", date: "2026-08-05", tech_sales: 11000, product_sales: 0, is_nominated: true, store_name: "Salon難波店" }
  ];

  let salesIndex = 0;
  for (const s of sales) {
    const ref = db.collection("sales").doc(`demo-sale-${salesIndex++}`);
    batch.set(ref, {
      ...s,
      companyId,
      source: "hotpepper",
      customer_name: "デモ顧客",
      discount: 0,
      payment_method: "クレジットカード",
      created_at: new Date(s.date)
    });
  }

  // 4. Shift & Attendance (July & August 2026)
  const dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-05", "2026-08-01", "2026-08-02", "2026-08-05"];
  let attIndex = 0;
  for (const d of dates) {
    // Saori Shifts & Attendance
    if (d !== "2026-07-01") {
      const shiftRef = db.collection("shifts").doc(`demo-shift-saori-${d}`);
      batch.set(shiftRef, {
        companyId,
        staff_id: "demo-staff-1",
        staff_name: "木村 沙織",
        date: d,
        segments: [{ start_time: "10:00", end_time: "19:00", store: "Salon表参道店" }]
      });

      const attRef = db.collection("attendance").doc(`demo-att-${attIndex++}`);
      batch.set(attRef, {
        companyId,
        staff_id: "demo-staff-1",
        staff_name: "木村 沙織",
        date: d,
        clock_in: `${d}T09:45:00.000Z`,
        clock_out: `${d}T19:05:00.000Z`,
        effective_clock_in: `${d}T10:00:00.000Z`,
        effective_clock_out: `${d}T19:00:00.000Z`,
        break_minutes: 60,
        status: "normal",
        store: "Salon表参道店"
      });
    }

    // Reina Shifts & Attendance
    if (d === "2026-07-03" || d === "2026-07-12" || d === "2026-08-02") {
      const shiftRef = db.collection("shifts").doc(`demo-shift-reina-${d}`);
      batch.set(shiftRef, {
        companyId,
        staff_id: "demo-staff-2",
        staff_name: "長谷川 麗奈",
        date: d,
        segments: [{ start_time: "10:00", end_time: "17:30", store: "Salon渋谷店" }]
      });

      const attRef = db.collection("attendance").doc(`demo-att-${attIndex++}`);
      batch.set(attRef, {
        companyId,
        staff_id: "demo-staff-2",
        staff_name: "長谷川 麗奈",
        date: d,
        clock_in: `${d}T09:55:00.000Z`,
        clock_out: `${d}T17:30:00.000Z`,
        effective_clock_in: `${d}T10:00:00.000Z`,
        effective_clock_out: `${d}T17:30:00.000Z`,
        break_minutes: 60,
        status: "normal",
        store: "Salon渋谷店"
      });
    }
  }

  // 5. Allowances (July 2026)
  const allowances = [
    { staff_id: "demo-staff-1", staff_name: "木村 沙織", target_month: "2026-07", type: "review", amount: 1500, store_name: "Salon表参道店", target_details: { count: 3 } },
    { staff_id: "demo-staff-1", staff_name: "木村 沙織", target_month: "2026-07", type: "transport", amount: 15000, store_name: "Salon表参道店", target_details: { context: "定期代" } },
    { staff_id: "demo-staff-2", staff_name: "長谷川 麗奈", target_month: "2026-07", type: "sns", amount: 1000, store_name: "Salon渋谷店", target_details: { count: 2 } },
    { staff_id: "demo-staff-2", staff_name: "長谷川 麗奈", target_month: "2026-07", type: "transport", amount: 8400, store_name: "Salon渋谷店", target_details: { context: "実費精算" } }
  ];

  let allowIndex = 0;
  for (const a of allowances) {
    const ref = db.collection("allowances").doc(`demo-allowance-${allowIndex++}`);
    batch.set(ref, {
      ...a,
      companyId,
      created_at: new Date()
    });
  }

  // 6. Allowance checks (checked statuses)
  const checks = [
    { staff_id: "demo-staff-1", target_month: "2026-07" },
    { staff_id: "demo-staff-2", target_month: "2026-07" }
  ];

  for (const c of checks) {
    const ref = db.collection("allowance_checks").doc(`${c.staff_id}_${c.target_month}`);
    batch.set(ref, {
      ...c,
      companyId,
      updated_at: new Date()
    });
  }

  await batch.commit();
  console.log("Successfully seeded demo data for salon business!");
}

run().catch(console.error);
