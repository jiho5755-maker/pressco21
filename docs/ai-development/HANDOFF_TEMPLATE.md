# Handoff: <task title>

Date: YYYY-MM-DD
Tool/session: Claude Code | Codex | OMX | Cursor
Branch/worktree: `<branch>` / `<path>`
Merged to main: yes/no (`<commit>`)
Deployed: yes/no (`<url or environment>`)

## Summary

- What changed?
- Why was it needed?

## Files changed

- `path/to/file`: reason

## Validation

- [ ] Build/typecheck:
- [ ] Tests/lint:
- [ ] Manual/browser check:
- [ ] Production health:

## Operations / data changes

- Backup path:
- Target records:
- Before/after:
- Rollback notes:

## Decisions made

- Durable design/ops decisions that future agents should not relitigate.

## Known risks / TODO

- Remaining issue:
- Next recommended step:

## Resume prompt

```text
Continue from docs/ai-development/handoffs/<this-file>.md.
First read AGENTS.md, CURRENT_STATE.md, OPS_LOG.md, DECISIONS.md, then inspect git status/log.
```
