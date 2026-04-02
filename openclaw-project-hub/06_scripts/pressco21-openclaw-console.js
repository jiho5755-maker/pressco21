#!/usr/bin/env node

import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const RUNNER_PATH = join(REPO_ROOT, "scripts", "run-pressco21-playbook.js");
const PRICING_RUNNER_PATH = join(REPO_ROOT, "scripts", "run-pressco21-pricing-review.js");
const CONFIG_PATH = join(homedir(), ".codex", ".omx-config.json");

const WORKFLOWS = {
  "1": {
    playbook: "executive-assistant",
    id: "meeting-brief",
    label: "회의 브리프",
  },
  "2": {
    playbook: "executive-assistant",
    id: "weekly-action-tracker",
    label: "주간 액션 트래커",
  },
  "3": {
    playbook: "executive-assistant",
    id: "handoff-brief",
    label: "핸드오프 브리프",
  },
  "4": {
    playbook: "detail-page-planner",
    id: "detail-page-brief",
    label: "상세페이지 브리프",
  },
  "5": {
    playbook: "video-content-planner",
    id: "video-plan",
    label: "영상 기획안",
  },
  "6": {
    playbook: "cs-triage-specialist",
    id: "cs-triage",
    label: "CS 트리아지",
  },
  "7": {
    playbook: "operations-analyst",
    id: "operations-digest",
    label: "운영 다이제스트",
  },
  "8": {
    playbook: "knowledge-curator",
    id: "knowledge-update",
    label: "지식 업데이트",
  },
  "9": {
    playbook: "crm-account-manager",
    id: "customer-brief",
    label: "고객 브리프",
  },
  "10": {
    playbook: "pricing-margin-analyst",
    id: "price-margin-review",
    label: "가격/마진 검토",
    runner: "pricing-review",
  },
  "11": {
    playbook: "marketplace-ops-specialist",
    id: "listing-ops-brief",
    label: "오픈마켓 운영 브리프",
  },
  "12": {
    playbook: "bank-ops-assistant",
    id: "deposit-review",
    label: "입금 검토",
  },
};

function printMenu() {
  process.stdout.write(
    [
      "",
      "PRESSCO21 OpenClaw",
      "1. 회의 브리프",
      "2. 주간 액션 트래커",
      "3. 핸드오프 브리프",
      "4. 상세페이지 브리프",
      "5. 영상 기획안",
      "6. CS 트리아지",
      "7. 운영 다이제스트",
      "8. 지식 업데이트",
      "9. 고객 브리프",
      "10. 가격/마진 검토",
      "11. 오픈마켓 운영 브리프",
      "12. 입금 검토",
      "q. 종료",
      "",
    ].join("\n"),
  );
}

function normalizeList(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function askRequired(rl, question, fallback = "") {
  while (true) {
    const raw = (await rl.question(question)).trim();
    const resolved = raw || fallback;
    if (resolved) return resolved;
    process.stdout.write("값을 비워둘 수 없습니다.\n");
  }
}

async function askOptional(rl, question, fallback = "") {
  const raw = (await rl.question(question)).trim();
  return raw || fallback;
}

async function askNumber(rl, question, fallback) {
  while (true) {
    const raw = (await rl.question(question)).trim();
    const resolved = raw || String(fallback);
    const numeric = Number.parseInt(resolved, 10);
    if (!Number.isNaN(numeric) && numeric > 0) return numeric;
    process.stdout.write("숫자를 입력하세요.\n");
  }
}

async function askYesNo(rl, question, fallback = false) {
  const suffix = fallback ? " (Y/n): " : " (y/N): ";
  while (true) {
    const raw = (await rl.question(`${question}${suffix}`)).trim().toLowerCase();
    if (!raw) return fallback;
    if (["y", "yes", "예", "ㅇ"].includes(raw)) return true;
    if (["n", "no", "아니오", "ㄴ"].includes(raw)) return false;
    process.stdout.write("y 또는 n으로 입력하세요.\n");
  }
}

async function askLines(rl, title) {
  process.stdout.write(`${title}\n`);
  process.stdout.write("한 줄씩 입력하고, 끝나면 빈 줄에서 엔터를 누르세요.\n");
  const lines = [];
  while (true) {
    const line = (await rl.question("> ")).trim();
    if (!line) break;
    lines.push(line);
  }
  return lines;
}

async function buildMeetingBriefInput(rl) {
  const goal = await askRequired(rl, "회의 목적: ");
  const participants = normalizeList(
    await askRequired(rl, "참여자(쉼표로 구분): "),
  );
  const deadline = await askRequired(rl, "마감일(YYYY-MM-DD): ");
  const rawNotes = await askLines(rl, "원문 메모");
  const relatedDocs = await askLines(rl, "관련 문서 경로");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    goal,
    participants,
    deadline,
    rawNotes,
    relatedDocs,
    approvalOwner,
  };
}

