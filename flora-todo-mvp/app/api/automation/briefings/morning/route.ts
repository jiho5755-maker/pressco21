import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { getMorningBrief } from "@/src/services/automationService";

export async function GET(request: Request) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "20");
    const payload = await getMorningBrief(limit);

    return Response.json({
      ok: true,
      ...payload,
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
