# Task 202: n8n 서버 환경 설정 (CORS, Credentials, Gmail SMTP)

> **버전**: Phase 2 v2.1 (n8n + NocoDB)
> **작성일**: 2026-02-25
> **의존성**: Task 201 (NocoDB 설치 완료 후 NocoDB API Token 필요)
> **참조 문서**: `docs/phase2/n8n-airtable-migration-architecture.md` 4장
> **담당 에이전트**: `gas-backend-expert`, `makeshop-planning-expert`

---

## 개요

n8n.pressco21.com 서버에 Phase 2 개발을 위한 환경을 설정합니다.
Oracle Cloud ARM 서버 (158.180.77.201)에서 실행 중인 n8n에 아래 설정을 적용합니다.

> Task 201에서 NocoDB가 동일 서버에 설치되므로, 이 Task에서 NocoDB API Token을 n8n Credentials에 등록합니다.

---

## 1. 현재 서버 상태 확인

```bash
# n8n 서버 접속 후 현재 상태 확인
ssh ubuntu@158.180.77.201

# n8n 실행 중인지 확인
pm2 status
# 또는
docker ps | grep n8n
```

---

## 2. CORS 설정

### 방법 A: n8n 환경변수 설정 (권장)

n8n.pressco21.com에 연결된 실행 방식에 따라 아래 중 하나를 적용합니다.

#### PM2로 실행 중인 경우

```bash
# ecosystem.config.js 또는 .env 파일에 추가
# n8n-main 폴더의 .env 파일이 있으면 해당 파일에 추가
```

`.env` 파일에 추가:
```bash
N8N_CORS_ALLOWED_ORIGINS=https://foreverlove.co.kr,https://www.foreverlove.co.kr
N8N_CORS_ALLOW_METHODS=GET,POST,OPTIONS
N8N_CORS_ALLOW_HEADERS=Content-Type,Authorization
```

PM2 재시작:
```bash
pm2 restart n8n --update-env
```

#### Docker Compose로 실행 중인 경우

`docker-compose.yml`의 environment 섹션에 추가:
```yaml
environment:
  - N8N_CORS_ALLOWED_ORIGINS=https://foreverlove.co.kr,https://www.foreverlove.co.kr
  - N8N_CORS_ALLOW_METHODS=GET,POST,OPTIONS
  - N8N_CORS_ALLOW_HEADERS=Content-Type,Authorization
```

Docker Compose 재시작:
```bash
docker-compose down && docker-compose up -d
```

### 방법 B: Nginx 리버스 프록시 CORS 헤더 (대안)

n8n 앞에 Nginx가 있다면 `/etc/nginx/sites-available/n8n` 파일 수정:

