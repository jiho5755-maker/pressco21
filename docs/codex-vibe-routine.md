# Codex Vibe Routine

Codex session work should keep experimentation fast, while making state capture mechanical.

The rule is simple:

1. One session, one goal.
2. Lock `AI_SYNC.md` before edits.
3. Capture a checkpoint before risky refactors or deploy.
4. Back up only the current working scope.
5. Close the session with next step and risk notes.

## What The Scripts Own

- `AI_SYNC.md`: owned by Codex during the conversation
- `output/codex-sessions/`: session logs and checkpoints
- `output/codex-backups/`: rollback artifacts for the current scope
- `_tools/codex-*.sh`: repeatable terminal helpers

The scripts are intentionally narrow. They do not try to rewrite `AI_SYNC.md` automatically. `AI_SYNC.md` stays readable because Codex updates it deliberately, and the scripts focus on durable artifacts.
Generated session logs and backup archives are local runtime artifacts and should stay out of normal git commits.

## Memory Model

- `AI_SYNC.md`: live lock, current owner, and near-term handoff
- `output/codex-sessions/*.md`: session-by-session execution memory
- `OPS_STATE.md`: durable operating facts that the next session should still trust

Use the right layer for the right kind of memory. Do not turn `AI_SYNC.md` into a long diary, and do not put one-off experiments into `OPS_STATE.md`.

## Suggested Session Flow

1. Start
   - Lock `AI_SYNC.md`
   - Run `bash pressco21/_tools/codex-start.sh "<goal>" "<subdirectory>"`
2. Explore
   - Read code, inspect workflows, test assumptions
   - Do not deploy in this phase
3. Checkpoint
   - Run `bash pressco21/_tools/codex-checkpoint.sh "<title>" "<note>"`
4. Backup
   - Run `bash pressco21/_tools/codex-backup.sh --label "<label>" <path> [path...]`
5. Preflight
   - Run `bash pressco21/_tools/codex-preflight.sh <path> [path...]`
6. Commit
   - Run `bash pressco21/_tools/codex-commit.sh --message "<korean summary>" <path> [path...]`
7. Publish
   - Run `bash pressco21/_tools/codex-publish.sh`
8. Finish
   - Run `bash pressco21/_tools/codex-finish.sh --summary "<summary>" --next "<next step>" [--risk "<risk>"]`
   - Return `AI_SYNC.md` to `IDLE`

## OMX Overlay

Use OMX as an overlay when the task needs role-splitting or parallel lanes, but keep the current
project rules and close-out routine.

- Bootstrap once: `bash pressco21/_tools/omx-bootstrap.sh`
- Run OMX locally: `bash pressco21/_tools/omx-run.sh ...`
- Use n8n presets: `bash pressco21/_tools/omx-n8n.sh <preset>`
- Reference guide: `docs/omx-overlay-mode.md`
- Recipe guide: `docs/omx-vibe-recipes.md`

Do not run `omx setup` directly in `pressco21/` unless the project intentionally migrates AGENTS
and config ownership to OMX.

## Natural-Language Requests For Codex

### Session Start

Use this when you want Codex to begin a focused session:

```text
이번 세션 목표는 "CRM 인증/입금알림 복구"야.
범위는 offline-crm-v2, scripts, n8n-automation/workflows/accounting만 잡아줘.
AI_SYNC 잠금 잡고 codex-start까지 실행한 뒤 시작해줘.
```

### Midway Checkpoint

Use this when the session has reached a stable point:

```text
여기서 중간 체크포인트 하나 찍어줘.
지금까지 바뀐 파일, diff stat, 테스트 결과를 세션 로그에 남기고
다음에 이어붙기 쉬운 상태로 정리해줘.
```

### Backup Before Risk

Use this before deploy, big refactors, or live workflow edits:

```text
배포 전에 이번 범위만 백업해줘.
patch랑 압축본 둘 다 남기고,
백업 경로랑 롤백에 필요한 파일 범위를 세션 로그에 적어줘.
```

### Preflight

Use this right before deploy or live edits:

```text
배포 전 preflight 돌려줘.
AI_SYNC 충돌, secret 파일 변경, 현재 작업 범위 상태를 확인하고
막히는 게 있으면 먼저 정리해줘.
```

### Finish And Handoff

Use this when you are done for now:

```text
이번 세션 마감해줘.
최종 상태, 검증 결과, 남은 리스크, 다음 첫 작업을 세션 로그에 남기고
AI_SYNC를 IDLE로 돌려줘.
```

### Stable Commit

Use this when the current scope is stable enough to save in git:

```text
여기까지는 안정 지점이니까 이번 범위만 선별 커밋해줘.
커밋 전에 staged 오염이 있는지 확인하고,
커밋 메시지는 [codex] prefix로 정리해줘.
```

### Publish

Use this when you want the current branch published intentionally:

```text
이제 publish 준비됐는지 확인해줘.
현재 브랜치의 최신 커밋과 upstream 상태를 보고,
문제 없으면 push까지 진행해줘.
dirty tree면 왜 막는지도 같이 알려줘.
```

### Memory Update

Use this when the session changed durable operating facts:

```text
이번 변경 중에서 다음 세션도 계속 알아야 하는 운영 사실만 추려서
OPS_STATE.md에 반영해줘.
AI_SYNC에는 이번 handoff만 남기고,
세션 세부 내역은 session log에 남겨줘.
```

## Direct Commands

All commands run from `/Users/jangjiho/workspace`.

```bash
bash pressco21/_tools/codex-start.sh "crm auth recovery" "offline-crm-v2, scripts"
bash pressco21/_tools/codex-checkpoint.sh "parser stable" "live credential check passed"
bash pressco21/_tools/codex-backup.sh --label "before-deploy" offline-crm-v2/deploy scripts/deploy-crm-deposit-telegram.js
bash pressco21/_tools/codex-preflight.sh offline-crm-v2/deploy scripts/deploy-crm-deposit-telegram.js
bash pressco21/_tools/codex-commit.sh --message "CRM 인증 복구 루틴 추가" _tools docs/codex-vibe-routine.md OPS_STATE.md
bash pressco21/_tools/codex-publish.sh --dry-run
bash pressco21/_tools/codex-finish.sh --summary "live alert path restored" --next "verify next real deposit" --risk "4 unmatched backlog deposits remain"
```

The command path can start with `pressco21/_tools/...` when run from workspace root.
The target file paths should always stay repo-relative, such as `offline-crm-v2/deploy` or `scripts/deploy-crm-deposit-telegram.js`.

## Practical Rules For Vibe Coding

- Keep one deliverable per session.
- Do not deploy from the exploration phase.
- Checkpoint every 30 to 45 minutes, or earlier before risky edits.
- Back up only your current scope. Avoid repo-wide backup in a dirty tree.
- Commit selected paths only. Do not sweep unrelated dirty files into one commit.
- Push after a stable point or handoff, not every tiny checkpoint.
- Ask Codex for rollback notes before asking for deploy.
- Treat UI-only live edits as incomplete until the repo file is synced.
- If a path is shared with another active agent, stop and re-scope first.

## Minimum Close-Out Checklist

- `AI_SYNC.md` lock released
- session log created and updated
- latest checkpoint recorded
- backup folder created for risky changes
- preflight run before live changes
- selected-path commit made at the stable point
- publish decision made explicitly
- next step and risk written down
