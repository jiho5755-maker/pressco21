import { randomUUID } from "node:crypto";
import { followupRepository } from "@/src/db/repositories/followupRepository";
import { reminderRepository } from "@/src/db/repositories/reminderRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import { taskPriorities, taskStatuses, TaskPriority, TaskStatus } from "@/src/domain/task";
import { DashboardTask } from "@/src/types/dashboard";
import { AutomationBriefItem, AutomationCalendarSyncItem, AutomationTaskUpsertBody } from "@/src/types/automation";
import { getStartOfToday } from "@/src/lib/time";
import { getTaskScheduleAt } from "@/src/lib/dashboard";

function toDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateLabel(date: Date) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
}

function formatTimeLabel(date: Date | null) {
  if (!date) {
    return "";
  }

  return ` [${pad(date.getHours())}:${pad(date.getMinutes())}]`;
}

function hasExplicitTime(rawValue: unknown) {
  return typeof rawValue === "string" && rawValue.includes("T");
}

function formatKstDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatKstDateTime(date: Date) {
  return `${formatKstDateOnly(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}+09:00`;
}

function readStringDetail(task: { detailsJson?: Record<string, unknown> }, key: string) {
  const value = task.detailsJson?.[key];
  return typeof value === "string" ? value : null;
}

function readCalendarEventId(task: { detailsJson?: Record<string, unknown> }) {
  const flat = readStringDetail(task, "calendarEventId");

  if (flat) {
    return flat;
  }

  const calendarSync = task.detailsJson?.calendarSync;
  if (!calendarSync || typeof calendarSync !== "object" || Array.isArray(calendarSync)) {
    return null;
  }

  const eventId = (calendarSync as Record<string, unknown>).eventId;
  return typeof eventId === "string" ? eventId : null;
}

function isImportedFromGoogleCalendar(task: { detailsJson?: Record<string, unknown>; sourceChannel: string }) {
  if (task.sourceChannel === "google-calendar") {
    return true;
  }

  const importedFrom = readStringDetail(task, "importedFrom");
  if (importedFrom === "google-calendar") {
    return true;
  }

  const calendarSync = task.detailsJson?.calendarSync;
  if (!calendarSync || typeof calendarSync !== "object" || Array.isArray(calendarSync)) {
    return false;
  }

  return (calendarSync as Record<string, unknown>).origin === "google-calendar";
}

function normalizeTaskStatus(value: string | null | undefined, fallback: TaskStatus = "todo"): TaskStatus {
  if (value && taskStatuses.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }

  return fallback;
}

function normalizeTaskPriority(value: string | null | undefined, fallback: TaskPriority = "p3"): TaskPriority {
  if (value && taskPriorities.includes(value as TaskPriority)) {
    return value as TaskPriority;
  }

  return fallback;
}

async function hydrateTasks(tasks: Array<Omit<DashboardTask, "reminders" | "followups">>) {
  if (tasks.length === 0) {
    return [] as DashboardTask[];
  }

  const taskIds = tasks.map((task) => task.id);
  const [reminders, followups] = await Promise.all([
    reminderRepository.listByTaskIds(taskIds),
    followupRepository.listByTaskIds(taskIds),
  ]);

  return tasks.map((task) => ({
    ...task,
    reminders: reminders.filter((reminder) => reminder.taskId === task.id),
    followups: followups.filter((followup) => followup.taskId === task.id),
  }));
}

