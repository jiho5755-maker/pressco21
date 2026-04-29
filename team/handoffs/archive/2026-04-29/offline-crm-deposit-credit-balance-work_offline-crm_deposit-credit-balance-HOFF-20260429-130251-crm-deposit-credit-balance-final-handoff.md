---
handoff_id: HOFF-20260429-130251-crm-deposit-credit-balance-final-handoff
created_at: 2026-04-29T13:02:51+0900
runtime: codex-omx
owner_agent_id: yoo-junho-paircoder
contributors: []
scope_type: worktree
project: offline-crm
worktree_slot: offline-crm-deposit-credit-balance
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-deposit-credit-balance
branch: "work/offline-crm/deposit-credit-balance"
worktree_path: "/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-deposit-credit-balance"
source_cwd: "/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-deposit-credit-balance"
commit_sha: 8b61a59
status: active
promoted_to_global: false
summary: "CRM 예치금/초과입금/환불완료 보정 작업 완료. 구례군은 1,000,000원 중 743,500원 정산 + 256,500원 예치금으로 운영 데이터 보정했고, 이승향/한국압화 자동 예치금 보정은 사용자 판단에 따라 원복했다. 마니랜드는 1,554,000원 환불 완료 이력으로 정리했고 서상견 1,000,000원 입금은 기존 미수 상환으로 유지했다. 수금관리에는 초과입금 처리 방식에 이미 환불 완료 옵션을 추가해 main 배포까지 완료했다."
decision: "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다."
changed_artifacts:
  - "offline-crm-v2/src/pages/Receivables.tsx: 수금관리 초과입금 처리에 '이미 환불 완료' 선택지 추가"
  - "운영 데이터: 구례군 예치금 보정, 이승향/한국압화 자동 보정 원복, 마니랜드 환불 완료 정리, 서상견 기존 미수 상환 유지"
  - "team/handoffs/**: 세션 종료용 최종 핸드오프 정리"
verification:
  - "npm run lint 통과"
  - "npm run build 통과"
  - "work/offline-crm/deposit-credit-balance commit 8b61a59 push 완료"
  - "main merge commit 6b6070a push 완료"
  - "운영 배포 Release ID 20260429124305-6b6070a 완료"
  - "운영 검증: crm-auth.service active, /auth/health 200 OK, 홈 HTTP 200, JS asset assets/index-t3k9OpOp.js 확인"
  - "local output handoff saved: output/codex-handoffs/20260429-130251-crm-deposit-credit-balance-final-handoff.md"
  - "git status captured at handoff time"
open_risks:
  - "입금수집함 자체는 아직 지저분하다. 이승향/한국압화는 초과입금 후보로만 남겨두었고 실제 의미는 확인 전 자동 수정 금지. 김순자처럼 동명이인/대리입금 케이스는 자동매칭하면 위험하므로 후속 worktree에서 정책과 UI가 필요하다."
next_step: "다음은 세금계산서 자동화 워크트리를 먼저 해결한다. 그 다음 새 CRM worktree에서 입금수집함 정리 기획/구현을 진행한다: 수동 완료/수동 기록, 제외 수집 규칙(쿠팡 등), 동명이인·가족명의 입금은 자동처리 금지 및 검토큐 처리, 입금수집함 청소/보관 정책 설계."
learn_to_save:
  - "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다."
local_output_handoff: "output/codex-handoffs/20260429-130251-crm-deposit-credit-balance-final-handoff.md"
session_log: "output/codex-sessions/20260429-101738-offline-crm.md"
backup_folder: "(none)"
---

# Codex durable handoff

## 요약
CRM 예치금/초과입금/환불완료 보정 작업 완료. 구례군은 1,000,000원 중 743,500원 정산 + 256,500원 예치금으로 운영 데이터 보정했고, 이승향/한국압화 자동 예치금 보정은 사용자 판단에 따라 원복했다. 마니랜드는 1,554,000원 환불 완료 이력으로 정리했고 서상견 1,000,000원 입금은 기존 미수 상환으로 유지했다. 수금관리에는 초과입금 처리 방식에 이미 환불 완료 옵션을 추가해 main 배포까지 완료했다.

## 다음 작업
다음은 세금계산서 자동화 워크트리를 먼저 해결한다. 그 다음 새 CRM worktree에서 입금수집함 정리 기획/구현을 진행한다: 수동 완료/수동 기록, 제외 수집 규칙(쿠팡 등), 동명이인·가족명의 입금은 자동처리 금지 및 검토큐 처리, 입금수집함 청소/보관 정책 설계.

## 리스크
입금수집함 자체는 아직 지저분하다. 이승향/한국압화는 초과입금 후보로만 남겨두었고 실제 의미는 확인 전 자동 수정 금지. 김순자처럼 동명이인/대리입금 케이스는 자동매칭하면 위험하므로 후속 worktree에서 정책과 UI가 필요하다.

## 로컬 output handoff
`output/codex-handoffs/20260429-130251-crm-deposit-credit-balance-final-handoff.md`

## Git 상태

```text
(clean)
```

## 최근 커밋

```text
8b61a59 [codex] CRM 초과입금 환불완료 처리 추가
737c670 [codex] handoff 저장: crm-deposit-credit-balance-deployed
664ac0e [codex] handoff 저장: crm-deposit-credit-balance-closeout
```

## 운영 데이터 최종 상태

