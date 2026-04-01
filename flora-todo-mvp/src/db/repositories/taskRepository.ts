import { and, count, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/src/db/client";
import { tasks } from "@/src/db/schema";
import { TaskPriority, TaskStatus } from "@/src/domain/task";

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

async function countByStatuses(statuses: TaskStatus[]) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(inArray(tasks.status, statuses));

  return row?.value ?? 0;
}

async function countByDueRange(start: Date, end: Date) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(gte(tasks.dueAt, start), lte(tasks.dueAt, end), ne(tasks.status, "done")));

  return row?.value ?? 0;
}

async function countByPriority(priority: TaskPriority) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.priority, priority), ne(tasks.status, "done")));

  return row?.value ?? 0;
}

async function countUpcoming(start: Date, end: Date) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(gte(tasks.dueAt, start), lte(tasks.dueAt, end), ne(tasks.status, "done")));

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

  async createMany(inputs: CreateTaskInput[]) {
    if (inputs.length === 0) {
      return [];
    }

    return db
      .insert(tasks)
      .values(
        inputs.map((input) => ({
          id: input.id,
          title: input.title,
          detailsJson: input.detailsJson ?? {},
          status: input.status ?? "todo",
          priority: input.priority ?? "p3",
          category: input.category ?? "inbox",
          dueAt: input.dueAt ?? null,
          timeBucket: input.timeBucket ?? null,
          waitingFor: input.waitingFor ?? null,
          relatedProject: input.relatedProject ?? null,
          sourceText: input.sourceText,
          sourceChannel: input.sourceChannel,
          sourceMessageId: input.sourceMessageId,
        })),
      )
      .returning();
  },

  async findById(taskId: string) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    return task ?? null;
  },

  async getSummary(options: { todayStart: Date; todayEnd: Date; weekEnd: Date }) {
    const [todo, waiting, done, today, thisWeek, topPriority, upcoming] = await Promise.all([
      countByStatuses(["todo", "needs_check", "in_progress"]),
      countByStatuses(["waiting"]),
      countByStatuses(["done"]),
      countByDueRange(options.todayStart, options.todayEnd),
      countByDueRange(options.todayStart, options.weekEnd),
      countByPriority("p1"),
      countUpcoming(options.todayEnd, options.weekEnd),
    ]);

    return {
      todo,
      waiting,
      done,
      today,
      thisWeek,
      topPriority,
      upcoming,
    };
  },
};
