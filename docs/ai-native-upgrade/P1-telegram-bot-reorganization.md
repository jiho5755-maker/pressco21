<!-- AI-NATIVE-P1 | v2.2 | 2026-04-15 | Claude Opus 4.6 | 장지호 대표 지시 -->
# P1 — 텔레그램 봇·톡방 재편 실행 프롬프트

> **파일 역할**: AI Native 프로젝트의 Phase P1(텔레그램 봇 정리) 실행 지침서
> **상위**: `METAPROMPT.md` v2.0 §11 (P1은 이 문서로 정식 위임)
> **실측 산출물**: `P1-bot-wf-matrix.md` v1.3 (봇·WF 전수 매핑)
> **버전**: **v2.2** (2026-04-15) — Wave 3-1/3-5 + 파트너클래스 비활성 완료, 3-2/3/4/6 진행 중
> **이전**: v2.1 (2026-04-14) / v2.0 (2026-04-14) / v1.0 (2026-04-13)
> **소유**: Claude Code 실행 + 장지호 대표 승인
> **v2.1 → v2.2 업데이트**:
> - ✅ Wave 3-1 B2 credential 통합 완료 (52 WF PUT, 치환 79건, eS5Y DELETE)
> - ✅ 파트너클래스 알림 WF 10개 비활성화 (대표 지시)
> - ✅ Wave 3-5 T3 매출 재배선 완료 (F22~F25 4/4)
> - ⏳ Wave 3-2/3/6 대표 수동 대기, Wave 3-4 Topic ID 확보 후 자동 실행 준비

---

## 0. TL;DR

PRESSCO21 텔레그램 생태계를 실측한 결과 **봇 5개 + 그룹 5개 + 장지호 DM**이 있고, n8n에 등록된 5개 credential 중 2개는 **같은 봇을 가리키는 중복**이었다. 이것이 "봇이 너무 많아서 정리 안 된다"의 기술적 근원이다.

**P1 v2.0 결정 (2026-04-14 대표 확정)**:
- 봇 **5개 전부 유지**. 초기 "3개 축소" 계획은 실측 후 철회
- `@Pressco21_alert_bot`은 **완전 분리 유지** (Claude Code 개발 알림 전용, 대표가 능동 확인하는 푸시)
- `@Pressco_Bank_bot` + `은행 알림` 그룹은 **절대 건드리지 않음** (별도 "재무 통합 허브" 프로젝트 씨앗)
- B2 `@Pressco21_makeshop_bot`의 **중복 credential 통합**이 P1의 최대 기술 작업 (75개 WF 일괄 치환)
- T2 운영실 **Topic 모드 ON** (대표 첫 경험)
- T3 **매출 공유 그룹 신규 생성** (카카오톡 → 텔레그램 이전)
- INFRA 3개 WF **오배선 수정** (`-5043778307` → 장지호 DM)

**P1 기간**: 3일 영업일
**핵심 불가침 원칙**: 이력 손실 없음 · 라이브 알림 끊김 없음 · Flora·은행 알림 대화 컨텍스트 보존

**v2.1 업데이트 요약**:
- ✅ Wave 1 완료 (2026-04-14): n8n 전수 덤프, 실측 확정, T3 생성, B3 웹훅 삭제
- ✅ Wave 2 완료 (2026-04-14): INFRA 3개 WF 재배선 + Sanity check 통과
- 이름: ANU → **AI Native** (METAPROMPT v2.0 참조)
- 다음: Wave 3 착수 대기 (75 WF credential 통합 + T2 Topic + T3·T5·T6 재배선)

---

## 1. 실측 현황 (2026-04-14 n8n 전수 덤프 기반)

> **출처**: `P1-bot-wf-matrix.md` v1.2 — 이 문서는 요약, 상세는 매핑표 참조

### 1.1 봇 5개 (Telegram getMe로 확정)

