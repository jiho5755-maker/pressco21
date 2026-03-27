# 도구 및 스크립트 안내

이 폴더에는 n8n 워크플로우 배포/관리에 쓰이는 범용 스크립트가 있습니다.

---

## 실행 환경 파일 위치 (루트에 있어야 함)

n8n 소스 경로를 기준으로 동작해야 하므로 아래 파일들은 **루트(`n8n-main/`)에 위치**해야 합니다.
이 파일들은 `pressco21/_tools/`로 이동하지 않습니다.

| 파일 | 역할 |
|------|------|
| `start-n8n.sh` | n8n 로컬 실행 스크립트 (`node packages/cli/bin/n8n start`) |
| `start.sh` | 개발 서버 시작 스크립트 |
| `ecosystem.config.js` | PM2 프로세스 매니저 설정 |

---

## 이 폴더의 파일

### `deploy.sh` — 안전한 WF 배포 스크립트

n8n 워크플로우 JSON을 서버에 PUT 배포하는 스크립트입니다.
API 키를 코드에 하드코딩하지 않고 `.secrets` 파일에서 읽습니다.

**사용법:**
```bash
# 1. pressco21/.secrets 파일에 N8N_API_KEY가 설정되어 있는지 확인
cat pressco21/.secrets | grep N8N_API_KEY

# 2. 배포 실행
bash pressco21/_tools/deploy.sh <워크플로우_ID> <JSON_파일_경로>

# 예시
bash pressco21/_tools/deploy.sh 7MXN1lNCR3b7VcLF \
  pressco21/govt-support/workflows/정부지원사업_Pressco21.json
```

**API 키 발급 방법:**
1. n8n UI 접속 (`https://n8n.pressco21.com`)
2. Settings → n8n API → Create API Key
3. 발급된 키를 `pressco21/.secrets` 파일의 `N8N_API_KEY=` 줄에 입력

---

## 보안 주의사항

- `.secrets` 파일은 git에 커밋하지 말 것 (`.gitignore`에 등록됨)
- API 키를 스크립트에 직접 입력하지 말 것
- 키가 노출된 경우 즉시 n8n UI에서 삭제 후 재발급