async function buildWeeklyActionInput(rl) {
  const weeklyFocus = await askRequired(rl, "이번 주 초점: ");
  const owners = normalizeList(
    await askRequired(rl, "담당자(쉼표로 구분): "),
  );
  const blockedItems = await askLines(rl, "막힌 항목");
  const approvalQueue = await askLines(rl, "승인 대기 항목");
  const deadline = await askRequired(rl, "기준 마감일(YYYY-MM-DD): ");

  return {
    weeklyFocus,
    owners,
    blockedItems,
    approvalQueue,
    deadline,
  };
}

async function buildHandoffInput(rl) {
  const goal = await askRequired(rl, "전달 목적: ");
  const fromOwner = await askRequired(rl, "전달자: ", "장지호");
  const toOwner = await askRequired(rl, "수신자: ");
  const deadline = await askRequired(rl, "마감일(YYYY-MM-DD): ");
  const rawNotes = await askLines(rl, "전달 메모");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    goal,
    fromOwner,
    toOwner,
    deadline,
    rawNotes,
    approvalOwner,
  };
}

async function buildDetailPageInput(rl) {
  const productName = await askRequired(rl, "상품명: ");
  const category = await askRequired(rl, "카테고리: ");
  const productType = await askRequired(rl, "상품 유형(single 또는 collection): ", "single");
  const targetCustomer = normalizeList(
    await askRequired(rl, "핵심 고객(쉼표로 구분): "),
  );
  const coreFeatures = await askLines(rl, "핵심 특징");
  const season = await askRequired(rl, "시즌 또는 판매 맥락: ");
  const availableAssets = {
    heroImages: await askYesNo(rl, "대표 이미지가 있나요?", true),
    detailImages: await askYesNo(rl, "상세 이미지가 있나요?", false),
    sizeChart: await askYesNo(rl, "규격표가 있나요?", false),
    usagePhotos: await askYesNo(rl, "사용 장면 사진이 있나요?", false),
  };
  const salesChannels = normalizeList(
    await askRequired(rl, "판매 채널(쉼표로 구분): "),
  );
  const mustInclude = await askLines(rl, "반드시 포함할 내용");
  const relatedProducts = await askLines(rl, "연관 상품(없으면 바로 엔터)");
  const referencePage = await askOptional(rl, "참고 페이지/링크(없으면 엔터): ");
  const priceBand = await askOptional(rl, "가격대 메모(없으면 엔터): ");
  const openMarketConstraints = await askLines(rl, "오픈마켓 제약(없으면 바로 엔터)");
  const customerQuestions = await askLines(rl, "반복 고객 질문(없으면 바로 엔터)");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    productName,
    category,
    productType,
    targetCustomer,
    coreFeatures,
    season,
    availableAssets,
    salesChannels,
    mustInclude,
    relatedProducts,
    referencePage,
    priceBand,
    openMarketConstraints,
    customerQuestions,
    approvalOwner,
  };
}

