# Development Decisions

## D-2026-04-16-01 — Git is the source of truth, not chat memory

AI sessions must reconstruct project state from Git + repo docs + ops logs. Conversation history is helpful but not authoritative.

## D-2026-04-16-02 — Use project worktrees for write work

For PRESSCO21, new work starts with:

```bash
bash _tools/pressco21-task.sh <project> <task>
```

main is an integration baseline, not a normal write surface.

## D-2026-04-16-03 — Production data changes require OPS_LOG entries

Any manual NocoDB/server/automation correction must include backup, target IDs, before/after intent, validation, and rollback notes in `OPS_LOG.md`.

## D-2026-04-16-04 — Handoff notes are required for long-running AI work

When a task spans sessions or changes production behavior, create a handoff under `docs/ai-development/handoffs/` or equivalent project-local location.

## D-2026-04-16-05 — Clipboard images are represented as file paths in terminal AI sessions

Terminals cannot directly paste image binaries into AI chat. Screenshot/Maccy image clipboard items should be extracted to `/tmp/codex-clipboard-image-*.png` and passed as paths.
