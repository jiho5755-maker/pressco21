# Claude Adapter Handoff → OMX (2026-04-21)

> runtime: claude
> 대상: `work/workspace/ai-team-pilot` worktree의 Codex/OMX 작업실
> 목적: Claude-side adapter 구현 결과를 OMX가 빠르게 따라잡고, 교차 검증 + 후속 작업을 진행할 수 있게 만드는 compact handoff

---

## 한 줄 요약

Claude 작업실에서 shared-kernel v1 계약을 기준으로 **SessionStart/Stop continuity + named-agent UX + 4개 plugin 구조**를 구현 완료했다. UserPromptSubmit 훅이 실동작 확인되었고, 9개 C-Suite 에이전트가 shared kernel 참조 패턴으로 전환되었다.

---

## 구현 완료 항목

### 1. Session Continuity Layer

| 구성요소 | 파일 | 동작 |
|----------|------|------|
| **SessionStart** | `~/.claude/hooks/session-start.sh` | `UserPromptSubmit` 훅 — `team/handoffs/latest.md`에서 summary/next_step/open_risks 추출 → Claude 컨텍스트에 자동 주입. 세션당 1회 debounce. 7일 초과 handoff 무시. |
| **SessionEnd** | `~/.claude/hooks/session-handoff.sh` | `Stop` 훅 (async) — handoff-contract-v1 YAML 스키마로 자동 기록. branch/commits/agents는 기계적 추출. summary/decision/learn_to_save는 placeholder로 남김. |
| **/save 강화** | `~/.claude/commands/save.md` | 기존 3단계 중 Step 3을 handoff-contract 형식으로 강화. Claude가 판단 필드(summary, decision, next_step, open_risks, learn_to_save)를 채워 `team/handoffs/latest.md`를 갱신. memory-spine-spec 세션 종료 5가지 판단 포함. |
| **/resume 신설** | `~/.claude/commands/resume.md` | 명시적 세션 복원. latest handoff + growth-log + MEMORY 로드 → founder-facing 요약 출력. |

### 2. Named-Agent UX (9개 C-Suite)

모든 C-Suite 에이전트(`~/.claude/agents/`)에 아래 변경 적용:

- **하드코딩 회사 컨텍스트 제거** (매출 11.6억, 직원 8명, 전략적 목표 등)
- **동적 참조로 대체**:
  ```
  1. team/knowledge-base/{에이전트폴더}/growth-log.md
  2. team/handoffs/latest.md
  3. team/meeting-logs/ 최신
  4. company-profile.md (단일 진실 소스)
  ```
- **Canonical roster 참조** 추가: `agents.v1.yaml` agent_id 명시
- **출력 표준** 추가: 판단 → 근거 → 리스크 → 다음 단계

적용된 9개:
| Claude agent file | canonical agent_id |
|---|---|
| chief-strategy-officer.md | han-jihoon-cso |
| chief-financial-officer.md | park-seoyeon-cfo |
| chief-technology-officer.md | choi-minseok-cto |
| chief-marketing-officer.md | jung-yuna-cmo |
| chief-operating-officer.md | kim-dohyun-coo |
| project-manager.md | yoon-haneul-pm |
| compliance-advisor.md | cho-hyunwoo-legal |
| hr-coach.md | kang-yerin-hr |
| vibe-coder-buddy.md | yoo-junho-paircoder |

### 3. Plugin 구조 (4개 스킬 유닛)

| 스킬 | 경로 | 역할 |
|------|------|------|
| `pressco21-session-continuity` | `.claude/skills/pressco21-session-continuity/` | 세션 연속성 전체 (hooks + /save + /resume) |
| `pressco21-core-personas` | `.claude/skills/pressco21-core-personas/` | 에이전트 컨텍스트 로딩 + 출력 표준 + roster 매핑 |
| `pressco21-team-meeting` | `.claude/skills/pressco21-team-meeting/` | 팀 미팅 UX + canonical roster 정렬 |
| `pressco21-memory-sync` | `.claude/skills/pressco21-memory-sync/` | Memory spine 7-Layer 읽기/쓰기 규칙 + 승격 경로 |

### 4. settings.json 변경

```json
"UserPromptSubmit": [{
  "hooks": [{
    "type": "command",
    "command": "bash ~/.claude/hooks/session-start.sh"
  }]
}],
"Stop": [
  // 기존 3개(notify-telegram, levelup-auto) + 신규 1개:
  { "command": "bash ~/.claude/hooks/session-handoff.sh", "async": true }
]
```

### 5. SuperClaude / Claudekit 흡수 결과

로컬 클론 위치: `_reference/` (gitignored)

