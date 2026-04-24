# OpenClaw 맥북 노드 구현 계획

> 작성일: 2026-04-23
> 목적: Flora 서버(두뇌) + 맥북(손발) 분산 아키텍처 구현
> 선행 조건: Phase 0-3 완료 (현재 상태)

## 현재 상태

```
[텔레그램] → [Flora 서버: OpenClaw Gateway]
                    ↓
              GPT-5.4 / Gemini
                    ↓
              서버 로컬 exec만 가능
              (맥북 파일 접근 불가)
```

## 목표 상태

```
[텔레그램] → [Flora 서버: OpenClaw Gateway (두뇌)]
                    ↓                    ↓
              GPT-5.4 / Gemini     [맥북: OpenClaw Node (손발)]
                    ↓                    ↓
              서버 exec           맥북 exec + 브라우저 + Claude Code + Codex
```

## 구현 단계

### Step 1: Tailscale 서브 경로 설정 (15분)

Flora 게이트웨이가 Tailscale 네트워크에서 접근 가능해야 맥북 노드가 연결 가능.

```bash
# Flora 서버에서
tailscale status                    # Tailscale 연결 확인
tailscale serve --bg 18789          # 게이트웨이를 Tailnet에 노출
```

현재 `tailscale serve` 실패 중 → 원인 진단 필요 (인증 만료 가능).

대안: 맥북에서 SSH 터널로 연결
```bash
ssh -L 18789:127.0.0.1:18789 openclaw  # 맥북 localhost:18789 → Flora 18789
```

### Step 2: 맥북에 OpenClaw 노드 설치 (30분)

```bash
# 맥북에서
npm install -g openclaw              # 이미 설치되어 있을 수 있음 (확인 필요)
openclaw --version                   # 2026.4.21 확인

# 노드 설치 (launchd 서비스 자동 등록)
openclaw node install \
  --host <flora-tailscale-ip> \
  --port 18789 \
  --display-name "jiho-macbook"

# 또는 SSH 터널 경유 시
openclaw node install \
  --host 127.0.0.1 \
  --port 18789 \
  --display-name "jiho-macbook"
```

### Step 3: 게이트웨이에서 노드 페어링 승인 (5분)

```bash
# Flora 서버에서
openclaw nodes pending               # 대기 중인 페어링 요청 확인
openclaw nodes approve <node-id>     # 맥북 노드 승인
openclaw nodes status                # 연결 상태 확인
```

### Step 4: 노드 기능 확인 (15분)

```bash
# Flora 서버에서
openclaw nodes describe --node jiho-macbook    # 사용 가능한 명령 목록

# 테스트: 맥북에서 명령 실행
openclaw nodes invoke --node jiho-macbook --command system.run --params '{"command":"ls ~/workspace/pressco21/"}'

# 테스트: 맥북 파일 읽기
openclaw nodes invoke --node jiho-macbook --command system.run --params '{"command":"cat ~/workspace/pressco21/CLAUDE.md"}'
```

### Step 5: exec 라우팅 설정 (30분)

OpenClaw가 맥북 관련 요청을 자동으로 노드에 라우팅하도록 설정.

```json
// openclaw.json에 추가
{
  "tools": {
    "exec": {
      "host": "auto",
      "node": {
        "preferred": "jiho-macbook",
        "fallback": "local"
      }
    }
  }
}
```

### Step 6: 맥북 전용 스킬 구성 (1시간)

#### local-project-explorer 스킬
- `~/workspace/pressco21/` 프로젝트 구조 탐색
- git 상태, 최근 커밋, 브랜치 확인
- n8n WF 파일 조회

#### local-browser 스킬
- 맥북 Playwright로 사방넷 접속 (서버 ARM 대신 맥 x86)
- 메이크샵 어드민 접속
- 경쟁사 사이트 크롤링

#### claude-code-bridge 스킬
- 텔레그램 → Flora → 맥북 노드 → Claude Code CLI 호출
- "이 파일 수정해줘" → 맥북에서 Claude Code 실행
- 결과를 텔레그램으로 보고

#### codex-bridge 스킬
- 맥북 노드 → Codex CLI 호출
- 테스트 실행, 리팩토링 위임

### Step 7: 보안 하드닝 (30분)

- 노드 exec allowlist: 맥북에서 실행 가능한 명령 제한
- 위험 명령 차단: rm -rf, git push --force 등
- 노드 접근 권한: Flora 게이트웨이만 (Tailscale ACL)
- 로그: 노드 실행 로그 → Flora에서 중앙 수집

### Step 8: 통합 테스트 (30분)

텔레그램에서:
1. "우리 프로젝트 목록 보여줘" → 맥북 ls 실행 → 결과 표시
2. "n8n 워크플로우 파일 몇 개야?" → 맥북에서 find 실행
3. "사방넷 재고 확인해줘" → 맥북 브라우저 → 스크린샷
4. "이 버그 Claude Code로 수정해줘" → Claude Code CLI 호출

## 일정 요약

| Step | 작업 | 공수 |
|------|------|------|
| 1 | Tailscale 연결 | 15분 |
| 2 | 맥북 노드 설치 | 30분 |
| 3 | 페어링 승인 | 5분 |
| 4 | 기능 확인 | 15분 |
| 5 | exec 라우팅 | 30분 |
| 6 | 맥북 전용 스킬 4개 | 1시간 |
| 7 | 보안 하드닝 | 30분 |
| 8 | 통합 테스트 | 30분 |
| **합계** | | **~3.5시간** |

## 리스크

| 리스크 | 대응 |
|--------|------|
| Tailscale serve 실패 지속 | SSH 터널 대안 사용 |
| 맥북 슬립 시 노드 끊김 | caffeinate 또는 슬립 방지 설정 |
| Claude Code CLI 호출 복잡 | 단순 명령부터 시작 (git status 등) |
| 노드-게이트웨이 지연 | Tailscale 직접 연결 (relay 아닌 P2P) |

## 참고

- OpenClaw node CLI: `openclaw node --help`
- OpenClaw nodes (게이트웨이 측): `openclaw nodes --help`
- 노드 기능: exec, browser, camera, screen, notify, location
- 현재 노드: 0개 (미구성)
