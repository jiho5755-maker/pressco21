# PRESSCO21 영속 핸드오프 프로토콜

- 작성일: 2026-04-25
- 대상: Claude Code, Codex/OMX, 사람이 직접 여는 다음 세션
- 목적: 사용자가 "핸드오프", "오늘 여기까지", "세션 종료", "컴퓨터 종료"라고 말했을 때 다음 세션에서 기록 누락 없이 이어가게 한다.

## 1. 문제 정의

`output/codex-handoffs/`는 로컬 세션 기록으로 유용하지만 `.gitignore` 대상이다. 따라서 이 파일만 만들면 다음 상황에서 기록이 없다고 보일 수 있다.

- 다른 Codex/Claude 세션을 새로 열었다.
- GitHub/다른 worktree에서 브랜치를 확인했다.
- main worktree가 다른 세션의 handoff 파일로 dirty 상태다.
- 세션 종료 후 로컬 output 경로를 모른다.

비전공자인 사용자가 "핸드오프"라고 말하는 의미는 단순 체크포인트가 아니라 **작업을 끊고 가도 다음 세션에서 안전하게 이어지는 상태**다.

## 2. 운영 기준

핸드오프 완료는 아래 4개가 모두 충족되어야 한다.

1. 필요한 작업 변경이 commit되어 있다.
2. `team/handoffs/**`에 scope별 handoff가 기록되어 있다.
3. handoff 기록 자체도 commit되어 있다.
4. 현재 branch가 원격에 push되어 있다.

로컬 `output/codex-handoffs/**`만 있으면 **미완료**다.

## 3. 표준 명령

Codex/OMX, Claude, 사람이 직접 터미널에서 모두 같은 helper를 사용할 수 있다.

```bash
bash _tools/pressco21-handoff.sh \
  "이번 세션 요약" \
  "다음 세션 첫 작업" \
  --risk "남은 리스크" \
  --label "task-label"
```

이 helper는 기본적으로 다음을 수행한다.

1. `output/codex-handoffs/` 로컬 기록 생성
2. `team/handoffs/worktrees/<slot>/latest.md` 생성/갱신
3. `team/handoffs/branches/<branch>/latest.md` 생성/갱신
4. `team/handoffs/projects/<project>/latest.md` 생성/갱신
5. `team/handoffs/archive/YYYY-MM-DD/`에 archive 생성
6. `team/handoffs/YYYY-MM-DD-<label>.md`에 named handoff 생성
7. handoff 파일 commit
8. 현재 branch push

## 4. Claude/Codex 공통 규칙

### 해야 하는 것

- 사용자가 핸드오프를 요청하면 먼저 `git status`를 확인한다.
- 완료된 코드/문서 변경은 handoff 전에 commit한다.
- handoff는 current worktree/branch 안에 남긴다.
- main worktree에 handoff 파일을 남겨 dirty하게 만들지 않는다.
- 최종 답변에 branch, commit, push 여부, handoff 경로, dirty 여부를 명시한다.

### 하면 안 되는 것

- `output/` 로컬 파일만 만들고 "완료"라고 말하지 않는다.
- push하지 않은 상태에서 사용자가 세션을 종료해도 된다고 안심시키지 않는다.
- main worktree에 일반 작업 handoff를 직접 생성하지 않는다.
- 다른 세션이 쓰는 worktree의 handoff를 대신 덮어쓰지 않는다.

## 5. 파일 위치 정책

| 위치 | 용도 | Git 추적 | 다음 세션 신뢰도 |
|---|---|---:|---:|
| `output/codex-handoffs/` | 로컬 상세 기록 | 아니오 | 낮음 |
| `team/handoffs/worktrees/<slot>/latest.md` | 같은 worktree 재개 | 예 | 높음 |
| `team/handoffs/branches/<branch>/latest.md` | 같은 branch 재개 | 예 | 높음 |
| `team/handoffs/projects/<project>/latest.md` | 같은 프로젝트 fallback | 예 | 중간 |
| `team/handoffs/archive/YYYY-MM-DD/` | 이력 보존 | 예 | 높음 |
| `team/handoffs/YYYY-MM-DD-<label>.md` | 사람이 찾기 쉬운 named handoff | 예 | 높음 |

## 6. Scope guard 변경

`team/handoffs/**`는 모든 프로젝트 브랜치에서 commit 가능해야 한다. 이유는 handoff가 기능 코드가 아니라 세션 연속성 메타데이터이기 때문이다.

따라서 `_tools/project-scope.sh`는 모든 프로젝트의 sparse checkout과 allowed path에 `team/handoffs/`를 포함한다.

## 7. Claude hook 변경

Claude Stop hook은 이전에는 main 기준 registry에 handoff를 쓰기 쉬웠다. 이러면 main이 다른 세션 handoff로 dirty해지고, 새 worktree에서 기록이 안 보일 수 있다.

새 기준:

- Stop hook은 현재 `git rev-parse --show-toplevel`의 worktree 안에 `team/handoffs/**`를 쓴다.
- main/global latest는 main 세션 또는 명시적 promote 때만 쓴다.
- SessionStart는 현재 worktree의 registry를 먼저 읽고, 없을 때만 main fallback을 참고한다.

## 8. 최종 응답 템플릿

핸드오프 완료 후 사용자에게는 아래 형식으로 짧게 보고한다.

```text
핸드오프 완료했습니다.

- Branch: work/<project>/<task>
- Commit: <hash> <message>
- Push: origin/work/<project>/<task> 완료
- Handoff: team/handoffs/YYYY-MM-DD-<label>.md
- Worktree status: clean

다음 세션은 이 worktree에서 /resume 또는 handoff 파일 기준으로 이어가면 됩니다.
```

dirty 변경이 남아 있으면 완료라고 하지 않는다.

```text
핸드오프 기록과 push는 완료했지만, 아래 변경은 아직 로컬에 남아 있습니다.
이 파일들은 다음 세션도 같은 worktree에서 열어야 보입니다.
...
```

## 9. 이번 변경의 기대 효과

- Codex와 Claude가 같은 `team/handoffs/**` 경로를 읽고 쓴다.
- project worktree에서도 handoff commit이 scope guard에 막히지 않는다.
- main worktree가 다른 세션 handoff로 dirty해지는 문제를 줄인다.
- 사용자가 세션을 종료해도 branch push만 확인하면 다음 세션에서 이어갈 수 있다.
