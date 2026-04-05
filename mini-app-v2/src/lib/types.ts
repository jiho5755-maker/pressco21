/* 태스크 및 API 관련 타입 정의 */

export interface Task {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "urgent" | "high" | "normal" | "low";
  assignee: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  relatedProject: string | null;
  category: string | null;
  requestedBy: string | null;
}

export interface DashboardResponse {
  tasks: Task[];
  summary: {
    total: number;
    todo: number;
    in_progress: number;
    review: number;
    done: number;
  };
}

export interface Comment {
  id: number;
  taskId: number;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface StaffMember {
  name: string;
  telegramId?: string;
}

export interface UserInfo {
  name: string;
  telegramId: string;
}

export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];
