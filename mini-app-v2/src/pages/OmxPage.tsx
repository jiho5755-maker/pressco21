import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useToast } from "@/components/layout/Toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  fetchOmxWorkspace,
  generateOmxDraft,
  getOmxLiveConfigSummary,
  sendOmxReplies,
  type OmxDispatchMode,
  type OmxSourceState,
  type OmxWorkspaceMode,
} from "@/lib/omxApi";
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

type QueueFilter = "all" | "approval" | "direct" | "review" | "breach";

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
  { key: "breach", label: "SLA 임박/초과" },
];

const ACTIVE_CHANNELS = new Set(["smartstore", "makeshop"]);

function formatDate(value: string): string {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildEditableDrafts(items: OmxQueueItem[], previous: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    items.map((item) => [item.id, previous[item.id] ?? item.finalReply ?? item.aiDraft]),
  );
}

function buildEditableNotes(items: OmxQueueItem[], previous: Record<string, string>): Record<string, string> {
  return Object.fromEntries(items.map((item) => [item.id, previous[item.id] ?? item.internalNote ?? ""]));
}

function buildEditableStatuses(items: OmxQueueItem[], previous: Record<string, OmxQueueStatus>): Record<string, OmxQueueStatus> {
  return Object.fromEntries(items.map((item) => [item.id, previous[item.id] ?? item.status]));
}

function appendNote(original: string | undefined, message: string): string {
  const prefix = original?.trim() ? `${original.trim()}\n` : "";
  return `${prefix}[${new Date().toLocaleString("ko-KR")}] ${message}`;
}

function modeLabel(mode: OmxWorkspaceMode): string {
  if (mode === "live") return "LIVE";
  if (mode === "partial") return "PARTIAL";
  return "MOCK";
}

