import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { reminders, tasks } from "@/src/db/schema";
import { TaskPriority, TaskStatus } from "@/src/domain/task";
import { getEndOfToday, getEndOfWeek, getStartOfToday } from "@/src/lib/time";
import { DashboardDateRange, DashboardFilters } from "@/src/types/dashboard";

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

const activeTaskStatuses: TaskStatus[] = ["todo", "waiting", "needs_check", "in_progress"];

function getEndOfNextDays(now = new Date(), days = 6) {
  const end = getEndOfToday(now);
  end.setDate(end.getDate() + days);
  return end;
}

function getDashboardBounds(now = new Date()) {
  return {
    todayStart: getStartOfToday(now),
    todayEnd: getEndOfToday(now),
    weekEnd: getEndOfWeek(now),
    next7DaysEnd: getEndOfNextDays(now, 6),
  };
}

function buildDashboardSearchClause(search?: string) {
  const normalized = search?.trim();

  if (!normalized) {
    return undefined;
  }

  return or(
    ilike(tasks.title, `%${normalized}%`),
    ilike(tasks.sourceText, `%${normalized}%`),
    ilike(tasks.waitingFor, `%${normalized}%`),
    ilike(tasks.relatedProject, `%${normalized}%`),
    ilike(tasks.category, `%${normalized}%`),
    ilike(tasks.sourceChannel, `%${normalized}%`),
    ilike(tasks.sourceMessageId, `%${normalized}%`),
  );
}

function buildDashboardFilterWhereClause(input?: {
  search?: string;
  status?: DashboardFilters["status"];
  priority?: DashboardFilters["priority"];
}) {
  return and(
    isNull(tasks.ignoredAt),
    input?.status && input.status !== "all"
      ? input.status === "active"
        ? inArray(tasks.status, activeTaskStatuses)
        : eq(tasks.status, input.status)
      : undefined,
    input?.priority && input.priority !== "all" ? eq(tasks.priority, input.priority) : undefined,
    buildDashboardSearchClause(input?.search),
  );
}

function buildOperationalWhereClause() {
  return and(isNull(tasks.ignoredAt), inArray(tasks.status, activeTaskStatuses));
}

function buildTodayWhereClause(now = new Date()) {
  const bounds = getDashboardBounds(now);

  return and(
    buildOperationalWhereClause(),
    or(
      and(gte(tasks.dueAt, bounds.todayStart), lte(tasks.dueAt, bounds.todayEnd)),
      and(isNull(tasks.dueAt), eq(tasks.timeBucket, "today")),
    ),
  );
}

function buildThisWeekOnlyWhereClause(now = new Date()) {
  const bounds = getDashboardBounds(now);

  return and(
    buildOperationalWhereClause(),
    or(
      and(gt(tasks.dueAt, bounds.todayEnd), lte(tasks.dueAt, bounds.weekEnd)),
      and(isNull(tasks.dueAt), inArray(tasks.timeBucket, ["this_week", "tomorrow"])),
    ),
  );
}

function buildThisWeekWhereClause(now = new Date()) {
  const bounds = getDashboardBounds(now);

  return and(
    buildOperationalWhereClause(),
    or(
      and(gte(tasks.dueAt, bounds.todayStart), lte(tasks.dueAt, bounds.todayEnd)),
      and(gt(tasks.dueAt, bounds.todayEnd), lte(tasks.dueAt, bounds.weekEnd)),
      and(isNull(tasks.dueAt), eq(tasks.timeBucket, "today")),
      and(isNull(tasks.dueAt), inArray(tasks.timeBucket, ["this_week", "tomorrow"])),
    ),
  );
}

function buildOverdueWhereClause(now = new Date()) {
  const bounds = getDashboardBounds(now);

  return and(
    buildOperationalWhereClause(),
    isNotNull(tasks.dueAt),
    lt(tasks.dueAt, bounds.todayStart),
  );
}

function buildNextReminderSubquery(now = new Date()) {
  const { todayStart } = getDashboardBounds(now);

  return db
    .select({
      taskId: reminders.taskId,
      nextReminderAt: sql<Date | null>`min(${reminders.remindAt})`.as("next_reminder_at"),
    })
    .from(reminders)
    .where(and(ne(reminders.status, "cancelled"), gte(reminders.remindAt, todayStart)))
    .groupBy(reminders.taskId)
    .as("dashboard_next_reminders");
}

