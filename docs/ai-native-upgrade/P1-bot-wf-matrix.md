<!-- AI-NATIVE-P1-MATRIX | v1.3 | 2026-04-15 | Claude Opus 4.6 | 실측 기반 -->
# P1 — 봇·워크플로우 전수 매핑 (실측)

> **AI Native 프로젝트 P1 Wave 1·2·3(부분) 산출물**. 2026-04-14~15 n8n API 전수 덤프 + 각 봇 `getMe`·`getChat`·`export:credentials --decrypted` 기반.
> **출발점**: 142개 WF(활성 113 → **Wave 3 후 103**), 그중 텔레그램 사용 92개
> **최종 목적**: 이 표가 Wave 3-4 Topic 재배선 + Wave 4 문서화의 단일 진실 소스 역할
> **상위 지침**: `METAPROMPT.md` v2.0 (AI Native) / `P1-telegram-bot-reorganization.md` v2.2
> **v1.2 → v1.3 업데이트 (2026-04-15)**:
> - ✅ Wave 3-1 (B2 credential 통합) 완료 반영 — 52 WF PUT 성공
> - ✅ 파트너클래스 알림 WF 10개 비활성화 반영
> - ✅ Wave 3-5 (T3 매출 재배선) 완료 반영 — F22~F25 4/4
> - ✅ `pressco21-telegram` orphan 실체 확인: WF-04 Record Booking 내 **3개 노드에서 실제 사용 중이었음** (v1.2 "존재하지 않음" 기록은 부분 오류)
> - ✅ **실측 수치 정정**: v1.2 "eS5Y 75개 / RdFu 47개 / `1` 17개"는 **노드 건수**였고 **고유 WF는 각각 51 / 25 / 13개** (정정)
> - ✅ eS5Y credential DELETE 완료, 텔레그램 credential 5→4

---

## 1. 실측 요약 (2026-04-14)

| 항목 | 값 |
|------|-----|
| n8n 전체 WF | **142개** (활성 113 / 비활성 29) |
| 텔레그램 사용 WF | **92개** (활성 67 / 비활성 25) |
| 등록된 Telegram credential | **5개** (그러나 서로 다른 봇은 4개 — 1개 중복) |
| 실제 서로 다른 봇 | **5개** (n8n 미등록 alert_bot B1 포함) |
| 활성 그룹 | **5개** + 장지호 개인 DM (T3는 2026-04-14 신규 생성) |

---

## 2. 봇 5개 정체 (Telegram getMe 확정)

| # | 봇 ID | @username | first_name | n8n credential | 용도 |
|---|-------|-----------|------------|----------------|------|
| B1 | 8759562724 | **@Pressco21_alert_bot** | `Pressco21_alert_bot` | 없음 (로컬 훅 전용) | Claude Code 개발 알림 (`~/.claude/hooks/notify-telegram.sh`) |
| B2 | 8643940504 | **@Pressco21_makeshop_bot** | `Pressco메이크샵봇` | `RdFu3nsFuuO5NCff` (Pressco메이크샵봇) + `eS5YwFGpbJht6uCB` (PRESSCO21-Telegram-Bot) **[중복!]** | 122 WF (FA + Flora 시리즈 + 매출 + 재고, INFRA는 Wave 2에서 B3로 이관됨) |
| B3 | 8521920006 | **@Pressco21_bot** | **★ Pressco21 개인** (Wave 2 완료) | `1` (Telegram Bot API) | 17 WF + **INFRA 3개 (Wave 2 이관 완료)** |
| B4 | 8672368507 | **@pressco21_openclaw_bot** | `플로라 🌸 프레스코21 AI비서` | `O6qwF7Pup3u1Zc1O` (Flora-OpenClaw-Bot) | Flora 양방향 대화 + openclaw-gateway 경유 |
| B5 | 8773710534 | **@Pressco_Bank_bot** | `Bank_bot` | `RQvOiScJ4KjbJcsS` (PRESSCO_BANK_BOT) | 4 WF (WF-CRM 입금 시리즈, 은행 알림 그룹 전용) |

### ⭐ 중복 credential 주목

