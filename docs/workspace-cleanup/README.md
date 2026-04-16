# Workspace Cleanup

This folder records the cleanup policy for operating PRESSCO21 with Codex and Claude Code.

## Current Decision

- `pressco21/` remains the company operating hub and the canonical source for company context.
- `company-knowledge/` remains the canonical company knowledge source.
- App or project work should use Git worktrees after the current dirty state is cleaned up.
- Generated local analysis output should not be committed by default.
- `n8n-main` is still a read-only reference library until the n8n audit is complete.

## Active Development Habit

Use `main` as the integration branch, and create worktrees for focused work:

```bash
cd /Users/jangjiho/workspace/pressco21
git switch main
git pull
git worktree add ../pressco21-worktrees/<slot> -b work/<project>/<task> main
```

Open only that worktree in Cursor before starting Codex or Claude Code.

## Shared Context Policy

- Company context is read from `company-knowledge/`.
- Project worktrees may read `company-knowledge/`, but should not edit it.
- If company knowledge needs changes, create a separate `docs/company-knowledge/...` branch or worktree.
- Shared files such as `AGENTS.md`, `CLAUDE.md`, and broad `docs/` files should not be edited from a project worktree unless the task explicitly requires it. `AI_SYNC.md` is retired and archived.

## Cleanup Guardrails

- Do not move active app folders until `main` is clean.
- Do not delete old n8n material until the audit confirms whether it is reference-only.
- Do not commit `.secrets*`, `.env*`, local browser artifacts, Playwright output, or generated reports.
- Keep rollback notes in `output/codex-handoffs/` and backups in `output/codex-backups/`.
