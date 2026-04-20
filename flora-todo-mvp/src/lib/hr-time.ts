const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function toKSTDateKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function toKSTTimeStr(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(11, 16);
}

export function todayKSTBounds(): { start: Date; end: Date } {
  const now = new Date();
  const kstDateStr = toKSTDateKey(now);
  const start = new Date(kstDateStr + "T00:00:00+09:00");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function monthKSTBounds(yearMonth: string): { start: Date; end: Date } {
  const [year, month] = yearMonth.split("-").map(Number);
  const startStr = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`;
  const start = new Date(startStr);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`;
  const end = new Date(endStr);
  return { start, end };
}
