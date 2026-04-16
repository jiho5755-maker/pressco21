# Done Checklist

Use this before saying a development task is finished.

## Code quality

- [ ] Work was done on the correct worktree/branch, not direct main feature edits.
- [ ] Changed paths match project scope.
- [ ] Existing secret files were not edited.
- [ ] Build/typecheck passed.
- [ ] Relevant lint/test/E2E passed, or failures are documented as pre-existing/out-of-scope.
- [ ] UI changes were checked with screenshot or browser where appropriate.

## Git

- [ ] `git status --short --branch` reviewed.
- [ ] Commit message is concise and Korean-friendly.
- [ ] main merge done with `--no-ff` when using work branches.
- [ ] `origin/main` pushed if production/integration should receive it.

## Operations

- [ ] Production deploy command executed if requested.
- [ ] Service health checked after deploy.
- [ ] Manual data changes backed up.
- [ ] Manual data changes recorded in `OPS_LOG.md`.
- [ ] Rollback path documented for risky changes.

## Continuity

- [ ] `CURRENT_STATE.md` updated when the system state changed.
- [ ] `DECISIONS.md` updated for new durable decisions.
- [ ] Handoff note created for multi-session work.
- [ ] Temporary worktrees/branches cleaned up after merge.
