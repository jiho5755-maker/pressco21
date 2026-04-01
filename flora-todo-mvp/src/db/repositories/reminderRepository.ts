import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { reminders } from "@/src/db/schema";

type CreateReminderInput = {
  id: string;
  taskId: string;
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
        title: input.title,
        remindAt: input.remindAt,
        kind: input.kind ?? "manual",
        message: input.message ?? null,
        status: input.status ?? "pending",
      })
      .returning();

    return createdReminder;
  },

  async listByTaskId(taskId: string) {
    return db.select().from(reminders).where(eq(reminders.taskId, taskId));
  },
};
