<!-- AI-NATIVE-P1-WAVE4 | v1.0 | 2026-04-15 | Claude Opus 4.6 | 드리프트 해소 계획 -->
# P1 Wave 4 — 로컬 JSON 드리프트 해소 + 문서화 계획

> **작성**: 2026-04-15 (Wave 3 전체 완료 직후 체크포인트)
> **상위**: `METAPROMPT.md` v2.0 §9, `P1-telegram-bot-reorganization.md` v2.2
> **실행 시점**: 다음 세션 (세션 compact 후 재개)
> **예상 소요**: ~2시간
> **Effort**: **max** (로컬↔운영 정합성 복구, 배포 스크립트 영향 가능)

---

## 0. 배경 — 왜 이 작업이 필요한가

Wave 3-1(52 WF credential 통합) + Wave 3-4(T2 Topic 재배선 10 WF) + Wave 3-5(T3 매출 재배선 4 WF)는 **n8n REST API를 직접 PUT**으로 수행했다. 운영 서버는 최신 상태지만 **로컬 JSON 정본 파일(`n8n-automation/workflows/**/*.json`)은 옛 상태**로 남았다.

**드리프트 11개 파일** (`-5154731145` 하드코딩 잔존):

| # | 파일 | Wave 3 처리 상태 | 조치 |
|---|------|------------|------|
| 1 | `workflows/homepage/FA-001_강사회원_등급_자동변경.json` | Wave 3-4에서 🎓=6 재배선 | Pull |
| 2 | `workflows/homepage/FA-002_강사_신청_알림.json` | Wave 3-4에서 🎓=6 | Pull |
| 3 | `workflows/homepage/FA-003_강사_반려_이메일_자동발송.json` | Wave 3-4에서 🎓=6 | Pull |
| 4 | `workflows/automation/deadline-alert.json` | [F11] 마감 🎓=6 (ID `sZEwxo77BNP5iy94`) | Pull |
| 5 | `workflows/automation/review-reward-auto.json` | Wave 3 미처리 | 조사 |
| 6 | `workflows/automation/review-remind-d7.json` | Wave 3 미처리 | 조사 |
| 7 | `workflows/automation/review-delivery-notify.json` | Wave 3 미처리 | 조사 |
| 8 | `workflows/automation/customer-segmentation.json` | Wave 3 미처리 | 조사 |
| 9 | `workflows/automation/weekly-business-report.json` | Wave 3 미처리 (S3A-001?) | 조사 |
| 10 | `_tools/central-error-handler.json` | Wave 3 미처리 | 조사 |
| 11 | `workflows/govt-support/WF-GOV-DOCS.json` | `TsJQE6BxL3HQM6Ax` 정부지원사업_행정서류자동생성? | Pull |

**리스크**: 현 상태에서 누군가 `bash n8n-automation/_tools/deploy.sh <WF_ID> <로컬_JSON>` 돌리면 **Wave 3 결과가 롤백됨**. `-5154731145`는 이제 존재하지 않는 chat_id(일반 group, supergroup 승급 후 무효). 배포 직후 알림이 어디로도 가지 않는 침묵 장애 발생 가능.

---

## 1. 목표

1. 11개 로컬 JSON 파일을 운영 n8n 서버 상태와 정합성 복구
2. `deploy.sh` 재실행으로 인한 Wave 3 롤백 가능성 제거
3. 재발 방지책 마련 (README 경고 or pre-deploy 체크)
4. Wave 4 문서화 (pressco21-infra.md, P1-matrix v1.4, P1-telegram v2.3)

---

## 2. 작업 환경 확인 (첫 30초)

```bash
cd /Users/jangjiho/workspace/pressco21
git status --short
git log --oneline -5
# 최근 커밋: 06f6a6e (Wave 3 전체 완료)가 HEAD여야 함
cat .secrets.env | grep N8N_CRED_TELEGRAM
# RdFu3nsFuuO5NCff 이어야 함 (대표 수정 완료)
```

