import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { faqSeedData } from "@/lib/faq-seed-data";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("key") !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
      // Allow without key in local dev, but require key in production
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let added = 0;
    const batch = adminDb.batch();
    
    // Check if FAQs already exist to avoid duplicates
    const existing = await adminDb.collection("faqs").limit(1).get();
    if (!existing.empty && url.searchParams.get("force") !== "true") {
      return NextResponse.json({ message: "FAQs already seeded. Use ?force=true to seed anyway." });
    }

    for (const faq of faqSeedData) {
      const docRef = adminDb.collection("faqs").doc();
      batch.set(docRef, {
        ...faq,
        is_published: false, // Force unpublished by default as requested
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      added++;
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: `Successfully seeded ${added} FAQs.` });
  } catch (error: any) {
    console.error("Error seeding FAQs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
