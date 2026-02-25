# Phase 2 v2.1 n8n + NocoDB 운영 환경 배포 검증 체크리스트

작성일: 2026-02-25
버전: Phase 2 v2.1 (n8n + NocoDB)
작성자: GAS 백엔드 전문가 에이전트
참조 Task: Task 271
관련 문서: Task 251 (`phase2-v2-integration-test.md`) -- 기능/E2E 테스트
본 문서 초점: **인프라, 환경설정, 배포, 운영** 관점의 검증

---

## 개요

이 체크리스트는 n8n + NocoDB 운영 환경에 대한 **인프라/환경/배포** 검증에 집중한다.
기능별 E2E 테스트(고객 플로우, 파트너 플로우, 보안 등)는 Task 251 `phase2-v2-integration-test.md`를 참조한다.

### 운영 서버 정보

| 항목 | 값 |
|------|-----|
| n8n 서버 URL | https://n8n.pressco21.com |
| NocoDB URL | https://nocodb.pressco21.com |
| 서버 IP | 158.180.77.201 |
| SSH 접속 | `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201` |
| NocoDB API Token (테스트용) | `SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl` |
| NocoDB Project ID | `poey1yrm1r6sthf` |

### 합격 기준

- CRITICAL 항목: **0건 실패** (1건이라도 실패 시 배포 불가)
- HIGH 항목: **0건 실패** (권장, 1건 이하 조건부 허용)
- NORMAL 항목: 2건 이하 실패 허용 (배포 후 수정)

### 전체 소요 시간 예상: 약 90~120분

---

## 섹션 1. 서버 인프라 상태

> 예상 소요: 15~20분

### 1-1. HTTPS 및 SSL 인증서

