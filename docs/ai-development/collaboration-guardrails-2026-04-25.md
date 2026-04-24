# PRESSCO21 병렬 AI 세션 충돌 방지 가드레일

작성일: 2026-04-25

## 핵심 원칙

1. `main` worktree는 통합 전용으로 둔다.
   - 허용: `pull`, `merge`, `push`, 상태 확인
   - 금지: 개발, 문서 생성, handoff 생성, 자동 백업 생성
2. 새 작업은 반드시 `_tools/pressco21-task.sh <project> <task>`로 만든 project worktree에서 수행한다.
3. 같은 worktree에는 WRITE AI를 한 명만 둔다.
4. `team/handoffs/**`, `team/knowledge-base/**`, `docs/ai-development/OPS_LOG.md`, `AGENTS.md`, `.gitignore`, `_tools/**` 같은 shared 파일은 통합 세션이 최종 반영한다.

## 운영 명령

### 전체 상태 점검

```bash
bash _tools/pressco21-status-all.sh --fetch
```

확인 포인트:

- `main`이 dirty이면 먼저 stash/commit/정리한다.
- 특정 worktree가 dirty이면 해당 세션 owner가 commit/stash/handoff한다.
- `workspace-product-inventory-ops`처럼 실제 작업 중인 worktree는 건드리지 않는다.

### 새 작업 시작

```bash
bash _tools/pressco21-task.sh workspace collaboration-guardrails
```

`main`이 dirty이면 기본적으로 task 생성이 차단된다. 이는 hidden handoff 충돌을 막기 위한 정책이다.

### main 통합

```bash
bash _tools/pressco21-integrate.sh work/workspace/collaboration-guardrails --push
```

이 스크립트는 다음을 확인한다.

- main branch/clean 상태
- source branch 존재 여부
- source worktree clean 상태
- `pressco21-check.sh` 통과
- `pull --ff-only`, `merge --no-ff`, 선택적 push

## Git hook

`_tools/git-hooks/pre-commit`은 반드시 현재 worktree root의 `_tools/scope-guard.sh`를 실행해야 한다.
예전 hook은 `.git/hooks` 기준 상대 경로를 사용해서 linked worktree에서 scope guard를 찾지 못했다.

설치:

```bash
bash _tools/install-hooks.sh
```

검증:

```bash
bash _tools/pressco21-check.sh
```

## 복구 정책

- main에 의도치 않은 handoff/shared dirty가 생기면 삭제하지 말고 먼저 stash로 보존한다.
- 예: `git stash push -u -m "main-dirty-handoff-preserve-$(date +%Y%m%d-%H%M%S)"`
- stash를 바로 pop하지 않는다. 현재 main과 충돌 가능성이 있으면 필요한 파일만 선별 적용한다.
