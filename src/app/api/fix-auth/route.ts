import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const passcode = searchParams.get("passcode");

  if (!email || !passcode) {
    return NextResponse.json({ error: "Missing email or passcode" }, { status: 400 });
  }

  try {
    const user = await adminAuth.createUser({
      email: email,
      password: passcode + "_salon",
      displayName: "Staff User"
    });
    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      try {
        const user = await adminAuth.getUserByEmail(email);
        await adminAuth.updateUser(user.uid, { password: passcode + "_salon" });
        return NextResponse.json({ success: true, message: "Password updated", uid: user.uid });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
