# Claude Adapter Complete Handoff (2026-04-21)

> runtime: claude
> 대상: Codex/OMX 작업실
> 상태: Claude-side adapter v1 구현 완료

---

## 한 줄 요약

Claude 작업실에서 shared-kernel v1 계약 기반으로 **세션 연속성 + 사람 이름 중심 UX + 4개 plugin 구조 + memory write policy**를 전부 구현했다. UserPromptSubmit 훅 실동작 확인됨. shared-kernel은 건드리지 않았고 변경 제안 3건을 별도 proposals/에 분리했다.

---

## 전체 구현물

### 1. 세션 연속성 (Session Continuity)

**SessionStart** — `~/.claude/hooks/session-start.sh`
- `UserPromptSubmit` 훅으로 매 세션 첫 프롬프트 시 자동 실행
- `team/handoffs/latest.md`에서 summary, next_step, open_risks 추출
- agent_id를 한글 이름으로 변환하여 출력 (runtime role 노출 안 함)
- 실제 출력 예시: `[방금 전] 최민석님(CTO): 세션 연속성 훅을 구현했습니다 → 이어서: plugin 구조 정리`
- 세션당 1회 debounce, 7일 초과 handoff 무시
- **실동작 확인됨** (2번째 세션에서 자동 주입 성공)

**SessionEnd** — `~/.claude/hooks/session-handoff.sh`
- `Stop` 훅 (async)으로 세션 종료 시 자동 실행
- handoff-contract-v1 YAML 스키마 전체 필드 생성 (changed_artifacts, verification 포함)
- branch, 최근 커밋 3개, 사용 에이전트를 기계적으로 추출
- 판단 필드(summary, decision, learn_to_save)는 placeholder → `/save`에서 채움
- agent_id → 한글 이름 매핑 포함

**/save 강화** — `~/.claude/commands/save.md`
- 기존 3단계(git → MEMORY → 인수인계) + 신규 Step 4(Memory Spine 승격 판단)
- Step 3: handoff-contract 형식으로 Claude가 판단 필드를 채워 latest.md 갱신
- Step 4: learn_to_save 후보를 5가지 질문으로 승격 경로 판단

| 질문 | → 저장 위치 |
|------|-----------|
| 에이전트 행동 기준이 바뀌는가? | growth-log.md |
| 반복 가능한 대응 패턴인가? | playbook.md |
| 다시 하면 안 되는 실패인가? | failures.md |
| 대표 선호가 확인되었는가? | founder-preferences.md |
| 다음 세션이 바로 이어받아야 하는가? | handoffs/latest.md |

**/resume 신설** — `~/.claude/commands/resume.md`
- 명시적 세션 복원 (UserPromptSubmit 자동 주입보다 상세)
- latest handoff + growth-log 최근 항목 + MEMORY 블로커 로드
- founder-facing 요약 출력 (누가 / 무엇을 / 이어서 / 주의)

**settings.json 변경** — `~/.claude/settings.json`
- `UserPromptSubmit` 이벤트 추가 → session-start.sh
- `Stop` 이벤트에 session-handoff.sh 추가 (기존 3개 훅 유지)

---

### 2. 에이전트 (Named-Agent UX)

**9개 C-Suite 에이전트 전부 업데이트** (`~/.claude/agents/`)

| agent file | canonical agent_id | 변경 |
|---|---|---|
| chief-strategy-officer.md | han-jihoon-cso | 하드코딩 회사 컨텍스트 제거 → 동적 참조 |
| chief-financial-officer.md | park-seoyeon-cfo | 〃 |
| chief-technology-officer.md | choi-minseok-cto | 〃 |
| chief-marketing-officer.md | jung-yuna-cmo | 〃 |
| chief-operating-officer.md | kim-dohyun-coo | 〃 |
| project-manager.md | yoon-haneul-pm | 〃 |
| compliance-advisor.md | cho-hyunwoo-legal | 〃 |
| hr-coach.md | kang-yerin-hr | 〃 |
| vibe-coder-buddy.md | yoo-junho-paircoder | 〃 |

**공통 적용 패턴**:
```
## 세션 컨텍스트 로딩
1. team/knowledge-base/{폴더}/growth-log.md — 최근 학습
2. team/handoffs/latest.md — 직전 인수인계
3. team/meeting-logs/ 최신 — 최근 팀 결정
4. company-profile.md — 단일 진실 소스

## 출력 표준
판단 → 근거 → 리스크 → 다음 단계
```

전수 검증: 9개 전부 `context=1, output=1, hardcoded=0`

---

### 3. Plugin 구조 (4개 스킬 유닛 + 1 메타)

