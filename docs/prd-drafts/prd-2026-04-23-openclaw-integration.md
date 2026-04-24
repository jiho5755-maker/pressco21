# PRD: OpenClaw 도입 통합 — PRESSCO21 AI 생태계 고도화

> **프로젝트명**: OpenClaw Integration
> **작성일**: 2026-04-23
> **버전**: 2.0 (전문가 검토 반영)
> **작성 근거**: 팀미팅 3회 (CSO·CTO·COO·CFO) + 보안자문·서버운영·현장운영 전문가 검토
> **승인 대기**: 장지호 팀장

---

## 0. 한 줄 요약

기존 Claude Code + OMX/Codex 체계는 그대로 두고, OpenClaw를 **"맥북 없이도 AI가 일하는 인프라"**로 추가하여 6개 비코딩 영역을 자동화한다.

---

## 1. 배경 및 문제 정의

### 1.1 현재 AI 생태계

| 도구 | 역할 | 상태 |
|------|------|------|
| Claude Code v2.1.118 | 기획·개발·보고·팀미팅 | 정상 (매일 사용) |
| Codex CLI v0.122.0 + OMX v0.14.3 | 코딩·테스트·리팩토링 | 정상 (일평균 19세션) |
| n8n 24개 WF | 업무 자동화 | 정상 |
| OpenClaw v2026.3.13 | 범용 AI 에이전트 | **설치됨, 미가동** |

### 1.2 해결해야 할 문제

1. **맥북 의존**: Claude Code와 OMX 모두 맥북 앞에 앉아야 동작
2. **API 없는 서비스**: 사방넷 등 웹만 있는 서비스 자동화 불가
3. **1인 IT 병목**: 지호님 부재 시 AI 시스템 전체 정지
4. **야간 공백**: 사람이 없는 시간에 장애 대응·모니터링 불가
5. **직원 AI 접점 부재**: 8명 중 7명은 AI를 직접 사용 못 함

### 1.3 왜 OpenClaw인가

| 요구 | Claude Code | OMX/Codex | n8n | OpenClaw |
|------|:-----------:|:---------:|:---:|:--------:|
| 맥북 없이 원격 지시 | X | X | 스케줄만 | **O** |
| 브라우저 자동 조작 | X | X | X | **O** |
| 24시간 상시 대기 | X | X | O (WF만) | **O (AI 판단 포함)** |
| 모델 자유 선택 | Claude만 | GPT만 | X | **아무거나** |
| 메시징 25+ 채널 | X | X | 텔레그램만 | **O** |
| 영구 메모리 | 수동 /save | MCP | X | **자동 MEMORY.md** |

---

## 2. 목표

### 2.1 사용자 목표

- 지호님이 맥북에서 손을 떼도 회사가 돌아가는 시간을 늘린다
- 원장님·이재혁 과장이 텔레그램으로 간단한 AI 질의를 직접 할 수 있다
- 사방넷 재고 확인이 수동이 아닌 자동으로 전환된다

### 2.2 시스템 목표

- OpenClaw가 Flora 서버에서 24시간 안정 가동
- 보안 하드닝 11항목 전부 적용
- Shared Agent Kernel과 동기화 (같은 직원, 다른 런타임)
- 각 Phase 완료 기준 검증 후 다음 단계 진행

### 2.3 성공 지표

| 지표 | 현재 | 목표 (Phase 3 완료 후) |
|------|------|---------------------|
| 맥북 없이 AI 지시 가능 여부 | 불가 | **텔레그램으로 가능** |
| 사방넷 재고 확인 방식 | 수동 (로그인+조회) | **텔레그램 한 줄 → 자동** |
| 야간 장애 대응 시간 | 다음 날 아침 | **자동 감지+대응 후 보고** |
| AI 직접 사용 가능 직원 수 | 1명 (지호님) | **3명** (+ 원장님, 이재혁 과장) |
| 보안 CVE 미패치 수 | 138건 노출 | **0건** (최신 버전) |

