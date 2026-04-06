import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { isToday, daysUntil } from "@/lib/format";
import type { Task } from "@/lib/types";
import type { PersonalEvent } from "@/lib/personalEvents";
import { TIME_SLOT_LABELS } from "@/lib/personalEvents";

interface WeekColumnGridProps {
  weekDays: Date[];
  tasksByDate: Map<string, Task[]>;
  personalByDate: Map<string, PersonalEvent[]>;
  showPersonal: boolean;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const PRIORITY_BAR: Record<string, string> = {
  p1: "border-l-destructive",
  p2: "border-l-orange-500",
  p3: "border-l-primary/50",
  p4: "border-l-muted-foreground/30",
};

function dateKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function WeekColumnGrid({ weekDays, tasksByDate, personalByDate, showPersonal }: WeekColumnGridProps) {
  const navigate = useNavigate();

  const columns = useMemo(() => {
    return weekDays.map((day) => {
      const key = dateKey(day);
      const tasks = tasksByDate.get(key) ?? [];
      const personal = showPersonal ? (personalByDate.get(key) ?? []) : [];
      const today = isToday(day);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      return { day, key, tasks, personal, today, isWeekend };
    });
  }, [weekDays, tasksByDate, personalByDate, showPersonal]);

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
      {columns.map((col) => {
        const totalItems = col.tasks.length + col.personal.length;
        const showItems = [...col.tasks.slice(0, 3).map((t) => ({ type: "task" as const, data: t })),
                          ...col.personal.slice(0, 2).map((e) => ({ type: "personal" as const, data: e }))];
        const overflow = totalItems - showItems.length;

        return (
          <div
            key={col.key}
            className={`flex-1 min-w-[56px] rounded-xl border transition-all ${
              col.today
                ? "border-primary/40 bg-primary/5"
                : col.isWeekend
                  ? "border-border/40 bg-muted/20"
                  : "border-border/50 bg-card"
            }`}
          >
            {/* 날짜 헤더 */}
            <div className={`text-center py-1.5 border-b ${col.today ? "border-primary/20" : "border-border/30"}`}>
              <span className={`text-[9px] font-medium block ${
                col.isWeekend ? "text-destructive/50" : "text-muted-foreground"
              }`}>
                {WEEKDAYS[col.day.getDay()]}
              </span>
              <span className={`text-[13px] font-bold leading-none ${
                col.today ? "text-primary" : col.isWeekend ? "text-destructive/60" : ""
              }`}>
                {col.day.getDate()}
              </span>
              {col.today && (
                <span className="block text-[7px] font-bold text-primary mt-0.5">TODAY</span>
              )}
            </div>

            {/* 아이템 */}
            <div className="p-0.5 space-y-0.5 min-h-[60px]">
              {showItems.length === 0 && (
                <div className="text-center py-3">
                  <span className="text-[9px] text-muted-foreground/30">-</span>
                </div>
              )}

              {showItems.map((item, i) => {
                if (item.type === "task") {
                  const task = item.data as Task;
                  const barColor = PRIORITY_BAR[task.priority] ?? "border-l-muted-foreground/30";
                  return (
                    <div
                      key={task.id}
                      className={`px-1 py-1 rounded-md border-l-2 ${barColor} bg-card/80 cursor-pointer hover:bg-muted/30 transition-colors`}
                      onClick={() => navigate("/tasks/" + task.id)}
                    >
                      <p className="text-[9px] font-medium leading-tight line-clamp-2">{task.title}</p>
                      {task.assignee && (
                        <span className="text-[7px] text-muted-foreground block mt-0.5 truncate">{task.assignee}</span>
                      )}
                    </div>
                  );
                } else {
                  const event = item.data as PersonalEvent;
                  return (
                    <div
                      key={event.id}
                      className="px-1 py-1 rounded-md border-l-2 border-l-blue-400 bg-blue-50/50 border border-dashed border-blue-200/50"
                    >
                      <p className="text-[9px] font-medium leading-tight line-clamp-2 text-blue-700">{event.title}</p>
                      <span className="text-[7px] text-blue-400">{TIME_SLOT_LABELS[event.timeSlot ?? "allday"]}</span>
                    </div>
                  );
                }
              })}

              {overflow > 0 && (
                <p className="text-[8px] text-muted-foreground text-center">+{overflow}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
