# PRD: 플로라(Flora) AI 비서 고도화 v1.0

> 작성일: 2026-03-26 | 갱신: 2026-03-27 Phase C v2 확정 + C-Step1 완료 반영
> 상태: Phase A+B ✅, Phase C-Step1 ✅, C-Step2 착수 준비
> Phase C v2: 팀미팅 + 기술 검증 완료, 단일 봇 + GPT-5.4 공유 구조 확정
> 문서 위치: `docs/Phase-C/` (법무 3종 + 직원 가이드)
> 이전 세션 참조: `openclaw-server.md` (메모리)

---

## 1. 프로젝트 개요

### 비전
프레스코21의 모든 업무를 AI 비서 "플로라"가 보좌하는 자비스급 시스템 구축.
1차로 대표(지호님) 전용 → 2차로 직원별 맞춤 AI 비서 확장.

### 현재 상태 (2026-03-26 완료)
- 플로라 🌸 서버 배포 완료 (Oracle Cloud, gpt-5.4)
- 텔레그램 봇 (@pressco21_openclaw_bot) 연동
- Tailscale VPN으로 서버↔맥북 연결
- Playwright 웹 브라우징 가능
- SSH로 맥북 로컬 파일 접근 가능
- 메모리/인증 자동 동기화 (launchd)

### 목표
| Phase | 목표 | 기간 |
|-------|------|------|
| A | 데이터 연결 (NocoDB + n8n + 브리핑) | 1~2일 |
| B | 업무 자동화 (스킬 + 이메일 + 리포트) | 3~7일 |
| C | 생태계 확장 (직원 봇 + 서브에이전트) | 2~4주 |

---

## 2. 인프라 현황

### 서버
| 서버 | IP | 용도 | 스펙 |
|------|-----|------|------|
| OpenClaw 전용 | 158.179.193.173 | 플로라 게이트웨이 | ARM 2 OCPU / 12GB |
| n8n 운영 | 158.180.77.201 | n8n + NocoDB + MinIO + PG | ARM 2 OCPU / 12GB |
| 맥북 (로컬) | 100.101.1.50 (TS) | 개발 조종석 | M1 Pro 16GB |

### 연결
- Tailscale VPN: 서버 ↔ 맥북 (사설 네트워크)
- SSH: 서버 → 맥북 (`ssh macbook`, ed25519 키 인증)
- 인증 자동 동기화: 6시간마다 (launchd)
- 메모리 자동 동기화: 1시간마다 (launchd)

### AI 모델
- **에이전트 대화**: `openai-codex/gpt-5.4` (ChatGPT Pro $200)
  - owner fallback: gpt-5.4-mini → claude-sonnet-4-6
  - staff fallback: gpt-5.4-mini → gemini-2.5-flash
- **게이트웨이 시스템**: `anthropic/claude-opus-4-6` (라우팅/내부 처리용, 대화 모델과 별도)
- **Gemini**: systemd env에 API 키 세팅 완료 (비상 fallback용)

---

## 3. Phase A — 데이터 연결 (즉시 효과)

### A1. 매일 아침 브리핑
- **트리거**: cron 매일 09:00 KST
- **내용**: NocoDB에서 미완료 주문, 마감 임박 태스크, 예정된 일정 조회 → 텔레그램 발송
- **구현**: OpenClaw cron → NocoDB API(curl) → 요약 생성 → 텔레그램 메시지
- **비용**: $0 (기존 구독 내)

### A2. NocoDB 직접 조회
- **범위**: 파트너클래스, 강사공간, 정부지원, AI챗봇 전 테이블 READ
- **방식**: 플로라가 curl로 NocoDB REST API 직접 호출
- **보안**: READ만 허용. WRITE는 n8n 웹훅 경유 필수 (역할 분리 원칙)
- **엔드포인트**: `https://nocodb.pressco21.com/api/v1/db/data/noco/{projectId}/{tableId}`
- **인증**: xc-token 헤더

