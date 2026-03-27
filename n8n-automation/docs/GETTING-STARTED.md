# AI n8n 자동화 — 시작 가이드

> 다른 컴퓨터에서도 동일한 환경을 구축할 수 있도록 처음부터 설명합니다.
> 입문자 기준으로 작성하였습니다.

---

## 이 프로젝트가 뭔가요?

**n8n 오픈소스 + Claude Code 에이전트**를 조합한 "자연어로 자동화를 만드는" 환경입니다.

```
n8n-main/
├── [n8n 오픈소스 코드]      ← n8n 워크플로우 엔진 소스
├── .claude/agents/          ← 22개 AI 에이전트 (Claude Code용)
├── .mcp.json                ← MCP 서버 설정
├── mcp-shrimp-task-manager/ ← 작업 관리 MCP 서버
└── pressco21/               ← 실제 자동화 프로젝트 3개
    ├── automation-project/  ← 업무 일정 자동화
    ├── govt-support/        ← 정부지원사업 자동수집
    └── homepage-automation/ ← 쇼핑몰 운영 자동화
```

**어떻게 동작하나요?**

1. Claude Code CLI를 열고 자연어로 요청: *"FA-001 강사 등급 자동변경 워크플로우 만들어줘"*
2. 전담 AI 에이전트(`.claude/agents/`)가 PRD를 읽고 n8n JSON을 생성
3. n8n-server-ops 에이전트가 서버에 자동 배포

---

## 1. 필수 도구 설치

### Node.js 22+

```bash
# nvm으로 설치 (권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc   # 또는 ~/.bashrc

nvm install 22
nvm use 22
node -v  # v22.x.x 확인
```

### pnpm

```bash
npm install -g pnpm
pnpm -v  # 9.x.x 확인
```

### Git

```bash
git --version  # 없으면: brew install git (macOS)
```

### Claude Code CLI

```bash
npm install -g @anthropic/claude-code
claude --version  # 확인
```

> Claude Code 공식 문서: https://docs.anthropic.com/ko/docs/claude-code

---

## 2. 저장소 클론 및 n8n 빌드

```bash
# 저장소 클론
git clone https://github.com/jiho5755-maker/n8n-automation.git n8n-main
cd n8n-main

# 패키지 설치 (최초 1회, 약 3~5분 소요)
pnpm install

# n8n 빌드 (약 5~10분 소요)
pnpm build > build.log 2>&1
tail -n 5 build.log  # 오류 없으면 완료
```

---

## 3. n8n 로컬 실행

```bash
# 로컬 n8n 시작
bash start-n8n.sh

# 브라우저에서 확인
open http://localhost:5678
```

> `start-n8n.sh`는 루트 폴더에 있어야 합니다 (`node packages/cli/bin/n8n` 경로 필요).

---

## 4. Claude Code 에이전트 확인

### 에이전트 목록

`.claude/agents/` 폴더에 22개 전담 에이전트가 있습니다.

**핵심 에이전트 5개:**

| 에이전트 | 역할 | 언제 사용 |
|---------|------|---------|
| `n8n-workflow-builder` | n8n JSON 워크플로우 생성 | 새 워크플로우 구현 |
| `n8n-server-ops` | 서버 배포, 디버깅 | 서버 배포/재시작/로그 확인 |
| `shopping-automation-specialist` | 쇼핑몰 자동화 전담 | 쇼핑몰 기능 구현 |
| `govt-support-specialist` | 정부지원사업 전담 | 공고 수집/분류 구현 |
| `makeshop-api-expert` | 메이크샵 API 전문 | API 엔드포인트/파라미터 확인 |

### Claude Code 실행

```bash
# n8n-main 폴더에서 실행
cd n8n-main
claude

# 예시 요청
> "FA-001 강사 등급 자동변경 워크플로우를 수정해줘"
> "정부지원사업 WF#1에서 Gemini 배치 처리를 최적화해줘"
```

---

## 5. MCP 서버 설정