async function buildVideoPlanInput(rl) {
  const planningWindowWeeks = await askNumber(rl, "계획할 주 수: ", 4);
  const season = await askRequired(rl, "시즌 맥락: ");
  const productCandidates = await askLines(rl, "촬영 후보 상품");
  const channelGoal = await askRequired(rl, "채널 목표: ");
  const mustInclude = await askLines(rl, "반드시 포함할 내용");
  const availableArchive = await askLines(rl, "재활용 가능한 기존 영상");
  const targetAudience = normalizeList(
    await askOptional(rl, "핵심 시청자(쉼표로 구분, 없으면 엔터): "),
  );
  const shootConstraints = await askLines(rl, "촬영 제약(없으면 바로 엔터)");
  const priorityChannel = await askOptional(rl, "우선 채널(없으면 엔터): ");
  const campaignContext = await askOptional(rl, "캠페인 맥락(없으면 엔터): ");
  const approvalOwner = await askRequired(rl, "승인자: ", "장다경");

  return {
    planningWindowWeeks,
    season,
    productCandidates,
    channelGoal,
    mustInclude,
    availableArchive,
    targetAudience,
    shootConstraints,
    priorityChannel,
    campaignContext,
    approvalOwner,
  };
}

async function buildCsTriageInput(rl) {
  const channel = await askRequired(rl, "문의 채널: ");
  const message = await askRequired(rl, "고객 문의 원문: ");
  const orderId = await askOptional(rl, "주문번호(없으면 엔터): ");
  const productName = await askRequired(rl, "문의 상품명: ");
  const customerType = await askRequired(rl, "고객 유형: ", "미확인");
  const shippingStatus = await askOptional(rl, "배송 상태 메모(없으면 엔터): ");
  const inventoryHint = await askOptional(rl, "재고 메모(없으면 엔터): ");
  const knownPolicy = await askLines(rl, "이미 확인된 정책(없으면 바로 엔터)");
  const previousMessages = await askLines(rl, "직전 대화 맥락(없으면 바로 엔터)");
  const approvalOwner = await askRequired(rl, "승인자: ", "이재혁");

  return {
    channel,
    message,
    orderId,
    productName,
    customerType,
    shippingStatus,
    inventoryHint,
    knownPolicy,
    previousMessages,
    approvalOwner,
  };
}

async function buildOperationsDigestInput(rl) {
  const periodLabel = await askRequired(rl, "대상 기간: ");
  const rawLogs = await askLines(rl, "운영 로그");
  const repeatedQuestions = await askLines(rl, "반복 질문");
  const incidents = await askLines(rl, "사고/막힘 사례");
  const currentMetrics = await askLines(rl, "현재 지표 메모(없으면 바로 엔터)");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    periodLabel,
    rawLogs,
    repeatedQuestions,
    incidents,
    currentMetrics,
    approvalOwner,
  };
}

async function buildKnowledgeUpdateInput(rl) {
  const topic = await askRequired(rl, "정리할 주제: ");
  const confirmedDecisions = await askLines(rl, "확정된 결정");
  const repeatedQuestions = await askLines(rl, "반복 질문");
  const sourceDocs = await askLines(rl, "기준 문서 경로");
  const changeNotes = await askLines(rl, "변경 메모");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    topic,
    confirmedDecisions,
    repeatedQuestions,
    sourceDocs,
    changeNotes,
    approvalOwner,
  };
}

async function buildCustomerBriefInput(rl) {
  const customerName = await askRequired(rl, "고객명: ");
  const customerType = await askRequired(rl, "고객 유형: ");
  const relationshipGoal = await askRequired(rl, "이번 관계 목표: ");
  const recentTransactions = await askLines(rl, "최근 거래 요약");
  const outstandingBalance = await askOptional(rl, "미수금/잔액 메모(없으면 엔터): ");
  const lastOrderSummary = await askLines(rl, "최근 주문 요약");
  const customerNotes = await askLines(rl, "고객 메모(없으면 바로 엔터)");
  const owner = await askOptional(rl, "담당자(없으면 엔터): ");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    customerName,
    customerType,
    relationshipGoal,
    recentTransactions,
    outstandingBalance,
    lastOrderSummary,
    customerNotes,
    owner,
    approvalOwner,
  };
}

