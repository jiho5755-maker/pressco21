# OMX Vibe Recipes

This file is the fast path for using `oh-my-codex` on top of the existing `pressco21`
Codex workflow.

Use it when a task is too large for one narrow Codex pass, but you still want:

- the current `AGENTS.md` rules
- the current `AI_SYNC.md` lock discipline
- the current `codex-preflight -> codex-commit -> codex-finish` close-out path

## First Principle

In this workspace:

- `/Users/jangjiho/workspace/pressco21` is the writable working repo
- `/Users/jangjiho/Desktop/n8n-main` is a read-only reference library

Keep that boundary explicit in every OMX session.

## Bootstrap

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/omx-bootstrap.sh
```

## Fast Launcher

Use the preset launcher for recurring `n8n-automation` work:

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/omx-n8n.sh migration-check
bash _tools/omx-n8n.sh accounting-audit
bash _tools/omx-n8n.sh govt-support-audit
bash _tools/omx-n8n.sh homepage-audit
bash _tools/omx-n8n.sh verify-preflight
bash _tools/omx-n8n.sh implement "add rollback-safe parser guard to accounting workflows"
```

If you run these from a normal terminal window, the wrapper automatically creates a leader tmux
session and starts the team there.
If you run them inside tmux, OMX uses the normal interactive team path in the current tmux window.

## What Each Preset Is For

### `migration-check`

Use when you need to verify whether content from `Desktop/n8n-main/pressco21` really moved into
`workspace/pressco21/n8n-automation`.

It asks OMX to:

- compare the two trees
- classify paths into migrated, drifted, and missing
- produce a practical migration checklist

### `accounting-audit`

Use for parser, ledger, alerting, or replay-risk review inside:

- `n8n-automation/workflows/accounting`

This is the best default before touching:

- deposit parsers
- CRM intake wiring
- Telegram summary logic
- replay or ledger behavior

### `govt-support-audit`

Use when work is happening around:

- `n8n-automation/workflows/govt-support`

This is useful for checking migration drift, stale references, and boundary mismatches before
bringing old reference material back into the live workspace.

### `homepage-audit`

Use when homepage automation, footer, form routing, or related assets feel out of sync.

This is the right preset before touching:

- `n8n-automation/workflows/homepage`
- footer/contact content
- vibe-coded homepage helper flows

### `verify-preflight`

Use before a path-scoped commit or deploy-adjacent session.

It asks OMX to focus on:

- dirty-tree contamination
- backup/checkpoint gaps
- commit scope mistakes
- obvious live-deploy blockers

### `implement`

Use when the task is already clear and you want OMX to operate as a structured worker team.

Example:

```bash
bash _tools/omx-n8n.sh implement "port the missing govt-support footer helper from reference and verify drift"
```

## Advanced Use

Override the lane count when the task is larger:

```bash
bash _tools/omx-n8n.sh --lanes 4:executor accounting-audit
```

Print the generated prompt without launching OMX:

```bash
bash _tools/omx-n8n.sh --print migration-check
```

## Recommended Combined Routine

1. Lock `AI_SYNC.md`
2. Run `bash pressco21/_tools/codex-start.sh "<goal>" "<scope>"`
3. If the task is narrow, stay in plain Codex
4. If the task needs role-splitting, run `bash _tools/omx-n8n.sh <preset>`
5. Return to `codex-preflight`, `codex-commit`, and `codex-finish` for close-out

## Practical Rule

Use plain Codex for precise edits.
Use OMX recipes when the real bottleneck is decomposition, migration comparison, or multi-lane
review.