### A3. n8n 웹훅 트리거
- **범위**: 기존 30+개 워크플로우를 플로라가 텔레그램으로 실행
- **방식**: "FA-001 돌려줘" → 플로라가 해당 WF의 웹훅 URL 호출
- **보안**: 웹훅 URL에 인증 토큰 파라미터 포함
- **우선 대상**: WF#1(정부지원수집), WF#6(텔레그램허브), FA-001~003(강사공간)

### A4. 쇼핑몰 가격 모니터링
- **트리거**: cron 매일 11:00 KST (또는 수동 요청)
- **방식**: Playwright로 스마트스토어/쿠팡 경쟁사 페이지 크롤링
- **출력**: 가격 변동 있으면 텔레그램 알림, 없으면 침묵
- **비용**: $0 (서버 Playwright)

### A Phase 선행 조건 (리스크 대응)
| # | 선행 작업 | 대응 리스크 |
|---|----------|-----------|
| 1 | **역할 분리 원칙 문서화**: n8n=스케줄 자동화, OpenClaw=AI 판단 | n8n/OpenClaw 충돌 |
| 2 | **서버 리소스 모니터링 구축**: CPU/RAM 80% 초과 시 텔레그램 경보 | Oracle Free Tier 한계 |
| 3 | **NocoDB READ 전용 토큰 발급** (가능하면) | 데이터 안전 |

---

## 4. Phase B — 업무 자동화

### B1. 커스텀 스킬 시스템
- 기존 12개 플레이북(회의브리프, CS트리아지, 가격마진 등)을 OpenClaw 스킬로 변환
- `~/.openclaw/workspace/skills/` 하위에 SKILL.md 기반 구현
- 텔레그램에서 `/가격검토 에폭시레진` 형태로 실행
- **우선 스킬**: CS트리아지, 가격마진검토, 회의브리프

### B2. 이메일 발송
- 플로라가 초안 작성 → 텔레그램으로 미리보기 → 승인 후 발송
- SMTP: 기존 네이버 SMTP (n8n Credential `31jTm9BU7iyj0pVx`)
- **보안**: 발송 전 반드시 텔레그램 승인 (자동 발송 절대 금지)

### B3. Google Drive 연동
- 기존 OAuth2 Credential 활용 (n8n 경유)
- 촬영 사진, 견적서, 서류 접근
- 직접 OAuth 사용 금지 → n8n 웹훅 통해 간접 접근 (토큰 관리 단일화)

### B4. 저녁 일일 리포트
- 매일 18:00 KST에 "오늘 처리한 것, 미처리 건, 내일 할 것" 자동 정리
- 메모리 파일 + NocoDB 데이터 조합

### B5. 음성 메모 처리 (선택)
- 텔레그램 음성 메시지 → Whisper 변환 → 할 일 등록/메모 저장
- OpenClaw 내장 기능 확인 필요

---

## 5. Phase C — 직원 AI 비서 확장 (v2, 2026-03-27 확정)

> Phase C v2: 팀미팅(CSO/CFO/CTO/COO/코치/법무) + 기술 검증을 거쳐 확정된 현실 기반 설계

### 설계 원칙 (v1에서 변경된 사항)

| 항목 | v1 (PRD 원안) | v2 (확정) | 변경 이유 |
|------|-------------|----------|----------|
| 봇 수 | 4대 (플로라/루나/아이비/로즈) | **1대** (플로라) | 관리 단순화, 7명 규모에 과도 |
| AI 모델 | API 종량제 (mini 70%) | **ChatGPT Pro 공유 (gpt-5.4)** | 추가 비용 $0, 전원 최고 모델 |
| 모델 계층화 | mini + 5.4 혼합 | **전원 gpt-5.4** | 구독 3세션으로 충분 |
| Claude 활용 | Flora 봇 경유 | **장지호 직접 사용만** | Anthropic OAuth 서드파티 차단 (2026-01) |
| 비용 | $330~825/월 추가 | **$0 추가** | 기존 구독 내 해결 |

### C1. 아키텍처

