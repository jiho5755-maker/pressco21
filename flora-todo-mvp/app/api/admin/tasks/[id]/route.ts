import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import { TaskPriority, TaskStatus } from "@/src/domain/task";
import { getEnv } from "@/src/lib/env";

type TaskPatchBody = {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string | null;
  assignee?: string | null;
  dueAt?: string | null;
  waitingFor?: string | null;
  relatedProject?: string | null;
  ignored?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as TaskPatchBody;
    const updatedTask = await taskRepository.patchReviewTask(id, {
      title: body.title,
      status: body.status,
      priority: body.priority,
      category: body.category,
      assignee: body.assignee,
      dueAt: body.dueAt ? new Date(body.dueAt) : body.dueAt === null ? null : undefined,
      waitingFor: body.waitingFor,
      relatedProject: body.relatedProject,
      ignored: body.ignored,
    });

    if (!updatedTask) {
      return Response.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    revalidateDashboardTag();

    // 상태 변경 알림 webhook (fire-and-forget)
    const webhookUrl = getEnv().notifyWebhookUrl;
    if (webhookUrl && body.status) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "task_status_changed",
          taskId: id,
          title: updatedTask.title,
          newStatus: body.status,
          assignee: updatedTask.assignee,
        }),
      }).catch(() => {});
    }

    return Response.json({ ok: true, task: updatedTask });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
