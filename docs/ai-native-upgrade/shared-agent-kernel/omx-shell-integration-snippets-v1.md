# OMX Shell Integration Snippets v1

> 목적: 실제 OMX runtime call-site에서 founder-facing output layer를 붙일 때 바로 복사해 쓸 수 있는 shell snippet을 제공한다.

## 준비
```bash
source _tools/omx-founder-facing-lib.sh
```

---

## 1. Team meeting synthesis 결과 출력
```bash
source _tools/omx-founder-facing-lib.sh

FINDINGS='[
  {"agent_id":"han-jihoon-cso","heading":"한지훈님 종합","text":"같은 직원 정체성은 유지하되 런타임 역할은 나누는 구조가 가장 현실적입니다."},
  {"agent_id":"park-seoyeon-cfo","heading":"박서연님 관점","text":"공통 계약 없이 병렬 구현을 밀면 유지비가 커집니다."}
]'
RISKS='["실제 runtime wrapper는 아직 미구현입니다."]'
NEXT='["Claude는 continuity를 정리합니다.","OMX는 founder-facing output wrapper를 구현합니다."]'

omx_emit_team_meeting "han-jihoon-cso" \
  "지금은 shared-kernel 계약을 먼저 고정한 뒤 Claude와 OMX adapter를 병렬 구현하는 방향이 가장 안전합니다." \
  "$FINDINGS" "$RISKS" "$NEXT"
```

---

## 2. Verification 결과 출력
```bash
source _tools/omx-founder-facing-lib.sh
CHECKS='["SessionStart/Stop 훅 존재","shared-kernel roster 참조","handoff contract 사용"]'
RISKS='["Stop 훅 async"]'
NEXT='["save handoff를 운영 기준으로 본다"]'

omx_emit_verification "choi-minseok-cto" \
  "Claude-side continuity 구조는 shared-kernel 계약과 크게 충돌하지 않습니다." \
  "$CHECKS" "$RISKS" "$NEXT"
```

---

## 3. Handoff 결과 출력
```bash
source _tools/omx-founder-facing-lib.sh
PARTICIPANTS='["yoon-haneul-pm","han-jihoon-cso"]'
CHECKS='["canonical roster 기준 정렬","handoff contract 기준 확인"]'
RISKS='["실제 runtime wrapper는 아직 미구현입니다."]'
NEXT='["team meeting / verification 출력에 이 규격을 적용합니다."]'

omx_emit_handoff "yoo-junho-paircoder" \
  "founder-facing output wrapper 규격 초안을 만들었습니다." \
  "$PARTICIPANTS" "$CHECKS" "$RISKS" "$NEXT"
```

---

## 4. Execution report 출력
```bash
source _tools/omx-founder-facing-lib.sh
CHECKS='["renderer가 canonical roster를 읽고 display_name으로 출력함","4종 context를 지원함"]'
RISKS='["실제 runtime touchpoint 연결은 아직 남아 있습니다."]'
NEXT='["실제 OMX output wrapper 적용 지점을 정리합니다."]'

omx_emit_execution_report "yoo-junho-paircoder" \
  "OMX founder-facing output formatter 프로토타입과 smoke fixtures를 추가했습니다." \
  "$CHECKS" "$RISKS" "$NEXT"
```

---

## 5. Claude latest handoff 브리징
```bash
source _tools/omx-founder-facing-lib.sh
omx_emit_latest_handoff --latest-claude
```

---

## 언제 이걸 쓰나
- 실제 OMX 내부 코드/스크립트가 결과를 생성한 직후
- founder-facing 결과를 보여주기 직전
- smoke/demo 중간 단계에서 결과 형식을 확인할 때
