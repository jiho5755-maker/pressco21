import { TaskPriority, TaskStatus } from "@/src/domain/task";

export type AutomationBriefItem = {
  taskId: string;
  title: string;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  relatedProject: string | null;
  dueAt: string | null;
  scheduleAt: string | null;
  overdueDays: number | null;
};

export type AutomationBriefPayload = {
  ok: true;
  generatedAt: string;
  shouldSend: boolean;
  count: number;
  text: string;
  items: AutomationBriefItem[];
};

export type AutomationCalendarSyncItem = {
  taskId: string;
  title: string;
  summary: string;
  dateStart: string;
  gcalId: string | null;
  memo: string;
  sourceChannel: string;
  updatedAt: string;
};

export type AutomationTaskPatchBody = {
  status?: TaskStatus;
  priority?: TaskPriority;
  detailsMerge?: Record<string, unknown>;
};

export type AutomationTaskUpsertBody = {
  title: string;
  sourceChannel: string;
  sourceMessageId: string;
  sourceText: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string | null;
  dueAt?: string | null;
  timeBucket?: string | null;
  waitingFor?: string | null;
  relatedProject?: string | null;
  detailsMerge?: Record<string, unknown>;
  segmentHash?: string | null;
  segmentIndex?: number | null;
};
