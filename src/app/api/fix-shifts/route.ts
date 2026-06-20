import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("shifts").get();
    let updatedCount = 0;
    const batch = adminDb.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      const segments = data.segments;

      if (Array.isArray(segments)) {
        const newSegments = segments.map(seg => {
          if (seg.store === "メイン店舗") {
            needsUpdate = true;
            return { ...seg, store: "六甲" };
          }
          return seg;
        });

        if (needsUpdate) {
          batch.update(doc.ref, { segments: newSegments });
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, message: `Updated ${updatedCount} shifts from メイン店舗 to 六甲.` });
  } catch (error: any) {
    console.error("Error fixing shifts:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
