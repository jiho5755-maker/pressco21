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
      await logSourceMessage({
        sourceChannel: body.sourceChannel,
        sourceMessageId: body.sourceMessageId,
        messageText: body.text,
        metadata: {
          capturePath: "api/ingest",
        },
      });
    }

    const result = await ingestTextAsTask({
      sourceChannel: body.sourceChannel,
      sourceMessageId: body.sourceMessageId,
      text: body.text,
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
