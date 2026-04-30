---
handoff_id: HOFF-20260430-1215-direct-trade-settlement-production-deploy
runtime: codex-omx
owner_agent_id: kim-dohyun-coo
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task N4 — 수급 지급 관리 운영 배포 및 smoke
task_goal: 수급 지급 관리 IA/자동반영/세금계산서 UI 정비 커밋을 CRM 운영 서버에 릴리스 배포하고 기본 health/browser smoke를 남긴다.
run_outcome: finished
---

## summary
김도현님이 CRM 릴리스 `20260430121301-399271c`를 운영 서버에 배포했습니다. 운영 current symlink, 인증 서비스, 내부 health, nginx 설정, 외부 로그인 페이지 browser smoke가 통과했습니다.

## decision
- 운영 데이터 write는 하지 않았고, 프론트 앱 릴리스만 배포했습니다.
- 배포는 기존 릴리스형 스크립트 `offline-crm-v2/deploy/deploy-release.sh`를 사용했습니다.
- 배포 중 auth health 첫 retry에서 connection refused 로그가 1회 있었으나 스크립트 재시도 후 health ok로 완료됐습니다.

## changed_artifacts
- 운영 릴리스: `/var/www/releases/crm/20260430121301-399271c`
- 운영 current/public symlink: `/var/www/crm-current`, `/var/www/crm`

## verification
- `bash deploy/deploy-release.sh`: PASS, Release ID `20260430121301-399271c`
- Remote `readlink -f /var/www/crm-current`: `/var/www/releases/crm/20260430121301-399271c`
- Remote `systemctl is-active crm-auth.service`: `active`
- Remote `curl -fsS http://127.0.0.1:9100/health`: `ok`
- Remote `sudo nginx -t`: successful
- External `curl -I https://crm.pressco21.com/login?next=%2F`: HTTP 200

## browser_evidence
- Headless Chromium loaded `https://crm.pressco21.com/login?next=%2F`.
- status: 200
- title: `PRESSCO21 CRM 로그인`
- body start: `PRESSCO21 CRM | 내부 로그인 ...`
- 인증 이후 내부 화면은 운영 계정 입력이 필요해 smoke 범위에서 제외했습니다.

## open_risks
- 실제 바로빌 발급은 미수행입니다.
- 고객계정 자동반영은 설정이 켜진 경우 실제 장부 write가 가능하므로, 실입금 후보 dry-run/운영 설정 점검이 필요합니다.
- 운영 env가 test 모드이면 세금계산서 버튼은 계속 테스트 발급으로 표시됩니다.

## blockers
없음.

## next_step
- 운영 화면 로그인 후 `수급 지급 관리` 메뉴와 5개 탭을 사용자 확인합니다.
- 바로빌 실제 발급은 대상 명세표 1건 지정/승인 후 진행합니다.

## files_to_inspect_next
- `offline-crm-v2/deploy/deploy-release.sh`
- `offline-crm-v2/src/pages/SettlementManagement.tsx`
- `offline-crm-v2/src/components/TaxInvoiceRequestDialog.tsx`

## rollback_or_recovery_note
앱 롤백은 `cd offline-crm-v2 && bash deploy/rollback-release.sh 20260430121301-399271c`로 수행합니다. 운영 데이터 변경은 없으므로 앱 롤백만으로 이번 배포 변경을 되돌릴 수 있습니다.

## learn_to_save
프론트 릴리스 배포 handoff에는 release ID, symlink, auth health, nginx test, 외부 HTTPS/browser smoke를 함께 기록해야 합니다.
