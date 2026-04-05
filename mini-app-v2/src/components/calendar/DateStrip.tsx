import { useMemo } from "react";
import { isToday } from "@/lib/format";
import type { Task } from "@/lib/types";

interface DateStripProps {
  weekDays: Date[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
  tasksByDate: Map<string, Task[]>;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dateKey(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DateStrip({ weekDays, selectedDate, onSelect, tasksByDate }: DateStripProps) {
  const items = useMemo(() => {
    return weekDays.map((day) => {
      const key = dateKey(day);
      const tasks = tasksByDate.get(key) ?? [];
      const today = isToday(day);
      const selected = isSameDay(day, selectedDate);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const hasUrgent = tasks.some((t) => t.priority === "p1");
      const hasOverdue = tasks.some((t) => {
        if (!t.dueAt) return false;
        const due = new Date(t.dueAt);
        due.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return due < now;
      });

      return { day, key, tasks, today, selected, isWeekend, hasUrgent, hasOverdue, count: tasks.length };
    });
  }, [weekDays, selectedDate, tasksByDate]);

  return (
    <div className="flex gap-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.day)}
          className={`
            flex-1 flex flex-col items-center py-2 rounded-xl transition-all duration-200 min-w-0 relative
            ${item.selected
              ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
              : item.today
                ? "bg-primary/10 text-primary"
                : "bg-card hover:bg-muted/60"
            }
            ${!item.selected && !item.today ? "border border-border/50" : ""}
          `}
        >
          {/* 요일 */}
          <span className={`text-[10px] font-medium mb-0.5 ${
            item.selected ? "text-primary-foreground/80" :
            item.isWeekend ? "text-destructive/60" : "text-muted-foreground"
          }`}>
            {WEEKDAYS[item.day.getDay()]}
          </span>

          {/* 날짜 */}
          <span className={`text-sm font-bold leading-none ${
            item.selected ? "" :
            item.today ? "text-primary" :
            item.isWeekend ? "text-destructive/70" : ""
          }`}>
            {item.day.getDate()}
          </span>

          {/* 태스크 카운트 인디케이터 */}
          {item.count > 0 && (
            <div className="flex items-center gap-0.5 mt-1.5">
              {item.hasUrgent || item.hasOverdue ? (
                <span className={`w-1.5 h-1.5 rounded-full ${
                  item.selected ? "bg-primary-foreground" :
                  item.hasOverdue ? "bg-destructive" : "bg-orange-500"
                }`} />
              ) : null}
              <span className={`text-[9px] font-semibold ${
                item.selected ? "text-primary-foreground/90" : "text-muted-foreground"
              }`}>
                {item.count}
              </span>
            </div>
          )}

          {/* 오늘 마커 */}
          {item.today && !item.selected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
