# OMX Live Wrapper Runbook v1

> 목적: OMX 쪽 founder-facing output layer를 실제로 확인하거나 데모할 때, 입력 형식에 따라 적절한 wrapper를 자동 선택하는 최소 실행 절차를 정의한다.

## 결론
지금 시점에서는 **Claude를 더 밀기보다 OMX 쪽 live wrapper 흐름을 먼저 마무리하는 것이 낫다.**

이유:
1. Claude-side continuity / named-agent / save-resume는 이미 충분히 성숙했다.
2. 현재 가장 큰 병목은 OMX가 실제로 같은 회사 직원 이름으로 live output을 내보내는 것이다.
3. Claude를 더 전진시키면 shared-kernel 대비 OMX가 뒤처져 drift 관리 부담이 커질 수 있다.

---

## Claude에 지금 권할 상태
현재는 Claude에 새 구현 작업을 더 주기보다 **대기 / 보류 / 필요한 시점에 /save만 유지**하는 것이 좋다.

추천 메모:
- 현재는 OMX founder-facing live wrapper 정리 단계이므로 Claude는 새 구조 변경 없이 대기
- 의미 있는 변화가 생기면 `/save`로 handoff만 갱신

---

## live wrapper 명령

### 1. Claude latest handoff를 founder-facing 브리핑으로 보기
```bash
bash _tools/omx-founder-facing-live.sh --latest-claude
```

### 2. team latest handoff를 founder-facing 브리핑으로 보기
```bash
bash _tools/omx-founder-facing-live.sh --latest-team
```

### 3. structured JSON fixture를 founder-facing 출력으로 보기
```bash
bash _tools/omx-founder-facing-live.sh --input docs/ai-native-upgrade/shared-agent-kernel/fixtures/team-meeting-sample.json
bash _tools/omx-founder-facing-live.sh --input docs/ai-native-upgrade/shared-agent-kernel/fixtures/verification-sample.json
bash _tools/omx-founder-facing-live.sh --input docs/ai-native-upgrade/shared-agent-kernel/fixtures/handoff-sample.json
bash _tools/omx-founder-facing-live.sh --input docs/ai-native-upgrade/shared-agent-kernel/fixtures/execution-report-sample.json
```

---

## 입력 규칙
- `.json` → `omx-founder-facing-render.py`
- `.md` → `omx-latest-handoff-bridge.py`

즉, 실제 latest handoff든 fixture JSON이든 하나의 명령으로 founder-facing output을 확인할 수 있다.

---

## 권장 순서
1. `--latest-claude`로 실제 handoff continuity 브리핑 확인
2. fixture 4종으로 team meeting / verification / handoff / execution report 확인
3. live wrapper를 어떤 runtime touchpoint에 연결할지 결정
4. 그 다음에야 Claude-side 추가 polish를 검토

---

## 현재 추천 운영 판단
### 지금은 OMX부터 마무리하는 게 맞다.
- Claude는 이미 충분히 앞서 있다.
- OMX founder-facing output layer가 live-like 수준으로 안정되면, 그 다음 Claude 추가 refinement가 의미 있다.
