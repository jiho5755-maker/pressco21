import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  OMX_CAPABILITIES,
  OMX_QUEUE_ITEMS,
  OMX_RUNBOOK,
  INGEST_MODE_LABEL,
  ITEM_TYPE_LABEL,
  QUEUE_STATUS_LABEL,
  SEND_MODE_LABEL,
  URGENCY_LABEL,
  VALIDATION_LABEL,
  type OmxQueueItem,
  type OmxQueueStatus,
  type OmxSendMode,
} from "@/lib/omx";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  FlaskConical,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

type QueueFilter = "all" | "approval" | "direct" | "review" | "blocked";

const SEND_MODE_TONE: Record<OmxSendMode, string> = {
  direct_send: "bg-emerald-100 text-emerald-700 border-emerald-200",
  manual_send: "bg-amber-100 text-amber-700 border-amber-200",
  draft_only: "bg-slate-100 text-slate-700 border-slate-200",
  disabled: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_TONE: Record<OmxQueueStatus, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  draft_ready: "bg-blue-100 text-blue-700 border-blue-200",
  editing: "bg-violet-100 text-violet-700 border-violet-200",
  approval_pending: "bg-amber-100 text-amber-700 border-amber-200",
  sent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  manual_required: "bg-rose-100 text-rose-700 border-rose-200",
};

