#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const DEFAULT_OUTPUT = join(homedir(), ".codex", ".omx-config.json");
const DEFAULT_COMPANY_CORE_URL = "https://pressco21.com/webhook/openclaw/company-core";
const DEFAULT_TOKEN = "<replace-with-runtime-secret>";
const DEFAULT_REPLY_CHANNEL = "discord";
const DEFAULT_REPLY_TO = "channel:REPLACE_ME";
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_CLAWDBOT_PATH = resolveClawdbotPath();

const AGENTS = [
  { id: "company-admin", sessionId: "pressco21-company-admin", logFile: "/tmp/pressco21-company-admin.jsonl" },
  { id: "company-coach", sessionId: "pressco21-company-coach", logFile: "/tmp/pressco21-company-coach.jsonl" },
  { id: "executive-assistant", sessionId: "pressco21-executive-assistant", logFile: "/tmp/pressco21-executive-assistant.jsonl" },
  { id: "detail-page-planner", sessionId: "pressco21-detail-page-planner", logFile: "/tmp/pressco21-detail-page-planner.jsonl" },
  { id: "video-content-planner", sessionId: "pressco21-video-content-planner", logFile: "/tmp/pressco21-video-content-planner.jsonl" },
  { id: "cs-triage-specialist", sessionId: "pressco21-cs-triage-specialist", logFile: "/tmp/pressco21-cs-triage-specialist.jsonl" },
  { id: "operations-analyst", sessionId: "pressco21-operations-analyst", logFile: "/tmp/pressco21-operations-analyst.jsonl" },
  { id: "knowledge-curator", sessionId: "pressco21-knowledge-curator", logFile: "/tmp/pressco21-knowledge-curator.jsonl" },
  { id: "crm-account-manager", sessionId: "pressco21-crm-account-manager", logFile: "/tmp/pressco21-crm-account-manager.jsonl" },
  { id: "pricing-margin-analyst", sessionId: "pressco21-pricing-margin-analyst", logFile: "/tmp/pressco21-pricing-margin-analyst.jsonl" },
  { id: "marketplace-ops-specialist", sessionId: "pressco21-marketplace-ops-specialist", logFile: "/tmp/pressco21-marketplace-ops-specialist.jsonl" },
  { id: "bank-ops-assistant", sessionId: "pressco21-bank-ops-assistant", logFile: "/tmp/pressco21-bank-ops-assistant.jsonl" }
];

