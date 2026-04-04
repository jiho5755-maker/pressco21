import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { getStaffBriefing } from "@/src/services/automationService";

export async function GET(request: Request) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const assignee = searchParams.get("assignee");

    if (!assignee) {
      return Response.json(
        { ok: false, error: "assignee parameter is required" },
        { status: 400 },
      );
    }

    const limit = Number(searchParams.get("limit") ?? "20");
    const payload = await getStaffBriefing(assignee, limit);

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
