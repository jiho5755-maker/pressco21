---
handoff_id: HOFF-20260430-1304-auth-loop-cache-fix
runtime: codex-omx
owner_agent_id: choi-minseok-cto
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task P — CRM 운영 무한 새로고침/인증 루프 복구
task_goal: 운영 CRM에서 세금계산서 모달 확인 중 발생한 무한 새로고침/로그인 루프를 원인 분석하고, 재발 방지 장치를 배포한다.
run_outcome: finished
---

## summary
최민석님이 운영 CRM 무한 새로고침을 복구했습니다. 원인은 두 가지가 겹친 상태였습니다. 첫째, 새 `deploy-release.sh`가 작업 worktree 안의 `.env.local`을 전제로 빌드해 운영 빌드에 `VITE_CRM_API_KEY`가 비어 들어갔습니다. 그래서 로그인 세션은 살아 있는데 `/crm-proxy`는 401이 나고, 앱이 다시 `/login?next=/`로 보내면서 루프가 생겼습니다. 둘째, SPA `index.html` 캐시 정책이 약해 브라우저가 이전 JS 번들을 계속 잡고 있을 수 있었습니다.

## decision
- 운영 데이터 write는 하지 않았습니다.
- 바로빌 실제 세금계산서 발급 버튼은 클릭하지 않았습니다.
- 배포 스크립트는 루트 `.secrets.env`를 읽기 전용으로만 source하고, 값은 출력하지 않도록 유지했습니다.
- `VITE_CRM_API_KEY`가 비어 있으면 배포를 중단하도록 하여 같은 유형의 무키 빌드가 다시 운영에 올라가지 못하게 했습니다.
- SPA 루트/index에는 `no-store`와 `Clear-Site-Data: "cache"`를 적용해 사용자가 오래된 shell/JS에 갇히지 않게 했습니다.
- 앱 내부에는 401 반복 리다이렉트 가드를 추가해 인증 문제가 재발해도 무한 새로고침 대신 오류 메시지로 멈추도록 했습니다.

## changed_artifacts
- 코드 커밋: `1365e8a [codex] CRM 배포 인증 루프 수정`
- 운영 릴리스: `/var/www/releases/crm/20260430125524-1365e8a`
- 수정 파일:
  - `offline-crm-v2/deploy/deploy-release.sh`
  - `offline-crm-v2/deploy/nginx-crm-secure.conf`
  - `offline-crm-v2/src/lib/api.ts`

## verification
- `npm run lint`: PASS
- 운영 secrets를 값 출력 없이 source한 production build: PASS
  - 최신 asset: `index-DpddIfiA.js`
  - CRM API key 번들 포함 여부: TRUE로만 확인, 값 미출력
  - 운영 바로빌 문구 포함: TRUE
  - 테스트 gate 문구 미포함: TRUE
  - 인증 루프 가드 포함: TRUE
- `npx playwright test tests/15-tax-invoice-resilience.spec.ts tests/14-governance-browser-smoke.spec.ts --reporter=list`: PASS, 2/2
- `bash deploy/deploy-release.sh`: PASS, Release ID `20260430125524-1365e8a`
- Remote `readlink -f /var/www/crm-current`: `/var/www/releases/crm/20260430125524-1365e8a`
- Remote `systemctl is-active crm-auth.service`: `active`
- Remote `curl -fsS http://127.0.0.1:9100/health`: `ok`
- Remote `sudo nginx -t`: successful
- External `curl -I https://crm.pressco21.com/login?next=%2F`: HTTP 200
- External unauthenticated `curl -I https://crm.pressco21.com/`: HTTP 302 to login, 정상
- 운영 nginx access log에서 캐시버스터 URL `https://crm.pressco21.com/?v=20260430125524` 이후 `/crm-proxy` 요청들이 200으로 반환되는 것을 확인했습니다.
- 실제 사용자 Chrome 탭에서 `https://crm.pressco21.com/?v=20260430125524`로 진입 후 CRM 대시보드가 로드되는 것을 확인했습니다.
- `bash _tools/pressco21-check.sh`: PASS

## browser_evidence
- 문제 발생 시점: 실제 Chrome에서 `502 Bad Gateway` 후 빈 CRM 화면, `/crm-proxy` 401과 `/login?next=%2F` 303이 반복되는 패턴을 확인했습니다.
- 복구 후: 실제 Chrome에서 대시보드가 표시되고 왼쪽 메뉴/대시보드 카드가 정상 노출되었습니다. 운영 로그도 같은 시각 `/crm-proxy` 200 응답으로 전환되었습니다.

## open_risks
- 사용자가 이미 열어둔 오래된 탭이 아주 오래된 Service Worker/브라우저 상태를 갖고 있으면 한 번 더 새로고침이 필요할 수 있습니다. 이번 nginx 정책은 root/index 요청 시 캐시를 비우도록 해 이후 재발 가능성을 낮췄습니다.
- 바로빌 실제 발급은 운영 데이터 write이므로 아직 클릭하지 않았습니다. 세금계산서 발급 자체는 별도 운영 기능 검증 흐름에서 1건만 실발급 확인이 필요합니다.
- 배포 중 `crm-auth` health 첫 시도에서 connection refused가 1회 발생하는 기존 현상이 있었지만, 재시도 후 active/health ok로 완료되었습니다. 배포 스크립트는 재시도로 통과합니다.

## blockers
없음.

## next_step
- 운영 CRM에서 명세표 작성/조회 화면에 재진입해 무한 새로고침이 없는지 한 번 더 확인합니다.
- 세금계산서 실제 발급은 필수 고객 정보가 채워진 명세표 1건만 대상으로 별도 승인/실행/발급내역 확인 순서로 진행합니다.
- 다음 배포에서도 `deploy-release.sh`가 `VITE_CRM_API_KEY` 누락 시 즉시 실패하는지 유지합니다.

## files_to_inspect_next
- `offline-crm-v2/deploy/deploy-release.sh`
- `offline-crm-v2/deploy/nginx-crm-secure.conf`
- `offline-crm-v2/src/lib/api.ts`
- `/tmp/pressco21-crm-auth-loop-fix-deploy.log` 로컬 배포 로그

## rollback_or_recovery_note
앱 롤백은 운영 서버에서 `/var/www/releases/crm/`의 이전 정상 릴리스로 `crm-current` symlink를 되돌리고 nginx reload를 수행하면 됩니다. 단, 이번 수정은 인증키 누락 배포 차단과 브라우저 캐시 무효화가 핵심이므로 롤백 전에는 반드시 이전 릴리스가 `VITE_CRM_API_KEY`를 포함했는지 확인해야 합니다.

## learn_to_save
운영 SPA 배포는 `.env.local` 존재를 전제로 하면 안 됩니다. 배포 스크립트가 공식 secret source를 읽기 전용으로 source하고 필수 Vite env 존재를 boolean 검증한 뒤 빌드해야 합니다. 인증 실패 리다이렉트는 반드시 반복 가드를 둬야 하며, SPA `index.html`은 무조건 no-store로 운영해야 합니다.
