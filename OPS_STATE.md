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

## CRM Deposit Automation

- CRM `/data/*` access is no longer browser-session-only for automation.
- Live automation reads CRM snapshot data through `X-CRM-Automation-Key`.
- Browser login and automation auth are intentionally separated.
- Bank notifications are split into:
  - raw bank event: `[은행 거래 알림]`
  - CRM processing result: `[CRM 입금 처리 결과]`

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
