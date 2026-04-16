# Current State — PRESSCO21 Workspace

Last updated: 2026-04-16 (finalized)

## Source of truth

- Code: `origin/main`
- Main local repo: `/Users/jangjiho/workspace/pressco21`
- Worktree protocol: `bash _tools/pressco21-task.sh <project> <task>`
- Scope guard: branch pattern + `_tools/scope-guard.sh`

## Current Git status note

- `main` is the integration baseline.
- `team/` may appear as an untracked local folder. It is assumed to be related to Claude Code / OMX workspace continuity and should not be deleted or committed without explicit confirmation.

## CRM production state

- URL: https://crm.pressco21.com
- Latest deployed commit at time of this note: `b35f5b0 [codex] 예치금 요약 위치 조정`
- Health checked after deploy: `crm-auth.service active`, `http://127.0.0.1:9100/health -> ok`

### CRM changes completed on 2026-04-16

- Deposit inbox can apply a single incoming payment across open invoices.
- Existing customer deposit balance can be used to settle invoice shortages.
- Remaining deposit can be applied to newer invoice balances.
- Invoice dialog supports deposit usage with a compact `전액` button.
- Deposit summary cards were moved directly below the deposit input row.
- Customer detail transaction tab includes settlement-style summary.
- Misunderstood CRM settings clipboard-image feature was reverted.

## Local AI/tmux environment

- `~/.tmux/omx-copy-selection.sh` ignores empty selections so accidental tmux copy-mode does not wipe the macOS clipboard.
- `~/.local/bin/codex-clipboard-image` extracts clipboard screenshots to `/tmp/*.png` using `pngpaste` fast path.
- `~/.local/bin/omx-paste-clipboard-to-tmux` smart-pastes text or saves clipboard images to `/tmp` and pastes the path.
- Cursor terminal `cmd+v` is mapped to tmux smart paste when terminal has focus.

## Finalization note — 2026-04-16

- AI development continuity system is installed under `docs/ai-development/` and `_tools/ai-*`.
- Global helper symlinks are installed in `~/.local/bin`: `ai-project-bootstrap`, `ai-session-start`, `ai-session-finish`.
- Final handoff: `docs/ai-development/handoffs/20260416-183640-work-workspace-final-ai-continuity-handoff.md`.
- For any future local project, run `ai-project-bootstrap . "Project Name"` once, then use `ai-session-start .` and `ai-session-finish . ...`.

## Recommended next-session start

```bash
cd /Users/jangjiho/workspace/pressco21
git switch main
git pull --ff-only
git status --short --branch
ai-session-start .
```