`PRESSCO21-Telegram-Bot` (ID `eS5YwFGpbJht6uCB`)과 `Pressco메이크샵봇` (ID `RdFu3nsFuuO5NCff`)은 **둘 다 같은 봇(8643940504 = @Pressco21_makeshop_bot)** 을 가리킨다. n8n UI에서 다른 이름으로 보여서 서로 다른 봇처럼 인식되지만 실제로는 한 봇에 credential 두 개가 꽂혀있는 것. **P1 Wave 3에서 이 중복 통합 필수.**

이 중복 때문에 대표 체감 "봇이 뭘 하는지 모르겠다"가 발생함. 122개 WF가 두 credential로 쪼개져 n8n UI에서 혼란을 줌.

### 통합 후 목표 (Wave 3 산출물)

- `Pressco메이크샵봇` (RdFu) → 정식 이름 **`Pressco21 운영`**으로 변경 + 유지
- `PRESSCO21-Telegram-Bot` (eS5Y) → 모든 WF의 credential 참조를 `RdFu`로 교체 → 삭제
- `.secrets.env`의 `N8N_CRED_TELEGRAM=eS5YwFGpbJht6uCB` → `RdFu3nsFuuO5NCff`로 업데이트

---

## 3. 그룹방 5개 정체 (Telegram getChat 확정)

| chat_id | 그룹 이름 | 멤버 (실측) | 멤버 봇 | 용도 (Wave 2 후 상태) |
|---------|----------|-----------|---------|------|
| `-5154731145` | **프레스코21** | 장지호 + 원장님(2026-04-14 초대) + 봇 2개 | B2 makeshop + B4 Flora (추정) | FA 시리즈, 마감 알림 → **Wave 3 Topic 모드로 확장 예정** |
| `-5275298126` | **은행 알림** | 원장님 + 장지호 + 이재혁 + 봇 = 4명 | B5 Bank_bot | 농협 입금 실시간, CRM 검토 → **변경 없음 (재무 허브 씨앗)** |
| `-5043778307` | **플로라 클로드 코드 개발실** | 장지호 + 봇 3개 = 4명 | B2, B3, B4 (3개 봇 공존) | Claude Code 기획안 + ~~INFRA 오배선 3개~~ **Wave 2 수정 완료, PRD-SAVE만 남음** |
| `-5198284773` | **플로라 코덱스 개발실** | 장지호 + 봇 2개 = 3명 | B4 Flora + openclaw-gateway | Codex CLI 실행·응답 → **Wave 3 이름 변경만** |
| **`-5251214343`** | **PRESSCO21 매출 공유** ⭐ 2026-04-14 신규 | 장지호 + 원장님 + 이재혁 + B2 + Flora 봇 (사장님 대기) | B2 makeshop + B4 Flora | **매출 리포트 전용** — 카톡에서 이전 대상 (Wave 3 재배선) |
| `7713811206` | 장지호 개인 DM | 장지호 1명 | 모든 봇 | 대부분 WF가 여기로 발송 + **INFRA 3개 Wave 2 이관 완료** |

### 확보된 텔레그램 User ID (2026-04-14 Wave 1)

| 이름 | 텔레그램 ID | 언어 | 용도 |
|------|------------|-----|-----|
| 장지호 대표 (Jiho Chang) | `7713811206` | ko | 개인 DM 수신 |
| 원장님 이진선 (Jinsun Lee) | `8606163783` | ko | HR-001 파일럿 후보로 해제 가능 |
| 이재혁 과장 | 미확보 | — | **Wave 3 착수 전 필수 확보** |
| 장다경 팀장 | 미확보 | — | 직원 배분 자동화용 |
| 조승해 사원 | 미확보 | — | 직원 배분 자동화용 |
| 장준혁 사장 | 미확보 | — | 텔레그램 앱 설치 대기 |

### `-5043778307` Wave 2 이관 내역 ✅ 완료

