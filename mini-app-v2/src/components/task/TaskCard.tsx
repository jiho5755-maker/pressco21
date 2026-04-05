import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { formatCompactDate, daysUntil } from "@/lib/format";
import { User, Calendar } from "lucide-react";
import type { Task } from "@/lib/types";
import { hapticFeedback } from "@/lib/telegram";

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  todo: { label: "시작", next: "in_progress" },
  in_progress: { label: "검토", next: "needs_check" },
  needs_check: { label: "완료", next: "done" },
  waiting: { label: "시작", next: "in_progress" },
};

interface TaskCardProps {
  task: Task;
  onQuickAction?: (taskId: string, newStatus: string) => void;
  compact?: boolean;
}

export function TaskCard({ task, onQuickAction, compact = false }: TaskCardProps) {
  const navigate = useNavigate();
  const transition = NEXT_STATUS[task.status];
  const dueDays = task.dueAt ? daysUntil(task.dueAt) : null;
  const isOverdue = dueDays !== null && dueDays < 0;
  const isDueToday = dueDays === 0;

  return (
    <Card className="p-3 cursor-pointer active:scale-[0.98] transition-transform duration-150" onClick={() => navigate("/tasks/" + task.id)}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <PriorityBadge priority={task.priority} />
            {!compact && <StatusBadge status={task.status} />}
          </div>
          <p className="text-sm font-medium leading-snug line-clamp-2 mb-1.5">{task.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.assignee && (
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.assignee}</span>
            )}
            {task.dueAt && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : isDueToday ? "text-orange-500 font-medium" : ""}`}>
                <Calendar className="h-3 w-3" />
                {formatCompactDate(task.dueAt)}
                {isOverdue && " (지남)"}
                {isDueToday && " (오늘)"}
              </span>
            )}
          </div>
        </div>

        {transition && onQuickAction && (
          <Button size="sm" variant="outline"
            className="flex-shrink-0 h-7 text-xs px-2.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={(e) => { e.stopPropagation(); hapticFeedback("light"); onQuickAction(task.id, transition.next); }}>
            {transition.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
