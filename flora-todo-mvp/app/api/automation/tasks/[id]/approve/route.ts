import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { db } from "@/src/db";
import { tasks } from "@/src/db/schema/tasks";
import { eq } from "drizzle-orm";
import { revalidateDashboardTag } from "@/src/lib/cache-tags";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as string; // "approve" | "reject" | "hold" | "feedback"

    const now = new Date();
    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (action === "approve") {
      updateData.approvalStatus = "approved";
      updateData.approvedAt = now;
      updateData.approvedBy = body.approvedBy || "ceo";
      updateData.status = "in_progress";
    } else if (action === "reject") {
      updateData.approvalStatus = "rejected";
      updateData.feedbackText = body.feedback || "";
    } else if (action === "hold") {
      updateData.approvalStatus = "hold";
    } else if (action === "feedback") {
      updateData.approvalStatus = "needs_revision";
      updateData.feedbackText = body.feedback || "";
    } else {
      return Response.json({ ok: false, error: "action must be: approve, reject, hold, feedback" }, { status: 400 });
    }

    const result = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();

    if (result.length === 0) {
      return Response.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    revalidateDashboardTag();

    return Response.json({ ok: true, task: result[0], action });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
