# PRD: 하네스 종합 고도화 — AI 자율운영 생태계 구축

> **프로젝트명**: PRESSCO21 Claude Code 하네스 + 인프라 종합 고도화
> **작성일**: 2026-04-04
> **버전**: 1.0
> **근거**: 3관점 진단(시니어 개발자/AI 전문가/하네스 엔지니어) + 커뮤니티 벤치마크
> **최종 목표**: 에이전트 자율운영 생태계 (L5) — AI끼리 협업·회의·개선 제안

---

## 1. 프로젝트 개요

### 1.1 배경

PRESSCO21은 비전공자 대표가 Claude Code를 활용하여 다음 자산을 구축했다:
- 에이전트 49개 (C-Suite 8 + 글로벌 7 + 프로젝트 34)
- 스킬 6개 (makeshop-developer SDK급 포함)
- 훅 2개 (텔레그램 알림)
- 메모리 17토픽 (79줄 인덱스)
- 서버 3대 (본진/플로라/금고)
- n8n 워크플로우 20+개

이 자산은 커뮤니티 상위 1% 수준의 정교함을 보이나, **"많이 만들었지만 유기적으로 돌아가지 않는"** 단계에 머물러 있다.

### 1.2 핵심 진단

| 현상 | 원인 | 점수 |
|------|------|------|
| 매 턴 ~20,000 토큰 고정 소비 | 에이전트 49개 description 전부 로드 | 토큰 효율 40/100 |
| 위험 명령 무방비 | 훅 2개(알림만), PreToolUse 가드 없음 | 안전망 30/100 |
| 에이전트 각자 독립 동작 | 파이프라인/체인 미정의 | 협업 20/100 |
| CLAUDE.md 194줄 → 절반 무시 가능 | 공식 문서: "길면 절반 무시" | 지시준수 60/100 |
| 본진에 사이드 프로젝트 4개 잔류 | 역할 분리 미실행 | 인프라 30/100 |
| AI_SYNC.md 2,307줄 (93K 토큰) | Last Changes 무한 누적 | 협업 효율 20/100 |

### 1.3 목표

**Phase별 하네스 레벨 목표:**

| Phase | 목표 레벨 | 핵심 달성 기준 |
|-------|----------|--------------|
| Phase 0 | L4.5→L4.7 | 토큰 최적화 + 안전망 구축 |
| Phase 1 | L4.7→L4.9 | 에이전트 재설계 + MakeShop SDK 완성 |
| Phase 2 | L4.9→L5.0 | 인프라 확정 + 자율 회의 프로토콜 |
| Phase 3 | L5.0→L5.5 | AI 에이전트 자율운영 생태계 |

### 1.4 비용 원칙

- **고정 비용 (기본값, 변경 불가)**:
  - Claude Max Plan $100/월 — Claude Code + Opus 메인 개발
  - ChatGPT Pro $200/월 (1년 선결제) — Codex CLI + Flora AI + 웹 채팅
- **무료 인프라**: Oracle Free Tier만 사용, 유료 클라우드 절대 안 함
- **추가 API 비용 없음**: n8n 자동화에 외부 AI API 과금 도입 안 함. 기존 Gemini 무료 티어 활용
- Codex CLI는 ChatGPT Pro에 포함 → 적극 활용 중 (테스트/리팩토링/독립 프로젝트)
- 무료 도구(GitHub Actions 2000분, Uptime Robot 등)는 적극 도입

---

## 2. Phase 0 — 기초 체력 (토큰 최적화 + 안전망)

> **목표**: 현재 세팅의 비효율을 제거하고, 비전공자 안전망을 구축
> **기간**: 1~2일
> **난이도**: medium~high

### 2.1 CLAUDE.md 경량화

**현재**: 글로벌 194줄 + 워크스페이스 31줄 + 프로젝트 150줄 = ~375줄, ~29KB

**문제**: 공식 문서 "CLAUDE.md가 길면 Claude가 절반을 무시" + 에이전트 조직도 이중 관리

**작업:**