**AI_SYNC Lock 재취득**:
```
- Current Owner: Claude Code
- Mode: WRITE
- Working Scope: n8n-automation/workflows/** + docs/ai-native-upgrade/**
```

---

## 3. Phase A — 매핑 확정 (15분)

### 목적
로컬 11 JSON 파일 ↔ 운영 n8n WF ID ↔ Wave 3 처리 상태 매핑 테이블 확정.

### 실행

```python
# /tmp/ai-native-wave4/map.py
import json, os, urllib.request

N8N_KEY = os.environ['N8N_KEY']
BASE = 'https://n8n.pressco21.com/api/v1'
LOCAL_FILES = [
    'n8n-automation/workflows/homepage/FA-001_강사회원_등급_자동변경.json',
    'n8n-automation/workflows/homepage/FA-002_강사_신청_알림.json',
    'n8n-automation/workflows/homepage/FA-003_강사_반려_이메일_자동발송.json',
    'n8n-automation/workflows/automation/deadline-alert.json',
    'n8n-automation/workflows/automation/review-reward-auto.json',
    'n8n-automation/workflows/automation/review-remind-d7.json',
    'n8n-automation/workflows/automation/review-delivery-notify.json',
    'n8n-automation/workflows/automation/customer-segmentation.json',
    'n8n-automation/workflows/automation/weekly-business-report.json',
    'n8n-automation/_tools/central-error-handler.json',
    'n8n-automation/workflows/govt-support/WF-GOV-DOCS.json',
]

def api_get(wf_id):
    req = urllib.request.Request(f'{BASE}/workflows/{wf_id}',
                                 headers={'X-N8N-API-KEY': N8N_KEY})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'error': f'HTTP {e.code}'}

mapping = []
for path in LOCAL_FILES:
    full = f'/Users/jangjiho/workspace/pressco21/{path}'
    with open(full) as f:
        local = json.load(f)
    wf_id = local.get('id') or 'NO_ID_FIELD'
    name = local.get('name', '?')
    # 서버 GET
    server = api_get(wf_id) if wf_id != 'NO_ID_FIELD' else {'error': 'no local id'}
    exists = 'error' not in server
    server_has_old = '5154731145' in json.dumps(server) if exists else False
    mapping.append({
        'file': path,
        'local_id': wf_id,
        'local_name': name,
        'server_exists': exists,
        'server_active': server.get('active') if exists else None,
        'server_has_old_chat': server_has_old,
    })

with open('/tmp/ai-native-wave4/mapping.json', 'w') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

# 분류
g1 = [m for m in mapping if m['server_exists'] and not m['server_has_old_chat']]  # 서버 최신 (Pull 대상)
g2 = [m for m in mapping if m['server_exists'] and m['server_has_old_chat']]  # 서버·로컬 모두 옛 (별도 PATCH)
g3 = [m for m in mapping if not m['server_exists']]  # 서버에 없음 (고아)

print(f'G1 (서버 최신, Pull): {len(g1)}')
for m in g1: print(f'  {m["file"]} → {m["local_id"]}')
print(f'\nG2 (서버·로컬 모두 옛, PATCH 필요): {len(g2)}')
for m in g2: print(f'  {m["file"]} → {m["local_id"]}')
print(f'\nG3 (서버에 없음, 고아): {len(g3)}')
for m in g3: print(f'  {m["file"]}')
```

### 산출물
`/tmp/ai-native-wave4/mapping.json`

### 결정 포인트
- G1이 예상대로 4~5개 (FA-001/2/3, deadline-alert, WF-GOV-DOCS)
- G2가 몇 개인지 (review-*, weekly-business-report 등)
- G3 고아 파일 발견되면 Phase D로

---

## 4. Phase B — 운영 → 로컬 Pull (30분)

### 목적
G1 그룹을 서버 최신 상태로 덮어쓰기.

### 실행