`.mcp.json` 파일에 2개의 MCP 서버가 설정되어 있습니다.

```json
{
  "mcpServers": {
    "shrimp-task-manager": { ... },
    "playwright": { ... }
  }
}
```

| MCP 서버 | 역할 |
|---------|------|
| `shrimp-task-manager` | 복잡한 작업을 태스크로 분해/추적 |
| `playwright` | 브라우저 자동화, UI 테스트 |

### mcp-shrimp-task-manager 빌드 (최초 1회)

```bash
cd mcp-shrimp-task-manager
npm install
npm run build
cd ..
```

---

## 6. API 키 설정

### .secrets 파일 생성

```bash
# 템플릿 복사
cp pressco21/secrets.example.env pressco21/.secrets

# 편집 (실제 키 입력)
nano pressco21/.secrets
```

### 필요한 키 목록

| 키 이름 | 발급처 | 용도 |
|--------|--------|------|
| `N8N_API_KEY` | n8n UI → Settings → n8n API | 워크플로우 배포 |
| `NOCODB_TOKEN` | NocoDB → Team & Auth → API Tokens | DB 읽기/쓰기 |
| `MSIT_API_KEY` | 공공데이터포털 (data.go.kr) | 정부지원사업 공고 수집 |

> **절대 `.secrets` 파일을 git에 커밋하지 마세요!** (`.gitignore`에 등록되어 있음)

---

## 7. 새 프로젝트 시작하기

새로운 자동화 프로젝트를 추가하는 흐름입니다.

```
1. 폴더 생성
   pressco21/my-project/
   ├── PRD.md        ← 요구사항 정의 (prd-generator 에이전트 활용)
   ├── ROADMAP.md    ← 구현 단계 (development-planner 에이전트 활용)
   └── workflows/    ← n8n JSON 파일 저장

2. PRD 작성 (Claude에게 요청)
   > "쇼핑몰 재고 부족 알림 자동화 PRD 작성해줘"

3. 워크플로우 구현
   > "PRD 기반으로 n8n 워크플로우 JSON 만들어줘"

4. 서버 배포
   bash pressco21/_tools/deploy.sh <WF_ID> <JSON_파일>
```

---

## 8. 문제 해결 FAQ

**Q. `pnpm build` 중 메모리 오류가 납니다.**

```bash
# Node.js 메모리 한도 늘리기
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build > build.log 2>&1
```

**Q. `.mcp.json`의 MCP 서버가 Claude에서 연결이 안 됩니다.**

1. `mcp-shrimp-task-manager/` 빌드가 완료되었는지 확인 (`npm run build`)
2. Claude Code 재시작: `claude` 종료 후 재실행

**Q. n8n 서버에 배포했는데 워크플로우가 비활성화 상태입니다.**

```bash
# n8n API로 활성화
curl -X POST \
  -H "X-N8N-API-KEY: $(grep N8N_API_KEY pressco21/.secrets | cut -d= -f2)" \
  https://n8n.pressco21.com/api/v1/workflows/<WF_ID>/activate
```

**Q. 정부지원사업 WF#1이 데이터를 수집하지 못합니다.**

공공데이터포털 API 키 만료 여부 확인 → 재발급 → `pressco21/.secrets` 업데이트 후 n8n Credential 갱신

**Q. Oracle Cloud에서 새 인스턴스 생성 시 "Out of Host Capacity" 오류가 납니다.**

새벽 2~6시(한국 시간 기준 오전)에 재시도하거나 `ap-osaka-1` 등 다른 리전을 선택하세요.

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| 프로젝트 현황 전체 | `pressco21/PROJECT-INDEX.md` |
| 운영 가이드 (서버/WF 관리) | `pressco21/PRESSCO21-GUIDE.md` |
| 쇼핑몰 자동화 ACTION 가이드 | `pressco21/homepage-automation/ACTION-GUIDE.md` |
| 정부지원사업 PRD | `pressco21/govt-support/PRD-v3.md` |
| 배포 스크립트 | `pressco21/_tools/deploy.sh` |