- [ ] **[CRITICAL]** NocoDB (https://nocodb.pressco21.com) HTTPS 접속 정상
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://nocodb.pressco21.com
  # 기대: 200
  ```

- [ ] **[CRITICAL]** n8n (https://n8n.pressco21.com) HTTPS 접속 정상
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://n8n.pressco21.com
  # 기대: 200 (또는 302 로그인 리다이렉트)
  ```

- [ ] **[CRITICAL]** n8n SSL 인증서 유효기간 확인 (Let's Encrypt 90일)
  ```bash
  echo | openssl s_client -servername n8n.pressco21.com -connect n8n.pressco21.com:443 2>/dev/null | openssl x509 -noout -dates
  # 기대: notAfter가 현재일 기준 30일 이상 남아있어야 함
  ```

- [ ] **[CRITICAL]** NocoDB SSL 인증서 유효기간 확인
  ```bash
  echo | openssl s_client -servername nocodb.pressco21.com -connect nocodb.pressco21.com:443 2>/dev/null | openssl x509 -noout -dates
  # 기대: notAfter가 현재일 기준 30일 이상 남아있어야 함
  ```

- [ ] **[HIGH]** SSL 인증서 자동갱신 cron 설정 확인
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "sudo crontab -l | grep -i certbot"
  # 기대: certbot renew 관련 cron 엔트리 존재
  # 또는 systemd timer 확인:
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "systemctl list-timers | grep certbot"
  ```

### 1-2. Docker 컨테이너 상태

- [ ] **[CRITICAL]** n8n Docker 컨테이너 실행 중
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker ps --filter name=n8n --format '{{.Names}} {{.Status}}'"
  # 기대: n8n Up ... 형태
  ```

- [ ] **[CRITICAL]** NocoDB Docker 컨테이너 실행 중
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker ps --filter name=nocodb --format '{{.Names}} {{.Status}}'"
  # 기대: nocodb Up ... 형태
  ```

- [ ] **[CRITICAL]** Docker restart:always 정책 확인 (서버 재부팅 시 자동 복구)
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker inspect n8n nocodb --format '{{.Name}} restart={{.HostConfig.RestartPolicy.Name}}'"
  # 기대:
  # /n8n restart=always
  # /nocodb restart=always
  ```

### 1-3. 타임존 설정

- [ ] **[CRITICAL]** n8n 타임존 Asia/Seoul 설정 확인
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n env | grep TIMEZONE"
  # 기대: GENERIC_TIMEZONE=Asia/Seoul
  ```
  > **미설정 시 영향**: WF-05(폴링 10분), WF-11(리마인더 09:00), WF-12(후기 10:00), WF-13(등급 06:00) 스케줄이 UTC 기준으로 동작하여 한국시간 -9시간 차이 발생. 예: 오전 9시 리마인더가 오후 6시에 발송됨.

### 1-4. Docker 네트워크 및 내부 통신

- [ ] **[CRITICAL]** n8n과 NocoDB가 동일 Docker 네트워크에 연결
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker network inspect n8n_n8n-network --format '{{range .Containers}}{{.Name}} {{end}}'"
  # 기대: n8n nocodb 두 컨테이너 모두 포함
  # 네트워크 이름이 다를 수 있음 - 아래 명령으로 전체 확인:
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker network ls"
  ```

- [ ] **[HIGH]** n8n에서 NocoDB 내부 접근 가능 확인
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n wget -q -O- http://nocodb:8080/api/v1/health 2>&1 || docker exec n8n curl -s http://nocodb:8080/api/v1/health"
  # 기대: 정상 응답 (NocoDB health check)
  # 내부 URL http://nocodb:8080 으로 접근 가능해야 n8n에서 NocoDB API를 빠르게 호출
  ```

### 1-5. 디스크 및 메모리

- [ ] 디스크 여유 공간 확인 (최소 20% 여유 권장)
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "df -h /"
  # 기대: Use% < 80%
  ```

- [ ] 메모리 여유 확인
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "free -h"
  # 기대: available 메모리 512MB 이상
  ```

- [ ] Docker 로그 디스크 사용량 확인 (과도한 로그 누적 방지)
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker system df"
  # 참고: 로그 크기가 1GB 이상이면 로그 로테이션 설정 필요
  ```

---

## 섹션 2. NocoDB 데이터베이스 검증

> 예상 소요: 15~20분

### 2-1. 8개 테이블 존재 확인

- [ ] **[CRITICAL]** tbl_Partners 테이블 존재 및 접근 가능
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Partners?limit=1" | jq '.pageInfo'
  # 기대: pageInfo 객체 반환 (totalRows, page 등)
  ```

- [ ] **[CRITICAL]** tbl_Classes 테이블 존재
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Classes?limit=1" | jq '.pageInfo'
  ```

- [ ] **[CRITICAL]** tbl_Applications 테이블 존재
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Applications?limit=1" | jq '.pageInfo'
  ```

- [ ] **[CRITICAL]** tbl_Settlements 테이블 존재
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settlements?limit=1" | jq '.pageInfo'
  ```

- [ ] **[CRITICAL]** tbl_Reviews 테이블 존재
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Reviews?limit=1" | jq '.pageInfo'
  ```

- [ ] **[CRITICAL]** tbl_PollLogs 테이블 존재
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_PollLogs?limit=1" | jq '.pageInfo'
  ```

- [ ] **[CRITICAL]** tbl_EmailLogs 테이블 존재
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_EmailLogs?limit=1" | jq '.pageInfo'
  ```

- [ ] **[CRITICAL]** tbl_Settings 테이블 존재
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settings?limit=1" | jq '.pageInfo'
  ```

### 2-2. Links(Relations) 5개 정상 연결

> NocoDB UI에서 확인하거나, 테이블의 Link 타입 필드 존재 여부로 검증한다.

- [ ] **[HIGH]** tbl_Classes -> tbl_Partners (partner_code 기준 Has Many)
  - NocoDB UI: tbl_Classes 레코드 열기 > Linked Partners 탭 확인

- [ ] **[HIGH]** tbl_Applications -> tbl_Partners (member_id 기준 Has Many)
  - NocoDB UI: tbl_Applications 레코드 열기 > Linked Partners 탭 확인

- [ ] **[HIGH]** tbl_Settlements -> tbl_Classes (class_id 기준 Has Many)
  - NocoDB UI: tbl_Settlements 레코드 열기 > Linked Classes 탭 확인

- [ ] **[HIGH]** tbl_Reviews -> tbl_Classes (class_id 기준 Has Many)
  - NocoDB UI: tbl_Reviews 레코드 열기 > Linked Classes 탭 확인

- [ ] tbl_PollLogs -> tbl_Partners (partner_code 기준 Has Many)
  - NocoDB UI: tbl_PollLogs 레코드 열기 > Linked Partners 탭 확인

### 2-3. tbl_Settings 초기 데이터 11개 키 입력 완료

- [ ] **[CRITICAL]** tbl_Settings에 11개 설정 키-값 전체 확인
  ```bash
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settings?limit=25" | jq '.list[] | {key: .key, value: .value}'
  ```

  아래 11개 키가 모두 존재하고 값이 설정되어 있어야 한다:

  | # | key | 예상 값 | 용도 |
  |---|-----|---------|------|
  | 1 | commission_rate_silver | 20 | SILVER 등급 수수료율(%) |
  | 2 | commission_rate_gold | 25 | GOLD 등급 수수료율(%) |
  | 3 | commission_rate_platinum | 30 | PLATINUM 등급 수수료율(%) |
  | 4 | min_payout | 10000 | 최소 지급 금액(원) |
  | 5 | payout_day | 15 | 정산 지급일 |
  | 6 | platform_fee_rate | 10 | 플랫폼 수수료율(%) |
  | 7 | class_category_id | (메이크샵 카테고리 ID) | 클래스 상품 카테고리 |
  | 8 | admin_telegram_chat_id | (텔레그램 Chat ID) | 관리자 텔레그램 알림 수신 |
  | 9 | reserve_rate_silver | (값) | SILVER 적립률 |
  | 10 | reserve_rate_gold | (값) | GOLD 적립률 |
  | 11 | reserve_rate_platinum | (값) | PLATINUM 적립률 |

---

## 섹션 3. n8n 워크플로우 활성화 확인

> 예상 소요: 10~15분

### 3-1. 14개 워크플로우 Active 상태

- [ ] **[CRITICAL]** WF-01 (class-api) Active 확인
- [ ] **[CRITICAL]** WF-02 (partner-auth) Active 확인
- [ ] **[CRITICAL]** WF-03 (partner-data) Active 확인
- [ ] **[CRITICAL]** WF-04 (record-booking) Active 확인
- [ ] **[CRITICAL]** WF-05 (order-polling-batch) Active 확인
- [ ] **[CRITICAL]** WF-06 (class-management) Active 확인
- [ ] **[CRITICAL]** WF-07 (partner-apply) Active 확인
- [ ] **[CRITICAL]** WF-08 (partner-approve) Active 확인
- [ ] **[CRITICAL]** WF-09 (review-reply) Active 확인
- [ ] **[CRITICAL]** WF-10 (education-complete) Active 확인
- [ ] **[CRITICAL]** WF-11 (send-reminders) Active 확인
- [ ] **[CRITICAL]** WF-12 (review-requests) Active 확인
- [ ] **[CRITICAL]** WF-13 (grade-update) Active 확인
- [ ] **[CRITICAL]** WF-ERROR (error-handler) Active 확인

확인 방법 (n8n UI 또는 API):
```bash
# n8n API로 전체 워크플로우 목록 및 활성 상태 확인
curl -s -H "X-N8N-API-KEY: {API_KEY}" \
  "https://n8n.pressco21.com/api/v1/workflows" | jq '.data[] | {id: .id, name: .name, active: .active}'
```

### 3-2. WF-ERROR가 13개 모든 WF의 Error Workflow로 설정

- [ ] **[CRITICAL]** 모든 워크플로우의 Settings > Error Workflow에 WF-ERROR 지정 확인

  n8n UI에서 각 워크플로우를 열어 확인:
  1. 워크플로우 편집 화면 > 우측 상단 "..." > Settings
  2. "Error Workflow" 드롭다운에서 "WF-ERROR-handler" 선택되어 있는지 확인

  확인이 필요한 13개 워크플로우:
  - [ ] WF-01 (class-api)
  - [ ] WF-02 (partner-auth)
  - [ ] WF-03 (partner-data)
  - [ ] WF-04 (record-booking)
  - [ ] WF-05 (order-polling-batch)
  - [ ] WF-06 (class-management)
  - [ ] WF-07 (partner-apply)
  - [ ] WF-08 (partner-approve)
  - [ ] WF-09 (review-reply)
  - [ ] WF-10 (education-complete)
  - [ ] WF-11 (send-reminders)
  - [ ] WF-12 (review-requests)
  - [ ] WF-13 (grade-update)

---

## 섹션 4. Credentials 검증

> 예상 소요: 10~15분

### 4-1. n8n Credentials 7개 등록 및 연결 테스트

n8n UI > Credentials 메뉴에서 아래 항목을 확인한다.

- [ ] **[CRITICAL]** PRESSCO21-NocoDB
  - Type: HTTP Header Auth (헤더명: `xc-token`)
  - 값: NocoDB API Token
  - **Test 방법**: n8n에서 NocoDB 노드 추가 > tbl_Partners List 조회 > 정상 반환 확인

- [ ] **[CRITICAL]** PRESSCO21-Makeshop-Shopkey
  - Type: HTTP Header Auth 또는 Query Auth
  - 값: 메이크샵 Shopkey
  - **Test 방법**: 메이크샵 API 호출 테스트 (상품 조회 등)

- [ ] **[CRITICAL]** PRESSCO21-Makeshop-Licensekey
  - Type: HTTP Header Auth 또는 Query Auth
  - 값: 메이크샵 Licensekey

- [ ] **[CRITICAL]** PRESSCO21-SMTP (Naver 또는 자체 SMTP)
  - Type: SMTP
  - Host/Port: (Naver: smtp.naver.com:587 또는 자체 SMTP)
  - 계정: pressco21@foreverlove.co.kr
  - **Test 방법**: n8n에서 Send Email 노드 > 테스트 이메일 발송 > 실제 수신 확인

- [ ] **[CRITICAL]** PRESSCO21-Telegram-Bot
  - Type: Telegram API
  - Bot Token: @BotFather에서 발급한 토큰
  - **Test 방법**: n8n에서 Telegram 노드 > 테스트 메시지 발송 > 수신 확인

- [ ] **[HIGH]** PRESSCO21-Admin-Token
  - Type: HTTP Header Auth (헤더명: `Authorization`)
  - 값: `Bearer {ADMIN_API_TOKEN}`
  - WF-08 (파트너 승인)에서 사용

- [ ] 추가 Credential이 있는 경우 여기에 기록:
  - Credential 이름: _______________
  - Type: _______________
  - 용도: _______________

---

## 섹션 5. 환경변수 확인

> 예상 소요: 5~10분

### 5-1. n8n 컨테이너 환경변수

- [ ] **[CRITICAL]** GENERIC_TIMEZONE=Asia/Seoul
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n env | grep GENERIC_TIMEZONE"
  # 기대: GENERIC_TIMEZONE=Asia/Seoul
  ```

- [ ] **[CRITICAL]** NOCODB_PROJECT_ID 설정
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n env | grep NOCODB_PROJECT_ID"
  # 기대: NOCODB_PROJECT_ID=poey1yrm1r6sthf
  ```

- [ ] **[HIGH]** N8N_CORS_ALLOWED_ORIGINS에 foreverlove.co.kr 포함
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n env | grep CORS"
  # 기대: foreverlove.co.kr 포함 (www 서브도메인 포함 여부도 확인)
  ```

- [ ] **[HIGH]** TELEGRAM_CHAT_ID 설정
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n env | grep TELEGRAM_CHAT_ID"
  # 기대: 텔레그램 Chat ID 값 존재
  ```

- [ ] ADMIN_API_TOKEN 설정
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n env | grep ADMIN_API_TOKEN"
  # 기대: 토큰 값 존재 (값 자체는 보안상 전체 노출하지 않음)
  ```

- [ ] MAKESHOP_DOMAIN 설정
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec n8n env | grep MAKESHOP"
  # 기대: MAKESHOP_DOMAIN 값 존재
  ```

### 5-2. 메이크샵 IP 화이트리스트

- [ ] **[CRITICAL]** 메이크샵 관리자 > 오픈API > 접근 허용 IP에 `158.180.77.201` 등록 확인
  - 확인 경로: 메이크샵 관리자 로그인 > 부가서비스 > 오픈 API > IP 허용 목록
  - 미등록 시: WF-05 폴링(메이크샵 주문 조회 API), WF-08 회원등급 변경 API 등 **메이크샵 API 호출 전체 차단**

---

## 섹션 6. Webhook API curl 테스트 (9개)

> 예상 소요: 20~30분
>
> 각 Webhook 엔드포인트를 실제로 호출하여 정상 응답을 확인한다.
> 테스트 데이터가 NocoDB에 존재해야 한다 (섹션 2 완료 후 진행).

### TEST-01. WF-01 (GET) -- 클래스 목록 조회

- [ ] **[CRITICAL]** 정상 응답 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/class-api" \
  -H "Content-Type: application/json" \
  -d '{"action":"getClasses"}' | jq .
```

기대 응답:
```json
{
  "success": true,
  "data": [...],
  "timestamp": "2026-02-25T..."
}
```

판정: [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-02. WF-02 (POST) -- 파트너 인증

- [ ] **[CRITICAL]** 정상 응답 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/partner-auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"getPartnerAuth","member_id":"jihoo5755"}' | jq .
```

기대 응답:
```json
{
  "success": true,
  "data": {
    "is_partner": true,
    "partner_code": "PC_...",
    "grade": "...",
    "status": "active"
  }
}
```

판정: [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-03. WF-03 (POST) -- 파트너 데이터 (마스킹 검증 포함)

- [ ] **[CRITICAL]** 정상 응답 + 수강생 개인정보 마스킹 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/partner-data" \
  -H "Content-Type: application/json" \
  -d '{"action":"getPartnerBookings","partner_code":"PC_202602_001"}' | jq .
```

기대 응답:
```json
{
  "success": true,
  "data": [
    {
      "student_name": "홍*동",
      "student_phone": "010-****-1234",
      "student_email": "tes***@gmail.com",
      ...
    }
  ]
}
```

확인 포인트:
- [ ] 이름 마스킹: 중간 글자 `*` 처리
- [ ] 전화번호 마스킹: `010-****-1234` 형식
- [ ] 이메일 마스킹: `tes***@gmail.com` 형식

판정: [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-04. WF-04 (POST) -- 예약 기록

- [ ] **[CRITICAL]** 정상 응답 + NocoDB tbl_Settlements 레코드 생성 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/record-booking" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST_ORDER_001","member_id":"test_member","class_id":"CL_202602_001","order_amount":50000}' | jq .
```

기대 응답:
```json
{
  "success": true,
  "data": {
    "settlement_id": "...",
    "commission_amount": ...,
    "status": "PENDING_SETTLEMENT"
  }
}
```

검증 후 테스트 데이터 정리:
```bash
# tbl_Settlements에서 TEST_ORDER_001 레코드 확인
curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settlements?where=(order_id,eq,TEST_ORDER_001)" | jq '.list'
```

판정: [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-05. WF-07 (POST) -- 파트너 신청

- [ ] **[CRITICAL]** 정상 응답 + tbl_Applications 레코드 생성 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/partner-apply" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"test_apply_member","name":"홍길동","studio_name":"테스트공방","phone":"010-1234-5678","email":"test@test.com","specialty":"압화","location":"서울","introduction":"테스트 소개글입니다."}' | jq .
```

기대 응답:
```json
{
  "success": true,
  "data": {
    "application_id": "APP_..."
  }
}
```

검증:
```bash
# tbl_Applications에서 test_apply_member 확인
curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Applications?where=(member_id,eq,test_apply_member)" | jq '.list'
```

판정: [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-06. WF-08 (POST) -- 파트너 승인 (Admin 인증)

- [ ] **[CRITICAL]** 인증 없이 호출 시 UNAUTHORIZED 응답 확인

```bash
# 인증 없는 호출 (차단되어야 함)
curl -s "https://n8n.pressco21.com/webhook/partner-approve" \
  -H "Content-Type: application/json" \
  -d '{"application_id":"APP_XXXXXX","action":"approve"}' | jq .
```

기대 응답:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "..."
  }
}
```

- [ ] **[CRITICAL]** 올바른 인증으로 호출 시 정상 승인

```bash
# 올바른 인증 토큰 포함 호출
curl -s "https://n8n.pressco21.com/webhook/partner-approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_API_TOKEN}" \
  -d '{"application_id":"APP_XXXXXX","action":"approve"}' | jq .
```

> 주의: `{ADMIN_API_TOKEN}` 부분을 실제 토큰 값으로 교체하여 실행한다.
> `APP_XXXXXX` 부분을 TEST-05에서 생성된 실제 application_id로 교체한다.

판정 (인증 차단): [ ] PASS / [ ] FAIL
판정 (정상 승인): [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-07. WF-09 (POST) -- 후기 답변

- [ ] **[CRITICAL]** 정상 응답 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/review-reply" \
  -H "Content-Type: application/json" \
  -d '{"review_id":"REV_TEST_001","partner_code":"PC_202602_001","answer":"감사합니다!"}' | jq .
```

기대 응답:
```json
{
  "success": true
}
```

판정: [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-08. WF-10 (POST) -- 교육 완료

- [ ] **[CRITICAL]** 합격 (score >= 11) 응답 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"jihoo5755","score":11,"total":15}' | jq .
```

기대 응답 (합격):
```json
{
  "success": true,
  "data": {
    "passed": true,
    "score": 11,
    "threshold": 11
  }
}
```

- [ ] **[HIGH]** 불합격 (score < 11) 응답 확인

```bash
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"jihoo5755","score":10,"total":15}' | jq .
```

기대 응답 (불합격):
```json
{
  "success": true,
  "data": {
    "passed": false,
    "score": 10,
    "threshold": 11
  }
}
```

판정 (합격): [ ] PASS / [ ] FAIL
판정 (불합격): [ ] PASS / [ ] FAIL
실제 응답 메모: _____________________________________

### TEST-09. WF-ERROR -- 에러 핸들링 검증

- [ ] **[HIGH]** 존재하지 않는 액션으로 에러 유발 + 텔레그램 알림 수신 확인

```bash
# 존재하지 않는 액션으로 WF-01 호출
curl -s "https://n8n.pressco21.com/webhook/class-api" \
  -H "Content-Type: application/json" \
  -d '{"action":"NONEXISTENT_ACTION_TO_TRIGGER_ERROR"}' | jq .
```

확인 포인트:
- [ ] 에러 응답이 구조화된 JSON 형식으로 반환
- [ ] 텔레그램 봇(@Pressco21_makeshop_bot)으로 에러 알림 메시지 수신
- [ ] NocoDB tbl_EmailLogs에 type=ERROR 레코드 생성 확인

```bash
# tbl_EmailLogs에서 최근 에러 로그 확인
curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_EmailLogs?where=(type,eq,ERROR)&sort=-created_at&limit=3" | jq '.list'
```

판정: [ ] PASS / [ ] FAIL
텔레그램 수신 확인: [ ] YES / [ ] NO
실제 응답 메모: _____________________________________

---

## 섹션 7. 스케줄 배치 수동 실행 테스트

> 예상 소요: 15~20분

### 7-1. 수동 실행 방법

n8n UI에서 수동 실행하는 방법:
1. https://n8n.pressco21.com 접속 및 로그인
2. Workflows 메뉴에서 해당 워크플로우 클릭
3. 편집 화면에서 "Execute Workflow" 버튼 클릭 (또는 Ctrl+Enter)
4. 실행 로그에서 각 노드의 입출력 데이터 확인

### 7-2. WF-05 (order-polling-batch) 수동 실행

- [ ] **[CRITICAL]** 수동 실행 1회 성공 (에러 없이 완료)
- [ ] 실행 결과 확인:
  - [ ] 메이크샵 주문 API 호출 성공 여부
  - [ ] 신규 주문 발견 시 tbl_Settlements 레코드 생성
  - [ ] 주문 없을 시 "0건 처리" 로그 (에러 아님)
  - [ ] 텔레그램 요약 알림 발송

### 7-3. WF-11 (send-reminders) 수동 실행

- [ ] **[HIGH]** 수동 실행 1회 성공
- [ ] 실행 결과 확인:
  - [ ] D-3 조건(class_date - today = 3) 해당 예약 조회
  - [ ] D-1 조건(class_date - today = 1) 해당 예약 조회
  - [ ] 해당 예약 존재 시 리마인더 이메일 실제 수신 확인
  - [ ] 해당 예약 미존재 시 "대상 없음" 텔레그램 메시지

### 7-4. WF-12 (review-requests) 수동 실행

- [ ] **[HIGH]** 수동 실행 1회 성공
- [ ] 실행 결과 확인:
  - [ ] class_date + 7일 조건 해당 예약 조회
  - [ ] 후기 요청 이메일 실제 수신 확인
  - [ ] 미해당 시 "대상 없음" 텔레그램 메시지

### 7-5. WF-13 (grade-update) 수동 실행

- [ ] 수동 실행 1회 성공 (에러 없이 완료)
- [ ] tbl_Partners의 grade 컬럼 업데이트 여부 확인 (등급 변경 조건 미달 시 변경 없음이 정상)

### 7-6. 스케줄 설정 확인

각 워크플로우의 Schedule Trigger 노드를 열어 설정값을 확인한다.

- [ ] **[CRITICAL]** WF-05: 주문 폴링 스케줄 설정 확인
  - 기대: 10분마다 (Every 10 Minutes) 또는 유사한 주기
  - 실제 설정: _______________

- [ ] **[CRITICAL]** WF-11: 리마인더 발송 스케줄 설정 확인
  - 기대: 매일 오전 9시 KST (CRON: `0 9 * * *` 또는 n8n Schedule 09:00)
  - 실제 설정: _______________

- [ ] **[HIGH]** WF-12: 후기 요청 스케줄 설정 확인
  - 기대: 매일 오전 10시 KST
  - 실제 설정: _______________

- [ ] **[HIGH]** WF-13: 등급 업데이트 스케줄 설정 확인
  - 기대: 매일 오전 6시 KST (또는 매월 1일)
  - 실제 설정: _______________

---

## 섹션 8. CORS + 이메일/텔레그램 통합 테스트

> 예상 소요: 15~20분

### 8-1. CORS 설정 검증

- [ ] **[CRITICAL]** OPTIONS preflight 응답 확인
  ```bash
  curl -X OPTIONS "https://n8n.pressco21.com/webhook/class-api" \
    -H "Origin: https://foreverlove.co.kr" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -v 2>&1 | grep -E "< HTTP|access-control"
  # 기대:
  #   < HTTP/2 200  (또는 204)
  #   access-control-allow-origin: https://foreverlove.co.kr (또는 *)
  #   access-control-allow-methods: ... POST ...
  #   access-control-allow-headers: ... content-type ...
  ```

- [ ] **[CRITICAL]** foreverlove.co.kr 브라우저 콘솔에서 Webhook fetch 호출 CORS 에러 없음
  ```javascript
  // foreverlove.co.kr 페이지에서 브라우저 개발자 도구 > Console 탭에서 실행
  fetch('https://n8n.pressco21.com/webhook/class-api', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'getClasses'})
  }).then(r => r.json()).then(d => console.log('SUCCESS:', d)).catch(e => console.error('CORS ERROR:', e));
  // 기대: SUCCESS: {success: true, data: [...]}
  // 실패: CORS ERROR: TypeError: Failed to fetch
  ```

- [ ] **[HIGH]** www.foreverlove.co.kr에서도 CORS 통과 확인
  ```javascript
  // www.foreverlove.co.kr 에서 동일 테스트 실행
  fetch('https://n8n.pressco21.com/webhook/class-api', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'getClasses'})
  }).then(r => r.json()).then(d => console.log('SUCCESS:', d)).catch(e => console.error('CORS ERROR:', e));
  ```
  > www 서브도메인이 CORS 허용 목록에 포함되지 않으면 www로 접속한 사용자에게 API 호출 실패 발생.

### 8-2. SMTP 이메일 발송 통합 테스트

- [ ] **[CRITICAL]** WF-10 합격 curl 호출 후 실제 이메일 수신 확인
  - 발송자: pressco21@foreverlove.co.kr
  - 수신자: 테스트 이메일 주소
  - 이메일 내용: 합격 축하 + 인증서 정보 포함
  - 스팸 폴더도 확인

- [ ] **[HIGH]** 이메일 본문 HTML 렌더링 정상 확인
  - 골드 테마 (#b89b5e) 적용
  - escapeHtml 처리된 텍스트
  - 깨진 이미지/링크 없음

### 8-3. 텔레그램 봇 알림 통합 테스트

- [ ] **[CRITICAL]** 텔레그램 봇 알림 수신 확인
  - TEST-09 (WF-ERROR 에러 유발) 실행 후 텔레그램 메시지 수신 확인
  - 메시지 형식: 워크플로우 이름, 에러 내용, 타임스탬프 포함

- [ ] **[HIGH]** 텔레그램 Markdown 파싱 정상 확인
  - 굵은 글씨, 코드 블록 등 Markdown 서식이 깨지지 않는지 확인

### 8-4. NocoDB 데이터 백업 절차

- [ ] **[HIGH]** NocoDB 데이터 백업 방법 확인 (아래 중 하나 이상 설정)

  **방법 A: NocoDB UI 내보내기 (수동)**
  1. NocoDB 접속 > 각 테이블 > 상단 "..." > Export as CSV/Excel
  2. 주요 테이블 (tbl_Partners, tbl_Classes, tbl_Settlements) 우선 백업

  **방법 B: Docker 볼륨 백업 (자동화 가능)**
  ```bash
  # NocoDB Docker 볼륨 위치 확인
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker volume inspect nocodb_data --format '{{.Mountpoint}}'"

  # SQLite 또는 MySQL 데이터 파일 직접 백업
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec nocodb ls /usr/app/data/"
  # SQLite 사용 시:
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 "docker exec nocodb cp /usr/app/data/noco.db /usr/app/data/noco_backup_\$(date +%Y%m%d).db"
  ```

  **방법 C: 자동 백업 cron (권장)**
  ```bash
  # 매일 새벽 4시 자동 백업 cron 설정 예시
  # crontab -e 에 추가:
  0 4 * * * docker exec nocodb cp /usr/app/data/noco.db /usr/app/data/backup/noco_$(date +\%Y\%m\%d).db && find /usr/app/data/backup/ -name "*.db" -mtime +30 -delete
  ```

- [ ] 백업 복원 테스트 (최소 1회 수행 권장)
  - 백업 파일에서 데이터 복원이 실제로 가능한지 확인

---

## 테스트 후 정리 작업

> 테스트 과정에서 생성된 더미 데이터를 정리한다.

- [ ] tbl_Settlements에서 `order_id=TEST_ORDER_001` 레코드 삭제
  ```bash
  # NocoDB UI에서 수동 삭제하거나, 테스트 레코드 ID 확인 후 API 삭제
  curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
    "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settlements?where=(order_id,eq,TEST_ORDER_001)" | jq '.list[].Id'
  ```

- [ ] tbl_Applications에서 `member_id=test_apply_member` 레코드 삭제

- [ ] tbl_EmailLogs에서 테스트 중 생성된 에러/이메일 로그 확인 (삭제 선택)

---

## 테스트 결과 요약

테스트 일자: ___________
테스트 담당자: ___________
n8n 서버 버전: ___________
NocoDB 버전: ___________
Docker 버전: ___________

| 섹션 | CRITICAL | HIGH | NORMAL | 통과 | 실패 | 미실행 |
|------|----------|------|--------|------|------|--------|
| 1. 서버 인프라 | /7 | /2 | /3 | | | |
| 2. NocoDB 데이터베이스 | /9 | /5 | /0 | | | |
| 3. 워크플로우 활성화 | /14+13 | /0 | /0 | | | |
| 4. Credentials | /5 | /1 | /1 | | | |
| 5. 환경변수 | /3 | /2 | /2 | | | |
| 6. Webhook curl (9개) | /9 | /2 | /0 | | | |
| 7. 스케줄 배치 | /3 | /3 | /1 | | | |
| 8. CORS/이메일/텔레그램 | /3 | /4 | /1 | | | |
| **합계** | **건** | **건** | **건** | | | |

### 발견된 이슈 목록

| # | 심각도 | 섹션 | 항목 | 증상 | 대응 방안 | 상태 |
|---|--------|------|------|------|----------|------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

### 배포 판정

- [ ] **PASS** -- CRITICAL 0건 실패, HIGH 0건 실패 -> 배포 승인
- [ ] **CONDITIONAL PASS** -- CRITICAL 0건, HIGH 1건 이하 -> 조건부 배포 (HIGH 이슈 즉시 수정)
- [ ] **FAIL** -- CRITICAL 1건 이상 실패 -> 배포 불가, 수정 후 재검증

---

## 부록: 빠른 참조 명령어 모음

### SSH 접속
```bash
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201
```

### Docker 상태 전체 확인
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### n8n 로그 실시간 확인
```bash
docker logs -f n8n --tail 100
```

### NocoDB 로그 실시간 확인
```bash
docker logs -f nocodb --tail 100
```

### NocoDB API 테이블 목록 확인
```bash
curl -s -H "xc-token: SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl" \
  "https://nocodb.pressco21.com/api/v1/db/meta/projects/poey1yrm1r6sthf/tables" | jq '.list[] | .title'
```

### Docker 컨테이너 재시작
```bash
docker restart n8n
docker restart nocodb
```

### n8n 환경변수 전체 확인
```bash
docker exec n8n env | sort
```