| WF | Wave 2 전 | Wave 2 후 |
|---|---------|---------|
| `INFRA: 아침 시스템 건강 리포트` (DSIqF4w42WNUghWs) | credential=`RdFu`(B2), chat_id=`-5043778307` | credential=`1`(B3), chat_id=`7713811206` ✅ |
| `INFRA: WF 헬스 모니터` (0OFtnB5b4XmT8uqL) | credential=`RdFu`(B2), chat_id=`-5043778307` | credential=`1`(B3), chat_id=`7713811206` ✅ |
| `INFRA: API 사용량 + 비용 트래커` (OnHX4w8xTBDgnTUK) | credential=`RdFu`(B2), chat_id=`-5043778307` | credential=`1`(B3), chat_id=`7713811206` ✅ |
| `PRD-SAVE: 기획안 저장 + 핸드오프` (XuzLJ7fB4mGdJOrU) | credential=`RdFu`(B2), chat_id=`-5043778307` | **유지 (변경 없음)** — T5 Claude 브릿지 역할 |

**검증**:
- 3개 WF PUT 성공 → `credential=1`, `chatId=7713811206`, `active=true` 재확인
- B3 봇 sendMessage → 장지호 DM 수신 확인 (2026-04-14 13시경)
- **24시간 관찰 중**: 2026-04-15 08:00 실제 cron 발송으로 최종 검증

---

## 4. 봇 → WF 분포 (credential 단위 활성만)

| credential ID | credential 이름 | 봇 | 활성 WF 수 | 주 용도 |
|-----------|-----|-----|----------|--------|
| `eS5YwFGpbJht6uCB` | PRESSCO21-Telegram-Bot | B2 makeshop | **75개** | Flora 시리즈([F0]~[F26]), PRD-SAVE, 기획안 |
| `RdFu3nsFuuO5NCff` | Pressco메이크샵봇 | B2 makeshop (중복) | **47개 → 50개** (Wave 3 통합 후 122개) | FA 시리즈, 매출 리포트, 재고 |
| `1` | Telegram Bot API | B3 Pressco21 개인 | **17개 → 20개** (INFRA 3개 추가, Wave 2 완료) | 정부사업, 장지호 DM 개인 알림, INFRA |
| `O6qwF7Pup3u1Zc1O` | Flora-OpenClaw-Bot | B4 openclaw | **10개** | 동적 chat_id, Flora 특정 WF |
| `RQvOiScJ4KjbJcsS` | PRESSCO_BANK_BOT | B5 Bank | **4개** | WF-CRM-01/02/03 + 1 |

합계: 92개 WF 중 활성 67개에 credential이 달려 있음. 일부는 credential 없이 `$env` 참조만 있는 경우도 있음.

### ⚠ `pressco21-telegram` 레거시 참조 조사 결과 (v1.2 신설)

v1.1에서 "`pressco21-telegram` (PRESSCO21 Telegram Bot) — 3개 WF — 레거시 조사 필요"로 표기했으나, 2026-04-14 재조사 결과:

- **n8n credentials_entity 테이블에 해당 ID는 실제로 존재하지 않음** (5개 credential만 존재)
- 일부 오래된 WF의 Telegram 노드 내부에 `credentialsName: "pressco21-telegram"` 같은 **하드코딩 문자열 잔재**로 추정
- 이들 WF는 `credentialId`는 유효하나 `credentialsName` 메타만 레거시 값을 유지하고 있을 가능성 높음
- **Wave 3 credential 통합 작업 중** 각 WF PUT 시 자동 정리 또는 개별 재검증 예정

→ 이 항목은 차단 요소가 아님. Wave 3 진행에 영향 없음.

---

## 5. chat_id → 발송 WF 분포 (활성만, Wave 2 후)

| chat_id | 그룹 | 활성 WF 수 |
|---------|------|----------|
| `7713811206` | 장지호 DM | **약 40개 + INFRA 3개** (Wave 2 추가) |
| `-5154731145` | 프레스코21 그룹 | **5개** (FA 시리즈 4 + 마감 알림 1) |
| `-5043778307` | 플로라 클로드 코드 개발실 | **1개** (PRD-SAVE만 남음) — Wave 2 INFRA 3개 제거 |
| `-5275298126` | 은행 알림 | **3개** (WF-CRM 시리즈, env fallback) |
| `-5251214343` | PRESSCO21 매출 공유 (신규) | **0개** → Wave 3에서 4~5개 이전 예정 |
| 동적 (`$json.chatId`, `$env.*`) | 런타임 결정 | **약 30개** (Flora 시리즈 대부분) |

