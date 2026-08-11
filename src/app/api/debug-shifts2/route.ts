import { NextResponse } from "next/server";
import { db } from "@/lib/firestore-admin-wrapper";
import { collection, query, where, orderBy, getDocs } from "@/lib/firestore-admin-wrapper";

export async function GET() {
  const colRef = collection(db, "shifts");
  const q = query(
    colRef, 
    where("date", ">=", `2026-08-01`), 
    where("date", "<=", `2026-08-31`),
    orderBy("date", "asc")
  );
  
  try {
    const snapshot = await getDocs(q);
    const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, count: shifts.length, shifts });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
