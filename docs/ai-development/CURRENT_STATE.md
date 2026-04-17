# Current State — PRESSCO21 Workspace

Last updated: 2026-04-18 (CRM closed)

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
- Status: closed / complete until a new issue is reported
- Latest deployed release: `20260418081213-0d0d318`
- Latest deployed feature commit: `0d0d318 [codex] CRM 엑셀 처리 ExcelJS 전환`
- Latest documentation commit: `442bdae [codex] CRM ExcelJS 배포 로그 추가`
- Health checked after deploy: `crm-auth.service active`, `https://crm.pressco21.com/auth/health -> ok`

### CRM changes completed on 2026-04-16

- Deposit inbox can apply a single incoming payment across open invoices.
- Existing customer deposit balance can be used to settle invoice shortages.
- Remaining deposit can be applied to newer invoice balances.
- Invoice dialog supports deposit usage with a compact `전액` button.
- Deposit summary cards were moved directly below the deposit input row.
- Customer detail transaction tab includes settlement-style summary.
- Misunderstood CRM settings clipboard-image feature was reverted.

### CRM finalization completed on 2026-04-18

- `customer-search` and `invoice-discount` CRM branches were integrated to `main` and cleaned up.
- CRM Excel handling was migrated from vulnerable `xlsx` to `exceljs`.
- Excel downloads now use ExcelJS-generated `.xlsx` files.
- Deposit inbox uploads now support `.xlsx` and `.csv`; legacy `.xls` uploads are blocked with conversion guidance.
- `npm audit --audit-level=moderate` returns `found 0 vulnerabilities`.
- Production release `20260418081213-0d0d318` was deployed and health checked.
- CRM development is considered complete; do not resume CRM work unless a new issue, bug, or requested enhancement appears.

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
