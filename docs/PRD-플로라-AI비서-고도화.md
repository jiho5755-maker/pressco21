# PRD: 플로라(Flora) AI 비서 고도화 v1.0

> 작성일: 2026-03-26 | 상태: Phase A+B 완료, Phase C 대기
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
- Primary: `openai-codex/gpt-5.4` (ChatGPT Pro $200)
- Fallback 1: `openai-codex/gpt-5.4-mini`
- Fallback 2: `anthropic/claude-sonnet-4-6`

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

## 5. Phase C — 생태계 확장

### C1. 직원별 AI 비서

**봇 구성 계획:**
| 봇 이름 | 대상 | 핵심 기능 | 권한 |
|---------|------|----------|------|
| 플로라 🌸 | 대표 (지호) | 전체 | 최대 (READ/WRITE 전체) |
| 루나 🌙 | 물류/CS팀 | CS분류, 발송추적, 재고 | 주문 READ, 고객PII 마스킹 |
| 아이비 🌿 | 디자인팀 | 상세페이지, 영상기획 | 클래스/콘텐츠 READ만 |
| 로즈 🌹 | 영업/마케팅 | 고객관리, 가격분석 | 클래스/매출요약 READ |

**기술 구현:**
- BotFather에서 봇 3개 추가 생성
- `openclaw agents add <팀명>` 으로 별도 에이전트 생성
- 각 에이전트에 맞는 SOUL.md + TOOLS.md + 권한 설정
- API: 구독이 아닌 **OpenAI API 종량제** 사용 (rate limit 회피)
- 모델: 일상 질의는 `gpt-5.4-mini`, 분석은 `gpt-5.4` (모델 계층화)

**데이터 접근 매트릭스 (Phase C 전 확정 필수):**
```
             | 주문  | 정산  | 수수료 | 고객PII | 클래스 | 매출  |
대표(플로라)  | RW   | RW   | RW    | RW     | RW    | RW   |
물류(루나)    | R    | DENY | DENY  | R(마스킹)| R    | DENY |
디자인(아이비) | DENY | DENY | DENY  | DENY   | R     | DENY |
영업(로즈)    | DENY | DENY | DENY  | DENY   | R     | R(요약)|
```

### C2. 10개 전문 서브에이전트 활성화
- Codex로 설계한 워크포스를 OpenClaw 스킬/서브에이전트로 연결
- 순차 실행 (동시 실행 시 토큰 폭발 방지)
- 서브에이전트는 `gpt-5.4-mini` 사용 (비용 최적화)

### C3. 자동 정산/매출 리포트
- WF-SETTLE(비활성) + NocoDB + 플로라 → 주간/월간 자동 분석
- 세무사 확인 후 활성화

### C4. 메이크샵 관리 자동화
- Playwright로 메이크샵 어드민 접속
- 상품 등록/수정, 주문 확인, 재고 체크
- 로그인 정보는 서버 환경변수로만 관리

### C5. 대시보드 (선택)
- 서버에서 API 제공 → 웹 프론트엔드에서 조회
- 플로라 대화 이력, 처리 건수, KPI

---

## 6. 리스크 매트릭스

| # | 리스크 | 심각도 | 확률 | 대응방안 |
|---|--------|--------|------|----------|
| R1 | Oracle Free Tier 한계 | H | 높음 | 모니터링 + Phase C 시 스케일아웃 검토 (Hetzner €3.99) |
| R2 | Codex Pro 토큰 제한 | H | 높음 | 모델 계층화 (mini 70%+), API 종량제 분리, 일일 버짓 설정 |
| R3 | SSH 보안 (서버→맥북) | H | 중간 | 전용 계정, 명령 화이트리스트, Tailscale ACL |
| R4 | n8n/OpenClaw 역할 충돌 | M | 높음 | **원칙: n8n=WRITE, OpenClaw=READ+판단** |
| R5 | 맥북 꺼짐 의존성 | H | 높음 | 핵심 기능은 서버 단독, 맥북 OFF시 graceful degradation |
| R6 | 직원 봇 확장 비용 | M | 높음 | API 종량제 + mini 모델 + 월 $100 상한 시작 |
| R7 | OAuth 토큰 만료 | M | 중간 | 인증 자동 동기화(6시간), n8n에서만 OAuth 관리 |
| R8 | 데이터 프라이버시 | H | 중간 | RBAC, PII 마스킹, 수수료 비공개 준수, 퇴사자 즉시 회수 |

