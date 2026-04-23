# Shared Agent Bridge Runbook v1

> 목적: Claude 작업실과 OMX 작업실 사이의 공유 계약 문서와 handoff artifact를 최소한의 수동 개입으로 동기화하기 위한 운영 절차를 정리한다.

## 핵심 명령

### 상태 확인
```bash
bash _tools/shared-agent-bridge.sh status
```
- Claude worktree 위치
- latest handoff 존재 여부
- placeholder 여부
- 현재 shared-kernel 문서 존재 여부를 한 번에 확인

### shared-kernel docs를 Claude 작업실로 동기화
```bash
bash _tools/shared-agent-bridge.sh sync-to-claude
```

### Claude 작업실 산출물을 현재 workspace reference docs로 가져오기
```bash
bash _tools/shared-agent-bridge.sh pull-from-claude
```

### 한 번에 다 하기
```bash
bash _tools/shared-agent-bridge.sh sync-all
```

---

## 권장 운영 흐름

### A. shared-kernel 문서가 진척되었을 때
1. `bash _tools/shared-agent-bridge.sh sync-to-claude`
2. 필요 시 Claude에 짧게 “계속 진행”만 전달

### B. Claude가 의미 있는 handoff나 examples를 남겼을 때
1. `bash _tools/shared-agent-bridge.sh pull-from-claude`
2. OMX/Codex에서 review 및 follow-up 진행

### C. 작업 전 전체 상태 확인
1. `bash _tools/shared-agent-bridge.sh status`
2. latest handoff가 placeholder면 Claude에서 `/save`를 한 번 더 실행하는 것이 좋음

---

## 이 runbook의 목적
- 긴 프롬프트를 매번 수동 작성하지 않기
- shared-kernel docs와 Claude 산출물을 반복적으로 안전하게 동기화하기
- founder-facing continuity 품질을 안정적으로 유지하기