function buildPriorityOrderSql() {
  return sql<number>`case
    when ${tasks.priority} = 'p1' then 0
    when ${tasks.priority} = 'p2' then 1
    when ${tasks.priority} = 'p3' then 2
    when ${tasks.priority} = 'p4' then 3
    else 99
  end`;
}

function buildScheduleAtSql(nextReminderAt: unknown) {
  return sql<Date | null>`case
    when ${tasks.dueAt} is null then ${nextReminderAt as any}
    when ${nextReminderAt as any} is null then ${tasks.dueAt}
    when ${tasks.dueAt} <= ${nextReminderAt as any} then ${tasks.dueAt}
    else ${nextReminderAt as any}
  end`;
}

function buildInScopeWhereClause(
  range: DashboardDateRange,
  now = new Date(),
  scheduleAt = buildScheduleAtSql(sql<Date | null>`null`),
) {
  const bounds = getDashboardBounds(now);

  if (range === "today") {
    return buildTodayWhereClause(now);
  }

  if (range === "thisWeek") {
    return buildThisWeekWhereClause(now);
  }

  return and(
    buildOperationalWhereClause(),
    sql`${scheduleAt} >= ${bounds.todayStart} and ${scheduleAt} <= ${bounds.next7DaysEnd}`,
  );
}

