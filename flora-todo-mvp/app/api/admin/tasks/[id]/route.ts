import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import { TaskPriority, TaskStatus } from "@/src/domain/task";

type TaskPatchBody = {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string | null;
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
      dueAt: body.dueAt ? new Date(body.dueAt) : body.dueAt === null ? null : undefined,
      waitingFor: body.waitingFor,
      relatedProject: body.relatedProject,
      ignored: body.ignored,
    });

    if (!updatedTask) {
      return Response.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    revalidateDashboardTag();

    return Response.json({ ok: true, task: updatedTask });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
