---
handoff_id: HOFF-2026-04-23-crm-transaction-summary-items
created_at: 2026-04-23T14:45:00+09:00
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [choi-minseok-cto, jung-yuna-cmo]
branch: work/offline-crm/transaction-summary-items
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-transaction-summary-items
summary: CRM 고객 상세 거래내역의 새 입력 출고 행에서 INV 발행번호가 적요 주정보로 보이던 문제를 개선해, 거래명세표 품목 요약이 먼저 보이고 발행번호는 보조 텍스트로 남도록 변경했습니다.
decision: 거래내역 적요의 주목적은 전표 추적보다 업무 판독이므로, 최근 고객 명세표 품목을 묶어 '상품명 수량단위 · 상품명 수량단위 · 외 N건' 형태로 표시합니다. 품목이 없거나 조회에 실패하면 기존 메모/발행번호 fallback을 유지합니다.
changed_artifacts:
  - offline-crm-v2/src/lib/api.ts
  - offline-crm-v2/src/pages/CustomerDetail.tsx
verification:
  - npm ci 후 nvm Node v22.21.1 PATH 고정
  - PATH=$HOME/.nvm/versions/node/v22.21.1/bin:$PATH npm run build: 성공
  - PATH=$HOME/.nvm/versions/node/v22.21.1/bin:$PATH npx eslint src/lib/api.ts src/pages/CustomerDetail.tsx: 성공
  - git diff --check: 성공
  - bash _tools/pressco21-check.sh: offline-crm scope OK
open_risks:
  - 운영 NocoDB 실데이터 화면을 브라우저로 직접 열어보는 수동 smoke는 아직 하지 않았습니다.
  - 전체 npm run lint는 기존 App.tsx, Receivables.tsx, Transactions.tsx 등 선행 lint debt 때문에 실패합니다. 변경 파일 단독 lint는 통과했습니다.
next_step: 운영 CRM 고객 상세 거래내역에서 최신 새 입력 출고 행의 적요가 품목 요약으로 보이는지 수동 확인합니다.
learn_to_save:
  - 고객 상세 거래내역의 CRM 출고 적요는 발행번호보다 품목 요약을 우선하고, 발행번호는 보조 텍스트로 유지하는 UX가 실무 판독에 적합합니다.
  - Codex 앱 내장 Node(v24)는 Rollup 네이티브 모듈 코드서명 충돌을 낼 수 있으므로 CRM 검증은 nvm Node v22.21.1 PATH를 앞에 두고 실행합니다.
---

## 담당
윤하늘님(PM)

## 참여
최민석님(CTO), 정유나님(CMO)

## 요약
고객 상세 거래내역의 `적요` 영역에서 `INV-...` 번호만 크게 보이던 흐름을 바꿨습니다. 새 입력 CRM 출고 행은 품목 요약을 첫 줄에 보여주고, 발행번호는 작은 보조 텍스트로 내려갑니다.

## 구현
- `getItemsByInvoiceIds` API helper를 추가해 여러 명세표의 품목을 한 번에 조회할 수 있게 했습니다.
- 고객 상세 화면에서 최근 명세표 최대 100건의 품목을 요약합니다.
- 표시 형식은 `품목명 2개 · 품목명 1세트 · 외 N건`입니다.
- 품목 정보가 없으면 기존 메모/발행번호 fallback을 유지합니다.

## 확인한 것
- CRM production build 성공
- 변경 파일 단독 ESLint 성공
- scope guard 통과
- main에 merge 및 origin/main push 완료

## 남은 위험
운영 데이터가 붙은 실제 화면에서 품목 요약이 기대한 순서로 나오는지 최종 수동 확인이 필요합니다.

## 다음
운영 CRM에서 고객 상세 거래내역 최신 출고 행을 열어 적요 첫 줄이 품목 요약인지 확인합니다.