---

## 3. 비목표

- Claude Code 대체 (코딩은 Claude Code가 압도적)
- OMX 팀 모드 대체 (테스트/리팩토링은 OMX가 전문)
- n8n WF 대체 (24개 WF 안정 운영 중)
- 팀미팅/보고 체계 변경 (Claude Code 25 에이전트 담당)
- 전 직원 AI 교육 (단계적 확대, 초기는 3명만)

---

## 4. 기존 자산 활용 (바퀴 재발명 금지)

### 4.1 그대로 쓸 것 (이미 완성, 배포만)

| 자산 | 위치 | 내용 |
|------|------|------|
| SOUL.md | `~/clawd/SOUL.md` | 플로라 페르소나, 지호님/원장님 톤 구분, 보안 원칙 |
| AGENTS.md | `~/clawd/AGENTS.md` | 세션 시작 절차, 대화 원칙, 한국어 전용 |
| TOOLS.md | `~/clawd/TOOLS.md` | SSH(Tailscale), Playwright, 서버 인프라 접근 |
| USER.md | `~/clawd/USER.md` | 사용자 프로필 (Chat ID 기반) |
| IDENTITY.md | `~/clawd/IDENTITY.md` | 에이전트 정체성 |
| HEARTBEAT.md | `~/clawd/HEARTBEAT.md` | 상태 점검 |
| skills/ | `~/clawd/skills/` | 9개 커스텀 스킬 |
| memory/ | `~/clawd/memory/` | 기존 세션 기억 |
| 텔레그램 봇 | @pressco21_openclaw_bot | 이미 생성됨 |
| OpenClaw 바이너리 | Flora 서버 | v2026.3.13 설치됨 |
| Tailscale VPN | 4대 연결 | 보안 접근 경로 |

### 4.2 건드리지 않을 것

| 시스템 | 이유 |
|--------|------|
| Claude Code 25 에이전트 | 매일 사용, 안정적, OpenClaw보다 코딩에 강함 |
| OMX 팀 모드 + 65 스킬 | 일평균 19세션, 테스트/리팩토링 전문 |
| n8n 24개 WF | 안정 운영 중, API 기반 자동화에 적합 |
| MCP 연동 (GA4/Sheets/Ads) | 전용 데이터 파이프라인 |
| Shared Agent Kernel 77파일 | 에이전트 정본, OpenClaw도 이를 참조 |

### 4.3 OpenClaw로 대체할 것

| 영역 | 현재 방식 | OpenClaw로 | 이유 |
|------|----------|-----------|------|
| 사방넷 재고 확인 | 수동 로그인 | browser 도구 자동 조작 | API 없음, 웹만 존재 |
| 경쟁사 가격 모니터링 | 수동 방문 | 자동 크롤링 + 알림 | 정기 반복 업무 |
| 서버 장애 대응 | 맥북 SSH | Flora에서 직접 실행 | 24시간 대응 |
| 원격 지시 | 맥북 필수 | 텔레그램 | 이동 중 지시 |
| 직원 AI 접점 | 지호님만 | 텔레그램 DM | 병목 해소 |
| 야간 자율운영 | 불가 | cron + AI 판단 | 공백 시간 커버 |

---

## 5. 보안 설계 (CVE 138건 대응)

### 5.1 위협 모델

| 위협 | 심각도 | 대응 |
|------|--------|------|
| 외부에서 게이트웨이 접근 | Critical | 127.0.0.1 바인딩 + 포트 차단 |
| 인증 없는 명령 실행 | Critical | 64자 토큰 + DM pairing |
| 쉘 명령 인젝션 | High | exec deny + allowlist |
| 네트워크 탈출 | High | network allowlist |
| PII 유출 | High | MEMORY.md PII 규칙 |
| 구버전 CVE 공격 | High | 최신 버전 + 월 1회 체크 |

### 5.2 하드닝 체크리스트 (11항목)

