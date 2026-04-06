import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/task/StatusBadge";
import { PriorityBadge } from "@/components/task/PriorityBadge";
import { CommentList } from "@/components/task/CommentList";
import { CommentInput } from "@/components/task/CommentInput";
import { useToast } from "@/components/layout/Toast";
import { fetchDashboard, fetchComments, addComment, updateTask } from "@/lib/api";
import { formatDate, daysUntil, daysSince } from "@/lib/format";
import { hapticFeedback } from "@/lib/telegram";
import { Input } from "@/components/ui/input";
import { ChecklistDescription } from "@/components/task/ChecklistDescription";
import { FileAttachments } from "@/components/task/FileAttachments";
import { User, Calendar, FolderOpen, Loader2, ArrowRight, Inbox, Link2, Plus, X, CalendarRange, FileText, Clock } from "lucide-react";
import type { Task, Comment } from "@/lib/types";

const STATUS_FLOW: { from: string; to: string; label: string; variant: "default" | "outline" }[] = [
  { from: "todo", to: "in_progress", label: "시작하기", variant: "default" },
  { from: "in_progress", to: "needs_check", label: "검토 요청", variant: "default" },
  { from: "needs_check", to: "done", label: "완료 처리", variant: "default" },
  { from: "needs_check", to: "todo", label: "수정 필요", variant: "outline" },
  { from: "waiting", to: "in_progress", label: "시작하기", variant: "default" },
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

export function TaskDetailPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

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
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/60">
          <Inbox className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">태스크를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  const transitions = STATUS_FLOW.filter((sf) => sf.from === task.status);
  const dueDays = task.dueAt ? daysUntil(task.dueAt) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="업무 상세" showBack />
      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1 pb-20">
        {/* 태스크 정보 카드 */}
        <Card className="mb-4 border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {dueDays !== null && dueDays <= 0 && (
                <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
                  {dueDays === 0 ? "오늘 마감" : Math.abs(dueDays) + "일 지남"}
                </span>
              )}
            </div>

            <h2 className="text-base font-bold leading-snug mb-3">{task.title}</h2>

            <div className="space-y-2.5">
              {task.assignee && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className={`text-[9px] font-bold ${getAvatarColor(task.assignee)}`}>
                      {task.assignee.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>담당: <span className="text-foreground font-medium">{task.assignee}</span></span>
                </div>
              )}
              {!task.assignee && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-muted-foreground/60">담당자 미배정</span>
                </div>
              )}
              {task.dueAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>마감: <span className={`font-medium ${
                    dueDays !== null && dueDays < 0 ? "text-destructive" :
                    dueDays === 0 ? "text-orange-600" : "text-foreground"
                  }`}>{formatDate(task.dueAt)}</span></span>
                </div>
              )}
              {task.relatedProject && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <span>프로젝트: <span className="text-foreground font-medium">{task.relatedProject}</span></span>
                </div>
              )}
            </div>

            {/* N일째 진행중 */}
            {task.status === "in_progress" && task.createdAt && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-primary">{daysSince(task.createdAt)}일째</span> 진행중
                </span>
              </div>
            )}

            {/* 설명 (체크리스트 지원) */}
            {!!(task.detailsJson as Record<string, unknown>)?.description && (
              <div className="mt-3 p-2.5 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground">설명</span>
                </div>
                <ChecklistDescription
                  description={String((task.detailsJson as Record<string, unknown>).description)}
                  onUpdate={(newDesc) => {
                    updateTask(task.id, { description: newDesc }).then(() => {
                      setTask((p) => p ? { ...p, detailsJson: { ...p.detailsJson, description: newDesc } } : p);
                    });
                  }}
                />
              </div>
            )}

            {/* 시작일 */}
            {!!(task.detailsJson as Record<string, unknown>)?.startAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <CalendarRange className="h-4 w-4" />
                <span>시작: <span className="text-foreground font-medium">{formatDate(String((task.detailsJson as Record<string, unknown>).startAt))}</span></span>
              </div>
            )}

            {/* 링크/첨부 */}
            {(() => {
              const details = task.detailsJson as Record<string, unknown>;
              const links = (details?.links ?? []) as string[];
              return (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground">링크/첨부</span>
                    </div>
                    <button type="button" className="text-[11px] text-primary font-medium flex items-center gap-0.5"
                      onClick={() => setShowLinkInput(!showLinkInput)}>
                      <Plus className="h-3 w-3" />추가
                    </button>
                  </div>

                  {showLinkInput && (
                    <div className="flex gap-1.5 mb-2">
                      <Input placeholder="URL 입력" value={newLink} onChange={(e) => setNewLink(e.target.value)}
                        className="h-8 text-xs flex-1" autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newLink.trim()) {
                            const updated = [...links, newLink.trim()];
                            updateTask(task.id, { links: updated }).then(() => {
                              setTask((p) => p ? { ...p, detailsJson: { ...p.detailsJson, links: updated } } : p);
                              setNewLink(""); setShowLinkInput(false);
                            });
                          }
                        }} />
                      <button type="button" className="text-muted-foreground p-1" onClick={() => { setShowLinkInput(false); setNewLink(""); }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {links.length > 0 ? (
                    <div className="space-y-1">
                      {links.map((link, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate flex-1"
                            onClick={(e) => e.stopPropagation()}>{link}</a>
                          <button type="button" className="text-muted-foreground/40 hover:text-destructive p-0.5"
                            onClick={() => {
                              const updated = links.filter((_, idx) => idx !== i);
                              updateTask(task.id, { links: updated }).then(() => {
                                setTask((p) => p ? { ...p, detailsJson: { ...p.detailsJson, links: updated } } : p);
                              });
                            }}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : !showLinkInput ? (
                    <p className="text-[11px] text-muted-foreground/50">첨부된 링크가 없습니다</p>
                  ) : null}
                </div>
              );
            })()}

            {/* 파일 첨부 */}
            <FileAttachments
              task={task}
              onTaskUpdate={(updated) => setTask(updated)}
            />

            {/* 상태 전환 ���튼 */}
            {transitions.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="flex gap-2">
                  {transitions.map((t) => (
                    <Button
                      key={t.to}
                      className="flex-1 h-10 rounded-xl text-xs font-semibold"
                      variant={t.variant}
                      onClick={() => handleStatusChange(t.to)}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ArrowRight className="h-4 w-4 mr-1.5" />}
                      {t.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 코멘트 섹션 */}
        <div className="mb-4">
          <h3 className="text-sm font-bold mb-3">코멘트 ({comments.length})</h3>
          <CommentList comments={comments} />
        </div>
      </main>
      <CommentInput onSubmit={handleAddComment} />
    </div>
  );
}
