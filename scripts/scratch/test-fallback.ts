import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const targetPrefix = "2026-08";
  const ctx = { companyId: "company_default" };
  
  const colRef = adminDb.collection("shifts");
  const q = colRef.where("date", ">=", `${targetPrefix}-01`).where("date", "<=", `${targetPrefix}-31`).orderBy("date", "asc");
  
  let snap;
  try {
    snap = await q.where("companyId", "==", ctx.companyId).get();
  } catch (e) {
    console.warn("Caught index error, falling back...");
    const rawSnap = await q.get();
    snap = {
      docs: rawSnap.docs.filter((d) => d.data().companyId === ctx.companyId),
    };
  }
  
  console.log(`Query returned ${snap.docs.length} docs`);
}
run();
