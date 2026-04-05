import { randomUUID } from "node:crypto";
import { extractTelegramUser } from "@/src/lib/telegram-auth";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { getEnv } from "@/src/lib/env";

export async function POST(request: Request) {
  const tgUser = extractTelegramUser(request);

  if (!tgUser) {
    return Response.json({ ok: false, error: "Telegram initData required" }, { status: 401 });
  }

  const tgUserId = String(tgUser.id);
  const staffMember = await staffRepository.findByTelegramUserId(tgUserId);

  if (!staffMember) {
    return Response.json({ ok: false, error: "Staff not found" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const title = (body.title ?? "").trim();

    if (!title) {
      return Response.json({ ok: false, error: "title is required" }, { status: 400 });
    }

    const now = new Date();
    const taskId = randomUUID();
    const assignee = body.assignee ?? null;
    const priority = body.priority ?? "p3";
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    const category = body.category ?? "inbox";
    const relatedProject = body.relatedProject ?? null;

    const task = await taskRepository.upsertStructuredTask({
      id: taskId,
      title,
      detailsJson: { createdBy: staffMember.name, createdVia: "mini-app" },
      status: "todo",
      priority,
      category,
      assignee,
      dueAt,
      timeBucket: null,
      waitingFor: null,
      relatedProject,
      sourceText: title,
      sourceChannel: "mini-app",
      sourceMessageId: `mini-${tgUserId}-${now.getTime()}`,
      segmentHash: `mini:${taskId}`,
      segmentIndex: 0,
    });

    revalidateDashboardTag();

    // 알림 webhook (fire-and-forget)
    const webhookUrl = getEnv().notifyWebhookUrl;
    if (webhookUrl && assignee) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "task_created",
          taskId: task.id,
          title: task.title,
          assignee,
          createdBy: staffMember.name,
          priority,
        }),
      }).catch(() => {});
    }

    return Response.json({ ok: true, task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
