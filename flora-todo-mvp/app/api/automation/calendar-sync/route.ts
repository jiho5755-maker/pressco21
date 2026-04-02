import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { getCalendarSyncItems } from "@/src/services/automationService";

function parseSince(value: string | null) {
  if (!value) {
    return new Date(Date.now() - 5 * 60 * 1000);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(Date.now() - 5 * 60 * 1000) : parsed;
}

export async function GET(request: Request) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "20");
    const since = parseSince(searchParams.get("since"));
    const items = await getCalendarSyncItems(since, limit);

    return Response.json({
      ok: true,
      generatedAt: new Date().toISOString(),
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
