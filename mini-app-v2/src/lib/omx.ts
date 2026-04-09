export type OmxItemType = "inquiry" | "review" | "chat";
export type OmxIngestMode = "api" | "webhook" | "scrape" | "manual";
export type OmxSendMode = "direct_send" | "manual_send" | "draft_only" | "disabled";
export type OmxValidationStatus = "verified" | "doc_only" | "template_verified" | "blocked" | "pending";
export type OmxQueueStatus =
  | "new"
  | "draft_ready"
  | "editing"
  | "approval_pending"
  | "sent"
  | "manual_required";
export type OmxUrgency = "ok" | "warning" | "breach";

export interface OmxCapability {
  id: string;
  channel: string;
  channelLabel: string;
  itemType: OmxItemType;
  ingestMode: OmxIngestMode;
  sendMode: OmxSendMode;
  validationStatus: OmxValidationStatus;
  priority: 1 | 2 | 3;
  currentDecision: string;
  blocker?: string;
  nextAction: string;
}

export interface OmxQueueItem {
  id: string;
  channel: string;
  channelLabel: string;
  itemType: OmxItemType;
  sendMode: OmxSendMode;
  validationStatus: OmxValidationStatus;
  status: OmxQueueStatus;
  urgency: OmxUrgency;
  customerName: string;
  title: string;
  body: string;
  productName?: string;
  orderId?: string;
  receivedAt: string;
  assignee: string;
  aiDraft: string;
  finalReply?: string;
  internalNote?: string;
  sourceUrl?: string;
  rawPayloadSummary: string;
  tags: string[];
}

export interface OmxRunbookStep {
  id: string;
  title: string;
  owner: string;
  status: "active" | "next" | "hold";
  summary: string;
  exitCriteria: string;
}

export const OMX_CAPABILITIES: OmxCapability[] = [
  {
    id: "smartstore-inquiry",
    channel: "smartstore",
    channelLabel: "스마트스토어",
    itemType: "inquiry",
    ingestMode: "api",
    sendMode: "direct_send",
    validationStatus: "verified",
    priority: 1,
    currentDecision: "v1 direct send",
    nextAction: "OM adapter와 승인형 발송 버튼 연결",
  },
  {
    id: "smartstore-review",
    channel: "smartstore",
    channelLabel: "스마트스토어",
    itemType: "review",
    ingestMode: "manual",
    sendMode: "draft_only",
    validationStatus: "blocked",
    priority: 1,
    currentDecision: "초안 전용",
    blocker: "공개 리뷰 답변 API 미확인",
    nextAction: "리뷰 큐와 수동 반영 프로세스 구현",
  },
  {
    id: "coupang-inquiry",
    channel: "coupang",
    channelLabel: "쿠팡",
    itemType: "inquiry",
    ingestMode: "api",
    sendMode: "direct_send",
    validationStatus: "doc_only",
    priority: 1,
    currentDecision: "실read 검증 완료, direct send 후보",
    blocker: "사방넷 병행 유지 여부 미확정, 실write 미실행",
    nextAction: "사방넷 정상 동작 확인 후 승인형 write 1회 검증",
  },
  {
    id: "coupang-review",
    channel: "coupang",
    channelLabel: "쿠팡",
    itemType: "review",
    ingestMode: "manual",
    sendMode: "draft_only",
    validationStatus: "blocked",
    priority: 1,
    currentDecision: "초안 전용",
    blocker: "공개 리뷰 답변 API 미확인",
    nextAction: "리뷰 모니터링과 템플릿 큐만 우선 구현",
  },
  {
    id: "makeshop-inquiry",
    channel: "makeshop",
    channelLabel: "메이크샵",
    itemType: "inquiry",
    ingestMode: "api",
    sendMode: "direct_send",
    validationStatus: "doc_only",
    priority: 1,
    currentDecision: "실read 검증 완료, 승인 후 direct send 후보",
    blocker: "실write는 아직 미실행",
    nextAction: "crm_board reply + board comment API를 승인된 테스트 케이스로 1회 검증",
  },
  {
    id: "makeshop-review",
    channel: "makeshop",
    channelLabel: "메이크샵",
    itemType: "review",
    ingestMode: "api",
    sendMode: "direct_send",
    validationStatus: "doc_only",
    priority: 1,
    currentDecision: "실read 검증 완료, 승인형 답변 후보",
    blocker: "실write는 아직 미실행",
    nextAction: "review save_type=answer 시나리오를 승인된 테스트 케이스로 1회 검증",
  },
  {
    id: "channeltalk-chat",
    channel: "channeltalk",
    channelLabel: "채널톡",
    itemType: "chat",
    ingestMode: "webhook",
    sendMode: "direct_send",
    validationStatus: "blocked",
    priority: 2,
    currentDecision: "가격 검토 전 보류",
    blocker: "무료 플랜에서 Open API/Webhooks 운영 여부 불확실",
    nextAction: "유료 또는 체험 가능 시 활성화, 아니면 제외",
  },
  {
    id: "11st-inquiry",
    channel: "11st",
    channelLabel: "11번가",
    itemType: "inquiry",
    ingestMode: "manual",
    sendMode: "disabled",
    validationStatus: "pending",
    priority: 3,
    currentDecision: "후속 단계 보류",
    blocker: "문의/고객센터 답변 API 미확인",
    nextAction: "고객센터 회신 또는 추가 문서 확보 후 재평가",
  },
];