| # | 작업 | 현재 | 목표 |
|---|------|------|------|
| 0-1a | 에이전트 조직도 테이블 삭제 | CLAUDE.md에 ~60줄 | `.claude/agents/` 자체가 조직도 |
| 0-1b | 오케스트레이션 규칙(7~9항) → 별도 skill로 분리 | CLAUDE.md에 ~50줄 | `orchestration` skill로 분리 |
| 0-1c | 세션 체크포인트(9-1항) → Stop 훅 자동화로 대체 | CLAUDE.md에 ~30줄 | 훅이 자동 처리 |
| 0-1d | CLAUDE.md에 "조직도 → agents/ 참조, 오케스트레이션 → /orchestration 스킬" 한 줄씩 추가 | — | 2줄 |

**결과**: 194줄 → 80줄 이하, 지시 준수율 향상

### 2.2 AI_SYNC.md 자동 경량화

**현재**: 2,307줄 (Last Changes 1,697줄 = 73%)

**작업:**

| # | 작업 | 상세 |
|---|------|------|
| 0-2a | 현재 AI_SYNC.md에서 Last Changes 최근 5건만 남기고 아카이브 | `archive/ai-sync-history/2026-04-04.md`로 이동 |
| 0-2b | Known Risks에서 해결된 항목 삭제 | 활성 것만 유지 |
| 0-2c | Next Step 완료 항목 삭제 | 미완료만 유지 |
| 0-2d | CLAUDE.md에 규칙 추가: "AI_SYNC는 200줄 이하 유지" | Claude/Codex 모두 적용 |
| 0-2e | pre-commit 훅에 AI_SYNC 자동 트리밍 스크립트 추가 | 200줄 초과 시 ��동 아카이브 |

**결과**: 2,307줄 → 200줄 이하, 93K → ~3K 토큰

### 2.3 PreToolUse 가드 훅 (안전망)

**현재**: 훅 2��(Notification + Stop)만 존재, 위험 명령 무방비

**커뮤니티 벤치마크**: PreToolUse(Bash)가 1위 인기 패턴, 비전공자에게 사실상 필수

**작업:**

| # | 훅 | matcher | 동작 |
|---|-----|---------|------|
| 0-3a | **Bash 가드** | `Bash` | `rm -rf`, `git push --force`, `git reset --hard`, `docker rm`, `DROP TABLE` 차단 (exit code 2) |
| 0-3b | **MakeShop Edit 가드** | `Edit` | `makeshop-skin/` 파일 수정 시 `${` 패턴 감지 → 이스케이프 누락 경고 (exit code 2) |
| 0-3c | **에이전트 로깅** | `Agent` (PostToolUse) | 에이전트 호출 시 이름+시각+프로젝트를 `~/.claude/hooks/agent-usage.log`에 기록 |

**Bash 가드 스크립트 설계:**
```bash
#!/bin/bash
# ~/.claude/hooks/bash-guard.sh
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

DANGEROUS_PATTERNS=(
  'rm -rf /'
  'git push.*--force'
  'git reset --hard'
  'docker rm.*-f'
  'DROP TABLE'
  'DROP DATABASE'
  'truncate'
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qiE "$pattern"; then
    echo "BLOCKED: 위험 명령 감지 — $pattern"
    echo "대표님 확인 후 직접 실행하세요."
    exit 2
  fi
done

exit 0
```

**MakeShop Edit 가드 스크립트 설계:**
```bash
#!/bin/bash
# ~/.claude/hooks/makeshop-edit-guard.sh
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // ""')

# makeshop-skin/ 파일만 체크
if echo "$FILE" | grep -q "makeshop-skin/"; then
  # 이스케이프 안 된 ${...} 패턴 감지
  if echo "$NEW_STRING" | grep -qP '(?<!\\)\$\{'; then
    echo "BLOCKED: MakeShop 파일에 이스케이프 안 된 \${} 발견"
    echo "반드시 \\\${variable} 형태로 이스케이프하세요."
    exit 2
  fi
fi

exit 0
```

### 2.4 텔레그램 로그 로테이션

**현재**: `telegram-notify.log` 2.4MB, 무한 증가

**작업:**
- `notify-telegram.sh`에 로그 로테이션 추가: 7일 또는 1MB 초과 시 자동 아카이브
- 시작 부���에 `find "$LOG_FILE" -size +1M -exec mv {} "${LOG_FILE}.old" \;` 추가

### 2.5 skipDangerousModePermissionPrompt 제거

**현재**: `true` — 위험 작업도 확인 없이 실행

**작업**: `false`로 변경. PreToolUse 가드 훅이 정밀 제어를 대신함

---

