# OMX Overlay Mode

This workspace already has a working Codex baseline.

- Global Codex config lives in `~/.codex/`
- Project rules live in `AGENTS.md`
- Session discipline lives in project worktrees, branch scope guards, and `_tools/codex-*.sh`

The goal of overlay mode is simple:

- keep the current setup intact
- avoid running `omx setup` in a project root that already has a custom `AGENTS.md`
- still use `oh-my-codex` for role prompts and team orchestration

## What Overlay Mode Adds

- local `oh-my-codex` launch from the checked-out repo
- isolated prompt profile under `~/.codex-profiles/omx-overlay/`
- access to OMX role prompts for `omx team` and related orchestration paths
- no overwrite of `pressco21/AGENTS.md`
- no rewrite of the current `~/.codex/config.toml`

## What Overlay Mode Does Not Do

- it does not run full `omx setup`
- it does not install OMX skills into `~/.agents/skills`
- it does not replace the existing Codex workflow

That is deliberate. This is the safe first stage.

## Bootstrap Once

Run from the workspace root or the repo root:

```bash
bash pressco21/_tools/omx-bootstrap.sh
```

This prepares:

- `~/.codex-profiles/omx-overlay/codex-home/config.toml`
- `~/.codex-profiles/omx-overlay/codex-home/auth.json`
- `~/.codex-profiles/omx-overlay/codex-home/prompts/*.md`

It also links stable baseline directories like `plugins`, `skills`, `rules`, and `vendor_imports`
from the existing `~/.codex` home so the current environment stays familiar.

## Run OMX Locally

From `pressco21/`:

```bash
bash _tools/omx-run.sh help
bash _tools/omx-run.sh status
bash _tools/omx-run.sh --xhigh
```

If you launch `team` from a normal shell, the wrapper automatically creates a leader tmux session
and runs OMX there.
If you launch from inside tmux, OMX keeps the normal interactive team mode in the current tmux
window.

Refresh the overlay profile after OMX prompt updates:

```bash
bash _tools/omx-run.sh --refresh-profile help
```

## Recommended Use In This Workspace

### Keep Plain Codex For

- small targeted edits
- existing `codex-start -> checkpoint -> preflight -> commit -> publish` sessions
- work that must stay tightly bound to the current repo rules

### Use OMX For

- multi-lane implementation work
- role-split investigations
- larger refactors where planner / executor / verifier separation helps
- tasks that benefit from explicit staged flow

## Practical Commands

### Team Orchestration

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/omx-run.sh team 3:executor "offline-crm-v2 customer detail regression sweep with tests"
```

### N8N Preset Launcher

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/omx-n8n.sh migration-check
bash _tools/omx-n8n.sh accounting-audit
```

For recurring `n8n-automation` sessions, use the recipe guide:

- `docs/omx-vibe-recipes.md`

### N8N Workflow Analysis

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/omx-run.sh team 3:executor "audit n8n-automation/workflows/accounting for parser regression risks"
```

### OpenClaw / OMX Repo Work

```bash
cd /Users/jangjiho/workspace/OMX\\(오_마이_코덱스\\)/oh-my-codex
node bin/omx.js team 3:executor "refactor openclaw notification flow and verify tests"
```

## Safe Rules

1. Do not run `omx setup` in `pressco21/` while the current custom `AGENTS.md` is the source of truth.
2. Keep `Desktop/n8n-main` read-only. Use it as a reference library only.
3. Start from a project worktree created by `_tools/pressco21-task.sh`, even when OMX is the launcher.
4. Treat OMX as an accelerator, not as a replacement for the current path-scoped commit discipline.

## Best Combined Routine

1. Create/open the proper project worktree
2. Run `bash _tools/pressco21-check.sh` and then `bash pressco21/_tools/codex-start.sh "<goal>" "<scope>"`
3. If the task is narrow, stay in plain Codex
4. If the task needs role splitting, switch to `bash pressco21/_tools/omx-run.sh team ...`
5. Return to the existing `codex-preflight`, `codex-commit`, and `codex-finish` helpers for close-out