const VALIDATION_TONE: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  doc_only: "bg-blue-100 text-blue-700 border-blue-200",
  template_verified: "bg-violet-100 text-violet-700 border-violet-200",
  blocked: "bg-rose-100 text-rose-700 border-rose-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
};

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "approval", label: "승인대기" },
  { key: "direct", label: "직접발송" },
  { key: "review", label: "리뷰" },
  { key: "blocked", label: "보류" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OmxPage() {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [selectedId, setSelectedId] = useState(OMX_QUEUE_ITEMS[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(OMX_QUEUE_ITEMS.map((item) => [item.id, item.finalReply ?? item.aiDraft])),
  );
  const [statuses, setStatuses] = useState<Record<string, OmxQueueStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(OMX_QUEUE_ITEMS.map((item) => [item.id, item.internalNote ?? ""])),
  );

  const runtimeQueue = useMemo(
    () =>
      OMX_QUEUE_ITEMS.map((item) => ({
        ...item,
        status: statuses[item.id] ?? item.status,
        finalReply: drafts[item.id] ?? item.finalReply ?? item.aiDraft,
        internalNote: notes[item.id] ?? item.internalNote,
      })),
    [drafts, notes, statuses],
  );

  const filteredQueue = useMemo(() => {
    return runtimeQueue.filter((item) => {
      switch (queueFilter) {
        case "approval":
          return item.status === "approval_pending";
        case "direct":
          return item.sendMode === "direct_send";
        case "review":
          return item.itemType === "review";
        case "blocked":
          return item.validationStatus === "blocked" || item.sendMode === "disabled";
        default:
          return true;
      }
    });
  }, [queueFilter, runtimeQueue]);

  const selectedItem =
    filteredQueue.find((item) => item.id === selectedId) ??
    runtimeQueue.find((item) => item.id === selectedId) ??
    filteredQueue[0] ??
    runtimeQueue[0];

  const counts = useMemo(() => {
    const approval = runtimeQueue.filter((item) => item.status === "approval_pending").length;
    const direct = OMX_CAPABILITIES.filter((item) => item.sendMode === "direct_send").length;
    const blocked = OMX_CAPABILITIES.filter((item) => item.validationStatus === "blocked").length;
    return { approval, direct, blocked };
  }, [runtimeQueue]);

  function updateStatus(id: string, next: OmxQueueStatus) {
    setStatuses((prev) => ({ ...prev, [id]: next }));
  }

  function updateDraft(id: string, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  }

  function updateNote(id: string, value: string) {
    setNotes((prev) => ({ ...prev, [id]: value }));
  }

  function regenerateDraft(item: OmxQueueItem) {
    const nextDraft = `${item.aiDraft}\n\n추가 안내: 고객 상황에 맞춰 재고/재입고 일정 또는 사용 팁 문장을 마지막에 한 줄 더 붙여 주세요.`;
    updateDraft(item.id, nextDraft);
    updateStatus(item.id, "editing");
  }

  return (
    <div>
      <Header
        title="OMX 답변 허브"
        subtitle="주문은 사방넷 · 스마트스토어/메이크샵 승인형 응답 운영"
        showBack
        maxWidthClassName="max-w-[1280px]"
      />
      <main className="max-w-[1280px] mx-auto px-4 py-5 space-y-5">
        <section className="grid gap-3 md:grid-cols-4">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <Badge className="bg-white text-emerald-700 border border-emerald-200">직접발송</Badge>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{counts.direct}</p>
              <p className="text-sm text-emerald-800 mt-1">API 전송 후보 채널</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock3 className="h-4 w-4 text-amber-700" />
                <Badge className="bg-white text-amber-700 border border-amber-200">승인대기</Badge>
              </div>
              <p className="text-2xl font-bold text-amber-900">{counts.approval}</p>
              <p className="text-sm text-amber-800 mt-1">바로 검토할 문의/리뷰</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TriangleAlert className="h-4 w-4 text-rose-700" />
                <Badge className="bg-white text-rose-700 border border-rose-200">보류</Badge>
              </div>
              <p className="text-2xl font-bold text-rose-900">{counts.blocked}</p>
              <p className="text-sm text-rose-800 mt-1">플랜/문서 추가 확인 필요</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FlaskConical className="h-4 w-4 text-blue-700" />
                <Badge className="bg-white text-blue-700 border border-blue-200">메이크샵</Badge>
              </div>
              <p className="text-base font-semibold text-blue-900">write 문서 검증 완료</p>
              <p className="text-sm text-blue-800 mt-1">
                `crm_board/reply`, `comment/store`, `review/store`까지 OMX에 반영
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-slate-200 bg-slate-50/80">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm text-slate-900">
              <p className="font-semibold">현재 운영 원칙</p>
              <p>
                주문 수집과 출고 처리는 사방넷에서 진행하고, OMX는 스마트스토어와 메이크샵의 문의/리뷰 답변을
                `AI 초안 + 사람 승인`으로 처리하는 보완 레이어로 운영합니다.
              </p>
              <p>
                쿠팡은 기술 검증 기록은 남겨두되 현재 개발 범위에서는 제외합니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/70">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-blue-700 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-950">
                <p className="font-semibold">메이크샵 공식 문서 검증 결과</p>
                <p>
                  문의는 `GET type=crm_board` + `POST type=crm_board&process=reply`, 상품 Q&amp;A 성격의 게시판은
                  `POST type=comment&process=store`, 리뷰는 `POST type=review&process=store` +
                  `save_type=answer`로 direct send 후보가 확인됐습니다.
                </p>
                <p>
                  현재 OMX 1차 범위는 스마트스토어와 메이크샵입니다. 주문은 사방넷에서 처리하므로, 이 화면은
                  응답 운영 상태와 승인 큐를 우선 보여줍니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Capability Matrix</h2>
              <p className="text-sm text-muted-foreground">현재 구현 범위와 후순위 채널을 분리해서 보여줍니다.</p>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {OMX_CAPABILITIES.map((capability) => (
              <Card key={capability.id} className="border-border/70">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{capability.channelLabel}</p>
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                      {ITEM_TYPE_LABEL[capability.itemType]}
                    </Badge>
                    <Badge className={SEND_MODE_TONE[capability.sendMode]}>{SEND_MODE_LABEL[capability.sendMode]}</Badge>
                    <Badge className={VALIDATION_TONE[capability.validationStatus]}>
                      {VALIDATION_LABEL[capability.validationStatus]}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">현재 판단</p>
                      <p className="font-medium">{capability.currentDecision}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">수집 방식</p>
                      <p className="font-medium">{INGEST_MODE_LABEL[capability.ingestMode]}</p>
                    </div>
                  </div>
                  {capability.blocker && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      blocker: {capability.blocker}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">next: {capability.nextAction}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">승인형 Inbox</CardTitle>
              <div className="flex flex-wrap gap-2 pt-2">
                {FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    type="button"
                    size="sm"
                    variant={queueFilter === filter.key ? "default" : "outline"}
                    onClick={() => setQueueFilter(filter.key)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {filteredQueue.map((item) => {
                const isActive = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      isActive ? "border-primary bg-primary/5" : "border-border/70 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                        {item.channelLabel}
                      </Badge>
                      <Badge className={STATUS_TONE[item.status]}>{QUEUE_STATUS_LABEL[item.status]}</Badge>
                      <Badge className={SEND_MODE_TONE[item.sendMode]}>{SEND_MODE_LABEL[item.sendMode]}</Badge>
                    </div>
                    <p className="font-semibold leading-snug">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.body}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>{item.assignee}</span>
                      <span>{formatDate(item.receivedAt)}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {selectedItem && (
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{selectedItem.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedItem.channelLabel} · {ITEM_TYPE_LABEL[selectedItem.itemType]} · 접수 {formatDate(selectedItem.receivedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={SEND_MODE_TONE[selectedItem.sendMode]}>{SEND_MODE_LABEL[selectedItem.sendMode]}</Badge>
                    <Badge className={VALIDATION_TONE[selectedItem.validationStatus]}>
                      {VALIDATION_LABEL[selectedItem.validationStatus]}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                      {URGENCY_LABEL[selectedItem.urgency]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="text-xs text-muted-foreground mb-1">고객</p>
                    <p className="font-medium">{selectedItem.customerName}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="text-xs text-muted-foreground mb-1">상품</p>
                    <p className="font-medium">{selectedItem.productName ?? "미지정"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 p-4 space-y-2">
                  <p className="text-sm font-semibold">원문</p>
                  <p className="text-sm leading-6 text-foreground">{selectedItem.body}</p>
                  <Separator />
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">raw payload</p>
                      <p>{selectedItem.rawPayloadSummary}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">내부 메모</p>
                      <p>{selectedItem.internalNote || "-"}</p>
                    </div>
                  </div>
                  {selectedItem.sourceUrl && (
                    <a
                      href={selectedItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                    >
                      원문 바로가기
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">AI 초안 / 승인 편집</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => regenerateDraft(selectedItem)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      초안 재생성
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[220px]"
                    value={drafts[selectedItem.id] ?? selectedItem.aiDraft}
                    onChange={(event) => {
                      updateDraft(selectedItem.id, event.target.value);
                      updateStatus(selectedItem.id, "editing");
                    }}
                  />
                  <Textarea
                    className="min-h-[88px]"
                    value={notes[selectedItem.id] ?? ""}
                    onChange={(event) => updateNote(selectedItem.id, event.target.value)}
                    placeholder="내부 메모 / 주의사항 / 재고 확인 메모"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => updateStatus(selectedItem.id, "approval_pending")}>
                      <Eye className="h-4 w-4 mr-1" />
                      승인 대기로 이동
                    </Button>
                    <Button
                      type="button"
                      onClick={() => updateStatus(selectedItem.id, "sent")}
                      disabled={selectedItem.sendMode === "disabled"}
                    >
                      {selectedItem.sendMode === "direct_send" ? (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          LIVE_SEND 승인
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          수동 처리 완료
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    현재 MVP 원칙: 자동 발송 금지. `LIVE_SEND 승인`은 사람 검토 뒤에만 누를 수 있고, 문서 검증만 된 채널은 기본적으로
                    `DRY_RUN`을 유지합니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">실행 순서</h2>
            <p className="text-sm text-muted-foreground">주문은 사방넷, OMX는 응답 운영 보완 레이어라는 기준을 반영합니다.</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            {OMX_RUNBOOK.map((step) => (
              <Card key={step.id} className="border-border/70">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{step.title}</p>
                    <Badge
                      className={
                        step.status === "active"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : step.status === "next"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                      }
                    >
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.summary}</p>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                    exit: {step.exitCriteria}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
