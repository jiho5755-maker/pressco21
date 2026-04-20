# MakeShop Price Display Worktree Handoff

Branch: `work/homepage/makeshop-price-display`

Purpose: isolate MakeShop skin price-display changes from the soldout/inventory worktree so this work can be reviewed, rolled back, committed, and pushed independently.

## Current status

- This worktree contains only the local `makeshop-skin` price-display changes migrated from:
  `/Users/jangjiho/workspace/pressco21-worktrees/workspace-flower-resin-10g-soldout`
- It intentionally excludes the open-market/product-OS/soldout-management documents and scripts from the old mixed worktree.
- It has not been pushed unless a later session explicitly does so.

## Related external handoff files

Read these first in a new session:

```text
/Users/jangjiho/Desktop/재고정리/AI_NEXT_SESSION_START_HERE.md
/Users/jangjiho/Desktop/재고정리/output/24_Mid_Session_Closeout_20260418.md
/Users/jangjiho/Desktop/재고정리/output/24_Session_Handoff_Main_Member_Price_Issue.md
```

## Rollback package from the original mixed worktree

```text
/Users/jangjiho/Desktop/재고정리/output/24_Local_MakeShop_Skin_Rollback_20260418_163855
```

That package was used to apply the local skin changes into this isolated worktree.

## Known unresolved issue

The main page still needs a proper audit before finalizing:

- `shopbrand` and `shopsearch` representative products were fixed/verified against detail-page pricing.
- `main.html/main.js` is separate from shopbrand/search.
- The main page currently hides duplicate equal prices, but the final target is stronger:
  when logged in as 강사회원, main cards should display member price / regular price / discount percent when possible.

Next recommended artifact:

```text
/Users/jangjiho/Desktop/재고정리/output/24_Main_Member_Price_Display_Audit.xlsx
```

Columns:

```text
section, branduid, product_name, main_display, detail_sale_price, detail_base_price, detail_rate, policy_rate, diagnosis, fix_strategy
```

## Verification already run in this isolated worktree

```bash
node --check makeshop-skin/main/main.js
node --check makeshop-skin/product/shopbrand.js
node --check makeshop-skin/product/shopsearch.js
node --check makeshop-skin/product/shopdetail.js
git diff --check -- makeshop-skin/main/main.html makeshop-skin/main/main.js makeshop-skin/product/shopbrand.css makeshop-skin/product/shopbrand.html makeshop-skin/product/shopbrand.js makeshop-skin/product/shopdetail.css makeshop-skin/product/shopdetail.html makeshop-skin/product/shopdetail.js makeshop-skin/product/shopsearch.css makeshop-skin/product/shopsearch.html makeshop-skin/product/shopsearch.js
```

MakeShop D4 guard notes:

- Focused shopbrand/shopsearch files pass.
- Some pre-existing `http://`/emoji/tag-count warnings remain in main/shopdetail assets; review before final deploy if those pages are touched again.

## Professional workflow recommendation

1. Continue future MakeShop price-display work in this worktree.
2. Keep soldout/inventory automation work in its own worktree.
3. Do not mix product-data upload files and skin-template changes in one commit.
4. Push only after the user confirms the final live behavior.
