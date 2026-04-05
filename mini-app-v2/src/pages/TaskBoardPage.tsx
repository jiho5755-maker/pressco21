import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { TaskCard } from "@/components/task/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/components/layout/Toast";
import { fetchActiveTasks, fetchDoneTasks, updateTask, fetchMe, fetchStaff } from "@/lib/api";
import { getStoredMyName, setStoredMyName } from "@/lib/userPrefs";
import { Plus, Loader2, Inbox, Check } from "lucide-react";
import type { Task, StaffMember } from "@/lib/types";
import { isToday } from "@/lib/format";

type FilterType = "all" | "urgent" | "today" | "review" | "myRequest";
type ViewMode = "my" | "team";

const FALLBACK_STAFF: StaffMember[] = [
  { id: "staff-jiho", name: "장지호", role: "admin" },
  { id: "staff-jaehyuk", name: "이재혁", role: "staff" },
  { id: "staff-seunghae", name: "조승해", role: "staff" },
  { id: "staff-wj", name: "원장님", role: "admin" },
  { id: "staff-dagyeong", name: "장다경", role: "staff" },
];

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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showNamePicker, setShowNamePicker] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchActiveTasks(),
      fetchDoneTasks(),
      fetchMe().catch(() => null),
      fetchStaff().catch(() => FALLBACK_STAFF),
    ])
      .then(([active, done, me, staffList]) => {
        setTasks(active.explorer?.items ?? []);
        setDoneTasks(done.explorer?.items ?? []);
        setStaff(staffList.length > 0 ? staffList : FALLBACK_STAFF);

        // 이름 결정: Telegram → localStorage → null
        if (me) {
          setMyName(me.name);
          setStoredMyName(me.name);
        } else {
          const stored = getStoredMyName();
          if (stored) setMyName(stored);
        }
      })
      .catch(() => showToast("데이터를 불러올 수 없습니다", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  // 뷰 모드 변경 핸들러
  function handleViewModeChange(newMode: ViewMode) {
    if (newMode === "my" && !myName) {
      // 이름이 없으면 선택 UI 표시
      setShowNamePicker(true);
      return;
    }
    setViewMode(newMode);
  }

  function handleSelectName(name: string) {
    setMyName(name);
    setStoredMyName(name);
    setShowNamePicker(false);
    setViewMode("my");
  }

  const summary = useMemo(() => {
    const src = viewMode === "my" && myName ? tasks.filter((t) => t.assignee?.includes(myName)) : tasks;
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
      list = list.filter((t) => t.assignee?.includes(myName));
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
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-muted/50 rounded-xl p-0.5 flex">
            <button
              type="button"
              className={`flex-1 text-xs h-8 rounded-lg font-medium transition-all ${
                viewMode === "team" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => handleViewModeChange("team")}
            >
              팀 전체
            </button>
            <button
              type="button"
              className={`flex-1 text-xs h-8 rounded-lg font-medium transition-all ${
                viewMode === "my" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => handleViewModeChange("my")}
            >
              내 업무
            </button>
          </div>

          {/* 현재 선택된 이름 표시 */}
          {viewMode === "my" && myName && (
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
              onClick={() => setShowNamePicker(true)}
            >
              <Avatar className="h-4 w-4">
                <AvatarFallback className={`text-[8px] font-bold ${getAvatarColor(myName)}`}>
                  {myName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {myName}
            </button>
          )}
        </div>

        {/* 이름 선택 UI */}
        {showNamePicker && (
          <div className="mb-4 p-3 bg-card rounded-xl border border-primary/30 shadow-sm">
            <p className="text-xs text-muted-foreground mb-2.5 font-medium">누구의 업무를 볼까요?</p>
            <div className="flex flex-wrap gap-2">
              {staff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelectName(member.name)}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium
                    transition-all duration-150 border
                    ${myName === member.name
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/30 border-border/60 text-foreground hover:border-primary/30"
                    }
                  `}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className={`text-[9px] font-bold ${getAvatarColor(member.name)}`}>
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {member.name}
                  {myName === member.name && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
        )}

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