- 구례군농업기술센터
  - 명세표 `INV-20260409-095947` / invoice `100`.
  - 총액 743,500원, 기존 입금 1,000,000원 중 743,500원만 명세표 정산으로 남김.
  - 초과 256,500원은 고객 예치금으로 적립.
  - 화면상 `현재 미수금 0원`, `예치금 256,500원`이 기대 상태다.
- 이승향 님 / 한국압화교육문화협회
  - 초과입금 후보로 자동 보정했으나, 사용자 판단에 따라 전부 원복.
  - 현재 예치금 0원, 보정 이벤트 없음.
  - 이후에는 실제 거래 맥락 확인 전 자동 수정 금지.
- (주)마니랜드
  - 명세표 `INV-20260415-173102` / invoice `125`.
  - 총액 540,000원, 초과 1,554,000원은 실제 환불 완료된 건으로 정리.
  - 고객 메타 이력은 `refund_pending_added` 후 `refund_paid`로 남기고, 현재 예치금/환불대기는 둘 다 0원.
- 서상견 님
  - 명세표 `INV-20260424-143547` / invoice `160`.
  - 1,000,000원 입금은 기존 미수 1,932,900원 상환 패턴으로 확인.
  - 예치금/환불 보정 대상에서 제외하고 운영 데이터 유지.

## 입금수집함 문제 팀미팅 초안

한지훈님 판단: 입금수집함은 자동화율보다 오처리 방지가 우선이다. 쿠팡처럼 CRM 수금과 무관한 입금, 김순자처럼 동명이인/가족명의 입금, 서상견처럼 기존 미수 상환 입금은 같은 알고리즘으로 자동처리하면 위험하다.

김도현님 운영안:

1. 제외 수집 설정
   - 발신자명/메모/계좌/출처/금액 패턴 기준으로 `수집 제외` 규칙을 둔다.
   - 예: 쿠팡 정산/입금류는 CRM 수금 후보에서 자동 제외.
   - 이미 들어온 항목은 일괄 `제외 처리` 또는 `보관 처리`할 수 있어야 한다.
2. 수동 완료 기능
   - 입금수집함 항목을 직접 고객/명세표/기존 미수/예치금/환불대기/환불완료 중 하나로 처리한다.
   - 처리 후 해당 항목은 `완료` 상태로 빠지고, 고객 상세 거래내역에 근거 이력이 남아야 한다.
3. 동명이인·대리입금 안전장치
   - 동일 이름 고객이 2명 이상이면 자동처리 금지.
   - 입금자명이 고객명과 달라도 가족/직원/기관 담당자일 수 있으므로, 고객별 `입금자 별칭`을 명시 등록한 경우에만 자동 후보로 올린다.
   - 별칭도 여러 고객에 중복되면 자동처리 금지, 검토큐로 보낸다.
4. 예외 입금 검토큐
   - 명세표 금액과 안 맞는 입금, 기존 미수 상환 가능성이 있는 입금, 대리입금, 동명이인, 큰 금액은 자동 정산하지 않는다.
   - 검토큐에서 담당자가 사유를 선택하고 수동 완료한다.
5. 청소/보관 정책
   - 삭제보다 `제외/보관/완료/검토중` 상태를 우선한다.
   - 완전 삭제는 감사 추적을 잃으므로 초기 버전에서는 관리자 확인 후 제한적으로만 허용한다.

박서연님 회계 기준:

- 예치금은 고객에게 아직 돌려주지 않았고 다음 거래에 쓸 수 있는 돈이다.
- 환불대기는 돌려줘야 할 돈이다.
- 환불완료는 실제 송금이 끝나서 잔액에 남으면 안 되는 돈이다.
- 기존 미수 상환은 특정 새 명세표의 초과입금이 아니라 이전 받을 돈을 줄이는 입금이다.

최민석님 구현 제안:

- 새 worktree 후보: `bash _tools/pressco21-task.sh crm deposit-inbox-governance`.
- 예상 수정 범위: `offline-crm-v2/src/pages/DepositInbox.tsx`, `offline-crm-v2/src/lib/accountingMeta.ts`, 필요 시 API 타입/테스트.
- 수집함 상태값: `review`, `ignored`, `resolved`, `manual_recorded`, `dismissed` 등을 명확히 분리.
- 각 처리 액션은 `fresh read → dry-run/preview → execute → verify` 흐름을 UI와 테스트에 반영.

윤하늘님 다음 순서:

1. 이 worktree는 예치금/환불 보정 완료 상태로 종료.
2. 세금계산서 자동화 worktree를 먼저 이어서 완료.
3. 이후 새 CRM worktree에서 위 입금수집함 정리 기획을 PRD/작업계획으로 확정하고 구현.

## 입금수집함 후속 acceptance criteria

- 쿠팡 등 제외 규칙을 등록하면 이후 동일 패턴은 수금 후보에 뜨지 않는다.
- 기존에 쌓인 무관 항목을 일괄 제외/보관할 수 있다.
- 김순자 같은 동명이인은 자동처리되지 않고 검토큐에 남는다.
- 서상견 가족명의 100만원 입금처럼 기존 미수 상환인 경우 수동으로 기존 미수 입금 기록을 남길 수 있다.
- 수동 완료 후 고객 상세 거래내역, 수금관리, 대시보드 잔액이 일관되게 갱신된다.
- 모든 처리에는 담당자, 처리시각, 사유, 원본 입금 항목 ID가 남는다.

