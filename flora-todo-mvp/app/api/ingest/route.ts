import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { ingestTextAsTask } from "@/src/services/ingestService";
import { logSourceMessage } from "@/src/services/sourceMessageService";
import { IngestRequestBody } from "@/src/types/api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<IngestRequestBody>;

    if (!body.text || !body.sourceChannel || !body.sourceMessageId) {
      return Response.json(
        {
          ok: false,
          error: "sourceChannel, sourceMessageId, text are required.",
        },
        { status: 400 },
      );
    }

    if (!body.dryRun) {
      const metadata =
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : {};

      await logSourceMessage({
        sourceChannel: body.sourceChannel,
        sourceMessageId: body.sourceMessageId,
        messageText: body.text,
        userChatId: body.userChatId ?? undefined,
        userName: body.userName ?? undefined,
        agentId: body.agentId ?? undefined,
        responseSummary: body.responseSummary ?? undefined,
        modelUsed: body.modelUsed ?? undefined,
        skillTriggered: body.skillTriggered ?? undefined,
        tokensUsed: body.tokensUsed ?? undefined,
        responseTimeMs: body.responseTimeMs ?? undefined,
        sourceCreatedAt: body.sourceCreatedAt ?? undefined,
        metadata: {
          ...metadata,
          capturePath: "api/ingest",
        },
      });
    }

    const result = await ingestTextAsTask({
      sourceChannel: body.sourceChannel,
      sourceMessageId: body.sourceMessageId,
      text: body.text,
      userChatId: body.userChatId ?? undefined,
      userName: body.userName ?? undefined,
      agentId: body.agentId ?? undefined,
      responseSummary: body.responseSummary ?? undefined,
      modelUsed: body.modelUsed ?? undefined,
      skillTriggered: body.skillTriggered ?? undefined,
      tokensUsed: body.tokensUsed ?? undefined,
      responseTimeMs: body.responseTimeMs ?? undefined,
      sourceCreatedAt: body.sourceCreatedAt ?? undefined,
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : undefined,
      detailsMerge:
        body.detailsMerge && typeof body.detailsMerge === "object" && !Array.isArray(body.detailsMerge)
          ? body.detailsMerge
          : undefined,
      dryRun: body.dryRun,
    });

    if (!body.dryRun) {
      revalidateDashboardTag();
    }

    return Response.json(
      {
        ok: true,
        result,
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
