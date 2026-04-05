import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarTaskItem } from "@/components/calendar/CalendarTaskItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fetchActiveTasks } from "@/lib/api";
import { getPersonalEvents, addPersonalEvent, deletePersonalEvent } from "@/lib/personalEvents";
import type { PersonalEvent } from "@/lib/personalEvents";
import { daysUntil } from "@/lib/format";
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Inbox,
  X, CalendarClock, Briefcase, User
} from "lucide-react";
import type { Task } from "@/lib/types";

type CalendarMode = "company" | "personal";

const WEEKDAYS_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function dateKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CalendarMode>("company");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [personalEvents, setPersonalEvents] = useState<PersonalEvent[]>([]);

  // 개인 일정 입력 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  useEffect(() => {
    fetchActiveTasks()
      .then((res) => setTasks(res.explorer?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 개인 일정 로드
  useEffect(() => {
    setPersonalEvents(getPersonalEvents());
  }, []);

  // 회사 업무: 날짜별 태스크 맵
  const companyTasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.dueAt) {
        const key = task.dueAt.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      }
    }
    return map;
  }, [tasks]);

  // 개인 일정: 날짜별 맵
  const personalByDate = useMemo(() => {
    const map = new Map<string, PersonalEvent[]>();
    for (const event of personalEvents) {
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date)!.push(event);
    }
    return map;
  }, [personalEvents]);

  // CalendarGrid에 전달할 날짜별 카운트 정보
  const taskCountByDate = useMemo(() => {
    const map = new Map<string, { total: number; urgent: boolean; high: boolean }>();

    if (mode === "company") {
      for (const [key, dayTasks] of companyTasksByDate) {
        map.set(key, {
          total: dayTasks.length,
          urgent: dayTasks.some((t) => t.priority === "p1"),
          high: dayTasks.some((t) => t.priority === "p2"),
        });
      }
    } else {
      for (const [key, dayEvents] of personalByDate) {
        map.set(key, {
          total: dayEvents.length,
          urgent: false,
          high: false,
        });
      }
    }

    return map;
  }, [mode, companyTasksByDate, personalByDate]);

  // 선택된 날짜 데이터
  const selectedKey = dateKey(selectedDate);
  const selectedCompanyTasks = companyTasksByDate.get(selectedKey) ?? [];
  const selectedPersonalEvents = personalByDate.get(selectedKey) ?? [];
  const selectedIsToday = isToday(selectedDate);

  // 마감 임박 (회사 모드)
  const deadlineTasks = useMemo(() => {
    if (mode !== "company") return [];
    return tasks
      .filter((t) => {
        if (!t.dueAt || t.status === "done" || t.status === "resolved") return false;
        return daysUntil(t.dueAt) <= 3;
      })
      .sort((a, b) => daysUntil(a.dueAt!) - daysUntil(b.dueAt!))
      .slice(0, 3);
  }, [tasks, mode]);

  // 월 이동
  function moveMonth(dir: number) {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  }

  function goToday() {
    setSelectedDate(new Date());
  }

  // 개인 일정 추가
  const handleAddPersonalEvent = useCallback(() => {
    if (!newEventTitle.trim()) return;
    const event = addPersonalEvent(newEventTitle.trim(), selectedKey);
    setPersonalEvents((prev) => [...prev, event]);
    setNewEventTitle("");
    setShowAddForm(false);
  }, [newEventTitle, selectedKey]);

  // 개인 일정 삭제
  const handleDeletePersonalEvent = useCallback((id: string) => {
    deletePersonalEvent(id);
    setPersonalEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const monthLabel = year + "년 " + (month + 1) + "월";
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="캘린더" showBack />

      <main className="max-w-[480px] mx-auto w-full px-4 py-3 flex-1">
        {/* 회사/개인 토글 */}
        <ToggleGroup
          value={[mode]}
          onValueChange={(values) => {
            const next = values[values.length - 1] as CalendarMode | undefined;
            if (next) setMode(next);
          }}
          className="h-9 bg-muted/50 rounded-xl p-0.5 mb-3 w-full"
        >
          <ToggleGroupItem value="company" className="flex-1 text-xs h-8 rounded-lg gap-1 data-[state=on]:bg-card data-[state=on]:shadow-sm">
            <Briefcase className="h-3.5 w-3.5" />
            회사 업무
          </ToggleGroupItem>
          <ToggleGroupItem value="personal" className="flex-1 text-xs h-8 rounded-lg gap-1 data-[state=on]:bg-card data-[state=on]:shadow-sm">
            <User className="h-3.5 w-3.5" />
            내 일정
          </ToggleGroupItem>
        </ToggleGroup>

        {loading && mode === "company" ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{monthLabel}</span>
                {!isCurrentMonth && (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={goToday}>
                    오늘
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 달력 그리드 */}
            <div className="bg-card rounded-2xl border border-border/60 p-2 mb-4">
              <CalendarGrid
                year={year}
                month={month}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                taskCountByDate={taskCountByDate}
              />
            </div>

            {/* 선택된 날짜 상세 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">
                    {selectedDate.getMonth() + 1}/{selectedDate.getDate()} {WEEKDAYS_FULL[selectedDate.getDay()]}
                  </h3>
                  {selectedIsToday && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      오늘
                    </span>
                  )}
                </div>

                {/* 추가 버튼 */}
                {mode === "company" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 rounded-lg gap-1"
                    onClick={() => navigate("/tasks/new")}
                  >
                    <Plus className="h-3 w-3" />
                    업무 추가
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 rounded-lg gap-1"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="h-3 w-3" />
                    일정 추가
                  </Button>
                )}
              </div>

              {/* 개인 일정 입력 폼 */}
              {showAddForm && mode === "personal" && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-card rounded-xl border border-primary/30">
                  <Input
                    placeholder="일정을 입력하세요"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddPersonalEvent(); }}
                    className="h-9 text-sm flex-1"
                    autoFocus
                  />
                  <Button size="sm" className="h-9 px-3 rounded-lg" onClick={handleAddPersonalEvent} disabled={!newEventTitle.trim()}>
                    추가
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setShowAddForm(false); setNewEventTitle(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* 회사 업무 목록 */}
              {mode === "company" && (
                selectedCompanyTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <Inbox className="h-7 w-7 mb-1.5 opacity-40" />
                    <p className="text-xs">이 날 예정된 업무가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCompanyTasks
                      .sort((a, b) => {
                        if (a.priority === "p1" && b.priority !== "p1") return -1;
                        if (a.priority !== "p1" && b.priority === "p1") return 1;
                        const order: Record<string, number> = { in_progress: 0, todo: 1, needs_check: 2, waiting: 3 };
                        return (order[a.status] ?? 5) - (order[b.status] ?? 5);
                      })
                      .map((task) => (
                        <CalendarTaskItem key={task.id} task={task} />
                      ))}
                  </div>
                )
              )}

              {/* 개인 일정 목록 */}
              {mode === "personal" && (
                selectedPersonalEvents.length === 0 && !showAddForm ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <Inbox className="h-7 w-7 mb-1.5 opacity-40" />
                    <p className="text-xs">이 날 등록된 일정이 없습니다</p>
                    <button
                      type="button"
                      className="text-xs text-primary mt-2 font-medium"
                      onClick={() => setShowAddForm(true)}
                    >
                      + 일정 추가하기
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedPersonalEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2.5 p-2.5 bg-card rounded-xl border border-border/60"
                      >
                        <div className="w-1 self-stretch rounded-full bg-blue-400 flex-shrink-0" />
                        <p className="text-[13px] font-medium flex-1">{event.title}</p>
                        <button
                          type="button"
                          className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                          onClick={() => handleDeletePersonalEvent(event.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* 마감 임박 (회사 모드만) */}
            {mode === "company" && deadlineTasks.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <CalendarClock className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-orange-600">마감 임박</h3>
                </div>
                <div className="space-y-1.5">
                  {deadlineTasks.map((task) => (
                    <CalendarTaskItem key={task.id} task={task} showDueDate />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