export function OmxPage() {
  const { showToast } = useToast();
  const liveConfig = useMemo(() => getOmxLiveConfigSummary(), []);
  const activeCapabilities = useMemo(
    () => OMX_CAPABILITIES.filter((capability) => capability.channel !== "coupang"),
    [],
  );
  const mockItems = useMemo(
    () => OMX_QUEUE_ITEMS.filter((item) => ACTIVE_CHANNELS.has(item.channel)),
    [],
  );

  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState(mockItems[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [queueItems, setQueueItems] = useState<OmxQueueItem[]>(mockItems);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => buildEditableDrafts(mockItems, {}));
  const [notes, setNotes] = useState<Record<string, string>>(() => buildEditableNotes(mockItems, {}));
  const [statuses, setStatuses] = useState<Record<string, OmxQueueStatus>>(() => buildEditableStatuses(mockItems, {}));
  const [sourceStates, setSourceStates] = useState<OmxSourceState[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<OmxWorkspaceMode>("mock");
  const [lastFetchedAt, setLastFetchedAt] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<OmxDispatchMode>("DRY_RUN");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const runtimeQueue = useMemo(
    () =>
      queueItems.map((item) => ({
        ...item,
        status: statuses[item.id] ?? item.status,
        finalReply: drafts[item.id] ?? item.finalReply ?? item.aiDraft,
        internalNote: notes[item.id] ?? item.internalNote,
      })),
    [drafts, notes, queueItems, statuses],
  );

  const filteredQueue = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return runtimeQueue.filter((item) => {
      const matchesFilter =
        queueFilter === "all"
          ? true
          : queueFilter === "approval"
            ? item.status === "approval_pending"
            : queueFilter === "direct"
              ? item.sendMode === "direct_send"
              : queueFilter === "review"
                ? item.itemType === "review"
                : item.urgency === "warning" || item.urgency === "breach";

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        item.channelLabel,
        item.customerName,
        item.title,
        item.body,
        item.productName,
        item.orderId,
        item.assignee,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [queueFilter, runtimeQueue, searchText]);

  const selectedQueue = useMemo(
    () => runtimeQueue.filter((item) => selectedIds[item.id]),
    [runtimeQueue, selectedIds],
  );

  const selectedSendableQueue = useMemo(
    () =>
      selectedQueue.filter((item) => item.sendMode === "direct_send" && item.status !== "sent" && item.status !== "manual_required"),
    [selectedQueue],
  );

  const allFilteredSelected = filteredQueue.length > 0 && filteredQueue.every((item) => selectedIds[item.id]);

  const selectedItem =
    filteredQueue.find((item) => item.id === selectedId) ??
    runtimeQueue.find((item) => item.id === selectedId) ??
    filteredQueue[0] ??
    runtimeQueue[0];

  const counts = useMemo(() => {
    const approval = runtimeQueue.filter((item) => item.status === "approval_pending").length;
    const direct = runtimeQueue.filter((item) => item.sendMode === "direct_send").length;
    const breach = runtimeQueue.filter((item) => item.urgency === "warning" || item.urgency === "breach").length;
    const sendReady = sourceStates.filter((state) => state.sendConfigured).length;
    return { approval, direct, breach, sendReady };
  }, [runtimeQueue, sourceStates]);

  const displaySourceStates: OmxSourceState[] = sourceStates.length
    ? sourceStates
    : [
        {
          channel: "smartstore",
          channelLabel: "스마트스토어",
          fetchConfigured: false,
          sendConfigured: false,
          fetchOk: false,
          sendOk: false,
          configuredMode: "mock",
        },
        {
          channel: "makeshop",
          channelLabel: "메이크샵",
          fetchConfigured: false,
          sendConfigured: false,
          fetchOk: false,
          sendOk: false,
          configuredMode: "mock",
        },
      ];

  useEffect(() => {
    void refreshQueue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedItem?.id) {
      return;
    }
    if (selectedId !== selectedItem.id) {
      setSelectedId(selectedItem.id);
    }
  }, [selectedId, selectedItem]);

  async function refreshQueue(silent = false) {
    setIsRefreshing(true);
    try {
      const workspace = await fetchOmxWorkspace();
      const items = workspace.items.filter((item) => ACTIVE_CHANNELS.has(item.channel));
      setQueueItems(items);
      setDrafts((prev) => buildEditableDrafts(items, prev));
      setNotes((prev) => buildEditableNotes(items, prev));
      setStatuses((prev) => buildEditableStatuses(items, prev));
      setSelectedIds((prev) =>
        Object.fromEntries(items.filter((item) => prev[item.id]).map((item) => [item.id, true])),
      );
      setSourceStates(workspace.sourceStates);
      setWorkspaceMode(workspace.mode);
      setLastFetchedAt(workspace.fetchedAt);
      if (!silent) {
        showToast(
          workspace.mode === "mock" ? "실연동 endpoint가 없어 목업 데이터로 불러왔습니다" : "실데이터를 새로고침했습니다",
          "success",
        );
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "OMX 데이터를 불러오지 못했습니다", "error");
    } finally {
      setIsRefreshing(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (allFilteredSelected) {
        filteredQueue.forEach((item) => {
          delete next[item.id];
        });
        return next;
      }
      filteredQueue.forEach((item) => {
        next[item.id] = true;
      });
      return next;
    });
  }

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
    updateDraft(item.id, generateOmxDraft(item));
    updateStatus(item.id, "editing");
  }

  function regenerateSelectedDrafts() {
    if (!selectedQueue.length) {
      showToast("선택된 문의가 없습니다", "info");
      return;
    }
    selectedQueue.forEach((item) => {
      updateDraft(item.id, generateOmxDraft(item));
      updateStatus(item.id, "editing");
    });
    showToast(`${selectedQueue.length}건의 초안을 다시 만들었습니다`, "success");
  }

  function moveSelectedToApproval() {
    if (!selectedQueue.length) {
      showToast("선택된 문의가 없습니다", "info");
      return;
    }
    selectedQueue.forEach((item) => {
      if (item.status !== "sent") {
        updateStatus(item.id, "approval_pending");
      }
    });
    showToast(`${selectedQueue.length}건을 승인대기로 이동했습니다`, "success");
  }

  async function handleSendConfirmed() {
    if (!selectedSendableQueue.length) {
      setSendDialogOpen(false);
      showToast("직접 발송 가능한 선택 건이 없습니다", "info");
      return;
    }

    setIsSending(true);
    try {
      const results = await sendOmxReplies(selectedSendableQueue, drafts, dispatchMode);
      const successCount = results.filter((result) => result.ok).length;
      const failureCount = results.length - successCount;

      setStatuses((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result.ok && dispatchMode === "LIVE_SEND") {
            next[result.id] = "sent";
          } else if (!result.ok) {
            next[result.id] = "approval_pending";
          }
        });
        return next;
      });

      setNotes((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          next[result.id] = appendNote(
            next[result.id],
            `${dispatchMode} ${result.ok ? "성공" : "실패"}${result.message ? ` - ${result.message}` : ""}`,
          );
        });
        return next;
      });

      showToast(
        dispatchMode === "LIVE_SEND"
          ? `${successCount}건 발송 완료${failureCount ? ` / ${failureCount}건 실패` : ""}`
          : `${successCount}건 DRY_RUN 완료${failureCount ? ` / ${failureCount}건 실패` : ""}`,
        failureCount ? "error" : "success",
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "일괄 발송에 실패했습니다", "error");
    } finally {
      setIsSending(false);
      setSendDialogOpen(false);
    }
  }

  const liveDirectSources = sourceStates.filter((state) => state.sendConfigured);

  return (
    <div>
      <Header
        title="OMX 답변 허브"
        subtitle="주문은 사방넷 · 스마트스토어/메이크샵 문의·리뷰 승인형 운영"
        showBack
        maxWidthClassName="max-w-[1280px]"
      />
      <main className="mx-auto max-w-[1280px] space-y-5 px-4 py-5">
        <section className="grid gap-3 md:grid-cols-4">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <Badge className="border border-emerald-200 bg-white text-emerald-700">{modeLabel(workspaceMode)}</Badge>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{counts.direct}</p>
              <p className="mt-1 text-sm text-emerald-800">직접 발송 가능한 현재 큐</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <Clock3 className="h-4 w-4 text-amber-700" />
                <Badge className="border border-amber-200 bg-white text-amber-700">승인대기</Badge>
              </div>
              <p className="text-2xl font-bold text-amber-900">{counts.approval}</p>
              <p className="mt-1 text-sm text-amber-800">검토 후 바로 보낼 수 있는 건</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <TriangleAlert className="h-4 w-4 text-rose-700" />
                <Badge className="border border-rose-200 bg-white text-rose-700">SLA</Badge>
              </div>
              <p className="text-2xl font-bold text-rose-900">{counts.breach}</p>
              <p className="mt-1 text-sm text-rose-800">임박 또는 초과 상태</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <FlaskConical className="h-4 w-4 text-blue-700" />
                <Badge className="border border-blue-200 bg-white text-blue-700">{dispatchMode}</Badge>
              </div>
              <p className="text-2xl font-bold text-blue-900">{counts.sendReady}</p>
              <p className="mt-1 text-sm text-blue-800">발송 endpoint 준비 채널</p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-slate-200 bg-slate-50/80">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2 text-sm text-slate-900">
                <p className="font-semibold">현재 운영 원칙</p>
                <p>
                  주문 수집과 출고는 사방넷에서 처리하고, OMX는 스마트스토어와 메이크샵의 실제 문의/리뷰를 수집해
                  `AI 초안 + 사람 승인 + 일괄 발송`으로 운영하는 보완 레이어입니다.
                </p>
                <p>
                  채널톡과 쿠팡은 이번 범위에서 제외했고, 이 화면은 스마트스토어/메이크샵만 대상으로 실조회와 발송을
                  진행합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={dispatchMode === "DRY_RUN" ? "default" : "outline"} onClick={() => setDispatchMode("DRY_RUN")}>
                  DRY_RUN
                </Button>
                <Button type="button" variant={dispatchMode === "LIVE_SEND" ? "default" : "outline"} onClick={() => setDispatchMode("LIVE_SEND")}>
                  LIVE_SEND
                </Button>
                <Button type="button" variant="outline" onClick={() => void refreshQueue()} disabled={isRefreshing}>
                  <RefreshCw className={`mr-1 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  새로고침
                </Button>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {displaySourceStates.map((state) => (
                <div key={state.channel} className="rounded-2xl border border-border/70 bg-white p-4 text-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{state.channelLabel}</p>
                    <Badge className={state.fetchConfigured ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700 border border-slate-200"}>
                      fetch {state.fetchConfigured ? "configured" : "missing"}
                    </Badge>
                    <Badge className={state.sendConfigured ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-700 border border-slate-200"}>
                      send {state.sendConfigured ? "configured" : "missing"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {state.fetchOk
                      ? `${state.lastResultCount ?? 0}건 조회`
                      : state.fetchConfigured
                        ? `조회 실패: ${state.lastError || "unknown"}`
                        : "환경변수 미설정으로 목업 모드"}
                  </p>
                  {state.lastFetchedAt && <p className="mt-1 text-xs text-muted-foreground">last sync {formatDate(state.lastFetchedAt)}</p>}
                  {state.metaSummary && <p className="mt-2 text-xs text-muted-foreground">meta: {state.metaSummary}</p>}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
              <p className="font-semibold">실연동 준비 상태</p>
              <p className="mt-1">
                shared key {liveConfig.hasSharedKey ? "설정됨" : "미설정"} · force mock {liveConfig.forceMock ? "ON" : "OFF"} ·
                last sync {lastFetchedAt ? formatDate(lastFetchedAt) : "없음"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/70">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 text-blue-700" />
              <div className="space-y-2 text-sm text-blue-950">
                <p className="font-semibold">현재 1차 범위</p>
                <p>
                  스마트스토어는 실계정 문의 조회/상품문의 답변 검증이 완료됐고, 메이크샵은 read 검증과 공식 write 문서
                  확인까지 완료된 상태입니다.
                </p>
                <p>
                  이 화면은 실조회 endpoint가 연결되면 실제 고객 클레임을 바로 모아 보여주고, 선택 건을 DRY_RUN 또는
                  LIVE_SEND로 일괄 발송할 수 있도록 설계했습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Capability Matrix</h2>
              <p className="text-sm text-muted-foreground">현재 범위와 후속 채널을 구분해서 관리합니다.</p>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {activeCapabilities.map((capability) => (
              <Card key={capability.id} className="border-border/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{capability.channelLabel}</p>
                    <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
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

        <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">실제 클레임 Inbox</CardTitle>
              <div className="space-y-2 pt-2">
                <Input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="고객명, 상품명, 문의 내용 검색"
                />
                <div className="flex flex-wrap gap-2">
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
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={toggleSelectAllFiltered}>
                    {allFilteredSelected ? "필터 전체 해제" : "필터 전체 선택"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={regenerateSelectedDrafts}>
                    선택 초안 재생성
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={moveSelectedToApproval}>
                    선택 승인대기
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-0">
              {filteredQueue.length ? (
                filteredQueue.map((item) => {
                  const isActive = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border px-3 py-3 transition ${
                        isActive ? "border-primary bg-primary/5" : "border-border/70 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedIds[item.id])}
                          onChange={() => toggleSelect(item.id)}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <button type="button" onClick={() => setSelectedId(item.id)} className="flex-1 text-left">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                              {item.channelLabel}
                            </Badge>
                            <Badge className={STATUS_TONE[item.status]}>{QUEUE_STATUS_LABEL[item.status]}</Badge>
                            <Badge className={SEND_MODE_TONE[item.sendMode]}>{SEND_MODE_LABEL[item.sendMode]}</Badge>
                          </div>
                          <p className="font-semibold leading-snug">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.assignee}</span>
                            <span>{formatDate(item.receivedAt)}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  현재 필터에서 보여줄 문의가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {selectedItem && (
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{selectedItem.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedItem.channelLabel} · {ITEM_TYPE_LABEL[selectedItem.itemType]} · 접수 {formatDate(selectedItem.receivedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={SEND_MODE_TONE[selectedItem.sendMode]}>{SEND_MODE_LABEL[selectedItem.sendMode]}</Badge>
                    <Badge className={VALIDATION_TONE[selectedItem.validationStatus]}>
                      {VALIDATION_LABEL[selectedItem.validationStatus]}
                    </Badge>
                    <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                      {URGENCY_LABEL[selectedItem.urgency]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">고객</p>
                    <p className="font-medium">{selectedItem.customerName}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">상품</p>
                    <p className="font-medium">{selectedItem.productName ?? "미지정"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">선택된 건수</p>
                    <p className="font-medium">{selectedQueue.length}건</p>
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">AI 초안 / 승인 편집</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => regenerateDraft(selectedItem)}>
                        <RefreshCw className="mr-1 h-4 w-4" />
                        현재 초안 재생성
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => toggleSelect(selectedItem.id)}>
                        <Eye className="mr-1 h-4 w-4" />
                        {selectedIds[selectedItem.id] ? "선택 해제" : "선택 추가"}
                      </Button>
                    </div>
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
                    placeholder="내부 메모 / 재고 확인 / 고객별 주의사항"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => updateStatus(selectedItem.id, "approval_pending")}>
                      <Eye className="mr-1 h-4 w-4" />
                      승인 대기로 이동
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedIds((prev) => ({ ...prev, [selectedItem.id]: true }));
                        setSendDialogOpen(true);
                      }}
                      disabled={selectedItem.sendMode !== "direct_send" || isSending}
                    >
                      <Send className="mr-1 h-4 w-4" />
                      이 건 {dispatchMode}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setSendDialogOpen(true)}
                      disabled={!selectedSendableQueue.length || isSending}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      선택 {selectedSendableQueue.length}건 {dispatchMode}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    자동 발송은 사용하지 않습니다. 실데이터는 모두 이 화면에서 검토한 뒤 `DRY_RUN` 또는 `LIVE_SEND`로만
                    실행합니다.
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                  <p className="font-semibold">일괄 발송 준비 상태</p>
                  <p className="mt-1">
                    선택 건 {selectedQueue.length}건 · 직접 발송 가능 {selectedSendableQueue.length}건 · send endpoint 준비 채널{" "}
                    {liveDirectSources.length}개
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">실행 순서</h2>
            <p className="text-sm text-muted-foreground">주문은 사방넷, OMX는 스마트스토어/메이크샵 응답 운영이라는 기준을 반영합니다.</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            {OMX_RUNBOOK.map((step) => (
              <Card key={step.id} className="border-border/70">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{step.title}</p>
                    <Badge
                      className={
                        step.status === "active"
                          ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                          : step.status === "next"
                            ? "border border-blue-200 bg-blue-100 text-blue-700"
                            : "border border-slate-200 bg-slate-100 text-slate-700"
                      }
                    >
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.summary}</p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    exit: {step.exitCriteria}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>일괄 발송 확인</DialogTitle>
            <DialogDescription>
              선택된 {selectedSendableQueue.length}건을 {dispatchMode}로 처리합니다. 실운영에서는 `AI 초안 + 사람 승인` 원칙을
              유지하고, LIVE_SEND는 꼭 실제 문구를 확인한 뒤 진행하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border/70 bg-slate-50 px-4 py-3">
              <p className="font-semibold">대상 채널</p>
              <p className="mt-1 text-muted-foreground">
                {Array.from(new Set(selectedSendableQueue.map((item) => item.channelLabel))).join(", ") || "없음"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-slate-50 px-4 py-3">
              <p className="font-semibold">선택 건</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {selectedSendableQueue.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    {item.channelLabel} · {item.customerName} · {item.title}
                  </li>
                ))}
                {selectedSendableQueue.length > 5 && <li>외 {selectedSendableQueue.length - 5}건</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={() => void handleSendConfirmed()} disabled={isSending || !selectedSendableQueue.length}>
              {isSending ? "처리 중..." : `${dispatchMode} 실행`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