| 출처 | 흡수한 패턴 | Claude 구현체 |
|------|------------|-------------|
| Claudekit | `UserPromptSubmit` 훅 (세션 시작 컨텍스트 주입) | session-start.sh |
| Claudekit | `create-checkpoint` (Stop 훅) | session-handoff.sh |
| Claudekit | `SubagentStop` 존재 확인 | 후속 검토 대상 |
| SuperClaude | `/save` + `/load` 영속 패턴 | /save 강화 + /resume 신설 |
| SuperClaude | KNOWLEDGE.md 누적 패턴 | growth-log + playbook 구조 참조 |
| Guardrails | auto-commit 파일단위 스냅샷 | 참조만 (적용 안 함) |

흡수하지 않은 것: `sc:` 네임스페이스, MCP 자동설정, TypeScript guardrails, Serena MCP 의존, 프레임워크 전체 설치.

---

## Cross-Runtime Review 결과

| 항목 | 판정 |
|------|------|
| A. Canonical roster 일치 | **Pass** — 9개 전부 agents.v1.yaml agent_id 참조 |
| B. Shared memory 규칙 | **Pass** — save only if it changes future behavior 원칙 적용 |
| C. Handoff contract 일치 | **Pass** — changed_artifacts + verification 필드 추가 완료 |
| D. Founder-facing UX | **Pass** — 사람 이름 우선, runtime 설명 최소화 |
| E. Runtime mechanic 격리 | **Pass** — OMX 참조 0건 |
| F. Verification quality | **Pass** — UserPromptSubmit 실동작 확인 |
| G. Ownership boundary | **Pass** — shared-kernel 무변경 |

---

## 검증 증거

1. **UserPromptSubmit 실동작**: 세션 시작 시 `[이전 세션 (방금 전, claude)] 담당: Explore | 요약: ...` 자동 주입 확인
2. **에이전트 전수 검증**: 9개 전부 `context=1, output=1, hardcoded=0`
3. **스킬 즉시 등록**: 5개 스킬이 Claude Code 스킬 목록에 바로 표시
4. **settings.json JSON 문법**: jq 파싱 통과
5. **기존 훅 호환**: bash-guard, makeshop-edit-guard, agent-logger, notify-telegram, levelup-auto 설정 유지

---

## Drift 감사 결과 (migration Phase 2)

| 문서 | 현재 에이전트 수 표현 | 수정 필요 여부 |
|------|---------------------|-------------|
| CLAUDE.md | 25개 | Yes — canonical source 참조 추가 |
| HARNESS.md | C-Suite 8 | Yes — canonical source 참조 추가 |
| team/boardroom.md | 9명 + 26명 | Yes — Core 6 중심 재서술 |
| agents.v1.yaml | 10명 | Source of truth |
| ~/.claude/agents/ | 35개 파일 | OK — C-Suite 9개에 표준 적용됨 |

---

## OMX가 해야 할 일

### 즉시 (이번 세션)
1. **이 handoff를 읽고 shared-kernel 계약과 Claude adapter 구현의 정합성 확인**
2. **OMX-side adapter에서 같은 canonical roster(agents.v1.yaml)를 참조하는지 확인**
3. **OMX 출력이 founder-facing 이름(한지훈님, 박서연님 등)을 사용하는지 확인**

### 후속 (다음 세션 이후)
4. **Drift 해소 Phase 3**: `team/README.md`, `docs/에이전트-팀-사용가이드.md`를 Core 6 중심으로 재서술
5. **Drift 해소 Phase 4**: `CLAUDE.md`, `HARNESS.md`에 canonical source 참조 추가
6. **OMX company-agent output wrapper**: meeting/verification output이 canonical roster 표현을 따르는지
7. **Memory spine 템플릿 인스턴스화**: core 에이전트 4~6명의 playbook/failures 초기 파일 생성

---

## Open Risks

1. Stop 훅이 async → handoff 기록 완료 보장 안 됨 (핵심은 /save에서 처리)
2. 에이전트에서 제거된 하드코딩 데이터(CFO 구글시트 ID, Legal 사업자등록번호)가 company-profile.md에 있는지 확인 필요
3. Shared kernel 파일이 ai-team-pilot worktree에만 존재 → main merge 전까지 경로 주의

---

## Learn to Save

1. `UserPromptSubmit` 훅이 Claude Code 세션 연속성의 핵심 메커니즘 — Claudekit 패턴 흡수 성공
2. 에이전트 정의에 회사 컨텍스트 하드코딩은 drift 원인 — company-profile.md 단일 참조가 정답
3. Plugin 구조는 4개 스킬 유닛(continuity / personas / meeting / memory)으로 나누는 것이 자연스러움
