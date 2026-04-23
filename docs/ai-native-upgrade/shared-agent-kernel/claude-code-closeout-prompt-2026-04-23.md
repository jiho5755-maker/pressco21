# Claude Code 요청 — Shared Agent 세팅 마무리와 워크트리 closeout 점검

아래 내용을 읽고 Claude Code 쪽 shared-agent 작업실을 마무리해 주세요.

## 배경

Codex/OMX가 main에 다음을 통합 완료했습니다.

- Shared Agent Kernel 문서와 PRD
- `.claude/skills/pressco21-*`
- `_tools/omx-*` founder-facing wrapper/call-site 도구
- `team/handoffs/**`
- `team/knowledge-base/**`
- `AGENTS.md` Shared Agent Kernel 섹션

main은 원격까지 push 완료된 상태입니다.

## Claude가 해야 할 일

### 1. 현재 Claude worktree 상태 확인

대상 worktree:

```text
/Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem
```

확인:

```bash
git status --short
git log --oneline --max-count=5
```

### 2. main 반영 여부 확인

아래 파일/폴더가 main에 반영됐는지 확인해 주세요.

```text
.claude/skills/pressco21-*
docs/ai-native-upgrade/shared-agent-kernel/**
docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md
AGENTS.md Shared Agent Kernel 섹션
team/handoffs/**
team/knowledge-base/**
```

### 3. Claude worktree 삭제 가능 여부 판단

아래 세 그룹으로 분류해 주세요.

#### DELETE_OK

main에 반영 완료되어 삭제 가능한 파일/브랜치/워크트리.

#### KEEP

아직 Claude 쪽에서만 의미가 있어 보존해야 하는 파일.

#### NEEDS_SEPARATE_BRANCH

shared-agent와 별개이므로 별도 브랜치에서 정리해야 하는 파일.

### 4. 삭제는 직접 하지 말고 추천만 해 주세요

Claude는 `git worktree remove`나 branch delete를 실행하지 말고, 삭제 후보만 알려주세요.
삭제는 대표 승인 후 Codex/OMX가 수행합니다.

### 5. 최종 handoff 남기기

`team/handoffs/latest.md`를 덮어쓰기 전에 현재 main의 latest handoff를 읽고, 필요한 경우 dated archive 파일을 추가해 주세요.

필수 필드:

```yaml
handoff_id:
created_at:
runtime: claude
owner_agent_id:
contributors:
branch:
worktree_path:
summary:
decision:
changed_artifacts:
verification:
open_risks:
next_step:
learn_to_save:
```

## 출력 형식

```markdown
## 결론

## DELETE_OK

## KEEP

## NEEDS_SEPARATE_BRANCH

## main 반영 확인 결과

## 삭제 전 주의사항

## Codex/OMX에게 요청할 다음 작업
```

## 절대 하지 말 것

- main에 직접 커밋하지 마세요.
- 삭제를 직접 실행하지 마세요.
- OMX 최신 `_tools/omx-*` 파일을 Claude 쪽 버전으로 되돌리지 마세요.
- `offline-crm-v2/**`, `n8n-automation/**` 변경을 shared-agent closeout에 섞지 마세요.
