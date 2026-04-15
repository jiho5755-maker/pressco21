#!/usr/bin/env python3
"""
HR Tier별 Telegram setMyCommands 배포 스크립트

용도:
    - Flora staff 테이블의 ui_tier 필드 기준으로 각 직원의 개인 DM에 다른 슬래시 명령어 메뉴 설정
    - 새 직원이 @Pressco21_makeshop_bot 에 /start 1회 보낸 후 이 스크립트를 실행하면 해당 tier 메뉴 활성화

사용법:
    export BOT_TOKEN=<@Pressco21_makeshop_bot 토큰>
    python3 setMyCommands.py              # 현재 등록된 전 직원 tier 메뉴 재배포
    python3 setMyCommands.py --user 8312726947  # 특정 user만

배경:
    Telegram Bot API의 setMyCommands는 scope=chat 으로 사용자별 다른 메뉴 설정 가능.
    전제: 사용자가 봇과 최소 1회 DM 대화 시작해야 함 (안 그러면 "chat not found" 400 에러).
    Default commands(/start 1개)는 미등록 사용자 전체에 공통 적용.

Tier 정의 (Flora staff.ui_tier):
    - admin_full     : 대표(장지호), 출퇴근 + 정부지원 9개
    - admin_cmd_only : 원장님, 정부지원 7개 (근태 제외)
    - junior_office  : 이재혁(과장) 포괄임금자, 출퇴근 2개 (/start, /clockout)
    - junior_remote  : 장다경·조승해 재택간주, /start 1개 (업무보고 안내)
    - senior         : 나머지 시니어, /start 1개 (근태 메뉴)

최초 작성: 2026-04-15
"""

import os
import sys
import json
import urllib.request
import urllib.error
import argparse

BASE_URL_TEMPLATE = "https://api.telegram.org/bot{token}"

TIER_COMMANDS = {
    'admin_full': [
        {"command": "start", "description": "근태관리 메뉴"},
        {"command": "clockout", "description": "퇴근 기록"},
        {"command": "search", "description": "정부지원공고 검색"},
        {"command": "summary", "description": "공고 ID로 요약 조회"},
        {"command": "event", "description": "최근 이벤트 기반 탐색"},
        {"command": "status", "description": "정부지원 시스템 상태"},
        {"command": "apply", "description": "공고 신청 의향 표시"},
        {"command": "docs", "description": "행정서류 생성 현황"},
        {"command": "fill", "description": "HWPX 서식 자동 채움"},
    ],
    'admin_cmd_only': [
        {"command": "search", "description": "정부지원공고 검색"},
        {"command": "summary", "description": "공고 ID로 요약 조회"},
        {"command": "event", "description": "최근 이벤트 기반 탐색"},
        {"command": "status", "description": "정부지원 시스템 상태"},
        {"command": "apply", "description": "공고 신청 의향 표시"},
        {"command": "docs", "description": "행정서류 생성 현황"},
        {"command": "fill", "description": "HWPX 서식 자동 채움"},
    ],
    'junior_office': [
        {"command": "start", "description": "근태관리 메뉴"},
        {"command": "clockout", "description": "퇴근 기록"},
    ],
    'junior_remote': [
        {"command": "start", "description": "오늘 업무 안내"},
    ],
    'senior': [
        {"command": "start", "description": "메뉴"},
    ],
}

DEFAULT_COMMANDS = [
    {"command": "start", "description": "메뉴"},
]


def api_post(base_url, method, body):
    req = urllib.request.Request(
        f"{base_url}/{method}",
        data=json.dumps(body).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {
            "ok": False,
            "error_code": e.code,
            "description": e.read().decode()[:300],
        }


def fetch_staff_from_flora():
    """Flora mini/staff API + SSH psql 조합으로 staff + ui_tier + telegram_user_id 목록 획득.

    mini/staff API는 ui_tier/telegram_user_id를 노출하지 않으므로 SSH psql로 조회.
    """
    import subprocess
    cmd = [
        "ssh", "openclaw",
        "docker exec flora-todo-mvp-postgres psql -U postgres -d flora_todo_mvp -t -A -F'|' "
        "-c \"SELECT id, name, telegram_user_id, ui_tier FROM staff "
        "WHERE telegram_user_id IS NOT NULL AND telegram_user_id <> '' ORDER BY id;\""
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"❌ SSH psql 실패: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    staff = []
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        parts = line.split('|')
        if len(parts) >= 4:
            staff.append({
                'id': parts[0],
                'name': parts[1],
                'telegram_user_id': parts[2],
                'ui_tier': parts[3],
            })
    return staff


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--user', help='특정 telegram_user_id만 재설정')
    parser.add_argument('--reset-default', action='store_true',
                        help='Default commands도 재설정 (/start 1개)')
    args = parser.parse_args()

    token = os.environ.get('BOT_TOKEN')
    if not token:
        print("❌ BOT_TOKEN 환경변수 필수", file=sys.stderr)
        print("   사용: export BOT_TOKEN=... && python3 setMyCommands.py", file=sys.stderr)
        sys.exit(1)

    base_url = BASE_URL_TEMPLATE.format(token=token)

    staff = fetch_staff_from_flora()
    if args.user:
        staff = [s for s in staff if s['telegram_user_id'] == args.user]
        if not staff:
            print(f"❌ user {args.user} 미등록", file=sys.stderr)
            sys.exit(1)

    print(f"📋 배포 대상: {len(staff)} 명")

    if args.reset_default:
        print("\n=== Default commands 재설정 ===")
        r = api_post(base_url, "deleteMyCommands", {})
        print(f"  deleteMyCommands: {r.get('ok')}")
        r = api_post(base_url, "setMyCommands", {"commands": DEFAULT_COMMANDS})
        print(f"  setMyCommands default: {r.get('ok')} ({len(DEFAULT_COMMANDS)}개)")

    print("\n=== Per-chat scope 설정 ===")
    ok_count = 0
    fail = []
    for s in staff:
        tier = s.get('ui_tier', 'senior')
        commands = TIER_COMMANDS.get(tier, TIER_COMMANDS['senior'])
        body = {
            "commands": commands,
            "scope": {"type": "chat", "chat_id": int(s['telegram_user_id'])},
        }
        r = api_post(base_url, "setMyCommands", body)
        if r.get('ok'):
            ok_count += 1
            print(f"  ✅ {s['name']} [{tier}]: {len(commands)}개 설정")
        else:
            fail.append((s['name'], r.get('description', '')))
            print(f"  ❌ {s['name']} [{tier}]: {r.get('description', '')[:100]}")

    print(f"\n📊 결과: 성공 {ok_count}/{len(staff)}")
    if fail:
        print("\n⚠️  실패 목록:")
        for name, desc in fail:
            print(f"  - {name}: {desc[:120]}")
        print("\n💡 'chat not found' 실패는 해당 직원이 아직 @Pressco21_makeshop_bot 에")
        print("   첫 /start 메시지를 보내지 않아서 발생. 본인이 1회 /start 후 재실행.")


if __name__ == '__main__':
    main()