function toBriefItem(task: DashboardTask, now = new Date()): AutomationBriefItem {
  const dueAt = toDate(task.dueAt);
  const scheduleAt = getTaskScheduleAt(task, now);
  const todayStart = getStartOfToday(now);
  const overdueDays = dueAt && dueAt < todayStart ? Math.floor((todayStart.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return {
    taskId: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    relatedProject: task.relatedProject,
    dueAt: dueAt?.toISOString() ?? null,
    scheduleAt: scheduleAt?.toISOString() ?? null,
    overdueDays,
  };
}

function buildMorningBriefText(todayTasks: DashboardTask[], overdueTasks: DashboardTask[], now = new Date()) {
  // 우선순위 기반 분류
  const urgent: DashboardTask[] = [];    // p1
  const important: DashboardTask[] = []; // p2
  const ongoing: DashboardTask[] = [];   // in_progress (any priority)
  const staff: DashboardTask[] = [];     // assignee가 장지호가 아닌 직원
  let inProgress = 0;
  let notStarted = 0;

  for (const task of todayTasks) {
    if (task.status === "in_progress") {
      inProgress += 1;
    } else {
      notStarted += 1;
    }

    // 직원 업무 먼저 분류 (assignee가 있고 장지호가 아닌 경우)
    const assignee = (task as DashboardTask & { assignee?: string | null }).assignee;
    if (assignee && assignee !== "장지호") {
      staff.push(task);
      continue;
    }

    // 진행 중인 건은 이어서 섹션
    if (task.status === "in_progress") {
      ongoing.push(task);
      continue;
    }

    // 우선순위별 분류
    if (task.priority === "p1") {
      urgent.push(task);
    } else {
      important.push(task);
    }
  }

  let text = `☀️ ${formatDateLabel(now)} 모닝 브리핑\n━━━━━━━━━━━━━━━━━━`;
  let idx = 1;

  if (todayTasks.length === 0 && overdueTasks.length === 0) {
    text += "\n\n오늘 등록된 할 일이 없습니다.";
    return text;
  }

  // 🔴 긴급 (p1)
  if (urgent.length > 0) {
    text += "\n\n🔴 긴급 (오늘 꼭)";
    for (const task of urgent) {
      const dueAt = toDate(task.dueAt);
      const project = task.relatedProject ? ` [${task.relatedProject}]` : "";
      text += `\n ${idx}. ${task.title}${project}${formatTimeLabel(dueAt)}`;
      idx += 1;
    }
  }

  // 🟡 중요 (p2+)
  if (important.length > 0) {
    text += "\n\n🟡 중요";
    for (const task of important) {
      const dueAt = toDate(task.dueAt);
      const project = task.relatedProject ? ` [${task.relatedProject}]` : "";
      text += `\n ${idx}. ${task.title}${project}${formatTimeLabel(dueAt)}`;
      idx += 1;
    }
  }

  // ⏳ 이어서 (in_progress)
  if (ongoing.length > 0) {
    text += "\n\n⏳ 이어서";
    for (const task of ongoing) {
      const project = task.relatedProject ? ` [${task.relatedProject}]` : "";
      text += `\n ${idx}. ${task.title}${project} (진행 중)`;
      idx += 1;
    }
  }

  // 📋 직원
  if (staff.length > 0) {
    text += "\n\n📋 직원";
    // 담당자별 그룹핑
    const byAssignee = new Map<string, DashboardTask[]>();
    for (const task of staff) {
      const name = (task as DashboardTask & { assignee?: string | null }).assignee ?? "미지정";
      const bucket = byAssignee.get(name) ?? [];
      bucket.push(task);
      byAssignee.set(name, bucket);
    }
    for (const [name, tasks] of byAssignee.entries()) {
      const titles = tasks.map((t) => t.title).join(", ");
      text += `\n - ${name}: ${titles}`;
    }
  }

  // ⚠️ 밀린 업무
  if (overdueTasks.length > 0) {
    text += `\n\n⚠️ 밀린 업무 ${overdueTasks.length}건`;
    for (const task of overdueTasks.slice(0, 5)) {
      const overdueDays = toBriefItem(task, now).overdueDays;
      text += `\n · ${task.title}${typeof overdueDays === "number" ? ` (${overdueDays}일 경과)` : ""}`;
    }
    if (overdueTasks.length > 5) {
      text += `\n ... 외 ${overdueTasks.length - 5}건`;
    }
  }

  // 요약
  text += `\n\n━━━━━━━━━━━━━━━━━━\n📊 총 ${todayTasks.length}건`;
  if (inProgress > 0) {
    text += ` | 진행 중 ${inProgress}`;
  }
  if (notStarted > 0) {
    text += ` | 시작 전 ${notStarted}`;
  }

  return text;
}

function buildOverdueAlertText(overdueTasks: DashboardTask[], now = new Date()) {
  if (overdueTasks.length === 0) {
    return "⚠️ 밀린 업무 없음";
  }

  const severe: DashboardTask[] = [];
  const mild: DashboardTask[] = [];

  for (const task of overdueTasks) {
    const overdueDays = toBriefItem(task, now).overdueDays ?? 0;
    if (overdueDays >= 3) {
      severe.push(task);
    } else {
      mild.push(task);
    }
  }

  let text = "⚠️ 밀린 업무 알림\n━━━━━━━━━━━━━━━━━━";

  if (severe.length > 0) {
    text += "\n\n🔴 3일+ 경과";
    for (const task of severe) {
      const overdueDays = toBriefItem(task, now).overdueDays ?? 0;
      text += `\n  · ${task.title} (${overdueDays}일)`;
    }
  }

  if (mild.length > 0) {
    text += "\n\n🟡 1~2일 경과";
    for (const task of mild) {
      const overdueDays = toBriefItem(task, now).overdueDays ?? 0;
      text += `\n  · ${task.title} (${overdueDays}일)`;
    }
  }

  text += `\n\n📊 총 ${overdueTasks.length}건`;
  text += "\n\n💡 Flora 대시보드에서 상태를 정리하세요";

  return text;
}

export async function getMorningBrief(limit = 20, now = new Date()) {
  const [todayRows, overdueRows] = await Promise.all([
    taskRepository.listAutomationMorningTasks(limit, now),
    taskRepository.listAutomationOverdueTasks(limit, now),
  ]);
  const [todayTasks, overdueTasks] = await Promise.all([hydrateTasks(todayRows), hydrateTasks(overdueRows)]);

  return {
    generatedAt: now.toISOString(),
    shouldSend: true,
    count: todayTasks.length,
    text: buildMorningBriefText(todayTasks, overdueTasks, now),
    items: todayTasks.map((task) => toBriefItem(task, now)),
    overdueItems: overdueTasks.map((task) => toBriefItem(task, now)),
  };
}

export async function getLunchCheckin(limit = 20, now = new Date()) {
  const [todayRows, overdueRows] = await Promise.all([
    taskRepository.listAutomationMorningTasks(limit, now),
    taskRepository.listAutomationOverdueTasks(limit, now),
  ]);
  const [todayTasks, overdueTasks] = await Promise.all([hydrateTasks(todayRows), hydrateTasks(overdueRows)]);

  const completed = todayTasks.filter((t) => t.status === "done");
  const remaining = todayTasks.filter((t) => t.status !== "done");

  // 오후 추천: p1 먼저, 그 다음 마감 임박 순
  const afternoon = remaining
    .sort((a, b) => {
      if (a.priority === "p1" && b.priority !== "p1") return -1;
      if (a.priority !== "p1" && b.priority === "p1") return 1;
      const aDue = toDate(a.dueAt)?.getTime() ?? Infinity;
      const bDue = toDate(b.dueAt)?.getTime() ?? Infinity;
      return aDue - bDue;
    })
    .slice(0, 3);

  let text = "🍽️ 점심 체크인\n━━━━━━━━━━━━━━━━━━";

  if (completed.length > 0) {
    text += "\n\n✅ 오전 완료";
    for (const task of completed) {
      text += `\n · ${task.title} ✓`;
    }
  } else {
    text += "\n\n오전 완료된 업무가 아직 없어요.";
  }

  if (afternoon.length > 0) {
    text += "\n\n📌 오후 추천";
    for (let i = 0; i < afternoon.length; i++) {
      const task = afternoon[i];
      const project = task.relatedProject ? ` [${task.relatedProject}]` : "";
      const label = task.priority === "p1" ? " ← 긴급" : "";
      text += `\n ${i + 1}. ${task.title}${project}${label}`;
    }
  }

  if (overdueTasks.length > 0) {
    text += `\n\n⚠️ 밀린 ${overdueTasks.length}건도 정리해보세요`;
  }

  const shouldSend = todayTasks.length > 0 || overdueTasks.length > 0;

  return {
    generatedAt: now.toISOString(),
    shouldSend,
    count: todayTasks.length,
    completedCount: completed.length,
    remainingCount: remaining.length,
    text,
  };
}

export async function getOverdueBrief(limit = 20, now = new Date()) {
  const overdueTasks = await hydrateTasks(await taskRepository.listAutomationOverdueTasks(limit, now));

  return {
    generatedAt: now.toISOString(),
    shouldSend: overdueTasks.length > 0,
    count: overdueTasks.length,
    text: buildOverdueAlertText(overdueTasks, now),
    items: overdueTasks.map((task) => toBriefItem(task, now)),
  };
}

export async function getCalendarSyncItems(since: Date, limit = 20): Promise<AutomationCalendarSyncItem[]> {
  const tasks = await taskRepository.listAutomationCalendarSyncCandidates(since, limit);

  return tasks
    .filter((task) => !isImportedFromGoogleCalendar(task))
    .map((task) => {
      const rawDateStart = readStringDetail(task, "timeStart") ?? readStringDetail(task, "dueStart");
      const dueAt = toDate(task.dueAt);
      const dateStart = rawDateStart
        ? rawDateStart
        : dueAt
          ? hasExplicitTime(rawDateStart) || dueAt.getHours() !== 0 || dueAt.getMinutes() !== 0 || dueAt.getSeconds() !== 0
            ? formatKstDateTime(dueAt)
            : formatKstDateOnly(dueAt)
          : "";

      return {
        taskId: task.id,
        title: task.title,
        summary: task.relatedProject ? `${task.relatedProject} - ${task.title}` : task.title,
        dateStart,
        gcalId: readCalendarEventId(task),
        memo: task.sourceText,
        sourceChannel: task.sourceChannel,
        updatedAt: task.updatedAt.toISOString(),
      };
    })
    .filter((item) => Boolean(item.dateStart));
}

export async function getWeeklyStrategy(now = new Date()) {
  const [stats, completedRows, activeByAssigneeRows, overdueRows] = await Promise.all([
    taskRepository.countWeeklyStats(now),
    taskRepository.listWeeklyCompletedTasks(now),
    taskRepository.listActiveTasksByAssignee(now),
    taskRepository.listAutomationOverdueTasks(20, now),
  ]);

  const overdueTasks = await hydrateTasks(overdueRows);

  // 직원별 업무 분포
  const byAssignee = new Map<string, typeof activeByAssigneeRows>();
  for (const task of activeByAssigneeRows) {
    const name = task.assignee ?? "미지정";
    const bucket = byAssignee.get(name) ?? [];
    bucket.push(task);
    byAssignee.set(name, bucket);
  }

  // 프로젝트별 진행 현황
  const byProject = new Map<string, number>();
  for (const task of activeByAssigneeRows) {
    const project = task.relatedProject ?? "기타";
    byProject.set(project, (byProject.get(project) ?? 0) + 1);
  }

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dateLabel = `${now.getMonth() + 1}/${now.getDate()}(${days[now.getDay()]})`;

  let text = `📋 ${dateLabel} 주간 전략 회의\n━━━━━━━━━━━━━━━━━━`;

  // 의제 1: 주간 현황 요약
  text += "\n\n[의제 1] 주간 현황";
  text += `\n📊 활성 ${stats.active}건 | 이번주 완료 ${stats.completedThisWeek}건`;
  text += `\n🔴 긴급(p1) ${stats.p1Count}건 | ⚠️ 밀린 ${stats.overdueCount}건`;

  // 이번주 완료된 주요 항목
  if (completedRows.length > 0) {
    text += "\n\n✅ 이번주 완료";
    for (const task of completedRows.slice(0, 5)) {
      const project = task.relatedProject ? ` [${task.relatedProject}]` : "";
      text += `\n · ${task.title}${project}`;
    }
    if (completedRows.length > 5) {
      text += `\n ... 외 ${completedRows.length - 5}건`;
    }
  }

  // 의제 2: 프로젝트별 현황
  if (byProject.size > 0) {
    text += "\n\n[의제 2] 프로젝트별 진행";
    const sorted = [...byProject.entries()].sort((a, b) => b[1] - a[1]);
    for (const [project, taskCount] of sorted.slice(0, 8)) {
      text += `\n · ${project}: ${taskCount}건`;
    }
  }

  // 의제 3: 직원별 업무
  if (byAssignee.size > 0) {
    text += "\n\n[의제 3] 직원별 업무";
    for (const [name, assigneeTasks] of byAssignee.entries()) {
      const p1 = assigneeTasks.filter((t) => t.priority === "p1").length;
      const summary = p1 > 0 ? ` (긴급 ${p1}건)` : "";
      text += `\n · ${name}: ${assigneeTasks.length}건${summary}`;
    }
  }

  // 의제 4: 밀린 업무
  if (overdueTasks.length > 0) {
    text += "\n\n[의제 4] ⚠️ 밀린 업무";
    for (const task of overdueTasks.slice(0, 5)) {
      const overdueDays = toBriefItem(task, now).overdueDays;
      const assignee = (task as DashboardTask & { assignee?: string | null }).assignee;
      const who = assignee ? ` (${assignee})` : "";
      text += `\n · ${task.title}${who}${typeof overdueDays === "number" ? ` — ${overdueDays}일 경과` : ""}`;
    }
  }

  // 권고
  text += "\n\n[권고]";
  if (stats.overdueCount > 3) {
    text += `\n⚡ 밀린 업무 ${stats.overdueCount}건 — 우선 정리 필요`;
  }
  if (stats.p1Count > 0) {
    text += `\n🔴 긴급 업무 ${stats.p1Count}건 집중 처리`;
  }
  if (stats.overdueCount === 0 && stats.p1Count === 0) {
    text += "\n✨ 양호 — 계획된 업무 순서대로 진행";
  }

  text += `\n\n━━━━━━━━━━━━━━━━━━\n📊 활성 ${stats.active} | 완료 ${stats.completedThisWeek} | 밀림 ${stats.overdueCount}`;

  const shouldSend = stats.active > 0 || stats.completedThisWeek > 0;

  return {
    generatedAt: now.toISOString(),
    shouldSend,
    stats,
    text,
  };
}

export async function getStaffBriefing(assignee: string, limit = 20, now = new Date()) {
  const [todayRows, overdueRows] = await Promise.all([
    taskRepository.listAutomationMorningTasks(100, now),
    taskRepository.listAutomationOverdueTasks(50, now),
  ]);
  const [todayTasks, overdueTasks] = await Promise.all([hydrateTasks(todayRows), hydrateTasks(overdueRows)]);

  // assignee 기준 필터
  const myTasks = todayTasks.filter(
    (t) => (t as DashboardTask & { assignee?: string | null }).assignee === assignee,
  );
  const myOverdue = overdueTasks.filter(
    (t) => (t as DashboardTask & { assignee?: string | null }).assignee === assignee,
  );

  const dateLabel = formatDateLabel(now);

  let text = `📌 ${dateLabel} ${assignee}님 업무\n━━━━━━━━━━━━━━━━━━`;

  if (myTasks.length === 0 && myOverdue.length === 0) {
    text += "\n\n오늘 배정된 업무가 없습니다.";
    return { generatedAt: now.toISOString(), shouldSend: false, count: 0, text };
  }

  // 긴급
  const urgent = myTasks.filter((t) => t.priority === "p1");
  if (urgent.length > 0) {
    text += "\n\n🔴 긴급";
    for (const task of urgent) {
      text += `\n · ${task.title}`;
    }
  }

  // 일반
  const normal = myTasks.filter((t) => t.priority !== "p1");
  if (normal.length > 0) {
    text += "\n\n📋 오늘 할 일";
    for (const task of normal) {
      text += `\n · ${task.title}`;
    }
  }

  // 밀린
  if (myOverdue.length > 0) {
    text += `\n\n⚠️ 밀린 업무 ${myOverdue.length}건`;
    for (const task of myOverdue.slice(0, 3)) {
      text += `\n · ${task.title}`;
    }
  }

  text += `\n\n━━━━━━━━━━━━━━━━━━\n📊 총 ${myTasks.length}건`;

  return {
    generatedAt: now.toISOString(),
    shouldSend: myTasks.length > 0 || myOverdue.length > 0,
    count: myTasks.length,
    text,
  };
}

export async function patchAutomationTask(
  taskId: string,
  input: {
    status?: TaskStatus;
    priority?: TaskPriority;
    detailsMerge?: Record<string, unknown>;
  },
) {
  return taskRepository.patchAutomationTask(taskId, {
    status: input.status,
    priority: input.priority,
    detailsMerge: input.detailsMerge,
  });
}

export async function upsertAutomationTask(input: AutomationTaskUpsertBody) {
  const existingTasks = await taskRepository.listBySourceMessage(input.sourceChannel, input.sourceMessageId);
  const segmentHash = input.segmentHash?.trim() || "external:0";
  const existingTask = existingTasks.find((task) => task.segmentHash === segmentHash) ?? existingTasks[0] ?? null;
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;

  if (input.dueAt && (!dueAt || Number.isNaN(dueAt.getTime()))) {
    throw new Error("Invalid dueAt value");
  }

  return taskRepository.upsertStructuredTask({
    id: existingTask?.id ?? randomUUID(),
    title: input.title,
    detailsJson: {
      ...(existingTask?.detailsJson ?? {}),
      ...(input.detailsMerge ?? {}),
    },
    status: input.status ?? normalizeTaskStatus(existingTask?.status, "todo"),
    priority: input.priority ?? normalizeTaskPriority(existingTask?.priority, "p3"),
    category: input.category ?? existingTask?.category ?? "inbox",
    dueAt,
    timeBucket: input.timeBucket ?? existingTask?.timeBucket ?? null,
    waitingFor: input.waitingFor ?? existingTask?.waitingFor ?? null,
    relatedProject: input.relatedProject ?? existingTask?.relatedProject ?? null,
    sourceText: input.sourceText,
    sourceChannel: input.sourceChannel,
    sourceMessageId: input.sourceMessageId,
    segmentHash,
    segmentIndex: input.segmentIndex ?? existingTask?.segmentIndex ?? 0,
  });
}