```python
# /tmp/ai-native-wave4/pull.py
import json, os, urllib.request

N8N_KEY = os.environ['N8N_KEY']
BASE = 'https://n8n.pressco21.com/api/v1'

with open('/tmp/ai-native-wave4/mapping.json') as f:
    mapping = json.load(f)

g1 = [m for m in mapping if m['server_exists'] and not m['server_has_old_chat']]

for m in g1:
    wf_id = m['local_id']
    local_path = f'/Users/jangjiho/workspace/pressco21/{m["file"]}'
    req = urllib.request.Request(f'{BASE}/workflows/{wf_id}',
                                 headers={'X-N8N-API-KEY': N8N_KEY})
    with urllib.request.urlopen(req, timeout=30) as r:
        server = json.loads(r.read())
    # 로컬 파일에 덮어쓰기 (indent=2로 pretty)
    with open(local_path, 'w', encoding='utf-8') as f:
        json.dump(server, f, ensure_ascii=False, indent=2)
    print(f'✅ {m["file"]} ← server ({wf_id})')
```

### 검증
```bash
git diff --stat n8n-automation/
# 각 파일의 변경 범위 확인
git diff n8n-automation/workflows/homepage/FA-001_강사회원_등급_자동변경.json | head -50
# chat_id -5154731145 → -1003980879769
# credentials.id eS5Y → RdFu
# additionalFields.message_thread_id 추가
```

### 예상 결과
- 각 파일에서 `chat_id` 변경
- `credentials.telegramApi.id` 변경
- `additionalFields.message_thread_id` 추가 (FA 계열 `6`, deadline `6`)
- 노드 이름·connections는 불변

### 커밋 분할 (안전)
```bash
git add n8n-automation/workflows/homepage/FA-00[123]*.json
git commit -m "sync: FA 시리즈 로컬 JSON 드리프트 해소 (Wave 3-4 운영 pull)"
git add n8n-automation/workflows/automation/deadline-alert.json
git commit -m "sync: deadline-alert 로컬 드리프트 해소 ([F11] 🎓 Topic)"
git add n8n-automation/workflows/govt-support/WF-GOV-DOCS.json
git commit -m "sync: WF-GOV-DOCS 로컬 드리프트 해소"
```

---

## 5. Phase C — 미처리 WF 별도 조치 (30분)

### 목적
G2 그룹 (서버에도 옛 chat_id 있는 것) 처리.

### 조사 먼저
```bash
# 각 파일의 id가 실제 운영 n8n에 어떤 이름으로 있는지
for f in /tmp/ai-native-wave4/mapping.json; do
    cat $f | python3 -c "
import json, sys
m = json.load(sys.stdin)
for x in m:
    if x['server_exists'] and x.get('server_has_old_chat'):
        print(f\"{x['local_id']}: {x['local_name']} (active={x['server_active']})\")
"
done
```

### 조치 기준
각 WF별로 판단:
- **리뷰 알림 3종** (review-reward-auto/remind-d7/delivery-notify): 현재 카카오 검수 중, 비활성 상태일 가능성 → chat_id만 업데이트, 활성 상태는 건드리지 않음
- **customer-segmentation**: RFM 관련? 운영 `mg2coommaxsyfmf` 테이블 기반일 수 있음. 현재 chat_id 확인 후 🎓 Topic or 장지호 DM 결정
- **weekly-business-report**: S3A-001 (`jS8xZWE6aeVFL8fG`)과 동일 WF인가? 아니면 별개? 운영과 비교 후 결정
- **central-error-handler**: 오류 핸들러, 대표 DM으로 가야 함 (`7713811206`)

### 실행 (조사 후)
```python
# Wave 3-1 migrate.py 패턴 재활용
# credential: 이미 RdFu 아니면 변경 (Wave 3-1에서 빠진 것이라면)
# chat_id: -5154731145 → 적절한 T2 Topic 또는 DM
# PATCH (PUT) 후 로컬 pull
```

