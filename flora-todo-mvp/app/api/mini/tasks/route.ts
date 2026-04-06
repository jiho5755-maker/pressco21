import { randomUUID } from "node:crypto";
import { extractTelegramUser } from "@/src/lib/telegram-auth";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { getEnv } from "@/src/lib/env";

export async function POST(request: Request) {
  // 인증: Telegram initData 우선, API 키 폴백
  const tgUser = extractTelegramUser(request);
  let creatorName = "관리자";

  if (tgUser) {
    const tgUserId = String(tgUser.id);
    const staffMember = await staffRepository.findByTelegramUserId(tgUserId);
    if (staffMember) {
      creatorName = staffMember.name;
    }
  } else {
    // API 키 폴백 (브라우저 테스트 및 자동화용)
    const apiKey = request.headers.get("x-flora-automation-key");
    const env = getEnv();
    if (!apiKey || apiKey !== env.automationApiKey) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }
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
    const description = body.description ?? null;
    const startAt = body.startAt ?? null;

    const task = await taskRepository.upsertStructuredTask({
      id: taskId,
      title,
      detailsJson: {
        createdBy: creatorName,
        createdVia: "mini-app",
        ...(description ? { description } : {}),
        ...(startAt ? { startAt } : {}),
      },
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
      sourceMessageId: `mini-${tgUser?.id ?? "api"}-${now.getTime()}`,
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
          createdBy: creatorName,
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