## 3. Phase 1 — 에이전트 ���설계 + MakeShop SDK 완성

> **목표**: 에이전트 티어링으로 토큰 효율 2배, MakeShop 자동화 파이프라인 완성
> **기간**: 1주
> **난이도**: high

### 3.1 에이전트 티어링

**현재**: 49개 전부 동등하게 로드 → ~12,000토큰/턴

**설계:**

| 티어 | 정의 | 로딩 방식 | 개수 |
|------|------|----------|------|
| **T1 (핵심)** | 매 세션 반드시 필요 | ���상 활성 | 7개 |
| **T2 (주력)** | 자주 필요, 키워드로 자동 트리거 | description만 로드 | 10개 |
| **T3 (전문)** | C-Suite가 내부적으로 위임 | 직접 로드 안 함 | 32개 |

**T1 (항상 로드, 7개):**

| 에이전트 | 이유 | 모델 |
|---------|------|------|
| chief-technology-officer | 대부분의 개발 작업 라우팅 | opus |
| project-manager | 일일/주간 관리 | sonnet |
| makeshop-code-validator | 모든 MakeShop 수정 시 | haiku |
| makeshop-deployer | 배포 시 필수 | sonnet |
| n8n-workflow-builder | WF 개발 시 필수 | opus |
| n8n-server-ops | 서버 작업 시 필수 | sonnet |
| makeshop-api-expert | API 연동 시 필수 | sonnet |

**T2 (키워드 트리거, 10개):**

| 에이전트 | 트리거 키워드 | 모델 변경 |
|---------|-------------|----------|
| chief-strategy-officer | 전략, 사업방향, 팀미팅 | opus 유지 |
| chief-financial-officer | ��출, 마진, 세금, 정산 | opus 유지 |
| chief-marketing-officer | 마케팅, 광고, ROAS, 콘텐츠 | opus→sonnet |
| chief-operating-officer | CS, 물류, 재고, 프로세스 | sonnet 유지 |
| compliance-advisor | 법적, 계약, 약관 | opus→sonnet |
| staff-development-coach | 교육, 매뉴얼, 직원 | opus→sonnet |
| makeshop-page-architect | 신규 페이지 | sonnet 유지 |
| makeshop-skin-auditor | 브랜드 점검, 일관성 | sonnet 유지 |

**T3 (C-Suite 내부 위임, 32개):**
- 프로젝트 에이전트 33개 중 1개를 T1으로 승격 (없음), 나머지 전부
- 이 에이전트들은 직접 호출하지 않고, C-Suite��� 필요 시 내부적으로 spawn

**모델 재배분 결과:**

| 모델 | 현재 | 변경 후 |
|------|------|---------|
| opus | 27개 (56%) | 12개 (24%) |
| sonnet | 20개 (41%) | 29개 (59%) |
| haiku | 1개 (2%) | 8개 (16%) |

**토큰 절약 효과:**
- 현재: 49개 × ~250토큰/description = ~12,000토큰/턴
- 변경: 7개(T1) × 250 + 10개(T2) × 150(요약) = ~3,250토큰/턴
- **73% 감소**

### 3.2 기존 에이전트/스킬 ���도화

> 에이전트 품질 감사 에이전트 결과에 따라 상세 업���이트 (아래는 사전 진단)

**고도화 필요 (예상):**

| 에이전트 | 문제 | 개선 방향 |
|---------|------|----------|
| 프로젝트 에이전트 34개 전체 | description이 시스템 프롬프트에 과다 로드 | T3로 분류, C-Suite가 위임 |
| makeshop-code-reviewer | makeshop-code-validator와 역할 중복 | validator로 통합 |
| admin-doc-assistant | 사용 빈도 극히 낮음 예상 | 삭제 또는 skill로 전환 |
| chatbot-ops | F050 챗봇 운영 전용 — 범용성 낮음 | gas-backend-expert에 통합 |
| notion-db-designer | NocoDB로 전환 완료 — 불필요 | 삭제 |
| govt-support-specialist | 정부지원사업 WF 이미 자동화 — 역할 축소 | 비활성 또는 삭제 |
| shopping-automation-specialist | 역할이 CTO/makeshop-planning과 중복 | 통합 |

**스킬 고도화:**

