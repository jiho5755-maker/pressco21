export function getStartOfToday(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfToday(now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getEndOfWeek(now = new Date()) {
  const end = new Date(now);
  const day = end.getDay();
  const distanceToSunday = (7 - day) % 7;

  end.setDate(end.getDate() + distanceToSunday);
  end.setHours(23, 59, 59, 999);

  return end;
}

export function getStartOfTomorrow(now = new Date()) {
  const start = getStartOfToday(now);
  start.setDate(start.getDate() + 1);
  return start;
}

export function getStartOfWeek(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay();
  // 월요일 기준 (day: 0=일 → offset 6, 1=월 → 0, ...)
  const offset = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}
