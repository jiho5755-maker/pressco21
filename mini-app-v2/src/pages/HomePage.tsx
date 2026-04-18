import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { fetchActiveTasks, fetchMe } from "@/lib/api";
import { getTelegramUserName } from "@/lib/telegram";
import { daysUntil, isToday, getStartAt } from "@/lib/format";
import {
  ClipboardList, CalendarDays, Truck, PlusCircle,
  AlertTriangle, CalendarClock, ChevronRight, MessageSquareText,
  UserCheck
} from "lucide-react";
import type { Task } from "@/lib/types";

const PRIORITY_DOT: Record<string, string> = {
  p1: "bg-destructive",
  p2: "bg-orange-500",
  p3: "bg-primary",
  p4: "bg-muted-foreground/40",
};

export function HomePage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("...");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tgName = getTelegramUserName();
    if (tgName) {
      setUserName(tgName);
    } else {
      fetchMe()
        .then((me) => setUserName(me?.name ?? "관리자"))
        .catch(() => setUserName("관리자"));
    }

    fetchActiveTasks()
      .then((res) => setTasks(res.explorer?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;
    const urgent = tasks.filter((t) => t.priority === "p1").length;
    const review = tasks.filter((t) => t.status === "needs_check").length;
    const todayDue = tasks.filter((t) => t.dueAt && isToday(t.dueAt)).length;
    return { todo, urgent, review, todayDue };
  }, [tasks]);

  // 오늘 마감 + 마감 임박 (D-2 이내)
  const urgentTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.status === "done" || t.status === "resolved") return false;
        if (t.priority === "p1") return true;
        if (t.dueAt) {
          const d = daysUntil(t.dueAt);
          return d <= 2;
        }
        return false;
      })
      .sort((a, b) => {
        // 긴급 먼저
        if (a.priority === "p1" && b.priority !== "p1") return -1;
        if (a.priority !== "p1" && b.priority === "p1") return 1;
        // 마감일 가까운 순
        const dA = a.dueAt ? daysUntil(a.dueAt) : 999;
        const dB = b.dueAt ? daysUntil(b.dueAt) : 999;
        return dA - dB;
      })
      .slice(0, 4);
  }, [tasks]);

  const menuCards = [
    {
      icon: <ClipboardList className="h-5 w-5" />,
      label: "업무 보드",
      path: "/tasks",
      badge: stats.todo > 0 ? stats.todo + "건" : undefined,
      desc: "할일/진행/검토",
    },
    {
      icon: <CalendarDays className="h-5 w-5" />,
      label: "캘린더",
      path: "/calendar",
      badge: stats.todayDue > 0 ? "오늘 " + stats.todayDue : undefined,
      desc: "주간 일정",
    },
    {
      icon: <Truck className="h-5 w-5" />,
      label: "출고",
      path: "/shipment",
      desc: "출고 체크",
    },
    {
      icon: <UserCheck className="h-5 w-5" />,
      label: "근태 관리",
      path: "/hr",
      desc: "출퇴근·리포트",
    },
    {
      icon: <PlusCircle className="h-5 w-5" />,
      label: "새 업무",
      path: "/tasks/new",
      desc: "업무 등록",
    },
    {
      icon: <MessageSquareText className="h-5 w-5" />,
      label: "OMX 답변 허브",
      path: "/omx",
      badge: "신규",
      desc: "문의/리뷰 승인형",
    },
  ];

  return (
    <div>
      <Header title="PRESSCO21 업무도구" />
      <main className="max-w-[480px] mx-auto px-4 py-5">
        {/* 인사 + 알림 */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-foreground">{userName}님, 안녕하세요</h2>
          {!loading && stats.urgent > 0 && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              긴급 업무 {stats.urgent}건
            </p>
          )}
          {!loading && stats.urgent === 0 && stats.todo > 0 && (
            <p className="text-sm text-muted-foreground mt-1">처리할 업무 {stats.todo}건</p>
          )}
        </div>

        {/* 상태 요약 바 (클릭 → 해당 필터로 보드 이동) */}
        {!loading && (
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: "할일", value: tasks.filter((t) => t.status === "todo").length, color: "", filterKey: "all" },
              { label: "진행", value: tasks.filter((t) => t.status === "in_progress").length, color: "text-primary", filterKey: "all" },
              { label: "검토", value: stats.review, color: "text-orange-600", filterKey: "review" },
              { label: "긴급", value: stats.urgent, color: stats.urgent > 0 ? "text-destructive" : "", filterKey: "urgent" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="bg-card rounded-xl border border-border/60 p-2.5 text-center cursor-pointer active:scale-95 transition-transform hover:border-primary/40"
                onClick={() => navigate("/tasks", { state: { filter: item.filterKey } })}
              >
                <p className={`text-lg font-bold ${item.color || "text-foreground"}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* 지금 해야 할 것 — 포커스 카드 */}
        {!loading && (() => {
          // 가장 긴급한 1건: p1 먼저 → 마감 임박 → 진행중
          const focusTask = tasks
            .filter((t) => t.status !== "done" && t.status !== "resolved")
            .sort((a, b) => {
              if (a.priority === "p1" && b.priority !== "p1") return -1;
              if (b.priority === "p1" && a.priority !== "p1") return 1;
              // startAt이 오늘 이전이면 이미 시작해야 할 업무 → 우선
              const sA = getStartAt(a);
              const sB = getStartAt(b);
              const startedA = sA && daysUntil(sA) <= 0;
              const startedB = sB && daysUntil(sB) <= 0;
              if (startedA && !startedB) return -1;
              if (!startedA && startedB) return 1;
              const dA = a.dueAt ? daysUntil(a.dueAt) : 999;
              const dB = b.dueAt ? daysUntil(b.dueAt) : 999;
              if (dA !== dB) return dA - dB;
              if (a.status === "in_progress" && b.status !== "in_progress") return -1;
              return 0;
            })[0];

          if (!focusTask) return null;

          const dueDays = focusTask.dueAt ? daysUntil(focusTask.dueAt) : null;
          const dueLabel = dueDays !== null
            ? dueDays < 0 ? `${Math.abs(dueDays)}일 지남` : dueDays === 0 ? "오늘 마감" : dueDays === 1 ? "내일 마감" : `D-${dueDays}`
            : null;

          return (
            <Card className="mb-4 border-primary/30 bg-primary/5 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate("/tasks/" + focusTask.id)}>
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-primary mb-1.5">지금 해야 할 것</p>
                <p className="text-[15px] font-bold leading-snug line-clamp-2 mb-2">{focusTask.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {focusTask.assignee && <span>담당: {focusTask.assignee}</span>}
                  {dueLabel && (
                    <span className={dueDays !== null && dueDays <= 0 ? "text-destructive font-semibold" : "text-orange-600 font-medium"}>
                      {dueLabel}
                    </span>
                  )}
                  {focusTask.priority === "p1" && <span className="text-destructive font-semibold">긴급</span>}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {menuCards.map((card) => (
            <Card
              key={card.path}
              className="cursor-pointer active:scale-[0.97] transition-all duration-150 hover:shadow-md border-border/60"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="p-3.5 flex items-center gap-3 relative">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">{card.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{card.desc}</p>
                </div>
                {card.badge && (
                  <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0 h-4">
                    {card.badge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 직원별 업무 현황 */}
        {!loading && tasks.length > 0 && (
          <Card className="mb-4 border-border/60">
            <CardContent className="p-3.5">
              <h3 className="text-sm font-bold mb-2.5">직원별 현황</h3>
              <div className="space-y-1.5">
                {(() => {
                  const byAssignee = new Map<string, { total: number; urgent: number }>();
                  let unassigned = 0;
                  for (const t of tasks) {
                    if (!t.assignee) { unassigned++; continue; }
                    // assignee가 "장지호, 이재혁" 형태일 수 있음
                    for (const name of t.assignee.split(",").map(s => s.trim())) {
                      if (!byAssignee.has(name)) byAssignee.set(name, { total: 0, urgent: 0 });
                      const entry = byAssignee.get(name)!;
                      entry.total++;
                      if (t.priority === "p1") entry.urgent++;
                    }
                  }
                  const entries = [...byAssignee.entries()].sort((a, b) => b[1].total - a[1].total);
                  return (
                    <>
                      {entries.map(([name, info]) => (
                        <div key={name} className="flex items-center gap-2 py-1">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${info.urgent > 0 ? "bg-destructive" : "bg-primary/50"}`} />
                          <span className="text-[13px] font-medium flex-1">{name}</span>
                          <span className="text-[11px] text-muted-foreground">{info.total}건</span>
                          {info.urgent > 0 && (
                            <span className="text-[10px] text-destructive font-semibold">긴급 {info.urgent}</span>
                          )}
                        </div>
                      ))}
                      {unassigned > 0 && (
                        <div className="flex items-center gap-2 py-1">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                          <span className="text-[13px] text-muted-foreground flex-1">미배정</span>
                          <span className="text-[11px] text-muted-foreground">{unassigned}건</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 긴급/마감 임박 프리뷰 */}
        {!loading && urgentTasks.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-bold">주의 필요</h3>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-0.5 text-[11px] text-muted-foreground"
                  onClick={() => navigate("/tasks")}
                >
                  전체 보기 <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                {urgentTasks.map((task) => {
                  const dot = PRIORITY_DOT[task.priority] ?? "bg-muted-foreground/40";
                  const dueDays = task.dueAt ? daysUntil(task.dueAt) : null;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2.5 py-1.5 cursor-pointer"
                      onClick={() => navigate("/tasks/" + task.id)}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                      <p className="text-[13px] flex-1 truncate font-medium">{task.title}</p>
                      {dueDays !== null && dueDays <= 0 && (
                        <span className="text-[10px] text-destructive font-semibold flex-shrink-0">
                          {dueDays === 0 ? "오늘" : Math.abs(dueDays) + "일 지남"}
                        </span>
                      )}
                      {dueDays !== null && dueDays > 0 && dueDays <= 2 && (
                        <span className="text-[10px] text-orange-500 font-medium flex-shrink-0">
                          D-{dueDays}
                        </span>
                      )}
                      {task.priority === "p1" && dueDays === null && (
                        <span className="text-[10px] text-destructive font-semibold flex-shrink-0">긴급</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