| 스킬 | 문제 | 개선 |
|------|------|------|
| hwpx | 서버 컨테이너 삭제 예정, 로컬 스킬로 완전 대체 | 유지 (로컬 전용 명시) |
| pptx-ko-to-zh | 일회성 번역 용도, 범용성 낮음 | 삭제 고려 |
| gov-doc-writer | 정부지원���업 서류용 — 연간 2~3회 사��� | 유지 (사용 빈도 낮지만 필요시 가치 높음) |
| n8n-reference | 최종 수정 2026-03-27 — 비교적 최신 | n8n 버전 업데이트 시 갱신 필요 |
| makeshop-developer | 핵심 스킬, 지속 고도화 필요 | Phase 1에서 SDK 완성 |

### 3.3 MakeShop SDK 완성

**현재**: SKILL.md + references 41파일 + scripts 1개

**목표**: 자동화 스크립트 8개 + 참조 문서 35��� + 에이전트 파이프라인

| # | 작업 | 우선순위 |
|---|------|---------|
| 1-3a | `skin-backup.sh` — 배포 전 자동 git 스냅샷 | P1 |
| 1-3b | `bulk-deploy.sh` — 여러 파일 일괄 스킨 푸시 | P1 |
| 1-3c | `post-deploy-check.sh` — 배포 후 HTTP 200 + 스크린샷 비교 | P1 |
| 1-3d | `agent-workflow-specs.md` — architect→validator→deployer 파이프라인 정의 | P1 |
| 1-3e | `automation-recipes.md` — n8n 워크플로우 실전 템플릿 10+ | P2 |
| 1-3f | `api-integration-patterns.md` ��� API 조합 레시피 (주문+배송+SMS) | P2 |
| 1-3g | `troubleshooting-advanced.md` — 실전 오류 사례 30+ | P2 |
| 1-3h | `image-optimize.sh` — assets/ 이미지 자동 압�� | P3 |

**에이전트 파이프라인 (agent-workflow-specs.md):**

```
[신규 페이지 개발]
  page-architect(설계) → code-validator(검증) → deployer(배포) → skin-auditor(��사)
  
[기존 페이지 수정]
  code-validator(검증) → deployer(배포)
  
[상품 상세페이지 대량 생성]
  api-expert(데이터 수집) → page-architect(설계) → bulk-deploy → post-deploy-check
```

### 3.4 새 스킬: orchestration

CLAUDE.md에서 분리한 에이전트 오케스트레이션 규칙을 독립 스킬로:

```
~/.claude/skills/orchestration/
  SKILL.md — 라우팅 규칙, 에스컬레이션 체인, 팀미팅 프로토콜
  references/
    agent-tiers.md — T1/T2/T3 분류표
    meeting-protocol.md — 팀미팅 절차
    escalation-chain.md — 에스컬레이션 규칙
```

트리거: `/team-meeting`, `/daily-briefing`, `/weekly-report` 또는 "복합 요청(2개+ 도메인)" 감지 시

---

## 4. Phase 2 — 인프라 확정 + 자율 회의 기반

> **목표**: 서버 역할 분리 완성, AI 에이전트 자율 회의 프로토콜 구축
> **기간**: 2주
> **난이도**: high~max

### 4.1 서버 역할 분리

**현재 본진 9개 컨테이너 → 5개로 축소:**

| 작업 | 상세 |
|------|------|
| A1. hwpx-service 삭제 | 30일간 사용 0건, 로컬 스킬로 대체. RAM 106MB + 디스크 238MB 확보 |
| A3. flora-todo-mvp + postgres → 플로라 이전 | rsync로 전송 → 플로라에서 docker compose up |
| A4. n8n-staging + postgres → 플로라 이전 | 테스트 환경을 운영에서 분리 |
| A2. 본진 100GB Block Volume 추가 | Oracle Console → 마운트 → MinIO/백업 이전 |

**역할 분리 완성 후:**

| 서버 | 컨테이너 | 역할 |
|------|---------|------|
| **본진** | n8n, postgres, NocoDB, MinIO, Nginx | 돈 버는 것만 |
| **플로라** | Flora봇, n8n-staging, flora-todo, (hwpx→삭제) | AI + 테스트 |
| **금고** | Syncthing, FileBrowser | 백업 + 파일 |

### 4.2 자동 복구 스크립트

