import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DaySection } from "./DaySection";
import { PriorityBadge } from "@/components/task/PriorityBadge";
import type { Task } from "@/lib/types";

interface WeekViewProps {
  tasks: Task[];
}

/** 해당 날짜가 속한 주의 월요일을 반환 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 월요일부터 일요일까지 7일 배열 */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** 날짜를 YYYY-MM-DD로 변환 */
function dateKey(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function WeekView({ tasks }: WeekViewProps) {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const currentMonday = useMemo(() => {
    const m = getMonday(today);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);

  // 태스크를 날짜별로 분류
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    const noDate: Task[] = [];

    for (const task of tasks) {
      if (task.dueAt) {
        const key = task.dueAt.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      } else {
        noDate.push(task);
      }
    }

    return { map, noDate };
  }, [tasks]);

  // 주간 헤더 텍스트
  const lastDay = weekDays[weekDays.length - 1];
  const headerText =
    (currentMonday.getMonth() + 1) + "/" + currentMonday.getDate() +
    " ~ " +
    (lastDay.getMonth() + 1) + "/" + lastDay.getDate();

  return (
    <div className="space-y-3">
      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setWeekOffset((p) => p - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{headerText}</span>
        <div className="flex items-center gap-1">
          {weekOffset !== 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setWeekOffset(0)}
            >
              오늘
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 요일별 섹션 */}
      <div className="space-y-2">
        {weekDays.map((day) => {
          const key = dateKey(day);
          const dayTasks = tasksByDate.map.get(key) ?? [];
          return <DaySection key={key} date={day} tasks={dayTasks} />;
        })}
      </div>

      {/* 마감일 미정 섹션 */}
      {tasksByDate.noDate.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <span className="text-sm font-medium text-muted-foreground">
              마감일 미정
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {tasksByDate.noDate.length}건
            </Badge>
          </div>
          <div className="p-2 space-y-1.5">
            {tasksByDate.noDate.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate("/tasks/" + task.id)}
              >
                <PriorityBadge priority={task.priority} />
                <span className="text-xs truncate flex-1">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
