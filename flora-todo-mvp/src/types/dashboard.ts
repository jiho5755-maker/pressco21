import { TaskPriority, TaskStatus } from "@/src/domain/task";

export type DashboardSummary = {
  todo: number;
  waiting: number;
  today: number;
  thisWeek: number;
  upcoming: number;
  topPriority: number;
  generatedAt: string;
};

export type DashboardReminder = {
  id: string;
  taskId: string;
  title: string;
  remindAt: string | Date;
  kind: string;
  message: string | null;
  status: string;
  updatedAt: string | Date;
};

export type DashboardFollowup = {
  id: string;
  taskId: string;
  subject: string;
  followupType: string;
  waitingFor: string | null;
  nextCheckAt: string | Date | null;
  status: string;
  lastNote: string | null;
  updatedAt: string | Date;
};

export type DashboardTask = {
  id: string;
  title: string;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  category: string;
  dueAt: string | Date | null;
  timeBucket: string | null;
  assignee: string | null;
  waitingFor: string | null;
  relatedProject: string | null;
  sourceText: string;
  sourceChannel: string;
  sourceMessageId: string;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  reminders: DashboardReminder[];
  followups: DashboardFollowup[];
};

export type DashboardSections = {
  topPriority: DashboardTask[];
  today: DashboardTask[];
  thisWeek: DashboardTask[];
  waiting: DashboardTask[];
  upcoming: DashboardTask[];
  recent: DashboardTask[];
};

export type DashboardDateRange = "today" | "thisWeek" | "next7Days";

export type DashboardSortMode = "operations" | "dueAt" | "updatedAt" | "createdAt";

export type DashboardFilters = {
  search: string;
  status: "all" | "active" | TaskStatus;
  priority: "all" | TaskPriority;
  sort: DashboardSortMode;
};

export type DashboardExplorer = {
  items: DashboardTask[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type DashboardViewSections = {
  topPriority: DashboardTask[];
  today: DashboardTask[];
  focus: DashboardTask[];
  waiting: DashboardTask[];
  upcoming: DashboardTask[];
  recent: DashboardTask[];
};

export type DashboardPayload = {
  summary: DashboardSummary;
  sections: DashboardViewSections;
  explorer: DashboardExplorer;
  selectedTask: DashboardTask | null;
  inScopeCount: number;
};

export type DashboardQueryOptions = {
  dateRange?: DashboardDateRange;
  filters?: Partial<DashboardFilters>;
  page?: number;
  limit?: number;
  selectedTaskId?: string | null;
};