```bash
# /home/ubuntu/scripts/auto-heal.sh (cron: */5 * * * *)
# n8n, NocoDB, MinIO 헬스체크 → 다운 시 ���동 재시작 + 텔레그램 알림
```

### 4.3 n8n에서 AI 활용 — 기존 무료 자원만 사용

> 추가 API 비용 없음. 기존 Gemini 무료 티어 + ChatGPT Pro(Flora) 활용.

**현재 보유 AI 자원과 n8n 활용 방안:**

| 자원 | 비용 | n8n 활용 |
|------|------|---------|
| **Gemini API** (무료 티어) | $0 | F050 챗봇 이미 동작 중. 추가 WF에도 활용 가능 |
| **Flora (ChatGPT Pro)** | $200/월 (기본값) | 텔레그램 비서 → n8n 웹훅 트리거 가능 |
| **Codex CLI** | ChatGPT Pro 포함 | 코드 생성/리뷰/테스트 자동화 |
| **Claude Code** | $100/월 (기본값) | 메인 개발 + 에이전트 오케스트레이션 |

**n8n AI 자동화 (추가 비용 없는 것만):**

| 자동화 | 방법 | 효과 |
|--------|------|------|
| **리뷰 감성 분류** | n8n Code 노드 (키워드 기반 규칙) | CS 우선순위 자동 분류 |
| **품절 알림 자동화** | STOCK-ALERT WF (이미 구축) 활성화 | 재고 관리 자동화 |
| **고객 세그먼트 액션** | RFM-ACTION WF (이미 구축) 활성화 | 마케팅 자동화 |
| **Flora → n8n 연동** | Flora가 텔레그램 메시지 → n8n 웹훅 트리거 | 대표 한마디로 WF 실행 |
| **AI 상품 카피** | Claude Code에서 직접 생성 (API 비용 없음) | 상세페이지 자동화 |

### 4.4 에이전트 자율 회의 프로토콜 v1

**목표**: 복합 주제에 대해 C-Suite 에이전트들이 **자동으로** 관점별 분석을 수행하고 종합

**현재 `/team-meeting`**: 대표가 수동 호출 → CSO가 관련 C-Suite 선정 → 순차 분석

**개선 설계 — 자율 트리거:**

```
[트리거 조건]
1. 대표가 /team-meeting 호출 (수동)
2. 에이전트가 "이 주제는 2개+ 도메인에 걸친다" 판단 시 (자동 제안)
3. n8n WF가 이상 지표 감지 시 (자동 실행)

[회의 프로세스]
Phase 1: ��제 분석 → 관련 C-Suite 자동 선���
Phase 2: 각 C-Suite 병렬 분석 (Agent tool 병렬 호출)
Phase 3: CSO 종합 → 권고안 + 리스크 + 대안
Phase 4: 대표에게 최종 판단 요청

[자율 에스컬레이션]
- CFO가 마진 CRITICAL 감지 → CSO에 자동 에스컬레이션
- COO가 프로세스 이상 감지 → CTO에 자동 알림
- PM이 마감 임박 태스크 발견 → 대표에 자동 리마인드
```

### 4.5 하네스 자가 진단 시스템

**주간 자동 집계 (PostToolUse Agent 로그 기반):**

| 지표 | 수집 방법 | 활용 |
|------|----------|------|
| 에이전트별 호출 횟수 | agent-usage.log 파싱 | 안 쓰는 에이전트 식별 → 삭제/통합 |
| 모델별 사용량 | 에이전트 호출 시 모델 기록 | opus 과다 사용 감지 |
| 훅 발동 횟수 | 각 훅 로그 파싱 | 가드 효과 측정 |
| MEMORY 토픽별 크기 | wc -l 자동 집계 | 비대화 토픽 감지 |
| 세션 평균 토큰 소비 | 컨텍스트 사용률 로그 | 최적화 효과 측정 |

```
/harness-health 커���드 또는 주간 자동 리포트
→ 텔레���램으로 "하네스 주간 건강 리포트" 발송
```

---

## 5. Phase 3 — AI 자율운영 생태계 (L5)

> **목표**: 에이전트끼리 협업·회의·개선 제안하는 생태계
> **기간**: 1~3개월
> **난이도**: max

### 5.1 Flora ↔ n8n ↔ Claude Code 양방향 루프