| # | 봇 ID | @username | first_name (표시명) | 토큰 위치 | n8n credential |
|---|------|----------|-------------------|----------|---------------|
| B1 | 8759562724 | **@Pressco21_alert_bot** | Pressco21_alert_bot | `~/.claude/hooks/.env` | 없음 (로컬 훅) |
| B2 | 8643940504 | **@Pressco21_makeshop_bot** | Pressco메이크샵봇 | n8n credential 암호화 | `RdFu3nsFuuO5NCff` + `eS5YwFGpbJht6uCB` **[중복!]** |
| B3 | 8521920006 | **@Pressco21_bot** | ★ **Pressco21 개인** (Wave 2 완료) | n8n credential 암호화 | `1` (Telegram Bot API) |
| B4 | 8672368507 | **@pressco21_openclaw_bot** | 플로라 🌸 프레스코21 AI비서 | n8n credential 암호화 | `O6qwF7Pup3u1Zc1O` (Flora-OpenClaw-Bot) |
| B5 | 8773710534 | **@Pressco_Bank_bot** | Bank_bot | `.secrets.env` `PRESSCO_BANK_BOT_TOKEN` | `RQvOiScJ4KjbJcsS` (PRESSCO_BANK_BOT) |

**중복 credential 경고**: B2의 `RdFu...` + `eS5Y...` 는 **완전히 동일한 봇**(봇 ID 8643940504)을 가리킨다. 통합 시 `RdFu...`를 유지하고 `eS5Y...`를 삭제하며, 75개 WF의 credential 참조를 일괄 치환해야 한다.

### 1.2 그룹·DM (Telegram getChat로 확정, Wave 1 T3 확정 포함)

| chat_id | 이름 | 멤버 구성 | AI Native P1 작업 |
|---------|-----|---------|-----------|
| `7713811206` | 장지호 개인 DM | 1명 | 수신 내용 재편 (INFRA 3개 추가 ← Wave 2 완료) |
| `-5154731145` | 프레스코21 | 장지호 + 원장님(2026-04-14 초대) + 봇 2개 | **T2 "PRESSCO21 운영실"로 확장 + Topic 모드 ON** (Wave 3) |
| `-5275298126` | 은행 알림 | 4명 (원장님+장지호+이재혁+B5) | **변경 없음** (재무 허브 씨앗) |
| `-5043778307` | 플로라 클로드 코드 개발실 | 4명 (장지호 + 봇 3개) | **T5로 이름 변경** `Flora ↔ Claude 브릿지` + INFRA 오배선 수정 ✅ Wave 2 완료 |
| `-5198284773` | 플로라 코덱스 개발실 | 3명 (장지호 + 봇 2개) | **T6로 이름 변경** `Flora ↔ Codex 브릿지` (Wave 3) |
| **`-5251214343`** ⭐ | **PRESSCO21 매출 공유** (2026-04-14 신규 생성) | 장지호 + 원장님 + 이재혁 + B2 + Flora봇 (+ 장준혁 사장 대기) | **Wave 3에서 매출 WF 4~5개 재배선** |

### 1.3 텔레그램 사용 WF 집계 (실측)

- 전체 n8n WF: **142개** (활성 113 / 비활성 29)
- 텔레그램 사용 WF: **92개** (활성 67 / 비활성 25)
- credential별 분포 (중복 포함):
  - `eS5Y...` (B2): 75개 ← 통합 대상
  - `RdFu...` (B2): 47개 ← 통합 기준 유지
  - `1` (B3): 17개 + **INFRA 3개 추가** (Wave 2 완료)
  - `O6qw...` (B4): 10개
  - `RQvO...` (B5): 4개
- chat_id 분포 (숫자형, 활성만):
  - `7713811206` (장지호 DM): 약 40개 + **INFRA 3개 추가** (Wave 2 완료)
  - `-5154731145` (프레스코21): 5개
  - `-5043778307` (Claude 개발실): 4개 → **1개만 남음** (PRD-SAVE, Wave 2 이후)
  - `-5275298126` (은행 알림): 3개 (환경변수 fallback)
  - `-5251214343` (매출 공유): 0개 → Wave 3에서 4~5개 이전 예정
  - 동적 (`$env`, `$json`): 약 30개 (Flora 시리즈 대부분)

### 1.4 대표 결정 6가지 (2026-04-14)

