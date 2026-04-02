import { followupRepository } from "@/src/db/repositories/followupRepository";
import { reminderRepository } from "@/src/db/repositories/reminderRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import {
  buildDashboardSections,
  buildDashboardSummary,
  filterDashboardTasks,
  filterTasksByDateRange,
  getTaskScheduleAt,
  isOperationalTask,
  sortDashboardTasks,
} from "@/src/lib/dashboard";
import {
  DashboardDateRange,
  DashboardFilters,
  DashboardPayload,
  DashboardQueryOptions,
  DashboardSummary,
  DashboardTask,
} from "@/src/types/dashboard";

const defaultFilters: DashboardFilters = {
  search: "",
  status: "active",
  priority: "all",
  sort: "operations",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function paginateTasks(tasks: DashboardTask[], page = 1, limit = 12) {
  const safeLimit = clamp(limit, 1, 50);
  const totalCount = tasks.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
  const safePage = clamp(page, 1, totalPages);
  const startIndex = (safePage - 1) * safeLimit;

  return {
    items: tasks.slice(startIndex, startIndex + safeLimit),
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

function resolveFilters(filters?: Partial<DashboardFilters>): DashboardFilters {
  return {
    search: filters?.search ?? defaultFilters.search,
    status: filters?.status ?? defaultFilters.status,
    priority: filters?.priority ?? defaultFilters.priority,
    sort: filters?.sort ?? defaultFilters.sort,
  };
}

function resolveDateRange(range?: DashboardDateRange): DashboardDateRange {
  if (range === "today" || range === "thisWeek" || range === "next7Days") {
    return range;
  }

  return "thisWeek";
}

function getFallbackTask(
  selectedTask: DashboardTask | null,
  explorerTasks: DashboardTask[],
  sections: DashboardPayload["sections"],
) {
  if (selectedTask) {
    return selectedTask;
  }

  return (
    sections.topPriority[0] ??
    sections.today[0] ??
    sections.waiting[0] ??
    sections.upcoming[0] ??
    sections.recent[0] ??
    explorerTasks[0] ??
    null
  );
}

async function hydrateDashboardTasks(tasks: Array<Omit<DashboardTask, "reminders" | "followups">>) {
  if (tasks.length === 0) {
    return [] as DashboardTask[];
  }

  const taskIds = tasks.map((task) => task.id);
  const [reminders, followups] = await Promise.all([
    reminderRepository.listByTaskIds(taskIds),
    followupRepository.listByTaskIds(taskIds),
  ]);
  const reminderMap = new Map<string, DashboardTask["reminders"]>();
  const followupMap = new Map<string, DashboardTask["followups"]>();

  for (const reminder of reminders) {
    const items = reminderMap.get(reminder.taskId) ?? [];
    items.push(reminder);
    reminderMap.set(reminder.taskId, items);
  }

  for (const followup of followups) {
    const items = followupMap.get(followup.taskId) ?? [];
    items.push(followup);
    followupMap.set(followup.taskId, items);
  }

  return tasks.map((task) => ({
    ...task,
    reminders: reminderMap.get(task.id) ?? [],
    followups: followupMap.get(task.id) ?? [],
  }));
}

function mapTasksById(tasks: DashboardTask[]) {
  return new Map(tasks.map((task) => [task.id, task]));
}

function selectHydratedTasks(taskIds: string[], taskMap: Map<string, DashboardTask>) {
  return taskIds.map((taskId) => taskMap.get(taskId)).filter((task): task is DashboardTask => Boolean(task));
}

export async function loadDashboardSnapshot() {
  return hydrateDashboardTasks(await taskRepository.listDashboardTasks());
}

export function buildDashboardData(
  tasks: DashboardTask[],
  options: DashboardQueryOptions = {},
  now = new Date(),
): DashboardPayload {
  const filters = resolveFilters(options.filters);
  const dateRange = resolveDateRange(options.dateRange);
  const summaryBase = buildDashboardSummary(tasks, now);
  const baseSections = buildDashboardSections(tasks, now);
  const activeTasks = tasks.filter((task) => isOperationalTask(task));
  const inScopeTasks = filterTasksByDateRange(activeTasks, dateRange, now);
  const sections: DashboardPayload["sections"] = {
    topPriority: baseSections.topPriority,
    today: baseSections.today,
    focus: sortDashboardTasks(inScopeTasks, "operations", now).slice(0, 6),
    waiting: baseSections.waiting,
    upcoming: [...inScopeTasks]
      .sort((left, right) => {
        const leftAt = getTaskScheduleAt(left, now)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightAt = getTaskScheduleAt(right, now)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftAt - rightAt;
      })
      .slice(0, 6),
    recent: baseSections.recent,
  };
  const explorerTasks = sortDashboardTasks(
    filterDashboardTasks(tasks, {
      ...filters,
      search: filters.search.trim(),
    }),
    filters.sort,
    now,
  );
  const explorer = paginateTasks(explorerTasks, options.page ?? 1, options.limit ?? 12);
  const requestedTask = options.selectedTaskId ? tasks.find((task) => task.id === options.selectedTaskId) ?? null : null;
  const selectedTask = getFallbackTask(requestedTask, explorer.items, sections);
  const summary: DashboardSummary = {
    ...summaryBase,
    upcoming: inScopeTasks.length,
  };

  return {
    summary,
    sections,
    explorer,
    selectedTask,
    inScopeCount: inScopeTasks.length,
  };
}

export async function getDashboardData(options: DashboardQueryOptions = {}) {
  const now = new Date();
  const filters = resolveFilters(options.filters);
  const dateRange = resolveDateRange(options.dateRange);
  const limit = clamp(options.limit ?? 12, 1, 50);
  const requestedPage = Math.max(1, options.page ?? 1);
  const selectedTaskId = options.selectedTaskId ?? null;

  const [todoCount, waitingCount, todayCount, thisWeekCount, p1Count, p2Count, inScopeCount, explorerTotalCount, todayRows, focusRows, waitingRows, upcomingRows, recentRows, requestedTask] =
    await Promise.all([
      taskRepository.countDashboardStatuses(["todo", "needs_check", "in_progress"]),
      taskRepository.countDashboardStatuses(["waiting"]),
      taskRepository.countDashboardToday(now),
      taskRepository.countDashboardThisWeek(now),
      taskRepository.countDashboardPriority("p1"),
      taskRepository.countDashboardPriority("p2"),
      taskRepository.countDashboardInScope(dateRange, now),
      taskRepository.countDashboardExplorer(filters),
      taskRepository.listDashboardToday(6, now),
      taskRepository.listDashboardFocus(dateRange, 6, now),
      taskRepository.listDashboardWaiting(6, now),
      taskRepository.listDashboardUpcoming(dateRange, 6, now),
      taskRepository.listDashboardRecent(6),
      selectedTaskId ? taskRepository.findById(selectedTaskId) : Promise.resolve(null),
    ]);

  const topPriorityKey = p1Count > 0 ? "p1" : "p2";
  const topPriorityRows = await taskRepository.listDashboardTopPriority(topPriorityKey, 5, now);
  const totalPages = Math.max(1, Math.ceil(explorerTotalCount / limit));
  const page = clamp(requestedPage, 1, totalPages);
  const explorerRows = await taskRepository.listDashboardExplorerPage({
    page,
    limit,
    search: filters.search,
    status: filters.status,
    priority: filters.priority,
    sort: filters.sort,
    now,
  });

  const taskIds = Array.from(
    new Set(
      [
        ...topPriorityRows.map((task) => task.id),
        ...todayRows.map((task) => task.id),
        ...focusRows.map((task) => task.id),
        ...waitingRows.map((task) => task.id),
        ...upcomingRows.map((task) => task.id),
        ...recentRows.map((task) => task.id),
        ...explorerRows.map((task) => task.id),
        requestedTask?.id,
      ].filter((taskId): taskId is string => Boolean(taskId)),
    ),
  );
  const hydratedTasks = await hydrateDashboardTasks(await taskRepository.listByIds(taskIds));
  const taskMap = mapTasksById(hydratedTasks);
  const sections: DashboardPayload["sections"] = {
    topPriority: selectHydratedTasks(
      topPriorityRows.map((task) => task.id),
      taskMap,
    ),
    today: selectHydratedTasks(
      todayRows.map((task) => task.id),
      taskMap,
    ),
    focus: selectHydratedTasks(
      focusRows.map((task) => task.id),
      taskMap,
    ),
    waiting: selectHydratedTasks(
      waitingRows.map((task) => task.id),
      taskMap,
    ),
    upcoming: selectHydratedTasks(
      upcomingRows.map((task) => task.id),
      taskMap,
    ),
    recent: selectHydratedTasks(
      recentRows.map((task) => task.id),
      taskMap,
    ),
  };
  const explorerItems = selectHydratedTasks(
    explorerRows.map((task) => task.id),
    taskMap,
  );
  const selectedTask = getFallbackTask(
    requestedTask ? taskMap.get(requestedTask.id) ?? null : null,
    explorerItems,
    sections,
  );

  return {
    summary: {
      todo: todoCount,
      waiting: waitingCount,
      today: todayCount,
      thisWeek: thisWeekCount,
      upcoming: inScopeCount,
      topPriority: p1Count > 0 ? p1Count : p2Count,
      generatedAt: now.toISOString(),
    },
    sections,
    explorer: {
      items: explorerItems,
      page,
      limit,
      totalCount: explorerTotalCount,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
    selectedTask,
    inScopeCount,
  } satisfies DashboardPayload;
}