**단일 봇 + 멀티 에이전트 라우팅:**
```
@pressco21_openclaw_bot (플로라)
    │
    ├─ [owner 에이전트] → 장지호 전용 (GPT-5.4, 전체 접근)
    │   Chat ID: 7713811206
    │
    └─ [staff 에이전트] → 직원 공용 (GPT-5.4, 권한 제한)
        Chat ID: 이재혁, 원장님, 영상팀장, 웹디자이너
        │
        └─ Chat ID 기반 직원 식별 → 직무별 권한 + 페르소나 적용
```

**모델 배정:**
| 사용자 | AI 모델 | 용도 |
|--------|--------|------|
| 장지호 (Flora 봇) | GPT-5.4 (ChatGPT Pro) | 회사 경영 전반, 데이터 분석 |
| 장지호 (직접 사용) | Claude Opus/Sonnet (Max 플랜) | 개발/코딩(Claude Code), 전략/기획(claude.ai) |
| 직원 전원 (Flora 봇) | GPT-5.4 (ChatGPT Pro 공유) | 직무별 AI 보조 |
| 비상 fallback | Gemini 2.5 Flash (무료) | ChatGPT Pro 장애 시만 |

**ChatGPT Pro 동시 3세션 배분:**
- 장지호가 Codex + Flora 사용 시: 2세션 → 직원용 1세션 남음
- 장지호가 Flora만 사용 시: 1세션 → 직원용 2세션 남음
- 장지호가 안 쓸 때: 0세션 → 직원용 3세션 전부

**우선순위 큐 (동시 요청 시):**
```
1순위: 장지호 (경영기획 팀장) — 항상 최우선
2순위: 이재혁 과장 (물류운영) — CS/발송 실시간성 중요
3순위: 원장님 (CEO) — 경영 판단
4순위: 영상 팀장 — 콘텐츠 제작
5순위: 웹 디자이너 — 콘텐츠 제작
```
실제 4~5명이 동시에 GPT-5.4를 요청할 확률은 매우 낮음. 대기 발생 시 수 초~십 초 수준.

### C2. 직원 목록 및 권한 매트릭스

**대상 직원 (5명):**
| 이름 | 직책 | 텔레그램 Chat ID | 페르소나 | 핵심 업무 |
|------|------|-----------------|---------|----------|
| 장지호 | 경영기획 팀장 | 7713811206 | 플로라 🌸 | 경영 전반, 개발 |
| 이재혁 | 물류운영 과장 | (수집 필요) | 루나 🌙 | CS, 발송, 재고 |
| (원장님) | CEO/대표 | (수집 필요) | (별도 협의) | 경영 판단, 보고 수신 |
| (영상팀장) | 영상 팀장 | (수집 필요) | 로즈 🌹 | 유튜브/SNS 기획 |
| (웹디자이너) | 웹 디자이너 | (수집 필요) | 아이비 🌿 | 상세페이지/배너 |

**데이터 접근 매트릭스 (확정):**
```
             | 주문  | 정산  | 수수료 | 고객PII  | 클래스 | 매출   |
장지호(owner) | RW   | RW   | RW    | RW      | RW    | RW    |
이재혁(staff) | R    | DENY | DENY  | R(마스킹) | R     | DENY  |
원장님(owner) | RW   | RW   | RW    | RW      | RW    | RW    |
영상팀장(staff)| DENY | DENY | DENY  | DENY    | R     | DENY  |
디자이너(staff)| DENY | DENY | DENY  | DENY    | R     | DENY  |
```
> 원장님의 수수료 접근 범위는 장지호가 별도 확정 필요.

**PII 마스킹 규칙 (이재혁 과장):**
- 고객 이름: "김**" (성만 표시)
- 전화번호: "***-****-1234" (뒤 4자리만)
- 주소: 시/구까지만 (배송 업무 시 전체 주소 열람은 별도 승인)

### C3. 데이터 축적 시스템

모든 대화가 NocoDB에 기록되어 회사 지식 자산으로 축적됨.