1. 봇 5개 전부 유지, 중복 credential 통합만 실행
2. `@Pressco21_alert_bot` 완전 분리 (개발 알림 전용)
3. `@Pressco_Bank_bot` + 은행 알림 그룹 절대 변경 금지
4. Topic 모드 기존 "프레스코21" 그룹에 바로 적용
5. T3 매출 공유 그룹 신규 생성, 이름 `PRESSCO21 매출 공유`
6. 봇·그룹 이름 변경 4건 승인:
   - `Pressco메이크샵봇` → `Pressco21 운영` (Wave 3)
   - `Pressco_bot` → `Pressco21 개인` ✅ **Wave 2 완료**
   - `플로라 클로드 코드 개발실` → `Flora ↔ Claude 브릿지` (Wave 3)
   - `플로라 코덱스 개발실` → `Flora ↔ Codex 브릿지` (Wave 3)

---

## 2. 목표 상태 (P1 종료 시점)

### 2.1 봇 5개 역할

```
B1 @Pressco21_alert_bot       ━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                Claude Code 개발 알림 전용
                                수신: 장지호 DM 단일 경로
                                완전 분리, 타 알림 금지

B2 @Pressco21_makeshop_bot    ━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                ★ Display Name "Pressco21 운영" (Wave 3)
                                팀 공용 운영 알림
                                수신: T2 운영실 + T3 매출 공유 + T5 Claude 브릿지
                                credential 통합 (중복 제거) 필수
                                담당 WF: 122개 (통합 후)

B3 @Pressco21_bot             ━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                ★ Display Name "Pressco21 개인" ✅ Wave 2 완료
                                장지호 개인 알림 전용
                                수신: 장지호 DM만
                                담당: 정부사업 + INFRA(Wave 2 완료) + HR + 개인 확인 대상

B4 @pressco21_openclaw_bot    ━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                Flora 양방향 대화
                                수신: 장지호 DM + T5 + T6 + (향후 직원 DM)
                                담당: 브리핑 · 체크인 · 메모 · 자연어 응답

B5 @Pressco_Bank_bot          ━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                은행 알림 (재무 허브 씨앗)
                                수신: T4 은행 알림 그룹만
                                AI Native P1 변경 없음
```

### 2.2 톡방 6개 + 1 DM 구조

```
T1 👤 장지호 개인 DM (7713811206)
    ├─ B4 Flora 대화 (메모, 브리핑, 체크인)
    └─ B3 개인 알림 (정부사업, INFRA 3개 ✅ Wave 2 완료, HR, 개인 매출)
    예상 일일 수신: 20~30건

D1 👨‍💻 장지호 ↔ B1 alert_bot DM
    └─ Claude Code 개발 알림만 (완전 분리)
    예상 일일 수신: 수십~수백 건 (세션 활동량 따라)

T2 🏢 PRESSCO21 운영실 (기존 -5154731145 확장, Wave 3)
    멤버: 장지호 + 이재혁 + 원장님 + B2
    Topic 모드 ON, Topic 3개:
    ├─ 🚨 긴급         (전원 멘션, 특별 알림음)
    ├─ 🛒 주문·출고·재고 (이재혁 주 수신)
    └─ 🎓 강사·파트너    (FA 시리즈, 마감)

T3 💼 PRESSCO21 매출 공유 (-5251214343, Wave 1 생성 완료)
    멤버: 원장님 + 장지호 + 이재혁 + 장준혁 사장(대기) + B2 + Flora
    Topic 없음 (매출 단일 용도)
    Wave 3에서 [F22]~[F25] 재배선 + 카카오톡 이전

T4 🏦 은행 알림 (-5275298126, 변경 없음)
    멤버: 원장님 + 장지호 + 이재혁 + B5
    재무 허브 v1 씨앗

T5 🌸 Flora ↔ Claude 브릿지 (이름 변경 Wave 3)
    기존: -5043778307 플로라 클로드 코드 개발실
    멤버: 장지호 + B2 + B3 + B4
    Wave 2 완료: INFRA 3개 제거됨
    남는 것: PRD-SAVE + 향후 Claude 작업 로그

T6 🤖 Flora ↔ Codex 브릿지 (이름 변경 Wave 3)
    기존: -5198284773 플로라 코덱스 개발실
    멤버: 장지호 + B4 + openclaw-gateway 경유
    기능 유지
```

---

## 3. Wave 실행 계획

### Wave 1 — 준비 & 인벤토리 확정 (0.5일) ✅ **완료 (2026-04-14)**

**목적**: 실측 데이터 수집, 대표 결정 수렴, 베이스라인 고정

