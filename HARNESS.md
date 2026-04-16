<!-- HARNESS-META: v3.2 | 2026-03-29 | Claude Code -->
# PRESSCO21 AI Harness Governance

> Level 5 하네스 거버넌스 문서. 모든 하네스 구성요소의 역할, 피드백 루프, 변경 프로토콜을 정의한다.
> 최종 업데이트: 2026-03-29

---

## 1. 컴포넌트 맵

### 설정 계층 (Configuration Hierarchy)

```
~/.claude/CLAUDE.md                  ← 글로벌 설정 (최우선)
  @import rules/agent-routing.md     ← 에이전트 라우팅
  @import pressco21-infra.md         ← 인프라 레퍼런스
  @import rules/n8n-reference.md     ← n8n 워크플로우 규칙
    |
workspace/CLAUDE.md                  ← 워크스페이스 설정
    |
pressco21/CLAUDE.md                  ← 프로젝트 설정 (에이전트 조직도)
    |
pressco21 worktrees + Git hooks        ← 프로젝트별 작업 격리/충돌 방지
```

**규칙**: 충돌 시 더 엄격한 규칙을 우선한다.

### 에이전트 시스템

```
대표 (사람)
  └─ C-Suite 8명 (글로벌 에이전트)
       ├─ CSO: 전략참모실 (2개 프로젝트 에이전트)
       ├─ CFO: 재무본부 (3개)
       ├─ CMO: 마케팅본부 (6개)
       ├─ COO: 운영본부 (4개)
       ├─ CTO: 기술본부 (10개)
       ├─ PM: 프로젝트관리실 (3개)
       ├─ compliance-advisor
       └─ staff-development-coach
  └─ Claude Code: 오케스트레이터 + 기술 구현
  └─ Codex CLI: 테스트/리팩토링/독립 프로젝트
```

**에스컬레이션**: 프로젝트 에이전트 -> C-Suite -> CSO -> 대표 -> (필요시) CEO(어머니)

### 인프라 레이어

```
[로컬 조종석] macOS ← Claude Code / Codex CLI
    |
[공개 실행면] Oracle Cloud (158.180.77.201)
    ├─ n8n 운영 (5678) ← 14개 워크플로우
    ├─ n8n Staging (5679) ← 테스트/개발
    ├─ NocoDB ← 데이터 허브
    └─ MinIO ← 이미지/정적 자산
    |
[사설 제어면] OpenClaw (158.179.193.173)
    └─ 플로라 AI비서 ← 텔레그램 봇
    |
[백업/동기화] 미니서버 ← Syncthing/File Browser
```

---

## 2. 피드백 루프

### 자동 피드백 (6개)

| 루프 | 트리거 | 동작 |
|------|--------|------|
| Stop Hook 4단계 검증 | Claude Code 세션 종료 | ROADMAP/MEMORY/git 상태 점검 -> Telegram 체크리스트 |
| pre-commit hook | `git commit` | 메이크샵 `${var}` 이스케이프 검증, CSS 전역 셀렉터 경고 |
| commit-msg hook | `git commit` | 커밋 메시지 형식 검증 (한국어 필수) |
| pre-push hook | `git push` | 인증키/환경 파일 변경 방지 |
| deploy.sh health check | 워크플로우 배포 후 | `active` 상태 확인 |
| deploy.sh canary | `--canary` 플래그 | staging -> 확인 -> 운영 순차 배포 |

### 수동 피드백 (4개)

| 루프 | 주기 | 담당 |
|------|------|------|
| worktree 정리 | 필요 시 | 완료된 task worktree remove + branch delete |
| MEMORY.md 정리 | 월 1회 | Claude Code |
| HARNESS.md 리뷰 | 분기 | 대표 + CTO |
| company-profile.md 동기화 | 변경 시 | 대표 |

---

## 3. 에스컬레이션 체인

```
Level 1: 프로젝트 에이전트 (자율 판단)
    ↓ 도메인 밖 또는 기준 불명확
Level 2: C-Suite (도메인 전문가)
    ↓ 복합 도메인 또는 전략 판단
Level 3: CSO (종합 조율)
    ↓ 최종 결정
Level 4: 대표 (승인/거부)
    ↓ (비상시)
Level 5: CEO(어머니) (최종 결정권)
```

**금전 관련**: 반드시 CFO 경유
**복합 요청 (2개+ 도메인)**: CSO 주도, 관련 C-Suite 병렬 호출

---

## 4. 검증 프로토콜

