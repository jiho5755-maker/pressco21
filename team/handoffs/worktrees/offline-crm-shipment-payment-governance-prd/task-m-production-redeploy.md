---
handoff_id: HOFF-20260430-0944-direct-trade-production-redeploy
runtime: codex-omx
owner_agent_id: kim-dohyun-coo
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task M — 운영 재배포 및 production smoke
task_goal: 운영 apply와 검증 보강 커밋을 포함한 CRM 릴리스를 운영 서버에 다시 배포하고 smoke 검증을 남긴다.
run_outcome: finished
---

## summary
김도현님이 CRM 운영 릴리스를 `20260430093850-6551434`로 재배포했습니다. 운영 symlink, 인증 서비스, 내부 health, nginx 설정, 외부 HTTPS/login 브라우저 smoke가 통과했습니다.

## decision
- 사용자 요청의 “실배포까지 완료” 조건을 충족하기 위해, 앱 런타임 변경이 크지 않더라도 최신 브랜치 커밋 기준으로 release 재배포했습니다.
- 배포는 기존 릴리스형 스크립트 `deploy/deploy-release.sh`를 사용했습니다.

## changed_artifacts
- 운영 배포 릴리스: `/var/www/releases/crm/20260430093850-6551434`
- 운영 current symlink: `/var/www/crm-current` → `/var/www/releases/crm/20260430093850-6551434`

## verification
- `bash deploy/deploy-release.sh`: PASS, Release ID `20260430093850-6551434`
- Remote `readlink -f /var/www/crm-current`: `/var/www/releases/crm/20260430093850-6551434`
- Remote `systemctl is-active crm-auth.service`: `active`
- Remote `curl -fsS http://127.0.0.1:9100/health`: `ok`
- Remote `nginx -t`: ok
- External `curl -I https://crm.pressco21.com`: 302 to `/login?next=%2F`
- Headless browser `https://crm.pressco21.com/login?next=%2F`: status 200, title `PRESSCO21 CRM 로그인`

## browser_evidence
운영 로그인 페이지가 headless browser에서 정상 렌더링됐습니다. 인증 이후 내부 화면은 계정 입력이 필요해 smoke 범위에서 제외했습니다.

## open_risks
- 배포 중 health retry 첫 시도에서 connection refused 로그가 1회 있었으나, 스크립트의 재시도 후 health ok로 완료됐습니다.
- 롤백 시 이전 안정 릴리스 `20260430042708-e7fe067` 또는 이번 릴리스 ID를 기준으로 선택해야 합니다.

## blockers
없음.

## next_step
문제가 생기면 `cd offline-crm-v2 && bash deploy/rollback-release.sh 20260430093850-6551434`로 직전 릴리스로 되돌릴 수 있습니다.

## files_to_inspect_next
- `offline-crm-v2/deploy/deploy-release.sh`
- `offline-crm-v2/deploy/rollback-release.sh`

## rollback_or_recovery_note
롤백 명령은 이번 릴리스 기준 `bash deploy/rollback-release.sh 20260430093850-6551434`입니다. 운영 데이터 apply는 앱 롤백으로 되돌아가지 않으므로 별도 정정 이벤트가 필요합니다.

## learn_to_save
운영 데이터 apply 후 테스트/CLI 커밋만 있더라도 사용자가 “실배포까지”를 요구하면 최신 commit SHA가 반영된 release ID와 production smoke를 별도 handoff로 남긴다.
