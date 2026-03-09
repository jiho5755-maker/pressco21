# MakeShop D4 Rules

## Core Constraints

- Escape every raw `${` as `\${}` in JS template literals.
- Use `var` instead of `let` or `const` for MakeShop editor compatibility.
- Wrap JS in an IIFE: `(function () { 'use strict'; ... })();`
- Scope CSS with a stable container ID such as `#my-section .card`.
- Preserve `<!--/tag/-->` virtual tags exactly.
- Avoid emoji characters in source code.
- Use HTTPS-only CDN assets.

## Valid Virtual Tag Forms

```html
<!--/tag_name/-->
<!--/link_xxx/-->
<!--/include_xxx/-->
<!--/form_xxx/--> ... <!--/end_form/-->
<!--/if_xxx/--> ... <!--/end_if/-->
<!--/loop_xxx/--> ... <!--/end_loop/-->
```

Only these closing tags are valid:

- `<!--/end_if/-->`
- `<!--/end_loop/-->`
- `<!--/end_form/-->`

## Common Save Failure Causes

- Raw `${` left inside JS template literals
- `let` or `const` pasted into editor code
- Virtual tags renamed, normalized, or deleted
- Unscoped CSS that collides with host markup
- Emoji pasted into comments or strings
- `http://` assets blocked by browser mixed-content rules

## Final Paste Checklist

- Search `${` and confirm every occurrence is escaped
- Search `let ` and `const ` and replace with `var`
- Confirm each JS block is wrapped in an IIFE
- Confirm CSS selectors start from a container ID
- Confirm every virtual tag is unchanged and closed with the valid end tag
- Confirm CDN links use HTTPS
- Confirm no emoji slipped into comments, strings, or markup
