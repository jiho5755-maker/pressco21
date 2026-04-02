import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { patchAutomationTask } from "@/src/services/automationService";
import { AutomationTaskPatchBody } from "@/src/types/automation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as AutomationTaskPatchBody;
    const updatedTask = await patchAutomationTask(id, {
      status: body.status,
      priority: body.priority,
      detailsMerge: body.detailsMerge,
    });

    if (!updatedTask) {
      return Response.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    revalidateDashboardTag();

    return Response.json({
      ok: true,
      task: updatedTask,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