---

## 6. 재배선 계획 (Wave별 작업 대상)

### Wave 1 — 준비 & 인벤토리 ✅ **완료 (2026-04-14)**

- n8n 전수 덤프, 봇 5개·그룹 5개 실측, T3 생성, 원장님 ID 확보, B3 웹훅 삭제, 이름 `Pressco21 개인` 변경
- 산출물: `P1-bot-wf-matrix.md` v1.1 + `P1-telegram-bot-reorganization.md` v2.0 + 커밋 `a4b9b1c`

### Wave 2 — B3 개인 알림 봇 확장 ✅ **완료 (2026-04-14)**

**목표**: B3 @Pressco21_bot을 장지호 DM 전용 통합 개인 알림 봇으로 확장

**이전 WF 3개** (`-5043778307` → `7713811206`) ✅ 완료:
- `INFRA: 아침 시스템 건강 리포트` (DSIqF4w42WNUghWs) — credential: B2→B3, chat_id: -5043778307→7713811206
- `INFRA: WF 헬스 모니터` (0OFtnB5b4XmT8uqL) — 동일
- `INFRA: API 사용량 + 비용 트래커` (OnHX4w8xTBDgnTUK) — 동일

**실행 방법**: n8n API GET → Python으로 JSON 치환 → PUT (1개씩)
**검증**: PUT 후 GET 재확인 + B3 봇 sendMessage sanity check 통과
**관찰**: 24시간 (2026-04-15 08:00 실제 cron 확인 대기)

**B3 Display Name 변경** ✅ 완료: `Pressco_bot` → `Pressco21 개인` (대표 BotFather 수동 변경)

**훅 이전 없음**:
- `~/.claude/hooks/notify-telegram.sh`의 `CLAUDE_TELEGRAM_BOT_TOKEN`은 B1 alert_bot 토큰이므로 **변경하지 않음** (B1은 완전 분리 유지)

### Wave 3 — B2 + T2 운영실 + Topic 모드 + 중복 credential 통합 ← **다음**

**목표**: 기존 "프레스코21" 그룹을 "PRESSCO21 운영실"로 확장하고 Topic 3개 생성

**Topic 신설** (대표 텔레그램 앱 수동):
- 🚨 긴급
- 🛒 주문·출고·재고
- 🎓 강사·파트너

**Topic별 재배선 WF**:

`🚨 긴급` Topic으로:
- (없음, 필요 시 `[F11] 마감 알림`을 여기로 — 긴급 기준 결정 후)

`🛒 주문·출고·재고` Topic으로:
- `[F9] 출고 태스크 동기화` (MNTlkwVPqXXoa5Dq)
- `STOCK-ALERT: 품절 상태 변동 감지` (ZulQXnewPHsEJkF1)
- `[OMX-NOTIFY-01] 신규 문의 알림` (I63edSHDF50cdCEB)
- `[OM-ADAPTER-MK-*]`, `[OM-ADAPTER-SS-*]` 오픈마켓 adapter 관련

`🎓 강사·파트너` Topic으로 (기존 "프레스코21" 그룹 → 이 Topic으로 이동):
- `FA-001: 강사회원 등급 자동 변경 v4.0` (jaTfiQuY35DjgrxN)
- `FA-001b: 강사등업 텔레그램 콜백` (HQWiV2iza6GojSxs)
- `FA-002 강사 신청 알림` (ovWkhq7E0ZqvjBIZ)
- `FA-003: 강사 반려 이메일 발송 v3.0` (Ks4JvBC06cEj6b8b)
- `WF-CHURN-DETECT Daily Partner Churn Detection` (rdqtRWQA6yfRgCtz)
- `[F11] 마감 알림 (08:00)` (sZEwxo77BNP5iy94)