**완료된 작업 (2026-04-14)**:
- [x] `.secrets.env`에서 `N8N_API_KEY` 확보
- [x] n8n API 전체 WF 덤프 (142개)
- [x] Telegram 노드 사용 WF 추출 (92개)
- [x] n8n credential 복호화 (5개 telegramApi)
- [x] 각 봇 토큰으로 getMe → 5개 봇 ID·username 확정
- [x] 각 봇 토큰으로 getChat → 5개 그룹 이름 확정
- [x] openclaw 서버에서 플로라 코덱스 개발실 chat_id 발견 (`-5198284773`)
- [x] `P1-bot-wf-matrix.md` v1.1 작성 완료 → v1.2에서 Wave 2 반영
- [x] 대표 결정 6가지 수렴 (§1.4)
- [x] **T3 신규 그룹 생성** — chat_id `-5251214343` 확정 (n8n execution_data 추출)
- [x] **원장님 이진선 텔레그램 ID 확보**: `8606163783` (HR-001 파일럿 후보)
- [x] **B3 웹훅 삭제** (`govt-support-hub-webhook` 소유권 정리 → B2 단독 소유)
- [x] **T2 원장님 초대 확인** (2026-04-14 12:04~05 n8n 실행 로그 기록)

**남은 작업 (대표 수동, Wave 4까지 여유)**:
- [ ] 장준혁 사장님 텔레그램 앱 설치 + T3 초대
- [ ] 이재혁 과장 텔레그램 User ID 확보 (Wave 3 진행 전 필수)

**Wave 1 완료 기준**:
- [x] 신규 T3 그룹 생성 완료, chat_id 확보 (`-5251214343`)
- [x] T2 기존 그룹에 원장님 초대 완료
- [x] 봇 5개 + 그룹 5개 실측 확정
- [x] `AI_SYNC.md`에 `[AI-Native P1 Wave 1 완료]` 기록
- [x] 커밋 `a4b9b1c` 로 문서 3건 push 완료

---

### Wave 2 — B3 개인 알림 + B1 alert_bot 확인 (0.5일) ✅ **완료 (2026-04-14)**

**목적**: 장지호 개인 DM 알림 경로 명확화, INFRA 3개 오배선 수정

#### Wave 2-1: B3 Display Name 변경 ✅ 완료

대표가 BotFather에서 수동 변경:
1. `@BotFather` 대화 → `/mybots` → `Pressco_bot` 선택
2. `Edit Bot` → `Edit Name` → **`Pressco21 개인`** 입력
3. 확인

**완료 검증**: 대표가 B3 봇 DM 스크롤 상단에 `Pressco21 개인` 표시 확인 (2026-04-14)

#### Wave 2-2: INFRA 3개 WF 재배선 (`-5043778307` → `7713811206`) ✅ 완료

**대상 WF**:
- `INFRA: 아침 시스템 건강 리포트` (ID `DSIqF4w42WNUghWs`)
- `INFRA: WF 헬스 모니터` (ID `0OFtnB5b4XmT8uqL`)
- `INFRA: API 사용량 + 비용 트래커` (ID `OnHX4w8xTBDgnTUK`)

**변경 내용**:
- credential: `RdFu3nsFuuO5NCff (Pressco메이크샵봇/B2)` → `1 (Telegram Bot API/B3)`
- chat_id: `-5043778307` (플로라 클로드 개발실) → `7713811206` (장지호 DM)
- 3개 모두 `active=true` 유지

**실행 방법** (2026-04-14):
```bash
# n8n API로 1개씩 GET → JSON 수정 → PUT
source pressco21/.secrets.env
for WF in DSIqF4w42WNUghWs 0OFtnB5b4XmT8uqL OnHX4w8xTBDgnTUK; do
  curl -sS -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.pressco21.com/api/v1/workflows/$WF" > /tmp/$WF.json
  # credential+chat_id 치환 (Python으로)
  # PUT body: name, nodes, connections, settings만
done
```

**Sanity check** (완료):
- B3 봇으로 장지호 DM에 검증 메시지 1건 발송 → 수신 확인 ✅ 2026-04-14
- 3개 WF 재확인: credential=`1`, chatId=`7713811206`, active=true ✅