```
[ ] 1. OpenClaw 최신 버전 (2026.4.5+) 업데이트
[ ] 2. 게이트웨이 127.0.0.1 바인딩
[ ] 3. 게이트웨이 토큰 64자 랜덤 (openssl rand -hex 32)
[ ] 4. 포트 18789 방화벽 차단 (iptables)
[ ] 5. Tailscale 경유만 원격 접근 허용
[ ] 6. shell.allowlist 설정 (docker ps/logs/restart, curl localhost, cat logs)
[ ] 7. network.allowlist 설정 (pressco21.com, telegram, naver, coupang, sabangnet)
[ ] 8. exec 모드 deny + allowlist
[ ] 9. DM pairing: 지호님(7713811206) + 원장님(8606163783) only
[ ] 10. MEMORY.md PII 규칙 (수수료율 금지, 전화번호 마스킹, 카드번호 금지)
[ ] 11. sandbox 모드 선행 테스트 후 프로덕션 전환
```

### 5.3 지속적 보안 관리

- 월 1회: OpenClaw 버전 체크, CVE 신규 발생 시 48시간 내 패치
- 분기 1회: 토큰 교체
- 상시: 실행 로그 감사 (`/home/ubuntu/openclaw/logs/`)

---

## 6. 에이전트 동기화 설계

### 6.1 원칙

> "같은 직원, 다른 런타임" — Shared Agent Kernel이 단일 진실 소스

### 6.2 구조

```
Shared Agent Kernel (main, 77파일)
  └── team/personas/*.md (35명 정의)
  └── team/knowledge-base/*/growth-log.md (학습 기록)
  └── team/protocols/*.md (행동 규칙)
       │
       ├── Claude Code Adapter
       │   └── ~/.claude/agents/ (25개, 한국 이름)
       │   └── session-start.sh / session-handoff.sh (자동 handoff)
       │
       ├── OMX Adapter  
       │   └── AGENTS.md + .codex/prompts/ (20개, 영문)
       │   └── omx-company-adapter.md
       │
       └── OpenClaw Adapter (신규)
           └── ~/clawd/SOUL.md (Kernel의 Flora 요약본, 이미 작성됨)
           └── ~/clawd/AGENTS.md (Kernel의 행동 원칙 요약본, 이미 작성됨)
           └── 실행 시 OMX wrapper 경유 → 같은 에이전트 정체성
```

### 6.3 동기화 규칙

1. 에이전트 추가/변경 → Kernel 먼저 수정 → Claude/OMX/OpenClaw 순차 반영
2. OpenClaw SOUL.md는 Kernel의 **수동 추출 요약본** (자동 동기화 아님)
3. OpenClaw memory/는 OpenClaw 자체 세션 기록 (Kernel과 분리)
4. growth-log는 Kernel에만 기록 (OpenClaw은 소비만)

---

## 7. 구현 계획

### Phase 0: 보안 하드닝 + legacy 정리

**기간**: 1일 (공수 3h)
**목표**: 안전한 기반 확보

| # | 작업 | 상세 | 담당 |
|---|------|------|------|
| 0-1 | OpenClaw 최신 버전 업데이트 | Flora 서버에서 `npm update -g openclaw` | CTO |
| 0-2 | 보안 하드닝 11항목 적용 | 위 체크리스트 전부 | CTO |
| 0-3 | legacy room-router 중지 | `launchctl unload com.pressco21.flora-telegram-room-router.plist` | CTO |
| 0-4 | 미실행 LaunchAgent 정리 | 필요 여부 판단 후 불필요 항목 제거 | CTO + 지호님 |

**완료 기준**:
- `ssh openclaw "curl -s http://127.0.0.1:18789/health"` → 200 OK
- `curl -m 5 http://158.179.193.173:18789` → timeout (외부 차단)
- room-router 409 에러 로그 소멸
- `openclaw --version` → 2026.4.5+

---