```
[이상 감지 루프]
n8n WF 헬스 모니터 → 이상 감지
  → 텔레그램 경보 (Flora 봇이 수신)
  → Flora가 상황 분석 (ChatGPT)
  → Flora가 대표에게 "이런 문제인 것 같아요. Claude Code에서 고칠까요?" 제안
  → 대표 승인
  → Claude Code 자동 실행 (SSH → 서버 디버��)
  → 결과 보고 → Flora가 대표에게 요약

[데이터 분석 루프]
n8n 주간 데이터 수집 → NocoDB 저장
  → AI 분석 (VOC/매출/품절/트렌드)
  → C-Suite 자동 회의 (CSO 주도)
  → 권고안 → 대표 텔레그램으로 전달
```

### 5.2 에이전트 자율 개선 제안

**월간 하네스 자체 진단 → 개선 ��안:**

```
[매월 1일 자동 실행]
1. 에이전트 호출 통계 분석
   → "지난달 한 번도 안 쓴 에이전트: X, Y, Z"
   → "가장 많이 쓴 에이전트: CTO(45회), PM(32회)"

2. 토큰 효율 분석
   ��� "평균 세션 토큰: 15,000 (목표 10,000)"
   → "MEMORY 가장 비대한 토픽: makeshop-reference (218줄)"

3. 자동 개선 제안
   → "에이전트 Z는 3개월간 사용 0회. 삭제 또는 통합 제안"
   → "makeshop-reference 토픽이 200줄 초과. 분리 필요"
   → "pre-save-check.sh가 지난달 12회 차단. 효과적"

4. 대표에게 리포트 + 승인 요청
```

### 5.3 Codex CLI 자율 협업 강화

**현재**: AI_SYNC.md를 통한 수동 인수인계

**개선**: 자동 태스크 릴레이

```
[Claude Code 작업 완료]
→ AI_SYNC.md에 [CODEX] 태스크 자동 등���
→ Codex가 자동으로 픽업 (모드 A)
→ 테스트/리팩토링 완료
→ AI_SYNC.md 갱��� → Claude Code에 통보

[Codex 독립 작업 (모드 B)]
→ Claude Code가 [CODEX-LEAD] 태스크 등록
→ Codex가 기획~배포까지 독립 수행
→ 완료 후 AI_SYNC.md에 결과 기록
→ Claude Code가 다음 세션에서 인수인계
```

### 5.4 비전공자 "원클릭" 자동화 파이프라인

최종 목표는 대표가 **텔레그램 한 줄**로 모든 것을 지시할 수 있는 것:

| 대표 메시지 (텔레그램) | 실행 체인 | 결과 |
|----------------------|----------|------|
| "이번 주 매출 어때?" | Flora → n8n ��� NocoDB → CFO 분��� → 리포트 | 텔레그램 리포트 |
| "신상품 10개 올려줘" | Flora → Claude Code → MakeShop SDK 파이프라인 | 10개 페이지 자동 생성 |
| "리뷰 답변 해줘" | Flora → n8n → review API → AI → 답변 초안 | 승인 버튼 포함 |
| "서버 이상한데?" | Flora → n8n 로그 → Claude Code 디버깅 → 결과 | 자동 수정 + 보고 |
| "이번 달 프로모션 뭐 하지?" | Flora → CMO 자동 회의 → 제안 | 캠페인 기획안 |

---

## 6. 기존 에이전트/스킬 고도화 상세

> 에이전트 품질 감사 완료 (2026-04-04). 전체 점수 **7.3/10** — "건설 중 감안하면 우수"
> 삭제 2개, 모델 변경 3개, 콘텐츠 갱신 5개, 유지 39개

### 6.1 글로벌 에이전트 15개 진단