**중복 credential 통합** (순서):
1. 모든 `eS5YwFGpbJht6uCB` 사용 WF(75개)를 `RdFu3nsFuuO5NCff`로 credential 참조만 변경
2. n8n에서 `eS5YwFGpbJht6uCB` credential 삭제
3. `.secrets.env`의 `N8N_CRED_TELEGRAM` 값 업데이트
4. 일부 WF에 남아있는 `pressco21-telegram` 하드코딩 메타 정리 (자동 치환으로 해결 예상)

### Wave 3 — T3 매출 공유 그룹 재배선

**사전**: T3 생성 완료 ✅ Wave 1 (chat_id `-5251214343`)

**재배선 WF** (매출 리포트 4~5개, chat_id → T3):
- `[F22] 일일 매출 리포트 (메이크샵)` (OiWuSv8TJZ3p7NkC)
- `[F23] 통합 일일 매출 리포트` (DoAlCOG3OU20Wlvj)
- `[F24] 일일 매출 리치 리포트 (10:00)` (vrzyRy0pcC6UliRZ)
- `[F25] 주간/월간 매출 요약 리포트` (JlxfzY11PaPZdVOC)
- (옵션) `S3A-001: 주간 비즈니스 리포트` (jS8xZWE6aeVFL8fG) — 경영진에 공유 가치 있음

**카카오톡 중복 발송 중단**: 대표가 현재 카카오톡으로 받는 매출 리포트는 텔레그램 전환 확인 후 카톡 발송 중단

### Wave 3 — T5 Flora ↔ Claude 브릿지 (이름 변경만, INFRA는 Wave 2에서 이미 제거됨)

**대상 그룹**: 기존 `-5043778307` 플로라 클로드 코드 개발실

**작업**:
1. 그룹 이름 변경: `플로라 클로드 코드 개발실` → `Flora ↔ Claude 브릿지`
2. ~~INFRA 3개 WF를 B3 DM으로 이전~~ ✅ **Wave 2에서 완료**
3. 남는 것: `PRD-SAVE` + 향후 Claude Code 세션 리포트

### Wave 3 — T6 Flora ↔ Codex 브릿지 (이름 변경만)

**대상 그룹**: 기존 `-5198284773` 플로라 코덱스 개발실

**작업**:
1. 그룹 이름 변경: `플로라 코덱스 개발실` → `Flora ↔ Codex 브릿지`
2. 기능 유지 (openclaw-gateway 직접 통신 구조 그대로)
3. 재배선 없음

### Wave 4 — T4 은행 알림 그대로 유지 (확인 작업만)

**대상**: `-5275298126` 은행 알림 그룹

**작업**: 없음. 단 아래만 확인:
- WF-CRM-01/02/03 정상 동작 확인
- `.secrets.env`의 `PRESSCO_BANK_CHAT_ID=-5275298126` 유지 확인
- `memory/financial-hub-plan.md` 생성 완료 확인

---

## 7. 중복 credential 통합 구체 순서 (Wave 3 가장 민감한 작업)

**위험**: 75개 WF의 credential 참조를 일괄 교체해야 함. 실수하면 대량 장애.

**안전 절차** (상세는 `P1-telegram-bot-reorganization.md` v2.1 §3 Wave 3-1 참조):

```bash
# 1. 전체 백업
ssh oracle 'mkdir -p /tmp/pre-wave3 && docker exec n8n n8n export:workflow --backup --output=/tmp/pre-wave3/'

# 2. eS5Y 사용 WF 목록 고정 (n8n API + jq)
curl -sS -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.pressco21.com/api/v1/workflows?limit=200" > all-wfs.json
jq -c '.data[] | select([.nodes[]? | select(.credentials.telegramApi.id == "eS5YwFGpbJht6uCB")] | length > 0) | {id, name}' all-wfs.json > eS5Y-wfs.jsonl
wc -l eS5Y-wfs.jsonl  # 75 예상

# 3. 각 WF GET → JSON 편집(credential ID 치환) → PUT
while read line; do
  WF_ID=$(echo "$line" | jq -r '.id')
  curl -sS -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.pressco21.com/api/v1/workflows/$WF_ID" > /tmp/$WF_ID.json
  # Python으로 credential.id 치환 + PUT body 생성
  # PUT 호출
  sleep 1
done < eS5Y-wfs.jsonl

# 4. 검증: eS5Y 참조가 0건인지 확인
# 5. eS5Y credential 삭제 (n8n UI 또는 DB DELETE)
# 6. .secrets.env 업데이트
```