async function listDashboardTaskRows(input: {
  whereClause: ReturnType<typeof and> | ReturnType<typeof sql>;
  sort: DashboardFilters["sort"] | "scheduleAt";
  page?: number;
  limit: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const nextReminders = buildNextReminderSubquery(now);
  const priorityOrder = buildPriorityOrderSql();
  const scheduleAt = buildScheduleAtSql(nextReminders.nextReminderAt);
  const baseQuery = db
    .select({
      task: tasks,
    })
    .from(tasks)
    .leftJoin(nextReminders, eq(tasks.id, nextReminders.taskId))
    .where(input.whereClause);
  const offset = input.page ? Math.max(0, (input.page - 1) * input.limit) : 0;

  if (input.sort === "createdAt") {
    const rows = await baseQuery.orderBy(desc(tasks.createdAt), desc(tasks.updatedAt), desc(tasks.id)).limit(input.limit).offset(offset);
    return rows.map((row) => row.task);
  }

  if (input.sort === "updatedAt") {
    const rows = await baseQuery.orderBy(desc(tasks.updatedAt), desc(tasks.id)).limit(input.limit).offset(offset);
    return rows.map((row) => row.task);
  }

  if (input.sort === "dueAt") {
    const rows = await baseQuery.orderBy(asc(tasks.dueAt), desc(tasks.updatedAt), desc(tasks.id)).limit(input.limit).offset(offset);
    return rows.map((row) => row.task);
  }

  if (input.sort === "scheduleAt") {
    const rows = await baseQuery.orderBy(asc(scheduleAt), desc(tasks.updatedAt), desc(tasks.id)).limit(input.limit).offset(offset);
    return rows.map((row) => row.task);
  }

  const rows = await baseQuery
    .orderBy(priorityOrder, asc(scheduleAt), desc(tasks.updatedAt), desc(tasks.id))
    .limit(input.limit)
    .offset(offset);

  return rows.map((row) => row.task);
}

async function countDashboardTaskRows(input: {
  whereClause: ReturnType<typeof and> | ReturnType<typeof sql>;
  now?: Date;
}) {
  const nextReminders = buildNextReminderSubquery(input.now ?? new Date());
  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .leftJoin(nextReminders, eq(tasks.id, nextReminders.taskId))
    .where(input.whereClause);

  return row?.value ?? 0;
}

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

function buildReviewQueueWhereClause(input?: {
  search?: string;
  status?: string;
  priority?: string;
}) {
  const search = input?.search?.trim();

  return and(
    isNull(tasks.ignoredAt),
    input?.status && input.status !== "all" ? eq(tasks.status, input.status) : undefined,
    input?.priority && input.priority !== "all" ? eq(tasks.priority, input.priority) : undefined,
    search
      ? or(
          ilike(tasks.title, `%${search}%`),
          ilike(tasks.sourceText, `%${search}%`),
          ilike(tasks.waitingFor, `%${search}%`),
          ilike(tasks.relatedProject, `%${search}%`),
          ilike(tasks.category, `%${search}%`),
          ilike(tasks.sourceChannel, `%${search}%`),
          ilike(tasks.sourceMessageId, `%${search}%`),
        )
      : undefined,
  );
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

  async listByIds(taskIds: string[]) {
    if (taskIds.length === 0) {
      return [];
    }

    const rows = await db.select().from(tasks).where(inArray(tasks.id, taskIds));
    const rowMap = new Map(rows.map((task) => [task.id, task]));

    return taskIds.map((taskId) => rowMap.get(taskId)).filter((task): task is (typeof rows)[number] => Boolean(task));
  },

  async listBySourceMessage(sourceChannel: string, sourceMessageId: string) {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.sourceChannel, sourceChannel), eq(tasks.sourceMessageId, sourceMessageId)))
      .orderBy(tasks.segmentIndex, tasks.createdAt);
  },

  async listReviewQueue(limit = 50) {
    return db
      .select()
      .from(tasks)
      .where(isNull(tasks.ignoredAt))
      .orderBy(desc(tasks.updatedAt))
      .limit(limit);
  },

  async listAllReviewQueue() {
    return db.select().from(tasks).where(isNull(tasks.ignoredAt)).orderBy(desc(tasks.updatedAt));
  },

  async countReviewQueue(input?: {
    search?: string;
    status?: string;
    priority?: string;
  }) {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(buildReviewQueueWhereClause(input));

    return row?.value ?? 0;
  },

  async listReviewQueuePage(input: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    priority?: string;
  }) {
    const offset = Math.max(0, (input.page - 1) * input.limit);

    return db
      .select()
      .from(tasks)
      .where(buildReviewQueueWhereClause(input))
      .orderBy(desc(tasks.updatedAt), desc(tasks.id))
      .limit(input.limit)
      .offset(offset);
  },

  async findReviewQueuePageForTask(
    taskId: string,
    input: {
      limit: number;
      search?: string;
      status?: string;
      priority?: string;
    },
  ) {
    const task = await this.findById(taskId);

    if (!task || task.ignoredAt) {
      return null;
    }

    const whereClause = buildReviewQueueWhereClause(input);
    const [matchesFilter] = await db
      .select({ value: count() })
      .from(tasks)
      .where(and(whereClause, eq(tasks.id, taskId)));

    if (!matchesFilter?.value) {
      return null;
    }

    const [aheadCount] = await db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          whereClause,
          or(
            gt(tasks.updatedAt, task.updatedAt),
            and(eq(tasks.updatedAt, task.updatedAt), gt(tasks.id, task.id)),
          ),
        ),
      );

    return Math.floor((aheadCount?.value ?? 0) / input.limit) + 1;
  },

  async listDashboardTasks() {
    return db.select().from(tasks).where(isNull(tasks.ignoredAt)).orderBy(desc(tasks.createdAt), desc(tasks.updatedAt));
  },

  async countDashboardExplorer(input?: {
    search?: string;
    status?: DashboardFilters["status"];
    priority?: DashboardFilters["priority"];
  }) {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(buildDashboardFilterWhereClause(input));

    return row?.value ?? 0;
  },

  async listDashboardExplorerPage(input: {
    page: number;
    limit: number;
    search?: string;
    status?: DashboardFilters["status"];
    priority?: DashboardFilters["priority"];
    sort?: DashboardFilters["sort"];
    now?: Date;
  }) {
    return listDashboardTaskRows({
      whereClause: buildDashboardFilterWhereClause(input),
      sort: input.sort ?? "operations",
      page: input.page,
      limit: input.limit,
      now: input.now,
    });
  },

  async countDashboardToday(now = new Date()) {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(buildTodayWhereClause(now));

    return row?.value ?? 0;
  },

  async countDashboardStatuses(statuses: TaskStatus[]) {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(and(isNull(tasks.ignoredAt), inArray(tasks.status, statuses)));

    return row?.value ?? 0;
  },

  async countDashboardThisWeek(now = new Date()) {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(buildThisWeekWhereClause(now));

    return row?.value ?? 0;
  },

  async countDashboardInScope(range: DashboardDateRange, now = new Date()) {
    if (range === "today") {
      return this.countDashboardToday(now);
    }

    if (range === "thisWeek") {
      return this.countDashboardThisWeek(now);
    }

    const nextReminders = buildNextReminderSubquery(now);
    const scheduleAt = buildScheduleAtSql(nextReminders.nextReminderAt);

    return countDashboardTaskRows({
      whereClause: buildInScopeWhereClause(range, now, scheduleAt),
      now,
    });
  },

  async countDashboardPriority(priority: TaskPriority) {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(and(buildOperationalWhereClause(), eq(tasks.priority, priority)));

    return row?.value ?? 0;
  },

  async listDashboardTopPriority(priority: TaskPriority, limit: number, now = new Date()) {
    return listDashboardTaskRows({
      whereClause: and(buildOperationalWhereClause(), eq(tasks.priority, priority)),
      sort: "operations",
      limit,
      now,
    });
  },

  async listDashboardToday(limit: number, now = new Date()) {
    return listDashboardTaskRows({
      whereClause: buildTodayWhereClause(now),
      sort: "operations",
      limit,
      now,
    });
  },

  async listDashboardFocus(range: DashboardDateRange, limit: number, now = new Date()) {
    if (range === "today") {
      return this.listDashboardToday(limit, now);
    }

    if (range === "thisWeek") {
      return listDashboardTaskRows({
        whereClause: buildThisWeekWhereClause(now),
        sort: "operations",
        limit,
        now,
      });
    }

    const nextReminders = buildNextReminderSubquery(now);
    const scheduleAt = buildScheduleAtSql(nextReminders.nextReminderAt);

    return listDashboardTaskRows({
      whereClause: buildInScopeWhereClause(range, now, scheduleAt),
      sort: "operations",
      limit,
      now,
    });
  },

  async listDashboardWaiting(limit: number, now = new Date()) {
    return listDashboardTaskRows({
      whereClause: and(buildOperationalWhereClause(), eq(tasks.status, "waiting")),
      sort: "operations",
      limit,
      now,
    });
  },

  async listDashboardUpcoming(range: DashboardDateRange, limit: number, now = new Date()) {
    const nextReminders = buildNextReminderSubquery(now);
    const scheduleAt = buildScheduleAtSql(nextReminders.nextReminderAt);

    return listDashboardTaskRows({
      whereClause: buildInScopeWhereClause(range, now, scheduleAt),
      sort: "scheduleAt",
      limit,
      now,
    });
  },

  async listDashboardRecent(limit: number) {
    return db
      .select()
      .from(tasks)
      .where(isNull(tasks.ignoredAt))
      .orderBy(desc(tasks.createdAt), desc(tasks.updatedAt), desc(tasks.id))
      .limit(limit);
  },

  async listAutomationMorningTasks(limit: number, now = new Date()) {
    return listDashboardTaskRows({
      whereClause: buildTodayWhereClause(now),
      sort: "dueAt",
      limit,
      now,
    });
  },

  async listAutomationOverdueTasks(limit: number, now = new Date()) {
    return listDashboardTaskRows({
      whereClause: buildOverdueWhereClause(now),
      sort: "dueAt",
      limit,
      now,
    });
  },

  async listAutomationCalendarSyncCandidates(since: Date, limit: number) {
    return db
      .select()
      .from(tasks)
      .where(
        and(
          isNull(tasks.ignoredAt),
          isNotNull(tasks.dueAt),
          gte(tasks.updatedAt, since),
          ne(tasks.status, "cancelled"),
          ne(tasks.sourceChannel, "google-calendar"),
        ),
      )
      .orderBy(desc(tasks.updatedAt), desc(tasks.id))
      .limit(limit);
  },

  async upsertStructuredTask(input: CreateTaskInput) {
    const [savedTask] = await db
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
      .onConflictDoUpdate({
        target: [tasks.sourceChannel, tasks.sourceMessageId, tasks.segmentHash],
        set: {
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
          segmentIndex: input.segmentIndex,
          ignoredAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return savedTask;
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

  async patchAutomationTask(
    taskId: string,
    input: {
      status?: TaskStatus;
      priority?: TaskPriority;
      detailsMerge?: Record<string, unknown>;
    },
  ) {
    const task = await this.findById(taskId);

    if (!task || task.ignoredAt) {
      return null;
    }

    const nextDetailsJson = input.detailsMerge
      ? {
          ...(task.detailsJson ?? {}),
          ...input.detailsMerge,
        }
      : task.detailsJson ?? {};

    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: input.status,
        priority: input.priority,
        detailsJson: nextDetailsJson,
        reviewedAt: new Date(),
        ignoredAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return updatedTask ?? null;
  },

  async markReviewed(taskId: string) {
    const [updatedTask] = await db
      .update(tasks)
      .set({
        reviewedAt: new Date(),
        ignoredAt: null,
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