### Phase 1: 워크스페이스 배포 + 텔레그램 연동

**기간**: 1일 (공수 4h)
**목표**: 텔레그램에서 플로라와 대화 가능

| # | 작업 | 상세 | 담당 |
|---|------|------|------|
| 1-1 | ~/clawd/ 워크스페이스 Flora 서버에 배포 | `scp -r ~/clawd/ openclaw:/home/ubuntu/openclaw-workspace/` | CTO |
| 1-2 | OpenClaw 워크스페이스 경로 설정 | config에 workspace path 지정 | CTO |
| 1-3 | 텔레그램 봇 연동 | @pressco21_openclaw_bot 토큰 설정, grammY 채널 활성화 | CTO |
| 1-4 | DM pairing 설정 | 지호님 + 원장님 Chat ID만 허용 | CTO |
| 1-5 | sandbox 모드로 시작 | 실제 명령 실행 차단 상태에서 대화 테스트 | CTO |
| 1-6 | ChatGPT 5.4 모델 설정 | OpenClaw config에 모델 지정 | CTO |

**완료 기준**:
- 텔레그램에서 "안녕 플로라" → 한국어 응답 수신
- 원장님 Chat ID에서 → 쉬운 말로 응답
- 미등록 Chat ID에서 → 거부 응답
- sandbox에서 `exec` 명령 → 차단 확인

**검증 테스트 시나리오**:
```
[지호님] "안녕 플로라" → "안녕하세요, 지호님. 무엇을 도와드릴까요?"
[지호님] "오늘 날씨 어때?" → 웹 검색 후 답변
[원장님] "오늘 일정 뭐야?" → "원장님, 확인해보겠습니다. ..."
[미등록] "안녕" → "죄송합니다, 인증된 사용자만 이용 가능합니다."
[지호님] "rm -rf /" → sandbox 차단 메시지
```

---

### Phase 2: 핵심 스킬 3개 가동

**기간**: 3일 (공수 8h)
**목표**: 실질적 업무 자동화 시작

#### 2-1. 서버 모니터링 (1일, 2h)

| 기능 | 구현 |
|------|------|
| Docker 상태 확인 | exec: `ssh oracle "docker ps --format ..."` |
| 서비스 헬스체크 | exec: `curl -s n8n.pressco21.com`, `nocodb.pressco21.com` 등 |
| 자동 재시작 | exec: `ssh oracle "docker restart n8n"` (allowlist에 추가) |
| 결과 보고 | 텔레그램으로 상태 요약 전송 |

**완료 기준**: "서버 상태 확인해줘" → 14개 컨테이너 상태 텔레그램 보고

#### 2-2. 원격 데이터 조회 (1일, 3h)

| 기능 | 구현 |
|------|------|
| NocoDB 매출 조회 | exec + curl: NocoDB API → 데이터 정리 → 텔레그램 보고 |
| n8n WF 상태 확인 | exec + curl: n8n API → 활성/에러 WF 목록 |
| 강사공간 현황 | exec + curl: NocoDB 강사공간 테이블 조회 |

**완료 기준**: "이번 달 매출 얼마야?" → NocoDB 조회 → 숫자 응답

#### 2-3. 사방넷 브라우저 자동화 (1일, 3h)

| 기능 | 구현 |
|------|------|
| 사방넷 로그인 | browser: Playwright headless → 로그인 페이지 → 자격증명 입력 |
| 재고 조회 | browser: 상품 검색 → 재고 수량 추출 |
| 결과 전달 | 스크린샷 + 텍스트로 텔레그램 전송 |

**완료 기준**: "압화장미 핑크 재고 확인해줘" → 사방넷 로그인 → 조회 → 수량 + 스크린샷

**주의사항**:
- 사방넷 자격증명은 `.secrets.env`에서 로드 (SOUL.md에 하드코딩 금지)
- 브라우저 자동화 탐지 방지: User-Agent 설정, 요청 속도 제한 (5초 간격)
- 로그인 실패 시 3회 재시도 후 지호님에게 알림

