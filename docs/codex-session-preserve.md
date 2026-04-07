# Codex Session Preserve Routine

This is the low-friction preserve / rollback / resume layer for Codex sessions.

Use it when:

- you are about to switch to another chat session
- you want a recoverable branchpoint before risky edits
- you want the next Codex session to recover context fast

All target paths passed to these helpers should stay repo-relative, such as
`n8n-automation/workflows/accounting` or `scripts`.

## The Three Commands

### 1. Save Before Leaving

```bash
cd /Users/jangjiho/workspace
bash pressco21/_tools/codex-update.sh \
  --summary "govt-support audit paused after drift review" \
  --next "continue with the 12 missing migration paths" \
  --risk "footer helper drift is still unresolved" \
  n8n-automation/workflows/govt-support docs
```

What it does:

- appends a checkpoint to the current session log
- creates a scoped backup if paths are provided
- writes a handoff note under `output/codex-handoffs/`
- captures `AI_SYNC` and `OMX` status
- prints a ready-made resume prompt

### 2. Create A Rollback Branchpoint

```bash
cd /Users/jangjiho/workspace
bash pressco21/_tools/codex-branchpoint.sh \
  --label "before-live-rewire" \
  n8n-automation/workflows/accounting scripts
```

What it does:

- records a branchpoint-style handoff
- captures patch + archive backup for the selected scope
- leaves a rollback hint in the handoff note

### 3. Resume In The Next Session

```bash
cd /Users/jangjiho/workspace
bash pressco21/_tools/codex-resume.sh
```

What it does:

- shows the latest handoff note
- shows the latest session log
- shows current `AI_SYNC` and `OMX` status
- prints a suggested natural-language resume prompt

## OMX Note

These commands are not plain-Codex-only helpers.

If you used `OMX` before pausing:

- `codex-update.sh` captures current `omx-run.sh status`
- the handoff note preserves whether team mode was active
- the next session can read one note instead of reconstructing tmux state from memory

## Non-Programmer Default

If you remember only one command, remember this one:

```bash
bash pressco21/_tools/codex-update.sh \
  --summary "여기까지 한 일 요약" \
  --next "다음 세션 첫 작업" \
  --risk "남은 리스크" \
  <현재 작업 경로>
```

That command is the closest equivalent to a "do not lose this session" update routine.

## Natural-Language Requests

You do not need to remember the shell commands exactly.

You can ask Codex like this:

```text
이번 세션 update 해줘.
대화 바꿔도 안 잃어버리게 handoff note 만들고,
현재 작업 경로는 backup까지 남겨줘.
다음 세션에서 바로 이어붙일 수 있게 resume prompt도 같이 남겨줘.
```

```text
위험 작업 들어가기 전에 branchpoint 하나 만들어줘.
실패하면 되돌릴 수 있게 patch랑 archive를 남기고,
다음에 복구할 때 볼 note도 같이 만들어줘.
```

```text
이전 Codex 세션 이어붙일 준비해줘.
최신 handoff note랑 session log 기준으로 resume summary를 보여줘.
```
