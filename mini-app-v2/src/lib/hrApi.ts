/* HR 근태관리 API 클라이언트 */

import { getInitData } from "./telegram";

const BASE = "/api";
const AUTOMATION_KEY = "pressco21-admin-2026";

async function hrApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

/* ── 타입 정의 ── */

export interface StaffDayStatus {
  staffId: string;
  staffName: string;
  status: "working" | "done" | "not_yet" | "on_leave";
  clockInAt?: string;
  clockOutAt?: string;
  workMode?: string;
}

export interface HrTodayStats {
  date: string;
  totalStaff: number;
  clockedIn: number;
  clockedOut: number;
  notYet: number;
  onLeave: number;
  staffStatus: StaffDayStatus[];
}

export interface DayRecord {
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  workMode: string;
  workMinutes?: number | null;
}

export interface StaffMonthlySummary {
  staffId: string;
  staffName: string;
  workType: string;
  isDeemedHours: boolean;
  totalWorkDays: number;
  attendedDays: number;
  absentDays: number;
  lateDays: number;
  officeDays: number;
  remoteDays: number;
  fieldDays: number;
  avgWorkMinutes: number | null;
  dailyRecords: DayRecord[];
}

export interface HrMonthlySummary {
  month: string;
  staffSummaries: StaffMonthlySummary[];
}

/* ── API 함수 ── */

export function fetchHrTodayStats(): Promise<HrTodayStats> {
  return hrApiFetch("/hr/stats/today");
}

export function fetchHrMonthlySummary(month: string, staffId?: string): Promise<HrMonthlySummary> {
  const params = new URLSearchParams({ month });
  if (staffId) params.set("staffId", staffId);
  return hrApiFetch("/hr/attendance/monthly-summary?" + params.toString());
}

export function getHrReportCsvUrl(month: string): string {
  return BASE + "/hr/report/monthly?month=" + encodeURIComponent(month) + "&format=csv";
}
