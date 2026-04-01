import { and, count, eq, gte, lte } from "drizzle-orm";
import { db } from "@/src/db/client";
import { tasks } from "@/src/db/schema";
import { TaskStatus } from "@/src/domain/task";

type CreateTaskInput = {
  id: string;
  title: string;
  detailsJson?: Record<string, unknown>;
  status?: TaskStatus;
  priority?: string;
  category?: string;
  dueAt?: Date | null;
  timeBucket?: string | null;
  waitingFor?: string | null;
  relatedProject?: string | null;
  sourceText: string;
  sourceChannel: string;
  sourceMessageId: string;
};

async function countByStatus(status: TaskStatus) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.status, status));

  return row?.value ?? 0;
}

async function countByDueRange(start: Date, end: Date) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(gte(tasks.dueAt, start), lte(tasks.dueAt, end)));

  return row?.value ?? 0;
}

export const taskRepository = {
  async create(input: CreateTaskInput) {
    const [createdTask] = await db
      .insert(tasks)
      .values({
        id: input.id,
        title: input.title,
        detailsJson: input.detailsJson ?? {},
        status: input.status ?? "todo",
        priority: input.priority ?? "normal",
        category: input.category ?? "inbox",
        dueAt: input.dueAt ?? null,
        timeBucket: input.timeBucket ?? null,
        waitingFor: input.waitingFor ?? null,
        relatedProject: input.relatedProject ?? null,
        sourceText: input.sourceText,
        sourceChannel: input.sourceChannel,
        sourceMessageId: input.sourceMessageId,
      })
      .returning();

    return createdTask;
  },

  async findById(taskId: string) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    return task ?? null;
  },

  async getSummary(options: { todayStart: Date; todayEnd: Date; weekEnd: Date }) {
    const [todo, waiting, done, today, thisWeek] = await Promise.all([
      countByStatus("todo"),
      countByStatus("waiting"),
      countByStatus("done"),
      countByDueRange(options.todayStart, options.todayEnd),
      countByDueRange(options.todayStart, options.weekEnd),
    ]);

    return {
      todo,
      waiting,
      done,
      today,
      thisWeek,
    };
  },
};
