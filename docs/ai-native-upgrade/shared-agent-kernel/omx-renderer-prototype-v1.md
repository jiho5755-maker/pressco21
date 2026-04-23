# OMX Renderer Prototype v1

> 목적: `_tools/omx-founder-facing-render.py`를 사용해 founder-facing output wrapper를 실제로 시연하고 smoke test에 활용한다.

## 사용법

### Team meeting
```bash
python3 _tools/omx-founder-facing-render.py \
  --input docs/ai-native-upgrade/shared-agent-kernel/fixtures/team-meeting-sample.json
```

### Verification
```bash
python3 _tools/omx-founder-facing-render.py \
  --input docs/ai-native-upgrade/shared-agent-kernel/fixtures/verification-sample.json
```

### Handoff
```bash
python3 _tools/omx-founder-facing-render.py \
  --input docs/ai-native-upgrade/shared-agent-kernel/fixtures/handoff-sample.json
```

## 목적
- canonical roster lookup이 실제로 founder-facing 이름을 잘 뽑는지 확인
- 내부 generic role 없이도 UX가 자연스러운지 확인
- 나중에 실제 runtime wrapper 구현 전에 sample output을 빠르게 검증
