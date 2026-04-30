---
handoff_id: HOFF-20260430-0940-direct-trade-live-e2e
runtime: codex-omx
owner_agent_id: yoo-junho-paircoder
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task L — live E2E 및 브라우저 검증 재실행
task_goal: 운영 데이터 apply 후 build/lint/E2E/브라우저 검증을 다시 수행하고, 실패한 기존 테스트 문구를 PRD 기준으로 보정한다.
run_outcome: finished
---

## summary
유준호님이 운영 데이터 apply 이후 전체 검증을 재실행했습니다. 최초 full E2E는 93/94 통과, T7-09가 PRD에서 바뀐 confirm 문구(`포장·출고완료 처리할까요`)와 테스트 기대값(`포장·출고확정`) 불일치로 실패했습니다. 테스트 기대값을 PRD 문구로 보정한 뒤 full E2E 94/94 통과했습니다.

## decision
- 제품 문구는 PRD/구현의 “포장·출고완료 처리할까요?”를 유지했습니다.
- 테스트만 새 문구에 맞게 `offline-crm-v2/tests/07-invoice-advanced.spec.ts`에서 수정했습니다.
- full E2E는 운영 NocoDB 프록시를 사용하되 TEST prefix 데이터 cleanup 결과를 별도 read-check했습니다.

## changed_artifacts
- `offline-crm-v2/tests/07-invoice-advanced.spec.ts`

## verification
- `npm run lint`: PASS
- `npm run build`: PASS, Vite chunk size warning only
- governance subset: `npx playwright test tests/11-trade-governance.spec.ts tests/12-deposit-inbox-governance.spec.ts tests/13-month-end-review.spec.ts tests/14-governance-browser-smoke.spec.ts --reporter=list`: PASS, 5/5
- failing spec retry: `npx playwright test tests/07-invoice-advanced.spec.ts -g "T7-09" --reporter=list`: PASS, 1/1
- full live E2E: `npm run test:e2e -- --reporter=list`: PASS, 94/94, 3.1m
- `bash _tools/pressco21-check.sh`: PASS
- `git diff --check`: PASS

## browser_evidence
- Local Playwright full suite exercised real browser flows across customers, invoices, dashboard, transactions, products, suppliers, advanced invoice, customer CRUD, calendar, tax invoice, governance screens.
- Production login smoke: headless browser loaded `https://crm.pressco21.com/login?next=%2F` with status 200 and title `PRESSCO21 CRM 로그인`.

## open_risks
- full E2E 중 Vite proxy에서 일시적인 `getaddrinfo ENOTFOUND n8n.pressco21.com` 로그가 1회 있었지만 테스트는 재시도 없이 통과했습니다.
- chunk size warning은 기존 번들 구조 문제이며 이번 작업의 blocker는 아닙니다.

## blockers
없음.

## next_step
- main 통합 후 운영 앱 코드 재배포가 필요한 변경은 테스트/CLI뿐이라 현재 CRM 사용자 화면 재배포는 필수 아님. 단, 운영 CLI를 서버에도 두고 싶다면 별도 배포 작업으로 분리합니다.

## files_to_inspect_next
- `offline-crm-v2/tests/07-invoice-advanced.spec.ts`
- `offline-crm-v2/playwright.config.ts`

## rollback_or_recovery_note
테스트 문구 변경만 되돌리면 이전 기대값으로 복구됩니다. 제품 문구 자체는 기존 배포 코드와 PRD 기준을 따른 것입니다.

## learn_to_save
PRD에서 UX confirm 문구를 바꾼 경우 E2E의 dialog.message 기대값도 같은 태스크에서 같이 갱신해야 한다.
