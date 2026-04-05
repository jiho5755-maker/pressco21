import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/layout/Toast";
import { fetchActiveTasks, fetchDoneTasks, updateTask } from "@/lib/api";
import { hapticFeedback } from "@/lib/telegram";
import { Check, Loader2, Package, Undo2 } from "lucide-react";
import type { Task } from "@/lib/types";

/** 출고 태스크 판별 */
function isShipmentTask(task: Task): boolean {
  return (
    task.category === "shipment" ||
    (task.title != null && task.title.includes("[출고]"))
  );
}

export function ShipmentPage() {
  const { showToast } = useToast();
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchActiveTasks(), fetchDoneTasks()])
      .then(([active, done]) => {
        setActiveTasks(active.tasks.filter(isShipmentTask));
        setDoneTasks(done.tasks.filter(isShipmentTask));
      })
      .catch(() => showToast("데이터를 불러올 수 없습니다", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const stats = useMemo(() => {
    const remaining = activeTasks.length;
    const completed = doneTasks.length;
    const total = remaining + completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { remaining, completed, total, progress };
  }, [activeTasks, doneTasks]);

  // 완료 토글
  const handleComplete = useCallback(
    async (taskId: number) => {
      const prevActive = [...activeTasks];
      const prevDone = [...doneTasks];

      const task = activeTasks.find((t) => t.id === taskId);
      if (!task) return;

      hapticFeedback("medium");

      // 낙관적 업데이트
      setActiveTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDoneTasks((prev) => [{ ...task, status: "done" as const }, ...prev]);

      try {
        await updateTask(taskId, { status: "done" });
        showToast("출고 완료 처리되었습니다", "success", {
          label: "되돌리기",
          onClick: async () => {
            try {
              await updateTask(taskId, { status: "todo" });
              setDoneTasks((prev) => prev.filter((t) => t.id !== taskId));
              setActiveTasks((prev) => [{ ...task, status: "todo" as const }, ...prev]);
            } catch {
              showToast("되돌리기에 실패했습니다", "error");
            }
          },
        });
      } catch {
        setActiveTasks(prevActive);
        setDoneTasks(prevDone);
        showToast("완료 처리에 실패했습니다", "error");
      }
    },
    [activeTasks, doneTasks, showToast]
  );

  // 되돌리기
  const handleUndo = useCallback(
    async (taskId: number) => {
      const task = doneTasks.find((t) => t.id === taskId);
      if (!task) return;

      hapticFeedback("light");

      setDoneTasks((prev) => prev.filter((t) => t.id !== taskId));
      setActiveTasks((prev) => [...prev, { ...task, status: "todo" as const }]);

      try {
        await updateTask(taskId, { status: "todo" });
        showToast("되돌리기 완료", "info");
      } catch {
        setDoneTasks((prev) => [task, ...prev]);
        setActiveTasks((prev) => prev.filter((t) => t.id !== taskId));
        showToast("되돌리기에 실패했습니다", "error");
      }
    },
    [doneTasks, showToast]
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="출고 관리" subtitle="출고 태스크 현황" showBack />

      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* 통계 카드 */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">출고 현황</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {stats.completed}/{stats.total}건 완료
                  </span>
                </div>

                {/* 진행률 바 */}
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: stats.progress + "%" }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <p className="text-lg font-bold text-primary">
                      {stats.remaining}
                    </p>
                    <p className="text-[10px] text-muted-foreground">남은 건</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-brand-light">
                      {stats.completed}
                    </p>
                    <p className="text-[10px] text-muted-foreground">완료</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.total}</p>
                    <p className="text-[10px] text-muted-foreground">전체</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 미완료 리스트 */}
            {activeTasks.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">
                  처리 대기 ({activeTasks.length})
                </h3>
                <div className="space-y-2">
                  {activeTasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 flex-shrink-0 rounded-full border-primary/30"
                          onClick={() => handleComplete(task.id)}
                        >
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          {task.assignee && (
                            <p className="text-xs text-muted-foreground">
                              {task.assignee}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {task.priority === "urgent" ? "긴급" : "대기"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 완료 리스트 */}
            {doneTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                  완료 ({doneTasks.length})
                </h3>
                <div className="space-y-2">
                  {doneTasks.map((task) => (
                    <Card key={task.id} className="opacity-60">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-brand-light/30 flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                        <p className="flex-1 text-sm line-through text-muted-foreground truncate">
                          {task.title}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => handleUndo(task.id)}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 빈 상태 */}
            {activeTasks.length === 0 && doneTasks.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                출고 태스크가 없습니다
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
