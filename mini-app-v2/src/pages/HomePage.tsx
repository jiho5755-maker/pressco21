import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { fetchActiveTasks, fetchMe } from "@/lib/api";
import { getTelegramUserName } from "@/lib/telegram";
import { daysUntil, isToday } from "@/lib/format";
import {
  ClipboardList, CalendarDays, Truck, PlusCircle,
  AlertTriangle, CalendarClock, ChevronRight
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
      icon: <PlusCircle className="h-5 w-5" />,
      label: "새 업무",
      path: "/tasks/new",
      desc: "업무 등록",
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

        {/* 상태 요약 바 */}
        {!loading && (
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: "할일", value: tasks.filter((t) => t.status === "todo").length, color: "" },
              { label: "진행", value: tasks.filter((t) => t.status === "in_progress").length, color: "text-primary" },
              { label: "검토", value: stats.review, color: "text-orange-600" },
              { label: "긴급", value: stats.urgent, color: stats.urgent > 0 ? "text-destructive" : "" },
            ].map((item) => (
              <div key={item.label} className="bg-card rounded-xl border border-border/60 p-2.5 text-center">
                <p className={`text-lg font-bold ${item.color || "text-foreground"}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}

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
