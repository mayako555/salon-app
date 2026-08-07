import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUserContext } from "@/lib/auth-server";

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentUserContext();
    if (ctx.role !== "systemOwner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, faqId } = await request.json();
    if (!id || !faqId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await adminDb.collection("ai_unresolved_questions").doc(id).update({
      status: "faq_created",
      created_faq_id: faqId,
      updated_at: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error resolving question:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
