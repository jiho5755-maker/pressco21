# Shared Agent Ecosystem — main 통합 실행 요청

## 배경

Claude Code와 Codex/OMX 양쪽에서 AI OS(Shared Agent Kernel)를 구축했다.
이제 두 브랜치의 변경을 main에 안전하게 통합해야 한다.

Claude 측이 통합 매니페스트를 작성 완료했다. 아래 파일을 먼저 읽어라:

```
/Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/docs/ai-native-upgrade/shared-agent-kernel/main-integration-manifest-2026-04-23.md
```

## 워크트리 경로 정리

| 이름 | 절대 경로 | 브랜치 |
|------|----------|--------|
| main (루트) | `/Users/jangjiho/workspace/pressco21` | `main` |
| Claude 워크트리 | `/Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem` | `work/workspace/claude-shared-agent-ecosystem` |
| OMX 워크트리 | `/Users/jangjiho/workspace/pressco21-worktrees/workspace-ai-team-pilot` | `work/workspace/ai-team-pilot-followup` |

## 해야 할 일

### Step 1. 매니페스트 읽기

위 매니페스트 파일을 읽고 4그룹 분류(MERGE_CORE / MERGE_OPTIONAL / TEAM_BRANCH_ONLY / EXCLUDE)를 확인하라.

### Step 2. 통합 브랜치 생성

main에서 새 브랜치를 만든다:
```bash
cd /Users/jangjiho/workspace/pressco21
git switch main && git pull --ff-only
bash _tools/pressco21-task.sh workspace shared-agent-main-integration
```

### Step 3. OMX 변경 먼저 적용

OMX 워크트리에서 통합 브랜치로 cherry-pick 또는 파일 복사:
- `_tools/omx-*.sh` + `_tools/omx-*.py` (OMX가 source of truth, 22개)
- AGENTS.md의 Shared Agent Kernel 섹션

### Step 4. Claude MERGE_CORE 적용

Claude 워크트리에서 통합 브랜치로 파일 복사:
- `.claude/skills/pressco21-*/` (5 스킬 유닛, 8 파일)
- `docs/ai-native-upgrade/shared-agent-kernel/` (설계 문서 52개)
- `docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md`
- `_tools/git-hooks/pre-commit` (scope-guard exit code 수정)

### Step 5. 충돌 해결

| 파일 | 해결 방법 |
|------|----------|
| `AGENTS.md` | 매니페스트의 "최종 문구 추천" 섹션 사용 |
| `_tools/project-scope.sh` | OMX 베이스에 Claude의 `team/handoffs/` + `team/knowledge-base/` 허용 추가 |
| `_tools/omx-handoff-reader.sh` | OMX 최신본 사용 (Claude 버전 무시) |

### Step 6. smoke test

```bash
bash _tools/omx-handoff-reader.sh
bash _tools/omx-cross-runtime-smoke.sh
```

### Step 7. team 변경은 별도

playbook/failures/growth-log는 이번 통합에 포함하지 않는다.

## 절대 하지 말 것

- main에 직접 커밋 금지
- `offline-crm-v2/**`, `n8n-automation/**`, `flora-todo-mvp/**`, `mcp-servers/**`, `makeshop-skin/**` 섞지 마라
- Claude의 `_tools/omx-handoff-reader.sh`를 OMX 최신본 위에 덮어쓰지 마라

## 성공 기준

- [ ] 통합 브랜치에 MERGE_CORE 파일만 포함
- [ ] `_tools/omx-*` 22개가 OMX 최신본
- [ ] `.claude/skills/pressco21-*` 5개 스킬 존재
- [ ] scope-guard가 team/handoffs/ + team/knowledge-base/ 허용
- [ ] smoke test pass
