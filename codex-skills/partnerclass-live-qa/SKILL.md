---
name: partnerclass-live-qa
description: Run PRESSCO21 partnerclass live smoke verification on foreverlove.co.kr after Makeshop deploys or bug fixes. Use when Codex needs to verify class list/detail, partner dashboard, class registration, my page, or admin smoke flows, collect screenshots and result JSON under output/playwright, and record the outcome in AI_SYNC.md.
---

# Partnerclass Live QA

Use the existing live smoke script instead of rebuilding ad-hoc Playwright flows.

## Quick Start

1. Read `AGENTS.md`, `파트너클래스/AGENTS.md`, and `AI_SYNC.md`.
2. Acquire the `AI_SYNC.md` lock before writing anything.
3. Run:

```bash
NODE_PATH=/tmp/partnerclass-live-runner/node_modules \
PARTNER_MEMBER_ID='...' \
PARTNER_MEMBER_PASSWORD='...' \
node scripts/partnerclass-live-smoke.js
```

4. Read `output/playwright/partnerclass-20260310-fix/partnerclass-live-results.json`.
5. Update `AI_SYNC.md` with pass/fail summary, exact error messages, and screenshot paths for failures.
6. Set `AI_SYNC.md` back to `IDLE` before commit/push.

## Workflow

### Standard verification

- Prefer the single script run for final verdicts.
- Treat the result JSON as the source of truth for scenario counts and failure messages.
- Keep screenshots in `output/playwright/partnerclass-20260310-fix/`.

### If a scenario fails

- Read the matching screenshot path from the result JSON.
- Distinguish script issues from live app issues before editing production code.
- Reuse one logged-in browser session when debugging member flows. Duplicate login with the same account can invalidate the earlier session and create false negatives.

### If code was changed

- Re-run the same smoke command after deploy.
- Do not mark the issue resolved from local-only verification if the user asked for live confirmation.

## Current repo hooks

- Main runner: `scripts/partnerclass-live-smoke.js`
- Common failure hot spots:
  - `파트너클래스/파트너/js.js`
  - `파트너클래스/강의등록/js.js`
  - `파트너클래스/마이페이지/js.js`
  - `파트너클래스/목록/js.js`

## References

- Read `references/runbook.md` for target URLs, scenario coverage, artifact paths, and known gotchas.