**롤백**: `/tmp/pre-wave3/` 에서 `import:workflow`로 복원

**중단 조건**: 5개 이상 WF 치환 실패 시 즉시 중단, 전체 롤백

---

## 8. P1 종료 시점의 최종 상태

```
봇 5개 (전부 유지):
  B1 @Pressco21_alert_bot     → 개발 알림 DM (완전 분리)
  B2 @Pressco21_makeshop_bot  → "Pressco21 운영" (Display Name 변경)
                                 credential 통합 (중복 제거)
                                 T2 운영실 + T3 매출 공유 + T5 Claude 브릿지 발송
  B3 @Pressco21_bot           → "Pressco21 개인" ✅ Wave 2 완료
                                 장지호 DM 전용 (정부사업 + INFRA + HR + 개인 매출)
  B4 @pressco21_openclaw_bot  → Flora 대화 유지
  B5 @Pressco_Bank_bot        → 은행 알림 유지 (재무 허브 씨앗)

톡방 6개 + 1 DM (4개 재편, 2개 신규, 1개 유지):
  T1 장지호 ↔ Flora+B3 DM        (Flora 대화 + 개인 알림)
  D1 장지호 ↔ B1 alert_bot DM    (개발 알림 완전 분리)
  T2 PRESSCO21 운영실            (Topic 3: 🚨🛒🎓, 멤버: 장지호+이재혁+원장님)
  T3 PRESSCO21 매출 공유 ⭐신규   (4명: 경영진 + B2)
  T4 은행 알림                   (유지, 재무 허브 씨앗)
  T5 Flora ↔ Claude 브릿지       (이름 변경 + INFRA 제거 ← Wave 2 완료)
  T6 Flora ↔ Codex 브릿지       (이름 변경만)
```

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 |
|------|-----|------|
| 2026-04-14 | v1.0 | n8n 전수 덤프 + Telegram getMe/getChat 실측 기반 최초 작성 |
| 2026-04-14 | v1.1 | Wave 1 후반 업데이트: T3 `-5251214343` chat_id 확정(n8n execution_data 추출), 원장님 ID `8606163783` 확보, B3 `@Pressco21_bot` 웹훅 `deleteWebhook` 완료, 이름 `AI Native`로 확정 |
| 2026-04-14 | **v1.2** | ①Wave 2 완료 반영 (INFRA 3개 WF 재배선 + Sanity check 통과) ②v1.1의 Wave 2 vs Wave 3 내부 모순 해소 (INFRA 이전은 **Wave 2로 통일**) ③B3 Display Name "Pressco21 개인" 변경 완료 ④§4 `pressco21-telegram` 레거시 참조 실측 재조사 결과 추가 (n8n에 해당 credential 없음, 하드코딩 메타 잔재 추정) ⑤chat_id 분포 표에 Wave 2 반영 (-5043778307 카운트 4→1) ⑥상위 문서 METAPROMPT v2.0 참조로 갱신 |

---

## 10. Wave 완료 체크 (2026-04-14 시점)

### Wave 1 ✅ 완료
- [x] `.secrets.env` N8N_API_KEY 확보
- [x] n8n API 전체 WF 덤프 (142개)
- [x] Telegram 노드 WF 추출 (92개)
- [x] n8n credential 복호화 (5 telegramApi)
- [x] 5개 봇 getMe로 ID·username 확정
- [x] 5개 그룹 getChat으로 이름 확정 (T3 포함)
- [x] 대표 결정 수렴: AI Native 명칭, 봇 5개 유지, 은행 알림 보호, Topic 모드 승인, 이름 변경 4건
- [x] **T3 chat_id 확정**: `-5251214343`
- [x] **원장님 이진선 텔레그램 ID 확보**: `8606163783`
- [x] **B3 웹훅 삭제** (`govt-support-hub-webhook` 소유권 정리, B2 단독 소유)
- [x] T2 원장님 초대 확인 (2026-04-14 12:04~05 n8n 실행 로그)
- [x] 커밋 `a4b9b1c` push

