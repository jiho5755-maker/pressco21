# PRESSCO21 하네스 엔지니어링 종합 점검 + Phase 3 로드맵 재설계

## 배경
나는 8명 직원의 꽃 공예 회사(PRESSCO21, 연매출 11.6억) 대표 겸 경영기획 팀장이다.
6개 빈 부서(마케팅/CS/재무/IT/영업/기획)를 AI 에이전트로 채우는 "하네스 고도화" 프로젝트를 진행 중이다.
Claude Code(Opus 4.6 1M)를 메인 개발 도구로 사용하며, 바이브 코딩으로 모든 시스템을 구축하고 있다.
비전공자(입문자)이므로 기술 판단은 AI에 의존하되, 사업 판단은 내가 한다.

## 현재 하네스 구성 (이미 구축된 것)

### 파일 구조
- `~/.claude/CLAUDE.md` (86줄): 글로벌 설정 — 언어, 기술스택, API 규칙, effort 안내, 에이전트팀, 완료규칙
- `~/.claude/settings.json`: 환경변수(AGENT_TEAMS, OPUS_MODEL), 훅 5개, statusLine, 플러그인 3개
- `~/.claude/pressco21-infra.md`: 서버 3대(본진/플로라/금고) + n8n Credential + WF ID + NocoDB 테이블
- `~/.claude/rules/agent-routing.md`: 에이전트 라우팅 테이블 + 팀미팅/커맨드 프로토콜
- `~/.claude/rules/n8n-reference.md`: n8n 작업 참조 규칙
- `pressco21/CLAUDE.md` (200줄+): 프로젝트 CLAUDE — AI핸드오프, 파트너클래스, Codex 협업, 스킨 정본, 에이전트 조직도(25개 3-Tier)

### 훅 (5개)
1. `bash-guard.sh` — PreToolUse(Bash): rm -rf, force push, docker rm 차단
2. `makeshop-edit-guard.sh` — PreToolUse(Edit): ${} 이스케이프 누락 차단
3. `agent-logger.sh` — PostToolUse(Agent): 에이전트 호출 기록
4. `notify-telegram.sh` — Notification + Stop: 세션 알림

### 스킬 (주요)
- `makeshop-developer/` (42파일): 메이크샵 D4 개발 전문 스킬 + 가상태그 레퍼런스
- `n8n-reference/` (6파일): n8n 노드 인덱스, IO, 변환, 트리거 가이드
- `orchestration/`: 복합 태스크 실행 패턴
- `hwpx/`, `gov-doc-writer.md`, `bulk-product-edit.md` 등

### 에이전트 (25개, 3-Tier)
- **T1 상시활성 7개**: CTO(opus), PM(sonnet), 메이크샵전문가(opus), 코드검수관(haiku), 배포관리자(haiku), n8n빌더(sonnet), 서버관리자(sonnet)
- **T2 키워드트리거 8개**: CSO, CFO, CMO, COO, 콘텐츠기획관, 신상품기획관, 파트너클래스설계사, 법무자문 (모두 opus)
- **T3 위임전용 10개**: 광고운영, SEO, 보안, CS, 재고물류, HR, 해외소싱(sonnet) + 회계, 스킨감사, QA(haiku)

### 메모리 시스템
- `MEMORY.md` + 20개 토픽 파일로 프로젝트별 지식 관리
- 자동 인덱싱, 200줄 제한

### 업무 자동화 인프라
- Flora AI 비서 (ChatGPT Pro, 텔레그램 봇)
- 텔레그램 미니앱 v3.1 (React+Vite+shadcn, mini.pressco21.com)
  - 태스크 보드, 출고 리스트, 캘린더, 파일 첨부, 체크리스트
  - Flora 자연어 파싱 → 미니앱 태스크 자동 등록
- n8n WF 20개+, NocoDB 테이블 10개+
- 서버 3대 역할 분리 완료

## PRD v2 Phase 진행 상황

| Phase | 계획 기간 | 실제 | 상태 |
|-------|----------|------|------|
| Phase 0 (기초체력) | 4/5~4/6 | 4/5 완료 | ✅ CLAUDE.md 80줄, 훅 5개 |
| Phase 1 (에이전트재설계) | 4/7~4/13 | 4/5 완료 | ✅ 49→25 (계획28과 다름) |
| Phase 1.5 (업무관리) | 4/14~4/18 | 4/5 완료 | ✅ 브리핑+점심체크인+assignee |
| Phase 2 (인프라+회의) | 4/21~5/2 | 4/5~4/6 완료 | ✅ 주간회의WF+이재혁WF+서버이전 |
| Phase 2.5 (미니앱) | 5/5~5/16 | 4/5~4/7 진행중 | 🔶 v3.1 배포, Flora 연동 완료 |
| Phase 3 (L5 자율운영) | 5월~ | 미착수 | ⬜ |

