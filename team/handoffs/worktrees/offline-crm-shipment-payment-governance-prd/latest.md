---
handoff_id: HOFF-20260430-1208-direct-trade-settlement-ia-auto-tax-latest
created_at: 2026-04-30T12:08:00+0900
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors:
  - choi-minseok-cto
  - park-seoyeon-cfo
  - cho-hyunwoo-legal
  - yoo-junho-paircoder
scope_type: worktree
project: offline-crm
worktree_slot: offline-crm-shipment-payment-governance-prd
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-shipment-payment-governance-prd
branch: "work/offline-crm/shipment-payment-governance-prd"
worktree_path: "/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-shipment-payment-governance-prd"
commit_sha: 46d2c65
implementation_commit: 46d2c65
status: pushed
summary: "수급 지급 관리 통합 IA, 고객계정 자동반영 정확일치 보강, 세금계산서 요청자/운영 UI 정비 구현 및 mock browser smoke 통과"
decision: "운영 데이터 write 없이 프론트 구조/안전 매칭/세금계산서 요청 payload를 정비했습니다. 실제 바로빌 발급과 운영 입금 자동반영은 별도 승인 필요입니다."
changed_artifacts:
  - "offline-crm-v2/src/pages/SettlementManagement.tsx"
  - "offline-crm-v2/src/components/layout/Sidebar.tsx"
  - "offline-crm-v2/src/lib/accountingMeta.ts"
  - "offline-crm-v2/src/lib/autoDeposits.ts"
  - "offline-crm-v2/src/pages/CustomerDetail.tsx"
  - "offline-crm-v2/src/components/TaxInvoiceRequestDialog.tsx"
  - "offline-crm-v2/src/pages/Invoices.tsx"
  - "offline-crm-v2/tests/12-deposit-inbox-governance.spec.ts"
  - "offline-crm-v2/tests/13-month-end-review.spec.ts"
  - "offline-crm-v2/tests/14-governance-browser-smoke.spec.ts"
verification:
  - "npm run build: PASS"
  - "npm run lint: PASS"
  - "npx playwright test tests/12-deposit-inbox-governance.spec.ts tests/13-month-end-review.spec.ts tests/14-governance-browser-smoke.spec.ts --reporter=list: PASS, 4/4"
  - "npx playwright test tests/03-dashboard.spec.ts tests/12...14 --reporter=list: attempted, 9 passed/4 failed; dashboard live data/chart expectations failed, governance smoke fixed and rerun PASS"
open_risks:
  - "세금계산서 실제 발급은 미수행. 운영 env가 test면 UI는 계속 테스트 발급으로 표시됩니다."
  - "고객계정 자동반영은 전역 자동반영 ON + 고객별 허용 ON + 입금자명/별칭 정확일치에서 실제 장부 write가 가능하므로 운영 설정 변경 전 후보 dry-run 확인 필요."
  - "dashboard full spec 일부는 현재 live data/chart 조건 및 Vite EPIPE로 실패 기록이 있음. 이번 기능 검증 기준은 mock governance smoke."
next_step: "운영 배포가 필요하면 별도 승인 후 배포. 운영 env 점검과 실제 바로빌 발급은 별도 승인 후 1건 단위로 진행."
learn_to_save:
  - "메뉴 용어/IA 변경은 hidden legacy route를 유지하고 새 통합 route로 링크만 유도하면 안전합니다."
  - "고객 전체 선입금 자동화는 고객별 허용 플래그, 동명이인 차단, 입금자명/별칭 정확일치가 핵심입니다."
  - "세금계산서 테스트/운영 표시는 코드보다 배포 env gate 확인이 먼저입니다."
---

# 최신 handoff

## 요약
수급 지급 관리 단일 메뉴와 5개 탭이 구현됐고, 고객계정 자동반영은 정확일치 조건으로 보강됐으며 세금계산서 요청자/운영 모드 UI가 정비됐습니다.

## 상세 작업 handoff
- `team/handoffs/worktrees/offline-crm-shipment-payment-governance-prd/task-n1-settlement-ia.md`
- `team/handoffs/worktrees/offline-crm-shipment-payment-governance-prd/task-n2-auto-deposit-account-match.md`
- `team/handoffs/worktrees/offline-crm-shipment-payment-governance-prd/task-n3-tax-invoice-production-ui.md`

## 검증
- build/lint 통과
- governance mock browser smoke 4/4 통과
- 운영 데이터 write 없음

## 남은 주의
- 실제 바로빌 운영 발급은 클릭하지 않았습니다.
- 운영 env가 production/allow true로 배포되어야 테스트 문구가 실제 발급 문구로 바뀝니다.

## Git 보존
- 구현 커밋: `46d2c65`
- 브랜치 push 완료: `origin/work/offline-crm/shipment-payment-governance-prd`