**NocoDB 신규 테이블: `conversation_logs`**
| 컬럼 | 타입 | 설명 |
|------|------|------|
| log_id | Auto ID | PK |
| user_chat_id | Text | 텔레그램 Chat ID |
| user_name | Text | 사용자 이름 |
| message_text | LongText | 사용자 질문 원문 |
| response_summary | LongText | AI 응답 요약 |
| model_used | Text | gpt-5.4 / gemini-2.5-flash 등 |
| skill_triggered | Text | cs-triage / price-margin / general 등 |
| tokens_used | Number | 총 토큰 수 |
| response_time_ms | Number | 응답 시간 |
| created_at | DateTime | 기록 시각 |

**파이프라인:** 대화 완료 → n8n 웹훅(비동기) → NocoDB INSERT
**활용:** 직원별 사용 패턴 분석, 자주 묻는 질문 파악, 월간 AI 활용 리포트

### C4. 보안 및 법무 장치

**Phase C 착수 전 필수 (제도적):**
| # | 항목 | 담당 | 상태 |
|---|------|------|------|
| 1 | 직원 보안서약서 서명 (전원) | 장지호 | 대기 |
| 2 | 내부 AI 사용 정책 수립 | 장지호 | 대기 |
| 3 | 접근 권한 매트릭스 문서화 (대표 서명) | 장지호 | 위 C2에서 초안 완료 |
| 4 | 개인정보처리방침 갱신 (AI 처리 항목 추가) | 장지호 | 대기 |

**기술적 보안:**
- Chat ID allowlist: 등록된 ID만 봇 접근 가능 (텔레그램 서버 발급, 조작 불가)
- 에이전트 분리: owner/staff 각각 독립 workspace + SOUL.md
- NocoDB 접근: staff 에이전트는 n8n 웹훅 경유만 (직접 NocoDB 호출 차단)
- 감사 로그: conversation_logs 테이블에 전체 기록
- 퇴사자 즉시 차단: allowFrom에서 Chat ID 제거 (5분 이내)

### C5. 직원 교육 로드맵

**원칙:** AI 교육이 아니라 "업무 도구 하나 추가". 커스텀 GPTs를 미리 세팅하여 입력만 하면 결과 나오는 환경 제공.

| 주차 | 대상 | 내용 |
|------|------|------|
| Week 0 | 장지호 | 교육 준비: 프롬프트 템플릿, 데모 영상, 실습 과제 제작 |
| Week 1 | 이재혁 과장 | Flora 봇 연동 + CS 응대 프롬프트 1:1 시연 (30분) |
| Week 1 | 디자이너/영상팀장 | ChatGPT 앱 설치 + 카피/스크립트 작성 시연 (30분) |
| Week 2~3 | 이재혁 과장 | 실무 적용 (매일 3~5건 CS 봇 활용), 장지호 피드백 |
| Week 3 | 원장님 | ChatGPT 앱(모바일 음성) + 경영 현황 질의 시연 (20분) |
| Week 4 | 전원 | 첫 활용 공유 미팅 (15분), 효과 측정 |
| Month 2+ | 전원 | 격주 공유 미팅, 프롬프트 라이브러리 축적 |

### C6. 향후 확장 (Phase C 안정화 후)

| 항목 | 시점 | 선행 조건 |
|------|------|----------|
| 서브에이전트 10개 스킬 변환 | C 안정화 후 | 직원 봇 활용 데이터 축적 |
| 자동 정산/매출 리포트 | 세무사 확인 후 | WF-SETTLE 활성화 |
| 메이크샵 어드민 자동화 (Playwright) | 필요시 | 로그인 정보 서버 환경변수 관리 |
| 봇 분리 (직원별 전용 봇) | 동시 사용 병목 시 | BotFather 봇 추가 생성 |
| Gemini 직원 전용 전환 | ChatGPT Pro 한계 도달 시 | Gemini API 키 서버 세팅 |

---

## 6. 리스크 매트릭스 (v2, Phase C 반영)