**완료 기준 (Wave 2-2)**:
- [x] 3개 WF credential + chat_id 변경 + PUT 성공
- [x] B3 봇 sendMessage → 장지호 DM 수신 검증 통과
- [ ] **24시간 관찰** (2026-04-15 08:00 아침 건강 리포트 cron 실제 발송 확인) ← **진행 중**
- [ ] Flora 클로드 개발실 그룹(`-5043778307`)에 INFRA 알림 미수신 확인 (72시간 관찰)

#### Wave 2-3: B1 alert_bot 확인 ✅ 변경 없음

**변경 없음 — 그대로 유지**. 대표가 Claude Code 훅으로 수신하는 기존 경로 유지.

**확인 사항**:
- `~/.claude/hooks/.env`의 `CLAUDE_TELEGRAM_BOT_TOKEN`·`CLAUDE_TELEGRAM_CHAT_ID` 값 정상
- 훅 테스트 발송 1회 → D1(장지호 DM) 수신 확인 (다음 Claude Code 세션 종료 시 자동 검증)

---

### Wave 3 — B2 중복 credential 통합 + T2 Topic 모드 + T3·T5·T6 재배선 (1.5일) ← **다음**

**목적**: P1의 최대 기술 작업. 중복 credential 통합 + 운영실 Topic 분할 + 매출 공유 재배선 + 개발실 이름 변경.

#### Wave 3-0: 사전 조건 (Wave 3 착수 전 필수)

- [ ] **Wave 2 24시간 관찰 통과**: 2026-04-15 08:00 INFRA 아침 건강 리포트 → 장지호 DM 수신 확인
- [ ] 이재혁 과장 텔레그램 User ID 확보 (텔레그램 App에서 `@userinfobot`으로 확인 요청)

#### Wave 3-1: B2 중복 credential 통합 (⭐ 가장 민감, **max effort**)

**리스크**: 75개 WF의 credential 참조를 일괄 치환. 실수 시 대량 장애.

**안전 절차**:

```bash
source /Users/jangjiho/workspace/pressco21/.secrets.env
cd /tmp/ai-native-wave3
mkdir -p backup

# 1. 전체 WF 백업 (되돌림 보장)
ssh oracle 'mkdir -p /tmp/pre-wave3 && docker exec n8n n8n export:workflow --backup --output=/tmp/pre-wave3/'
ssh oracle 'tar czf /tmp/pre-wave3.tar.gz /tmp/pre-wave3'
ssh oracle 'ls -lh /tmp/pre-wave3.tar.gz'

# 2. eS5Y 사용 WF 목록 고정 (75개 예상)
# n8n API 전수 덤프 + jq 필터
curl -sS -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.pressco21.com/api/v1/workflows?limit=200" > all-wfs.json
jq -c '.data[] | select([.nodes[]? | select(.credentials.telegramApi.id == "eS5YwFGpbJht6uCB")] | length > 0) | {id, name}' all-wfs.json > eS5Y-wfs.jsonl
wc -l eS5Y-wfs.jsonl  # 75 예상

# 3. 1개씩 처리: GET → 치환 → PUT → 검증
while read line; do
  WF_ID=$(echo "$line" | jq -r '.id')
  WF_NAME=$(echo "$line" | jq -r '.name')
  echo "처리 중: $WF_NAME ($WF_ID)"

  # 3-1. GET
  curl -sS -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.pressco21.com/api/v1/workflows/$WF_ID" > backup/$WF_ID.json
  
  # 3-2. Python으로 credential ID 치환 + PUT body 생성
  python3 fix-credential.py backup/$WF_ID.json > /tmp/put-$WF_ID.json
  
  # 3-3. PUT
  curl -sS -X PUT -H "X-N8N-API-KEY: $N8N_API_KEY" -H "Content-Type: application/json" \
    -d @/tmp/put-$WF_ID.json "https://n8n.pressco21.com/api/v1/workflows/$WF_ID"
  
  sleep 1  # rate limit
done < eS5Y-wfs.jsonl

# 4. 검증: eS5Y 참조가 0건인지 확인
curl -sS -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.pressco21.com/api/v1/workflows?limit=200" > post-check.json
grep -c 'eS5YwFGpbJht6uCB' post-check.json  # 0 예상

# 5. eS5Y credential 삭제
# n8n UI에서 수동 삭제가 가장 안전
# 또는 DB 직접: ssh oracle "docker exec n8n-postgres psql -U n8nuser -d n8n -c \"DELETE FROM credentials_entity WHERE id='eS5YwFGpbJht6uCB';\""

# 6. .secrets.env 업데이트
# 에디터로 열어 N8N_CRED_TELEGRAM=eS5YwFGpbJht6uCB → RdFu3nsFuuO5NCff
```

