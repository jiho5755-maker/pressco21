import { and, count, desc, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/src/db/client";
import { tasks } from "@/src/db/schema";
import { TaskPriority, TaskStatus } from "@/src/domain/task";

type CreateTaskInput = {
  id: string;
  title: string;
  detailsJson?: Record<string, unknown>;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  dueAt?: Date | null;
  timeBucket?: string | null;
  waitingFor?: string | null;
  relatedProject?: string | null;
  sourceText: string;
  sourceChannel: string;
  sourceMessageId: string;
  segmentHash: string;
  segmentIndex: number;
};

async function countByStatuses(statuses: TaskStatus[]) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(isNull(tasks.ignoredAt), inArray(tasks.status, statuses)));

  return row?.value ?? 0;
}

async function countByDueRange(start: Date, end: Date) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(
      and(
        isNull(tasks.ignoredAt),
        gte(tasks.dueAt, start),
        lte(tasks.dueAt, end),
        inArray(tasks.status, ["todo", "waiting", "needs_check", "in_progress"]),
      ),
    );

  return row?.value ?? 0;
}

async function countByPriority(priority: TaskPriority) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(
      and(
        isNull(tasks.ignoredAt),
        eq(tasks.priority, priority),
        inArray(tasks.status, ["todo", "waiting", "needs_check", "in_progress"]),
      ),
    );

  return row?.value ?? 0;
}

async function countUpcoming(start: Date, end: Date) {
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .where(
      and(
        isNull(tasks.ignoredAt),
        gte(tasks.dueAt, start),
        lte(tasks.dueAt, end),
        inArray(tasks.status, ["todo", "waiting", "needs_check", "in_progress"]),
      ),
    );

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
        priority: input.priority ?? "p3",
        category: input.category ?? "inbox",
        dueAt: input.dueAt ?? null,
        timeBucket: input.timeBucket ?? null,
        waitingFor: input.waitingFor ?? null,
        relatedProject: input.relatedProject ?? null,
        sourceText: input.sourceText,
        sourceChannel: input.sourceChannel,
        sourceMessageId: input.sourceMessageId,
        segmentHash: input.segmentHash,
        segmentIndex: input.segmentIndex,
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
          segmentHash: input.segmentHash,
          segmentIndex: input.segmentIndex,
        })),
      )
      .returning();
  },

  async findById(taskId: string) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    return task ?? null;
  },

  async listBySourceMessage(sourceChannel: string, sourceMessageId: string) {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.sourceChannel, sourceChannel), eq(tasks.sourceMessageId, sourceMessageId)));
  },

  async listReviewQueue(limit = 50) {
    return db
      .select()
      .from(tasks)
      .where(isNull(tasks.ignoredAt))
      .orderBy(desc(tasks.updatedAt))
      .limit(limit);
  },

  async updateStructuredTask(
    taskId: string,
    input: Omit<CreateTaskInput, "id" | "sourceChannel" | "sourceMessageId"> & {
      sourceChannel: string;
      sourceMessageId: string;
    },
  ) {
    const [updatedTask] = await db
      .update(tasks)
      .set({
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
        segmentHash: input.segmentHash,
        segmentIndex: input.segmentIndex,
        ignoredAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return updatedTask;
  },

  async patchReviewTask(
    taskId: string,
    input: {
      title?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      category?: string | null;
      dueAt?: Date | null;
      waitingFor?: string | null;
      relatedProject?: string | null;
      ignored?: boolean;
    },
  ) {
    const [updatedTask] = await db
      .update(tasks)
      .set({
        title: input.title,
        status: input.status,
        priority: input.priority,
        category: input.category ?? undefined,
        dueAt: input.dueAt,
        waitingFor: input.waitingFor,
        relatedProject: input.relatedProject,
        reviewedAt: new Date(),
        ignoredAt: input.ignored === true ? new Date() : input.ignored === false ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return updatedTask ?? null;
  },

  async markMissingSegmentsIgnored(
    sourceChannel: string,
    sourceMessageId: string,
    activeSegmentHashes: string[],
  ) {
    const existingTasks = await this.listBySourceMessage(sourceChannel, sourceMessageId);
    const obsoleteTaskIds = existingTasks
      .filter((task) => !activeSegmentHashes.includes(task.segmentHash))
      .map((task) => task.id);

    if (obsoleteTaskIds.length === 0) {
      return [];
    }

    return db
      .update(tasks)
      .set({
        ignoredAt: new Date(),
        status: "ignored",
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, obsoleteTaskIds))
      .returning();
  },

  async getSummary(options: { todayStart: Date; todayEnd: Date; weekEnd: Date }) {
    const [todo, waiting, done, today, thisWeek, topPriority, upcoming] = await Promise.all([
      countByStatuses(["todo", "needs_check", "in_progress"]),
      countByStatuses(["waiting"]),
      countByStatuses(["done", "resolved"]),
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