### Wave 2 ✅ 완료
- [x] B3 Display Name `Pressco_bot` → `Pressco21 개인` (대표 BotFather 수동, 2026-04-14)
- [x] INFRA 3개 WF credential 치환 (`RdFu` → `1`)
- [x] INFRA 3개 WF chat_id 치환 (`-5043778307` → `7713811206`)
- [x] PUT 후 GET 재확인 (3개 모두 active, 변경 적용 확인)
- [x] B3 봇 sendMessage → 장지호 DM 수신 Sanity check 통과
- [ ] **24시간 관찰**: 2026-04-15 08:00 실제 cron 수신 확인 (진행 중)

### Wave 1 남은 작업 (대표 수동, Wave 3 착수 전)
- [ ] 이재혁 과장 텔레그램 User ID 확보 (텔레그램 `@userinfobot`)
- [ ] 장준혁 사장님 텔레그램 앱 설치 + T3 초대 (P1 Wave 4까지 여유)

### Wave 3 실행 결과 (2026-04-15)

#### Wave 3-1 B2 credential 통합 ✅ 완료
- [x] 서버 백업 `/tmp/pre-wave3.tar.gz` 494KB + 로컬 backup 디렉토리
- [x] 대상 WF 52개 식별 (eS5Y 51 + `pressco21-telegram` orphan 1 = WF-04)
- [x] PUT 52/52 성공, 실패 0, 치환 건수 **79건** (telegram 75 + telegramTrigger 3 + httpRequest 4 중 치환 대상)
- [x] 검증: eS5Y 참조 0건, orphan 0건, RdFu 참조 133건
- [x] `DELETE /api/v1/credentials/eS5YwFGpbJht6uCB` 성공
- [x] 텔레그램 credential 5 → 4 (1/RdFu/RQvO/O6qw)
- [x] WF-04 orphan 자동 해소 (RdFu로 치환)

#### 파트너클래스 알림 WF 비활성화 ✅ 완료 (대표 지시)
- [x] 10 WF deactivate: WF-04, WF-05, WF-06, WF-07, WF-08, WF-13, WF-16, WF-17, WF-REFUND, WF-SETTLE
- [x] 활성 WF 수 113 → 103 검증
- [x] 파트너클래스 API 엔드포인트 8개는 유지 (WF-01/01A/02/03/19/20/CLASS-LIST/CLASS-DETAIL)
- [x] WF-CHURN 2개는 유지 (강사 이탈 감지, 파트너클래스와 별개 시스템)

#### Wave 3-5 T3 매출 재배선 ✅ 완료
- [x] F22/F23/F24/F25 활성 4개 WF 텔레그램 전송 노드 PUT
- [x] `chatId` 각 WF의 동적 expression → `-5251214343` 하드코딩
- [x] PUT 4/4 성공

### Wave 3 수동 대기 작업 (대표 텔레그램 앱)

- [ ] **Wave 3-2** BotFather: `Pressco21_makeshop_bot` Display Name → `Pressco21 운영`
- [ ] **Wave 3-3** T2 `프레스코21` 그룹 이름 → `PRESSCO21 운영실` + Topic 모드 ON + 3 Topic 생성 (🚨/🛒/🎓). 이재혁 초대 생략(나중)
- [ ] **Wave 3-6** T5 `플로라 클로드 코드 개발실` → `Flora ↔ Claude 브릿지` / T6 `플로라 코덱스 개발실` → `Flora ↔ Codex 브릿지`

### Wave 3-4 자동 실행 준비 (Topic ID 확보 후)

**후보 WF 식별 완료 (2026-04-15)**:
- 🎓 강사·파트너: FA-001/b/002/003 + WF-CHURN-DETECT + WF-CHURN Partner Risk Monitor + [F11] 마감 알림 = 7개
- 🛒 주문·출고·재고: [F9] 출고 + STOCK-ALERT + [OMX-NOTIFY-01] = 3개 (chat_id가 있는 활성만)

**스크립트 뼈대**: `/tmp/ai-native-wave3/t2-topic-reroute.py` (TOPIC_URGENT/ORDER/PARTNER env 주입 후 실행)
