# n8n-main Audit Notes - 2026-04-16

## Status

`/Users/jangjiho/Desktop/n8n-main` has not been fully retired.

The active operating workflows are now centered in:

```text
/Users/jangjiho/workspace/pressco21/n8n-automation
```

However, workspace-level guidance still references `n8n-main` as a read-only source for:

- n8n node implementations: `/Users/jangjiho/Desktop/n8n-main/packages/nodes-base/`
- Claude n8n workflow agents: `/Users/jangjiho/Desktop/n8n-main/.claude/agents/`
- legacy local n8n runtime examples such as `ecosystem.config.js`
- older PRESSCO21 workflow and service references

Therefore, do not delete or move `n8n-main` yet.

## Already Classified As Legacy

These old/reference-only files were moved inside `n8n-main` to:

```text
/Users/jangjiho/Desktop/n8n-main/pressco21/archive/n8n-legacy-unused/
```

- `F030a_SNS_콘텐츠_일일리마인더.json`
- `F030b_SNS_콘텐츠_주간리포트.json`
- `notion-callback.json`
- `notion-to-gcal-sync.json`
- `telegram-todo-bot.json`
- `price-monitor-config.json`

They should not be treated as active deployment targets.

## Next Audit Steps

1. Compare `Desktop/n8n-main/pressco21` against `workspace/pressco21/n8n-automation`.
2. Mark each old folder as one of:
   - migrated
   - legacy reference
   - active source still needed
   - sensitive/private material
   - delete candidate after backup
3. Decide whether `n8n-main` stays on Desktop as a read-only reference or moves under `workspace/tools/`.
4. Only after that decision, update:
   - `/Users/jangjiho/workspace/AGENTS.md`
   - `/Users/jangjiho/workspace/CLAUDE.md`
   - `/Users/jangjiho/workspace/AI-OPERATIONS.md`
