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
