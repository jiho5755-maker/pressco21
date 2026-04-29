---
handoff_id: HOFF-20260430-0409-direct-trade-task0-analysis
runtime: codex-omx
owner_agent_id: choi-minseok-cto
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task 0 — 현재 구현 상태와 PRD 차이 분석
task_goal: PRD 기준 직접거래 거버넌스 구현 범위와 gap을 확인하고 안전한 구현 순서를 정한다.
run_outcome: finished
---

## summary
최민석님이 PRD, 실행 프롬프트, CRM AGENTS 지침, 기존 `tradeGovernance`, `accountingMeta`, `Invoices`, `DepositInbox`, `Receivables`, 테스트 구성을 확인했습니다.

## decision
- 기존 상태 모델은 일부 구현되어 있었으나 업무함/월말점검 신규 화면, 입금수집 수동 완료/제외/보류, 후속입금 상태 노출, 감사 이벤트 보강이 부족했습니다.
- 운영 데이터 write는 승인 전 금지하고, 과거 완납 출고확정은 dry-run 모달과 승인 대기 버튼까지만 유지합니다.

## changed_artifacts
- 없음. 분석 handoff만 작성.

## verification
- `git branch --show-current`: `work/offline-crm/shipment-payment-governance-prd`
- `bash _tools/pressco21-check.sh`: scope OK

## browser_evidence
- 이 단계는 코드 수정 전 분석 단계라 브라우저 검증 없음.

## open_risks
- 보조 subagent 2개가 GPT-5.3-Codex-Spark 사용량 한도 오류로 종료됨. 현재 세션에서 직접 코드맵/검증으로 대체.

## blockers
- 없음.

## next_step
Task A-C 상태 모델/명세표 dry-run/출고 감사 이벤트 보강.

## files_to_inspect_next
- `offline-crm-v2/src/lib/accountingMeta.ts`
- `offline-crm-v2/src/lib/tradeGovernance.ts`
- `offline-crm-v2/src/pages/Invoices.tsx`

## rollback_or_recovery_note
분석 단계라 되돌릴 코드 변경 없음.

## learn_to_save
직접거래 거버넌스는 한 화면 자동처리보다 dry-run, 승인 대기, 상태축 분리, handoff 세분화가 핵심이다.
