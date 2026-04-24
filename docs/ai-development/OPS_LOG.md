# Operations Log

This file records production deployments, manual data corrections, rollbacks, and environment operations that are not fully represented by source code alone.


## 2026-04-24 — OpenClaw/clawdbot pairing and Mac node exec repair

### Operations

- Backed up Flora `~/.openclaw/devices/paired.json`, then rotated the `clawdbot-macbook` operator device token without printing the token.
- Backed up MacBook `~/.openclaw/exec-approvals.json`, then added minimal `flora-frontdoor` read-only allowlist entries for `which`, `pwd`, and git status/log/branch queries.
- Backed up and updated Flora frontdoor `BOOTSTRAP.md` and `local-project-explorer/SKILL.md` to route MacBook local queries through `exec(host=node,node=jiho-macbook)` with `workdir` instead of `cd ... && ...`.

### Validation

- `clawdbot --version` works: `2026.1.24-3`.
- `openclaw devices list` shows `clawdbot-macbook` with operator token and no pending request.
- `openclaw nodes status` shows `jiho-macbook` paired and connected.
- Flora agent can run `which git/codex/claude` on the MacBook node.
- Natural prompt `pressco21 프로젝트 git status만 확인해줘` returns MacBook git status via node exec.

### Backups / rollback

- Flora paired device backup: `~/.openclaw/devices/paired.json.bak-20260424T032454Z-codex001`.
- Mac approvals backups: `~/.openclaw/exec-approvals.json.bak-20260424T034307Z-codex002`, `~/.openclaw/exec-approvals.json.bak-20260424T034523Z-codex002-git`, `~/.openclaw/exec-approvals.json.bak-20260424T034621Z-codex002-git-broad`.
- Flora prompt/skill backups: `BOOTSTRAP.md.bak-20260424T034855Z-codex002`, `local-project-explorer/SKILL.md.bak-20260424T034855Z-codex002`.
- Rollback by restoring the relevant backup file and restarting/reloading the affected OpenClaw gateway/node process if needed.

### Remaining risks

- Telegram `getUpdates` 409 conflict remains unresolved. Read-only follow-up narrowed this to two simultaneous long-pollers using the same bot token: Mac LaunchAgent `com.pressco21.flora-telegram-room-router` and Flora `openclaw-gateway.service`. Safest remediation is to stop/disable the legacy local room-router or move it to a distinct dev bot token, then verify both local router logs and Flora gateway journal no longer show 409.
- OpenAI Codex OAuth refresh failures remain unresolved. Flora logs show `refresh_token_reused`; multiple agent auth profiles share the same stale `openai-codex:codex-cli` refresh token, while the `owner` agent also has a newer `openai-codex:jiho5755@gmail.com` profile that is not selected by `lastGood`/auth order. Safest remediation is to back up auth stores, re-authenticate OpenAI Codex on Flora, and make the fresh profile the selected OpenAI Codex profile for the relevant agents.
- Codex/Claude CLI execution bridge remains conservatively gated; path lookup works, but actual CLI execution should be approved separately.

### Follow-up investigation (read-only)

- Confirmed local Mac token fingerprints for `FLORA_TELEGRAM_BOT_TOKEN` and `PRESSCO21_DEV_ROUTER_BOT_TOKEN` match the Flora gateway bot token fingerprint (`55d2ff8b123e`); no token values were printed.
- Local `run-flora-telegram-room-router.js` calls Telegram `getUpdates`; `run-flora-local-dev-worker.js` uses Telegram APIs but does not call `getUpdates`.
- Flora `journalctl --user -u openclaw-gateway.service` repeats `getUpdates conflict` roughly every polling cycle, and local `flora-telegram-room-router` logs repeat HTTP 409 at matching cadence.
- Flora OpenAI Codex logs include `code=refresh_token_reused`, causing `openai-codex/gpt-5.4` to fail and `google/gemini-2.5-flash` fallback to succeed.
- No runtime stop/login/change was performed during this follow-up pass.

### Runtime remediation (Codex follow-up)

- Stopped and disabled the legacy Mac LaunchAgent `com.pressco21.flora-telegram-room-router` so the primary Telegram bot has a single long-poller: Flora `openclaw-gateway.service`.
  - Rollback: `launchctl enable gui/$(id -u)/com.pressco21.flora-telegram-room-router && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.pressco21.flora-telegram-room-router.plist`.
- Backed up Flora OpenClaw auth stores before changing OAuth profiles:
  - `/home/ubuntu/.openclaw/backups/codex-oauth-20260424T152237Z.tgz`
  - `/home/ubuntu/.openclaw/backups/codex-auth-store-cleanup-20260424T154733Z.tgz`
- Imported the existing local Codex CLI OAuth login into Flora OpenClaw as `openai-codex:default` without printing token values. Temporary server-side `CODEX_HOME` import directory was removed after use.
- Updated OpenAI Codex auth order/lastGood to `openai-codex:default` for `owner`, `main`, `staff`, `flora-codex-room`, `flora-claude-room`, `flora-crm`, and `flora-frontdoor`.
- Removed stale deprecated `openai-codex:codex-cli` entries from those agent auth stores and normalized the legacy `google:gemini-api` auth type spelling from `api-key` to `api_key` in the `main` store.

### Validation

