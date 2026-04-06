/* 개인 일정 localStorage 관리 */

const STORAGE_KEY = "pressco21-personal-events";

export type TimeSlot = "morning" | "afternoon" | "allday";

export interface PersonalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  createdAt: string;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  allday: "종일",
  morning: "오전",
  afternoon: "오후",
};

function generateId(): string {
  return "pe-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getPersonalEvents(): PersonalEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PersonalEvent[];
  } catch {
    return [];
  }
}

export function addPersonalEvent(title: string, date: string, timeSlot: TimeSlot = "allday"): PersonalEvent {
  const events = getPersonalEvents();
  const newEvent: PersonalEvent = {
    id: generateId(),
    title: title.trim(),
    date,
    timeSlot,
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return newEvent;
}

export function deletePersonalEvent(id: string): void {
  const events = getPersonalEvents().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/** 날짜별로 그룹핑 */
export function getEventsByDate(): Map<string, PersonalEvent[]> {
  const map = new Map<string, PersonalEvent[]>();
  for (const event of getPersonalEvents()) {
    const key = event.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  }
  return map;
}
