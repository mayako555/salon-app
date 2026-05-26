import { NextResponse } from "next/server";
import { addReservation, getReservations, updateReservationStatus } from "@/app/reservations/actions";
import { getStaffList } from "@/app/staff/actions";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    // VERY Basic security check for now (In production, use proper API keys)
    if (authHeader !== "Bearer SALON_BOARD_SYNC_SECRET_KEY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, payload } = body;
    
    // action: 'SYNC_DAILY_SCHEDULE'
    // payload: { store_name, date, reservations: [...] }
    
    if (action === "SYNC_DAILY_SCHEDULE") {
      const { store_name, date, reservations } = payload;
      
      // Get existing reservations for this day to avoid pure duplicates
      const existing = await getReservations(store_name, date);
      const staffList = await getStaffList();
      
      let added = 0;
      let updated = 0;

      for (const res of reservations) {
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
            await updateReservationStatus(duplicate.id, res.status);
            updated++;
          }
        } else {
          // Add new reservation
          await addReservation({
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
