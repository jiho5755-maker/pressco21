---
handoff_id: HOFF-20260430-1238-tax-invoice-loading-fix
runtime: codex-omx
owner_agent_id: choi-minseok-cto
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task O — 바로빌 세금계산서 모달 무한 로딩 복구
task_goal: 명세표 작성/조회 화면의 바로빌 전자세금계산서 발급 모달이 응답 지연 또는 필수 정보 누락 상태에서 무한 로딩처럼 보이는 문제를 해소하고 운영 서버에 반영한다.
run_outcome: finished
---

## summary
최민석님이 세금계산서 발급 모달의 무한 대기 가능성을 제거했습니다. 명세표/품목 조회는 15초, 고객 사업자 정보 조회는 8초, 바로빌 발급·상태조회·취소 webhook은 30초 타임아웃을 두어 대기 상태가 풀리도록 했습니다. 사업자번호/대표자/이메일이 없는 경우 발급 버튼을 `정보 보완 필요`로 바꾸고 `고객 정보 보완` 버튼으로 고객 상세로 이동하게 했습니다.

## decision
- 운영 데이터 write는 하지 않았습니다.
- 실제 바로빌 발급 클릭은 수행하지 않았습니다.
- 고객 정보 조회가 지연되면 명세표에 저장된 거래처 정보만으로 모달을 열고 보완 필요 항목을 보여주도록 했습니다.
- 운영 배포 스크립트는 기본 빌드 모드를 `production` + `VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE=true`로 설정했습니다. 따라서 운영 서버에서 버튼은 실제 운영 발급 모드로 표시됩니다.

## changed_artifacts
- 코드 커밋: `69f96a1 [codex] 세금계산서 모달 로딩 보완`
- 운영 릴리스: `/var/www/releases/crm/20260430123709-69f96a1`
- 수정 파일:
  - `offline-crm-v2/src/lib/api.ts`
  - `offline-crm-v2/src/pages/Invoices.tsx`
  - `offline-crm-v2/src/components/TaxInvoiceRequestDialog.tsx`
  - `offline-crm-v2/deploy/deploy-release.sh`
  - `offline-crm-v2/tests/10-tax-invoice.spec.ts`
  - `offline-crm-v2/tests/15-tax-invoice-resilience.spec.ts`

## verification
- `npm run lint`: PASS
- `VITE_BAROBILL_TAX_INVOICE_MODE=production VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE=true npm run build`: PASS
- `npx playwright test tests/15-tax-invoice-resilience.spec.ts --reporter=list`: PASS, 1/1
- `npx playwright test tests/14-governance-browser-smoke.spec.ts --reporter=list`: PASS, 1/1
- `bash _tools/pressco21-check.sh`: PASS
- `bash deploy/deploy-release.sh`: PASS, Release ID `20260430123709-69f96a1`
- Remote `readlink -f /var/www/crm-current`: `/var/www/releases/crm/20260430123709-69f96a1`
- Remote `systemctl is-active crm-auth.service`: `active`
- Remote `curl -fsS http://127.0.0.1:9100/health`: `ok`
- Remote `sudo nginx -t`: successful
- External `curl -I https://crm.pressco21.com/login?next=%2F`: HTTP 200
- Built asset check: 운영 바로빌 문구 포함, 테스트 gate 문구 미포함, `정보 보완 필요`/`고객 정보 보완` 문구 포함

## browser_evidence
- Mock 브라우저 E2E에서 사업자 정보 누락 명세표를 열면 발급 모달이 표시되고, 누락 항목 3개가 보이며, `고객 정보 보완` 버튼은 활성, `정보 보완 필요` 버튼은 비활성으로 확인했습니다.
- 운영 로그인 페이지는 외부 HTTPS 200으로 확인했습니다. 운영 내부 화면은 로그인 세션이 필요해 실제 발급 클릭 없이 배포 smoke만 수행했습니다.

## open_risks
- 실제 바로빌 운영 발급 자체는 클릭하지 않았으므로, 첫 실발급은 사용자가 대상 명세표의 사업자번호/대표자/수신 이메일을 보완한 뒤 1건만 확인해야 합니다.
- n8n/바로빌 쪽이 30초 이상 응답하지 않으면 이제 무한 로딩은 풀리지만, 실제 provider 처리 여부는 발급내역/바로빌 콘솔에서 확인해야 합니다.
- 배포 중 crm-auth health 첫 retry에서 connection refused 로그가 1회 있었으나 재시도 후 health ok로 완료되었습니다.

## blockers
없음.

## next_step
- 사용자가 운영 CRM에서 해당 명세표의 `고객 정보 보완`으로 사업자번호/대표자/이메일을 채운 뒤 세금계산서 발급 모달을 다시 열어 실제 운영 발급 버튼 표시를 확인합니다.
- 실제 발급은 1건만 먼저 실행하고, 발급내역 상태조회가 정상인지 확인합니다.

## files_to_inspect_next
- `offline-crm-v2/src/components/TaxInvoiceRequestDialog.tsx`
- `offline-crm-v2/src/lib/api.ts`
- `offline-crm-v2/src/pages/Invoices.tsx`
- `offline-crm-v2/deploy/deploy-release.sh`

## rollback_or_recovery_note
앱 롤백은 `cd offline-crm-v2 && bash deploy/rollback-release.sh 20260430123709-69f96a1`로 수행할 수 있습니다. 운영 데이터 write는 하지 않았으므로 앱 롤백만으로 이번 변경을 되돌릴 수 있습니다.

## learn_to_save
세금계산서/외부 provider 버튼은 응답 지연 시 반드시 프론트 타임아웃과 중복발급 확인 안내를 함께 둬야 하며, 필수 정보 누락 상태의 primary button은 발급처럼 보이면 안 됩니다.
