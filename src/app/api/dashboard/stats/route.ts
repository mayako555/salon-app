import { getCurrentUserContext } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { getDashboardStats } from "@/app/dashboard/actions";
import { getEvaluationReminders } from "@/app/evaluations/actions";
import { getCompanySetupStatus } from "@/app/setup/actions";
import { getAllPendingTasks } from "@/app/tasks/actions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const quarter = url.searchParams.get("quarter") || "";

  try {
    const identity = await getCurrentUserContext();
    const expectedUser = request.headers.get("X-Expected-User");
    const expectedCompany = request.headers.get("X-Expected-Company");
    if ((expectedUser !== null && expectedUser !== identity.uid) ||
        (expectedCompany !== null && expectedCompany !== (identity.companyId || ""))) {
      return NextResponse.json({ success: false, error: "ログイン情報が切り替わりました。再度ログインしてください。" }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    }
    const [statsRes, evalRes, setupRes, tasksRes] = await Promise.all([
      getDashboardStats(),
      getEvaluationReminders(quarter),
      getCompanySetupStatus(),
      getAllPendingTasks()
    ]);

    return NextResponse.json({
      success: true,
      uid: identity.uid,
      companyId: identity.companyId || "",
      stats: statsRes.success ? statsRes.data : null,
      evalReminders: evalRes || [],
      setupStatus: setupRes.success ? setupRes.data : null,
      tasks: tasksRes || []
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    console.error("[Dashboard Stats API] Failed:", error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
