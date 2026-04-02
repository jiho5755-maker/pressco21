import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { listSourceMessages, logSourceMessage } from "@/src/services/sourceMessageService";
import { SourceMessageUpsertInput } from "@/src/types/sourceMessages";

function parseBody(body: Record<string, unknown>): SourceMessageUpsertInput {
  return {
    sourceChannel: String(body.sourceChannel ?? body.source_channel ?? ""),
    sourceMessageId: String(body.sourceMessageId ?? body.source_message_id ?? ""),
    messageText: String(body.messageText ?? body.message_text ?? ""),
    userChatId: body.userChatId ?? body.user_chat_id ? String(body.userChatId ?? body.user_chat_id ?? "") : undefined,
    userName: body.userName ?? body.user_name ? String(body.userName ?? body.user_name ?? "") : undefined,
    agentId: body.agentId ?? body.agent_id ? String(body.agentId ?? body.agent_id ?? "") : undefined,
    responseSummary: body.responseSummary ?? body.response_summary ? String(body.responseSummary ?? body.response_summary ?? "") : undefined,
    modelUsed: body.modelUsed ?? body.model_used ? String(body.modelUsed ?? body.model_used ?? "") : undefined,
    skillTriggered: body.skillTriggered ?? body.skill_triggered ? String(body.skillTriggered ?? body.skill_triggered ?? "") : undefined,
    tokensUsed: typeof (body.tokensUsed ?? body.tokens_used) === "number"
      ? Number(body.tokensUsed ?? body.tokens_used)
      : undefined,
    responseTimeMs: typeof (body.responseTimeMs ?? body.response_time_ms) === "number"
      ? Number(body.responseTimeMs ?? body.response_time_ms)
      : undefined,
    sourceCreatedAt: body.sourceCreatedAt ?? body.source_created_at
      ? String(body.sourceCreatedAt ?? body.source_created_at ?? "")
      : undefined,
    metadata:
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined,
  };
}

function parseLimit(rawLimit: string | null) {
  if (!rawLimit) {
    return undefined;
  }

  const parsed = Number(rawLimit);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const items = await listSourceMessages({
      sourceChannel: url.searchParams.get("sourceChannel") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit")),
    });

    return Response.json({
      ok: true,
      count: items.length,
      items,
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

export async function POST(request: Request) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const body = parseBody((await request.json()) as Record<string, unknown>);

    if (!body.sourceChannel || !body.sourceMessageId || !body.messageText) {
      return Response.json(
        {
          ok: false,
          error: "sourceChannel, sourceMessageId, messageText are required",
        },
        { status: 400 },
      );
    }

    const sourceMessage = await logSourceMessage(body);

    return Response.json(
      {
        ok: true,
        sourceMessage,
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