**롤백 절차**:
```bash
# 만약 치환 후 WF 오작동이 발견되면
ssh oracle 'cd /tmp/pre-wave3 && for f in *.json; do docker exec -i n8n n8n import:workflow --input=/tmp/pre-wave3/$f; done'
```

**검증 체크**:
- [ ] 75개 WF 전부 새 credential로 정상 동작
- [ ] 테스트 발송 3건 (FA-001 수동 trigger, [F22] 매출 trigger, STOCK-ALERT manual) → 수신 확인
- [ ] `eS5YwFGpbJht6uCB` 참조 0건
- [ ] `auto-heal.sh` 로그 이상 없음
- [ ] `.secrets.env` 값 갱신

**중단 조건 (§METAPROMPT §15.5)**: 5개 이상 WF 치환 실패 → 즉시 중단, 전체 롤백

#### Wave 3-2: B2 Display Name 변경

BotFather에서:
1. `/mybots` → `Pressco21_makeshop_bot` 선택
2. `Edit Name` → **`Pressco21 운영`**

#### Wave 3-3: T2 운영실 확장 + Topic 모드 ON

**대표 수동 작업 (텔레그램 앱)**:

1. 기존 "프레스코21" 그룹 열기
2. **이재혁 과장 초대** (없으면)
3. 그룹 설정 → **Edit** → 이름 변경 **`PRESSCO21 운영실`**
4. 그룹 설정 → **Edit** → **Topics** 토글 **ON**
5. General Topic 자동 생성 후 추가 Topic 3개 생성:
   - `🚨 긴급` (아이콘: 🚨)
   - `🛒 주문·출고·재고` (아이콘: 🛒)
   - `🎓 강사·파트너` (아이콘: 🎓)
6. 각 Topic별 알림 설정:
   - 🚨 긴급: 알림 ON + 특별 소리
   - 🛒·🎓: 알림 ON (평범)

**chat_id 재확인**: Topic 모드 ON 후에도 `-5154731145` 그대로 유지됨 (getChat으로 재검증).

#### Wave 3-4: T2 Topic 재배선 (각 Topic의 message_thread_id 확보)

Topic 생성 후 각 Topic의 `message_thread_id`를 확보해야 n8n WF에서 참조 가능.

```bash
# 각 Topic에 대표가 먼저 메시지 1개씩 수동 발송
# getUpdates로 message_thread_id 확인
TOK_B2=$(jq -r '.[] | select(.id == "RdFu3nsFuuO5NCff") | .data.accessToken' /tmp/creds.json)

curl -s "https://api.telegram.org/bot${TOK_B2}/getUpdates" | \
  jq '.result[] | select(.message.chat.id == -5154731145) | {thread: .message.message_thread_id, text: .message.text}'
```

**재배선 대상 WF** (각 Topic의 thread_id를 `parameters.additionalFields.message_thread_id`에 추가):

**🎓 강사·파트너 Topic**:
- `FA-001: 강사회원 등급 자동 변경 v4.0` (`jaTfiQuY35DjgrxN`)
- `FA-001b: 강사등업 텔레그램 콜백` (`HQWiV2iza6GojSxs`)
- `FA-002 강사 신청 알림` (`ovWkhq7E0ZqvjBIZ`)
- `FA-003: 강사 반려 이메일 자동 발송 v3.0` (`Ks4JvBC06cEj6b8b`)
- `WF-CHURN-DETECT Daily Partner Churn Detection` (`rdqtRWQA6yfRgCtz`)
- `[F11] 마감 알림 (08:00)` (`sZEwxo77BNP5iy94`)

