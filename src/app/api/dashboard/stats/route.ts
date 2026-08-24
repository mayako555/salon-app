import { NextResponse } from "next/server";
import { getDashboardStats } from "@/app/dashboard/actions";
import { getEvaluationReminders } from "@/app/evaluations/actions";
import { getCompanySetupStatus } from "@/app/setup/actions";
import { getAllPendingTasks } from "@/app/tasks/actions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const quarter = url.searchParams.get("quarter") || "";

  try {
    const [statsRes, evalRes, setupRes, tasksRes] = await Promise.all([
      getDashboardStats(),
      getEvaluationReminders(quarter),
      getCompanySetupStatus(),
      getAllPendingTasks()
    ]);

    return NextResponse.json({
      success: true,
      stats: statsRes.success ? statsRes.data : null,
      evalReminders: evalRes || [],
      setupStatus: setupRes.success ? setupRes.data : null,
      tasks: tasksRes || []
    });
  } catch (error: any) {
    console.error("[Dashboard Stats API] Failed:", error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
