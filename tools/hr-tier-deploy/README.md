# HR Tier 배포 도구

Flora `staff.ui_tier` 기준으로 Telegram `@Pressco21_makeshop_bot` 의 채팅창별 슬래시 명령어 메뉴를 배포한다.

## Tier 정의

| Tier | 대상 | 슬래시 메뉴 | 출퇴근 버튼 |
|------|------|------------|-----------|
| `admin_full` | 장지호(대표) | 9개 (근태 + 정부지원) | O |
| `admin_cmd_only` | 이진선(원장님) | 7개 (정부지원만) | X |
| `junior_office` | 이재혁(과장, 포괄임금) | 2개 (/start, /clockout) | O |
| `junior_remote` | 장다경, 조승해 (재택간주) | 1개 (/start) | X (법적 금지) |
| `senior` | 장준혁, 서향자, 이혜자, 송미 | 1개 (/start) | O |

## 사용법

```bash
# 1. n8n 서버에서 봇 토큰 추출 (최초 1회)
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 \
  "docker exec n8n n8n export:credentials --id=RdFu3nsFuuO5NCff --decrypted 2>&1 | grep accessToken"

# 2. 환경변수 설정
export BOT_TOKEN="<추출한 토큰>"

# 3. 전 직원 tier 재배포
python3 setMyCommands.py

# 4. 특정 직원만 재설정 (신규 직원이 /start 처음 보낸 직후)
python3 setMyCommands.py --user 8312726947

# 5. Default commands 포함 초기화
python3 setMyCommands.py --reset-default
```

## 신규 직원 활성화 절차

1. 대표가 신규 직원에게 안내:
   ```
   텔레그램에서 https://t.me/Pressco21_makeshop_bot 링크 누르고 /start 한 번만 보내주세요
   ```
2. 직원이 `/start` 전송 → 봇 chat 성립
3. Flora DB에서 staff.telegram_user_id 채우기:
   ```bash
   ssh openclaw 'docker exec flora-todo-mvp-postgres psql -U postgres -d flora_todo_mvp \
     -c "UPDATE staff SET telegram_user_id=<user_id> WHERE id=<staff_id>;"'
   ```
4. 이 스크립트 재실행:
   ```bash
   python3 setMyCommands.py --user <user_id>
   ```
5. 해당 직원 폰 텔레그램에서 대화창 닫았다 열면 tier별 메뉴 반영됨

## 배경 이유

- **왜 setMyCommands는 "먼저 말 걸어야" 되는가**: 텔레그램 Bot API는 스팸 방지를 위해 봇이 일방적으로 사용자 chat을 접근하는 것을 금지. chat scope는 사용자가 봇과 최소 1회 DM 대화를 시작한 후에만 유효.
- **왜 scope=chat 방식을 쓰는가**: default commands는 전 사용자 공통이라 tier별 차등 불가능. scope=chat으로만 사용자별 다른 메뉴 구현 가능.
- **왜 tier가 5종인가**: 대표 지시 "40대 구분 + 직무별" 을 해석하여 근로형태(간주근로/포괄임금/일반) × 직무(admin/직원) 로 재설계.
