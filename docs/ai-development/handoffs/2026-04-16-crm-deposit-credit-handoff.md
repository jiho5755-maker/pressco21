# Handoff: CRM 입금/예치금 정산 개선

Date: 2026-04-16
Tool/session: Codex + tmux/OMX
Merged to main: yes (`b35f5b0` latest after UI placement)
Deployed: yes (https://crm.pressco21.com)

## Summary

CRM 입금 수집함, 명세표 Dialog, 고객 상세 거래내역의 정산 흐름을 개선했습니다.

## Changes

- 입금 수집함: 한 입금을 여러 열린 명세표에 순차 반영하고 예치금까지 상계.
- 명세표 Dialog: 예치금 사용 입력과 `전액` 버튼 추가.
- 명세표 Dialog UI: 예치금 요약 카드를 예치금 입력 바로 아래로 이동.
- 고객 상세 거래내역: 기간 정산 요약 추가.
- 잘못 추가했던 CRM 설정 이미지 클립보드 기능은 revert 완료.

## Operations / data changes

신재승 고객 운영 데이터 보정:

- Backup: `/tmp/pressco21-shinjaeseung-reconcile-backup-20260416-165242.json`
- Customer Id: `5`
- Final outstanding balance: `82,100원`
- Final deposit balance: `0원`

See `docs/ai-development/OPS_LOG.md` for details.

## Validation

- `npm run build` passed during related changes.
- Targeted eslint had no new errors; some pre-existing warnings remain.
- Production deploy completed and health checked.

## Known notes

- Root `team/` untracked folder appears related to Claude/OMX workspace continuity. Do not delete without confirmation.
- Local tmux/Cursor clipboard behavior was improved for image handoff via `/tmp/codex-clipboard-image-*.png` paths.

## Resume prompt

```text
Continue after CRM deposit/credit reconciliation work. Read AGENTS.md, docs/ai-development/CURRENT_STATE.md, OPS_LOG.md, DECISIONS.md, then inspect git log around b35f5b0.
```
