import { eq, inArray } from "drizzle-orm";
import { db } from "@/src/db/client";
import { followups } from "@/src/db/schema";

type CreateFollowupInput = {
  id: string;
  taskId: string;
  signature: string;
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
        signature: input.signature,
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
          signature: input.signature,
          subject: input.subject,
          followupType: input.followupType ?? "manual",
          waitingFor: input.waitingFor ?? null,
          nextCheckAt: input.nextCheckAt ?? null,
          status: input.status ?? "open",
          lastNote: input.lastNote ?? null,
        })),
      )
      .onConflictDoNothing({
        target: [followups.taskId, followups.signature],
      })
      .returning();
  },

  async listByTaskId(taskId: string) {
    return db.select().from(followups).where(eq(followups.taskId, taskId));
  },

  async listByTaskIds(taskIds: string[]) {
    if (taskIds.length === 0) {
      return [];
    }

    return db.select().from(followups).where(inArray(followups.taskId, taskIds));
  },

  async deleteByTaskIds(taskIds: string[]) {
    if (taskIds.length === 0) {
      return [];
    }

    return db.delete(followups).where(inArray(followups.taskId, taskIds)).returning();
  },

  async patchById(
    followupId: string,
    input: {
      subject?: string;
      followupType?: string;
      waitingFor?: string | null;
      nextCheckAt?: Date | null;
      status?: string;
      lastNote?: string | null;
    },
  ) {
    const [updatedFollowup] = await db
      .update(followups)
      .set({
        subject: input.subject,
        followupType: input.followupType,
        waitingFor: input.waitingFor,
        nextCheckAt: input.nextCheckAt,
        status: input.status,
        lastNote: input.lastNote,
        updatedAt: new Date(),
      })
      .where(eq(followups.id, followupId))
      .returning();

    return updatedFollowup ?? null;
  },

  async deleteById(followupId: string) {
    const [deletedFollowup] = await db.delete(followups).where(eq(followups.id, followupId)).returning();
    return deletedFollowup ?? null;
  },
};