| 에이전트 | 현재 모델 | 수정일 | 판정 | 개선 |
|---------|----------|--------|------|------|
| chief-strategy-officer | opus | 최신 | ✅ 유지 | 자율 회의 프로토콜 추가 |
| chief-financial-officer | opus | 최신 | ✅ 유지 | NocoDB 데이터 직접 참조 추가 |
| chief-marketing-officer | opus | 최신 | 🔄 모델 변경 | opus→sonnet (분석은 sonnet 충분) |
| chief-operating-officer | sonnet | 최신 | ✅ 유지 | — |
| chief-technology-officer | opus | 최신 | ✅ 유지 | T1 에이전트 관리 역할 추가 |
| project-manager | sonnet | 최신 | ✅ 유지 | 하네스 자가 진단 통합 |
| compliance-advisor | opus | 최신 | 🔄 모델 변경 | opus→sonnet (법률 참조는 sonnet 충분) |
| staff-development-coach | opus | 최신 | 🔄 모델 변경 | opus→sonnet |
| makeshop-api-expert | sonnet | 최신 | ✅ 유지 | API 조합 패턴 추가 |
| makeshop-code-validator | haiku | 최신 | ✅ 유지 | pre-save-check 통합 강화 |
| makeshop-deployer | sonnet | 최신 | ✅ 유지 | bulk-deploy 스크립트 통합 |
| makeshop-page-architect | sonnet | 최신 | ✅ 유지 | 파이프라인 정의 추가 |
| makeshop-skin-auditor | sonnet | 최신 | ✅ 유지 | Lighthouse 통합 |
| n8n-workflow-builder | opus | 최신 | ✅ 유지 | OpenAI 노드 패턴 추가 |
| n8n-server-ops | sonnet | 최신 | ✅ 유지 | auto-heal 스크립트 통합 |

### 6.2 프로젝트 에이전트 34개 진단 (예상)

| 판정 | 에이전트 | 이유 |
|------|---------|------|
| ❌ 삭제 | notion-db-designer | NocoDB로 전환 완료, Notion 사용 안 함 |
| ❌ 삭제 | shopping-automation-specialist | CTO/makeshop-planning과 완전 중복 |
| ⚠️ 통합 | admin-doc-assistant | gov-doc-writer 스킬로 대체 가능 |
| ⚠️ 통합 | chatbot-ops | gas-backend-expert�� F050 운영 통합 |
| ⚠️ 통합 | makeshop-code-reviewer | makeshop-code-validator에 리뷰 기능 통합 |
| 🔄 모델변경 | 다수 opus 에이전트 | 20개 opus → 8~10개만 opus 유지 |
| ✅ 유지 | 나머지 ~25개 | 역할 고유, 품질 적정 |

### 6.3 스킬 고도화

| 스킬 | 판정 | 상세 |
|------|------|------|
| makeshop-developer | 🔄 SDK 완성 | Phase 1에서 스크립트 7개 + 문서 9개 추가 |
| n8n-reference | 🔄 갱신 | OpenAI 노드 패턴 + 최신 n8n 버전 반영 |
| hwpx | ✅ 유지 | 서버 컨테이너 삭제 후 "로컬 전용" 명시 |
| gov-doc-writer | ✅ 유지 | 연간 2~3회지만 필요시 가치 높음 |
| pptx-ko-to-zh | ❌ 삭제 고려 | 일회성, 범용성 낮음 |
| bulk-product-edit | 🔄 고도화 | MakeShop API 최신 패턴 반영 |

### 6.4 새로 추가할 스킬

| 스킬 | 용도 | 우선순위 |
|------|------|---------|
| **orchestration** | 에이전트 라우팅 + 팀미팅 + 에스컬레이션 | P1 (Phase 1) |
| **harness-health** | 하네스 자가 진단 + 주간 리포트 | P2 (Phase 2) |
| **deploy-to-server** | SSH 배포 자동화 (n8n WF + 스킨) | P2 (Phase 2) |

---

## 7. 유기적 통합 아키텍처

### 7.1 전체 생태계 흐름도

```
┌─────────────────────────────────────────────────────────┐
│                    대표 (입력 채널)                        │
│   텔레그램(Flora) │ Claude Code │ Codex CLI              │
└────────┬──────────┴──────┬──────┴��─────┬────────────────┘
         │                 │             │
    ┌────▼────┐      ┌────▼────┐   ┌───▼───┐
    │  Flora   │      │ Claude  │   │ Codex │
    │(ChatGPT) │◄────►│  Code   │◄──►│  CLI  │
    │ 비서/봇  │      │ 오케스트│   ��� 보조  │
    └────┬────┘      └────┬────┘   └───┬───┘
         │                 │             │
         │           ┌────▼────┐         │
         │           │ C-Suite │         │
         │           │ 에이전트 │         │
         │           │ 7+10+32 │         │
         │           └────┬────┘         │
         │                 │             │
    ┌────▼────────────────▼─────────────▼────┐
    │              n8n 워크플로우 엔진          │
    │  (20+ WF: 주문/리뷰/모니터링/자동화)      │
    └────┬──────────┬──────────┬─────────────┘
         │          │          │
    ┌────▼───┐ ┌───▼───┐ ┌───▼───┐
    │  본진   │ │ 플로라 │ │  금고  │
    │ (운영)  │ │(AI+QA)│ │(백업) │
    │ 5컨테이너│ │4컨테이너│ │Sync  │
    └────┬───┘ └───┬───┘ └───┬───┘
         │         │         │
    ┌────▼─────────▼─────────▼────┐
    │        NocoDB (데이터 허브)    ���
    │  Shop-BI │ Customer-OS │ FA  │
    └─────────────────────────────┘
```