**중요**: `-5154731145`는 이제 무효. 다음 중 하나로 변경:
- 일반 알림 → 🎓 Topic (`-1003980879769` + thread=6)
- 주문·재고 → 🛒 Topic (`-1003980879769` + thread=4)
- 긴급 장애 → 🚨 Topic (`-1003980879769` + thread=2)
- 개인 알림 → 장지호 DM (`7713811206`)

각 WF 성격에 맞게 결정 후 PUT → 로컬 pull.

---

## 6. Phase D — 고아 파일 처리 (15분)

### 실행
G3 (서버에 없는 로컬 JSON) 발견 시:

**옵션 1**: `legacy-refs/` 폴더로 이동
```bash
mkdir -p n8n-automation/legacy-refs/
git mv <파일> n8n-automation/legacy-refs/
echo "참조 전용, 운영 사용 금지" >> n8n-automation/legacy-refs/README.md
```

**옵션 2**: 완전 삭제 (대표 승인 필요)
```bash
git rm <파일>
```

**기본 권장**: 옵션 1 (이력 보존)

---

## 7. Phase E — 재발 방지 (15분)

### 조치 1: README 경고
`n8n-automation/README.md` 상단에 추가:
```markdown
## ⚠️ AI Native P1 Wave 3 이후 정책 (2026-04-15~)

**운영 n8n이 정본**. 로컬 JSON은 참조용 + 신규 WF 배포용.

- 기존 WF 수정은 **n8n UI 또는 API 직접**으로 수행
- `deploy.sh` 사용 금지 (기존 WF 수정 시) — Wave 3 결과 롤백 가능
- 예외: 신규 WF 최초 배포만 `deploy.sh` 허용
- 주기적 pull로 로컬 JSON 최신화: `bash _tools/pull-all.sh` (신규 작성 필요)
```

### 조치 2 (선택): `deploy.sh`에 "서버 상태 확인" 게이트
```bash
# PUT 전에 서버 현재 active 상태 + 최근 updatedAt 확인
# 로컬 JSON updatedAt과 비교
# 서버가 더 최신이면 경고 후 confirm
```

선택사항. 시간 있으면 진행, 없으면 README 경고만.

### 조치 3: 주기 pull 스크립트 (선택)
`n8n-automation/_tools/pull-all.sh`:
```bash
# 모든 n8n WF를 GET해서 로컬 정본 폴더에 저장
# 분류: homepage/automation/govt-support/accounting에 따라 배치
```

선택. Wave 4 이후 별도 스프린트.

---

## 8. Phase F — 문서·커밋 (15분)

### 문서 갱신
1. **`pressco21-infra.md`** (글로벌 `~/.claude/pressco21-infra.md` 및 로컬 복사본) — 텔레그램 섹션 전면:
   - 봇 5개 최종 역할
   - 그룹: T1(장지호 DM), T2(**새 supergroup chat_id `-1003980879769`** + Topic thread_id 3: 🚨=2/🛒=4/🎓=6), T3(`-5251214343`), T4(은행 `-5275298126`), T5/T6(Flora 브릿지)
   - credential: 4개 (`1`/`RdFu`/`O6qw`/`RQvO`), `eS5Y` 삭제
2. **`P1-bot-wf-matrix.md` v1.4**: 드리프트 해소 + 최종 매핑표
3. **`P1-telegram-bot-reorganization.md` v2.3**: Wave 4 완료 체크
4. **`memory/ai-native-upgrade.md`**: P1 완료 표시, P2 착수 준비

### 최종 커밋
```bash
git add docs/ai-native-upgrade/ AI_SYNC.md
git commit -m "docs: AI-Native P1 Wave 4 드리프트 해소 + 문서화 완료"
git push origin main
```

---

## 9. 72시간 관찰 (~2026-04-18)