### 배포 전 체크리스트

- [ ] `--dry-run`으로 PUT body 확인
- [ ] `--canary`로 staging 먼저 배포
- [ ] health check 통과 확인
- [ ] 배포 브랜치/커밋과 검증 결과를 session log 또는 운영 문서에 기록

### 코드 품질 체크리스트

- [ ] pre-commit hook 통과 (메이크샵 `${var}` 없음)
- [ ] commit-msg hook 통과 (형식 + 한국어)
- [ ] CSS 전역 셀렉터 경고 해소
- [ ] IIFE 패턴 사용 (JS 격리)

### 하네스 변경 체크리스트

- [ ] HARNESS-META 버전/날짜 업데이트
- [ ] `[harness]` prefix로 커밋
- [ ] 수정 권한 확인 (아래 §5 참조)
- [ ] HARNESS.md 파일 인벤토리 반영

---

## 5. 파일 인벤토리

### 글로벌 설정

| 파일 | 역할 | 수정 권한 |
|------|------|----------|
| `~/.claude/CLAUDE.md` | 글로벌 설정 (언어, 규칙, 에이전트) | 대표만 |
| `~/.claude/settings.json` | Hook 설정, 환경 | 대표만 |
| `~/.claude/hooks/notify-telegram.sh` | Telegram 알림 + 4단계 검증 | 대표 + CTO |
| `~/.claude/hooks/.env` | Telegram 봇 토큰/Chat ID | 대표만 |
| `~/.claude/rules/agent-routing.md` | 에이전트 라우팅 규칙 | 대표만 |
| `~/.claude/pressco21-infra.md` | 인프라 레퍼런스 | 대표만 |
| `~/.claude/rules/n8n-reference.md` | n8n 워크플로우 규칙 | 대표만 |

### 워크스페이스

| 파일 | 역할 | 수정 권한 |
|------|------|----------|
| `workspace/CLAUDE.md` | 워크스페이스 설정 | 대표만 |
| `workspace/AI-OPERATIONS.md` | 인프라 운영 기준 | 대표만 |

### 프로젝트 (pressco21/)

| 파일 | 역할 | 수정 권한 |
|------|------|----------|
| `pressco21/CLAUDE.md` | 프로젝트 설정 + 에이전트 조직도 | 대표 + Claude Code |
| `pressco21-worktrees/*` + `work/<project>/<task>` | 프로젝트별 격리 작업공간 | Claude Code + Codex |
| `pressco21/HARNESS.md` | 거버넌스 문서 (이 파일) | 대표 + CTO |
| `pressco21/company-profile.md` | 회사 프로파일 (단일 진실 소스) | 대표 |

### 도구

| 파일 | 역할 | 수정 권한 |
|------|------|----------|
| `pressco21/_tools/git-hooks/pre-commit` | 메이크샵 이스케이프 검증 | 대표 + CTO |
| `pressco21/_tools/git-hooks/commit-msg` | 커밋 메시지 형식 검증 | 대표 + CTO |
| `pressco21/_tools/git-hooks/pre-push` | 인증키/환경 파일 변경 방지 | 대표 + CTO |
| `pressco21/_tools/install-hooks.sh` | Git hook 설치 스크립트 | 대표 + CTO |
| `pressco21/n8n-automation/_tools/deploy.sh` | n8n 워크플로우 배포 | 대표 + CTO |

### 메모리

| 파일 | 역할 | 수정 권한 |
|------|------|----------|
| `~/.claude/projects/.../memory/MEMORY.md` | 세션 간 메모리 인덱스 | Claude Code |
| `~/.claude/projects/.../memory/*.md` | 토픽별 상세 메모리 | Claude Code |

---

## 6. 유지보수 일정

| 주기 | 작업 | 담당 | 도구 |
|------|------|------|------|
| **필요 시** | 완료 worktree 정리 | 대표 | `git worktree remove ...` |
| **월 1회** | MEMORY.md 정리 (불필요 항목 제거) | Claude Code | 자동 |
| **월 1회** | company-profile.md 동기화 확인 | 대표 | NocoDB/WF 대조 |
| **분기** | HARNESS.md 리뷰 + 버전 업데이트 | 대표 + CTO | 수동 |
| **분기** | Git hook 규칙 재검토 | CTO | 수동 |
| **반기** | 에이전트 조직도 재평가 | CSO | `/team-meeting` |

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-03-29 | v3.2 | 최초 생성 (Level 4 -> 5 업그레이드) |
