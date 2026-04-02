# OPS State

이 파일은 `pressco21` 저장소의 장기 운영 메모다.

원칙:

- 여기는 `지속되는 운영 사실`만 적는다.
- 세션 중간 판단이나 임시 실험은 `output/codex-sessions/`에 남긴다.
- 사람/에이전트 간 충돌 상태는 `AI_SYNC.md`에서 본다.
- 바뀌면 위험한 경로, 인증 방식, 배포 기준, 검증 포인트만 기록한다.

## Memory Layers

1. `AI_SYNC.md`
   - 지금 누가 어디를 만지는지
   - 현재 충돌 상태와 handoff
2. `output/codex-sessions/*.md`
   - 이번 세션의 탐색, 체크포인트, 백업, 커밋, 푸시 기록
3. `OPS_STATE.md`
   - 다음 세션도 계속 알아야 하는 운영 사실

## Current Stable Baseline

- MacBook is the local cockpit. Public traffic should not be added there by default.
- Oracle is the public execution surface for live n8n, NocoDB, CRM, and inbound webhooks.
- Mini PC is backup and archival storage, not a public serving surface.
- OpenClaw is the private control plane and should stay behind loopback, token auth, and private access.

## Local Cockpit Memory

- On the 16GB MacBook, `memory_pressure free %` alone is not a reliable "all clear" signal.
- If swap is already around `6GB` and compressor is around `7GB`, treat it as real local memory pressure even when CPU is mostly idle.
- First response for the local cockpit is pragmatic:
  - save work
  - reboot once
  - reopen only the needed tools
- If the same pressure returns quickly after reboot, reduce the standing app mix first:
  - Cursor family
  - browser/WebKit tabs
  - Claude/Codex tool overlap
  - virtualization processes
- Only tune `scripts/memory-watchdog.sh` after observing the post-reboot pattern. Do not treat one swap-heavy session as proof that the watchdog alone is wrong.

## CRM Deposit Automation

- CRM `/data/*` access is no longer browser-session-only for automation.
- Live automation reads CRM snapshot data through `X-CRM-Automation-Key`.
- Browser login and automation auth are intentionally separated.
- Gmail 보안메일 collector는 IMAP `resolved` 포맷 기준으로 유지한다. 첨부 HTML과 본문 HTML 둘 다 파싱 가능한 상태가 운영 기준이다.
- Intake engine은 `processedExactDepositIds` 기준으로 정확일치 중복을 억제한 뒤 review queue를 만든다.
- Bank notifications are split into:
  - raw bank event: `[은행 거래 알림]`
  - CRM processing result: `[CRM 입금 처리 결과]`

## Flora Todo Operations

- `flora-todo-mvp`는 todo 운영의 현재 원장/운영 UI/API 기준이다.
- Oracle 운영 기준으로 `flora-todo-mvp-postgres`와 `flora-todo-mvp`가 별도 컨테이너로 떠 있으며, 앱은 loopback `127.0.0.1:3001`과 Docker shared alias `flora-todo-mvp`로 노출된다.
- live n8n의 todo 자동화는 Notion이 아니라 Flora에 직접 붙는다.
  - `[F2] 구글 캘린더 → Flora 할 일 등록`
  - `[F3] Flora 모닝 브리핑 (08:00)`
  - `[F4] Flora 밀린 업무 알림 (10:00)`
  - `[F5] Flora → 구글 캘린더 동기화`
  - `[F5] Telegram Callback - Flora 상태 변경`
- 외부 자동화가 task를 적재할 때는 Flora `/api/automation/tasks`를 사용한다. 인증은 automation header 경로로 통일한다.
- 2026-04-02 기준 todo/SNS용 Notion workflow와 Notion credential은 Oracle n8n에서 제거했다.
- 관련 rollback backup은 Oracle `/home/ubuntu/n8n-delete-backups/2026-04-02-notion-sns-retire/`에 있다.

## Server Monitoring

- `pressco21-automation`에는 성격이 다른 두 모니터가 있다.
  - `/home/ubuntu/scripts/server-monitor.sh`: 10분 주기 텔레그램 경보
  - `/home/ubuntu/scripts/monitor.sh`: 15분 주기 종합 상태 로그
- CPU 경보는 `load average`를 퍼센트처럼 쓰면 안 된다. Oracle ARM `2 OCPU` 환경에서는 짧은 부하에도 `100%+`처럼 과장돼 보일 수 있다.
- 운영 `server-monitor.sh`는 2026-04-02 기준 `/proc/stat` 1초 샘플 방식과 `Asia/Seoul` 시간표기를 사용해야 한다.
- 경보 수치가 어긋나면 `/home/ubuntu/logs/monitor.log`의 `/proc/stat` 기반 기록을 우선 기준으로 본다.

## Codex Session Routine

- Start with `AI_SYNC.md` lock, then create a session log.
- Capture checkpoints before risky edits or deploy.
- Back up only the current scope in a dirty repo.
- Commit only selected paths at a stable point.
- Push only when the branch state is understood.

## Files And Paths To Remember

- Session logs: `output/codex-sessions/`
- Scope backups: `output/codex-backups/`
- Codex helpers: `_tools/codex-*.sh`
- Routine guide: `docs/codex-vibe-routine.md`

Generated files under `output/codex-sessions/` and `output/codex-backups/` are local-only artifacts.
Track the directories and helper files in git, but leave the generated logs and archives out of commits.

## Update Triggers

Update this file when one of these changes:

- auth model
- deploy order
- backup location
- public/private network boundary
- live workflow ownership
- rollback method

Do not update this file for:

- one-off fixes
- temporary experiments
- open questions
- per-session TODOs
