# Partnerclass Live QA Runbook

## Target URLs

- List: `https://www.foreverlove.co.kr/shop/page.html?id=2606`
- Detail: `https://www.foreverlove.co.kr/shop/page.html?id=2607`
- Partner dashboard: `https://www.foreverlove.co.kr/shop/page.html?id=2608`
- Class registration: `https://www.foreverlove.co.kr/shop/page.html?id=8009`
- My page: `https://www.foreverlove.co.kr/shop/page.html?id=8010`
- Admin: `https://www.foreverlove.co.kr/shop/page.html?id=8011`

## Smoke command

```bash
NODE_PATH=/tmp/partnerclass-live-runner/node_modules \
PARTNER_MEMBER_ID='...' \
PARTNER_MEMBER_PASSWORD='...' \
node scripts/partnerclass-live-smoke.js
```

## Output files

- Result JSON: `output/playwright/partnerclass-20260310-fix/partnerclass-live-results.json`
- Screenshots: `output/playwright/partnerclass-20260310-fix/*.png`

## Scenario coverage

1. List page render
2. Sort, Seoul filter, wishlist filter
3. Affiliation tab render
4. Detail schedule/date/slot flow
5. FAQ and remaining-seat consistency
6. Invalid detail state
7. My page guest notice
8. Partner dashboard tabs and CSV
9. Partner schedule tab
10. Partner grade gauge consistency
11. Class registration validation, schedule add, kit toggle
12. My page logged-in empty state or booking list
13. Admin unauthorized guard
14. Admin read-only API check
15. Admin simulated-positive UI check

## Known gotchas

- Makeshop deployment must be reflected on `foreverlove.co.kr`; repo changes alone are not enough.
- Repeated login with the same member account can invalidate an earlier browser context and cause false failures.
- Record exact failure text and screenshot path in `AI_SYNC.md`.
- If only one member scenario fails after other member scenarios pass, inspect script/session behavior before assuming a live regression.
- For schedule-management issues, inspect:
  - `파트너클래스/파트너/js.js` `showLoading(show)`
  - direct `apiCall(...)` helper presence
  - WF-18 request payload keys such as `member_id`
  - response shape `data.schedules`

## AI_SYNC notes

- Update `Last Changes`, `Next Step`, and `Known Risks`.
- Set `Session Lock` to `IDLE` before commit.
- Use `[codex]` commit prefixes.
