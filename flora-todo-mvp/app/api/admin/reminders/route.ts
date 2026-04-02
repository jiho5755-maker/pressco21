import { randomUUID } from "crypto";
import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { reminderRepository } from "@/src/db/repositories/reminderRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";

type ReminderCreateBody = {
  taskId?: string;
  title?: string;
  remindAt?: string | null;
  kind?: string;
  message?: string | null;
  status?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReminderCreateBody;

    if (!body.taskId || !body.title?.trim() || !body.remindAt) {
      return Response.json(
        {
          ok: false,
          error: "taskId, title, remindAt are required",
        },
        { status: 400 },
      );
    }

    const createdReminder = await reminderRepository.create({
      id: randomUUID(),
      taskId: body.taskId,
      signature: `manual:${randomUUID()}`,
      title: body.title.trim(),
      remindAt: new Date(body.remindAt),
      kind: body.kind?.trim() || "manual",
      message: body.message?.trim() || null,
      status: body.status?.trim() || "pending",
    });

    await taskRepository.markReviewed(createdReminder.taskId);
    revalidateDashboardTag();

    return Response.json({ ok: true, reminder: createdReminder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
