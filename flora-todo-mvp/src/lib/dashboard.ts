import {
  DashboardDateRange,
  DashboardFilters,
  DashboardSections,
  DashboardSortMode,
  DashboardSummary,
  DashboardTask,
} from "@/src/types/dashboard";
import { getEndOfToday, getEndOfWeek, getStartOfToday } from "@/src/lib/time";

const activeStatuses = new Set(["todo", "waiting", "needs_check", "in_progress"]);
const priorityRank: Record<string, number> = {
  p1: 0,
  p2: 1,
  p3: 2,
  p4: 3,
};

const defaultFilters: DashboardFilters = {
  search: "",
  status: "active",
  priority: "all",
  sort: "operations",
};

function toDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compareOptionalDateAsc(left: Date | null, right: Date | null) {
  if (left && right) {
    return left.getTime() - right.getTime();
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

function compareUpdatedDesc(left: DashboardTask, right: DashboardTask) {
  return (toDate(right.updatedAt)?.getTime() ?? 0) - (toDate(left.updatedAt)?.getTime() ?? 0);
}

function compareCreatedDesc(left: DashboardTask, right: DashboardTask) {
  return (toDate(right.createdAt)?.getTime() ?? 0) - (toDate(left.createdAt)?.getTime() ?? 0);
}

function comparePriority(left: DashboardTask, right: DashboardTask) {
  return (priorityRank[left.priority] ?? 99) - (priorityRank[right.priority] ?? 99);
}

export function isOperationalTask(task: DashboardTask) {
  return activeStatuses.has(task.status);
}

export function getTaskDueAt(task: DashboardTask) {
  return toDate(task.dueAt);
}

export function getTaskNextReminderAt(task: DashboardTask, now = new Date()) {
  const todayStart = getStartOfToday(now);
  const reminders = task.reminders
    .filter((reminder) => reminder.status !== "cancelled")
    .map((reminder) => toDate(reminder.remindAt))
    .filter((date): date is Date => Boolean(date))
    .filter((date) => date >= todayStart)
    .sort((left, right) => left.getTime() - right.getTime());

  return reminders[0] ?? null;
}

export function getTaskScheduleAt(task: DashboardTask, now = new Date()) {
  const dueAt = getTaskDueAt(task);
  const reminderAt = getTaskNextReminderAt(task, now);
  const todayStart = getStartOfToday(now);
  const candidates = [dueAt, reminderAt]
    .filter((date): date is Date => Boolean(date))
    .filter((date) => date >= todayStart)
    .sort((left, right) => left.getTime() - right.getTime());

  return candidates[0] ?? null;
}

function getEndOfNextDays(now = new Date(), days = 6) {
  const end = getEndOfToday(now);
  end.setDate(end.getDate() + days);
  return end;
}

export function isTodayTask(task: DashboardTask, now = new Date()) {
  const dueAt = getTaskDueAt(task);
  if (dueAt) {
    return dueAt >= getStartOfToday(now) && dueAt <= getEndOfToday(now);
  }

  return task.timeBucket === "today";
}

export function isThisWeekTask(task: DashboardTask, now = new Date()) {
  const dueAt = getTaskDueAt(task);
  if (dueAt) {
    return dueAt > getEndOfToday(now) && dueAt <= getEndOfWeek(now);
  }

  return task.timeBucket === "this_week" || task.timeBucket === "tomorrow";
}

export function isUpcomingTask(task: DashboardTask, now = new Date()) {
  const scheduleAt = getTaskScheduleAt(task, now);
  return Boolean(scheduleAt && scheduleAt <= getEndOfWeek(now));
}

export function filterTasksByDateRange(tasks: DashboardTask[], range: DashboardDateRange, now = new Date()) {
  if (range === "today") {
    return tasks.filter((task) => isTodayTask(task, now));
  }

  if (range === "thisWeek") {
    return tasks.filter((task) => isTodayTask(task, now) || isThisWeekTask(task, now));
  }

  const rangeStart = getStartOfToday(now);
  const rangeEnd = getEndOfNextDays(now, 6);

  return tasks.filter((task) => {
    const scheduleAt = getTaskScheduleAt(task, now);
    return Boolean(scheduleAt && scheduleAt >= rangeStart && scheduleAt <= rangeEnd);
  });
}

function matchesSearch(task: DashboardTask, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    task.title,
    task.sourceText,
    task.category,
    task.waitingFor,
    task.relatedProject,
    task.sourceChannel,
    task.sourceMessageId,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalized));
}