```nginx
server {
    listen 443 ssl;
    server_name n8n.pressco21.com;

    location /webhook/ {
        # CORS OPTIONS preflight 처리
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://foreverlove.co.kr' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
            add_header 'Access-Control-Max-Age' 3600;
            return 204;
        }

        # 실제 요청에도 CORS 헤더 추가
        add_header 'Access-Control-Allow-Origin' 'https://foreverlove.co.kr' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Nginx 설정 적용:
```bash
sudo nginx -t  # 문법 검증
sudo systemctl reload nginx
```

### CORS 설정 검증

```javascript
// 브라우저 개발자도구 Console에서 실행 (foreverlove.co.kr 페이지)
fetch('https://n8n.pressco21.com/webhook/health-check', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
// CORS 에러 없이 응답 오면 성공
```

---

## 3. n8n Credentials 등록 (6개)

n8n UI (https://n8n.pressco21.com) → Settings → Credentials → New

### 3-1. NocoDB API Token

| 항목 | 값 |
|------|-----|
| Credential Type | NocoDB API (또는 HTTP Header Auth) |
| Token | Task 201에서 발급한 API Token (`xc-token` 헤더) |
| Base URL | https://nocodb.pressco21.com |
| 이름 | PRESSCO21-NocoDB |

> **n8n NocoDB 노드**: n8n 코어에 NocoDB 전용 노드가 내장되어 있습니다.
> Credentials → New → "NocoDB API" 검색 → API Token + Base URL 입력.
>
> n8n NocoDB 노드가 보이지 않으면 HTTP Header Auth로 대체:
> | 항목 | 값 |
> |------|-----|
> | Credential Type | HTTP Header Auth |
> | Name | xc-token |
> | Value | (Task 201에서 발급한 API Token) |

### 3-2. Makeshop API (메이크샵 오픈 API)

n8n에는 메이크샵 전용 Credential Type이 없으므로, HTTP Header Auth를 사용합니다.

| 항목 | 값 |
|------|-----|
| Credential Type | HTTP Header Auth |
| Name | Shopkey |
| Value | (메이크샵 관리자 → 오픈API → API Key 확인) |
| 이름 | PRESSCO21-Makeshop-Shopkey |

두 번째 Credential:
| 항목 | 값 |
|------|-----|
| Credential Type | HTTP Header Auth |
| Name | Licensekey |
| Value | (메이크샵 Licensekey) |
| 이름 | PRESSCO21-Makeshop-Licensekey |

> **중요**: 메이크샵 API는 `Authorization: Basic ...` 방식이 아닌 커스텀 헤더 `Shopkey`, `Licensekey`를 사용합니다.
> n8n HTTP Request 노드에서 "Authentication: Generic Credential Type" → "Header Auth" 방식을 2개 설정합니다.
>
> **IP 화이트리스트**: 메이크샵 오픈 API → "접근 허용 IP"에 `158.180.77.201` (n8n 서버 고정 IP) 등록 필요

### 3-3. Gmail SMTP

Gmail 앱 비밀번호 생성 후 등록합니다.

Gmail 앱 비밀번호 발급:
1. Google 계정 → 보안 → 2단계 인증 활성화 (필수)
2. 앱 비밀번호 → 기타(맞춤) → "n8n-pressco21" 입력 → 생성
3. 16자리 비밀번호 복사

n8n Credential 등록:
| 항목 | 값 |
|------|-----|
| Credential Type | SMTP |
| Host | smtp.gmail.com |
| Port | 465 |
| SSL | ON |
| User | foreverloveflower@naver.com (또는 Gmail 주소) |
| Password | (16자리 앱 비밀번호) |
| 이름 | PRESSCO21-Gmail-SMTP |

> **참고**: 네이버 계정으로 이메일을 보내는 경우 `smtp.naver.com`, 포트 465를 사용합니다.
> 네이버 SMTP 앱 비밀번호: 네이버 → 보안설정 → 앱 비밀번호

### 3-4. Telegram Bot API

| 항목 | 값 |
|------|-----|
| Credential Type | Telegram API |
| Access Token | @Pressco21_makeshop_bot의 Bot Token (BotFather에서 발급) |
| 이름 | PRESSCO21-Telegram-Bot |

텔레그램 채팅 ID 확인:
1. @Pressco21_makeshop_bot에게 아무 메시지 전송
2. https://api.telegram.org/bot{TOKEN}/getUpdates 호출 → chat.id 값 확인
3. 해당 chat.id를 tbl_Settings의 admin_telegram_chat_id에 저장

### 3-5. Admin Token (내부 보안용)

관리자 전용 엔드포인트 (파트너 승인 등) 보호용 토큰입니다.

| 항목 | 값 |
|------|-----|
| Credential Type | HTTP Header Auth |
| Name | X-Admin-Token |
| Value | (랜덤 32자리 문자열, 예: openssl rand -hex 16 으로 생성) |
| 이름 | PRESSCO21-Admin-Token |

관리자 토큰 생성:
```bash
openssl rand -hex 16
# 예: a3f2c8d91e4b6721...
```

---

## 4. Gmail SMTP 테스트 발송

n8n에서 Send Email 노드를 사용하여 테스트 이메일을 발송합니다.

n8n → New Workflow → 빈 노드 추가:
1. Start 노드 추가
2. Send Email 노드 추가
   - Credential: PRESSCO21-Gmail-SMTP
   - From: foreverloveflower@naver.com
   - To: (테스트 이메일 주소)
   - Subject: "[n8n 테스트] PRESSCO21 이메일 발송 확인"
   - Email Format: HTML
   - HTML: `<p>n8n SMTP 연동 테스트 성공!</p>`
3. Execute Workflow 실행
4. 수신 확인

---

## 5. 텔레그램 봇 연결 확인

n8n → New Workflow:
1. Start 노드 추가
2. Telegram 노드 추가
   - Credential: PRESSCO21-Telegram-Bot
   - Operation: Send Message
   - Chat ID: (admin_telegram_chat_id)
   - Text: `[n8n 테스트] PRESSCO21 서버 설정 완료. Phase 2 개발 시작합니다.`
3. Execute Workflow 실행
4. 텔레그램 수신 확인

---

## 6. Error Handler 워크플로우 생성

모든 워크플로우에서 에러 발생 시 텔레그램으로 알림을 받는 공통 워크플로우입니다.

워크플로우 이름: `[ERROR HANDLER] 전체 워크플로우 에러 알림`

```
[Error Trigger] -> [Telegram: 에러 알림 발송]
```

Telegram 노드 설정:
- Chat ID: {{ $env.ADMIN_CHAT_ID }} 또는 tbl_Settings에서 조회
- Text:
```
⚠️ [n8n 에러 발생]
워크플로우: {{ $workflow.name }}
에러 메시지: {{ $json.error.message }}
발생 시각: {{ $now.format('YYYY-MM-DD HH:mm:ss') }}
실행 ID: {{ $execution.id }}
```

각 워크플로우 설정에서 "Error Workflow" → 이 워크플로우 선택합니다.

---

## 7. 메이크샵 API IP 화이트리스트 등록

메이크샵 오픈 API는 IP 기반 접근 제한이 있습니다.

1. 메이크샵 관리자(어드민) 로그인
2. 관리 → 오픈 API → 접근 허용 IP 관리
3. `158.180.77.201` (n8n 서버 고정 IP) 추가

> 기존 GAS에서는 Google의 동적 IP를 화이트리스트에 등록할 수 없었습니다.
> n8n 서버는 고정 IP이므로 한 번 등록하면 영구적으로 유지됩니다.

---

## 8. Health Check 워크플로우 생성 (권장)

n8n 서버 상태와 Airtable 연결 상태를 확인하는 엔드포인트입니다.

워크플로우 이름: `[HEALTH] 서버 상태 확인`
Webhook URL: `https://n8n.pressco21.com/webhook/health-check`

```
[Webhook GET] -> [Airtable: tbl_Settings 조회 (key=admin_email)] -> [Respond to Webhook: {"status": "ok", "timestamp": "..."}]
```

Respond to Webhook 노드:
```json
{
    "status": "ok",
    "timestamp": "={{ $now.toISO() }}",
    "airtable": "connected",
    "version": "phase2-v2.0"
}
```

---

## 9. 완료 체크리스트

### CORS 설정

- [ ] N8N_CORS_ALLOWED_ORIGINS 환경변수 설정 (또는 Nginx CORS 헤더)
- [ ] foreverlove.co.kr에서 n8n Webhook fetch 호출 → CORS 에러 없이 응답 확인

### Credentials 등록 (6개)

- [ ] PRESSCO21-NocoDB (NocoDB API 또는 HTTP Header Auth, xc-token)
- [ ] PRESSCO21-Makeshop-Shopkey (HTTP Header Auth)
- [ ] PRESSCO21-Makeshop-Licensekey (HTTP Header Auth)
- [ ] PRESSCO21-Gmail-SMTP (SMTP)
- [ ] PRESSCO21-Telegram-Bot (Telegram API)
- [ ] PRESSCO21-Admin-Token (HTTP Header Auth)

### 테스트 발송

- [ ] Gmail SMTP 테스트 이메일 발송 성공
- [ ] 텔레그램 테스트 메시지 수신 성공

### 인프라 설정

- [ ] 메이크샵 오픈 API → 접근 허용 IP에 158.180.77.201 등록
- [ ] Error Handler 워크플로우 생성 + 활성화
- [ ] Health Check 워크플로우 생성 + 활성화
- [ ] Health Check URL 응답 확인: https://n8n.pressco21.com/webhook/health-check
