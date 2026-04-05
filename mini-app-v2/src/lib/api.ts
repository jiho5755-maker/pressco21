/* API 클라이언트 - fetch wrapper with 인증 헤더 */

import { getInitData } from "./telegram";
import type {
  Task,
  DashboardResponse,
  Comment,
  StaffMember,
  UserInfo,
} from "./types";

const BASE = "/api";
const AUTOMATION_KEY = "pressco21-admin-2026";

/** 공통 fetch wrapper */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const initData = getInitData();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-flora-automation-key": AUTOMATION_KEY,
    ...(options.headers as Record<string, string>),
  };

  // 텔레그램 initData가 있으면 추가
  if (initData) {
    headers["x-telegram-init-data"] = initData;
  }

  const url = BASE + endpoint;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      "API Error " + response.status + ": " + (text || response.statusText)
    );
  }

  return response.json() as Promise<T>;
}

/* ───── 대시보드 ───── */

/** 활성 태스크 목록 조회 */
export function fetchActiveTasks(limit = 100): Promise<DashboardResponse> {
  return apiFetch("/dashboard?status=active&limit=" + limit + "&sort=operations");
}

/** 완료 태스크 목록 조회 */
export function fetchDoneTasks(limit = 50): Promise<DashboardResponse> {
  return apiFetch("/dashboard?status=done&limit=" + limit);
}

/* ───── 태스크 CRUD ───── */

/** 태스크 상태/우선순위/담당자 변경 */
export function updateTask(
  taskId: number,
  body: Partial<Pick<Task, "status" | "priority" | "assignee">>
): Promise<Task> {
  return apiFetch("/admin/tasks/" + taskId, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** 태스크 생성 */
export function createTask(body: {
  title: string;
  assignee?: string;
  priority?: string;
  dueAt?: string;
  relatedProject?: string;
}): Promise<Task> {
  return apiFetch("/mini/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ───── 사용자/직원 ───── */

/** 현재 사용자 정보 */
export function fetchMe(): Promise<UserInfo> {
  return apiFetch("/mini/me");
}

/** 직원 목록 */
export function fetchStaff(): Promise<StaffMember[]> {
  return apiFetch("/mini/staff");
}

/* ───── 코멘트 ───── */

/** 코멘트 목록 */
export function fetchComments(id: number): Promise<Comment[]> {
  return apiFetch("/tasks/" + id + "/comments");
}

/** 코멘트 추가 */
export function addComment(
  id: number,
  content: string
): Promise<Comment> {
  return apiFetch("/tasks/" + id + "/comments", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