### 7.2 데이터 흐름 (유기적 순환)

```
[매일 자동]
MakeShop API → n8n → NocoDB (주문/리뷰/회원 수집)
NocoDB → n8n → AI 분석 → 텔레그램 리포트

[이벤트 기반]
리뷰 등록 → n8n → AI 답변 초안 → 텔레그램 승인 → 자동 등록
품절 감지 → n8n → 텔레그램 알림 + 자동 진열 변경
주문 확인 → n8n → 알림톡 발송

[에이전트 기반]
대표 지시 → Claude Code → C-Suite 분석 → 실행 → 결과 보고
Flora 보고 → 대표 승인 → Claude Code 자동 실행
Codex 완료 → AI_SYNC → Claude Code 인수인계
```

---

## 8. 성공 지표

| 지표 | 현재 | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|------|------|---------|---------|---------|---------|
| 하네스 레�� | L4.5 | L4.7 | L4.9 | L5.0 | L5.5 |
| 세션 토큰 오버헤드 | ~20K | ~10K | ~5K | ~5K | ~5K |
| Hook 수 | 2 | 5 | 5 | 6 | 8 |
| 본진 컨테이너 | 9 | 9 | 5 | 5 | 5 |
| CLAUDE.md 크기 | 194줄 | 80줄 | 80줄 | 80줄 | 80줄 |
| AI_SYNC.md 크기 | 2,307줄 | 200줄 | 200줄 | 200줄 | 200줄 |
| MakeShop 스크립트 | 1 | 1 | 8 | 8 | 8 |
| 에이전트 자율 회의 | 수동만 | 수동만 | 수동+제안 | 자동 트리거 | 완전 자율 |
| "한 줄 지시" 자동화 | 0 | 0 | 3~5개 | 10+개 | 15+개 |

---

## 9. 리스크 및 완화

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| 에이전트 티어링 시 필요한 에이전트가 T3에 묻힘 | 중 | T2 키워드 트리거를 세밀하게 설정 + 2주간 모니터링 |
| CLAUDE.md 경량화로 기존 규칙 누락 | 중 | skill로 분리한 규칙이 정확히 트리거되는지 검증 |
| AI_SYNC 자동 트리밍으로 중요 정보 유실 | 중 | 아카이브 폴더에 전수 보관, 필요시 검색 가능 |
| 서버 이전 시 다운타임 | 높음 | 운영 시간 외 작업 + 롤백 계획 수립 |
| ChatGPT Pro API 접근 불가 시 | 중 | OpenAI API $5~10/월 별도 가입 (시나리오 B) |
| opus→sonnet 전환 시 품질 저하 | 낮음 | 전략적 판단이 필요한 C-Suite만 opus 유지 |

---

## 10. 일정

| Phase | 기간 | 핵심 산출물 |
|-------|------|-----------|
| **Phase 0** | 4/4~4/5 (1~2일) | CLAUDE.md 80줄, AI_SYNC 200줄, 훅 5개, 로그 로테이션 |
| **Phase 1** | 4/7~4/11 (1주) | 에이전트 T1/T2/T3, MakeShop 스크립트 8개, orchestration 스킬 |
| **Phase 2** | 4/14~4/25 (2주) | 서버 정리, AI 자동화 WF, 자율 회의 v1, 하네스 자가 진단 |
| **Phase 3** | 5월~ (진행형) | Flora 양방향 루프, 에이전트 자율 개선, 원클릭 자동화 |

---

> **v1.0 확정** (2026-04-04) — 에이전트 품질 감사 및 ChatGPT API 조사 결과 반영 완료.
> 다음 업데이트: Phase 0 실행 후 v1.1
