import { getEndOfToday, getEndOfWeek, getStartOfToday } from "@/src/lib/time";
import { TemporalExtraction } from "@/src/types/structured";

const weekdayMap: Record<string, number> = {
  "일요일": 0,
  "월요일": 1,
  "화요일": 2,
  "수요일": 3,
  "목요일": 4,
  "금요일": 5,
  "토요일": 6,
};

function cloneDate(input: Date) {
  return new Date(input.getTime());
}

function setTime(input: Date, hour: number, minute = 0) {
  const date = cloneDate(input);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function addDays(input: Date, days: number) {
  const date = cloneDate(input);
  date.setDate(date.getDate() + days);
  return date;
}

function getWeekStart(input: Date) {
  const date = getStartOfToday(input);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function getWeekEnd(input: Date, weekOffset = 0) {
  const weekStart = getWeekStart(input);
  const end = addDays(weekStart, 6 + weekOffset * 7);
  end.setHours(18, 0, 0, 0);
  return end;
}

function parseTime(text: string) {
  const timeMatch = text.match(/(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분?)?/);

  if (!timeMatch) {
    const approximateTimeRules = [
      { pattern: /오전 중|오전에/, hour: 10, minute: 0 },
      { pattern: /오후 중|오후에/, hour: 15, minute: 0 },
      { pattern: /점심/, hour: 12, minute: 0 },
      { pattern: /저녁/, hour: 19, minute: 0 },
      { pattern: /밤/, hour: 21, minute: 0 },
    ];

    for (const rule of approximateTimeRules) {
      const matched = text.match(rule.pattern);
      if (matched) {
        return {
          hour: rule.hour,
          minute: rule.minute,
          label: matched[0],
        };
      }
    }

    return null;
  }

  const meridiem = timeMatch[1];
  let hour = Number(timeMatch[2]);
  const minute = timeMatch[3] ? Number(timeMatch[3]) : 0;

  if (meridiem === "오후" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "오전" && hour === 12) {
    hour = 0;
  }

  return { hour, minute, label: timeMatch[0] };
}

function resolveWeekday(now: Date, weekday: number, weekOffset: number) {
  const weekStart = addDays(getWeekStart(now), weekOffset * 7);
  return addDays(weekStart, weekday === 0 ? 6 : weekday - 1);
}

function resolveWeekend(now: Date, weekOffset: number) {
  const weekStart = addDays(getWeekStart(now), weekOffset * 7);
  return addDays(weekStart, 5);
}

function resolveFutureDate(month: number, day: number, now: Date, year?: number) {
  let resolvedYear = year ?? now.getFullYear();
  let date = new Date(resolvedYear, month - 1, day);

  if (!year && date < getStartOfToday(now)) {
    resolvedYear += 1;
    date = new Date(resolvedYear, month - 1, day);
  }

  return date;
}

function buildReminderAt(dueAt: Date, hasExplicitTime: boolean) {
  if (hasExplicitTime) {
    return new Date(dueAt.getTime() - 60 * 60 * 1000);
  }

  return setTime(dueAt, 9, 0);
}

function applyBeforeConstraint(dueAt: Date, hasExplicitTime: boolean, preferPreviousDay = false) {
  if (hasExplicitTime) {
    return new Date(dueAt.getTime() - 60 * 60 * 1000);
  }

  if (preferPreviousDay) {
    return setTime(addDays(dueAt, -1), 18, 0);
  }

  return setTime(dueAt, 9, 0);
}

export function extractTemporalSignals(text: string, now = new Date()): TemporalExtraction {
  const matchedExpressions: string[] = [];
  const timeInfo = parseTime(text);
  const isBeforeConstraint = text.includes("전에");
  let dueAt: Date | null = null;
  let timeBucket: string | null = null;
  let resolvedFromWeekend = false;

  const isoDateMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    const date = resolveFutureDate(month, day, now, year);
    dueAt = setTime(date, timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = "specific_date";
    matchedExpressions.push(isoDateMatch[0]);
  }

  const koreanMonthDayMatch = text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/);
  if (!dueAt && koreanMonthDayMatch) {
    const year = koreanMonthDayMatch[1] ? Number(koreanMonthDayMatch[1]) : undefined;
    const month = Number(koreanMonthDayMatch[2]);
    const day = Number(koreanMonthDayMatch[3]);
    const date = resolveFutureDate(month, day, now, year);
    dueAt = setTime(date, timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = "specific_date";
    matchedExpressions.push(koreanMonthDayMatch[0]);
  }

  const monthDayMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (!dueAt && monthDayMatch) {
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);
    const date = resolveFutureDate(month, day, now);
    dueAt = setTime(date, timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = "specific_date";
    matchedExpressions.push(monthDayMatch[0]);
  }

  const dottedMonthDayMatch = text.match(/\b(\d{1,2})\.(\d{1,2})\b/);
  if (!dueAt && dottedMonthDayMatch) {
    const month = Number(dottedMonthDayMatch[1]);
    const day = Number(dottedMonthDayMatch[2]);
    const date = resolveFutureDate(month, day, now);
    dueAt = setTime(date, timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = "specific_date";
    matchedExpressions.push(dottedMonthDayMatch[0]);
  }

  if (!dueAt && text.includes("오늘")) {
    dueAt = setTime(now, timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = "today";
    matchedExpressions.push("오늘");
  }

  if (!dueAt && text.includes("내일")) {
    dueAt = setTime(addDays(now, 1), timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = "tomorrow";
    matchedExpressions.push("내일");
  }

  if (!dueAt && text.includes("모레")) {
    dueAt = setTime(addDays(now, 2), timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = "this_week";
    matchedExpressions.push("모레");
  }

  const weekdayMatch = text.match(/(이번주|다음주)?\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/);
  if (!dueAt && weekdayMatch) {
    const modifier = weekdayMatch[1];
    const weekdayLabel = weekdayMatch[2];
    const weekday = weekdayMap[weekdayLabel];
    let weekOffset = 0;

    if (modifier === "다음주") {
      weekOffset = 1;
      timeBucket = "next_week";
    } else if (modifier === "이번주") {
      timeBucket = "this_week";
    }

    let resolved = resolveWeekday(now, weekday, weekOffset);
    if (!modifier && resolved < getStartOfToday(now)) {
      resolved = resolveWeekday(now, weekday, 1);
      timeBucket = "next_week";
    }

    dueAt = setTime(resolved, timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    timeBucket = timeBucket ?? "this_week";
    matchedExpressions.push(weekdayMatch[0]);
  }

  const weekendMatch = text.match(/(이번주말|다음주말|주말)/);
  if (!dueAt && weekendMatch) {
    const label = weekendMatch[0];
    let weekOffset = 0;

    if (label === "다음주말") {
      weekOffset = 1;
      timeBucket = "next_week";
    } else {
      timeBucket = "this_week";
    }

    let resolved = resolveWeekend(now, weekOffset);
    if (label === "주말" && resolved < getStartOfToday(now)) {
      resolved = resolveWeekend(now, 1);
      timeBucket = "next_week";
    }

    dueAt = setTime(resolved, timeInfo?.hour ?? 18, timeInfo?.minute ?? 0);
    resolvedFromWeekend = true;
    matchedExpressions.push(label);
  }

  if (!dueAt && text.includes("이번주")) {
    dueAt = getWeekEnd(now, 0);
    timeBucket = "this_week";
    matchedExpressions.push("이번주");
  }

  if (!dueAt && text.includes("다음주")) {
    dueAt = getWeekEnd(now, 1);
    timeBucket = "next_week";
    matchedExpressions.push("다음주");
  }

  const isDeadline = text.includes("전까지") || text.includes("까지") || text.includes("안에");
  if (isDeadline) {
    if (text.includes("전까지")) {
      matchedExpressions.push("전까지");
    } else {
      matchedExpressions.push(text.includes("까지") ? "까지" : "안에");
    }
  }

  if (dueAt && isBeforeConstraint) {
    dueAt = applyBeforeConstraint(dueAt, Boolean(timeInfo), resolvedFromWeekend);
    matchedExpressions.push("전에");
  }

  const reminderAt =
    dueAt !== null
      ? buildReminderAt(
          dueAt,
          Boolean(timeInfo),
        )
      : null;

  return {
    dueAt,
    timeBucket,
    reminderAt,
    matchedExpressions,
    isDeadline,
    isBeforeConstraint,
  };
}

export function buildNextCheckAt(signal: string, dueAt: Date | null, now = new Date()) {
  if (dueAt) {
    return setTime(dueAt, 10, 0);
  }

  if (signal.includes("나중에 확인")) {
    return setTime(addDays(now, 7), 10, 0);
  }

  if (signal.includes("다시 확인")) {
    return setTime(addDays(now, 1), 10, 0);
  }

  return setTime(addDays(now, 1), 10, 0);
}

export function isUpcomingRange(dueAt: Date, now = new Date()) {
  return dueAt > getEndOfToday(now) && dueAt <= getEndOfWeek(now);
}