const EXECUTIVE_ASSISTANT_PLAYBOOK = {
  description: "PRESSCO21 company assistant playbook for meetings, action tracking, and cross-team handoffs.",
  gateway: "executive-assistant",
  workflows: {
    "meeting-brief": {
      purpose: "Turn scattered notes into a meeting brief with decisions, agenda, owners, and follow-up questions.",
      gateway: "executive-assistant",
      recommendedInputs: ["goal", "participants", "rawNotes", "deadline", "relatedDocs", "approvalOwner"],
      instruction:
        "[pressco21|executive-assistant|meeting-brief]\n" +
        "목적: {{goal}}\n" +
        "참여자: {{participants}}\n" +
        "마감: {{deadline}}\n" +
        "원문 메모:\n{{rawNotes}}\n" +
        "관련 문서: {{relatedDocs}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 회의 전에 바로 공유 가능한 브리프를 만드세요.\n" +
        "규칙: 확정/미확정을 구분하고, 부서별 해야 할 일과 승인 필요 항목을 분리하세요.\n" +
        "출력:\n" +
        "- briefSummary:\n" +
        "- decisionLog:\n" +
        "- agenda:\n" +
        "- actionItems:\n" +
        "- followUpQuestions:\n" +
        "- ownerTracker:\n" +
        "- approvalChecklist:",
      outputContract: [
        "briefSummary",
        "decisionLog",
        "agenda",
        "actionItems",
        "followUpQuestions",
        "ownerTracker",
        "approvalChecklist"
      ]
    },
    "weekly-action-tracker": {
      purpose: "Build a weekly owner-by-owner action tracker for OpenClaw pilot operations.",
      gateway: "executive-assistant",
      recommendedInputs: ["weeklyFocus", "owners", "blockedItems", "approvalQueue", "deadline"],
      instruction:
        "[pressco21|executive-assistant|weekly-action-tracker]\n" +
        "주간 초점: {{weeklyFocus}}\n" +
        "담당자: {{owners}}\n" +
        "막힌 항목: {{blockedItems}}\n" +
        "승인 대기: {{approvalQueue}}\n" +
        "기준 주차 마감: {{deadline}}\n" +
        "역할: 주간 액션 트래커를 만들어 담당자, 기한, 위험요소, 다음 액션을 정리하세요.\n" +
        "출력:\n" +
        "- weeklyFocus:\n" +
        "- ownerStatus:\n" +
        "- blockedItems:\n" +
        "- approvalQueue:\n" +
        "- agentUsageLog:\n" +
        "- weeklySummary:",
      outputContract: [
        "weeklyFocus",
        "ownerStatus",
        "blockedItems",
        "approvalQueue",
        "agentUsageLog",
        "weeklySummary"
      ]
    },
    "handoff-brief": {
      purpose: "Rewrite executive notes into a clean handoff brief for another department or specialist agent.",
      gateway: "executive-assistant",
      recommendedInputs: ["goal", "fromOwner", "toOwner", "rawNotes", "deadline", "approvalOwner"],
      instruction:
        "[pressco21|executive-assistant|handoff-brief]\n" +
        "목적: {{goal}}\n" +
        "전달자: {{fromOwner}}\n" +
        "수신자: {{toOwner}}\n" +
        "마감: {{deadline}}\n" +
        "원문 메모:\n{{rawNotes}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 다른 부서나 전문 에이전트가 바로 이해할 수 있는 핸드오프 브리프를 정리하세요.\n" +
        "출력:\n" +
        "- briefSummary:\n" +
        "- handoffNotes:\n" +
        "- actionItems:\n" +
        "- followUpQuestions:\n" +
        "- approvalChecklist:",
      outputContract: [
        "briefSummary",
        "handoffNotes",
        "actionItems",
        "followUpQuestions",
        "approvalChecklist"
      ]
    }
  }
};

const DETAIL_PAGE_PLAYBOOK = {
  description: "PRESSCO21 detail-page planning playbook for designers and merchandisers.",
  gateway: "detail-page-planner",
  workflows: {
    "detail-page-brief": {
      purpose: "Turn product context into a sectioned detail-page brief with copy points and missing asset checks.",
      gateway: "detail-page-planner",
      recommendedInputs: [
        "productName",
        "category",
        "productType",
        "targetCustomer",
        "coreFeatures",
        "season",
        "availableAssets",
        "salesChannels",
        "mustInclude",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|detail-page-planner|detail-page-brief]\n" +
        "상품명: {{productName}}\n" +
        "카테고리: {{category}}\n" +
        "상품 유형: {{productType}}\n" +
        "핵심 고객: {{targetCustomer}}\n" +
        "핵심 특징:\n{{coreFeatures}}\n" +
        "시즌/판매 맥락: {{season}}\n" +
        "보유 자산:\n{{availableAssets}}\n" +
        "판매 채널: {{salesChannels}}\n" +
        "반드시 포함:\n{{mustInclude}}\n" +
        "연관 상품: {{relatedProducts}}\n" +
        "참고 페이지: {{referencePage}}\n" +
        "가격대: {{priceBand}}\n" +
        "오픈마켓 제약: {{openMarketConstraints}}\n" +
        "반복 질문: {{customerQuestions}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 디자이너가 바로 와이어를 잡을 수 있는 상세페이지 브리프를 만드세요.\n" +
        "규칙: 강사/공방/B2C 우선 고객을 분명히 적고, 누락 자료와 승인 필요 항목을 분리하세요.\n" +
        "출력:\n" +
        "- summary:\n" +
        "- sectionPlan:\n" +
        "- copyPoints:\n" +
        "- assetChecklist:\n" +
        "- channelNotes:\n" +
        "- riskFlags:\n" +
        "- approvalChecklist:",
      outputContract: [
        "summary",
        "sectionPlan",
        "copyPoints",
        "assetChecklist",
        "channelNotes",
        "riskFlags",
        "approvalChecklist"
      ]
    }
  }
};

