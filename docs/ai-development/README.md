# AI Development Continuity System

> 목적: Claude Code, Codex, Cursor, OMX/tmux 어느 도구로 작업하더라도 전공자 개발팀 수준의 연속성과 품질을 유지하기 위한 표준 운영 레이어입니다.

## 핵심 원칙

1. **Git이 진실원본**입니다. 대화 기억보다 `origin/main`, 커밋, 태그, 배포 로그를 우선합니다.
2. **작업은 worktree/branch에서** 합니다. main은 최종 통합 기준선으로만 사용합니다.
3. **작업 맥락은 repo에 남깁니다.** 완료된 기능은 `CURRENT_STATE`, `OPS_LOG`, `DECISIONS`, handoff에 기록합니다.
4. **운영 데이터 변경은 코드 커밋과 별도로 기록**합니다. DB/NocoDB/서버 수동 보정은 반드시 `OPS_LOG.md`에 남깁니다.
5. **다음 AI 세션은 고정 루틴으로 시작**합니다. 도구가 Claude든 Codex든 같은 문서를 읽고 같은 체크를 수행합니다.

## 표준 파일

| 파일 | 용도 |
|---|---|
| `docs/ai-development/CURRENT_STATE.md` | 현재 운영/개발 상태의 요약 source of truth |
| `docs/ai-development/OPS_LOG.md` | 배포, 운영 데이터 보정, 롤백, 장애 대응 기록 |
| `docs/ai-development/DECISIONS.md` | 반복 논쟁을 막는 설계/운영 의사결정 기록 |
| `docs/ai-development/DONE_CHECKLIST.md` | 완료 전 품질 체크리스트 |
| `docs/ai-development/HANDOFF_TEMPLATE.md` | 세션 종료/인계 템플릿 |
| `docs/ai-development/handoffs/` | 실제 세션별 handoff note 저장 위치 |

## 표준 명령

이 repo 안에서는 `_tools/` 아래 스크립트를 직접 사용할 수 있고, 전역 설치 후에는 어느 로컬 프로젝트에서도 `ai-*` 명령으로 사용할 수 있습니다.

```bash
# 새 로컬 프로젝트에 표준 문서 세팅
ai-project-bootstrap /path/to/project "Project Name"

# 새 AI 세션 시작 시 맥락 확인
ai-session-start /path/to/project

# 세션 종료/인계 기록 생성
ai-session-finish /path/to/project "한 일 요약" "다음 작업" --risk "주의점"
```

## 새 세션 시작 루틴

```bash
cd <project-root>
git status --short --branch
git pull --ff-only  # main 또는 기준 브랜치일 때만
ai-session-start .
```

AI에게는 다음 순서로 읽게 합니다.

1. `AGENTS.md` / 프로젝트별 AGENTS
2. `CLAUDE.md` 또는 도구별 지침
3. `docs/ai-development/CURRENT_STATE.md`
4. `docs/ai-development/OPS_LOG.md` 최신 항목
5. `docs/ai-development/DECISIONS.md`
6. 최근 `git log --oneline -10`

## 작업 시작 루틴

PRESSCO21 repo에서는 프로젝트별 worktree 도구를 우선 사용합니다.

```bash
bash _tools/pressco21-task.sh <project> <task>
cd ~/workspace/pressco21-worktrees/<slot>
```

일반 로컬 프로젝트에서는 최소한 새 브랜치를 사용합니다.

```bash
git switch -c work/<area>/<task>
```

## 작업 완료 루틴

```bash
# 프로젝트별 검증
npm run build      # 예시
npm test           # 예시

# 상태/범위 확인
git status --short --branch

# handoff 생성
ai-session-finish . "무엇을 끝냈는지" "다음에 볼 내용" --risk "남은 리스크"

# 커밋/병합/배포
git add <allowed-paths>
git commit -m "[codex] 작업 요약"
```

## 운영 데이터 변경 원칙

운영 DB, NocoDB, 서버 파일, n8n 워크플로우 등 Git 밖 상태를 바꿀 때는 다음을 필수로 남깁니다.

- 변경 전 백업 위치
- 대상 ID/키/고객/레코드
- 변경 전 값
- 변경 후 값
- 실행 명령 또는 스크립트
- 검증 결과
- 롤백 방법

기록 위치: `docs/ai-development/OPS_LOG.md`

## 배포 태그 권장

중요 운영 배포 후에는 태그를 남깁니다.

```bash
git tag -a <project>-prod-YYYYMMDD-<topic> -m "배포 요약"
git push origin <tag>
```

## 비전공자 기본 사용법

기억할 명령 3개만 정하면 됩니다.

```bash
ai-project-bootstrap . "프로젝트명"   # 처음 한 번
ai-session-start .                     # 시작할 때
ai-session-finish . "요약" "다음"      # 끝날 때
```
