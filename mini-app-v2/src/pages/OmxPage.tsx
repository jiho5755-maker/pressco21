import { useDeferredValue, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type OmxInquiryCategory,
  type OmxQueueItem,
  type OmxQueueStatus,
  type OmxSendMode,
} from "@/lib/omx";
import {
  fetchOmxWorkspace,
  generateOmxDraft,
  preflightOmxSend,
  sendOmxReplies,
  type OmxDispatchMode,
  type OmxLiveConfigSummary,
  type OmxSourceState,
  type OmxWorkspaceMode,
} from "@/lib/omxApi";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clipboard,
  Clock3,
  FlaskConical,
  Image as ImageIcon,
  Layers3,
  ListFilter,
  MessageSquareQuote,
  MonitorUp,
  ShieldAlert,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

type QueueFilter = "all" | "approval" | "direct" | "review" | "breach";
type ChannelFilter = "all" | "smartstore" | "makeshop";
type CategoryFilter = "all" | OmxInquiryCategory;
type ExecutionLog = {
  id: string;
  channelLabel: string;
  customerName: string;
  title: string;
  dispatchMode: OmxDispatchMode;
  ok: boolean;
  message: string;
  createdAt: string;
};
type DraftPreset = {
  id: string;
  label: string;
  text: string;
};

const DISPATCH_LABEL: Record<OmxDispatchMode, string> = {
  DRY_RUN: "발송 전 확인",
  LIVE_SEND: "실제 발송",
};

const DISPATCH_RESULT_LABEL: Record<OmxDispatchMode, string> = {
  DRY_RUN: "확인",
  LIVE_SEND: "발송",
};

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

const CATEGORY_TONE: Record<string, string> = {
  usage: "border border-violet-200 bg-violet-100 text-violet-700",
  stock: "border border-cyan-200 bg-cyan-100 text-cyan-700",
  delivery: "border border-blue-200 bg-blue-100 text-blue-700",
  return: "border border-amber-200 bg-amber-100 text-amber-700",
  defect: "border border-rose-200 bg-rose-100 text-rose-700",
  business: "border border-emerald-200 bg-emerald-100 text-emerald-700",
  review: "border border-pink-200 bg-pink-100 text-pink-700",
  general: "border border-slate-200 bg-slate-100 text-slate-700",
};

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "approval", label: "승인대기" },
  { key: "direct", label: "직접발송" },
  { key: "review", label: "리뷰" },
  { key: "breach", label: "SLA 임박/초과" },
];

