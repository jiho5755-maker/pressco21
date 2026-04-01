import { ingestTextAsTask } from "@/src/services/ingestService";
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

    const result = await ingestTextAsTask({
      sourceChannel: body.sourceChannel,
      sourceMessageId: body.sourceMessageId,
      text: body.text,
    });

    return Response.json(
      {
        ok: true,
        task: result,
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
