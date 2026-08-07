import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function normalizeStaffName(name: string) {
  if (!name) return "";
  return name.replace(/[\s　]+/g, "")
    .replace(/凜/g, "凛")
    .replace(/邊/g, "辺")
    .replace(/齊|齋/g, "斉")
    .replace(/澤/g, "沢")
    .replace(/濱/g, "浜")
    .replace(/嶋/g, "島")
    .replace(/﨑|嵜/g, "崎")
    .replace(/髙/g, "高");
}

export async function GET() {
  try {
    const q = query(
      collection(db, "allowances"),
      where("target_month", "==", "2026-06")
    );
    const snap = await getDocs(q);
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    
    const higuchi = records.filter(r => r.staff_name && normalizeStaffName(r.staff_name) === "樋口知奈美");

    return NextResponse.json({ records: higuchi });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
