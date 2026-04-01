import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { followups } from "@/src/db/schema";

type CreateFollowupInput = {
  id: string;
  taskId: string;
  subject: string;
  followupType?: string;
  waitingFor?: string | null;
  nextCheckAt?: Date | null;
  status?: string;
  lastNote?: string | null;
};

export const followupRepository = {
  async create(input: CreateFollowupInput) {
    const [createdFollowup] = await db
      .insert(followups)
      .values({
        id: input.id,
        taskId: input.taskId,
        subject: input.subject,
        followupType: input.followupType ?? "manual",
        waitingFor: input.waitingFor ?? null,
        nextCheckAt: input.nextCheckAt ?? null,
        status: input.status ?? "open",
        lastNote: input.lastNote ?? null,
      })
      .returning();

    return createdFollowup;
  },

  async createMany(inputs: CreateFollowupInput[]) {
    if (inputs.length === 0) {
      return [];
    }

    return db
      .insert(followups)
      .values(
        inputs.map((input) => ({
          id: input.id,
          taskId: input.taskId,
          subject: input.subject,
          followupType: input.followupType ?? "manual",
          waitingFor: input.waitingFor ?? null,
          nextCheckAt: input.nextCheckAt ?? null,
          status: input.status ?? "open",
          lastNote: input.lastNote ?? null,
        })),
      )
      .returning();
  },

  async listByTaskId(taskId: string) {
    return db.select().from(followups).where(eq(followups.taskId, taskId));
  },
};