async function buildPriceMarginInput(rl) {
  process.stdout.write("원가/판매가를 비워두면 원가 프로필 또는 연계마스터에서 자동 조회를 시도합니다.\n");
  process.stdout.write("신규 상품이면 기본 프로필을 선택하고, 변동값만 입력하면 됩니다.\n");
  const productName = await askRequired(rl, "상품명: ");
  const skuCode = await askOptional(rl, "SKU코드(없으면 엔터): ");
  const branduid = await askOptional(rl, "메이크샵 branduid(없으면 엔터): ");
  const baseProfileChoice = await askOptional(
    rl,
    "기본 프로필(1=플라워, 2=레진액체, 3=몰드/도구, 4=유리/깨짐주의, 5=국내사입, 없으면 엔터): ",
  );
  const channel = await askRequired(rl, "판매 채널: ");
  const sourceCost = await askOptional(rl, "현재 원가/COGS(없으면 엔터): ");
  const costTypeChoice =
    sourceCost
      ? await askRequired(
          rl,
          "원가 유형(1=cogs, 2=purchase_krw, 3=purchase_cny): ",
          "1",
        )
      : "";
  const sellingPrice = await askOptional(rl, "현재 판매가(없으면 엔터): ");
  const feeNotes = await askOptional(rl, "추가 수수료/비용 메모(없으면 엔터): ");
  const targetMargin = await askOptional(rl, "목표 마진(없으면 엔터): ");
  const needsChinaImportInputs = baseProfileChoice && ["1", "2", "3", "4"].includes(baseProfileChoice);
  const exchangeRate =
    sourceCost && costTypeChoice === "3"
      ? await askOptional(rl, "환율(CNY/KRW, 없으면 최신 게시 환율 사용): ")
      : "";
  const extraCostRate =
    sourceCost && (costTypeChoice === "2" || costTypeChoice === "3")
      ? await askOptional(rl, "부대비용 비율(예: 0.2, 없으면 기본값 사용): ")
      : "";
  const vatRate =
    sourceCost && (costTypeChoice === "2" || costTypeChoice === "3")
      ? await askOptional(rl, "VAT 비율(예: 0.1, 없으면 기본값 사용): ")
      : "";
  const shippingCost = await askOptional(rl, "배송비 반영액(없으면 0): ");
  const allocationQuantity =
    needsChinaImportInputs
      ? await askOptional(rl, "건당 비용 배분수량(없으면 엔터): ")
      : "";
  const unitVolumeCbm =
    needsChinaImportInputs
      ? await askOptional(rl, "개당 CBM(없으면 엔터): ")
      : "";
  const packageLengthCm =
    needsChinaImportInputs && !unitVolumeCbm
      ? await askOptional(rl, "가로 cm(없으면 엔터): ")
      : "";
  const packageWidthCm =
    needsChinaImportInputs && !unitVolumeCbm
      ? await askOptional(rl, "세로 cm(없으면 엔터): ")
      : "";
  const packageHeightCm =
    needsChinaImportInputs && !unitVolumeCbm
      ? await askOptional(rl, "높이 cm(없으면 엔터): ")
      : "";
  const originCertificateApplied =
    needsChinaImportInputs
      ? await askOptional(rl, "원산지증명 적용 여부(y/n, 없으면 엔터): ")
      : "";
  const domesticInboundShippingPerUnit =
    needsChinaImportInputs
      ? await askOptional(rl, "통관 후 국내 입고배송비(개당, 없으면 엔터): ")
      : "";
  const priceConstraints = await askLines(rl, "가격 제약(없으면 바로 엔터)");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  const costType = {
    "1": "cogs",
    "2": "purchase_krw",
    "3": "purchase_cny",
  }[costTypeChoice] || "cogs";
  const baseProfileId = {
    "1": "china_import_floral",
    "2": "china_import_resin_liquid",
    "3": "china_import_mold_tool",
    "4": "china_import_fragile_glass",
    "5": "domestic_purchase_simple",
  }[baseProfileChoice] || "";

  return {
    productName,
    skuCode,
    branduid,
    baseProfileId,
    sourceCost,
    costType,
    sellingPrice,
    channel,
    feeNotes,
    targetMargin,
    exchangeRate,
    extraCostRate,
    vatRate,
    shippingCost,
    allocationQuantity,
    unitVolumeCbm,
    packageLengthCm,
    packageWidthCm,
    packageHeightCm,
    originCertificateApplied,
    domesticInboundShippingPerUnit,
    priceConstraints,
    approvalOwner,
  };
}