---

## 7. 비용 시뮬레이션

### 현재 (2026-03-26)
| 항목 | 월 비용 |
|------|--------|
| ChatGPT Pro | $200 |
| Claude (확인 필요) | $100~200 |
| 서버 (Oracle Free) | $0 |
| **합계** | **$300~400** |

### Phase A~B 완료 후
| 항목 | 월 비용 |
|------|--------|
| 기존 구독 | $300~400 |
| API 추가 (브리핑/리포트) | $5~15 |
| **합계** | **$305~415** (거의 무변동) |

### Phase C 완료 후 (직원 봇 4대)
| 전략 | 월 비용 | 연 비용 |
|------|--------|--------|
| 보수적 (mini 위주) | $330~350 | ~480만원 |
| 중간 (혼합) | $480~550 | ~760만원 |
| 공격적 (5.4 위주) | $600~825 | ~1,140만원 |

**CFO 권고**: 보수적 전략(mini 70%+)으로 시작, 실 사용량 보고 조정

---

## 8. 아키텍처 원칙

### 역할 분리 (절대 원칙)
```
n8n  = "정해진 일을 정해진 시간에 반복" (Scheduled Automation)
       → cron 반복, 웹훅 수신, 데이터 파이프라인, NocoDB WRITE

플로라 = "판단이 필요한 일을 요청 시 수행" (AI-Driven Orchestration)
       → 자연어 질의, 분석/요약, 초안 작성, n8n 트리거(웹훅 호출)
       → NocoDB READ 직접, WRITE는 반드시 n8n 경유
```

### 보안 원칙
1. **외부 발송 전 반드시 텔레그램 승인** (이메일, SNS, 공개 게시)
2. **NocoDB WRITE는 n8n만** (데이터 경합 방지)
3. **수수료율 비공개** (직원 봇에서 절대 노출 금지)
4. **고객 PII 마스킹** (직원 봇에서 전화번호/주소 가리기)
5. **OAuth는 n8n에서만 관리** (토큰 관리 단일화)
6. **위험 명령 금지** (rm -rf, sudo, git push --force)

### 비용 원칙
1. **일상 질의 70%+는 mini 모델** (비용 50~70% 절감)
2. **직원 봇은 API 종량제** (구독 rate limit 회피)
3. **월 API 예산 상한 설정** (OpenAI 대시보드)
4. **토큰 사용량 NocoDB 로깅** (월말 분석)

---

## 9. 실행 로드맵

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

### Phase C (이번 달~)
```
C-001: SSH 보안 강화 (전용 계정 + 명령 화이트리스트)
C-002: 데이터 접근 매트릭스 확정 + RBAC 구현
C-003: PII 마스킹 레이어 구현
C-004: OpenAI API 종량제 키 발급 + spending limit
C-005: 루나(물류) 봇 파일럿 (직원 1명)
C-006: 2주 파일럿 검증 → 아이비/로즈 순차 확장
C-007: 10개 서브에이전트 스킬 변환
C-008: 자동 정산 활성화 (세무사 확인 후)
```

---

## 10. 성공 지표 (KPI)

| 지표 | Phase A | Phase B | Phase C |
|------|---------|---------|---------|
| 플로라 일일 사용 횟수 | 5회+ | 15회+ | 30회+ (전체) |
| 아침 브리핑 발송률 | 95%+ | 95%+ | 95%+ |
| CS 1차 응답 시간 | - | 30분→10분 | 5분 |
| 월 API 비용 | <$10 | <$50 | <$150 |
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
openclaw models                # 모델 상태
openclaw cron list             # cron 목록
```

### NocoDB API
```bash
curl -s -H "xc-token: {TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{projectId}/{tableId}?limit=10"
```