const VIDEO_CONTENT_PLAYBOOK = {
  description: "PRESSCO21 video planning playbook for shoot planning and channel rollout.",
  gateway: "video-content-planner",
  workflows: {
    "video-plan": {
      purpose: "Build a multi-week video plan with reuse candidates, platform notes, and approval checks.",
      gateway: "video-content-planner",
      recommendedInputs: [
        "planningWindowWeeks",
        "season",
        "productCandidates",
        "channelGoal",
        "mustInclude",
        "availableArchive",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|video-content-planner|video-plan]\n" +
        "계획 주수: {{planningWindowWeeks}}\n" +
        "시즌 맥락: {{season}}\n" +
        "촬영 후보 상품:\n{{productCandidates}}\n" +
        "채널 목표: {{channelGoal}}\n" +
        "반드시 포함:\n{{mustInclude}}\n" +
        "재활용 가능한 기존 영상:\n{{availableArchive}}\n" +
        "핵심 시청자: {{targetAudience}}\n" +
        "촬영 제약: {{shootConstraints}}\n" +
        "우선 채널: {{priorityChannel}}\n" +
        "캠페인 맥락: {{campaignContext}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 4~8주 촬영 계획과 플랫폼 전개안을 만들어 촬영 병목을 줄이세요.\n" +
        "규칙: 기존 자산 재활용을 먼저 고려하고, 승인 필요 항목과 준비 부족을 분리하세요.\n" +
        "출력:\n" +
        "- planningSummary:\n" +
        "- weeklyPlan:\n" +
        "- reusePlan:\n" +
        "- platformNotes:\n" +
        "- assetNeeds:\n" +
        "- riskFlags:\n" +
        "- approvalChecklist:",
      outputContract: [
        "planningSummary",
        "weeklyPlan",
        "reusePlan",
        "platformNotes",
        "assetNeeds",
        "riskFlags",
        "approvalChecklist"
      ]
    }
  }
};

const CS_TRIAGE_PLAYBOOK = {
  description: "PRESSCO21 customer-support triage playbook for first-pass categorization and reply drafts.",
  gateway: "cs-triage-specialist",
  workflows: {
    "cs-triage": {
      purpose: "Classify inbound customer questions, draft a safe first reply, and mark escalation needs.",
      gateway: "cs-triage-specialist",
      recommendedInputs: [
        "channel",
        "message",
        "orderId",
        "productName",
        "customerType",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|cs-triage-specialist|cs-triage]\n" +
        "문의 채널: {{channel}}\n" +
        "고객 문의:\n{{message}}\n" +
        "주문번호: {{orderId}}\n" +
        "문의 상품: {{productName}}\n" +
        "고객 유형: {{customerType}}\n" +
        "배송 상태: {{shippingStatus}}\n" +
        "재고 메모: {{inventoryHint}}\n" +
        "확인된 정책:\n{{knownPolicy}}\n" +
        "직전 대화:\n{{previousMessages}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 실제 응대 전에 참고할 1차 분류와 응답 초안을 만드세요.\n" +
        "규칙: 환불/가격/후불/보상은 무조건 승인 필요로 표시하고 확정 표현을 피하세요.\n" +
        "출력:\n" +
        "- triageCategory:\n" +
        "- riskLevel:\n" +
        "- draftReply:\n" +
        "- followUpQuestions:\n" +
        "- escalationPath:\n" +
        "- policyNotes:\n" +
        "- approvalChecklist:",
      outputContract: [
        "triageCategory",
        "riskLevel",
        "draftReply",
        "followUpQuestions",
        "escalationPath",
        "policyNotes",
        "approvalChecklist"
      ]
    }
  }
};