**핵심 사실**: 원래 5월까지 걸릴 Phase 0~2.5를 3일(4/5~4/7)만에 모두 구현했다.
그러나 실제 "운영 검증"은 아직이다:
- 직원 Chat ID 미확보 (이재혁 파일럿 대기)
- ONBOARD-SEQ/RFM-ACTION 이메일 WF 긴급 비활성화 (미검증 발송)
- Flora 태스크 파싱 품질 미검증

## 발견된 문제점 & 개선 기회

### 1. 하네스 파일 비대화 재발 우려
- `pressco21/CLAUDE.md`가 이미 200줄+ (에이전트 조직도 테이블이 다시 비대)
- `MEMORY.md`가 200줄 한도에 근접 (토픽 20개)
- 완료 규칙("ROADMAP.md 갱신 → 태스크 완료 → MEMORY 갱신 → git push")이 매번 4단계 → 오버헤드

### 2. 에이전트 활용도 불균형
- agent-usage.log 분석 필요: 실제로 25개 중 몇 개나 호출되는지
- T3 에이전트 10개가 정말 필요한지 의문
- opus 10개 할당이 비용 대비 효과적인지

### 3. 운영 vs 개발 갭
- 시스템은 빠르게 구축했지만 "사람이 쓰는" 단계가 지연
- Flora 태스크 등록 → 미니앱 연동이 되어도, 직원이 안 쓰면 무의미
- 자동 이메일/알림톡 WF가 검증 없이 활성화되어 긴급 OFF 사태

### 4. 컨텍스트 관리
- CLAUDE.md + pressco21-infra.md + rules/ + MEMORY.md가 매 세션 로드 → 토큰 소모
- 1M 컨텍스트지만 효율적 활용 전략 부재
- 세션 간 컨텍스트 전달이 MEMORY에만 의존

### 5. skipDangerousModePermissionPrompt가 true
- PRD에서 false로 변경하기로 했으나 아직 true
- 훅이 일부 대체하지만 완전하지 않음

## 점검 요청 사항

### A. 하네스 아키텍처 감사
1. 현재 파일 구조(CLAUDE.md, settings.json, rules/, skills/, hooks/)가 최적인가?
2. Claude Code 최신 기능(울트라플랜, Agent Teams, worktree isolation, skills v2 등)을 충분히 활용하고 있는가?
3. 토큰 효율성: 매 세션 자동 로드되는 컨텍스트 총량은 적절한가?
4. 훅 5개의 커버리지는 충분한가? 추가해야 할 훅은?

### B. 에이전트 조직 재평가
1. 25개 에이전트가 과다한가? 실제 사용 패턴 기반 최적 수는?
2. 3-Tier 전략은 효과적인가? 더 나은 로딩 전략은?
3. opus/sonnet/haiku 모델 배분이 적절한가?
4. Agent Teams 기능을 활용한 멀티에이전트 협업 개선 방안은?

### C. Phase 3 (L5 자율운영) 재설계
1. PRD의 "자율 트리거" 개념이 현실적인가? Claude Code 세션 기반 특성상 상시 모니터링이 가능한가?
2. n8n + Flora가 이미 상시 모니터링을 하고 있으니, Claude Code 에이전트의 "자율" 범위를 재정의해야 하지 않나?
3. 직원 온보딩이 선행되어야 하는 항목과 독립적으로 진행 가능한 항목 구분
4. 기획안 자동 생성 파이프라인의 현실적 구현 방안

### D. 바이브 코딩 효율 극대화
1. 비전공자가 Claude Code로 이 규모의 시스템을 운영할 때, 하네스가 해줘야 할 핵심 역할은?
2. "판단은 대표, 실행은 AI" 패턴에서 하네스가 보강해야 할 안전장치는?
3. 세션 간 컨텍스트 손실을 최소화하는 전략은?
4. Cursor + Claude Code + Codex CLI 3도구 시너지 극대화 방안은?

## 기대 산출물
1. **현재 하네스 아키텍처 진단서** — 강점/약점/개선 포인트
2. **에이전트 조직 최적화안** — 수량, 모델 배분, 로딩 전략
3. **Phase 3 재설계 로드맵** — 현실적 일정 + 선행조건 + 우선순위
4. **하네스 v5.0 설계안** — 파일 구조, 훅, 스킬, 메모리 개선
5. **바이브 코딩 안전망 체크리스트** — 비전공자 대표를 위한 가드레일