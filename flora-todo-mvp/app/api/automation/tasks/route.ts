import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { upsertAutomationTask } from "@/src/services/automationService";
import { AutomationTaskUpsertBody } from "@/src/types/automation";

export async function POST(request: Request) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const body = (await request.json()) as Partial<AutomationTaskUpsertBody>;

    if (!body.title || !body.sourceChannel || !body.sourceMessageId || !body.sourceText) {
      return Response.json(
        {
          ok: false,
          error: "title, sourceChannel, sourceMessageId, sourceText are required",
        },
        { status: 400 },
      );
    }

    const task = await upsertAutomationTask({
      title: body.title,
      sourceChannel: body.sourceChannel,
      sourceMessageId: body.sourceMessageId,
      sourceText: body.sourceText,
      status: body.status,
      priority: body.priority,
      category: body.category ?? null,
      dueAt: body.dueAt ?? null,
      timeBucket: body.timeBucket ?? null,
      waitingFor: body.waitingFor ?? null,
      relatedProject: body.relatedProject ?? null,
      detailsMerge: body.detailsMerge,
      segmentHash: body.segmentHash ?? null,
      segmentIndex: body.segmentIndex ?? null,
    });

    revalidateDashboardTag();

    return Response.json(
      {
        ok: true,
        task,
      },
      { status: 201 },
    );
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
