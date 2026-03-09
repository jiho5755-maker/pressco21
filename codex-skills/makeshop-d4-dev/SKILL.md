---
name: makeshop-d4-dev
description: Build, review, or debug MakeShop D4 HTML/CSS/JS customizations using the workspace MakeShop guide. Use when editing individual pages or templates, preserving virtual tags, preventing "데이터 수정 실패" editor errors, or validating pasted code before deploy.
---

# MakeShop D4 Dev

Use this skill when MakeShop editor constraints matter more than generic frontend best practices.

## Quick Start

1. Read `/Users/jangjiho/workspace/AGENTS.md` first.
2. If `/Users/jangjiho/workspace/makeshop-references/` exists, read only the file that matches the current page type or error.
3. Identify the page container ID before touching CSS or injected markup.
4. Run the bundled guard script on target files before and after edits:

```bash
python3 scripts/check_makeshop_d4.py <file> [more files...]
```

## Workflow

### 1. Lock the platform constraints before coding

- Preserve every `<!--/.../-->` virtual tag verbatim unless the user explicitly asks for a tag change.
- Treat raw `${` in JS as a save blocker. Escape it as `\${`.
- Prefer `var` and wrap JS in `(function () { 'use strict'; ... })();`.
- Use HTTPS-only assets and avoid emoji characters in code blocks.

### 2. Implement in MakeShop-safe form

- JS: IIFE, `var`, no top-level globals, no raw template placeholders.
- CSS: scope every selector with a stable container ID such as `#my-section`.
- HTML: do not normalize virtual-tag closing forms. Only `<!--/end_if/-->`, `<!--/end_loop/-->`, and `<!--/end_form/-->` are valid closers.

### 3. Verify before handoff

- Re-run the guard script.
- Manually scan for virtual-tag pairing, container scoping, and any pasted `http://` resources.
- If the user asked for deploy validation, confirm in the live MakeShop page after paste or publish rather than marking success from local inspection alone.

## When To Read References

- Read `references/makeshop_d4_rules.md` when you need the exact D4 rules, virtual-tag syntax, common save-error causes, or a final paste checklist.
- If the workspace contains `/Users/jangjiho/workspace/makeshop-references/`, load only the file that matches the current page type or failure mode.

## Guardrails

- Do not replace virtual tags with mock HTML for convenience.
- Do not introduce `let` or `const` into MakeShop D4 templates unless the user explicitly overrides the platform rule.
- Do not declare editor compatibility complete until `${`, tag syntax, IIFE wrapping, and CSS scoping were checked.

## Resources

- `scripts/check_makeshop_d4.py`: fast static guard for raw `${`, `let` or `const`, `http://`, emoji, and missing IIFE hints.
- `references/makeshop_d4_rules.md`: concise reference distilled from `/Users/jangjiho/workspace/AGENTS.md`.
