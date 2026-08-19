import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendLineMessage } from "@/lib/line";
import { LineAutomationSettings } from "@/app/admin/settings/line-automation-actions";
import { replaceLineTemplate } from "@/lib/lineTemplate";
import { requireFeature } from "@/lib/feature-utils";
// Removed date-fns-tz import as it is unused

// Simplified date string formatter for Asia/Tokyo
const getTokyoDateString = (date: Date) => {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date).replace(/\//g, "-");
};

const BATCH_SIZE = 20;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const settingsSnap = await adminDb.collection("line_automation_settings").get();
    const allSettings: LineAutomationSettings[] = [];
    for (const doc of settingsSnap.docs) {
      const data = doc.data() as LineAutomationSettings;
      if (data.automationEnabled) {
        try {
          await requireFeature(data.tenantId, "line_automation");
          allSettings.push({ ...data, id: doc.id });
        } catch (e) {
          // Feature disabled for this tenant, skip
          console.log(`Skipping line automation for ${doc.id} (Feature disabled)`);
        }
      }
    }

    if (allSettings.length === 0) {
      return NextResponse.json({
        success: true,
        executedAt: new Date().toISOString(),
        message: "No enabled line automation settings found."
      });
    }

    let stats = {
      tenantsProcessed: allSettings.length,
      reminder: { target: 0, sent: 0, failed: 0, skipped: 0 },
      thanks: { target: 0, sent: 0, failed: 0, skipped: 0 }
    };

    // Helper to fetch reservations for a specific date
    const fetchReservationsByDate = async (dateStr: string, tenantId: string) => {
      const snap = await adminDb.collection("reservations")
        .where("date", "==", dateStr)
        .where("companyId", "==", tenantId)
        .get();
      const reservations: any[] = [];
      snap.forEach((d: any) => reservations.push({ id: d.id, ...d.data() }));
      return reservations;
    };

    const processReservation = async (res: any, type: "reminder" | "thanks", setting: LineAutomationSettings, targetDateStr: string) => {
      // Basic checks
      if (res.status === "cancelled") {
        stats[type].skipped++;
        return;
      }
      if (!res.customer_id) {
        stats[type].skipped++;
        return;
      }

      // Check uniqueKey
      const uniqueKey = `${setting.tenantId}_${res.store_name}_${res.id}_${type}_${targetDateStr}`;
      const logDocRef = adminDb.collection("line_message_logs").doc(uniqueKey);
      const existingLogSnap = await logDocRef.get();
      if (existingLogSnap.exists) {
        const status = existingLogSnap.data()?.status;
        if (status === "processing" || status === "sent") {
          stats[type].skipped++;
          return;
        }
      }

      // Fetch customer for line_user_id
      const customerDoc = await adminDb.collection("customers").doc(res.customer_id).get();
      if (!customerDoc.exists) {
        stats[type].skipped++;
        return;
      }
      const customer = customerDoc.data();
      if (customer?.companyId !== setting.tenantId) {
        stats[type].skipped++;
        return;
      }
      if (!customer.line_user_id) {
        stats[type].skipped++;
        return;
      }

      // Validate template
      const template = type === "reminder" ? setting.reminderTemplate : setting.thanksTemplate;
      if (!template) {
        stats[type].skipped++;
        return;
      }

      // Format time
      const [hour, min] = (res.start_time || "00:00").split(":");
      
      const templateData = {
        customer_name: customer.name || res.customer_name || "お客様",
        store_name: res.store_name || "店舗",
        date: `${targetDateStr.split("-")[0]}年${targetDateStr.split("-")[1]}月${targetDateStr.split("-")[2]}日`,
        time: `${hour}:${min}`,
        menu_name: res.menu_name || "メニュー",
        staff_name: res.staff_name || "スタッフ",
        reservation_url: "https://example.com/reservation", // TODO: Real URL if applicable
        store_phone: "店舗へお問い合わせください" // TODO: Real phone number
      };

      const message = replaceLineTemplate(template, templateData);

      // Create Processing Log
      await logDocRef.set({
        companyId: setting.tenantId,
        tenantId: setting.tenantId,
        storeId: setting.storeId || res.store_name,
        reservationId: res.id,
        customerId: res.customer_id,
        lineUserId: customer.line_user_id,
        messageType: type,
        messageBody: message,
        scheduledAt: new Date(),
        status: "processing",
        uniqueKey,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Send Message
      const sendResult = await sendLineMessage(customer.line_user_id, message, res.store_name, setting.tenantId);

      // Update Log
      await logDocRef.set({
        status: sendResult.success ? "sent" : "failed",
        sentAt: sendResult.success ? new Date() : null,
        errorMessage: sendResult.error || null,
        updatedAt: new Date()
      }, { merge: true });

      if (sendResult.success) {
        stats[type].sent++;
      } else {
        stats[type].failed++;
      }
    };

    for (const setting of allSettings) {
      // Process Reminders
      if (setting.reminderEnabled) {
        const reminderTargetDate = new Date();
        reminderTargetDate.setDate(reminderTargetDate.getDate() + setting.reminderDaysBefore);
        const reminderDateStr = getTokyoDateString(reminderTargetDate);
        
        const reservations = await fetchReservationsByDate(reminderDateStr, setting.tenantId);
        stats.reminder.target += reservations.length;

        // Process in batches
        for (let i = 0; i < reservations.length; i += BATCH_SIZE) {
          const batch = reservations.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(res => processReservation(res, "reminder", setting, reminderDateStr)));
        }
      }

      // Process Thanks
      if (setting.thanksEnabled) {
        const thanksTargetDate = new Date();
        thanksTargetDate.setDate(thanksTargetDate.getDate() - setting.thanksDaysAfter);
        const thanksDateStr = getTokyoDateString(thanksTargetDate);
        
        const reservations = await fetchReservationsByDate(thanksDateStr, setting.tenantId);
        
        // Only target completed/arrived
        const completedReservations = reservations.filter(r => r.status === "completed" || r.status === "arrived");
        stats.thanks.target += completedReservations.length;

        // Process in batches
        for (let i = 0; i < completedReservations.length; i += BATCH_SIZE) {
          const batch = completedReservations.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(res => processReservation(res, "thanks", setting, thanksDateStr)));
        }
      }
    }

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      ...stats
    });

  } catch (error: any) {
    console.error("Cron line automation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
