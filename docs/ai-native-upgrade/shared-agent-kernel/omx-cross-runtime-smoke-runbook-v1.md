# OMX Cross-Runtime Smoke Runbook v1

> 목적: Claude 작업실과 OMX 작업실의 최신 shared-agent ecosystem 상태를 최소한의 수동 개입으로 한 번에 점검하는 실행 절차를 정의한다.

## 명령
```bash
bash _tools/omx-cross-runtime-smoke.sh
```

## 이 명령이 하는 일
1. `shared-agent-bridge.sh sync-all` 실행
   - shared-kernel 문서를 Claude worktree로 sync
   - Claude 산출물을 현재 workspace reference로 pull
   - latest handoff 상태 확인
2. Claude latest handoff를 founder-facing 브리핑으로 변환
3. OMX fixture 4종(team meeting / verification / handoff / execution report) founder-facing 출력 생성
4. canonical 이름 존재 / runtime-role 헤더 억제 / next-step 섹션 존재 여부 검증
5. Claude founder-facing output example 파일 존재 및 headline pattern 확인

## 언제 쓰나
- Claude가 의미 있는 `/save` 또는 handoff를 남긴 뒤
- OMX 쪽 wrapper/formatter를 수정한 뒤
- cross-runtime 상태를 한 번에 점검하고 싶을 때

## Pass 조건
- latest Claude handoff가 bridge를 통해 founder-facing 브리핑으로 변환됨
- OMX fixture 4종이 canonical 이름과 next-step을 포함함
- runtime generic role이 founder-facing 헤더에 직접 노출되지 않음
- Claude founder-facing example 파일이 존재함

## Fail/Warn 해석
- **latest handoff missing**: Claude 쪽 `/save` 또는 handoff 생성 확인 필요
- **placeholder latest handoff**: Claude가 Stop 훅 자동 생성본만 남긴 상태일 수 있음 → `/save` 한 번 더 필요
- **runtime role heading 노출**: OMX formatter/bridge가 아직 founder-facing output 규격을 완전히 따르지 못함
- **Claude example file missing**: Claude-side example artifact 위치 확인 필요

## 목적
이 runbook은 “네가 직접 긴 프롬프트를 중계하지 않아도 되는 상태”로 가는 중간 단계다. 결과를 한 번에 확인하고 다음 작업 방향을 결정하는 데 사용한다.