### 확인 항목
- [ ] 🎓 Topic: FA-001/2/3 강사 이벤트 발생 시 도착
- [ ] 🎓 Topic: [F11] 마감 알림 매일 08시 도착
- [ ] 🎓 Topic: WF-CHURN-DETECT 매일 도착
- [ ] 🛒 Topic: STOCK-ALERT 품절 변동 시 도착 (매일 08시)
- [ ] 🛒 Topic: [OMX-NOTIFY-01] 신규 문의 발생 시
- [ ] T3 매출: F22 일일 / F23 통합 / F24 리치(10시) / F25 주간
- [ ] B3 DM: INFRA 3개 아침 건강 리포트 + 정부사업 + HR
- [ ] Flora 개발실 (`-5043778307`) 미수신 확인 (INFRA가 잘못 가지 않음)

### 문제 발생 시
- 백업 롤백: `/tmp/pre-wave3.tar.gz` (서버) + `/tmp/ai-native-wave3/backup/*.json` (로컬)
- 개별 롤백: 각 WF의 백업 JSON으로 PUT

---

## 10. P1 완료 선언 (2026-04-18 이후)

### 체크
- [ ] Phase A~F 완료
- [ ] 72시간 관찰 통과
- [ ] Wave 3/4 체크리스트 전부 ✓
- [ ] 이재혁 과장 TG ID 확보 (아직 미확보면 선언 후 별도 작업)
- [ ] 장준혁 사장 텔레그램 앱 설치 (여유)

### 완료 선언
- `AI_SYNC.md`에 `[AI-Native P1 종료]` 기록
- B3 봇 → 장지호 DM 완료 메시지
- `memory/ai-native-upgrade.md` P1 완료 표기
- METAPROMPT §9 P1 완료
- **Phase P2 인프라 클린업 착수 준비**

---

## 11. 다음 세션 첫 행동 체크리스트

1. [ ] 이 파일 Read (`docs/ai-native-upgrade/P1-Wave4-drift-recovery-plan.md`)
2. [ ] `METAPROMPT.md` §9 진행 상태 확인 (Wave 3 완료 + Wave 4 착수 가능)
3. [ ] `AI_SYNC.md` Last Changes 최근 3건 확인
4. [ ] `memory/ai-native-upgrade.md` 읽기
5. [ ] `git status --short` + `git log --oneline -5` 확인
6. [ ] `.secrets.env`의 `N8N_CRED_TELEGRAM` 값 확인 (`RdFu...`여야 함)
7. [ ] `AI_SYNC.md` Session Lock WRITE 재취득
8. [ ] `mkdir -p /tmp/ai-native-wave4`
9. [ ] **Phase A 매핑 확정부터 시작**

---

## 12. 위험도 · 롤백

| Phase | 위험도 | 롤백 경로 |
|-------|-------|----------|
| A 매핑 | 낮음 (read-only) | 없음 필요 |
| B Pull (로컬 덮어쓰기) | 중 | git revert |
| C PATCH (서버 수정) | **높음** | `/tmp/pre-wave3.tar.gz` 서버 백업 또는 각 WF 개별 GET 백업 선행 |
| D 고아 파일 이동 | 낮음 | git revert |
| E README 경고 | 낮음 | git revert |
| F 문서화 | 낮음 | git revert |

**Phase C 진입 전**: 반드시 각 대상 WF의 `curl GET` 결과를 `/tmp/ai-native-wave4/backup-c/` 에 저장한 뒤 PATCH 진행.

---

## 13. 성공 기준

- [ ] 로컬 11 파일에서 `-5154731145` 0건 (`grep -r "5154731145" n8n-automation/ | wc -l`)
- [ ] 로컬 JSON의 credential 참조가 전부 `RdFu3nsFuuO5NCff` (eS5Y 없음)
- [ ] `bash n8n-automation/_tools/deploy.sh <임의 WF_ID> <해당 로컬 JSON> --dry-run`이 서버와 동일한 PUT body 생성 (롤백 위험 제로)
- [ ] Wave 4 문서 4종 갱신 + 커밋
- [ ] 72시간 관찰 통과
- [ ] P1 완료 선언