const OPERATIONS_ANALYST_PLAYBOOK = {
  description: "PRESSCO21 operations digest playbook for recurring issues, bottlenecks, and next actions.",
  gateway: "operations-analyst",
  workflows: {
    "operations-digest": {
      purpose: "Summarize weekly operational signals into a digest with bottlenecks and next actions.",
      gateway: "operations-analyst",
      recommendedInputs: [
        "periodLabel",
        "rawLogs",
        "repeatedQuestions",
        "incidents",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|operations-analyst|operations-digest]\n" +
        "대상 기간: {{periodLabel}}\n" +
        "운영 로그:\n{{rawLogs}}\n" +
        "반복 질문:\n{{repeatedQuestions}}\n" +
        "사고/막힘 사례:\n{{incidents}}\n" +
        "현재 지표:\n{{currentMetrics}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 운영 다이제스트를 만들어 병목, 반복 패턴, 다음 개선 행동을 정리하세요.\n" +
        "규칙: 느낌보다 근거를 우선하고, 승인 필요 항목과 즉시 실행 항목을 분리하세요.\n" +
        "출력:\n" +
        "- digestSummary:\n" +
        "- bottlenecks:\n" +
        "- kpiSignals:\n" +
        "- repeatPatterns:\n" +
        "- nextActions:\n" +
        "- approvalChecklist:",
      outputContract: [
        "digestSummary",
        "bottlenecks",
        "kpiSignals",
        "repeatPatterns",
        "nextActions",
        "approvalChecklist"
      ]
    }
  }
};

const KNOWLEDGE_CURATOR_PLAYBOOK = {
  description: "PRESSCO21 knowledge curation playbook for FAQ, SOP, and document update candidates.",
  gateway: "knowledge-curator",
  workflows: {
    "knowledge-update": {
      purpose: "Turn confirmed decisions and repeated questions into FAQ, SOP, and document update candidates.",
      gateway: "knowledge-curator",
      recommendedInputs: [
        "topic",
        "confirmedDecisions",
        "repeatedQuestions",
        "sourceDocs",
        "changeNotes",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|knowledge-curator|knowledge-update]\n" +
        "주제: {{topic}}\n" +
        "확정된 결정:\n{{confirmedDecisions}}\n" +
        "반복 질문:\n{{repeatedQuestions}}\n" +
        "기준 문서:\n{{sourceDocs}}\n" +
        "변경 메모:\n{{changeNotes}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: FAQ 후보, SOP 변경 후보, 문서 갱신 후보를 정리하세요.\n" +
        "규칙: 확정된 사실과 미확정 질문을 분리하고, 문서 경로가 필요한 항목은 분명히 표시하세요.\n" +
        "출력:\n" +
        "- knowledgeSummary:\n" +
        "- faqCandidates:\n" +
        "- sopUpdates:\n" +
        "- documentUpdates:\n" +
        "- unresolvedQuestions:\n" +
        "- approvalChecklist:",
      outputContract: [
        "knowledgeSummary",
        "faqCandidates",
        "sopUpdates",
        "documentUpdates",
        "unresolvedQuestions",
        "approvalChecklist"
      ]
    }
  }
};

const CRM_ACCOUNT_MANAGER_PLAYBOOK = {
  description: "PRESSCO21 CRM account playbook for B2B customer briefs, follow-up, and reactivation planning.",
  gateway: "crm-account-manager",
  workflows: {
    "customer-brief": {
      purpose: "Turn CRM and relationship notes into a customer brief with risks, opportunities, and next actions.",
      gateway: "crm-account-manager",
      recommendedInputs: [
        "customerName",
        "customerType",
        "relationshipGoal",
        "recentTransactions",
        "outstandingBalance",
        "lastOrderSummary",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|crm-account-manager|customer-brief]\n" +
        "고객명: {{customerName}}\n" +
        "고객 유형: {{customerType}}\n" +
        "관계 목표: {{relationshipGoal}}\n" +
        "최근 거래:\n{{recentTransactions}}\n" +
        "미수금/잔액: {{outstandingBalance}}\n" +
        "최근 주문 요약:\n{{lastOrderSummary}}\n" +
        "고객 메모:\n{{customerNotes}}\n" +
        "담당자: {{owner}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: B2B/직접거래 고객을 다시 이해할 수 있는 계정 브리프를 만드세요.\n" +
        "규칙: 미수금, 휴면, 재구매 기회, 관계 리스크를 분리하고 과도한 단정은 피하세요.\n" +
        "출력:\n" +
        "- accountSummary:\n" +
        "- opportunitySignals:\n" +
        "- relationshipRisks:\n" +
        "- nextActions:\n" +
        "- followUpScript:\n" +
        "- approvalChecklist:",
      outputContract: [
        "accountSummary",
        "opportunitySignals",
        "relationshipRisks",
        "nextActions",
        "followUpScript",
        "approvalChecklist"
      ]
    }
  }
};

