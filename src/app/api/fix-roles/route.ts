import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const satoSnap = await adminDb.collection("staff_profiles").where("email", "==", "ruuumiii10612vv@gmail.com").get();
    const sato = satoSnap.empty ? null : satoSnap.docs[0].data();

    const companiesSnap = await adminDb.collection("companies").get();
    const companies = companiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const ownersSnap = await adminDb.collection("staff_profiles").where("role", "==", "companyOwner").get();
    const owners = ownersSnap.docs.map(d => ({ id: d.id, email: d.data().email, companyId: d.data().companyId }));

    return NextResponse.json({
      success: true,
      sato,
      companies,
      owners
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
