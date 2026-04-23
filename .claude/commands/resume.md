---
name: resume
description: 이전 세션 복원 — latest handoff 로드 + 에이전트 growth-log + founder-facing 요약. 세션 시작 시 자동 주입(UserPromptSubmit 훅)보다 더 상세한 컨텍스트가 필요할 때 사용.
user_invocable: true
---

# /resume — 이전 세션 복원

사용자가 `/resume`을 입력하면 아래를 순서대로 실행한다.

## Step 1: Latest Handoff 로드

현재 cwd의 scope에 맞는 handoff를 읽는다.
탐색 기준은 literal pwd가 아니라 `git rev-parse --show-toplevel`로 계산한 worktree root다.

탐색 순서:
1. 현재 worktree root의 `team/handoffs/latest.md`가 현재 branch/worktree와 일치하면 사용
2. `/Users/jangjiho/workspace/pressco21/team/handoffs/worktrees/<worktree-slot>/latest.md`
3. `/Users/jangjiho/workspace/pressco21/team/handoffs/branches/<safe-branch>/latest.md`
4. `/Users/jangjiho/workspace/pressco21/team/handoffs/projects/<project>/latest.md`
5. main 세션일 때만 `/Users/jangjiho/workspace/pressco21/team/handoffs/latest.md`

파일이 없으면: "이 worktree의 이전 handoff 없음 — 새 세션으로 시작합니다." 출력 후 종료.
전역 handoff가 현재 scope와 다르면 "전역 참고"로만 표시하고 현재 작업의 next step처럼 다루지 않는다.

## Step 2: 에이전트 컨텍스트 로드

handoff의 `owner_agent_id`에 해당하는 에이전트의 growth-log를 확인한다:
- `team/knowledge-base/{에이전트폴더}/growth-log.md`의 최근 항목 3개
- 해당 에이전트의 agent-memory MEMORY.md (있으면)

## Step 3: MEMORY 활성 블로커 확인

프로젝트 MEMORY.md에서 "활성 블로커" 섹션을 확인한다.

## Step 4: Founder-Facing 요약 출력

canonical roster 기준으로 사람 이름을 먼저 표시한다. runtime은 보조 정보로만 표시.
OMX formatter와 같은 섹션 구조를 사용한다.

```
## 이전 세션 복원

### 누가
- 담당: {display_name} (예: 최민석님)
- 참여: {contributor display_names}
- (runtime이 codex-omx면) "실행실에서 진행된 작업입니다"

### 무엇을
{summary}

### 확인한 것
{verification}

### 이어서
{next_step}

### 주의
{open_risks}

### 승격 후보
{learn_to_save} (있으면)
```

**wording 규칙**:
- `owner_agent_id`를 founder-facing display_name으로 변환한다 (규칙 3 참조)
- "런타임: claude" 같은 표현 대신 "회의실에서" / "실행실에서"를 보조 정보로 표시
- `agent_id`를 사용자에게 직접 노출하지 않는다

## Step 5: 연속 작업 제안

handoff의 `next_step`을 기반으로 "바로 시작하시겠습니까?" 형태의 제안을 한다.
대표가 다른 주제를 원하면 그대로 전환한다.

## 사용 패턴

| 상황 | 사용법 |
|------|--------|
| 어제 작업 이어하기 | `/resume` → 바로 시작 |
| 다른 사람(OMX)이 한 작업 확인 | `/resume` → 리뷰 후 이어서 |
| 긴 부재 후 복귀 | `/resume` → 전체 상황 파악 |

## 주의사항

- `/resume`은 읽기 전용이다 — handoff 파일을 수정하지 않는다
- 세션 시작 시 UserPromptSubmit 훅이 cwd 기반 scoped 컨텍스트를 자동 주입하지만, `/resume`은 더 상세한 복원을 제공한다
- handoff가 7일 이상 오래되면 "오래된 handoff입니다" 경고를 표시한다
