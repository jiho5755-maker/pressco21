import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/task/StatusBadge";
import { PriorityBadge } from "@/components/task/PriorityBadge";
import { CommentList } from "@/components/task/CommentList";
import { CommentInput } from "@/components/task/CommentInput";
import { useToast } from "@/components/layout/Toast";
import {
  fetchActiveTasks,
  fetchDoneTasks,
  fetchComments,
  addComment,
  updateTask,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { hapticFeedback } from "@/lib/telegram";
import {
  User,
  Calendar,
  FolderOpen,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { Task, Comment, TaskStatus } from "@/lib/types";

/** 상태 전환 플로우 */
const STATUS_FLOW: { from: TaskStatus; to: TaskStatus; label: string }[] = [
  { from: "todo", to: "in_progress", label: "시작하기" },
  { from: "in_progress", to: "review", label: "검토 요청" },
  { from: "review", to: "done", label: "완료 처리" },
];

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const taskId = Number(id);

  // 태스크 로드
  useEffect(() => {
    if (!taskId) return;

    setLoading(true);

    Promise.all([
      fetchActiveTasks(),
      fetchDoneTasks(),
      fetchComments(taskId).catch(() => []),
    ])
      .then(([active, done, cmts]) => {
        const found =
          active.tasks.find((t) => t.id === taskId) ??
          done.tasks.find((t) => t.id === taskId);
        setTask(found ?? null);
        setComments(cmts);
      })
      .catch(() => showToast("태스크를 불러올 수 없습니다", "error"))
      .finally(() => setLoading(false));
  }, [taskId, showToast]);

  // 상태 변경
  const handleStatusChange = useCallback(
    async (newStatus: TaskStatus) => {
      if (!task) return;
      setUpdating(true);
      hapticFeedback("medium");

      const prevStatus = task.status;
      setTask((prev) => (prev ? { ...prev, status: newStatus } : prev));

      try {
        await updateTask(task.id, { status: newStatus });
        showToast("상태가 변경되었습니다", "success");
      } catch {
        setTask((prev) => (prev ? { ...prev, status: prevStatus } : prev));
        showToast("상태 변경에 실패했습니다", "error");
      } finally {
        setUpdating(false);
      }
    },
    [task, showToast]
  );

  // 코멘트 추가
  const handleAddComment = useCallback(
    async (content: string) => {
      if (!taskId) return;
      try {
        const newComment = await addComment(taskId, content);
        setComments((prev) => [...prev, newComment]);
        hapticFeedback("light");
      } catch {
        showToast("코멘트 추가에 실패했습니다", "error");
        throw new Error("코멘트 추가 실패");
      }
    },
    [taskId, showToast]
  );

  if (loading) {
    return (
      <div>
        <Header title="업무 상세" showBack />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div>
        <Header title="업무 상세" showBack />
        <div className="text-center py-20 text-muted-foreground text-sm">
          태스크를 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const transition = STATUS_FLOW.find((sf) => sf.from === task.status);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="업무 상세" showBack />

      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1 pb-20">
        {/* 태스크 정보 카드 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            {/* 상태/우선순위 뱃지 */}
            <div className="flex items-center gap-1.5 mb-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>

            {/* 제목 */}
            <h2 className="text-base font-semibold leading-snug mb-3">
              {task.title}
            </h2>

            {/* 메타 정보 */}
            <div className="space-y-2 text-sm">
              {task.assignee && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>담당: {task.assignee}</span>
                </div>
              )}
              {task.dueAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>마감: {formatDate(task.dueAt)}</span>
                </div>
              )}
              {task.relatedProject && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <span>프로젝트: {task.relatedProject}</span>
                </div>
              )}
            </div>

            {/* 상태 변경 버튼 */}
            {transition && (
              <>
                <Separator className="my-3" />
                <Button
                  className="w-full"
                  onClick={() => handleStatusChange(transition.to)}
                  disabled={updating}
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {transition.label}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* 코멘트 영역 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-3">
            코멘트 ({comments.length})
          </h3>
          <CommentList comments={comments} />
        </div>
      </main>

      {/* 코멘트 입력 (sticky) */}
      <CommentInput onSubmit={handleAddComment} />
    </div>
  );
}