- Local `launchctl` shows `com.pressco21.flora-telegram-room-router` disabled; router error log mtime stopped advancing after the disable.
- Flora `openclaw-gateway.service` remains active.
- Flora gateway journal checks showed, over the latest 5-minute window:
  - Telegram `409` conflict count: `0`
  - OpenAI Codex OAuth refresh/token-exchange error count: `0`
  - invalid auth-profile warning count: `0`
- `openclaw infer model run --local --model openai-codex/gpt-5.4` returned `OK` for `owner`, `flora-codex-room`, and `flora-frontdoor`.
- `openclaw infer model run --gateway --model openai-codex/gpt-5.4` returned `OK` for `flora-frontdoor`, confirming gateway execution uses OpenAI Codex without Gemini fallback.

### Final close check (2026-04-25 03:53 KST)

- `work/workspace/openclaw-setup-audit` commit `d631c5b` is included in main via merge `a3e44dc`, and the feature branch was fast-forward pushed to `origin/work/workspace/openclaw-setup-audit`.
- Local `com.pressco21.flora-telegram-room-router` remains disabled and no local room-router process is running.
- Flora gateway journal over the latest 10-minute window showed no Telegram `409`/`Conflict`, `refresh_token_reused`, token-exchange, or invalid auth-profile warnings.
- Flora `flora-frontdoor` status reports `openai-codex/gpt-5.4`, and a gateway inference smoke test returned `OK`.

## 2026-04-16 — CRM deposit/credit reconciliation deployment

### Code deployed

- `f2b643c [codex] 입금 예치금 정산 흐름 개선`
- `133c407 [codex] 명세표 예치금 입력 정렬 개선`
- `b35f5b0 [codex] 예치금 요약 위치 조정`
- Reverted mistaken CRM settings clipboard feature with `b6b85c4`.

### Production deploy

- Command: `cd offline-crm-v2 && bash deploy/deploy.sh`
- URL: https://crm.pressco21.com
- Health: `crm-auth.service active`, `/health ok`

### Manual data correction: 신재승

Backup:

- `/tmp/pressco21-shinjaeseung-reconcile-backup-20260416-165242.json`

Target:

- Customer Id: `5`
- Customer name: `우리꽃누름(신재승회장님)`
- Review queue amount: `1,000,000원`

Applied changes:

| Record | Change |
|---|---|
| Invoice `#84` | paid `513,400`, current balance `0`, status `paid` |
| Invoice `#110` | paid `486,600`, deposit used `101,600`, current balance `0`, status `paid` |
| Invoice `#128` | deposit used `9,000`, current balance `82,100`, status `partial` |
| Customer `#5` | deposit balance `0`, outstanding balance `82,100` |
| Auto deposit queue | marked handled/dismissed with note |

Reason:

- The pending `1,000,000원` payment should clear older open invoices and use remaining deposit on the new order flow.

Rollback reference:

- Restore values from the backup JSON above if this correction needs to be reversed.

## 2026-04-16 — Local AI/tmux clipboard improvements

Purpose:

- Prevent accidental tmux copy-mode interactions from wiping macOS clipboard.
- Allow screenshot clipboard images to be passed into Codex/tmux as file paths.
- Improve Maccy/image clipboard workflow.

Changes:

- Installed `pngpaste` via Homebrew.
- Updated `~/.tmux/omx-copy-selection.sh` to ignore empty selections.
- Added/updated `~/.local/bin/codex-clipboard-image`.
- Added/updated `~/.local/bin/omx-paste-clipboard-to-tmux`.
- Added Cursor terminal `cmd+v` smart paste binding.

Backups created during the process include timestamped copies of:

- `~/.tmux.conf`
- `~/.tmux/omx-copy-selection.sh`
- `~/.local/bin/codex-clipboard-image`
- `~/.local/bin/omx-paste-clipboard-to-tmux`
- Cursor `keybindings.json`

## 2026-04-18 — CRM ExcelJS migration production deployment

### Code deployed

- `0d0d318 [codex] CRM 엑셀 처리 ExcelJS 전환`

### Production deploy

- Command: `cd offline-crm-v2 && PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH" bash deploy/deploy-release.sh`
- Release ID: `20260418081213-0d0d318`
- URL: https://crm.pressco21.com
- Release links on Oracle:
  - `/var/www/crm -> /var/www/releases/crm/20260418081213-0d0d318`
  - `/var/www/crm-current -> /var/www/releases/crm/20260418081213-0d0d318`

### Validation

- Local pre-deploy validation:
  - `npm run build` passed with Node `v22.21.1`
  - `npm audit --audit-level=moderate` returned `found 0 vulnerabilities`
  - Targeted eslint/tsc passed before deployment
  - `npm run test:invoices`: 13 passed, 1 skipped
- Production health:
  - `https://crm.pressco21.com/auth/health -> ok`
  - `crm-auth.service active`
  - Root URL redirects to `/login?next=%2F` as expected

### Notes

- The deploy script printed an initial transient `curl: (7) Failed to connect to 127.0.0.1 port 9100` while `crm-auth.service` was restarting, then completed successfully. Manual health checks after deploy passed.
- The deployed assets include the lazy ExcelJS chunk `exceljs.min-DUbzRo0-.js`.

### Rollback

```bash
cd /Users/jangjiho/workspace/pressco21/offline-crm-v2
bash deploy/rollback-release.sh 20260418081213-0d0d318
```

Use the release list on Oracle if rolling back to the previous release instead of reselecting this release.