const CHANNEL_FILTERS: { key: ChannelFilter; label: string }[] = [
  { key: "all", label: "전체 채널" },
  { key: "smartstore", label: "스마트스토어" },
  { key: "makeshop", label: "메이크샵" },
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

function displayDispatchMode(mode: OmxDispatchMode): string {
  return DISPATCH_LABEL[mode];
}

function normalizeDispatchMessage(message: string, mode: OmxDispatchMode): string {
  return message
    .replaceAll("DRY_RUN", DISPATCH_LABEL.DRY_RUN)
    .replaceAll("LIVE_SEND", DISPATCH_LABEL.LIVE_SEND)
    .replace("전송 완료", mode === "LIVE_SEND" ? "발송 완료" : "확인 완료");
}

function getInitials(name: string): string {
  return name.replace(/\s+/g, "").slice(0, 2) || "고객";
}

function buildDraftPresets(item: OmxQueueItem): DraftPreset[] {
  if (item.itemType === "review") {
    return [
      {
        id: "thanks",
        label: "감사형",
        text: `소중한 후기 감사합니다. ${item.productName ? `${item.productName}을` : "상품을"} 만족스럽게 받아보셨다니 다행입니다. 다음 주문 때도 좋은 상태로 준비해드리겠습니다.`,
      },
      {
        id: "repeat",
        label: "재구매 유도형",
        text: `정성스러운 후기 감사합니다. 작업에 도움이 되셨다니 기쁩니다. 다음에도 ${item.productName ? `${item.productName}` : "상품"}이 필요하실 때 좋은 상태로 준비해드리겠습니다.`,
      },
    ];
  }

  if (item.inquiryCategory === "defect") {
    return [
      {
        id: "defect-check",
        label: "불량 확인",
        text: `안녕하세요. 불편을 드려 죄송합니다. 문의주신 증상 기준으로 ${item.productName ? `${item.productName}의` : "상품의"} 상태와 출고 이력을 먼저 확인해보겠습니다. 확인되는 내용에 따라 교환 또는 재안내 가능한 부분까지 함께 정리해드리겠습니다.`,
      },
      {
        id: "defect-photo",
        label: "사진 요청",
        text: `안녕하세요. 정확한 확인을 위해 현재 상태가 보이는 사진을 함께 남겨주시면 확인에 큰 도움이 됩니다. 전달해주시는 내용 기준으로 가능한 빠르게 후속 안내드리겠습니다.`,
      },
    ];
  }

  if (item.inquiryCategory === "business") {
    return [
      {
        id: "business-stock",
        label: "사업자 확인",
        text: `안녕하세요. 사업자/대량 주문 문의 확인했습니다. ${item.productName ? `${item.productName}` : "상품"}의 현재 공급 가능 수량과 거래 조건을 먼저 확인한 뒤 다시 정리해서 안내드리겠습니다.`,
      },
      {
        id: "business-docs",
        label: "거래 조건",
        text: `안녕하세요. 요청 주신 거래 조건과 증빙 여부를 확인한 뒤 안내드리겠습니다. 필요하신 수량과 사용 일정이 있으시면 함께 남겨주시면 확인에 도움이 됩니다.`,
      },
    ];
  }

  if (item.inquiryCategory === "delivery") {
    return [
      {
        id: "delivery-track",
        label: "출고 확인",
        text: `안녕하세요. 문의주신 주문의 출고 상태와 송장 반영 여부를 먼저 확인해보겠습니다. 확인되는 내용 기준으로 바로 다시 안내드리겠습니다.`,
      },
      {
        id: "delivery-delay",
        label: "지연 안내",
        text: `안녕하세요. 현재 출고 진행 상태를 확인 중입니다. 포장 및 택배사 반영 시간에 따라 조회가 지연될 수 있어 확인되는 대로 정확한 일정으로 다시 안내드리겠습니다.`,
      },
    ];
  }

  return [
    {
      id: "guide",
      label: "사용 안내",
      text: `안녕하세요 :) 문의주신 내용 확인했습니다. ${item.productName ? `${item.productName} 사용 시에는` : "작업 시에는"} 먼저 소량 테스트를 진행해보시고, 작업 환경과 재료 상태를 함께 확인해보시는 것을 권장드립니다. 필요한 내용은 최대한 자세히 안내드리겠습니다.`,
    },
    {
      id: "confirm",
      label: "확인 후 안내",
      text: `안녕하세요. 문의주신 내용 확인했습니다. 정확한 안내를 위해 내부 기준과 현재 상태를 먼저 확인한 뒤 다시 자세히 답변드리겠습니다.`,
    },
    {
      id: "delivery",
      label: "배송/누락 확인",
      text: `안녕하세요. 문의주신 내용 기준으로 출고 및 포장 이력을 먼저 확인해보겠습니다. 확인되는 내용대로 가능한 빠르게 다시 안내드리겠습니다.`,
    },
  ];
}

function mergeWorkspaceState(
  workspace: Awaited<ReturnType<typeof fetchOmxWorkspace>>,
  setQueueItems: (value: OmxQueueItem[]) => void,
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>,
  setNotes: Dispatch<SetStateAction<Record<string, string>>>,
  setStatuses: Dispatch<SetStateAction<Record<string, OmxQueueStatus>>>,
  setSelectedIds: Dispatch<SetStateAction<Record<string, boolean>>>,
  setSourceStates: Dispatch<SetStateAction<OmxSourceState[]>>,
  setWorkspaceMode: Dispatch<SetStateAction<OmxWorkspaceMode>>,
  setLastFetchedAt: Dispatch<SetStateAction<string>>,
  setLiveConfig: Dispatch<SetStateAction<OmxLiveConfigSummary>>,
) {
  const items = workspace.items.filter((item) => ACTIVE_CHANNELS.has(item.channel));
  setQueueItems(items);
  setDrafts((prev) => buildEditableDrafts(items, prev));
  setNotes((prev) => buildEditableNotes(items, prev));
  setStatuses((prev) => buildEditableStatuses(items, prev));
  setSelectedIds((prev) => Object.fromEntries(items.filter((item) => prev[item.id]).map((item) => [item.id, true])));
  setSourceStates(workspace.sourceStates);
  setWorkspaceMode(workspace.mode);
  setLastFetchedAt(workspace.fetchedAt);
  setLiveConfig(workspace.configSummary);
}

function isGenericSourceUrl(url?: string): boolean {
  if (!url) {
    return false;
  }
  return /https:\/\/admin\.makeshop\.co\.kr\/?$/i.test(url.trim());
}

function attachmentSummary(item: OmxQueueItem): string | null {
  const imageCount = item.attachments?.filter((attachment) => attachment.kind !== "file").length ?? 0;
  const fileCount = item.attachments?.filter((attachment) => attachment.kind === "file").length ?? 0;
  if (!imageCount && !fileCount) {
    return null;
  }
  if (imageCount && fileCount) {
    return `이미지 ${imageCount} · 파일 ${fileCount}`;
  }
  if (imageCount) {
    return `이미지 ${imageCount}`;
  }
  return `파일 ${fileCount}`;
}

function categoryLabel(category: CategoryFilter): string {
  switch (category) {
    case "usage":
      return "사용법";
    case "stock":
      return "재고/입고";
    case "delivery":
      return "배송";
    case "return":
      return "교환/반품";
    case "defect":
      return "불량";
    case "business":
      return "사업자";
    case "review":
      return "후기";
    case "general":
      return "일반";
    default:
      return "전체";
  }
}

export function OmxPage() {
  const { showToast } = useToast();
  const activeCapabilities = useMemo(
    () => OMX_CAPABILITIES.filter((capability) => capability.channel !== "coupang"),
    [],
  );
  const mockItems = useMemo(
    () => OMX_QUEUE_ITEMS.filter((item) => ACTIVE_CHANNELS.has(item.channel)),
    [],
  );

  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
  const [selectedId, setSelectedId] = useState(mockItems[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [queueItems, setQueueItems] = useState<OmxQueueItem[]>(mockItems);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => buildEditableDrafts(mockItems, {}));
  const [notes, setNotes] = useState<Record<string, string>>(() => buildEditableNotes(mockItems, {}));
  const [statuses, setStatuses] = useState<Record<string, OmxQueueStatus>>(() => buildEditableStatuses(mockItems, {}));
  const [sourceStates, setSourceStates] = useState<OmxSourceState[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<OmxWorkspaceMode>("mock");
  const [lastFetchedAt, setLastFetchedAt] = useState<string>("");
  const [liveConfig, setLiveConfig] = useState<OmxLiveConfigSummary>({
    forceMock: false,
    hasSharedKey: false,
    authMode: "none",
    sourceLabel: "env",
    fetchConfiguredCount: 0,
    sendConfiguredCount: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<OmxDispatchMode>("DRY_RUN");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [liveConfirmText, setLiveConfirmText] = useState("");
  const [conflictWarnings, setConflictWarnings] = useState<Array<{ id: string; title: string; message: string }>>([]);

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

  const authModeLabel =
    liveConfig.authMode === "shared_key"
      ? "shared key direct"
      : liveConfig.authMode === "proxy"
        ? "same-origin proxy"
        : "none";

  const filteredQueue = useMemo(() => {
    const normalizedSearch = deferredSearchText.trim().toLowerCase();
    return runtimeQueue.filter((item) => {
      const matchesChannel = channelFilter === "all" ? true : item.channel === channelFilter;
      const matchesCategory =
        categoryFilter === "all"
          ? true
          : (item.inquiryCategory || (item.itemType === "review" ? "review" : "general")) === categoryFilter;
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

      if (!matchesFilter || !matchesChannel || !matchesCategory) {
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
  }, [categoryFilter, channelFilter, deferredSearchText, queueFilter, runtimeQueue]);

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
    filteredQueue[0] ??
    runtimeQueue.find((item) => item.id === selectedId) ??
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

  const categoryOptions = useMemo(() => {
    const source =
      channelFilter === "all" ? runtimeQueue : runtimeQueue.filter((item) => item.channel === channelFilter);
    const countsByCategory = new Map<CategoryFilter, number>();
    source.forEach((item) => {
      const category = (item.inquiryCategory || (item.itemType === "review" ? "review" : "general")) as CategoryFilter;
      countsByCategory.set(category, (countsByCategory.get(category) || 0) + 1);
    });
    const orderedCategories: CategoryFilter[] = [
      "usage",
      "defect",
      "delivery",
      "stock",
      "return",
      "business",
      "review",
      "general",
    ];
    return [{ key: "all" as CategoryFilter, label: "전체", count: source.length }].concat(
      orderedCategories
        .filter((category) => countsByCategory.has(category))
        .map((category) => ({
          key: category,
          label: categoryLabel(category),
          count: countsByCategory.get(category) || 0,
        })),
    );
  }, [channelFilter, runtimeQueue]);

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
      mergeWorkspaceState(
        workspace,
        setQueueItems,
        setDrafts,
        setNotes,
        setStatuses,
        setSelectedIds,
        setSourceStates,
        setWorkspaceMode,
        setLastFetchedAt,
        setLiveConfig,
      );
      setConflictWarnings([]);
      if (!silent) {
        showToast(
          workspace.mode === "mock" ? "실연동 endpoint가 없어 목업 데이터로 불러왔습니다" : "플랫폼 최신 문의를 다시 가져왔습니다",
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

  function selectSendableInFilter() {
    const next = Object.fromEntries(
      filteredQueue
        .filter((item) => item.sendMode === "direct_send" && item.status !== "sent" && item.status !== "manual_required")
        .map((item) => [item.id, true]),
    );
    setSelectedIds((prev) => ({
      ...prev,
      ...next,
    }));
    showToast(`${Object.keys(next).length}건을 발송 대상으로 선택했습니다`, "success");
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

  async function copyText(label: string, value: string) {
    if (!value.trim()) {
      showToast(`${label} 내용이 비어 있습니다`, "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label}을 복사했습니다`, "success");
    } catch {
      showToast(`${label} 복사에 실패했습니다`, "error");
    }
  }

  function applyDraftPreset(item: OmxQueueItem, text: string) {
    updateDraft(item.id, text);
    updateStatus(item.id, "editing");
    showToast("템플릿 초안을 적용했습니다", "success");
  }

  async function handleSendConfirmed() {
    if (!selectedSendableQueue.length) {
      setSendDialogOpen(false);
      showToast("직접 발송 가능한 선택 건이 없습니다", "info");
      return;
    }

    setIsSending(true);
    try {
      const { latestWorkspace, blockedIds, blockedMap } = await preflightOmxSend(selectedSendableQueue);
      mergeWorkspaceState(
        latestWorkspace,
        setQueueItems,
        setDrafts,
        setNotes,
        setStatuses,
        setSelectedIds,
        setSourceStates,
        setWorkspaceMode,
        setLastFetchedAt,
        setLiveConfig,
      );
      setConflictWarnings(
        blockedIds.map((id) => ({
          id,
          title:
            latestWorkspace.items.find((item) => item.id === id)?.title ||
            runtimeQueue.find((item) => item.id === id)?.title ||
            id,
          message: blockedMap.get(id) || "플랫폼 최신 상태와 충돌해 발송을 막았습니다.",
        })),
      );

      if (blockedIds.length) {
        setNotes((prev) => {
          const next = { ...prev };
          blockedIds.forEach((id) => {
            next[id] = appendNote(next[id], blockedMap.get(id) || "플랫폼 최신 상태와 충돌해 발송을 막았습니다.");
          });
          return next;
        });
      }

      const safeQueue = selectedSendableQueue.filter((item) => !blockedIds.includes(item.id));
      if (!safeQueue.length) {
        showToast("플랫폼 최신 상태를 확인한 결과, 보낼 수 있는 문의가 남아 있지 않습니다", "error");
        return;
      }

      if (blockedIds.length) {
        showToast(`${blockedIds.length}건은 이미 처리되어 제외했습니다. 나머지만 진행합니다.`, "info");
      } else {
        setConflictWarnings([]);
      }

      const results = await sendOmxReplies(safeQueue, drafts, dispatchMode);
      const successCount = results.filter((result) => result.ok).length;
      const failureCount = results.length - successCount;
      const indexedQueue = new Map([...runtimeQueue, ...latestWorkspace.items].map((item) => [item.id, item]));

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
            `${displayDispatchMode(dispatchMode)} ${result.ok ? "성공" : "실패"}${
              result.message ? ` - ${normalizeDispatchMessage(result.message, dispatchMode)}` : ""
            }`,
          );
        });
        return next;
      });

      setExecutionLogs((prev) => {
        const nextLogs = results.map((result) => {
          const item = indexedQueue.get(result.id);
          return {
            id: `${result.id}-${Date.now()}`,
            channelLabel: item?.channelLabel || result.channel,
            customerName: item?.customerName || "고객",
            title: item?.title || result.id,
            dispatchMode,
            ok: result.ok,
            message: normalizeDispatchMessage(result.message, dispatchMode),
            createdAt: new Date().toISOString(),
          };
        });
        return [...nextLogs, ...prev].slice(0, 12);
      });

      if (dispatchMode === "LIVE_SEND" && selectedItem) {
        const sentIds = new Set(results.filter((result) => result.ok).map((result) => result.id));
        if (sentIds.has(selectedItem.id)) {
          const nextCandidate = filteredQueue.find(
            (item) => item.id !== selectedItem.id && !sentIds.has(item.id) && item.status !== "sent",
          );
          if (nextCandidate) {
            setSelectedId(nextCandidate.id);
          }
        }
      }

      showToast(
        dispatchMode === "LIVE_SEND"
          ? `${successCount}건 실제 발송 완료${failureCount ? ` / ${failureCount}건 실패` : ""}`
          : `${successCount}건 발송 전 확인 완료${failureCount ? ` / ${failureCount}건 실패` : ""}`,
        failureCount ? "error" : "success",
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "일괄 발송에 실패했습니다", "error");
    } finally {
      setIsSending(false);
      setSendDialogOpen(false);
      setLiveConfirmText("");
    }
  }

  const liveDirectSources = sourceStates.filter((state) => state.sendConfigured);
  const channelCounts = useMemo(
    () => ({
      smartstore: runtimeQueue.filter((item) => item.channel === "smartstore").length,
      makeshop: runtimeQueue.filter((item) => item.channel === "makeshop").length,
    }),
    [runtimeQueue],
  );
  const liveSendConfirmed = dispatchMode === "DRY_RUN" || liveConfirmText.replace(/\s+/g, "") === "실제발송";
  const selectedDraftLength = (drafts[selectedItem?.id || ""] || selectedItem?.aiDraft || "").trim().length;
  const draftPresets = selectedItem ? buildDraftPresets(selectedItem) : [];
  const actionSummary = useMemo(() => {
    const pending = filteredQueue.filter((item) => item.status === "approval_pending").length;
    const warning = filteredQueue.filter((item) => item.urgency === "warning" || item.urgency === "breach").length;
    return { pending, warning, total: filteredQueue.length, selected: selectedQueue.length };
  }, [filteredQueue, selectedQueue.length]);
  const nextPriorityItem =
    runtimeQueue.find((item) => item.urgency === "breach" && item.status !== "sent") ??
    runtimeQueue.find((item) => item.urgency === "warning" && item.status !== "sent") ??
    runtimeQueue.find((item) => item.status === "approval_pending");

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
                <Badge className="border border-blue-200 bg-white text-blue-700">{displayDispatchMode(dispatchMode)}</Badge>
              </div>
              <p className="text-2xl font-bold text-blue-900">{counts.sendReady}</p>
              <p className="mt-1 text-sm text-blue-800">발송 endpoint 준비 채널</p>
            </CardContent>
          </Card>
        </section>
        <Card className="border-slate-200 bg-slate-50/90">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border border-slate-200 bg-white text-slate-700">
                    config {liveConfig.sourceLabel.toUpperCase()}
                  </Badge>
                  <Badge className="border border-slate-200 bg-white text-slate-700">auth {authModeLabel}</Badge>
                  <Badge className="border border-slate-200 bg-white text-slate-700">
                    last sync {lastFetchedAt ? formatDate(lastFetchedAt) : "없음"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-900">
                  주문은 사방넷에서 처리하고, 여기서는 스마트스토어/메이크샵 문의를 모아 `검토 → 승인 → 발송`만 빠르게
                  처리합니다.
                </p>
                <p className="text-xs text-slate-500">
                  자동 대기보다 필요할 때 직접 최신 문의를 다시 가져오고, 실제 발송 직전에는 플랫폼 상태를 한 번 더
                  확인합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={dispatchMode === "DRY_RUN" ? "default" : "outline"} onClick={() => setDispatchMode("DRY_RUN")}>
                  발송 전 확인
                </Button>
                <Button type="button" variant={dispatchMode === "LIVE_SEND" ? "default" : "outline"} onClick={() => setDispatchMode("LIVE_SEND")}>
                  실제 발송
                </Button>
                <Button type="button" variant="outline" onClick={() => void refreshQueue()} disabled={isRefreshing}>
                  <MonitorUp className={`mr-1 h-4 w-4 ${isRefreshing ? "animate-pulse" : ""}`} />
                  지금 문의 가져오기
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-2xl border border-border/70 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <ListFilter className="h-4 w-4 text-slate-500" />
                  <span>현재 필터</span>
                  <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{actionSummary.total}건</Badge>
                  <Badge className="border border-amber-200 bg-amber-100 text-amber-700">승인대기 {actionSummary.pending}</Badge>
                  <Badge className="border border-rose-200 bg-rose-100 text-rose-700">주의 {actionSummary.warning}</Badge>
                  <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">선택 {actionSummary.selected}</Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                <div className="flex items-start gap-2">
                  <Bot className="mt-0.5 h-4 w-4 text-blue-700" />
                  <div>
                    <p className="font-semibold">다음 우선 처리 건</p>
                    {nextPriorityItem ? (
                      <p className="mt-1">
                        {nextPriorityItem.channelLabel} · {nextPriorityItem.customerName} · {nextPriorityItem.title}
                      </p>
                    ) : (
                      <p className="mt-1">현재 즉시 처리할 미발송 건이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
          <Card className="border-border/70">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">실제 클레임 Inbox</CardTitle>
                <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{filteredQueue.length}건</Badge>
              </div>
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="고객명, 상품명, 문의 내용 검색"
              />
              <div className="flex flex-wrap gap-2">
                {CHANNEL_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    type="button"
                    size="sm"
                    variant={channelFilter === filter.key ? "default" : "outline"}
                    onClick={() => setChannelFilter(filter.key)}
                  >
                    {filter.label}
                    {filter.key === "smartstore" ? ` ${channelCounts.smartstore}` : ""}
                    {filter.key === "makeshop" ? ` ${channelCounts.makeshop}` : ""}
                  </Button>
                ))}
              </div>
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
                {categoryOptions.map((option) => (
                  <Button
                    key={option.key}
                    type="button"
                    size="sm"
                    variant={categoryFilter === option.key ? "default" : "outline"}
                    onClick={() => setCategoryFilter(option.key)}
                  >
                    {option.label} {option.count}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" size="sm" variant="outline" onClick={toggleSelectAllFiltered}>
                  {allFilteredSelected ? "필터 전체 해제" : "필터 전체 선택"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={selectSendableInFilter}>
                  발송 가능 건만 선택
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={regenerateSelectedDrafts}>
                  선택 초안 재생성
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={moveSelectedToApproval}>
                  선택 승인대기
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ScrollArea className="h-[calc(100vh-355px)] min-h-[520px] pr-3">
                <div className="space-y-3">
                  {filteredQueue.length ? (
                    filteredQueue.map((item) => {
                      const isActive = selectedItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border px-3 py-3 transition ${
                            isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border/70 hover:border-primary/40"
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
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                                    {item.channelLabel}
                                  </Badge>
                                  <Badge className={STATUS_TONE[item.status]}>{QUEUE_STATUS_LABEL[item.status]}</Badge>
                                  {item.inquiryCategoryLabel && (
                                    <Badge className={CATEGORY_TONE[item.inquiryCategory || "general"]}>
                                      {item.inquiryCategoryLabel}
                                    </Badge>
                                  )}
                                  {attachmentSummary(item) && (
                                    <Badge className="border border-slate-200 bg-white text-slate-700">
                                      <ImageIcon className="mr-1 h-3.5 w-3.5" />
                                      {attachmentSummary(item)}
                                    </Badge>
                                  )}
                                </div>
                                <Badge
                                  className={
                                    item.urgency === "breach"
                                      ? "border border-rose-200 bg-rose-100 text-rose-700"
                                      : item.urgency === "warning"
                                        ? "border border-amber-200 bg-amber-100 text-amber-700"
                                        : "border border-slate-200 bg-slate-100 text-slate-700"
                                  }
                                >
                                  {URGENCY_LABEL[item.urgency]}
                                </Badge>
                              </div>
                              <p className="line-clamp-1 font-semibold leading-snug">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {item.customerName} · {item.assignee}
                                </span>
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
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {selectedItem && (
            <Card className="border-border/70">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                      {getInitials(selectedItem.customerName)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{selectedItem.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedItem.channelLabel} · {ITEM_TYPE_LABEL[selectedItem.itemType]} · 접수 {formatDate(selectedItem.receivedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={SEND_MODE_TONE[selectedItem.sendMode]}>{SEND_MODE_LABEL[selectedItem.sendMode]}</Badge>
                    <Badge className={VALIDATION_TONE[selectedItem.validationStatus]}>
                      {VALIDATION_LABEL[selectedItem.validationStatus]}
                    </Badge>
                    {selectedItem.inquiryCategoryLabel && (
                      <Badge className={CATEGORY_TONE[selectedItem.inquiryCategory || "general"]}>
                        {selectedItem.inquiryCategoryLabel}
                      </Badge>
                    )}
                    {attachmentSummary(selectedItem) && (
                      <Badge className="border border-slate-200 bg-white text-slate-700">{attachmentSummary(selectedItem)}</Badge>
                    )}
                    <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                      {URGENCY_LABEL[selectedItem.urgency]}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">고객</p>
                    <p className="font-medium">{selectedItem.customerName}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">상품</p>
                    <p className="font-medium">{selectedItem.productName ?? "미지정"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">문의 종류</p>
                    <p className="font-medium">{selectedItem.inquiryCategoryLabel ?? "분류 전"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">첨부/선택</p>
                    <p className="font-medium">
                      {attachmentSummary(selectedItem) ?? "첨부 없음"} · 선택 {selectedQueue.length}건
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="reply" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="reply">답변 작성</TabsTrigger>
                    <TabsTrigger value="source">원문/메모</TabsTrigger>
                    <TabsTrigger value="logs">실행 결과</TabsTrigger>
                    <TabsTrigger value="ops">운영 정보</TabsTrigger>
                  </TabsList>

                  <TabsContent value="reply" className="space-y-4">
                    <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">원문 빠른 확인</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">{selectedItem.body}</p>
                          {selectedItem.attachments?.length ? (
                            <p className="mt-2 text-xs text-slate-500">
                              첨부 {selectedItem.attachments.length}건이 있어 아래 원문/메모 탭에서 바로 확인할 수 있습니다.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => void copyText("원문", selectedItem.body)}>
                            <Clipboard className="mr-1 h-4 w-4" />
                            원문 복사
                          </Button>
                          {selectedItem.sourceUrl && (
                            <a
                              href={selectedItem.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-xs transition-[color,box-shadow] hover:bg-accent hover:text-accent-foreground"
                            >
                              <ArrowUpRight className="mr-1 h-4 w-4" />
                              {isGenericSourceUrl(selectedItem.sourceUrl) ? "관리자 열기" : "원문 열기"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-600" />
                          <p className="text-sm font-semibold">답변 초안</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => regenerateDraft(selectedItem)}>
                            <RefreshCw className="mr-1 h-4 w-4" />
                            AI 초안 재생성
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void copyText("답변", drafts[selectedItem.id] ?? selectedItem.aiDraft)}>
                            <Clipboard className="mr-1 h-4 w-4" />
                            답변 복사
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => toggleSelect(selectedItem.id)}>
                            <Layers3 className="mr-1 h-4 w-4" />
                            {selectedIds[selectedItem.id] ? "선택 해제" : "선택 추가"}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {draftPresets.map((preset) => (
                          <Button
                            key={preset.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => applyDraftPreset(selectedItem, preset.text)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>

                      <Textarea
                        className="min-h-[260px]"
                        value={drafts[selectedItem.id] ?? selectedItem.aiDraft}
                        onChange={(event) => {
                          updateDraft(selectedItem.id, event.target.value);
                          updateStatus(selectedItem.id, "editing");
                        }}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>발송 전에 문구를 한 번 더 읽고 톤을 맞춰주세요.</span>
                        <span>{selectedDraftLength}자</span>
                      </div>

                      <Textarea
                        className="min-h-[96px]"
                        value={notes[selectedItem.id] ?? ""}
                        onChange={(event) => updateNote(selectedItem.id, event.target.value)}
                        placeholder="내부 메모 / 재고 확인 / 고객별 주의사항"
                      />
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                      <p className="font-semibold">일괄 발송 준비 상태</p>
                      <p className="mt-1">
                        선택 건 {selectedQueue.length}건 · 직접 발송 가능 {selectedSendableQueue.length}건 · send endpoint 준비 채널{" "}
                        {liveDirectSources.length}개
                      </p>
                      <p className="mt-2 text-xs text-blue-800">
                        실제 발송을 누르면 직전에 플랫폼 최신 상태를 다시 조회합니다. 다른 담당자가 이미 답변한 건은 자동으로
                        제외됩니다.
                      </p>
                    </div>

                    {conflictWarnings.length ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                          <div className="space-y-2">
                            <p className="font-semibold">최근 충돌 방지 기록</p>
                            <div className="space-y-1">
                              {conflictWarnings.slice(0, 4).map((warning) => (
                                <p key={warning.id}>
                                  <span className="font-medium">{warning.title}</span> · {warning.message}
                                </p>
                              ))}
                              {conflictWarnings.length > 4 && <p>외 {conflictWarnings.length - 4}건</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="sticky bottom-0 rounded-2xl border border-border/70 bg-white/95 p-4 shadow-sm backdrop-blur">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => updateStatus(selectedItem.id, "approval_pending")}>
                          <MessageSquareQuote className="mr-1 h-4 w-4" />
                          승인 대기로 유지
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
                          <Send className="mr-1 h-4 w-4" />이 건 {displayDispatchMode(dispatchMode)}
                        </Button>
                        <Button type="button" onClick={() => setSendDialogOpen(true)} disabled={!selectedSendableQueue.length || isSending}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          선택 {selectedSendableQueue.length}건 {displayDispatchMode(dispatchMode)}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="source" className="space-y-4">
                    <div className="rounded-2xl border border-border/70 p-4 space-y-3">
                      <p className="text-sm font-semibold">원문</p>
                      <p className="text-sm leading-6 text-foreground">{selectedItem.body}</p>
                      <Separator />
                      <div className="grid gap-3 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-muted-foreground">문의 종류</p>
                          <p>{selectedItem.inquiryCategoryLabel ?? "분류 전"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">플랫폼 상태</p>
                          <p>{selectedItem.externalStatus || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">raw payload</p>
                          <p>{selectedItem.rawPayloadSummary}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">내부 메모</p>
                          <p className="whitespace-pre-wrap">{notes[selectedItem.id] || selectedItem.internalNote || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">source kind</p>
                          <p>{selectedItem.sourceKind || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">주문/상품</p>
                          <p>
                            {selectedItem.orderId || "-"} / {selectedItem.productId || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">첨부 이미지 / 파일</p>
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                          {selectedItem.attachments?.length ?? 0}건
                        </Badge>
                      </div>
                      {selectedItem.attachments?.length ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {selectedItem.attachments.map((attachment, index) => {
                            const isImage = attachment.kind !== "file";
                            return (
                              <a
                                key={`${attachment.url}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group overflow-hidden rounded-2xl border border-border/70 bg-slate-50"
                              >
                                {isImage ? (
                                  <img
                                    src={attachment.url}
                                    alt={attachment.label || `첨부 이미지 ${index + 1}`}
                                    className="h-44 w-full object-cover transition group-hover:scale-[1.02]"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-44 items-center justify-center bg-slate-100 text-slate-500">
                                    <ImageIcon className="h-8 w-8" />
                                  </div>
                                )}
                                <div className="space-y-1 p-3 text-sm">
                                  <p className="font-medium">{attachment.label || `첨부 ${index + 1}`}</p>
                                  <p className="line-clamp-2 text-xs text-slate-500">{attachment.url}</p>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                          이 문의에는 OMX로 가져온 첨부가 없습니다. 스마트스토어는 현재 공식 API 기준으로 이미지가 내려오지 않을 수
                          있고, 메이크샵은 첨부가 있으면 여기서 바로 미리보기됩니다.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="logs" className="space-y-4">
                    <div className="rounded-2xl border border-border/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">최근 실행 결과</p>
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{executionLogs.length}건</Badge>
                      </div>
                      {executionLogs.length ? (
                        <ScrollArea className="h-[360px] pr-3">
                          <div className="space-y-2">
                            {executionLogs.map((log) => (
                              <div
                                key={log.id}
                                className={`rounded-xl border px-3 py-2 text-sm ${
                                  log.ok ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-rose-200 bg-rose-50 text-rose-950"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-medium">
                                    {log.channelLabel} · {log.customerName}
                                  </p>
                                  <span className="text-xs opacity-80">{formatDate(log.createdAt)}</span>
                                </div>
                                <p className="mt-1 line-clamp-1">{log.title}</p>
                                <p className="mt-1 text-xs opacity-80">
                                  {displayDispatchMode(log.dispatchMode)} · {log.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground">아직 실행 이력이 없습니다. 먼저 발송 전 확인으로 한 번 점검해보세요.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ops" className="space-y-4">
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

                    <div className="grid gap-3 xl:grid-cols-2">
                      {activeCapabilities.map((capability) => (
                        <div key={capability.id} className="rounded-2xl border border-border/70 p-4">
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
                          <p className="mt-3 text-sm text-muted-foreground">{capability.currentDecision}</p>
                          {capability.blocker && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                              blocker: {capability.blocker}
                            </div>
                          )}
                          <p className="mt-3 text-sm text-muted-foreground">next: {capability.nextAction}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                      {OMX_RUNBOOK.map((step) => (
                        <div key={step.id} className="rounded-2xl border border-border/70 p-4">
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
                          <p className="mt-2 text-sm text-muted-foreground">{step.summary}</p>
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                            exit: {step.exitCriteria}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dispatchMode === "DRY_RUN" ? "발송 전 확인" : "실제 발송 확인"}</DialogTitle>
            <DialogDescription>
              {dispatchMode === "DRY_RUN"
                ? `선택된 ${selectedSendableQueue.length}건을 실제 발송 없이 먼저 점검합니다. 문구와 연동 상태를 먼저 확인하세요.`
                : `선택된 ${selectedSendableQueue.length}건을 실제 고객에게 발송합니다. 발송 직전에 플랫폼 최신 상태를 다시 확인하며, 이미 처리된 문의는 자동 제외됩니다.`}
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
            {dispatchMode === "LIVE_SEND" && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="font-semibold text-rose-950">실발송 확인</p>
                <p className="mt-1 text-rose-900">
                  실제 고객에게 발송됩니다. 계속하려면 아래에 <span className="font-semibold">실제 발송</span>을 입력하세요.
                </p>
                <Input
                  className="mt-3 bg-white"
                  value={liveConfirmText}
                  onChange={(event) => setLiveConfirmText(event.target.value)}
                  placeholder="실제 발송"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void handleSendConfirmed()}
              disabled={isSending || !selectedSendableQueue.length || !liveSendConfirmed}
            >
              {isSending ? "처리 중..." : `${displayDispatchMode(dispatchMode)} 실행`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
