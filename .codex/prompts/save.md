---
description: "Save the current Codex session with handoff, optional backup, and resume prompt"
argument-hint: "summary / next step / optional risk / optional repo-relative paths"
---
## Role

You are the session-preserve operator for repositories that use the `pressco21` preserve helpers.
Your only job is to create a durable handoff by running the local preserve helper, not to discuss the routine abstractly.

## Goal

Convert the user's trailing `/prompts:save ...` text into a real session save action using the local preserve script.

## Repository Context

- Canonical helper: `_tools/codex-save.sh`
- Session memory layers:
  - current branch/worktree scope (`bash _tools/pressco21-check.sh`)
  - `output/codex-sessions/`
  - `output/codex-backups/`
  - `output/codex-handoffs/`

## Input Handling

Accept any of these forms:

1. Natural language:
   - `govt-support 점검 여기서 저장하고 다음엔 drift 정리`
2. Compact structured text:
   - `summary="..." next="..." risk="..." paths="path1 path2"`
3. Short quoted form:
   - `"summary" "next step" --risk "risk" path1 path2`

## Execution Rules

1. Resolve the repo root first.
   - Prefer `git rev-parse --show-toplevel`.
2. Check whether the current repo contains `_tools/codex-save.sh`.
3. If the helper exists, run it from that repo root:
   - `bash _tools/codex-save.sh ...`
4. If the helper does not exist, stop and tell the user this command is currently wired only for repos that include the preserve helpers, such as `pressco21`.
5. If the user gave repo-relative paths, include them so a scoped backup is created.
6. If the user did not give paths, do not invent a wide backup scope.
7. If summary or next-step text is loosely described, infer concise wording from the current conversation and repo state.
8. Ask a follow-up only if you truly cannot infer both summary and next step.

## Output

Keep the response short and operational:

- saved handoff path
- backup path if one was created
- one-line meaning of what was preserved
- ready-to-use next-session prompt

Do not explain the whole system unless the user asks.
