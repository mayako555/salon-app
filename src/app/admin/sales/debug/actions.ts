"use server";

import { db } from "@/lib/firestore-admin-wrapper";
import { getCurrentUserContext } from "@/lib/auth-server";
import { SalesRecord } from "@/app/sales/actions";

export async function getDebugSales(year: number, month: number): Promise<SalesRecord[]> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("Company ID required");

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const { adminDb } = await import("@/lib/firebase-admin");
    const snapshot = await adminDb
      .collection("sales")
      .where("companyId", "==", ctx.companyId)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .orderBy("date", "asc")
      .get();

    const sales = snapshot.docs.map((d: any) => {
      const data = d.data();
      const serializedData: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof (value as any).toMillis === 'function') {
          serializedData[key] = (value as any).toMillis();
        } else if (value instanceof Date) {
          serializedData[key] = value.getTime();
        } else {
          serializedData[key] = value;
        }
      }
      return { id: d.id, ...serializedData };
    }) as SalesRecord[];

    return sales;
  } catch (error: any) {
    console.error("Error fetching debug sales:", error);
    return [];
  }
}