**🛒 주문·출고·재고 Topic**:
- `[F9] 출고 태스크 동기화` (`MNTlkwVPqXXoa5Dq`)
- `STOCK-ALERT: 품절 상태 변동 감지` (`ZulQXnewPHsEJkF1`)
- `[OMX-NOTIFY-01] 신규 문의 알림` (`I63edSHDF50cdCEB`)
- `[OM-ADAPTER-MK-01/02]`, `[OM-ADAPTER-SS-01/02]` 오픈마켓 adapter (활성만)

**🚨 긴급 Topic**:
- 시작 시점에는 WF 0개. 향후 "장애 감지" WF가 생기면 이 Topic으로.

#### Wave 3-5: T3 매출 공유 그룹 재배선

**사전**: Wave 1에서 대표가 T3 그룹 생성 완료 + chat_id `-5251214343` 확보됨 ✅

**재배선 대상 WF**:
- `[F22] 일일 매출 리포트 (메이크샵)` (`OiWuSv8TJZ3p7NkC`)
- `[F23] 통합 일일 매출 리포트` (`DoAlCOG3OU20Wlvj`)
- `[F24] 일일 매출 리치 리포트 (10:00)` (`vrzyRy0pcC6UliRZ`)
- `[F25] 주간/월간 매출 요약 리포트` (`JlxfzY11PaPZdVOC`)
- (옵션) `S3A-001: 주간 비즈니스 리포트` (`jS8xZWE6aeVFL8fG`)

각 WF의 chat_id를 T3의 새 chat_id(`-5251214343`)로 치환, credential은 B2 유지.

**카톡 중복 발송 중단**: 대표가 현재 카카오톡으로 받는 매출 리포트가 어디서 오는지 확인 후, 텔레그램 수신 확인 완료 시 카톡 발송 중단. n8n 외부 경로일 수 있으므로 별도 확인 필요.

#### Wave 3-6: T5·T6 이름 변경

**대표 수동 작업 (텔레그램 앱)**:

1. `플로라 클로드 코드 개발실` 그룹 → Edit → 이름 **`Flora ↔ Claude 브릿지`**
2. `플로라 코덱스 개발실` 그룹 → Edit → 이름 **`Flora ↔ Codex 브릿지`**

**검증**: 텔레그램 앱 상단 표시 이름 확인. `getChat` API로도 새 이름 확인 가능.

---

### Wave 4 — 문서화·검증·완료 선언 (0.5일)

#### Wave 4-1: 문서 갱신

- [ ] `pressco21-infra.md` 텔레그램 섹션 전면 갱신 (봇 5개, 그룹 6개, 실측 chat_id)
- [ ] `HARNESS.md` §1 컴포넌트 맵에 "텔레그램 봇·톡방 구조" 블록 추가
- [ ] `MEMORY.md` 인덱스 확인, `ai-native-upgrade.md` P1 완료 표시
- [ ] `memory/financial-hub-plan.md` 유지 확인 (은행 알림 건드리지 않았는지 체크)
- [ ] `P1-bot-wf-matrix.md` v1.3 업데이트 (Wave 2·3·4 실행 결과 반영)

#### Wave 4-2: 72시간 관찰

P1 실행 종료 후 **3일간 관찰**:
- [ ] 각 Topic·그룹·DM 알림이 올바른 경로로 도착하는지 확인
- [ ] 누락된 알림 없는지 확인 (특히 FA 시리즈, 매출 리포트)
- [ ] 오배선 복귀 없는지 (INFRA가 다시 개발실로 가지 않는지)
- [ ] 중복 발송 없는지 (카톡 + 텔레그램 매출 중복)
- [ ] auto-heal.sh 발동 횟수 평소 수준 유지

#### Wave 4-3: P1 완료 선언

72시간 관찰 후 대표가 "혼란 없음" 확인하면:
- [ ] `AI_SYNC.md`에 `[AI-Native P1 종료]` 기록
- [ ] Flora 봇으로 대표에게 P1 완료 메시지 발송
- [ ] `ai-native-upgrade.md` 메모리 P1 완료 + P2 착수 준비로 업데이트
- [ ] 다음 Phase (P2 인프라 클린업) 준비

---

## 4. 안전 원칙 (전 Wave 공통)

