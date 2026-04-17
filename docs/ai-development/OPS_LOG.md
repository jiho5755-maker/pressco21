# Operations Log

This file records production deployments, manual data corrections, rollbacks, and environment operations that are not fully represented by source code alone.

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
