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
import { Plus, Loader2 } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
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

  // 데이터 로드
  useEffect(() => {
    Promise.all([
      fetchActiveTasks(),
      fetchDoneTasks(),
      fetchMe().catch(() => null),
    ])
      .then(([active, done, me]) => {
        setTasks(active.tasks);
        setDoneTasks(done.tasks);
        if (me) setMyName(me.name);
      })
      .catch(() => showToast("데이터를 불러올 수 없습니다", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  // 요약 통계
  const summary = useMemo(() => {
    const activeTasks = viewMode === "my" && myName
      ? tasks.filter((t) => t.assignee === myName)
      : tasks;

    return {
      todo: activeTasks.filter((t) => t.status === "todo" || t.status === "in_progress").length,
      review: activeTasks.filter((t) => t.status === "review").length,
      today: activeTasks.filter((t) => t.dueAt && isToday(t.dueAt)).length,
      urgent: activeTasks.filter((t) => t.priority === "urgent").length,
    };
  }, [tasks, viewMode, myName]);

  // 태스크 필터링
  const filteredTasks = useMemo(() => {
    let list: Task[];

    if (activeTab === "done") {
      list = doneTasks;
    } else if (activeTab === "review") {
      list = tasks.filter((t) => t.status === "review");
    } else {
      list = tasks.filter(
        (t) => t.status === "todo" || t.status === "in_progress"
      );
    }

    // 내 업무 필터
    if (viewMode === "my" && myName) {
      list = list.filter((t) => t.assignee === myName);
    }

    // 추가 필터
    switch (filter) {
      case "urgent":
        list = list.filter((t) => t.priority === "urgent");
        break;
      case "today":
        list = list.filter((t) => t.dueAt && isToday(t.dueAt));
        break;
      case "review":
        list = list.filter((t) => t.status === "review");
        break;
      case "myRequest":
        if (myName) {
          list = list.filter((t) => t.requestedBy === myName);
        }
        break;
    }

    return list;
  }, [tasks, doneTasks, activeTab, viewMode, filter, myName]);

  // 낙관적 업데이트 (빠른 상태 변경)
  const handleQuickAction = useCallback(
    async (taskId: number, newStatus: TaskStatus) => {
      const prevTasks = [...tasks];
      const prevDone = [...doneTasks];

      // 낙관적 업데이트
      if (newStatus === "done") {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setDoneTasks((prev) => [{ ...task, status: newStatus }, ...prev]);
        }
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }

      try {
        await updateTask(taskId, { status: newStatus });
        showToast("상태가 변경되었습니다", "success");
      } catch {
        // 롤백
        setTasks(prevTasks);
        setDoneTasks(prevDone);
        showToast("상태 변경에 실패했습니다", "error", {
          label: "재시도",
          onClick: () => handleQuickAction(taskId, newStatus),
        });
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
      <Header
        title="업무 보드"
        showBack
        rightAction={
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => navigate("/tasks/new")}
          >
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1">
        {/* 내 업무 / 팀 전체 토글 */}
        <div className="mb-3">
          <ToggleGroup
            value={[viewMode]}
            onValueChange={(values) => {
              const next = values[values.length - 1] as ViewMode | undefined;
              if (next) setViewMode(next);
            }}
            className="h-8"
          >
            <ToggleGroupItem value="team" className="text-xs h-7 px-3">
              팀 전체
            </ToggleGroupItem>
            <ToggleGroupItem value="my" className="text-xs h-7 px-3">
              내 업무
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* 요약 바 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "할일", value: summary.todo },
            { label: "검토", value: summary.review },
            { label: "오늘", value: summary.today },
            { label: "긴급", value: summary.urgent, danger: true },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card rounded-lg border border-border p-2 text-center"
            >
              <p
                className={`text-lg font-bold ${
                  item.danger && item.value > 0
                    ? "text-destructive"
                    : "text-primary"
                }`}
              >
                {item.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="todo" className="flex-1 text-xs">
              할일
            </TabsTrigger>
            <TabsTrigger value="review" className="flex-1 text-xs">
              검토
            </TabsTrigger>
            <TabsTrigger value="done" className="flex-1 text-xs">
              완료
            </TabsTrigger>
          </TabsList>

          {/* 필터 칩 */}
          <ScrollArea className="mb-3">
            <div className="flex gap-1.5 pb-1">
              {filterChips.map((chip) => (
                <Badge
                  key={chip.key}
                  variant={filter === chip.key ? "default" : "outline"}
                  className="cursor-pointer text-xs whitespace-nowrap flex-shrink-0"
                  onClick={() => setFilter(chip.key)}
                >
                  {chip.label}
                  {chip.count !== undefined && chip.count > 0 && (
                    <span className="ml-1">{chip.count}</span>
                  )}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* 컨텐츠 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="todo" className="mt-0 space-y-2">
                {filteredTasks.length === 0 ? (
                  <EmptyState text="처리할 업무가 없습니다" />
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onQuickAction={handleQuickAction}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="review" className="mt-0 space-y-2">
                {filteredTasks.length === 0 ? (
                  <EmptyState text="검토 대기 업무가 없습니다" />
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onQuickAction={handleQuickAction}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="done" className="mt-0 space-y-2">
                {filteredTasks.length === 0 ? (
                  <EmptyState text="완료된 업무가 없습니다" />
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground text-sm">
      {text}
    </div>
  );
}
