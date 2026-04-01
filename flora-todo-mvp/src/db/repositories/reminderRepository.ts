import { eq, inArray } from "drizzle-orm";
import { db } from "@/src/db/client";
import { reminders } from "@/src/db/schema";

type CreateReminderInput = {
  id: string;
  taskId: string;
  signature: string;
  title: string;
  remindAt: Date;
  kind?: string;
  message?: string | null;
  status?: string;
};

export const reminderRepository = {
  async create(input: CreateReminderInput) {
    const [createdReminder] = await db
      .insert(reminders)
      .values({
        id: input.id,
        taskId: input.taskId,
        signature: input.signature,
        title: input.title,
        remindAt: input.remindAt,
        kind: input.kind ?? "manual",
        message: input.message ?? null,
        status: input.status ?? "pending",
      })
      .returning();

    return createdReminder;
  },

  async createMany(inputs: CreateReminderInput[]) {
    if (inputs.length === 0) {
      return [];
    }

    return db
      .insert(reminders)
      .values(
        inputs.map((input) => ({
          id: input.id,
          taskId: input.taskId,
          signature: input.signature,
          title: input.title,
          remindAt: input.remindAt,
          kind: input.kind ?? "manual",
          message: input.message ?? null,
          status: input.status ?? "pending",
        })),
      )
      .onConflictDoNothing({
        target: [reminders.taskId, reminders.signature],
      })
      .returning();
  },

  async listByTaskId(taskId: string) {
    return db.select().from(reminders).where(eq(reminders.taskId, taskId));
  },

  async listByTaskIds(taskIds: string[]) {
    if (taskIds.length === 0) {
      return [];
    }

    return db.select().from(reminders).where(inArray(reminders.taskId, taskIds));
  },

  async deleteByTaskIds(taskIds: string[]) {
    if (taskIds.length === 0) {
      return [];
    }

    return db.delete(reminders).where(inArray(reminders.taskId, taskIds)).returning();
  },

  async patchById(
    reminderId: string,
    input: {
      title?: string;
      remindAt?: Date | null;
      kind?: string;
      message?: string | null;
      status?: string;
    },
  ) {
    const [updatedReminder] = await db
      .update(reminders)
      .set({
        title: input.title,
        remindAt: input.remindAt ?? undefined,
        kind: input.kind,
        message: input.message,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(reminders.id, reminderId))
      .returning();

    return updatedReminder ?? null;
  },

  async deleteById(reminderId: string) {
    const [deletedReminder] = await db.delete(reminders).where(eq(reminders.id, reminderId)).returning();
    return deletedReminder ?? null;
  },
};