1. **봇 토큰 절대 폐기 금지** — 이름 변경은 BotFather Display Name만, 토큰은 그대로
2. **이력 삭제 금지** — 그룹·봇 메시지 기록은 텔레그램 서버에 그대로 유지
3. **1회 1 WF 원칙** — credential 통합 75개 WF도 한 번에 한 개씩 처리, 실시간 검증
4. **Staging 선 테스트** — 가능하면 플로라 `n8n-staging`에 복제본 만들어 먼저 검증
5. **자동 롤백 경로** — 각 Wave 시작 전 전체 백업 (`docker exec n8n n8n export:workflow --backup`)
6. **은행 알림 절대 건드리지 않음** — Bank_bot, chat_id -5275298126, WF-CRM-01/02/03 전부 불변
7. **alert_bot 완전 격리** — 다른 봇 알림이 B1으로 절대 합쳐지면 안 됨
8. **AI_SYNC.md Lock** — P1 진행 중 Codex의 `n8n-automation/` 수정 금지
9. **문서 기반 작업** (v2.1 신설) — 매 세션 시작 시 이 파일 + METAPROMPT.md §15.1 READ-FIRST 통과

---

## 5. 롤백 절차 (최악의 경우)

### Wave 2 롤백 (INFRA 재배선) — 참고 전용 (이미 완료)
1. `/tmp/ai-native-wave2/<WF_ID>.json` 백업을 PUT으로 복원
2. 수동 확인

### Wave 3-1 롤백 (credential 통합 실패)
```bash
ssh oracle "cd /tmp/pre-wave3 && for f in *.json; do docker exec -i n8n n8n import:workflow --input=/tmp/pre-wave3/$f; done"
```
1. `eS5Y...` credential이 살아있으면 그대로, 삭제했으면 n8n UI에서 재생성 필요

### Wave 3-3 롤백 (Topic 모드 실패)
1. 그룹 설정 → Topics 토글 OFF → 기존 단일 대화방으로 복귀
2. Topic 메시지는 General Topic에 합쳐짐

### Wave 3-5 롤백 (매출 재배선 실패)
1. 해당 WF chat_id를 원래 값으로 수동 복원

---

## 6. 결정 필요 사항 (남은 대표 확인)

Wave 1 결정은 수렴됨. 다만 진행 중 추가 확인:

- **T2 🚨 긴급 Topic 알림음**: 텔레그램 기본 사운드 중 선택 (대표 취향)
- **카톡 → 텔레그램 이전 확정 시점**: 며칠간 텔레그램+카톡 중복 수신 후 카톡 중단
- **이재혁 과장 TG ID**: Wave 3 착수 전 확보 필요

---

## 7. 변경 이력

| 날짜 | 버전 | 작성자 | 변경 |
|------|-----|-------|------|
| 2026-04-13 | v1.0 | Claude Opus 4.6 | 스크린샷 기반 초안, 봇 3개 축소 목표 |
| 2026-04-14 | v2.0 | Claude Opus 4.6 | **전면 개정** — n8n 전수 덤프 + 대표 결정 6가지 반영, 봇 5개 전부 유지, 중복 credential 통합 추가, 재무 허브 씨앗 보호. ANU 명칭. |
| 2026-04-14 | **v2.1** | Claude Opus 4.6 | ①이름 **AI Native** 채택 (ANU 폐기) ②**Wave 1 완료** 표시 (T3 확정, 원장님 ID, B3 웹훅 삭제) ③**Wave 2 완료** 표시 (INFRA 3개 재배선 + Sanity check 통과) ④Wave 3 세부 단계 정리 (API 기반 구체화) ⑤METAPROMPT v2.0 참조 링크 갱신 ⑥안전 원칙 9(문서 기반 작업) 신설 |

---

## 8. 참고 파일

- **상위 지침**: `docs/ai-native-upgrade/METAPROMPT.md` v2.0
- **실측 매핑**: `docs/ai-native-upgrade/P1-bot-wf-matrix.md` v1.2
- **재무 허브 계획**: `~/.claude/projects/-Users-jangjiho-workspace/memory/financial-hub-plan.md`
- **AI Native 진행 상황**: `~/.claude/projects/-Users-jangjiho-workspace/memory/ai-native-upgrade.md`
- **인프라 레퍼런스**: `~/.claude/pressco21-infra.md`
- **하네스 거버넌스**: `pressco21/HARNESS.md`
- **v1.0 아카이브**: `docs/ai-native-upgrade/archive/METAPROMPT-v1.0.md`

끝.
