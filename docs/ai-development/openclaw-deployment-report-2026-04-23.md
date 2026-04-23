# OpenClaw 도입 배포 보고서

> 작성일: 2026-04-23
> 작성자: 최민석 CTO + 보안자문 + 서버운영
> PRD: `docs/prd-drafts/prd-2026-04-23-openclaw-integration.md` v2.0

## 실행 결과 요약

| Phase | 상태 | 소요 시간 |
|-------|------|----------|
| Phase 0: 보안 하드닝 | 완료 | ~1h |
| Phase 1: 텔레그램 연동 | 완료 | ~30m |
| Phase 2: 핵심 스킬 3개 | 완료 | ~1h |
| Phase 3: 확장 3개 | 완료 | ~30m |

## Phase 0: 보안 하드닝 (16항목)

### PRD 대비 변경사항
- PRD 가정: "OpenClaw 미가동" → 실제: 4/7부터 16일째 실행 중이었음
- 업데이트 범위: v2026.3.13 → v2026.4.21 (PRD 목표 v2026.4.5+ 초과 달성)

### 적용 내역
1. OpenClaw v2026.3.13 → v2026.4.21 업데이트
2. Gateway 토큰 48자 → 64자 교체
3. Gateway bind: loopback (127.0.0.1만)
4. Port 18789 iptables DROP (IPv4 + IPv6)
5. tools.exec.security: "full" (allowlist 기반)
6. tools.fs.workspaceOnly: true
7. agents.defaults.sandbox.mode: "non-main"
8. logging.redactSensitive: "tools"
9. DM policy: allowlist (지호님 + 원장님)
10. Group policy: allowlist
11. browser.evaluateEnabled: false
12. browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: false
13. gateway.controlUi.enabled: false
14. 파일 권한 chmod 700/600 적용
15. systemd 서비스에서 Gemini API key 제거 → drop-in env로 이동
16. Legacy room-router 중지 + 미사용 LaunchAgent 4개 정리

### 보안 감사 결과
- Phase 0 전: 0 critical, 2 warn
- Phase 0 후: 0 critical, 1 warn (multi-user heuristic — 정상 운영 경고)
- 보안자문 독립 검증: 16/16 PASS

## Phase 1: 텔레그램 연동

### 발견 및 해결
- 텔레그램 409 충돌: 맥북 room-router와 서버 OpenClaw 동시 polling → room-router 중지로 해결
- AI 모델 인증 만료: OpenAI/Anthropic OAuth 토큰 16일간 미갱신 → Gemini 2.5 Flash로 전환
- SOUL.md 불일치: 서버에 영문 기본 템플릿 → 로컬 한국어 맞춤 버전으로 동기화
- 누락 스킬: order-lookup 서버에 없음 → 동기화

### 현재 모델 설정
- Primary: google/gemini-2.5-flash (Gemini API key 환경변수)
- Fallback: openai-codex/gpt-5.4 (OAuth 재인증 필요)
- 향후: 지호님이 서버에서 `openclaw models auth login --provider openai-codex` 실행 시 GPT-5.4 복구 가능

## Phase 2: 핵심 스킬 3개

### server-monitor
- 동작 확인: Flora Docker 6/6 컨테이너 상태 조회 성공
- 헬스체크: n8n=200, NocoDB=302 확인
- 주의: Docker 그룹 이슈 → systemd daemon-reexec로 해결

### data-query
- NocoDB API 연결: weekly_snapshot 조회 성공 (매출 15,169,080원 / 84건)
- n8n API 연결: 준비 완료 (N8N_API_KEY 환경변수 설정)
- 강사공간 조회: 테이블 ID 확인 완료

### sabangnet-browser
- Playwright v1.58.2 + Chromium ARM: 정상 동작 확인
- 스크린샷 생성: n8n.pressco21.com 캡처 성공
- 사방넷 실제 로그인: 자격증명 설정 후 테스트 필요

## Phase 3: 확장 3개

### night-watchdog
- watchdog.sh: 30분 cron 설정 완료
- 수동 테스트: n8n=200, nocodb=302 정상 기록
- 장애 시 자동 복구 + 텔레그램 에스컬레이션 로직 포함
- morning-briefing.sh: 08:00 KST cron 설정 완료

### ceo-assistant
- 원장님 전용 스킬 생성
- Chat ID 기반 톤 구분 (SOUL.md에서 상속)
- IT 용어 금지 규칙 적용

### competitor-watch
- 스킬 틀 생성 완료
- 실제 크롤링: 체크스토리 사이트 구조 분석 후 스크립트 작성 필요
- 주간 cron: 향후 추가

## 스킬 목록 (총 15개)

| # | 스킬 | 출처 | 상태 |
|---|------|------|------|
| 1 | cs-triage | 기존 | 운영 중 |
| 2 | daily-report | 기존 | 운영 중 |
| 3 | email-sender | 기존 | 운영 중 |
| 4 | gdrive-access | 기존 | 운영 중 |
| 5 | law-lookup | 기존 | 운영 중 |
| 6 | order-lookup | 동기화 | 운영 중 |
| 7 | price-margin | 기존 | 운영 중 |
| 8 | task-register | 기존 | 운영 중 |
| 9 | token-logger | 기존 | 운영 중 |
| 10 | server-monitor | 신규 | 검증 완료 |
| 11 | data-query | 신규 | 검증 완료 |
| 12 | sabangnet-browser | 신규 | 틀 완성 |
| 13 | night-watchdog | 신규 | 검증 완료 |
| 14 | ceo-assistant | 신규 | 생성 완료 |
| 15 | competitor-watch | 신규 | 틀 완성 |

## 후속 필요 작업

1. **OpenAI OAuth 재인증**: 지호님이 서버에서 `openclaw models auth login --provider openai-codex` 실행
2. **사방넷 자격증명**: .secrets.env에 SABANGNET_ID/PW 추가 후 브라우저 자동화 테스트
3. **경쟁사 크롤링**: 체크스토리 사이트 구조 분석 + 스크립트 작성
4. **원장님 온보딩**: 텔레그램 DM 실 테스트 + 피드백 수집
5. **2주 사용 로그**: Phase 완료 후 일일 사용량 기록 → ROI 실측

## 인프라 현황

| 항목 | 값 |
|------|-----|
| OpenClaw 버전 | v2026.4.21 |
| 모델 | Gemini 2.5 Flash (primary) |
| 서비스 | systemd user service (restart=always) |
| 게이트웨이 | 127.0.0.1:18789 (loopback, 64자 토큰) |
| 텔레그램 | @pressco21_openclaw_bot (DM allowlist) |
| 스킬 | 15개 (기존 9 + 신규 6) |
| Cron | watchdog(30분) + morning-briefing(08:00 KST) |
| Playwright | v1.58.2 + Chromium ARM |
| 추가 비용 | 0원 |