---

### Phase 3: 확장 3개

**기간**: 1주 (공수 12h)
**목표**: 자율운영 체제 시작

#### 3-1. 경쟁사 모니터링 (2일, 4h)

| 기능 | 구현 |
|------|------|
| 체크스토리 가격 크롤링 | browser: 주 1회 자동 방문 → 가격 추출 |
| 쿠팡/네이버 리뷰 수집 | browser: 우리 상품 리뷰 수집 → 부정 리뷰 알림 |
| 변동 알림 | 가격 ±10% 변동 시 텔레그램 알림 |
| 주간 리포트 | 경쟁사 가격 비교표 자동 생성 |

**완료 기준**: 월요일 09:00 자동 리포트 텔레그램 수신

#### 3-2. 원장님 AI 접점 (2일, 4h)

| 기능 | 구현 |
|------|------|
| 매출 조회 | "오늘 매출 얼마야?" → 쉬운 말로 답변 |
| 일정 확인 | "이번 주 일정 뭐야?" → 간단 정리 |
| 주문 현황 | "오늘 주문 몇 건이야?" → 숫자 답변 |

**완료 기준**: 원장님이 3일간 실사용 후 "편하다" 피드백
**톤 규칙** (SOUL.md에 이미 정의):
- 존댓말, "원장님" 호칭
- IT 용어 금지 (API→연동, DB→장부)
- 숫자는 표로 깔끔하게

#### 3-3. 야간 자율운영 (3일, 4h)

| 기능 | 구현 |
|------|------|
| cron 헬스체크 | 매 30분: 서버 3대 + n8n + NocoDB 상태 확인 |
| 장애 자동 대응 | n8n 다운 → 자동 재시작 → 텔레그램 보고 |
| SSL 만료 감시 | D-7 알림 |
| 야간 에러 요약 | 아침 08:00 야간 이벤트 요약 브리핑 |

**완료 기준**: 새벽 의도적 n8n 중지 → 자동 감지+재시작+아침 보고

---

## 8. 기술 아키텍처

```
[사용자]
  ├── 지호님 (텔레그램, Chat ID: 7713811206)
  ├── 원장님 (텔레그램, Chat ID: 8606163783)
  └── 이재혁 과장 (Phase 3+ 추가 예정)
       │
       ▼
[텔레그램] → @pressco21_openclaw_bot
       │
       ▼
[Flora 서버 - Oracle #2]
  ├── OpenClaw (Node.js, 24시간 가동)
  │   ├── SOUL.md (플로라 페르소나)
  │   ├── AGENTS.md (행동 지침)
  │   ├── TOOLS.md (도구 사용법)
  │   ├── config.yaml (보안 하드닝)
  │   └── memory/ (세션 기억)
  │
  ├── 실행 도구
  │   ├── exec → SSH 경유 서버 명령
  │   ├── browser → Playwright Chromium
  │   ├── web_search → 웹 검색
  │   └── message → 텔레그램 응답
  │
  └── AI 모델 (ChatGPT 5.4 기본, 작업별 전환)
       │
       ▼
[대상 시스템] (Tailscale VPN)
  ├── Oracle #1 (n8n, NocoDB, MinIO, CRM)
  ├── 맥북 (프로젝트 파일, 개발 환경)
  ├── 미니PC (Nextcloud, 백업)
  └── 외부 웹 (사방넷, 쿠팡, 체크스토리)
```

---

## 9. 일정 요약

| Phase | 기간 | 공수 | 선행 조건 |
|-------|------|------|----------|
| **0: 보안+정리** | 1일 | 3h | 지호님 승인 |
| **1: 배포+텔레그램** | 1일 | 4h | Phase 0 완료 |
| **2: 핵심 3개** | 3일 | 8h | Phase 1 완료 |
| **3: 확장 3개** | 1주 | 12h | Phase 2 완료 |
| **합계** | **~2주** | **~27h** | |

