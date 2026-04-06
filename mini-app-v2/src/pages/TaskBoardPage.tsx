import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { TaskCard } from "@/components/task/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/components/layout/Toast";
import { fetchActiveTasks, fetchDoneTasks, updateTask, fetchMe, fetchStaff } from "@/lib/api";
import { getStoredMyName, setStoredMyName } from "@/lib/userPrefs";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Plus, Loader2, Inbox, Check, Search, X, ArrowUpDown, RefreshCw } from "lucide-react";
import type { Task, StaffMember } from "@/lib/types";
import { isToday, daysUntil } from "@/lib/format";

type FilterType = "all" | "urgent" | "today" | "review" | "myRequest";
type ViewMode = "my" | "team";
type SortType = "priority" | "dueAt" | "createdAt" | "title";

const FALLBACK_STAFF: StaffMember[] = [
  { id: "staff-jiho", name: "장지호", role: "admin" },
  { id: "staff-jaehyuk", name: "이재혁", role: "staff" },
  { id: "staff-seunghae", name: "조승해", role: "staff" },
  { id: "staff-wj", name: "원장님", role: "admin" },
  { id: "staff-dagyeong", name: "장다경", role: "staff" },
];

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: "priority", label: "우선순위순" },
  { key: "dueAt", label: "마감순" },
  { key: "createdAt", label: "최신순" },
  { key: "title", label: "이름순" },
];

function getAvatarColor(name: string): string {
  const colors = ["bg-primary/20 text-primary", "bg-warm/20 text-[#8b6914]", "bg-brand-light/30 text-[#3d5435]", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function sortTasks(list: Task[], sort: SortType): Task[] {
  const sorted = [...list];
  const priorityOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };

  switch (sort) {
    case "priority":
      sorted.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
      break;
    case "dueAt":
      sorted.sort((a, b) => {
        if (!a.dueAt && !b.dueAt) return 0;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      });
      break;
    case "createdAt":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title, "ko"));
      break;
  }
  return sorted;
}

