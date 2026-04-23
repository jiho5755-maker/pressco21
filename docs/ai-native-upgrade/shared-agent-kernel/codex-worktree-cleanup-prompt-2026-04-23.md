# Codex 요청 — Claude 워크트리 정리 + 브랜드 디자인 문서 보존

## 배경

Claude Code의 shared-agent 작업이 전부 main에 반영 완료됐다.
Claude 워크트리를 정리해야 한다.

## 해야 할 일 (3개)

### 1. 브랜드 디자인 문서 3개를 main에 보존

아래 3개 파일은 main에 아직 없다. Claude 워크트리에만 존재한다.
워크트리 삭제 전에 main으로 가져와야 한다.

소스 경로 (Claude 워크트리):
```
/Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/docs/brand-design-guide-for-designers.md
/Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/docs/generate-brand-guide-docx.py
/Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/docs/generate-figma-setup-guide.py
```

방법:
```bash
cd /Users/jangjiho/workspace/pressco21
# workspace 브랜치에서 파일만 가져오기
git checkout work/workspace/claude-shared-agent-ecosystem -- \
  docs/brand-design-guide-for-designers.md \
  docs/generate-brand-guide-docx.py \
  docs/generate-figma-setup-guide.py
git commit -m "[codex] 브랜드 디자인 가이드 문서 보존 (Claude 워크트리 정리 전)"
git push
```

### 2. Claude 워크트리 + 브랜치 삭제

```bash
cd /Users/jangjiho/workspace/pressco21
git worktree remove /Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem
git branch -d work/workspace/claude-shared-agent-ecosystem
```

삭제해도 안전한 근거:
- shared-agent 핵심 파일 전부 main 반영 확인 완료
- KEEP 후보 3개도 main에 이미 존재
- offline-crm/n8n 변경은 main에 더 최신 버전 존재 (stale)
- uncommitted 변경 0건

### 3. 정리 확인

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/pressco21-check.sh
ls /Users/jangjiho/workspace/pressco21-worktrees/ | grep claude
# 출력 없으면 정상
```

## 절대 하지 말 것

- 브랜드 디자인 문서 3개를 보존하기 전에 워크트리를 삭제하지 마라
- main에서 `--force` 삭제 사용 금지 (`-d`만 사용, merge 안 된 브랜치면 멈춤)

## 성공 기준

- [ ] `docs/brand-design-guide-for-designers.md`가 main에 존재
- [ ] `docs/generate-brand-guide-docx.py`가 main에 존재
- [ ] `docs/generate-figma-setup-guide.py`가 main에 존재
- [ ] `workspace-claude-shared-agent-ecosystem` 워크트리 삭제됨
- [ ] `work/workspace/claude-shared-agent-ecosystem` 브랜치 삭제됨