---

## 10. 비용

| 항목 | 금액 |
|------|------|
| OpenClaw 소프트웨어 | 0원 (오픈소스) |
| AI 모델 (ChatGPT 5.4) | 기존 Pro $200/월 내 |
| 서버 추가 | 0원 (Oracle Free Tier 내) |
| **월 추가 비용** | **0원** |
| 세팅 기회비용 (1회) | ~27h × 시급 2.5만 = ~67만원 |
| **BEP** | **주 3시간 절감 시 ~9주** |

---

## 11. 리스크 및 대응

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| OpenClaw CVE 신규 발생 | 높음 | 월 1회 버전 체크, 48h 내 패치 |
| 사방넷 브라우저 자동화 차단 | 중간 | User-Agent/속도 제어, 차단 시 수동 fallback |
| Flora 서버 리소스 부족 | 중간 | Oracle Free Tier 2 OCPU/12GB — 모니터링 후 판단 |
| clawdbot 코드 서명 에러 | 낮음 | OpenClaw 자체를 서버에서 직접 실행하므로 clawdbot 불필요 |
| 1인 오픈소스 유지보수 중단 | 낮음 | 재단 이관 완료 + OpenAI 후원 |

---

## 12. 검증 원칙

1. **각 Phase 완료 기준을 통과해야 다음 단계 진행**
2. **검증 실패 시 해당 Phase에서 멈추고 원인 분석**
3. **Phase 2 완료 후 2주간 일일 사용 로그 기록** → "방치되지 않았는가" 체크
4. **Phase 3 완료 후 월간 사용 리포트** → ROI 실측

---

## 13. 다음 단계

- [ ] 지호님: 이 PRD 승인
- [ ] Phase 0 착수: 보안 하드닝 + legacy room-router 중지
- [ ] 완료 후 Phase 1 진행

---

---

## 14. 전문가 검토 보강 사항

### 14.1 보안 강화 (보안자문 검토, 5개 항목 추가)

기존 11항목에 아래 5개 추가 → **총 16항목 보안 체크리스트**:

```
[ ] 12. 업데이트 바이너리 서명 검증 (sha256sum 대조)
[ ] 13. 게이트웨이 토큰 Keychain 격리 (환경변수 노출 방지)
[ ] 14. legacy room-router 중지 후 토큰 소거 (메모리 잔류 방지)
[ ] 15. 세션 산출물 디렉터리 chmod 700 (파일 권한 제한)
[ ] 16. Tailscale ACL 최소 노드 허용 (tag:pressco21-admin → tag:flora-server:18789)
```

**CVE 대응 강화**:
- CVE-2026-25253 (1-click RCE): Nginx deep link 경로 차단 + 세션 Tailscale NodeID 바인딩
- CVE-2026-41296 (sandbox TOCTOU): allowlist 절대경로 + `/tmp` exec 거부
- 사방넷 자격증명: `.secrets.env`에서 로드, 세션 파일 실행 후 삭제

**감사 로그 3레이어 체계**:

| 레이어 | 내용 | 보존 | 알림 |
|--------|------|------|------|
| 명령 실행 | WHAT was run | 90일 | - |
| 접근 거부 | WHAT was blocked | 180일 | **즉시 텔레그램 알림** |
| 세션 경계 | WHO and WHEN | 365일 | - |

거부(deny) 이벤트 발생 시 n8n 웹훅 → 텔레그램 보안 알림 자동 발송.

---

### 14.2 서버 인프라 설계 (서버운영 전문가 검토)

**운영 방식: systemd 서비스 (Docker/pm2 대비 최적)**