export function TaskBoardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("team");

  // 홈에서 필터 힌트를 받으면 적용
  const initialFilter = (location.state as { filter?: FilterType } | null)?.filter ?? "all";
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [activeTab, setActiveTab] = useState("todo");
  const [myName, setMyName] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showNamePicker, setShowNamePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("priority");
  const [showSort, setShowSort] = useState(false);

  const loadData = useCallback(async () => {
    const [active, done, me, staffList] = await Promise.all([
      fetchActiveTasks(),
      fetchDoneTasks(),
      fetchMe().catch(() => null),
      fetchStaff().catch(() => FALLBACK_STAFF),
    ]);
    setTasks(active.explorer?.items ?? []);
    setDoneTasks(done.explorer?.items ?? []);
    setStaff(staffList.length > 0 ? staffList : FALLBACK_STAFF);
    if (me) { setMyName(me.name); setStoredMyName(me.name); }
    else { const stored = getStoredMyName(); if (stored) setMyName(stored); }
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => showToast("데이터를 불러올 수 없습니다", "error"))
      .finally(() => setLoading(false));
  }, [loadData, showToast]);

  // 풀투리프레시
  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await loadData();
      showToast("새로고침 완료", "info");
    },
  });

  function handleViewModeChange(newMode: ViewMode) {
    if (newMode === "my" && !myName) { setShowNamePicker(true); return; }
    setViewMode(newMode);
  }

  function handleSelectName(name: string) {
    setMyName(name); setStoredMyName(name); setShowNamePicker(false); setViewMode("my");
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
    if (activeTab === "done") list = doneTasks;
    else if (activeTab === "review") list = tasks.filter((t) => t.status === "needs_check");
    else list = tasks.filter((t) => t.status === "todo" || t.status === "in_progress" || t.status === "waiting");

    if (viewMode === "my" && myName) list = list.filter((t) => t.assignee?.includes(myName));

    switch (filter) {
      case "urgent": list = list.filter((t) => t.priority === "p1"); break;
      case "today": list = list.filter((t) => t.dueAt && isToday(t.dueAt)); break;
      case "review": list = list.filter((t) => t.status === "needs_check"); break;
      case "myRequest":
        if (myName) list = list.filter((t) => { const d = t.detailsJson as Record<string, unknown>; return d?.createdBy === myName; });
        break;
    }

    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.assignee && t.assignee.toLowerCase().includes(q)) ||
        (t.relatedProject && t.relatedProject.toLowerCase().includes(q))
      );
    }

    // 정렬
    return sortTasks(list, sortBy);
  }, [tasks, doneTasks, activeTab, viewMode, filter, myName, searchQuery, sortBy]);

  const handleQuickAction = useCallback(
    async (taskId: string, newStatus: string) => {
      const prevTasks = [...tasks]; const prevDone = [...doneTasks];
      if (newStatus === "done") {
        const task = tasks.find((t) => t.id === taskId);
        if (task) { setTasks((p) => p.filter((t) => t.id !== taskId)); setDoneTasks((p) => [{ ...task, status: newStatus }, ...p]); }
      } else {
        setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      }
      try { await updateTask(taskId, { status: newStatus }); showToast("상태가 변경되었습니다", "success"); }
      catch { setTasks(prevTasks); setDoneTasks(prevDone); showToast("상태 변경에 실패했습니다", "error"); }
    }, [tasks, doneTasks, showToast]
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
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate("/tasks/new")}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      } />

      {/* 풀투리프레시 인디케이터 */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex justify-center py-2" style={{ height: pullDistance > 0 ? pullDistance : undefined }}>
          <RefreshCw className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`} />
        </div>
      )}

      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1">
        {/* 검색 바 */}
        {showSearch && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="업무, 담당자, 프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-sm"
                autoFocus
              />
            </div>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 뷰 모드 + 정렬 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-muted/50 rounded-xl p-0.5 flex">
            <button type="button" className={`flex-1 text-xs h-8 rounded-lg font-medium transition-all ${viewMode === "team" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => handleViewModeChange("team")}>팀 전체</button>
            <button type="button" className={`flex-1 text-xs h-8 rounded-lg font-medium transition-all ${viewMode === "my" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => handleViewModeChange("my")}>내 업무</button>
          </div>

          {viewMode === "my" && myName && (
            <button type="button" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
              onClick={() => setShowNamePicker(true)}>
              <Avatar className="h-4 w-4"><AvatarFallback className={`text-[8px] font-bold ${getAvatarColor(myName)}`}>{myName.charAt(0)}</AvatarFallback></Avatar>
              {myName}
            </button>
          )}

          <button type="button" className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/50"
            onClick={() => setShowSort(!showSort)}>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 정렬 옵션 */}
        {showSort && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SORT_OPTIONS.map((opt) => (
              <Badge key={opt.key} variant={sortBy === opt.key ? "default" : "outline"}
                className="cursor-pointer text-[11px] rounded-full px-2.5 py-0.5"
                onClick={() => { setSortBy(opt.key); setShowSort(false); }}>
                {opt.label}
              </Badge>
            ))}
          </div>
        )}

        {/* 이름 선택 UI */}
        {showNamePicker && (
          <div className="mb-4 p-3 bg-card rounded-xl border border-primary/30 shadow-sm">
            <p className="text-xs text-muted-foreground mb-2.5 font-medium">누구의 업무를 볼까요?</p>
            <div className="flex flex-wrap gap-2">
              {staff.map((member) => (
                <button key={member.id} type="button" onClick={() => handleSelectName(member.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all border ${myName === member.name ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/30 border-border/60 text-foreground hover:border-primary/30"}`}>
                  <Avatar className="h-5 w-5"><AvatarFallback className={`text-[9px] font-bold ${getAvatarColor(member.name)}`}>{member.name.charAt(0)}</AvatarFallback></Avatar>
                  {member.name}
                  {myName === member.name && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 통계 (클릭 → 해당 조건 필터) */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {([
            { label: "할일", value: summary.todo, color: "", filterKey: "all" as FilterType },
            { label: "검토", value: summary.review, color: "text-orange-600", filterKey: "review" as FilterType },
            { label: "오늘", value: summary.today, color: summary.today > 0 ? "text-primary" : "", filterKey: "today" as FilterType },
            { label: "긴급", value: summary.urgent, color: summary.urgent > 0 ? "text-destructive" : "", filterKey: "urgent" as FilterType },
          ]).map((item) => (
            <button
              key={item.label}
              type="button"
              className={`bg-card rounded-xl border p-2.5 text-center cursor-pointer active:scale-95 transition-all ${filter === item.filterKey && filter !== "all" ? "border-primary/50 bg-primary/5" : "border-border/60"}`}
              onClick={() => setFilter(filter === item.filterKey ? "all" : item.filterKey)}
            >
              <p className={`text-lg font-bold ${filter === item.filterKey && filter !== "all" ? "text-primary" : item.color || "text-foreground"}`}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
            </button>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-3 h-9 bg-muted/50 p-0.5">
            <TabsTrigger value="todo" className="flex-1 text-xs h-8 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">할일</TabsTrigger>
            <TabsTrigger value="review" className="flex-1 text-xs h-8 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">검토</TabsTrigger>
            <TabsTrigger value="done" className="flex-1 text-xs h-8 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">완료</TabsTrigger>
          </TabsList>

          <ScrollArea className="mb-3">
            <div className="flex gap-1.5 pb-1">
              {filterChips.map((chip) => (
                <Badge key={chip.key} variant={filter === chip.key ? "default" : "outline"}
                  className="cursor-pointer text-[11px] whitespace-nowrap flex-shrink-0 rounded-full px-2.5 py-0.5"
                  onClick={() => setFilter(chip.key)}>
                  {chip.label}{chip.count !== undefined && chip.count > 0 && <span className="ml-1 opacity-80">{chip.count}</span>}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            ["todo", "review", "done"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0 space-y-2">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                    <Inbox className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">{searchQuery ? "검색 결과가 없습니다" : tab === "done" ? "완료된 업무가 없습니다" : "해당 업무가 없습니다"}</p>
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
