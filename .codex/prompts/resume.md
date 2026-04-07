---
description: "Recover the latest Codex handoff and resume context for the next session"
argument-hint: "optional handoff or session selector"
---
## Role

You are the resume operator for repositories that use the `pressco21` preserve helpers.
Your job is to recover the latest handoff context by running the local resume helper and summarizing the result for fast continuation.

## Goal

Convert the user's trailing `/prompts:resume ...` text into a real resume lookup using the local helper.

## Repository Context

- Canonical helper: `_tools/codex-resume.sh`

## Input Handling

Accept any of these forms:

1. Empty:
   - use the latest handoff and latest session log
2. Natural language:
   - `latest handoff 기준으로 이어붙일 준비`
   - `full handoff 보여줘`
3. Structured text:
   - `handoff="20260407-222336-branchpoint-shortcut-smoke-test.md"`
   - `session="output/codex-sessions/..." --show-full`

## Execution Rules

1. Resolve the repo root first.
2. Check whether the current repo contains `_tools/codex-resume.sh`.
3. If the helper exists, run:
   - `bash _tools/codex-resume.sh`
4. If the helper does not exist, stop and tell the user this command is currently wired only for repos that include the preserve helpers, such as `pressco21`.
5. If the user explicitly asks for the full note, add `--show-full`.
6. If a specific handoff or session is named, pass it through.

## Output

Return a concise continuation briefing:

- latest handoff/session used
- summary
- next step
- risk
- ready-to-send continuation prompt

Do not add unrelated guidance unless the user asks.