const PRICING_MARGIN_ANALYST_PLAYBOOK = {
  description: "PRESSCO21 pricing and margin playbook for SKU-level pricing review and channel strategy.",
  gateway: "pricing-margin-analyst",
  workflows: {
    "price-margin-review": {
      purpose: "Review current cost, price, and channel margin to suggest safe pricing options.",
      gateway: "pricing-margin-analyst",
      recommendedInputs: [
        "productName",
        "skuCode",
        "branduid",
        "sourceCost",
        "sellingPrice",
        "channel",
        "targetMargin",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|pricing-margin-analyst|price-margin-review]\n" +
        "상품명: {{productName}}\n" +
        "SKU코드: {{skuCode}}\n" +
        "메이크샵 branduid: {{branduid}}\n" +
        "카테고리: {{category}}\n" +
        "현재 원가/COGS: {{sourceCost}}\n" +
        "원가 유형: {{costType}}\n" +
        "추정 COGS: {{normalizedCogs}}\n" +
        "현재 판매가: {{sellingPrice}}\n" +
        "판매 채널: {{channel}}\n" +
        "채널 수수료/비용 메모: {{feeNotes}}\n" +
        "카탈로그 조회 상태: {{catalogLookupStatus}}\n" +
        "카탈로그 매칭 요약:\n{{catalogMatchSummary}}\n" +
        "카탈로그 신뢰 상태: {{catalogTrustStatus}}\n" +
        "카탈로그 신뢰 메모: {{catalogTrustSummary}}\n" +
        "카탈로그 레코드:\n{{catalogRecord}}\n" +
        "원가 프로필 ID: {{costProfileId}}\n" +
        "원가 프로필 상태: {{costProfileStatus}}\n" +
        "원가 프로필 요약:\n{{costProfileSummary}}\n" +
        "기본 프로필: {{baseProfileId}}\n" +
        "원가 프로필 레코드:\n{{costProfileRecord}}\n" +
        "원가 세부 계산:\n{{costBreakdown}}\n" +
        "채널 기준:\n{{channelBenchmark}}\n" +
        "카테고리 전략:\n{{categoryProfile}}\n" +
        "목표 마진: {{targetMargin}}\n" +
        "계산 스냅샷:\n{{computedSnapshot}}\n" +
        "원가 해석 규칙: {{costRule}}\n" +
        "원가 가정:\n{{costAssumptions}}\n" +
        "숨은 비용 체크:\n{{hiddenCostChecklist}}\n" +
        "가격 제약: {{priceConstraints}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 상품 가격과 채널 마진을 검토하고 안전한 가격 전략 옵션을 제안하세요.\n" +
        "규칙: 최소선과 목표선을 분리하고, 계산에 쓴 가정과 누락 데이터를 명시하세요. 카탈로그 신뢰 상태가 conflict면 연계마스터를 참고치로만 다뤄야 한다고 적으세요. 채널이 자사몰이 아니고 메이크샵 기준가를 참조했다면 그 점을 분명히 적으세요. 근거 없는 수치 단정은 피하고, 승인 없이 가격 확정 문구를 쓰지 마세요.\n" +
        "출력:\n" +
        "- marginSummary:\n" +
        "- thresholdCheck:\n" +
        "- riskFlags:\n" +
        "- priceOptions:\n" +
        "- scenarioTable:\n" +
        "- assumptions:\n" +
        "- dataGaps:\n" +
        "- channelNotes:\n" +
        "- nextActions:\n" +
        "- approvalChecklist:",
      outputContract: [
        "marginSummary",
        "thresholdCheck",
        "riskFlags",
        "priceOptions",
        "scenarioTable",
        "assumptions",
        "dataGaps",
        "channelNotes",
        "nextActions",
        "approvalChecklist"
      ]
    }
  }
};

