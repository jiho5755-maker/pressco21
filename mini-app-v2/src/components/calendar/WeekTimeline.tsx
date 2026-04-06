import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isToday, daysUntil } from "@/lib/format";
import { getProjectColorSet } from "@/lib/projects";
import { TIME_SLOT_LABELS } from "@/lib/personalEvents";
import type { Task } from "@/lib/types";
import type { PersonalEvent } from "@/lib/personalEvents";
import { Inbox, X } from "lucide-react";

interface WeekTimelineProps {
  weekDays: Date[];
  tasksByDate: Map<string, Task[]>;
  personalByDate: Map<string, PersonalEvent[]>;
  showPersonal: boolean;
  onDeletePersonal?: (id: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const PRIORITY_BAR: Record<string, string> = {
  p1: "bg-destructive",
  p2: "bg-orange-500",
  p3: "bg-primary/50",
  p4: "bg-muted-foreground/30",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  todo: { label: "할일", cls: "text-muted-foreground bg-muted" },
  in_progress: { label: "진행", cls: "text-primary bg-primary/10" },
  needs_check: { label: "검토", cls: "text-orange-600 bg-orange-50" },
  waiting: { label: "대기", cls: "text-yellow-600 bg-yellow-50" },
  done: { label: "완료", cls: "text-green-600 bg-green-50" },
};

function dateKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getAvatarColor(name: string): string {
  const colors = ["bg-primary/20 text-primary", "bg-warm/20 text-[#8b6914]", "bg-brand-light/30 text-[#3d5435]", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function WeekTimeline({ weekDays, tasksByDate, personalByDate, showPersonal, onDeletePersonal }: WeekTimelineProps) {
  const navigate = useNavigate();

  const days = useMemo(() => {
    return weekDays.map((day) => {
      const key = dateKey(day);
      const tasks = tasksByDate.get(key) ?? [];
      const personal = showPersonal ? (personalByDate.get(key) ?? []) : [];
      const today = isToday(day);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;

      // 프로젝트별 그룹핑
      const byProject = new Map<string, Task[]>();
      const noProject: Task[] = [];
      for (const t of tasks) {
        const proj = t.relatedProject || "";
        if (proj) {
          if (!byProject.has(proj)) byProject.set(proj, []);
          byProject.get(proj)!.push(t);
        } else {
          noProject.push(t);
        }
      }

      return { day, key, tasks, personal, today, isWeekend, byProject, noProject };
    });
  }, [weekDays, tasksByDate, personalByDate, showPersonal]);

  return (
    <div className="space-y-1">
      {days.map((col) => {
        const totalItems = col.tasks.length + col.personal.length;
        const isEmpty = totalItems === 0;
        const dayLabel = `${col.day.getMonth() + 1}/${col.day.getDate()} ${WEEKDAYS[col.day.getDay()]}`;

        return (
          <div key={col.key}>
            {/* 날짜 헤더 */}
            <div className={`flex items-center gap-2 py-1.5 px-1 ${col.today ? "" : ""}`}>
              <div className={`flex items-center gap-1.5 ${col.today ? "text-primary font-bold" : col.isWeekend ? "text-destructive/60" : "text-foreground"}`}>
                <span className={`text-[13px] font-bold ${col.today ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-[11px]" : ""}`}>
                  {col.today ? col.day.getDate() : ""}
                </span>
                {!col.today && <span className="text-[13px] font-bold">{dayLabel}</span>}
                {col.today && <span className="text-[13px] font-bold">{dayLabel}</span>}
              </div>
              {col.today && (
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">오늘</span>
              )}
              <div className="flex-1 h-px bg-border/50" />
              {totalItems > 0 && (
                <span className="text-[10px] text-muted-foreground font-medium">{totalItems}건</span>
              )}
            </div>

            {/* 빈 날 */}
            {isEmpty && (
              <div className="py-2 pl-4">
                <span className="text-[11px] text-muted-foreground/40">예정된 업무 없음</span>
              </div>
            )}

            {/* 프로젝트별 태스크 */}
            {[...col.byProject.entries()].map(([projName, projTasks]) => {
              const colorSet = getProjectColorSet(projName);
              return (
                <div key={projName} className="ml-2 mb-1.5">
                  {/* 프로젝트 태그 */}
                  <div className="flex items-center gap-1 mb-1 pl-1">
                    <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${colorSet.bar}`} />
                    <span className={`text-[10px] font-semibold ${colorSet.text}`}>{projName}</span>
                  </div>
                  {/* 태스크 카드 */}
                  <div className="space-y-1 ml-3">
                    {projTasks
                      .sort((a, b) => {
                        const po: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };
                        return (po[a.priority] ?? 9) - (po[b.priority] ?? 9);
                      })
                      .map((task) => (
                        <TaskTimelineCard key={task.id} task={task} onClick={() => navigate("/tasks/" + task.id)} />
                      ))}
                  </div>
                </div>
              );
            })}

            {/* 프로젝트 없는 태스크 */}
            {col.noProject.length > 0 && (
              <div className="ml-2 mb-1.5">
                <div className="space-y-1 ml-3">
                  {col.noProject.map((task) => (
                    <TaskTimelineCard key={task.id} task={task} onClick={() => navigate("/tasks/" + task.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* 개인 일정 */}
            {col.personal.length > 0 && (
              <div className="ml-2 mb-1.5">
                <div className="flex items-center gap-1 mb-1 pl-1">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0 bg-blue-400" />
                  <span className="text-[10px] font-semibold text-blue-600">내 일정</span>
                </div>
                <div className="space-y-1 ml-3">
                  {col.personal.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-blue-200/60 bg-blue-50/30"
                    >
                      <div className="w-0.5 self-stretch rounded-full bg-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-blue-800 leading-tight">{event.title}</p>
                        <span className="text-[9px] text-blue-400">{TIME_SLOT_LABELS[event.timeSlot ?? "allday"]}</span>
                      </div>
                      {onDeletePersonal && (
                        <button type="button" className="text-blue-300 hover:text-destructive p-0.5 transition-colors"
                          onClick={() => onDeletePersonal(event.id)}>
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskTimelineCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const barColor = PRIORITY_BAR[task.priority] ?? "bg-muted-foreground/30";
  const statusInfo = STATUS_LABELS[task.status] ?? STATUS_LABELS.todo;
  const dueDays = task.dueAt ? daysUntil(task.dueAt) : null;

  let dueLabel = "";
  if (dueDays !== null) {
    if (dueDays < 0) dueLabel = `${Math.abs(dueDays)}일 지남`;
    else if (dueDays === 0) dueLabel = "오늘";
    else if (dueDays === 1) dueLabel = "내일";
    else if (dueDays <= 7) dueLabel = `D-${dueDays}`;
  }

  return (
    <div
      className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-card border border-border/50 cursor-pointer
                 active:scale-[0.98] hover:border-border hover:shadow-sm transition-all duration-150"
      onClick={onClick}
    >
      <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${barColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${statusInfo.cls}`}>{statusInfo.label}</span>
          {task.priority === "p1" && (
            <span className="text-[9px] font-semibold text-destructive bg-destructive/10 px-1 py-0.5 rounded">긴급</span>
          )}
          {dueLabel && (
            <span className={`text-[9px] font-medium ${dueDays !== null && dueDays <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {dueLabel}
            </span>
          )}
        </div>
        <p className="text-[12px] font-medium leading-snug line-clamp-2">{task.title}</p>
        {task.assignee && (
          <div className="flex items-center gap-1 mt-0.5">
            <Avatar className="h-3.5 w-3.5">
              <AvatarFallback className={`text-[7px] font-bold ${getAvatarColor(task.assignee)}`}>
                {task.assignee.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
          </div>
        )}
      </div>
    </div>
  );
}
