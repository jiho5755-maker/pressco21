import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { TaskCard } from "@/components/task/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/components/layout/Toast";
import { fetchActiveTasks, fetchDoneTasks, updateTask, fetchMe } from "@/lib/api";
import { Plus, Loader2, Inbox } from "lucide-react";
import type { Task } from "@/lib/types";
import { isToday } from "@/lib/format";

type FilterType = "all" | "urgent" | "today" | "review" | "myRequest";
type ViewMode = "my" | "team";

export function TaskBoardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("team");
  const [filter, setFilter] = useState<FilterType>("all");
  const [activeTab, setActiveTab] = useState("todo");
  const [myName, setMyName] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchActiveTasks(), fetchDoneTasks(), fetchMe().catch(() => null)])
      .then(([active, done, me]) => {
        setTasks(active.explorer?.items ?? []);
        setDoneTasks(done.explorer?.items ?? []);
        if (me) setMyName(me.name);
      })
      .catch(() => showToast("데이터를 불러올 수 없습니다", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const summary = useMemo(() => {
    const src = viewMode === "my" && myName ? tasks.filter((t) => t.assignee === myName) : tasks;
    return {
      todo: src.filter((t) => t.status === "todo" || t.status === "in_progress").length,
      review: src.filter((t) => t.status === "needs_check").length,
      today: src.filter((t) => t.dueAt && isToday(t.dueAt)).length,
      urgent: src.filter((t) => t.priority === "p1").length,
    };
  }, [tasks, viewMode, myName]);

  const filteredTasks = useMemo(() => {
    let list: Task[];
    if (activeTab === "done") {
      list = doneTasks;
    } else if (activeTab === "review") {
      list = tasks.filter((t) => t.status === "needs_check");
    } else {
      list = tasks.filter((t) => t.status === "todo" || t.status === "in_progress" || t.status === "waiting");
    }

    if (viewMode === "my" && myName) {
      list = list.filter((t) => t.assignee === myName);
    }

    switch (filter) {
      case "urgent": list = list.filter((t) => t.priority === "p1"); break;
      case "today": list = list.filter((t) => t.dueAt && isToday(t.dueAt)); break;
      case "review": list = list.filter((t) => t.status === "needs_check"); break;
      case "myRequest":
        if (myName) list = list.filter((t) => {
          const d = t.detailsJson as Record<string, unknown>;
          return d?.createdBy === myName;
        });
        break;
    }
    return list;
  }, [tasks, doneTasks, activeTab, viewMode, filter, myName]);

  const handleQuickAction = useCallback(
    async (taskId: string, newStatus: string) => {
      const prevTasks = [...tasks];
      const prevDone = [...doneTasks];

      if (newStatus === "done") {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setDoneTasks((prev) => [{ ...task, status: newStatus }, ...prev]);
        }
      } else {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      }

      try {
        await updateTask(taskId, { status: newStatus });
        showToast("상태가 변경되었습니다", "success");
      } catch {
        setTasks(prevTasks);
        setDoneTasks(prevDone);
        showToast("상태 변경에 실패했습니다", "error");
      }
    },
    [tasks, doneTasks, showToast]
  );

  const filterChips: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "전체" },
    { key: "urgent", label: "긴급", count: summary.urgent },
    { key: "today", label: "오늘", count: summary.today },
    { key: "review", label: "검토대기", count: summary.review },
    { key: "myRequest", label: "내가요청" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="업무 보드" showBack rightAction={
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate("/tasks/new")}>
          <Plus className="h-5 w-5" />
        </Button>
      } />

      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1">
        {/* 뷰 모드 토글 */}
        <div className="mb-3">
          <ToggleGroup value={[viewMode]} onValueChange={(values) => {
            const next = values[values.length - 1] as ViewMode | undefined;
            if (next) setViewMode(next);
          }} className="h-8 bg-muted/50 rounded-lg p-0.5">
            <ToggleGroupItem value="team" className="text-xs h-7 px-3 rounded-md data-[state=on]:bg-card data-[state=on]:shadow-sm">
              팀 전체
            </ToggleGroupItem>
            <ToggleGroupItem value="my" className="text-xs h-7 px-3 rounded-md data-[state=on]:bg-card data-[state=on]:shadow-sm">
              내 업무
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "할일", value: summary.todo, color: "" },
            { label: "검토", value: summary.review, color: "text-orange-600" },
            { label: "오늘", value: summary.today, color: summary.today > 0 ? "text-primary" : "" },
            { label: "긴급", value: summary.urgent, color: summary.urgent > 0 ? "text-destructive" : "" },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl border border-border/60 p-2.5 text-center">
              <p className={`text-lg font-bold ${item.color || "text-foreground"}`}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-3 h-9 bg-muted/50 p-0.5">
            <TabsTrigger value="todo" className="flex-1 text-xs h-8 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
              할일
            </TabsTrigger>
            <TabsTrigger value="review" className="flex-1 text-xs h-8 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
              검토
            </TabsTrigger>
            <TabsTrigger value="done" className="flex-1 text-xs h-8 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
              완료
            </TabsTrigger>
          </TabsList>

          {/* 필터 칩 */}
          <ScrollArea className="mb-3">
            <div className="flex gap-1.5 pb-1">
              {filterChips.map((chip) => (
                <Badge key={chip.key} variant={filter === chip.key ? "default" : "outline"}
                  className="cursor-pointer text-[11px] whitespace-nowrap flex-shrink-0 rounded-full px-2.5 py-0.5"
                  onClick={() => setFilter(chip.key)}>
                  {chip.label}{chip.count !== undefined && chip.count > 0 && (
                    <span className="ml-1 opacity-80">{chip.count}</span>
                  )}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            ["todo", "review", "done"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0 space-y-2">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                    <Inbox className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">
                      {tab === "done" ? "완료된 업무가 없습니다" : "해당 업무가 없습니다"}
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onQuickAction={tab !== "done" ? handleQuickAction : undefined} />
                  ))
                )}
              </TabsContent>
            ))
          )}
        </Tabs>
      </main>
    </div>
  );
}
