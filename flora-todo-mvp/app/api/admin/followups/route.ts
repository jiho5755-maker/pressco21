import { randomUUID } from "crypto";
import { revalidateDashboardTag } from "@/src/lib/cache-tags";
import { followupRepository } from "@/src/db/repositories/followupRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";

type FollowupCreateBody = {
  taskId?: string;
  subject?: string;
  followupType?: string;
  waitingFor?: string | null;
  nextCheckAt?: string | null;
  status?: string;
  lastNote?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FollowupCreateBody;

    if (!body.taskId || !body.subject?.trim()) {
      return Response.json(
        {
          ok: false,
          error: "taskId and subject are required",
        },
        { status: 400 },
      );
    }

    const createdFollowup = await followupRepository.create({
      id: randomUUID(),
      taskId: body.taskId,
      signature: `manual:${randomUUID()}`,
      subject: body.subject.trim(),
      followupType: body.followupType?.trim() || "manual",
      waitingFor: body.waitingFor?.trim() || null,
      nextCheckAt: body.nextCheckAt ? new Date(body.nextCheckAt) : null,
      status: body.status?.trim() || "open",
      lastNote: body.lastNote?.trim() || null,
    });

    await taskRepository.markReviewed(createdFollowup.taskId);
    revalidateDashboardTag();

    return Response.json({ ok: true, followup: createdFollowup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