export const OMX_QUEUE_ITEMS: OmxQueueItem[] = [
  {
    id: "ss-669968949",
    channel: "smartstore",
    channelLabel: "스마트스토어",
    itemType: "inquiry",
    sendMode: "direct_send",
    validationStatus: "verified",
    status: "sent",
    urgency: "ok",
    customerName: "shsh****",
    title: "하바리움 용액 1kg 주문 시 A/B 용량 문의",
    body: "하바리움 용액 1kg 주문시 A제 B제가 500g씩 오는걸까요? 처음 해보는건데 가장 주의해야 할 점이 무엇일까요?",
    productName: "부케 액자 DIY 웨딩액자 고체 하바리움액자 투명 아크릴 포토 케이스",
    orderId: "",
    receivedAt: "2026-04-08T20:16:00+09:00",
    assignee: "이재혁",
    aiDraft:
      "안녕하세요 :) 1kg 옵션 주문 시 A제와 B제가 각각 500g씩 발송됩니다. 처음 작업하실 때는 A/B 비율을 정확히 맞춰 충분히 섞어주시고, 본 작업 전에 소량으로 먼저 테스트해보시는 것을 권장드립니다. 작업 시에는 수분이나 먼지가 들어가지 않도록 주의해 주세요. 감사합니다.",
    finalReply:
      "안녕하세요 :) 1kg 옵션 주문 시 A제와 B제가 각각 500g씩 발송됩니다. 처음 작업하실 때는 A/B 비율을 정확히 맞춰 충분히 섞어주시고, 본 작업 전에 소량으로 먼저 테스트해보시는 것을 권장드립니다. 작업 시에는 수분이나 먼지가 들어가지 않도록 주의해 주세요. 감사합니다.",
    internalNote: "실계정 API 검증 완료 건",
    sourceUrl: "https://sell.smartstore.naver.com/#/qna",
    rawPayloadSummary: "questionId=669968949, answered=true, sendMode=direct_send",
    tags: ["실검증", "사용법", "직접발송"],
  },
  {
    id: "cp-online-1001",
    channel: "coupang",
    channelLabel: "쿠팡",
    itemType: "inquiry",
    sendMode: "direct_send",
    validationStatus: "doc_only",
    status: "approval_pending",
    urgency: "warning",
    customerName: "박**",
    title: "레진 몰드 재입고 문의",
    body: "현재 품절인 실리콘 몰드 재입고 예정이 있을까요? 이번 주 수업 준비 때문에 필요합니다.",
    productName: "플로럴 레진 실리콘 몰드 세트",
    orderId: "",
    receivedAt: "2026-04-09T08:35:00+09:00",
    assignee: "조승해",
    aiDraft:
      "안녕하세요. 문의주신 몰드 세트는 현재 재입고 일정을 확인 중입니다. 오늘 중으로 입고 여부를 다시 안내드릴 수 있도록 확인 후 답변드리겠습니다. 급하게 필요하시면 대체 가능한 유사 몰드도 함께 안내드리겠습니다.",
    internalNote:
      "쿠팡 OpenAPI를 자체개발로 전환한 뒤 Oracle 서버 158.180.77.201에서 onlineInquiries/callCenterInquiries read probe는 성공했다. 다만 사방넷 병행 유지 여부와 write는 아직 미검증이라 DRY_RUN 유지",
    sourceUrl: "https://wing.coupang.com/",
    rawPayloadSummary: "onlineInquiries/read verified, callCenterInquiries/read verified, auth=HMAC, sendMode=direct_send",
    tags: ["재입고", "승인대기", "DRY_RUN", "실read"],
  },
  {
    id: "mk-qna-20260409-01",
    channel: "makeshop",
    channelLabel: "메이크샵",
    itemType: "inquiry",
    sendMode: "direct_send",
    validationStatus: "doc_only",
    status: "approval_pending",
    urgency: "warning",
    customerName: "김**",
    title: "상품 문의 수동 처리 필요",
    body: "압화 꽃잎 색상이 사진이랑 동일한가요? 대량 구매 전 확인하고 싶습니다.",
    productName: "압화 꽃잎 샘플 세트",
    orderId: "",
    receivedAt: "2026-04-09T09:10:00+09:00",
    assignee: "이재혁",
    aiDraft:
      "안녕하세요. 압화 꽃잎은 자연물 특성상 색상과 크기에 약간의 개체 차이가 있을 수 있습니다. 다만 전체 톤과 구성은 상세페이지 기준과 최대한 유사하게 선별해 발송하고 있습니다. 대량 주문 전 샘플 확인이 필요하시면 소량 옵션으로 먼저 테스트해보시는 것을 권장드립니다.",
    internalNote:
      "Oracle 운영 서버 실키로 board_code/crm_board read probe는 통과했다. type=crm_board/process=reply와 type=comment/process=store는 문서 확인 완료 상태라 DRY_RUN 유지 후 승인된 케이스에서만 실write 검증",
    sourceUrl: "https://admin.makeshop.co.kr/",
    rawPayloadSummary:
      "type=crm_board search verified, type=crm_board/process=reply + type=comment/process=store doc verified",
    tags: ["메이크샵", "상품문의", "실read", "DRY_RUN"],
  },
  {
    id: "mk-review-20260409-01",
    channel: "makeshop",
    channelLabel: "메이크샵",
    itemType: "review",
    sendMode: "direct_send",
    validationStatus: "doc_only",
    status: "approval_pending",
    urgency: "ok",
    customerName: "최**",
    title: "후기 답변 초안 완료",
    body: "포장도 깔끔했고 꽃 상태도 좋아서 만족합니다. 다음에도 재구매할게요.",
    productName: "압화꽃 장미 믹스 세트",
    orderId: "MK-20260409-021",
    receivedAt: "2026-04-09T07:40:00+09:00",
    assignee: "장지호",
    aiDraft:
      "소중한 후기 감사합니다. 포장 상태와 꽃 컨디션까지 만족하셨다니 정말 다행입니다. 다음 작업에서도 예쁘게 활용하시길 바라며, 재구매 때도 좋은 상태로 준비해드리겠습니다.",
    internalNote:
      "Oracle 운영 서버 실키로 review read probe는 통과했고 현재 기간 데이터는 0건이다. type=review/process=store와 save_type=answer 문서는 확인 완료라 승인된 테스트 케이스 전까지 대기",
    sourceUrl: "https://admin.makeshop.co.kr/",
    rawPayloadSummary: "type=review search verified, type=review/process=store + save_type=answer doc verified",
    tags: ["후기", "초안완료", "메이크샵", "실read"],
  },
  {
    id: "ct-chat-20260409-01",
    channel: "channeltalk",
    channelLabel: "채널톡",
    itemType: "chat",
    sendMode: "disabled",
    validationStatus: "blocked",
    status: "new",
    urgency: "breach",
    customerName: "익명 방문자",
    title: "채널톡 연동 보류",
    body: "내일 오전 클래스에서 사용할 레진은 어느 비율로 섞어야 하나요?",
    productName: "레진 입문 키트",
    receivedAt: "2026-04-09T09:55:00+09:00",
    assignee: "장지호",
    aiDraft:
      "현재 채널톡은 플랜 확인 전이라 직접 발송이 비활성화되어 있습니다. 먼저 내부 답변 초안을 검토한 뒤, 플랜 확인 후 연동 여부를 결정해 주세요.",
    internalNote: "채널톡 무료 플랜 불확실. feature flag disabled",
    rawPayloadSummary: "webhook 가능, send disabled, pricing check required",
    tags: ["보류", "채널톡", "플랜확인"],
  },
];

