---
name: save
description: 세션 체크포인트 — 작업 저장 + 인수인계 + 다음 세션 준비
user_invocable: true
---

# /save — 세션 체크포인트

사용자가 `/save`, "핸드오프", "오늘 여기까지", "세션 종료", "컴퓨터 끌게"처럼
끊고 가려는 의도를 보이면 아래 단계를 순서대로 실행한다. 생략 금지.

핵심: 로컬 `output/` 기록은 Git에서 무시되므로 handoff 완료로 보지 않는다.
반드시 `team/handoffs/**` 추적 파일을 만들고 commit/push까지 확인해야 한다.

## Step 1: Git 저장

1. `git status`로 미커밋 변경 확인
2. 변경이 있으면:
   - 의미 있는 커밋 메시지로 commit
   - `git push`
3. 변경이 없으면: "커밋할 변경 없음" 확인 후 다음 단계

## Step 2: MEMORY 갱신

이번 세션에서 **미래 세션에 영향을 주는 변경**이 있었는지 판단한다:
- 새로운 시스템/인프라 구축 → 해당 토픽 파일 갱신
- 중요한 결정/방침 변경 → 토픽 파일 갱신
- 단순 코드 수정/버그 수정 → MEMORY 갱신 불필요 (git 이력으로 충분)

갱신이 필요하면 MEMORY.md 인덱스 + 토픽 파일 업데이트.
갱신이 불필요하면 스킵하고 명시: "MEMORY 갱신 불필요 (이유: ___)"

## Step 3: Handoff 기록 + 인수인계 요약

이번 세션의 handoff를 현재 cwd의 scope에 맞는 위치에 기록한다.
Stop 훅이 기계적 골격을 먼저 생성하지만, `/save` 실행 시 Claude가 판단 필드를 채워 덮어쓴다.
가능하면 공용 helper를 사용한다:

```bash
bash _tools/pressco21-handoff.sh "<summary>" "<next step>" --risk "<risk>" --label "<task-label>"
```

이 helper는 `output/codex-handoffs` 로컬 기록과 `team/handoffs` Git 추적 기록을 함께 만들고,
기본적으로 handoff commit/push까지 수행한다.

**scope 결정 규칙:**
1. `git rev-parse --show-toplevel`로 현재 worktree root를 계산한다.
2. branch가 `work/<project>/<task>`이면 `team/handoffs/worktrees/<worktree-slot>/latest.md`를 1순위로 갱신한다.
3. 같은 내용을 `team/handoffs/branches/<safe-branch>/latest.md`, `team/handoffs/projects/<project>/latest.md`에도 갱신한다.
4. root `team/handoffs/latest.md`는 main 세션이거나 명시적으로 global promote가 필요할 때만 갱신한다.

**handoff-contract-v1 스키마 기준으로 아래 필드를 판단한다:**

1. `summary` — 창업자가 읽어도 바로 이해 가능한 1~3문장
2. `decision` — 이번 작업에서 확정한 기준이나 경계
3. `changed_artifacts` — 실제 바뀐 파일/문서/설정
4. `verification` — 무엇으로 확인했는지
5. `open_risks` — 다음 세션이 반드시 의식해야 할 미해결 위험
6. `next_step` — 다음 세션의 첫 행동 (한 문장)
7. `learn_to_save` — growth log / playbook / founder preference 승격 후보 (0~3개)

**기록 위치**:
- worktree 작업: `team/handoffs/worktrees/<worktree-slot>/latest.md`
- branch fallback: `team/handoffs/branches/<safe-branch>/latest.md`
- project fallback: `team/handoffs/projects/<project>/latest.md`
- main/global 작업: `team/handoffs/latest.md`

일반 worktree에서 `/save`할 때 root `team/handoffs/latest.md`를 덮어쓰지 않는다.

**동시에 사용자에게도 founder-facing 요약을 출력한다.**
context_type=handoff 기준. OMX 출력과 같은 섹션 이름을 사용한다.

```
## 저장 완료

### 요약
- {owner_display}이(가) 무엇을 했는가

### 확인
- 무엇으로 검증했는가

### 리스크
- 남은 위험

### 다음
- 다음에 무엇을 하면 되는가
```

**wording 규칙**:
- 사람 이름이 먼저 ("최민석님이 세션 연속성 훅을 구현했습니다")
- tool/runtime 설명 최소화
- 이모지는 사용하지 않는다

## Step 4: Memory Spine 승격 판단

learn_to_save 후보가 있으면 아래 5가지 질문으로 승격 여부를 판단한다.
**Save only if it changes future behavior.**

| 질문 | Yes이면 → 저장 위치 |
|------|---------------------|
| 어떤 에이전트의 행동 기준을 바꾸는가? | `team/knowledge-base/{에이전트}/growth-log.md` |
| 반복 가능한 대응 패턴인가? | `team/knowledge-base/{에이전트}/playbook.md` |
| 다시 하면 안 되는 실패인가? | `team/knowledge-base/{에이전트}/failures.md` |
| 대표의 선호/수용 방식이 확인되었는가? | `team/knowledge-base/shared/founder-preferences.md` |
| 다음 세션이 바로 이어받아야 하는가? | 현재 worktree scoped handoff (이미 Step 3에서 처리) |

**승격 실행 방법**: 해당 파일이 있으면 append, 없으면 `templates/` 폴더의 템플릿을 복사하여 초기화.
templates 위치: `docs/ai-native-upgrade/shared-agent-kernel/templates/`

**승격하지 않는 것**: 일회성 잡담, 원본 대화 전문, 감정만 있고 재사용성 없는 표현, 검증되지 않은 추정치.

## 사용 패턴

| 상황 | 사용법 |
|------|--------|
| 컨텍스트 압축 후 계속 | `/save` → `/compact` → 이어서 작업 |
| 주제 전환 전 저장 | `/save` → 새 주제로 대화 |
| 오늘 작업 종료 | `/save` → 세션 종료 |

세 가지 모두 동일한 `/save`를 사용한다. 인수인계 요약은 같은 세션이든 다음 세션이든 재개 시 유용하다.

## 주의사항

- ROADMAP.md 갱신은 하지 않는다 (중요 마일스톤일 때만 별도 요청)
- AI_SYNC.md는 Codex 위임 사항이 있을 때만 갱신한다
- 커밋 메시지에 `[save]` prefix를 붙이지 않는다 — 일반 커밋과 동일하게 작성
- `/save` 후 추가 작업 요청이 오면 새 작업으로 진행 (체크포인트 무효화 아님)
- commit/push가 실패했거나 미커밋 변경이 남아 있으면 "저장 완료"라고 말하지 않는다.
  사용자에게 남은 로컬 변경과 필요한 다음 조치를 짧게 알려야 한다.