const MARKETPLACE_OPS_PLAYBOOK = {
  description: "PRESSCO21 marketplace operations playbook for listing prep across MakeShop and open marketplaces.",
  gateway: "marketplace-ops-specialist",
  workflows: {
    "listing-ops-brief": {
      purpose: "Prepare a marketplace listing brief with channel titles, asset gaps, and registration checklist.",
      gateway: "marketplace-ops-specialist",
      recommendedInputs: [
        "productName",
        "skuCode",
        "channelTargets",
        "productType",
        "keyFeatures",
        "assetStatus",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|marketplace-ops-specialist|listing-ops-brief]\n" +
        "상품명: {{productName}}\n" +
        "SKU코드: {{skuCode}}\n" +
        "대상 채널: {{channelTargets}}\n" +
        "상품 유형: {{productType}}\n" +
        "핵심 특징:\n{{keyFeatures}}\n" +
        "이미지/자료 상태:\n{{assetStatus}}\n" +
        "가격 메모: {{pricingNotes}}\n" +
        "채널 제약: {{constraints}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 자사몰과 오픈마켓 등록 전에 필요한 운영 브리프를 만드세요.\n" +
        "규칙: 채널별 제목 초안, 누락 자료, 등록 체크리스트를 분리하고 최종 등록 확정은 하지 마세요.\n" +
        "출력:\n" +
        "- listingSummary:\n" +
        "- channelTitles:\n" +
        "- registrationChecklist:\n" +
        "- missingAssets:\n" +
        "- riskFlags:\n" +
        "- approvalChecklist:",
      outputContract: [
        "listingSummary",
        "channelTitles",
        "registrationChecklist",
        "missingAssets",
        "riskFlags",
        "approvalChecklist"
      ]
    }
  }
};

const BANK_OPS_ASSISTANT_PLAYBOOK = {
  description: "PRESSCO21 bank operations playbook for deposit matching and safe follow-up review.",
  gateway: "bank-ops-assistant",
  workflows: {
    "deposit-review": {
      purpose: "Review a bank event, estimate likely CRM matching status, and prepare safe follow-up actions.",
      gateway: "bank-ops-assistant",
      recommendedInputs: [
        "transactionType",
        "payerName",
        "amount",
        "eventTime",
        "candidateCustomers",
        "openInvoices",
        "approvalOwner"
      ],
      instruction:
        "[pressco21|bank-ops-assistant|deposit-review]\n" +
        "거래 유형: {{transactionType}}\n" +
        "입금자/상대방: {{payerName}}\n" +
        "금액: {{amount}}\n" +
        "시각: {{eventTime}}\n" +
        "고객 후보:\n{{candidateCustomers}}\n" +
        "열린 명세표:\n{{openInvoices}}\n" +
        "추가 메모:\n{{notes}}\n" +
        "승인자: {{approvalOwner}}\n" +
        "역할: 은행 이벤트를 검토해 자동반영/검토/미매칭 관점으로 안전한 후속 행동을 정리하세요.\n" +
        "규칙: 실제 반영 확정은 하지 말고, 사람 검토가 필요한 이유를 분리하세요.\n" +
        "출력:\n" +
        "- transactionSummary:\n" +
        "- matchAssessment:\n" +
        "- escalationPath:\n" +
        "- followUpActions:\n" +
        "- messageDraft:\n" +
        "- approvalChecklist:",
      outputContract: [
        "transactionSummary",
        "matchAssessment",
        "escalationPath",
        "followUpActions",
        "messageDraft",
        "approvalChecklist"
      ]
    }
  }
};

function usage() {
  process.stderr.write(
    [
      "Usage: node scripts/setup-pressco21-openclaw.js [options]",
      "",
      "Options:",
      "  --output <path>            Write merged config to this path",
      "  --print                    Print merged config to stdout instead of writing",
      "  --force                    Overwrite output even if it exists",
      "  --allow-placeholders       Allow placeholder token/reply target values",
      "  --company-core-url <url>   HTTPS webhook for company-core",
      "  --token <token>            X-OpenClaw-Token header value",
      "  --reply-channel <name>     clawdbot delivery channel (default: discord)",
      "  --reply-to <target>        clawdbot reply target (default: channel:REPLACE_ME)",
      "  --clawdbot-path <path>     Absolute clawdbot binary path (auto-detected by default)",
      "",
      "Environment fallbacks:",
      "  PRESSCO21_OPENCLAW_OUTPUT",
      "  PRESSCO21_OPENCLAW_COMPANY_CORE_URL",
      "  PRESSCO21_OPENCLAW_TOKEN",
      "  PRESSCO21_OPENCLAW_REPLY_CHANNEL",
      "  PRESSCO21_OPENCLAW_REPLY_TO",
      "  PRESSCO21_OPENCLAW_ALLOW_PLACEHOLDERS=1"
    ].join("\n") + "\n",
  );
}