async function buildListingOpsInput(rl) {
  const productName = await askRequired(rl, "상품명: ");
  const skuCode = await askOptional(rl, "SKU코드(없으면 엔터): ");
  const channelTargets = normalizeList(
    await askRequired(rl, "대상 채널(쉼표로 구분): "),
  );
  const productType = await askRequired(rl, "상품 유형(단일상품/모음전 등): ");
  const keyFeatures = await askLines(rl, "핵심 특징");
  const assetStatus = await askLines(rl, "이미지/자료 상태");
  const pricingNotes = await askOptional(rl, "가격 메모(없으면 엔터): ");
  const constraints = await askLines(rl, "채널 제약(없으면 바로 엔터)");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    productName,
    skuCode,
    channelTargets,
    productType,
    keyFeatures,
    assetStatus,
    pricingNotes,
    constraints,
    approvalOwner,
  };
}

async function buildDepositReviewInput(rl) {
  const transactionType = await askRequired(rl, "거래 유형(입금/출금): ", "입금");
  const payerName = await askRequired(rl, "입금자/상대방: ");
  const amount = await askRequired(rl, "금액: ");
  const eventTime = await askRequired(rl, "거래 시각: ");
  const candidateCustomers = await askLines(rl, "고객 후보");
  const openInvoices = await askLines(rl, "열린 명세표");
  const notes = await askLines(rl, "추가 메모(없으면 바로 엔터)");
  const approvalOwner = await askRequired(rl, "승인자: ", "장지호");

  return {
    transactionType,
    payerName,
    amount,
    eventTime,
    candidateCustomers,
    openInvoices,
    notes,
    approvalOwner,
  };
}

async function buildInput(rl, workflowId) {
  if (workflowId === "meeting-brief") {
    return buildMeetingBriefInput(rl);
  }
  if (workflowId === "weekly-action-tracker") {
    return buildWeeklyActionInput(rl);
  }
  if (workflowId === "handoff-brief") {
    return buildHandoffInput(rl);
  }
  if (workflowId === "detail-page-brief") {
    return buildDetailPageInput(rl);
  }
  if (workflowId === "video-plan") {
    return buildVideoPlanInput(rl);
  }
  if (workflowId === "cs-triage") {
    return buildCsTriageInput(rl);
  }
  if (workflowId === "operations-digest") {
    return buildOperationsDigestInput(rl);
  }
  if (workflowId === "knowledge-update") {
    return buildKnowledgeUpdateInput(rl);
  }
  if (workflowId === "customer-brief") {
    return buildCustomerBriefInput(rl);
  }
  if (workflowId === "price-margin-review") {
    return buildPriceMarginInput(rl);
  }
  if (workflowId === "listing-ops-brief") {
    return buildListingOpsInput(rl);
  }
  return buildDepositReviewInput(rl);
}

async function runWorkflow(workflow, input) {
  const runnerPath = workflow.runner === "pricing-review" ? PRICING_RUNNER_PATH : RUNNER_PATH;
  const args =
    workflow.runner === "pricing-review"
      ? [
          runnerPath,
          "--config",
          CONFIG_PATH,
          "--json",
          JSON.stringify(input),
        ]
      : [
          runnerPath,
          workflow.id,
          "--playbook",
          workflow.playbook,
          "--config",
          CONFIG_PATH,
          "--json",
          JSON.stringify(input),
        ];

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, args, {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        OMX_OPENCLAW: "1",
        OMX_OPENCLAW_COMMAND: "1",
      },
      stdio: "inherit",
    });

    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`실행 실패 (exit ${code ?? "unknown"})`));
    });
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("이 실행기는 터미널에서 직접 실행해야 합니다.");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    printMenu();
    const selection = (
      await askOptional(rl, "원하는 작업 번호를 입력하세요: ")
    ).toLowerCase();

    if (!selection || selection === "q") {
      process.stdout.write("종료했습니다.\n");
      return;
    }

    const workflow = WORKFLOWS[selection];
    if (!workflow) {
      throw new Error("지원하지 않는 번호입니다. 메뉴에 있는 번호를 선택하세요.");
    }

    process.stdout.write(`선택한 작업: ${workflow.label}\n`);
    const input = await buildInput(rl, workflow.id);
    await runWorkflow(workflow, input);
    process.stdout.write("텔레그램에서 결과를 확인하세요.\n");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
