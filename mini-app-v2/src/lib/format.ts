/* 날짜/시간 포매팅 유틸리티 */

/** "방금", "N분전", "N시간전", "N일전" 상대시간 포맷 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "방금";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "방금";
  if (minutes < 60) return minutes + "분전";
  if (hours < 24) return hours + "시간전";
  if (days < 30) return days + "일전";

  // 30일 이상이면 날짜로 표시
  return formatDate(dateStr);
}

/** YYYY.MM.DD 형식 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.getFullYear() +
    "." +
    String(d.getMonth() + 1).padStart(2, "0") +
    "." +
    String(d.getDate()).padStart(2, "0")
  );
}

/** M/D (요일) 형식 */
export function formatShortDate(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return (d.getMonth() + 1) + "/" + d.getDate() + " (" + weekdays[d.getDay()] + ")";
}

/** MM.DD 형식 */
export function formatCompactDate(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    String(d.getMonth() + 1).padStart(2, "0") +
    "." +
    String(d.getDate()).padStart(2, "0")
  );
}

/** 마감일까지 남은 일수 */
export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** 태스크에서 startAt 추출 (detailsJson) */
export function getStartAt(task: { detailsJson: Record<string, unknown> }): string | null {
  const val = task.detailsJson?.startAt;
  return typeof val === "string" && val ? val : null;
}

/** startAt~dueAt 사이 모든 날짜 키(YYYY-MM-DD) 생성 */
export function getDateRange(startAt: string | null, dueAt: string | null): string[] {
  if (!startAt && !dueAt) return [];
  const start = startAt ? new Date(startAt) : dueAt ? new Date(dueAt) : null;
  const end = dueAt ? new Date(dueAt) : startAt ? new Date(startAt) : null;
  if (!start || !end) return [];

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // 최대 60일 제한 (무한 루프 방지)
  const keys: string[] = [];
  const d = new Date(start);
  for (let i = 0; i < 60 && d <= end; i++) {
    keys.push(
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0")
    );
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

/** 시작~마감 범위 텍스트 */
export function formatDateRange(startAt: string | null, dueAt: string | null): string {
  if (startAt && dueAt) {
    return formatCompactDate(startAt) + " ~ " + formatCompactDate(dueAt);
  }
  if (dueAt) return formatCompactDate(dueAt);
  if (startAt) return formatCompactDate(startAt) + " ~";
  return "";
}

/** 오늘 날짜 여부 */
export function isToday(dateStr: string | Date): boolean {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}
