/* 태스크 및 API 관련 타입 — 실제 flora-todo-mvp API 기준 */

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  assignee: string | null;
  dueAt: string | null;
  relatedProject: string | null;
  detailsJson: Record<string, unknown>;
  sourceText: string;
  sourceChannel: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  todo: number;
  waiting: number;
  today: number;
  topPriority: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  explorer: {
    items: Task[];
    pagination: { page: number; limit: number; totalCount: number };
  };
  selectedTask?: Task;
}

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface UserInfo {
  id: string;
  name: string;
  role: string;
  telegramUserId: string | null;
}

export type TaskStatus = "todo" | "in_progress" | "needs_check" | "done" | "resolved" | "waiting";
export type TaskPriority = "p1" | "p2" | "p3" | "p4";
