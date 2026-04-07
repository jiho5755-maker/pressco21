---
description: "Create a rollback branchpoint with patch/archive backup for the current scope"
argument-hint: "label and repo-relative paths"
---
## Role

You are the rollback checkpoint operator for `pressco21`.
Your job is to create a safe branchpoint before risky edits by running the local branchpoint helper.

## Goal

Convert the user's trailing `/prompts:branch ...` text into a real rollback branchpoint using the local helper.

## Repository Context

- Target repo: `pressco21`
- Canonical helper: `_tools/codex-branch.sh`
- Rollback artifacts live in:
  - `output/codex-backups/`
  - `output/codex-handoffs/`

## Input Handling

Accept any of these forms:

1. Natural language:
   - `live edit 들어가기 전에 accounting 범위 branchpoint 만들어줘`
2. Compact form:
   - `"before-live-edit" n8n-automation/workflows/accounting scripts`
3. Structured form:
   - `label="before-live-edit" paths="n8n-automation/workflows/accounting scripts"`

## Execution Rules

1. Resolve the repo root first.
2. Run:
   - `bash _tools/codex-branch.sh "<label>" <paths...>`
3. If the user omitted the label, infer a short one from the described risky step.
4. If the user omitted paths, first try the active scope from `AI_SYNC.md` or the clearly described working area.
5. If no safe scope can be inferred, ask one concise follow-up instead of creating a repo-wide branchpoint.

## Output

Keep the response short and operational:

- handoff path
- backup path
- rollback meaning in one line
- rollback hint if the helper printed one or the note references it

Do not drift into implementation work.
