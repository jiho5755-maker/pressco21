# MakeShop D4 Virtual Tag Damage Patterns

## Common Damage Types (found in Index.html)

### 1. Truncated closing tags
- `<!--/else/-!--/end_if/-->` -- `>` replaced with `-!`
- `<!--/end_if` missing `/-->` closing
- `<!--/en` truncated mid-tag then whitespace-filled

### 2. Merged tags (tag + HTML text merged on same line)
- `fa-hblock/-->` -- should be `fa-heart-o"></i><!--/end_block/-->`
- `<!--/ish_count/-->` -- should be `<!--/add4_product@block_wish_count/-->`
- `<!--/new_prodesent_icon/-->` -- should be `<!--/new_product@present_icon/-->`

### 3. Missing opening comment markers
- `if_recmd_product@usergroup_price/-->` missing `<!--/` prefix
- `add2_product@discount_price_difference/-->` missing `<!--/else_if_` prefix
- `<ce_consumer(+1)/-->` -- corrupted `<!--/else_if_add4_product@pri` prefix

### 4. Wrong product type in tag
- `<!--/new_product@recmd_product/-->` should be `<!--/recmd_product@review_count/-->`

### 5. Tag content replaced with comment text
- `<!--/if 그룹할인가 존재 -->` -- Korean text inside virtual tag, should be `<!--/if_best_product@usergroup_price/-->`

### 6. Closing bracket consumed by truncation
- `</else/-->` missing `<!--` prefix (line 1046)

## Root Cause
Copy-paste or editor line-length truncation during initial commit. Affects entire file uniformly.