| # | 리스크 | 심각도 | 확률 | 대응방안 |
|---|--------|--------|------|----------|
| R1 | Oracle Free Tier 한계 | L | 낮음 | 실측 RAM 10GB 여유, CPU 유휴. 모니터링 유지 |
| R2 | ChatGPT Pro 세션 경합 | M | 낮음 | 5명 중 동시 4명 이상 사용 빈도 극히 낮음. 대기 수 초 |
| R3 | SSH 보안 (서버→맥북) | H | 중간 | 전용 계정, 명령 화이트리스트, Tailscale ACL |
| R4 | n8n/OpenClaw 역할 충돌 | M | 낮음 | **원칙: n8n=WRITE, OpenClaw=READ+판단** |
| R5 | 맥북 꺼짐 의존성 | H | 높음 | 핵심 기능은 서버 단독, 맥북 OFF시 graceful degradation |
| R6 | 직원 미사용/저항감 | M | 중간 | "첫 성공 경험" 전략, 강제 금지, 1:1 시연 |
| R7 | Codex OAuth 서비스 약관 | M | 중간 | 회색영역. 회사 업무용 한도 내 사용, Claude/Gemini fallback 준비 |
| R8 | 고객 PII AI 전송 | H | 중간 | PII 마스킹 레이어, 직원별 접근 차단, 감사 로그 |
| R9 | 수수료/정산 노출 | H | 낮음 | DENY + n8n 필터링 이중 차단, SOUL.md 명시 |
| R10 | Claude Max OAuth 차단 | - | 확정 | Flora 봇에서 Claude 사용 불가. 장지호 직접 사용으로 회피 |
| R11 | Gemini 무료 쿼터 삭감 | M | 중간 | 비상 fallback용이므로 영향 제한적. 유료 전환 검토 |

---

## 7. 비용 시뮬레이션 (v2)

### 현재 (2026-03-27)
| 항목 | 월 비용 | 용도 |
|------|--------|------|
| ChatGPT Pro | $200 | Flora 봇 (gpt-5.4) |
| Claude Max | $100 | 장지호 개발/전략 직접 사용 |
| 서버 (Oracle Free x2) | $0 | OpenClaw + n8n |
| **합계** | **$300/월** | **약 43만원/월** |

### Phase C 완료 후
| 항목 | 월 비용 | 변동 |
|------|--------|------|
| ChatGPT Pro | $200 | **변동 없음** (5명 공유) |
| Claude Max | $100 | **변동 없음** (장지호 전용) |
| 서버 | $0 | **변동 없음** |
| API 추가 | $0 | 불필요 |
| **합계** | **$300/월** | **추가 비용 $0** |

연간: **$3,600 (약 515만원/년)** — Phase A~C 전 기간 동일

---

## 8. 아키텍처 원칙 (v2)

### 역할 분리 (절대 원칙)
```
n8n       = "정해진 일을 정해진 시간에 반복" (Scheduled Automation)
             → cron 반복, 웹훅 수신, 데이터 파이프라인, NocoDB WRITE

Flora 봇  = "판단이 필요한 일을 요청 시 수행" (AI-Driven Orchestration)
             → 자연어 질의, 분석/요약, 초안 작성, n8n 트리거(웹훅 호출)
             → NocoDB READ 직접, WRITE는 반드시 n8n 경유

Claude    = "장지호의 개인 도구" (Direct Human Tool)
             → Claude Code(개발/코딩), claude.ai(전략/기획/분석)
             → Flora 봇 시스템과 완전 독립
```

### 보안 원칙
1. **외부 발송 전 반드시 텔레그램 승인** (이메일, SNS, 공개 게시)
2. **NocoDB WRITE는 n8n만** (데이터 경합 방지)
3. **수수료율 비공개** (직원에게 절대 노출 금지)
4. **고객 PII 마스킹** (이재혁 과장: 마스킹 적용, 그 외 직원: DENY)
5. **Chat ID allowlist** (등록된 직원만 봇 접근)
6. **감사 로그 필수** (전체 대화 NocoDB 기록)
7. **위험 명령 금지** (rm -rf, sudo, git push --force)
8. **퇴사자 즉시 차단** (allowFrom에서 Chat ID 제거)

