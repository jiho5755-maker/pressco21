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
import { fetchDashboard, fetchComments, addComment, updateTask } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { hapticFeedback } from "@/lib/telegram";
import { User, Calendar, FolderOpen, Loader2, ArrowRight } from "lucide-react";
import type { Task, Comment } from "@/lib/types";

const STATUS_FLOW: { from: string; to: string; label: string }[] = [
  { from: "todo", to: "in_progress", label: "시작하기" },
  { from: "in_progress", to: "needs_check", label: "검토 요청" },
  { from: "needs_check", to: "done", label: "완료 처리" },
  { from: "needs_check", to: "todo", label: "수정 필요" },
  { from: "waiting", to: "in_progress", label: "시작하기" },
];

export function TaskDetailPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);

    Promise.all([
      fetchDashboard({ status: "all", limit: 200, selectedTaskId: taskId }),
      fetchComments(taskId).catch(() => []),
    ])
      .then(([dashData, cmts]) => {
        const items = dashData.explorer?.items ?? [];
        const found = items.find((t: Task) => t.id === taskId) ?? dashData.selectedTask ?? null;
        setTask(found);
        setComments(cmts);
      })
      .catch(() => showToast("태스크를 불러올 수 없습니다", "error"))
      .finally(() => setLoading(false));
  }, [taskId, showToast]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
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
  }, [task, showToast]);

  const handleAddComment = useCallback(async (content: string) => {
    if (!taskId) return;
    try {
      const newComment = await addComment(taskId, content);
      setComments((prev) => [...prev, newComment]);
      hapticFeedback("light");
    } catch {
      showToast("코멘트 추가에 실패했습니다", "error");
    }
  }, [taskId, showToast]);

  if (loading) {
    return (
      <div><Header title="업무 상세" showBack />
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div><Header title="업무 상세" showBack />
        <div className="text-center py-20 text-muted-foreground text-sm">태스크를 찾을 수 없습니다</div>
      </div>
    );
  }

  const transitions = STATUS_FLOW.filter((sf) => sf.from === task.status);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="업무 상세" showBack />
      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1 pb-20">
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>
            <h2 className="text-base font-semibold leading-snug mb-3">{task.title}</h2>
            <div className="space-y-2 text-sm">
              {task.assignee && (
                <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /><span>담당: {task.assignee}</span></div>
              )}
              {task.dueAt && (
                <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>마감: {formatDate(task.dueAt)}</span></div>
              )}
              {task.relatedProject && (
                <div className="flex items-center gap-2 text-muted-foreground"><FolderOpen className="h-4 w-4" /><span>프로젝트: {task.relatedProject}</span></div>
              )}
            </div>

            {transitions.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="flex gap-2">
                  {transitions.map((t) => (
                    <Button key={t.to} className="flex-1" variant={t.to === "todo" ? "outline" : "default"}
                      onClick={() => handleStatusChange(t.to)} disabled={updating}>
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                      {t.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-3">코멘트 ({comments.length})</h3>
          <CommentList comments={comments} />
        </div>
      </main>
      <CommentInput onSubmit={handleAddComment} />
    </div>
  );
}
