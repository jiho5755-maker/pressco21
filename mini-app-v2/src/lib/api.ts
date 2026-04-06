/* API 클라이언트 — 실제 flora-todo-mvp API 기준 */

import { getInitData } from "./telegram";
import type { Task, DashboardResponse, Comment, StaffMember, UserInfo } from "./types";

const BASE = "/api";
const AUTOMATION_KEY = "pressco21-admin-2026";

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-flora-automation-key": AUTOMATION_KEY,
    ...(options.headers as Record<string, string>),
  };
  if (initData) {
    headers["x-telegram-init-data"] = initData;
  }

  const response = await fetch(BASE + endpoint, { ...options, headers });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(data.error || "API Error " + response.status);
  }

  return response.json() as Promise<T>;
}

/* ── 대시보드 ── */

export async function fetchDashboard(params: {
  status?: string;
  limit?: number;
  sort?: string;
  dateRange?: string;
  selectedTaskId?: string;
}): Promise<DashboardResponse> {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(String(v)))
    .join("&");
  return apiFetch("/dashboard" + (qs ? "?" + qs : ""));
}

export function fetchActiveTasks(limit = 100): Promise<DashboardResponse> {
  return fetchDashboard({ status: "active", limit, sort: "operations" });
}

export function fetchDoneTasks(limit = 50): Promise<DashboardResponse> {
  return fetchDashboard({ status: "done", limit });
}

/* ── 태스크 ── */

export function updateTask(
  taskId: string,
  body: Partial<Pick<Task, "status" | "priority" | "assignee">> & {
    description?: string | null;
    startAt?: string | null;
    links?: string[];
  }
): Promise<{ ok: boolean; task: Task }> {
  return apiFetch("/admin/tasks/" + encodeURIComponent(taskId), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createTask(body: {
  title: string;
  assignee?: string | null;
  priority?: string;
  dueAt?: string | null;
  startAt?: string | null;
  relatedProject?: string | null;
  description?: string | null;
}): Promise<{ ok: boolean; task: Task }> {
  return apiFetch("/mini/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ── 사용자/직원 ── */

export async function fetchMe(): Promise<UserInfo | null> {
  const data = await apiFetch<{ ok: boolean; staff: UserInfo | null }>("/mini/me");
  return data.staff;
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const data = await apiFetch<{ ok: boolean; staff: StaffMember[] }>("/mini/staff");
  return data.staff;
}

/* ── 코멘트 ── */

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const data = await apiFetch<{ ok: boolean; comments: Comment[] }>(
    "/tasks/" + encodeURIComponent(taskId) + "/comments"
  );
  return data.comments;
}

export async function addComment(taskId: string, content: string): Promise<Comment> {
  const data = await apiFetch<{ ok: boolean; comment: Comment }>(
    "/tasks/" + encodeURIComponent(taskId) + "/comments",
    { method: "POST", body: JSON.stringify({ content }) }
  );
  return data.comment;
}
