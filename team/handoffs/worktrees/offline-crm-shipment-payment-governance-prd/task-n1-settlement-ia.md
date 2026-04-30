---
handoff_id: HOFF-20260430-1205-direct-trade-task-n1-settlement-ia
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task N1 — 수급 지급 관리 IA 통합
task_goal: 분산된 수금/지급/입금/마감 메뉴를 사용자 합의안인 단일 `수급 지급 관리` 메뉴와 5개 탭 흐름으로 정리한다.
run_outcome: finished
---

## summary
윤하늘님이 사이드바를 단일 `수급 지급 관리` 메뉴로 통합하고, `/settlements` 화면을 새로 추가했습니다. 내부 탭 순서는 사용자 결정대로 `받을 돈 → 예치·환불·지급 → 입금 반영 → 자동반영 규칙 → 마감 점검`입니다.

## decision
- 기존 `/receivables`, `/payables`, `/deposit-inbox`, `/trade-work-queue`, `/month-end-review` 라우트는 딥링크 호환을 위해 유지했습니다.
- 고객 상세, 거래 상세, 캘린더, 설정, 업무함의 돈 관련 이동은 새 `/settlements?section=...` 경로로 보냈습니다.
- `직접거래 업무함`은 사이드바에서 제거하고, 숨은 보조 화면/대시보드 후보로 남겼습니다.
- `입금수집함`, `월말점검` 사용자 노출 용어는 주요 화면에서 `입금 반영`, `마감 점검`으로 정리했습니다.

## changed_artifacts
- `offline-crm-v2/src/pages/SettlementManagement.tsx`
- `offline-crm-v2/src/App.tsx`
- `offline-crm-v2/src/components/layout/Sidebar.tsx`
- `offline-crm-v2/src/pages/Receivables.tsx`
- `offline-crm-v2/src/pages/DepositInbox.tsx`
- `offline-crm-v2/src/pages/MonthEndReview.tsx`
- `offline-crm-v2/src/pages/CustomerDetail.tsx`
- `offline-crm-v2/src/components/TransactionDetailDialog.tsx`
- `offline-crm-v2/src/pages/Calendar.tsx`
- `offline-crm-v2/src/pages/Settings.tsx`
- `offline-crm-v2/src/pages/TradeWorkQueue.tsx`
- `offline-crm-v2/src/lib/appGuide.ts`

## verification
- `npm run build`: PASS
- `npm run lint`: PASS
- `npx playwright test tests/12-deposit-inbox-governance.spec.ts tests/13-month-end-review.spec.ts tests/14-governance-browser-smoke.spec.ts --reporter=list`: PASS, 4/4

## browser_evidence
- Playwright Chromium smoke에서 `/settlements?section=receivables&asOf=2026-04-30` 진입, `수급 지급 관리` heading, `받을 돈` 탭 active, `입금 반영`, `자동반영 규칙`, `마감 점검` 탭 전환을 확인했습니다.
- 사이드바 스냅샷상 기존 개별 돈 메뉴는 사라지고 `수급 지급 관리`만 표시됩니다.

## open_risks
- 기존 대시보드 전체 spec 일부는 라이브 데이터/차트 조건 때문에 실패했습니다. 이번 IA 변경 확인에는 mock 기반 governance smoke를 기준으로 삼았습니다.
- 기존 숨은 라우트의 제목은 일부 레거시 호환을 위해 유지되는 곳이 있습니다.

## blockers
- 없음.

## next_step
- 실제 운영 UX에서 `수급 지급 관리`의 5개 탭 순서와 용어가 익숙한지 사용자 확인을 받습니다.

## files_to_inspect_next
- `offline-crm-v2/src/pages/SettlementManagement.tsx`
- `offline-crm-v2/src/components/layout/Sidebar.tsx`
- `offline-crm-v2/src/lib/appGuide.ts`

## rollback_or_recovery_note
문제가 생기면 `/settlements` 라우트와 사이드바 통합 변경을 되돌리고 기존 `/receivables`, `/payables`, `/deposit-inbox` 메뉴를 복구하면 됩니다. 레거시 라우트 자체는 삭제하지 않았습니다.

## learn_to_save
업무 메뉴 IA를 바꿀 때는 기존 딥링크를 삭제하지 말고 새 통합 라우트로 자연스럽게 이동시키는 방식이 운영 리스크가 낮습니다.
