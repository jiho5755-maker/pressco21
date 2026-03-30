# _sync/ — 메이크샵 스킨 풀/푸시 도구 모음

> **스킨 풀** = 편집기 -> 로컬 | **스킨 푸시** = 로컬 -> 편집기 (git push/pull과 별개!)
> 상세 절차: `~/.claude/skills/makeshop-developer/references/editor-sync.md`

## 파일 목록

| 파일 | 역할 |
|------|------|
| `SYNC-STATUS.md` | 마지막 스킨 풀/푸시 시각, 현재 개발 상태, 영역 구분 |
| `editor-map.json` | 편집기 538파일의 page_type/design_id/로컬경로 매핑 |
| `skin-pull.js` | 스킨 풀 스니펫 (blob 다운로드 방식) |
| `skin-push.js` | 스킨 푸시 스니펫 (hex 인코딩 방식) |
| `pre-push-check.sh` | 스킨 푸시 전 사전 점검 (git/충돌/디자이너 영역) |
| `merge-css.sh` | 디자이너-개발자 CSS 3-way 병합 도구 |
| `add-page-mapping.sh` | 새 개별 페이지 추가 시 editor-map.json 매핑 + 폴더 생성 |
| `MANUAL-PULL.md` | 수동 스킨 풀 (Chrome MCP 없을 때 fallback) |

## 퀵 레퍼런스

### 스킨 풀 (편집기 -> 로컬)
```
Claude Code에게 요청:
  "shopbrand 스킨 풀 해줘"
  "편집기 최신 코드 가져와줘"
  "전체 스킨 풀 해줘"
```

### 스킨 푸시 (로컬 -> 편집기)
```bash
# 1. 사전 점검
bash _sync/pre-push-check.sh category/shopbrand.css

# 2. Claude Code에게 요청:
"shopbrand CSS 스킨 푸시 해줘"
"이 파일 편집기에 배포해줘"
```

### 롤백
```
git log --oneline  # 이전 커밋 확인
git checkout {해시} -- makeshop-skin/{파일}  # 파일 복원
"복원된 파일 스킨 푸시 해줘"  # 편집기도 이전 버전으로
```

## 안전한 워크플로우

```
스킨 풀 (편집기 최신 코드)
  -> git commit (롤백 기준점)
  -> 로컬에서 개발
  -> git commit (배포 전 스냅샷)
  -> pre-push-check.sh (검증)
  -> 스킨 푸시 (편집기 배포)
  -> 라이브 사이트 확인
  -> SYNC-STATUS.md 업데이트
```
