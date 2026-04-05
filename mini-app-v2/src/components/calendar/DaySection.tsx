import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/task/PriorityBadge";
import { isToday } from "@/lib/format";
import type { Task } from "@/lib/types";

interface DaySectionProps {
  date: Date;
  tasks: Task[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function DaySection({ date, tasks }: DaySectionProps) {
  const navigate = useNavigate();
  const today = isToday(date);
  const dayName = WEEKDAYS[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      className={`rounded-lg border ${
        today ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              today
                ? "text-primary"
                : isWeekend
                  ? "text-destructive/70"
                  : "text-foreground"
            }`}
          >
            {date.getDate()}
          </span>
          <span
            className={`text-xs ${
              isWeekend ? "text-destructive/50" : "text-muted-foreground"
            }`}
          >
            {dayName}
          </span>
          {today && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">
              오늘
            </Badge>
          )}
        </div>
        {tasks.length > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {tasks.length}건
          </Badge>
        )}
      </div>

      {/* 태스크 목록 */}
      <div className="p-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 text-center py-1">
            -
          </p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => (
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
        )}
      </div>
    </div>
  );
}
