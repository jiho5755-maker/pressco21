import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { WeekTimeline } from "@/components/calendar/WeekTimeline";
import { CalendarTaskItem } from "@/components/calendar/CalendarTaskItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fetchActiveTasks } from "@/lib/api";
import { getPersonalEvents, addPersonalEvent, deletePersonalEvent, TIME_SLOT_LABELS } from "@/lib/personalEvents";
import type { PersonalEvent, TimeSlot } from "@/lib/personalEvents";
import { daysUntil, getStartAt, getDateRange } from "@/lib/format";
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Inbox,
  X, CalendarClock, Columns3, CalendarDays
} from "lucide-react";
import type { Task } from "@/lib/types";

type ViewType = "month" | "week";

const WEEKDAYS_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function dateKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [personalEvents, setPersonalEvents] = useState<PersonalEvent[]>([]);
  const [showPersonal, setShowPersonal] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"company" | "personal">("personal");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>("allday");

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  useEffect(() => {
    fetchActiveTasks()
      .then((res) => setTasks(res.explorer?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    setPersonalEvents(getPersonalEvents());
  }, []);

  // 날짜별 맵 — startAt~dueAt 범위의 모든 날짜에 매핑
  const companyTasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const startAt = getStartAt(task);
      const dueAt = task.dueAt ? task.dueAt.slice(0, 10) : null;

      if (startAt || dueAt) {
        const dateKeys = getDateRange(startAt, dueAt);
        if (dateKeys.length === 0 && dueAt) {
          // 범위 생성 실패 시 마감일에만 표시
          if (!map.has(dueAt)) map.set(dueAt, []);
          map.get(dueAt)!.push(task);
        } else {
          for (const key of dateKeys) {
            if (!map.has(key)) map.set(key, []);
            // 중복 방지
            if (!map.get(key)!.some((t) => t.id === task.id)) {
              map.get(key)!.push(task);
            }
          }
        }
      }
    }
    return map;
  }, [tasks]);

  const personalByDate = useMemo(() => {
    const map = new Map<string, PersonalEvent[]>();
    for (const event of personalEvents) {
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date)!.push(event);
    }
    return map;
  }, [personalEvents]);

  // 월간 그리드용 통합 카운트
  const taskCountByDate = useMemo(() => {
    const map = new Map<string, { total: number; urgent: boolean; high: boolean }>();
    for (const [key, dayTasks] of companyTasksByDate) {
      const existing = map.get(key) ?? { total: 0, urgent: false, high: false };
      existing.total += dayTasks.length;
      existing.urgent = existing.urgent || dayTasks.some((t) => t.priority === "p1");
      existing.high = existing.high || dayTasks.some((t) => t.priority === "p2");
      map.set(key, existing);
    }
    if (showPersonal) {
      for (const [key, dayEvents] of personalByDate) {
        const existing = map.get(key) ?? { total: 0, urgent: false, high: false };
        existing.total += dayEvents.length;
        map.set(key, existing);
      }
    }
    return map;
  }, [companyTasksByDate, personalByDate, showPersonal]);

  const selectedKey = dateKey(selectedDate);
  const selectedCompanyTasks = companyTasksByDate.get(selectedKey) ?? [];
  const selectedPersonalEvents = personalByDate.get(selectedKey) ?? [];
  const selectedIsToday = isToday(selectedDate);

  const deadlineTasks = useMemo(() => {
    return tasks
      .filter((t) => { if (!t.dueAt || t.status === "done" || t.status === "resolved") return false; return daysUntil(t.dueAt) <= 3; })
      .sort((a, b) => daysUntil(a.dueAt!) - daysUntil(b.dueAt!))
      .slice(0, 3);
  }, [tasks]);

  // 주간 그리드용
  const weekMonday = useMemo(() => getMonday(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => getWeekDays(weekMonday), [weekMonday]);

  function moveMonth(dir: number) {
    setSelectedDate((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() + dir); return d; });
  }
  function moveWeek(dir: number) {
    setSelectedDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() + dir * 7); return d; });
  }
  function goToday() { setSelectedDate(new Date()); }

  const handleAddPersonalEvent = useCallback(() => {
    if (!newEventTitle.trim()) return;
    const event = addPersonalEvent(newEventTitle.trim(), selectedKey, newTimeSlot);
    setPersonalEvents((prev) => [...prev, event]);
    setNewEventTitle(""); setShowAddForm(false); setNewTimeSlot("allday");
  }, [newEventTitle, selectedKey, newTimeSlot]);

  const handleDeletePersonalEvent = useCallback((id: string) => {
    deletePersonalEvent(id);
    setPersonalEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const monthLabel = year + "년 " + (month + 1) + "월";
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
  const lastDay = weekDays[weekDays.length - 1];
  const weekLabel = (weekMonday.getMonth() + 1) + "/" + weekMonday.getDate() + " ~ " + (lastDay.getMonth() + 1) + "/" + lastDay.getDate();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="캘린더" showBack rightAction={
        <div className="flex gap-0.5">
          <Button size="icon" variant={viewType === "week" ? "default" : "ghost"} className="h-8 w-8"
            onClick={() => setViewType("week")}>
            <Columns3 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant={viewType === "month" ? "default" : "ghost"} className="h-8 w-8"
            onClick={() => setViewType("month")}>
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>
      } />

      <main className="max-w-[480px] mx-auto w-full px-4 py-3 flex-1">
        {/* 개인 일정 표시 토글 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <Badge variant="default" className="text-[10px] rounded-full px-2 py-0.5 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70" />회사
            </Badge>
            <Badge
              variant={showPersonal ? "default" : "outline"}
              className="text-[10px] rounded-full px-2 py-0.5 gap-1 cursor-pointer"
              onClick={() => setShowPersonal(!showPersonal)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />내 일정 {showPersonal ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : viewType === "week" ? (
          /* ========== 주간 칼럼 그리드 ========== */
          <>
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{weekLabel}</span>
                {!isToday(weekMonday) && <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={goToday}>오늘</Button>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <WeekTimeline
              weekDays={weekDays}
              tasksByDate={companyTasksByDate}
              personalByDate={personalByDate}
              showPersonal={showPersonal}
              onDeletePersonal={handleDeletePersonalEvent}
            />

            {/* 주간 하단: 빠른 추가 버튼 */}
            <div className="mt-3 flex gap-2 justify-end">
              <Button size="sm" variant="outline" className="h-8 text-[11px] px-3 rounded-lg gap-1"
                onClick={() => { setAddMode("personal"); setShowAddForm(true); }}>
                <Plus className="h-3 w-3" />일정 추가
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] px-3 rounded-lg gap-1"
                onClick={() => navigate("/tasks/new")}>
                <Plus className="h-3 w-3" />업무 추가
              </Button>
            </div>

            {showAddForm && addMode === "personal" && (
              <div className="mt-2 p-2.5 bg-card rounded-xl border border-blue-300/40 space-y-2">
                <Input placeholder="일정을 입력하세요" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddPersonalEvent(); }} className="h-9 text-sm" autoFocus />
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {(["allday", "morning", "afternoon"] as TimeSlot[]).map((slot) => (
                      <Badge key={slot} variant={newTimeSlot === slot ? "default" : "outline"}
                        className="cursor-pointer text-[10px] rounded-full px-2 py-0.5" onClick={() => setNewTimeSlot(slot)}>
                        {TIME_SLOT_LABELS[slot]}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <Button size="sm" className="h-7 px-3 rounded-lg text-[11px]" onClick={handleAddPersonalEvent} disabled={!newEventTitle.trim()}>추가</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowAddForm(false)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ========== 월간 그리드 ========== */
          <>
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{monthLabel}</span>
                {!isCurrentMonth && <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={goToday}>오늘</Button>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="bg-card rounded-2xl border border-border/60 p-2 mb-4">
              <CalendarGrid year={year} month={month} selectedDate={selectedDate} onSelectDate={setSelectedDate} taskCountByDate={taskCountByDate} />
            </div>

            {/* 선택된 날짜 상세 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">{selectedDate.getMonth()+1}/{selectedDate.getDate()} {WEEKDAYS_FULL[selectedDate.getDay()]}</h3>
                  {selectedIsToday && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">오늘</span>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 rounded-lg gap-0.5"
                    onClick={() => { setAddMode("personal"); setShowAddForm(true); }}>
                    <Plus className="h-3 w-3" />일정
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 rounded-lg gap-0.5"
                    onClick={() => navigate("/tasks/new")}>
                    <Plus className="h-3 w-3" />업무
                  </Button>
                </div>
              </div>

              {showAddForm && addMode === "personal" && (
                <div className="mb-3 p-2.5 bg-card rounded-xl border border-blue-300/40 space-y-2">
                  <Input placeholder="일정을 입력하세요" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddPersonalEvent(); }} className="h-9 text-sm" autoFocus />
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {(["allday", "morning", "afternoon"] as TimeSlot[]).map((slot) => (
                        <Badge key={slot} variant={newTimeSlot === slot ? "default" : "outline"}
                          className="cursor-pointer text-[10px] rounded-full px-2 py-0.5" onClick={() => setNewTimeSlot(slot)}>
                          {TIME_SLOT_LABELS[slot]}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex-1" />
                    <Button size="sm" className="h-7 px-3 rounded-lg text-[11px]" onClick={handleAddPersonalEvent} disabled={!newEventTitle.trim()}>추가</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowAddForm(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )}

              {/* 통합 리스트 */}
              {selectedCompanyTasks.length === 0 && selectedPersonalEvents.length === 0 && !showAddForm ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/50">
                  <Inbox className="h-7 w-7 mb-1.5 opacity-40" /><p className="text-xs">이 날 예정된 일정이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedCompanyTasks
                    .sort((a, b) => { if (a.priority === "p1" && b.priority !== "p1") return -1; if (b.priority === "p1" && a.priority !== "p1") return 1; return 0; })
                    .map((task) => <CalendarTaskItem key={task.id} task={task} />)}
                  {showPersonal && selectedPersonalEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-2.5 p-2.5 bg-card rounded-xl border border-dashed border-blue-200/60">
                      <div className="w-1 self-stretch rounded-full bg-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-blue-800">{event.title}</p>
                        <span className="text-[10px] text-blue-400">{TIME_SLOT_LABELS[event.timeSlot ?? "allday"]}</span>
                      </div>
                      <button type="button" className="text-muted-foreground/40 hover:text-destructive p-1" onClick={() => handleDeletePersonalEvent(event.id)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 마감 임박 */}
            {deadlineTasks.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5 mb-2"><CalendarClock className="h-4 w-4 text-orange-500" /><h3 className="text-sm font-bold text-orange-600">마감 임박</h3></div>
                <div className="space-y-1.5">{deadlineTasks.map((task) => <CalendarTaskItem key={task.id} task={task} showDueDate />)}</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