### 비용 원칙
1. **기존 구독 내 해결** (추가 API 비용 $0 원칙)
2. **ChatGPT Pro 3세션 공유** (우선순위 큐로 관리)
3. **토큰 사용량 NocoDB 로깅** (월말 분석)
4. **Gemini는 비상 fallback만** (주력 아님)

---

## 9. 실행 로드맵 (v2)

### Phase A (완료 2026-03-26) ✅
```
A-001: 역할 분리 원칙 문서화 + SOUL.md 반영 ✅
A-002: 서버 리소스 모니터링 + 텔레그램 경보 ✅
A-003: NocoDB READ 연동 (curl 테스트 → 플로라 스킬화) ✅
A-004: n8n 웹훅 트리거 연동 (WF#1, WF#6, FA-001~003) ✅
A-005: 매일 아침 브리핑 cron 설정 ✅
A-006: 쇼핑몰 가격 모니터링 Playwright 스크립트 ✅ (골격, 경쟁사 URL 확정 대기)
```

### Phase B (완료 2026-03-26) ✅
```
B-001: CS트리아지 커스텀 스킬 구현 ✅ (skills/cs-triage/)
B-002: 가격마진검토 커스텀 스킬 구현 ✅ (skills/price-margin/)
B-003: 이메일 발송 스킬 + n8n WF ✅ (skills/email-sender/ + Flora Email Send)
B-004: 저녁 일일 리포트 cron 설정 ✅ (skills/daily-report/ + evening-report.sh)
B-005: Google Drive 연동 (n8n 웹훅) ✅ (skills/gdrive-access/ + Flora GDrive List/Search)
B-006: 토큰 사용량 로깅 시스템 ✅ (skills/token-logger/ + log-tokens.sh + token-summary.sh)
```

### Phase C (2026-03-27~ , v2 확정)

**C-Step 1: 기반 작업 (완료 2026-03-27)** ✅
```
C-001: 법무 문서 작성 ✅ (docs/Phase-C/01~03)
C-002: openclaw.json 멀티 에이전트 재구성 ✅ (owner+staff, 현재 전체→owner 단일 라우팅)
C-003: staff 에이전트 workspace 생성 ✅ (SOUL.md+권한+PII)
C-004: PII 마스킹 스킬 구현 ✅ (workspace-staff/skills/pii-masker/)
C-005: 대화 로그 시스템 구축 ✅ (n8n WF UC4f2SxSmutEzdOT + NocoDB m6r9su436vk75w4)
C-006: Playwright 좀비 방지 ✅ (price-monitor.js 5분 글로벌 타임아웃 + try/finally)
C-007: Gemini API 키 서버 세팅 ✅ (systemd env + models.json google provider)
```

**C-Step 2: 교육 준비 + 파일럿 (2~3주, 진행 중)**
```
C-008: 직원 Chat ID 수집 — 원장님 ✅ / 이재혁,영상팀장,웹디자이너 대기
        → 직원 설정 가이드: docs/Phase-C/직원-텔레그램-설정-가이드.md
        → 자동화 스크립트: scripts/flora-add-staff.sh (Chat ID만 넣으면 즉시 등록)
C-009: 직원용 프롬프트 템플릿 ✅ (docs/Phase-C/prompt-templates/ 3개 역할별)
        → 루나(이재혁/CS물류), 로즈(영상/콘텐츠), 아이비(디자인/카피)
        → 데모 영상 제작은 실제 파일럿 테스트 시 녹화 예정
C-010: 이재혁 과장 파일럿 — staff 스킬 3개 준비 완료 (cs-triage, order-lookup, pii-masker)
        → Chat ID 수집 후 flora-add-staff.sh 실행 → 바로 테스트 가능
C-011: 디자이너/영상팀장 ChatGPT 앱 도입 (C-010 파일럿 후 병렬 진행)
C-012: 보안서약서 서명 수집 — 문서 준비 완료 (docs/Phase-C/01-보안서약서.md)
```