```ini
# /etc/systemd/system/openclaw.service
[Unit]
Description=OpenClaw v2026 AI Agent
After=network.target docker.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/openclaw-workspace
ExecStart=/home/ubuntu/.npm-global/bin/openclaw
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Flora 서버 리소스 여유 분석**:

| 항목 | 현재 사용 | OpenClaw 추가 | 잔여 | 판정 |
|------|----------|--------------|------|------|
| 메모리 | 2.9GB (6컨테이너) | +200~300MB (idle) | ~8GB | 충분 |
| 메모리 (Playwright) | - | +150~300MB/탭 | ~7GB | 탭 2개 이하 |
| 디스크 | 35GB | +1GB | ~157GB | 충분 |
| CPU | ~0.14% | 낮음 (Playwright 시 급등) | 2 OCPU | 주의 필요 |

**Playwright ARM 호환**: Oracle ARM(aarch64)에서 공식 지원. 동시 탭 2개 이하 제한.

**헬스체크 watchdog**:
```bash
# crontab: */5 * * * *
systemctl is-active --quiet openclaw || systemctl restart openclaw
```

**로그 로테이션**: journald 500MB 상한 + 7일 보존.

---

### 14.3 현장 운영 시나리오 보강 (COO 검토)

**빠진 시나리오 추가 — 직원별 체감 효과**:

| 직원 | 시나리오 | 현재 | OpenClaw 후 |
|------|---------|------|------------|
| **이재혁 과장** | "레지너스 화이트 재고 몇 개?" | PC → 사방넷 로그인 → 조회 (2분) | 텔레그램 한 줄 (5초) |
| **장준혁 사장님** | 출고 현황 요약 | 직접 확인 or 이재혁에게 물음 | 매일 오전 자동 푸시 |
| **서향자 실장** | 납기 임박 주문 | 수기 확인, 가끔 놓침 | 자동 알림 |

**온보딩 순서**:
1. 이재혁 과장 (파일럿) → 2. 장준혁 사장님 → 3. 나머지 (성공 사례 후 자연 확산)

**현실 체크 — "만들어놓고 안 쓸 확률 높다" (COO 솔직 의견)**:
- 대응: Phase 2 초기에는 **푸시 알림 위주** (능동형)로 시작
- 질의형(수동형)은 이재혁 과장 파일럿 검증 후 확대
- 첫 2주 안에 체감 못 하면 방치되므로, **"가장 귀찮은 반복 업무"부터 자동화**

**Phase 2 시나리오 재분류**:

| 유형 | 시나리오 | 대상 | 우선순위 |
|------|---------|------|---------|
| **푸시(능동)** | 서버 장애 알림 | 지호님 | Phase 2-1 |
| **푸시(능동)** | 출고 현황 자동 요약 | 사장님 | Phase 3-1 |
| **푸시(능동)** | 납기 임박 알림 | 서향자 실장 | Phase 3-2 |
| **질의(수동)** | 재고 즉답 | 이재혁 과장 | Phase 2-3 |
| **질의(수동)** | 매출 조회 | 원장님 | Phase 3-3 |
| **질의(수동)** | 경쟁사 가격 | 지호님 | Phase 3-4 |

---

## 15. 최종 일정 (전문가 검토 반영)

| Phase | 기간 | 공수 | 핵심 산출물 |
|-------|------|------|-----------|
| **0: 보안+정리** | 1일 | 3h | 16항목 하드닝 완료 + legacy 정리 |
| **1: 배포+텔레그램** | 1일 | 4h | 플로라 대화 가능 + sandbox 검증 |
| **2: 핵심 (푸시+질의)** | 3일 | 8h | 서버 모니터링 + NocoDB 조회 + 사방넷 브라우저 |
| **3: 확장 (직원+야간)** | 1주 | 12h | 이재혁 파일럿 + 사장님 푸시 + 야간 자율운영 |
| **합계** | **~2주** | **~27h** | |

---

*작성: 팀미팅 (한지훈 CSO, 최민석 CTO, 김도현 COO, 박서연 CFO)*
*전문가 검토: 보안자문, 서버운영(server-ops), 현장운영(COO)*
*승인 대기: 장지호 팀장*
