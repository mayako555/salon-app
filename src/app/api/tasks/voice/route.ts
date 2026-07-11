import { NextResponse } from "next/server";
import { parseTasksFromText } from "@/lib/ai-task-parser";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import crypto from "crypto";

// Helper to safely compare tokens (timing attack safe)
function secureCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: Request) {
  try {
    // Authentication: Use Bearer token from header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized: Missing Bearer Token" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const expectedToken = process.env.VOICE_TASK_API_TOKEN;

    if (!expectedToken || !secureCompare(token, expectedToken)) {
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid Token" }, { status: 403 });
    }

    const body = await req.json();
    const { text, companyId, userId } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: "Text is required" }, { status: 400 });
    }

    if (!companyId || !userId) {
      return NextResponse.json({ success: false, error: "companyId and userId are required for webhook requests" }, { status: 400 });
    }

    // Parse text using AI
    const parseResult = await parseTasksFromText(text);

    if (!parseResult.success || !parseResult.tasks) {
      return NextResponse.json({ success: false, error: "Failed to parse tasks from text" }, { status: 500 });
    }

    const colRef = collection(db, "tasks");
    const createdIds: string[] = [];

    // Create parsed tasks in Firestore
    for (const task of parseResult.tasks) {
      const docData = {
        title: task.title,
        description: "Apple Shortcutsからの音声入力",
        category: task.category,
        priority: task.priority,
        status: "未着手",
        assignee: userId,
        dueDate: task.dueDate || "",
        dueTime: task.dueTime || "",
        project: task.project || "",
        notificationRules: [],
        tags: ["音声入力", "AI"],
        attachments: [],
        companyId: companyId,
        createdBy: userId,
        updatedBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completedAt: null
      };

      const docRef = await addDoc(colRef, docData);
      createdIds.push(docRef.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${createdIds.length}件のタスクを作成しました`,
      taskIds: createdIds,
      parsedTasks: parseResult.tasks
    });

  } catch (error: any) {
    console.error("Voice Task Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
