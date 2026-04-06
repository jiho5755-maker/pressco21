import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { formatCompactDate, daysUntil, getStartAt, formatDateRange, daysSince, getChecklistStats } from "@/lib/format";
import { Calendar, Clock, ListChecks } from "lucide-react";
import type { Task } from "@/lib/types";
import { hapticFeedback } from "@/lib/telegram";

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  todo: { label: "시작", next: "in_progress" },
  in_progress: { label: "검토", next: "needs_check" },
  needs_check: { label: "완료", next: "done" },
  waiting: { label: "시작", next: "in_progress" },
};

const PRIORITY_BAR: Record<string, string> = {
  p1: "bg-destructive",
  p2: "bg-orange-500",
  p3: "bg-primary/60",
  p4: "bg-muted-foreground/30",
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

interface TaskCardProps {
  task: Task;
  onQuickAction?: (taskId: string, newStatus: string) => void;
  compact?: boolean;
}

export function TaskCard({ task, onQuickAction, compact = false }: TaskCardProps) {
  const navigate = useNavigate();
  const transition = NEXT_STATUS[task.status];
  const startAt = getStartAt(task);
  const dueDays = task.dueAt ? daysUntil(task.dueAt) : null;
  const isOverdue = dueDays !== null && dueDays < 0;
  const isDueToday = dueDays === 0;
  const isDueSoon = dueDays !== null && dueDays > 0 && dueDays <= 2;
  const hasRange = startAt && task.dueAt;
  const barColor = PRIORITY_BAR[task.priority] ?? "bg-muted-foreground/30";
  const progressDays = task.status === "in_progress" && task.createdAt ? daysSince(task.createdAt) : null;
  const desc = String((task.detailsJson as Record<string, unknown>)?.description ?? "");
  const clStats = desc ? getChecklistStats(desc) : null;

  function getDueText(): string {
    // 시작일~마감일 범위가 있으면 범위 표시
    if (hasRange) {
      const rangeText = formatDateRange(startAt, task.dueAt!.slice(0, 10));
      if (dueDays !== null && dueDays <= 0) return rangeText + " (" + (dueDays === 0 ? "오늘 마감" : Math.abs(dueDays) + "일 지남") + ")";
      if (dueDays !== null && dueDays <= 7) return rangeText + " (D-" + dueDays + ")";
      return rangeText;
    }
    if (dueDays === null) return "";
    if (dueDays < -1) return formatCompactDate(task.dueAt!) + " (" + Math.abs(dueDays) + "일 지남)";
    if (dueDays === -1) return "어제 마감";
    if (dueDays === 0) return "오늘 마감";
    if (dueDays === 1) return "내일 마감";
    if (dueDays <= 7) return "D-" + dueDays;
    return formatCompactDate(task.dueAt!);
  }

  return (
    <div
      className="flex bg-card rounded-xl border border-border/60 overflow-hidden cursor-pointer
                 active:scale-[0.98] hover:border-border hover:shadow-sm transition-all duration-150"
      onClick={() => navigate("/tasks/" + task.id)}
    >
      {/* 우선순위 컬러바 */}
      <div className={`w-1 flex-shrink-0 ${barColor}`} />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {/* 상태/우선순위 */}
            {!compact && (
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <StatusBadge status={task.status} />
                {task.priority === "p1" && (
                  <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
                    긴급
                  </span>
                )}
              </div>
            )}

            {/* 제목 */}
            <p className="text-[13px] font-medium leading-snug line-clamp-2 mb-1.5">
              {task.title}
            </p>

            {/* 메타 정보 */}
            <div className="flex items-center gap-2.5 flex-wrap">
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
              {task.dueAt && (
                <span className={`flex items-center gap-1 text-[11px] ${
                  isOverdue ? "text-destructive font-semibold" :
                  isDueToday ? "text-orange-600 font-semibold" :
                  isDueSoon ? "text-yellow-600 font-medium" :
                  "text-muted-foreground"
                }`}>
                  <Calendar className="h-3 w-3" />
                  {getDueText()}
                </span>
              )}
              {progressDays !== null && progressDays >= 2 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {progressDays}일째
                </span>
              )}
              {clStats && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <ListChecks className="h-2.5 w-2.5" />
                  {clStats.checked}/{clStats.total}
                </span>
              )}
            </div>
          </div>

          {/* 퀵 액션 */}
          {transition && onQuickAction && (
            <Button size="sm" variant="outline"
              className="flex-shrink-0 h-7 text-[11px] px-2.5 rounded-lg border-primary/30 text-primary
                         hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); hapticFeedback("light"); onQuickAction(task.id, transition.next); }}>
              {transition.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
