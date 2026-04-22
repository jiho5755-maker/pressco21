#!/usr/bin/env python3
"""메이크샵 관리자 세션을 Playwright CDP로 재사용 가능한지 점검한다.

사용 예시:
  python3 makeshop-skin/_sync/makeshop_admin_cdp_smoke.py \
    --cdp http://127.0.0.1:9222 \
    --url 'https://special397.makeshop.co.kr/makeshop/newmanager/product_search_keyword.html'

성공 조건:
- AGENT 세션 만료 다이얼로그가 없어야 함
- 최종 URL 이 special397 관리자 도메인에 남아 있어야 함
- 메인 프레임 또는 하위 프레임 본문에
  '상품 키워드 검색', '상품 수정', '전체 상품 관리', '쇼핑몰 운영 현황' 같은
  관리자 텍스트가 보여야 함
"""

import argparse
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--cdp', default='http://127.0.0.1:9222')
    parser.add_argument(
        '--url',
        default='https://special397.makeshop.co.kr/makeshop/newmanager/product_search_keyword.html',
    )
    parser.add_argument('--wait-ms', type=int, default=4000)
    parser.add_argument('--screenshot', default='output/playwright/makeshop_admin_cdp_smoke.png')
    args = parser.parse_args()

    dialogs = []
    expected_markers = ('상품 키워드 검색', '상품 수정', '전체 상품 관리', '쇼핑몰 운영 현황')

    result = {
        'cdp': args.cdp,
        'requested_url': args.url,
        'dialogs': dialogs,
        'final_url': None,
        'title': None,
        'body_excerpt': '',
        'frame_matches': [],
        'admin_url_ok': False,
        'admin_text_ok': False,
        'success': False,
    }

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(args.cdp)
        context = browser.contexts[0] if browser.contexts else browser.new_context()
        page = context.pages[0] if context.pages else context.new_page()

        def on_dialog(dialog):
            dialogs.append(dialog.message)
            try:
                dialog.dismiss()
            except Exception:
                pass

        page.on('dialog', on_dialog)
        page.goto(args.url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(args.wait_ms)

        result['final_url'] = page.url
        result['title'] = page.title()

        best_excerpt = ''
        frame_matches = []
        for frame in page.frames:
            try:
                body = frame.locator('body').inner_text(timeout=2000)
            except Exception:
                body = ''
            excerpt = body[:1200]
            matched = [marker for marker in expected_markers if marker in body]
            if matched:
                frame_matches.append({
                    'name': frame.name,
                    'url': frame.url,
                    'matched': matched,
                    'excerpt': excerpt[:400],
                })
            if not best_excerpt and body:
                best_excerpt = excerpt

        result['frame_matches'] = frame_matches
        result['body_excerpt'] = (frame_matches[0]['excerpt'] if frame_matches else best_excerpt)
        result['admin_url_ok'] = page.url.startswith('https://special397.makeshop.co.kr/makeshop/newmanager/')
        result['admin_text_ok'] = bool(frame_matches)
        result['success'] = result['admin_url_ok'] and result['admin_text_ok'] and not any('AGENT' in msg for msg in dialogs)

        screenshot_path = Path(args.screenshot)
        screenshot_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            page.screenshot(path=str(screenshot_path), full_page=True)
        except Exception:
            pass

        print(json.dumps(result, ensure_ascii=False, indent=2))

        try:
            browser.close()
        except Exception:
            pass

    return 0 if result['success'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