| 스킬 | 경로 | 역할 |
|------|------|------|
| **pressco21-claude-ecosystem** | `.claude/skills/pressco21-claude-ecosystem/` | 메타 스킬 — 4개 유닛 연결 + 전체 파일 맵 |
| **pressco21-session-continuity** | `.claude/skills/pressco21-session-continuity/` | 세션 연속성 (hooks + /save + /resume) |
| **pressco21-core-personas** | `.claude/skills/pressco21-core-personas/` | 에이전트 컨텍스트 로딩 + wording 규칙 |
| **pressco21-team-meeting** | `.claude/skills/pressco21-team-meeting/` | 팀 미팅 UX + canonical roster 정렬 |
| **pressco21-memory-sync** | `.claude/skills/pressco21-memory-sync/` | Memory spine 7-Layer 읽기/쓰기 + 승격 경로 |

5개 전부 Claude Code 스킬 목록에 즉시 등록 확인됨.

---

### 4. Founder-Facing Wording 규칙

`.claude/skills/pressco21-core-personas/founder-facing-wording-rules.md`에 확정.

6가지 규칙:
1. **사람 이름이 먼저** — "한지훈님 관점에서 보면" (O) / "CSO 에이전트 결과" (X)
2. **도구/모델 설명 최소화** — "분석 결과" (O) / "Claude Code에서 Opus로 분석한 결과" (X)
3. **Core 6 이름 매핑** — agent_id → 한글 display name 표
4. **응답 도입부 패턴** — 단독 의견, 팀 미팅 종합, 위임 제안, 에스컬레이션 각각 패턴
5. **handoff/continuity 메시지** — 세션 시작/저장/복원/회의 결과 각각 패턴
6. **절대 금지** — agent_id 노출, "에이전트/서브에이전트/spawn" 용어, runtime role 이름, "Claude가/Codex가" 도구 주어

---

### 5. Memory Write Policy

`/save` Step 4에서 memory-spine-spec 7-Layer 승격 경로와 명시적 연결 완료.

write 허용 경로:
| 경로 | 트리거 |
|------|--------|
| `team/handoffs/latest.md` | Stop 훅 + /save |
| `team/knowledge-base/*/growth-log.md` | Stop 훅 (levelup-auto) + /save 승격 |
| `team/knowledge-base/*/playbook.md` | /save 승격 (반복 패턴 발견 시) |
| `team/knowledge-base/*/failures.md` | /save 승격 (실패 기록 시) |
| `team/knowledge-base/shared/founder-preferences.md` | /save 승격 (대표 선호 확인 시) |
| `team/meeting-logs/*.md` | /team-meeting |

원칙: **Save only if it changes future behavior.**

---

### 6. Shared-Kernel 변경 제안 (3건)

`docs/ai-native-upgrade/shared-agent-kernel/proposals/claude-side-kernel-proposals-2026-04-21.md`에 분리.

| # | 제안 | 긴급도 |
|---|------|--------|
| 1 | agents.v1.yaml에 `claude_agent_file` 필드 추가 | 낮음 |
| 2 | handoff-contract에 `owner_display` 필드 추가 | 낮음 |
| 3 | memory-spine-spec 경로를 "권장" → "확정"으로 승격 | 중간 |

**shared-kernel 직접 수정: 0건.**

---

## Cross-Runtime Review 결과

| 항목 | 판정 |
|------|------|
| A. Canonical roster 일치 | Pass |
| B. Shared memory 규칙 | Pass |
| C. Handoff contract 일치 | Pass |
| D. Founder-facing UX | Pass |
| E. Runtime mechanic 격리 | Pass |
| F. Verification quality | Pass |
| G. Ownership boundary | Pass |

---

## OMX가 이어서 할 일

### 즉시
1. 이 handoff를 읽고 Claude adapter 구현이 shared-kernel 계약과 정합하는지 확인
2. OMX-side output이 같은 canonical roster 이름(한지훈님, 박서연님 등)을 쓰는지 확인
3. `proposals/` 3건 검토 → 채택/보류 판단

### 후속
4. Drift 해소 Phase 3: `team/README.md`, `docs/에이전트-팀-사용가이드.md`를 Core 6 중심 재서술
5. Drift 해소 Phase 4: `CLAUDE.md`, `HARNESS.md`에 canonical source 참조 추가
6. Core 에이전트 4~6명의 playbook/failures 초기 파일 생성 (templates/ 기반)
7. OMX company-agent output wrapper가 founder-facing wording 규칙을 따르는지 점검

---

## Learn to Save

1. **UserPromptSubmit 훅이 세션 연속성의 핵심** — Claudekit에서 흡수한 패턴, 실동작 확인
2. **에이전트 정의에 회사 컨텍스트 하드코딩은 drift의 원인** — company-profile.md 단일 참조가 정답
3. **사람 이름 중심 UX는 훅 레벨에서 매핑해야 일관성 유지** — bash 연관배열로 agent_id → 한글 이름 변환
