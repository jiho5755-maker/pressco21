import {
  OMX_CAPABILITIES,
  OMX_QUEUE_ITEMS,
  type OmxAttachment,
  type OmxInquiryCategory,
  type OmxItemType,
  type OmxQueueItem,
  type OmxQueueStatus,
  type OmxSendMode,
  type OmxUrgency,
  type OmxValidationStatus,
} from "@/lib/omx";

type OmxChannel = "smartstore" | "makeshop";
export type OmxWorkspaceMode = "mock" | "live" | "partial";
export type OmxDispatchMode = "DRY_RUN" | "LIVE_SEND";

interface OmxChannelConfig {
  channel: OmxChannel;
  channelLabel: string;
  fetchUrl: string;
  sendUrl: string;
}

interface OmxRuntimeConfigFile {
  forceMock?: boolean;
  sharedKey?: string;
  VITE_OMX_FORCE_MOCK?: boolean | string;
  VITE_OMX_SHARED_KEY?: string;
  smartstore?: Partial<Omit<OmxChannelConfig, "channel" | "channelLabel">>;
  makeshop?: Partial<Omit<OmxChannelConfig, "channel" | "channelLabel">>;
  VITE_OMX_SMARTSTORE_FETCH_URL?: string;
  VITE_OMX_SMARTSTORE_SEND_URL?: string;
  VITE_OMX_MAKESHOP_FETCH_URL?: string;
  VITE_OMX_MAKESHOP_SEND_URL?: string;
}

interface OmxResolvedConfig {
  sharedKey: string;
  forceMock: boolean;
  source: "env" | "runtime" | "merged";
  channels: OmxChannelConfig[];
}

export interface OmxSourceState {
  channel: OmxChannel;
  channelLabel: string;
  fetchConfigured: boolean;
  sendConfigured: boolean;
  fetchOk: boolean;
  sendOk: boolean;
  configuredMode: "live" | "mock";
  lastFetchedAt?: string;
  lastResultCount?: number;
  lastError?: string;
  metaSummary?: string;
  fetchUrl?: string;
  sendUrl?: string;
  configSource?: "env" | "runtime" | "merged";
}

interface OmxAdapterItem {
  id?: string | number;
  orderId?: string;
  productId?: string;
  productName?: string;
  customerName?: string;
  subject?: string;
  title?: string;
  body?: string;
  content?: string;
  status?: string;
  answered?: boolean;
  receivedAt?: string;
  createDate?: string;
  url?: string;
  sourceKind?: string;
  itemType?: OmxItemType;
  answerPreview?: string;
  rawCategory?: string;
  rawPayloadSummary?: string;
  tags?: string[];
  assignee?: string;
  attach?: string;
  attachments?: Array<{ url?: string; label?: string; kind?: "image" | "file" }>;
}

interface OmxAdapterFetchResponse {
  items?: OmxAdapterItem[];
  meta?: Record<string, unknown>;
}

interface OmxAdapterSendResponse {
  results?: Array<{
    id?: string;
    ok?: boolean;
    message?: string;
    externalStatus?: string;
    statusCode?: number;
  }>;
  meta?: Record<string, unknown>;
  message?: string;
}

export interface OmxSendResult {
  id: string;
  channel: OmxChannel;
  ok: boolean;
  message: string;
  dispatchMode: OmxDispatchMode;
  externalStatus?: string;
  statusCode?: number;
}

export interface OmxWorkspaceResponse {
  items: OmxQueueItem[];
  mode: OmxWorkspaceMode;
  sourceStates: OmxSourceState[];
  fetchedAt: string;
  configSummary: OmxLiveConfigSummary;
}

export interface OmxLiveConfigSummary {
  forceMock: boolean;
  hasSharedKey: boolean;
  authMode: "shared_key" | "proxy" | "none";
  sourceLabel: "env" | "runtime" | "merged";
  fetchConfiguredCount: number;
  sendConfiguredCount: number;
}

const ENV_SHARED_KEY = String(import.meta.env.VITE_OMX_SHARED_KEY || "").trim();
const ENV_FORCE_MOCK = String(import.meta.env.VITE_OMX_FORCE_MOCK || "").trim().toLowerCase() === "true";

