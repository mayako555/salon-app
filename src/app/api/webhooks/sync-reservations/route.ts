import { addTenantOwnedDoc } from "@/lib/tenant-ownership";
import { NextResponse } from "next/server";
import { db } from "@/lib/firestore-admin-wrapper";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "@/lib/firestore-admin-wrapper";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const secretKey = process.env.WEBHOOK_SECRET_KEY || "SALON_BOARD_SYNC_SECRET_KEY";

    if (authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, payload } = body;
    
    if (action === "SYNC_DAILY_SCHEDULE") {
      const { store_name, date, reservations } = payload;

      // Legacy fallback: resolve companyId from store_name since the legacy payload lacks it
      const storesQuery = query(collection(db, "tenant_stores"), where("name", "==", store_name));
      const storesSnap = await getDocs(storesQuery);
      if (storesSnap.empty) {
        return NextResponse.json({ error: `Store '${store_name}' not found` }, { status: 404 });
      }
      const companyId = storesSnap.docs[0].data().companyId;
      
      // Get existing reservations for this day AND this company
      const resQuery = query(
        collection(db, "reservations"), 
        where("companyId", "==", companyId), 
        where("date", "==", date),
        where("store_name", "==", store_name)
      );
      const resSnap = await getDocs(resQuery);
      const existing = resSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      // Fetch staff list for this company
      const staffQuery = query(collection(db, "staff_profiles"), where("companyId", "==", companyId));
      const staffSnap = await getDocs(staffQuery);
      const staffList = staffSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      let added = 0;
      let updated = 0;

      for (const res of reservations as any[]) {
        // Try to match by time and customer name (simplistic duplicate prevention)
        const duplicate = existing.find(e => 
          e.start_time === res.start_time && 
          e.customer_name === res.customer_name &&
          e.staff_name === res.staff_name
        );
        
        // Find staff_id based on name if not provided
        let staff_id = res.staff_id;
        if (!staff_id) {
          const matchedStaff = staffList.find(s => s.name === res.staff_name);
          staff_id = matchedStaff?.id || "unknown";
        }

        if (duplicate) {
          // Update status if it changed
          if (duplicate.status !== res.status && res.status) {
            await updateDoc(doc(db, "reservations", duplicate.id), {
              status: res.status,
              updated_at: serverTimestamp()
            });
            updated++;
          }
        } else {
          // Add new reservation
          await addTenantOwnedDoc(collection(db, "reservations"), {
            companyId,
            store_name,
            staff_id,
            staff_name: res.staff_name,
            customer_name: res.customer_name,
            customer_kana: res.customer_kana || "",
            customer_phone: res.customer_phone || "",
            date,
            start_time: res.start_time,
            end_time: res.end_time,
            menu_name: res.menu_name,
            portal: res.portal || "HPB",
            status: res.status || "booked",
            memo: res.memo || "",
            expected_price: res.expected_price || 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          added++;
        }
      }
      
      return NextResponse.json({ success: true, added, updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