**C-Step 3: 확산 + 안정화 (1~2개월)**
```
C-013: 원장님 텔레그램 봇 연동 + 경영 보고 자동화
C-014: 효과 측정 (응대 시간, 사용 빈도, 만족도)
C-015: 전원 자율 활용 + 격주 공유 미팅
C-016: 대화 로그 분석 → 스킬/프롬프트 개선
C-017: 개인정보처리방침 갱신 (메이크샵 관리자 페이지)
```

---

## 10. 성공 지표 (KPI, v2)

| 지표 | Phase A | Phase B | Phase C |
|------|---------|---------|---------|
| 플로라 일일 사용 횟수 | 5회+ | 15회+ | 30회+ (전원 합산) |
| 아침 브리핑 발송률 | 95%+ | 95%+ | 95%+ |
| CS 1차 응답 시간 | - | 30분→10분 | 10분→5분 |
| 월 추가 비용 | $0 | $0 | **$0** |
| 직원 AI 주간 사용 빈도 | - | - | 1인 10회+ |
| 대화 로그 축적 | - | - | 월 500건+ |
| 직원 만족도 | - | - | 4.0/5.0+ |

---

## 부록: 기술 참조

### 서버 접속
```bash
oc-ssh                    # OpenClaw 서버
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201  # n8n 서버
```

### 동기화 명령
```bash
oc-push / oc-pull / oc-sync  # 워크스페이스
oc-auth                       # 인증 토큰
```

### OpenClaw 관리
```bash
# 서버에서
systemctl --user restart openclaw-gateway
systemctl --user status openclaw-gateway
journalctl --user -u openclaw-gateway -f
```

### OpenClaw 멀티 에이전트 설정 (Phase C 구조)

**현재 서버 설정 (C-Step 1):** 전체 telegram → owner 라우팅 (직원 미등록)
```json
{
  "agents": {
    "defaults": {
      "workspace": "/home/ubuntu/.openclaw/workspace",
      "compaction": { "mode": "safeguard" },
      "maxConcurrent": 2,
      "subagents": { "maxConcurrent": 4 }
    },
    "list": [
      {
        "id": "owner",
        "workspace": "/home/ubuntu/.openclaw/workspace-owner",
        "model": {
          "primary": "openai-codex/gpt-5.4",
          "fallbacks": ["openai-codex/gpt-5.4-mini", "anthropic/claude-sonnet-4-6"]
        }
      },
      {
        "id": "staff",
        "workspace": "/home/ubuntu/.openclaw/workspace-staff",
        "model": {
          "primary": "openai-codex/gpt-5.4",
          "fallbacks": ["openai-codex/gpt-5.4-mini", "google/gemini-2.5-flash"]
        }
      }
    ]
  },
  "bindings": [
    { "type": "route", "agentId": "owner", "match": { "channel": "telegram" } }
  ]
}
```

**C-Step 2 목표 설정:** peer-specific 라우팅으로 변경 (직원 Chat ID 수집 후)
```json
{
  "bindings": [
    { "type": "route", "agentId": "owner", "match": { "channel": "telegram", "peer": { "id": "tg:7713811206" } } },
    { "type": "route", "agentId": "owner", "match": { "channel": "telegram", "peer": { "id": "tg:8606163783" } } },
    { "type": "route", "agentId": "staff", "match": { "channel": "telegram" } }
  ]
}
```

### NocoDB API
```bash
curl -s -H "xc-token: {TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{projectId}/{tableId}?limit=10"
```

### 서버 실측 현황 (2026-03-27)
```
OpenClaw: RAM 1.2GB/11GB (10GB 여유), CPU 0.00, Disk 6.1GB/45GB
n8n:      RAM 1.7GB/11GB (9.5GB 여유), CPU 0.00, Disk 24GB/45GB
```