const ENV_CHANNEL_CONFIGS: OmxChannelConfig[] = [
  {
    channel: "smartstore",
    channelLabel: "스마트스토어",
    fetchUrl: String(import.meta.env.VITE_OMX_SMARTSTORE_FETCH_URL || "").trim(),
    sendUrl: String(import.meta.env.VITE_OMX_SMARTSTORE_SEND_URL || "").trim(),
  },
  {
    channel: "makeshop",
    channelLabel: "메이크샵",
    fetchUrl: String(import.meta.env.VITE_OMX_MAKESHOP_FETCH_URL || "").trim(),
    sendUrl: String(import.meta.env.VITE_OMX_MAKESHOP_SEND_URL || "").trim(),
  },
];

const ACTIVE_CHANNELS = new Set<OmxChannel>(["smartstore", "makeshop"]);
let omxResolvedConfigPromise: Promise<OmxResolvedConfig> | null = null;

function buildHeaders(sharedKey: string, hasJsonBody = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }
  if (sharedKey) {
    headers["x-omx-source-key"] = sharedKey;
  }
  return headers;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function applyChannelOverride(
  base: OmxChannelConfig,
  nested: Partial<Omit<OmxChannelConfig, "channel" | "channelLabel">> | undefined,
  flatFetchUrl: string | undefined,
  flatSendUrl: string | undefined,
): OmxChannelConfig {
  return {
    ...base,
    fetchUrl: String(nested?.fetchUrl || flatFetchUrl || base.fetchUrl || "").trim(),
    sendUrl: String(nested?.sendUrl || flatSendUrl || base.sendUrl || "").trim(),
  };
}