export function filterDashboardTasks(tasks: DashboardTask[], filters: DashboardFilters = defaultFilters) {
  return tasks.filter((task) => {
    const statusMatch =
      filters.status === "all"
        ? true
        : filters.status === "active"
          ? isOperationalTask(task)
          : task.status === filters.status;

    const priorityMatch = filters.priority === "all" ? true : task.priority === filters.priority;

    return statusMatch && priorityMatch && matchesSearch(task, filters.search);
  });
}

export function sortDashboardTasks(tasks: DashboardTask[], sortMode: DashboardSortMode, now = new Date()) {
  const sorted = [...tasks];

  sorted.sort((left, right) => {
    if (sortMode === "createdAt") {
      return compareCreatedDesc(left, right);
    }

    if (sortMode === "updatedAt") {
      return compareUpdatedDesc(left, right);
    }

    if (sortMode === "dueAt") {
      const byDue = compareOptionalDateAsc(getTaskDueAt(left), getTaskDueAt(right));
      return byDue !== 0 ? byDue : compareUpdatedDesc(left, right);
    }

    const byPriority = comparePriority(left, right);
    if (byPriority !== 0) {
      return byPriority;
    }

    const bySchedule = compareOptionalDateAsc(getTaskScheduleAt(left, now), getTaskScheduleAt(right, now));
    if (bySchedule !== 0) {
      return bySchedule;
    }

    return compareUpdatedDesc(left, right);
  });

  return sorted;
}

export function buildDashboardSummary(tasks: DashboardTask[], now = new Date()): DashboardSummary {
  const activeTasks = tasks.filter(isOperationalTask);
  const p1Count = activeTasks.filter((task) => task.priority === "p1").length;

  return {
    todo: tasks.filter((task) => ["todo", "needs_check", "in_progress"].includes(task.status)).length,
    waiting: tasks.filter((task) => task.status === "waiting").length,
    today: activeTasks.filter((task) => isTodayTask(task, now)).length,
    thisWeek: activeTasks.filter((task) => isTodayTask(task, now) || isThisWeekTask(task, now)).length,
    upcoming: activeTasks.filter((task) => isUpcomingTask(task, now)).length,
    topPriority: p1Count > 0 ? p1Count : activeTasks.filter((task) => task.priority === "p2").length,
    generatedAt: now.toISOString(),
  };
}

export function buildDashboardSections(tasks: DashboardTask[], now = new Date()): DashboardSections {
  const activeTasks = tasks.filter(isOperationalTask);
  const topPriorityBase = activeTasks.filter((task) => task.priority === "p1");
  const topPriorityTasks = topPriorityBase.length > 0 ? topPriorityBase : activeTasks.filter((task) => task.priority === "p2");

  return {
    topPriority: sortDashboardTasks(topPriorityTasks, "operations", now).slice(0, 5),
    today: sortDashboardTasks(activeTasks.filter((task) => isTodayTask(task, now)), "operations", now).slice(0, 6),
    thisWeek: sortDashboardTasks(activeTasks.filter((task) => isThisWeekTask(task, now)), "operations", now).slice(0, 6),
    waiting: sortDashboardTasks(activeTasks.filter((task) => task.status === "waiting"), "operations", now).slice(0, 6),
    upcoming: activeTasks
      .filter((task) => isUpcomingTask(task, now))
      .sort((left, right) => compareOptionalDateAsc(getTaskScheduleAt(left, now), getTaskScheduleAt(right, now)))
      .slice(0, 6),
    recent: [...tasks].sort(compareCreatedDesc).slice(0, 6),
  };
}
