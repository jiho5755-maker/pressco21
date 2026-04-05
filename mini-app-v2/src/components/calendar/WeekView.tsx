import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarClock, Inbox } from "lucide-react";
import { DateStrip } from "./DateStrip";
import { CalendarTaskItem } from "./CalendarTaskItem";
import { isToday, daysUntil } from "@/lib/format";
import type { Task } from "@/lib/types";

interface WeekViewProps {
  tasks: Task[];
}

const WEEKDAYS_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

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

function dateKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function WeekView({ tasks }: WeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNoDate, setShowNoDate] = useState(false);

  const today = new Date();
  const currentMonday = useMemo(() => {
    const m = getMonday(today);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);

  // 태스크를 날짜별로 분류
  const { tasksByDate, noDateTasks, deadlineTasks } = useMemo(() => {
    const map = new Map<string, Task[]>();
    const noDate: Task[] = [];
    const deadlines: Task[] = [];

    for (const task of tasks) {
      if (task.dueAt) {
        const key = task.dueAt.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);

        // 마감 임박: D-3 이내이거나 이미 지난 것
        const days = daysUntil(task.dueAt);
        if (days <= 3 && task.status !== "done" && task.status !== "resolved") {
          deadlines.push(task);
        }
      } else {
        noDate.push(task);
      }
    }

    // 마감 임박 정렬: 지난 것 먼저, 그다음 가까운 순
    deadlines.sort((a, b) => {
      const dA = daysUntil(a.dueAt!);
      const dB = daysUntil(b.dueAt!);
      return dA - dB;
    });

    return { tasksByDate: map, noDateTasks: noDate, deadlineTasks: deadlines };
  }, [tasks]);

  // 선택된 날짜의 태스크
  const selectedKey = dateKey(selectedDate);
  const selectedTasks = tasksByDate.get(selectedKey) ?? [];
  const selectedIsToday = isToday(selectedDate);

  // 주간 헤더 텍스트
  const lastDay = weekDays[weekDays.length - 1];
  const headerText =
    (currentMonday.getMonth() + 1) + "/" + currentMonday.getDate() +
    " ~ " +
    (lastDay.getMonth() + 1) + "/" + lastDay.getDate();

  // 주 이동 시 선택 날짜도 이동
  function moveWeek(dir: number) {
    setWeekOffset((p) => p + dir);
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  }

  function goToday() {
    setWeekOffset(0);
    setSelectedDate(new Date());
  }

  return (
    <div className="space-y-4">
      {/* 주간 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{headerText}</span>
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" className="h-6 text-[11px] px-2 rounded-full" onClick={goToday}>
              오늘
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWeek(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 가로 날짜 선택기 */}
      <DateStrip
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        tasksByDate={tasksByDate}
      />

      {/* 선택된 날짜 상세 */}
      <div>
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
          {selectedTasks.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">{selectedTasks.length}건</span>
          )}
        </div>

        {selectedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
            <Inbox className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">이 날 예정된 업무가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedTasks
              .sort((a, b) => {
                // 긴급 먼저, 그다음 상태순
                if (a.priority === "p1" && b.priority !== "p1") return -1;
                if (a.priority !== "p1" && b.priority === "p1") return 1;
                const statusOrder: Record<string, number> = { in_progress: 0, todo: 1, needs_check: 2, waiting: 3, done: 4 };
                return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
              })
              .map((task) => (
                <CalendarTaskItem key={task.id} task={task} />
              ))}
          </div>
        )}
      </div>

      {/* 마감 임박 섹션 */}
      {deadlineTasks.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CalendarClock className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-bold text-orange-600">마감 임박</h3>
            <span className="text-[10px] text-orange-500 font-medium">{deadlineTasks.length}건</span>
          </div>
          <div className="space-y-1.5">
            {deadlineTasks.slice(0, 5).map((task) => (
              <CalendarTaskItem key={task.id} task={task} showDueDate />
            ))}
            {deadlineTasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{deadlineTasks.length - 5}건 더
              </p>
            )}
          </div>
        </div>
      )}

      {/* 마감일 미정 (접이식) */}
      {noDateTasks.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowNoDate(!showNoDate)}
            className="flex items-center justify-between w-full py-1 text-left"
          >
            <div className="flex items-center gap-1.5">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">마감일 미정</span>
              <span className="text-[10px] text-muted-foreground">{noDateTasks.length}건</span>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showNoDate ? "rotate-90" : ""}`} />
          </button>

          {showNoDate && (
            <div className="space-y-1.5 mt-2">
              {noDateTasks.slice(0, 10).map((task) => (
                <CalendarTaskItem key={task.id} task={task} />
              ))}
              {noDateTasks.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{noDateTasks.length - 10}건 더 (업무 보드에서 확인)
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