function parseArgs(argv) {
  const options = {
    output: process.env.PRESSCO21_OPENCLAW_OUTPUT || DEFAULT_OUTPUT,
    print: false,
    force: false,
    allowPlaceholders: process.env.PRESSCO21_OPENCLAW_ALLOW_PLACEHOLDERS === "1",
    companyCoreUrl: process.env.PRESSCO21_OPENCLAW_COMPANY_CORE_URL || DEFAULT_COMPANY_CORE_URL,
    token: process.env.PRESSCO21_OPENCLAW_TOKEN || DEFAULT_TOKEN,
    replyChannel: process.env.PRESSCO21_OPENCLAW_REPLY_CHANNEL || DEFAULT_REPLY_CHANNEL,
    replyTo: process.env.PRESSCO21_OPENCLAW_REPLY_TO || DEFAULT_REPLY_TO,
    clawdbotPath: process.env.PRESSCO21_OPENCLAW_CLAWDBOT_PATH || DEFAULT_CLAWDBOT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
    } else if (arg === "--print") {
      options.print = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--allow-placeholders") {
      options.allowPlaceholders = true;
    } else if (arg === "--company-core-url") {
      options.companyCoreUrl = argv[index + 1];
      index += 1;
    } else if (arg === "--token") {
      options.token = argv[index + 1];
      index += 1;
    } else if (arg === "--reply-channel") {
      options.replyChannel = argv[index + 1];
      index += 1;
    } else if (arg === "--reply-to") {
      options.replyTo = argv[index + 1];
      index += 1;
    } else if (arg === "--clawdbot-path") {
      options.clawdbotPath = argv[index + 1];
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function resolveClawdbotPath() {
  const pathEntries = String(process.env.PATH || "").split(delimiter).filter(Boolean);
  for (const entry of pathEntries) {
    const candidate = join(entry, "clawdbot");
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  try {
    const detected = execFileSync("/bin/sh", ["-lc", "command -v clawdbot"], {
      encoding: "utf-8"
    }).trim();
    return detected || "clawdbot";
  } catch {
    return "clawdbot";
  }
}

function validateOptions(options) {
  if (!options.allowPlaceholders) {
    if (!options.token || options.token.includes("<replace")) {
      throw new Error("Missing token. Set PRESSCO21_OPENCLAW_TOKEN or pass --token.");
    }
    if (!options.replyTo || options.replyTo.includes("REPLACE_ME")) {
      throw new Error("Missing reply target. Set PRESSCO21_OPENCLAW_REPLY_TO or pass --reply-to.");
    }
  }

  if (!/^https:\/\//.test(options.companyCoreUrl)) {
    throw new Error("company-core URL must use HTTPS.");
  }
}

function buildCommandGateway(sessionId, logFile, replyChannel, replyTo, clawdbotPath) {
  return (
    `(${shellQuote(clawdbotPath)} agent ` +
    `--session-id ${sessionId} ` +
    "--message {{instruction}} " +
    "--thinking minimal " +
    "--deliver " +
    `--reply-channel ${replyChannel} ` +
    `--reply-to ${shellQuote(replyTo)} ` +
    "--timeout 120 " +
    `--json >>${logFile} 2>&1 || true)`
  );
}

function buildOpenClawConfig(options) {
  const gateways = {};
  for (const agent of AGENTS) {
    gateways[agent.id] = {
      type: "command",
      command: buildCommandGateway(
        agent.sessionId,
        agent.logFile,
        options.replyChannel,
        options.replyTo,
        options.clawdbotPath,
      ),
      timeout: DEFAULT_TIMEOUT_MS
    };
  }

  gateways["company-core"] = {
    type: "http",
    url: options.companyCoreUrl,
    headers: {
      "Content-Type": "application/json",
      "X-OpenClaw-Token": options.token
    },
    timeout: 10000
  };

  return {
    enabled: true,
    gateways,
    playbooks: {
      "executive-assistant": EXECUTIVE_ASSISTANT_PLAYBOOK,
      "detail-page-planner": DETAIL_PAGE_PLAYBOOK,
      "video-content-planner": VIDEO_CONTENT_PLAYBOOK,
      "cs-triage-specialist": CS_TRIAGE_PLAYBOOK,
      "operations-analyst": OPERATIONS_ANALYST_PLAYBOOK,
      "knowledge-curator": KNOWLEDGE_CURATOR_PLAYBOOK,
      "crm-account-manager": CRM_ACCOUNT_MANAGER_PLAYBOOK,
      "pricing-margin-analyst": PRICING_MARGIN_ANALYST_PLAYBOOK,
      "marketplace-ops-specialist": MARKETPLACE_OPS_PLAYBOOK,
      "bank-ops-assistant": BANK_OPS_ASSISTANT_PLAYBOOK
    },
    hooks: {
      "session-start": {
        enabled: true,
        gateway: "company-admin",
        instruction: "[pressco21|company-admin|session-start]\nproject={{projectName}} session={{sessionId}} tmux={{tmuxSession}}\n브랜드 기준: 진심, 전문, 즐거운\n회사 맥락: B2B 강사/공방 비중이 높고 최종 결정은 사람이 합니다.\n역할: 이번 세션의 목표, 리스크, 승인 경계를 4줄 이내로 정리하세요.\n참조 우선순위: company-core -> company-profile -> 정책 -> SOP\n출력:\n- 목표:\n- 리스크:\n- 승인 필요:\n- 첫 행동:"
      },
      "session-idle": {
        enabled: true,
        gateway: "company-coach",
        instruction: "[pressco21|company-coach|session-idle]\nsession={{sessionId}} tmux={{tmuxSession}}\n역할: 작업이 멈춘 이유를 추정하고, 다음 행동 2개만 제안하세요.\n가능하면 브랜드, 상품, 채널, CS 문맥을 company-core 기준으로 보강하세요.\n출력:\n- 막힌 지점:\n- 필요한 입력:\n- 다음 행동:"
      },
      "ask-user-question": {
        enabled: true,
        gateway: "company-coach",
        instruction: "[pressco21|company-coach|ask-user-question]\nsession={{sessionId}} question={{question}}\n역할: 사용자 질문을 더 짧고 분명하게 다듬고, B2B/B2C 맥락과 승인 필요 여부를 고려해 왜 필요한지 설명하세요.\n출력:\n- 질문:\n- 왜 필요한가:\n- 답변 오면 할 일:"
      },
      "stop": {
        enabled: true,
        gateway: "company-admin",
        instruction: "[pressco21|company-admin|stop]\nsession={{sessionId}} tmux={{tmuxSession}}\n역할: 중단 이유와 남은 일, 재개 첫 행동을 3개 항목으로 정리하세요.\n출력:\n- 중단 이유:\n- 남은 일:\n- 재개 첫 행동:"
      },
      "session-end": {
        enabled: true,
        gateway: "company-admin",
        instruction: "[pressco21|company-admin|session-end]\nproject={{projectName}} session={{sessionId}} tmux={{tmuxSession}} reason={{reason}}\n역할: 이번 세션의 산출물, 검증 여부, 후속 액션과 문서 갱신 후보를 운영 기록 형태로 정리하세요.\n출력:\n- 완료:\n- 검증:\n- 후속 액션:\n- 문서 갱신 후보:"
      }
    }
  };
}

function readExistingConfig(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

function mergeConfig(existing, openclawConfig) {
  const merged = { ...existing };
  merged.notifications = { ...(existing.notifications || {}) };
  merged.notifications.enabled = true;
  merged.notifications.openclaw = openclawConfig;
  return merged;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  const outputPath = resolve(options.output);
  const existing = readExistingConfig(outputPath);
  const merged = mergeConfig(existing, buildOpenClawConfig(options));
  const rendered = JSON.stringify(merged, null, 2) + "\n";

  if (options.print) {
    process.stdout.write(rendered);
    return;
  }

  if (existsSync(outputPath) && !options.force) {
    throw new Error(`Refusing to overwrite existing config without --force: ${outputPath}`);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, rendered, "utf-8");
  process.stdout.write(`Wrote PRESSCO21 OpenClaw config to ${outputPath}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