async function loadOmxRuntimeConfigFile(): Promise<OmxRuntimeConfigFile | null> {
  try {
    const response = await fetch("/omx-config.json", {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as OmxRuntimeConfigFile;
  } catch {
    return null;
  }
}

async function resolveOmxConfig(): Promise<OmxResolvedConfig> {
  if (!omxResolvedConfigPromise) {
    omxResolvedConfigPromise = (async () => {
      const runtime = await loadOmxRuntimeConfigFile();
      if (!runtime) {
        return {
          sharedKey: ENV_SHARED_KEY,
          forceMock: ENV_FORCE_MOCK,
          source: "env",
          channels: ENV_CHANNEL_CONFIGS,
        };
      }

      const runtimeForceMock =
        normalizeBoolean(runtime.forceMock) ?? normalizeBoolean(runtime.VITE_OMX_FORCE_MOCK);
      const runtimeSharedKey = String(runtime.sharedKey || runtime.VITE_OMX_SHARED_KEY || "").trim();
      const channels = ENV_CHANNEL_CONFIGS.map((config) => {
        if (config.channel === "smartstore") {
          return applyChannelOverride(
            config,
            runtime.smartstore,
            runtime.VITE_OMX_SMARTSTORE_FETCH_URL,
            runtime.VITE_OMX_SMARTSTORE_SEND_URL,
          );
        }
        return applyChannelOverride(
          config,
          runtime.makeshop,
          runtime.VITE_OMX_MAKESHOP_FETCH_URL,
          runtime.VITE_OMX_MAKESHOP_SEND_URL,
        );
      });

      const hasRuntimeOverride =
        runtimeForceMock !== undefined ||
        Boolean(runtimeSharedKey) ||
        channels.some((channel, index) => {
          const envChannel = ENV_CHANNEL_CONFIGS[index];
          return channel.fetchUrl !== envChannel.fetchUrl || channel.sendUrl !== envChannel.sendUrl;
        });

      return {
        sharedKey: runtimeSharedKey || ENV_SHARED_KEY,
        forceMock: runtimeForceMock ?? ENV_FORCE_MOCK,
        source: hasRuntimeOverride ? (ENV_SHARED_KEY || ENV_FORCE_MOCK || ENV_CHANNEL_CONFIGS.some((config) => config.fetchUrl || config.sendUrl) ? "merged" : "runtime") : "env",
        channels,
      };
    })();
  }

  return omxResolvedConfigPromise;
}

function toConfigSummary(config: OmxResolvedConfig): OmxLiveConfigSummary {
  const hasProxyRoute = config.channels.some((channel) =>
    [channel.fetchUrl, channel.sendUrl].some((url) => Boolean(url) && url.startsWith("/")),
  );
  return {
    forceMock: config.forceMock,
    hasSharedKey: Boolean(config.sharedKey),
    authMode: config.sharedKey ? "shared_key" : hasProxyRoute ? "proxy" : "none",
    sourceLabel: config.source,
    fetchConfiguredCount: config.channels.filter((channel) => Boolean(channel.fetchUrl)).length,
    sendConfiguredCount: config.channels.filter((channel) => Boolean(channel.sendUrl)).length,
  };
}

function parseDate(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function normalizeItemType(item: OmxAdapterItem): OmxItemType {
  if (item.itemType === "review" || item.itemType === "chat" || item.itemType === "inquiry") {
    return item.itemType;
  }
  const sourceKind = String(item.sourceKind || "").toLowerCase();
  if (sourceKind.includes("review")) {
    return "review";
  }
  return "inquiry";
}

function normalizeStatus(rawStatus: string | undefined, answered: boolean | undefined, answerPreview: string | undefined): "OPEN" | "ANSWERED" {
  if (answered) {
    return "ANSWERED";
  }
  if (String(answerPreview || "").trim()) {
    return "ANSWERED";
  }
  const normalized = String(rawStatus || "").trim().toUpperCase();
  if (!normalized) {
    return "OPEN";
  }
  if (["ANSWERED", "ANSWER", "CLOSED", "DONE", "COMPLETE"].some((token) => normalized.includes(token))) {
    return "ANSWERED";
  }
  return "OPEN";
}

function calculateUrgency(receivedAt: string): OmxUrgency {
  const diffHours = (Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60);
  if (diffHours >= 24) {
    return "breach";
  }
  if (diffHours >= 12) {
    return "warning";
  }
  return "ok";
}

function deriveQueueStatus(sendMode: OmxSendMode, answered: "OPEN" | "ANSWERED"): OmxQueueStatus {
  if (answered === "ANSWERED") {
    return "sent";
  }
  if (sendMode === "manual_send" || sendMode === "draft_only") {
    return "manual_required";
  }
  if (sendMode === "disabled") {
    return "new";
  }
  return "approval_pending";
}

function summarizeMeta(meta?: Record<string, unknown>): string | undefined {
  if (!meta) {
    return undefined;
  }
  const entries = Object.entries(meta)
    .filter(([, value]) => value != null && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key}=${String(value)}`);
  return entries.length ? entries.join(", ") : undefined;
}

function classifyInquiry(text: string): Exclude<OmxInquiryCategory, "review"> {
  if (/(사업자|도매|대량견적|세금계산서)/.test(text)) {
    return "business";
  }
  if (/(불량|고장|파손|깨짐|문제|나사|불빛|점등)/.test(text)) {
    return "defect";
  }
  if (/(비율|사용법|경화|굳|혼합|처음)/.test(text)) {
    return "usage";
  }
  if (/(재고|입고|품절|대량)/.test(text)) {
    return "stock";
  }
  if (/(배송|출고|송장|언제)/.test(text)) {
    return "delivery";
  }
  if (/(반품|교환|환불)/.test(text)) {
    return "return";
  }
  return "general";
}

function toInquiryCategory(itemType: OmxItemType, text: string): OmxInquiryCategory {
  if (itemType === "review") {
    return "review";
  }
  return classifyInquiry(text) as OmxInquiryCategory;
}

function inquiryCategoryLabel(category: OmxInquiryCategory): string {
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
    default:
      return "일반";
  }
}

function normalizeAttachmentUrl(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("http://")) {
    return `https://${raw.slice("http://".length)}`;
  }
  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }
  return raw;
}

function extractAttachments(item: OmxAdapterItem): OmxAttachment[] {
  const attachments: OmxAttachment[] = [];
  const addAttachment = (url: string, label?: string, kind: "image" | "file" = "image") => {
    const normalized = normalizeAttachmentUrl(url);
    if (!normalized || attachments.some((attachment) => attachment.url === normalized)) {
      return;
    }
    attachments.push({ url: normalized, label, kind });
  };

  if (typeof item.attach === "string") {
    item.attach
      .split(/[,\n]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((url, index) => addAttachment(url, `첨부 ${index + 1}`));
  }

  if (Array.isArray(item.attachments)) {
    item.attachments.forEach((attachment, index) => {
      if (!attachment?.url) return;
      addAttachment(attachment.url, attachment.label || `첨부 ${index + 1}`, attachment.kind || "image");
    });
  }

  return attachments;
}

export function generateOmxDraft(item: Pick<OmxQueueItem, "itemType" | "body" | "productName" | "customerName">): string {
  if (item.itemType === "review") {
    return `소중한 후기 감사합니다. ${item.productName ? `${item.productName}을` : "상품을"} 만족스럽게 받아보셨다니 다행입니다. 다음 작업에서도 좋은 컨디션으로 받아보실 수 있도록 꼼꼼하게 준비하겠습니다.`;
  }

  const classification = classifyInquiry(`${item.body} ${item.productName || ""}`);
  if (classification === "usage") {
    return `안녕하세요 :) 문의주신 내용 확인했습니다. ${item.productName ? `${item.productName} 작업 시에는` : "작업 시에는"} 비율을 정확히 맞춰 충분히 섞어주시고, 본 작업 전 소량 테스트를 먼저 진행해보시는 것을 권장드립니다. 작업 환경에 수분이나 먼지가 들어가지 않도록 함께 주의해 주세요.`;
  }
  if (classification === "stock") {
    return `안녕하세요. 문의주신 재고/입고 여부를 확인해 안내드리겠습니다. ${item.productName ? `${item.productName}` : "상품"}은 재고 상황에 따라 구성이나 발송 시점이 달라질 수 있어, 현재 기준 가능 수량을 먼저 확인한 뒤 다시 안내드리겠습니다.`;
  }
  if (classification === "delivery") {
    return `안녕하세요. 문의주신 주문/배송 상태를 확인한 뒤 정확한 일정으로 안내드리겠습니다. 출고 여부와 송장 반영 시간을 먼저 확인하고, 확인되는 대로 빠르게 답변드리겠습니다.`;
  }
  if (classification === "defect") {
    return `안녕하세요. 불편을 드려 죄송합니다. 문의주신 내용 기준으로 ${item.productName ? `${item.productName}의` : "상품의"} 상태와 출고 이력을 먼저 확인하겠습니다. 사진이나 증상이 확인되면 교환/재발송 가능 여부까지 함께 정리해서 빠르게 안내드리겠습니다.`;
  }
  if (classification === "business") {
    return `안녕하세요. 문의주신 사업자/대량 주문 관련 내용을 확인했습니다. ${item.productName ? `${item.productName}` : "상품"}의 공급 가능 수량과 거래 조건을 먼저 확인한 뒤, 필요한 안내 사항을 정리해서 다시 답변드리겠습니다.`;
  }
  if (classification === "return") {
    return `안녕하세요. 문의주신 교환/반품 가능 여부를 확인해 안내드리겠습니다. 주문 상태와 상품 상태 기준을 먼저 확인한 뒤 진행 가능한 절차를 정리해서 다시 답변드리겠습니다.`;
  }
  return `안녕하세요. 문의주신 내용 확인했습니다. ${item.productName ? `${item.productName} 관련` : ""} 상세 내용을 확인한 뒤 가장 정확한 기준으로 안내드리겠습니다. 추가 확인이 필요한 항목은 내부 확인 후 바로 다시 답변드리겠습니다.`;
}

function buildCapabilityIndex() {
  const index = new Map<string, { sendMode: OmxSendMode; validationStatus: OmxValidationStatus }>();
  OMX_CAPABILITIES.forEach((capability) => {
    if (!ACTIVE_CHANNELS.has(capability.channel as OmxChannel)) {
      return;
    }
    index.set(`${capability.channel}:${capability.itemType}`, {
      sendMode: capability.sendMode,
      validationStatus: capability.validationStatus,
    });
  });
  return index;
}

function toQueueItem(
  config: OmxChannelConfig,
  adapterItem: OmxAdapterItem,
  metaSummary: string | undefined,
  capabilityIndex: Map<string, { sendMode: OmxSendMode; validationStatus: OmxValidationStatus }>,
): OmxQueueItem | null {
  const id = String(adapterItem.id || "").trim();
  if (!id) {
    return null;
  }

  const itemType = normalizeItemType(adapterItem);
  const capability = capabilityIndex.get(`${config.channel}:${itemType}`);
  const sendMode = capability?.sendMode ?? "manual_send";
  const validationStatus = capability?.validationStatus ?? "pending";
  const body = String(adapterItem.body || adapterItem.content || "").trim();
  const subject = String(adapterItem.subject || adapterItem.title || "").trim();
  const receivedAt = parseDate(adapterItem.receivedAt || adapterItem.createDate);
  const externalStatus = normalizeStatus(adapterItem.status, adapterItem.answered, adapterItem.answerPreview);
  const category = toInquiryCategory(itemType, `${subject} ${body} ${adapterItem.rawCategory || ""}`);
  const attachments = extractAttachments(adapterItem);
  const aiDraft = generateOmxDraft({
    itemType,
    body,
    productName: adapterItem.productName,
    customerName: adapterItem.customerName || "고객",
  });

  return {
    id,
    channel: config.channel,
    channelLabel: config.channelLabel,
    itemType,
    sendMode,
    validationStatus,
    status: deriveQueueStatus(sendMode, externalStatus),
    urgency: calculateUrgency(receivedAt),
    customerName: String(adapterItem.customerName || "고객").trim() || "고객",
    title: subject || (itemType === "review" ? "리뷰" : "문의"),
    body: body || "원문이 비어 있습니다.",
    productName: String(adapterItem.productName || "").trim() || undefined,
    productId: String(adapterItem.productId || "").trim() || undefined,
    orderId: String(adapterItem.orderId || "").trim() || undefined,
    receivedAt,
    assignee: String(adapterItem.assignee || "이재혁").trim() || "이재혁",
    aiDraft,
    finalReply: externalStatus === "ANSWERED" && adapterItem.answerPreview ? String(adapterItem.answerPreview) : undefined,
    internalNote: metaSummary,
    sourceUrl: String(adapterItem.url || "").trim() || undefined,
    sourceKind: String(adapterItem.sourceKind || itemType).trim() || undefined,
    externalStatus,
    sourcePayload: adapterItem as unknown as Record<string, unknown>,
    rawPayloadSummary: String(adapterItem.rawPayloadSummary || metaSummary || `${config.channel} adapter`),
    tags: Array.isArray(adapterItem.tags) ? adapterItem.tags : [config.channelLabel, itemType === "review" ? "리뷰" : "문의"],
    inquiryCategory: category,
    inquiryCategoryLabel: inquiryCategoryLabel(category),
    attachments,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export async function fetchOmxWorkspace(): Promise<OmxWorkspaceResponse> {
  const fetchedAt = new Date().toISOString();
  const capabilityIndex = buildCapabilityIndex();
  const resolvedConfig = await resolveOmxConfig();
  const configSummary = toConfigSummary(resolvedConfig);
  const baseStates: OmxSourceState[] = resolvedConfig.channels.map((config) => ({
    channel: config.channel,
    channelLabel: config.channelLabel,
    fetchConfigured: Boolean(config.fetchUrl),
    sendConfigured: Boolean(config.sendUrl),
    fetchOk: false,
    sendOk: Boolean(config.sendUrl),
    configuredMode: config.fetchUrl && !resolvedConfig.forceMock ? "live" : "mock",
    fetchUrl: config.fetchUrl || undefined,
    sendUrl: config.sendUrl || undefined,
    configSource: resolvedConfig.source,
  }));

  if (resolvedConfig.forceMock || !resolvedConfig.channels.some((config) => config.fetchUrl)) {
    return {
      items: OMX_QUEUE_ITEMS.filter((item) => ACTIVE_CHANNELS.has(item.channel as OmxChannel)),
      mode: "mock",
      sourceStates: baseStates,
      fetchedAt,
      configSummary,
    };
  }

  const queueItems: OmxQueueItem[] = [];
  const sourceStates = await Promise.all(
    resolvedConfig.channels.map(async (config, index): Promise<OmxSourceState> => {
      if (!config.fetchUrl) {
        return baseStates[index];
      }

      try {
        const response = await fetch(config.fetchUrl, {
          headers: buildHeaders(resolvedConfig.sharedKey, false),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await parseJsonResponse<OmxAdapterFetchResponse>(response);
        const items = Array.isArray(payload.items) ? payload.items : [];
        const metaSummary = summarizeMeta(payload.meta);
        items.forEach((item) => {
          const normalized = toQueueItem(config, item, metaSummary, capabilityIndex);
          if (normalized) {
            queueItems.push(normalized);
          }
        });
        return {
          ...baseStates[index],
          fetchOk: true,
          sendOk: Boolean(config.sendUrl),
          lastFetchedAt: fetchedAt,
          lastResultCount: items.length,
          metaSummary,
        };
      } catch (error) {
        return {
          ...baseStates[index],
          lastFetchedAt: fetchedAt,
          lastError: error instanceof Error ? error.message : "unknown_error",
        };
      }
    }),
  );

  const successCount = sourceStates.filter((state) => state.fetchOk).length;
  if (!successCount) {
    return {
      items: OMX_QUEUE_ITEMS.filter((item) => ACTIVE_CHANNELS.has(item.channel as OmxChannel)),
      mode: "mock",
      sourceStates,
      fetchedAt,
      configSummary,
    };
  }

  queueItems.sort((left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime());
  return {
    items: queueItems,
    mode: successCount === sourceStates.filter((state) => state.fetchConfigured).length ? "live" : "partial",
    sourceStates,
    fetchedAt,
    configSummary,
  };
}

export async function preflightOmxSend(items: OmxQueueItem[]): Promise<{
  blockedIds: string[];
  latestWorkspace: OmxWorkspaceResponse;
  blockedMap: Map<string, string>;
}> {
  const latestWorkspace = await fetchOmxWorkspace();
  const latestMap = new Map(latestWorkspace.items.map((item) => [item.id, item]));
  const blockedMap = new Map<string, string>();

  items.forEach((item) => {
    const latest = latestMap.get(item.id);
    if (!latest) {
      blockedMap.set(item.id, "플랫폼 최신 조회에서 이 문의를 찾지 못했습니다. 다시 확인이 필요합니다.");
      return;
    }
    if (latest.status === "sent" || latest.externalStatus === "ANSWERED") {
      blockedMap.set(item.id, "이미 플랫폼에서 답변 완료된 문의입니다. 중복 발송을 막기 위해 제외했습니다.");
    }
  });

  return {
    blockedIds: Array.from(blockedMap.keys()),
    latestWorkspace,
    blockedMap,
  };
}

export async function sendOmxReplies(
  items: OmxQueueItem[],
  drafts: Record<string, string>,
  dispatchMode: OmxDispatchMode,
): Promise<OmxSendResult[]> {
  const results: OmxSendResult[] = [];
  const resolvedConfig = await resolveOmxConfig();
  const grouped = new Map<OmxChannel, OmxQueueItem[]>();

  items.forEach((item) => {
    const channel = item.channel as OmxChannel;
    if (!ACTIVE_CHANNELS.has(channel)) {
      return;
    }
    const bucket = grouped.get(channel) || [];
    bucket.push(item);
    grouped.set(channel, bucket);
  });

  for (const config of resolvedConfig.channels) {
    const channelItems = grouped.get(config.channel) || [];
    if (!channelItems.length) {
      continue;
    }

    if (!config.sendUrl) {
      channelItems.forEach((item) => {
        results.push({
          id: item.id,
          channel: config.channel,
          ok: false,
          message: "send endpoint가 설정되지 않았습니다.",
          dispatchMode,
        });
      });
      continue;
    }

    const body = {
      mode: dispatchMode,
      items: channelItems.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        sourceKind: item.sourceKind,
        reply: drafts[item.id] || item.finalReply || item.aiDraft,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        customerName: item.customerName,
        title: item.title,
        receivedAt: item.receivedAt,
        sourcePayload: item.sourcePayload,
      })),
    };

    try {
      const response = await fetch(config.sendUrl, {
        method: "POST",
        headers: buildHeaders(resolvedConfig.sharedKey, true),
        body: JSON.stringify(body),
      });

      const payload = response.status === 204 ? {} : await parseJsonResponse<OmxAdapterSendResponse>(response);
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      const resultMap = new Map(
        (payload.results || []).map((result) => [
          String(result.id || ""),
          {
            ok: result.ok !== false,
            message: result.message || (dispatchMode === "LIVE_SEND" ? "전송 완료" : "DRY_RUN 완료"),
            externalStatus: result.externalStatus,
            statusCode: result.statusCode,
          },
        ]),
      );

      channelItems.forEach((item) => {
        const matched = resultMap.get(item.id);
        results.push({
          id: item.id,
          channel: config.channel,
          ok: matched?.ok ?? true,
          message: matched?.message || (dispatchMode === "LIVE_SEND" ? "전송 완료" : "DRY_RUN 완료"),
          dispatchMode,
          externalStatus: matched?.externalStatus,
          statusCode: matched?.statusCode ?? response.status,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "send_failed";
      channelItems.forEach((item) => {
        results.push({
          id: item.id,
          channel: config.channel,
          ok: false,
          message,
          dispatchMode,
        });
      });
    }
  }

  return results;
}

export async function getOmxLiveConfigSummary(): Promise<OmxLiveConfigSummary> {
  const resolvedConfig = await resolveOmxConfig();
  return toConfigSummary(resolvedConfig);
}
