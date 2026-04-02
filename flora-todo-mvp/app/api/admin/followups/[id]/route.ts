import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { followupRepository } from "@/src/db/repositories/followupRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";

type FollowupPatchBody = {
  subject?: string;
  followupType?: string;
  waitingFor?: string | null;
  nextCheckAt?: string | null;
  status?: string;
  lastNote?: string | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as FollowupPatchBody;
    const updatedFollowup = await followupRepository.patchById(id, {
      subject: body.subject,
      followupType: body.followupType,
      waitingFor: body.waitingFor,
      nextCheckAt: body.nextCheckAt ? new Date(body.nextCheckAt) : body.nextCheckAt === null ? null : undefined,
      status: body.status,
      lastNote: body.lastNote,
    });

    if (!updatedFollowup) {
      return Response.json({ ok: false, error: "Follow-up not found" }, { status: 404 });
    }

    await taskRepository.markReviewed(updatedFollowup.taskId);
    revalidateDashboardTag();

    return Response.json({ ok: true, followup: updatedFollowup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const deletedFollowup = await followupRepository.deleteById(id);

    if (!deletedFollowup) {
      return Response.json({ ok: false, error: "Follow-up not found" }, { status: 404 });
    }

    await taskRepository.markReviewed(deletedFollowup.taskId);
    revalidateDashboardTag();

    return Response.json({ ok: true, followup: deletedFollowup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
