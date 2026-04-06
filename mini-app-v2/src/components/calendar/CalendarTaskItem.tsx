import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { daysUntil, getStartAt, formatDateRange } from "@/lib/format";
import type { Task } from "@/lib/types";

interface CalendarTaskItemProps {
  task: Task;
  showDueDate?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  p1: "bg-destructive",
  p2: "bg-orange-500",
  p3: "bg-primary",
  p4: "bg-muted-foreground/40",
};

const PRIORITY_LABELS: Record<string, string> = {
  p1: "긴급",
  p2: "높음",
  p3: "보통",
  p4: "낮음",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  todo: { label: "할일", className: "text-muted-foreground bg-muted" },
  in_progress: { label: "진행", className: "text-primary bg-primary/10" },
  needs_check: { label: "검토", className: "text-orange-600 bg-orange-50" },
  waiting: { label: "대기", className: "text-yellow-600 bg-yellow-50" },
  done: { label: "완료", className: "text-green-600 bg-green-50" },
};

function getAvatarColor(name: string): string {
  const colors = [
    "bg-primary/20 text-primary",
    "bg-warm/20 text-[#8b6914]",
    "bg-brand-light/30 text-[#3d5435]",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getDueLabel(dueAt: string): { label: string; className: string } | null {
  const days = daysUntil(dueAt);
  if (days < -1) return { label: `${Math.abs(days)}일 지남`, className: "text-destructive font-semibold" };
  if (days === -1) return { label: "어제 마감", className: "text-destructive font-semibold" };
  if (days === 0) return { label: "오늘 마감", className: "text-orange-600 font-semibold" };
  if (days === 1) return { label: "내일 마감", className: "text-orange-500" };
  if (days <= 3) return { label: `D-${days}`, className: "text-yellow-600" };
  return { label: `D-${days}`, className: "text-muted-foreground" };
}

export function CalendarTaskItem({ task, showDueDate = false }: CalendarTaskItemProps) {
  const navigate = useNavigate();
  const priorityColor = PRIORITY_COLORS[task.priority] ?? "bg-muted-foreground/40";
  const statusInfo = STATUS_LABELS[task.status] ?? STATUS_LABELS.todo;
  const startAt = getStartAt(task);
  const hasRange = startAt && task.dueAt;
  const dueLabel = task.dueAt ? getDueLabel(task.dueAt) : null;

  return (
    <div
      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/60 cursor-pointer
                 active:scale-[0.98] hover:border-border hover:shadow-sm transition-all duration-150"
      onClick={() => navigate("/tasks/" + task.id)}
    >
      {/* 우선순위 바 */}
      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${priorityColor}`} />

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
          {task.priority === "p1" && (
            <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
              {PRIORITY_LABELS.p1}
            </span>
          )}
        </div>

        <p className="text-[13px] font-medium leading-snug line-clamp-2 mb-1">
          {task.title}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarFallback className={`text-[8px] font-bold ${getAvatarColor(task.assignee)}`}>
                  {task.assignee.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-muted-foreground">{task.assignee}</span>
            </div>
          )}
          {hasRange && (
            <span className="text-[10px] text-muted-foreground">
              {formatDateRange(startAt, task.dueAt!.slice(0, 10))}
            </span>
          )}
          {showDueDate && dueLabel && !hasRange && (
            <span className={`text-[11px] ${dueLabel.className}`}>{dueLabel.label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
