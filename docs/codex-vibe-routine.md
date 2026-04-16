# Codex / Claude Vibe Routine — Worktree 기반 v2

> 2026-04-16부터 `AI_SYNC.md` lock 루틴은 은퇴했습니다. 과거 내용은 Git history와 `archive/ai-sync-history/`에 보존됩니다.

## 목적

비전공자 AI 바이브코딩 환경에서 여러 프로젝트 변경이 섞이지 않도록, 문서 수동 확인 대신 Git worktree/branch/hook으로 안전장치를 겁니다.

## 시작

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/pressco21-task.sh <project> <task>
```

예시:

```bash
bash _tools/pressco21-task.sh crm invoice-fix
```

## 작업 중 확인

```bash
bash _tools/pressco21-check.sh
```

## 원칙

- main은 최종 통합 기준선이며 직접 기능 커밋하지 않습니다.
- 기능 개발은 `work/<project>/<task>` 브랜치와 전용 worktree에서만 합니다.
- 한 worktree에는 WRITE AI를 한 번에 하나만 둡니다.
- pre-commit hook이 브랜치별 허용 경로 밖 파일을 차단합니다.
- 세션 로그/백업은 `output/codex-sessions/`, `output/codex-backups/`, `output/codex-handoffs/`를 사용합니다.

## 완료

1. 프로젝트별 build/test 실행
2. `bash _tools/pressco21-check.sh`
3. 허용된 프로젝트 경로만 `git add`
4. commit
5. main에서 `git merge --no-ff work/<project>/<task>`
6. push
