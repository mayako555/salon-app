import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("attendance_records").get();
  console.log(`Total attendance_records: ${snap.size}`);

  const byDate: Record<string, number> = {};
  const byCompany: Record<string, number> = {};

  snap.docs.forEach(d => {
    const data = d.data();
    const date = data.date || data.work_date || data.clock_in_date || "unknown";
    const dateStr = typeof date === "string" ? date.slice(0, 10) : 
                    date?.toDate ? date.toDate().toISOString().slice(0, 10) : "unknown";
    byDate[dateStr] = (byDate[dateStr] || 0) + 1;
    const c = data.companyId || "null";
    byCompany[c] = (byCompany[c] || 0) + 1;
  });

  console.log("\nBy date (sorted):", 
    Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 20)
      .map(([d, n]) => `${d}: ${n}件`)
      .join("\n  ")
  );
  console.log("\nBy companyId:", byCompany);

  // Sample doc
  if (!snap.empty) {
    console.log("\nSample doc keys:", Object.keys(snap.docs[0].data()));
    console.log("Sample doc:", snap.docs[0].data());
  }
}
run();
