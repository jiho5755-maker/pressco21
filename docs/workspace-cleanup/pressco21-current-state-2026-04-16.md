# PRESSCO21 Current Cleanup State - 2026-04-16

## Current Working State

The repository still has a dirty `main` working tree. This cleanup pass reduces future noise but does not finish all classification.

Rollback branchpoint created before cleanup:

```text
output/codex-handoffs/20260416-131941-branchpoint-before-workspace-cleanup-20260416.md
output/codex-backups/20260416-131941-before-workspace-cleanup-20260416
```

The first attempted backup included `tmp/` and was stopped because `tmp/` was about 15GB. The partial generated backup was removed.

## Categories

### Keep In Git After Review

- `docs/nextcloud-employee-guides-2026-04-10/`
- `docs/nextcloud-mini-pc-operator-guide-2026-04-10.md`
- `docs/nextcloud-file-classification-rules-2026-04-15.md`
- `docs/prd-drafts/`
- `scripts/server/mini-pc-*.sh`
- `scripts/server/install-mini-pc-*.sh`
- `n8n-automation/workflows/automation/flora-frontdoor.json`
- `flora-todo-mvp/drizzle/0004_add_approval_fields.sql`
- `tools/openmarket/*.py`

### Ignore By Default

These are local generated outputs or analysis workspaces:

- `tmp/`
- `reports/`
- `tools/product_analysis/`
- `tools/product_analysis_api/`
- `tools/stock_audit/`
- `tools/stock_cleanup/*.csv`
- `tools/openmarket/*_products.json`
- `tools/openmarket/*_results.json`

### Needs Human/Agent Review Before Commit

- `docs/노무/*.docx`
- `tools/openmarket/*.py`
- `n8n-automation/workflows/automation/flora-frontdoor.json`

## Worktree Policy

Once the current main state is committed or intentionally cleaned, use:

```text
/Users/jangjiho/workspace/pressco21-worktrees/
```

Recommended slots:

- `offline-crm`
- `partnerclass`
- `mini-app`
- `n8n`
- `company-knowledge`

Do not run Codex and Claude Code in the same worktree for WRITE tasks.