export const OMX_RUNBOOK: OmxRunbookStep[] = [
  {
    id: "phase-1",
    title: "1단계: 스마트스토어 + 쿠팡 + 메이크샵",
    owner: "CODEX",
    status: "active",
    summary: "문의 direct send 가능한 채널을 먼저 묶고, 메이크샵은 read 검증을 끝낸 뒤 승인형 write만 남긴 상태로 운영한다.",
    exitCriteria: "스마트스토어 direct send, 쿠팡 doc-to-live, 메이크샵 read verified + write pending 상태가 한 화면에서 관리",
  },
  {
    id: "phase-2",
    title: "2단계: 채널톡 연동",
    owner: "CODEX",
    status: "next",
    summary: "무료 플랜 불가 시 대안 조사 후 제외 여부를 결정한다.",
    exitCriteria: "유료 또는 체험 가능 시 webhook + send 연결, 아니면 disabled 유지와 대안 문서화",
  },
  {
    id: "phase-3",
    title: "3단계: 11번가 연동",
    owner: "CODEX",
    status: "hold",
    summary: "고객센터 회신 또는 추가 문서 확보 후 capability를 다시 연다.",
    exitCriteria: "문의/답변 API 확인 후 capability matrix 업데이트",
  },
];

export const SEND_MODE_LABEL: Record<OmxSendMode, string> = {
  direct_send: "직접 발송",
  manual_send: "수동 발송",
  draft_only: "초안 전용",
  disabled: "비활성",
};

export const INGEST_MODE_LABEL: Record<OmxIngestMode, string> = {
  api: "API",
  webhook: "Webhook",
  scrape: "스크래핑",
  manual: "수동",
};

export const VALIDATION_LABEL: Record<OmxValidationStatus, string> = {
  verified: "실검증",
  doc_only: "문서 확인",
  template_verified: "템플릿 검증",
  blocked: "차단",
  pending: "보류",
};

export const ITEM_TYPE_LABEL: Record<OmxItemType, string> = {
  inquiry: "문의",
  review: "리뷰",
  chat: "채팅",
};

export const QUEUE_STATUS_LABEL: Record<OmxQueueStatus, string> = {
  new: "신규",
  draft_ready: "초안완료",
  editing: "수정중",
  approval_pending: "승인대기",
  sent: "발송완료",
  manual_required: "수동처리필요",
};

export const URGENCY_LABEL: Record<OmxUrgency, string> = {
  ok: "정상",
  warning: "임박",
  breach: "초과",
};
