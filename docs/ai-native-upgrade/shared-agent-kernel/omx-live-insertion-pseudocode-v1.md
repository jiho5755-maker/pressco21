# OMX Live Insertion Pseudocode v1

> 목적: 실제 OMX 결과 흐름에 founder-facing live wrapper를 연결할 때, 각 touchpoint에서 어떤 데이터를 만들고 어떤 순서로 wrapper를 호출하면 되는지 pseudo-implementation 수준으로 정리한다.

## 공통 원칙
- 내부 reasoning / lane / role execution은 그대로 유지한다.
- 최종 사용자에게 출력하기 직전에만 founder-facing wrapper를 적용한다.
- structured payload는 **alias-friendly**하게 만들어도 되며, live wrapper가 normalize 후 render한다.
- shared-kernel contract는 수정하지 않는다.

---

## Pattern 1 — Team meeting synthesis

### 내부 상태 (예시)
- internal role outputs: architect / critic / analyst / verifier
- company owner: `han-jihoon-cso`
- contributor views: `park-seoyeon-cfo`, `choi-minseok-cto`

### pseudo-implementation
```bash
TEAM_JSON=$(cat <<'JSON'
{
  "type": "team_meeting",
  "owner": "han-jihoon-cso",
  "details": [
    {
      "agent_id": "han-jihoon-cso",
      "heading": "한지훈님 종합",
      "text": "같은 직원 정체성은 유지하되, 런타임 내부 역할은 나누는 구조가 가장 현실적입니다."
    },
    {
      "agent_id": "park-seoyeon-cfo",
      "heading": "박서연님 관점",
      "text": "공통 계약 없이 병렬 구현을 밀면 유지비가 커집니다."
    },
    {
      "agent_id": "choi-minseok-cto",
      "heading": "최민석님 관점",
      "text": "shared-kernel이 먼저 있어야 이후 wrapper와 continuity가 drift 없이 맞물립니다."
    }
  ],
  "summary": "지금은 shared-kernel 계약을 먼저 고정한 뒤 Claude와 OMX adapter를 병렬 구현하는 방향이 가장 안전합니다.",
  "risk": ["실제 runtime wrapper는 아직 미구현입니다."],
  "next": ["Claude는 continuity를 정리합니다.", "OMX는 founder-facing output wrapper를 구현합니다."]
}
JSON
)

printf '%s' "$TEAM_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

### 기대 결과
- `## 팀 회의 종합`
- `### 결론`
- `### 한지훈님 종합`
- `### 박서연님 관점`
- `### 최민석님 관점`
- `### 다음 단계`

---

## Pattern 2 — Verification summary

### 내부 상태 (예시)
- verifier finished
- owner: `choi-minseok-cto`
- technical checks list

### pseudo-implementation
```bash
VERIFY_JSON=$(cat <<'JSON'
{
  "type": "verification",
  "owner": "choi-minseok-cto",
  "checks": [
    "SessionStart/Stop 훅 존재",
    "shared-kernel roster 참조",
    "handoff contract 사용"
  ],
  "risk": ["Stop 훅 async"],
  "next": ["/save handoff를 운영 기준으로 본다"],
  "summary": "Claude-side continuity 구조는 shared-kernel 계약과 크게 충돌하지 않습니다."
}
JSON
)

printf '%s' "$VERIFY_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

### 기대 결과
- `## 최민석님 검증 메모`
- 결론 / 확인한 것 / 남은 리스크 / 다음 단계

---

## Pattern 3 — Handoff export

### A. 기존 latest.md가 이미 있을 때
```bash
bash _tools/omx-founder-facing-live.sh --input team/handoffs/latest.md
```

### B. structured payload에서 직접 생성할 때
```bash
HANDOFF_JSON=$(cat <<'JSON'
{
  "type": "handoff",
  "owner": "yoo-junho-paircoder",
  "participants": ["yoon-haneul-pm", "han-jihoon-cso"],
  "summary": "founder-facing output wrapper 규격 초안을 만들었습니다.",
  "checks": ["canonical roster 기준 정렬", "handoff contract 기준 확인"],
  "risk": ["실제 runtime wrapper는 아직 미구현입니다."],
  "next": ["team meeting / verification 출력에 이 규격을 적용합니다."]
}
JSON
)

printf '%s' "$HANDOFF_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

### 기대 결과
- `## OMX 실행실 handoff`
- 담당 / 참여 / 요약 / 확인 / 리스크 / 다음

---

## Pattern 4 — Execution completion report

### 내부 상태 (예시)
- long-running task complete
- owner: `yoo-junho-paircoder`
- verification and next steps available

### pseudo-implementation
```bash
REPORT_JSON=$(cat <<'JSON'
{
  "type": "execution_report",
  "owner": "yoo-junho-paircoder",
  "summary": "OMX founder-facing output formatter 프로토타입과 smoke fixtures를 추가했습니다.",
  "checks": [
    "renderer가 canonical roster를 읽고 display_name으로 출력함",
    "4종 context를 지원함"
  ],
  "risk": ["실제 runtime touchpoint 연결은 아직 남아 있습니다."],
  "next": ["실제 OMX output wrapper 적용 지점을 정리합니다."]
}
JSON
)

printf '%s' "$REPORT_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

### 기대 결과
- `## 유준호님 실행 보고`
- 무엇을 했는가 / 확인한 것 / 남은 위험 / 다음 행동

---

## insertion discipline

### Do
- output 직전 stage에서만 wrapper 적용
- alias-friendly JSON 허용
- canonical name은 renderer/bridge가 책임짐
- smoke runner로 검증 후 연결

### Don't
- 내부 role 결과 자체를 founder-facing 본문에 그대로 노출
- shared-kernel contract에 runtime-specific 필드 추가
- call-site마다 제각각 다른 출력 구조를 유지

---

## done 기준
- 위 4개 pattern 중 적어도 1개 실제 call-site에 연결
- 연결된 call-site output을 `omx-cross-runtime-smoke.sh` 또는 동등 flow로 재검증
- founder-facing 본문 첫 3줄 안에 canonical 이름 또는 `팀 회의` 표시
