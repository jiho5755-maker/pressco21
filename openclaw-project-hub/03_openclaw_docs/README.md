# OpenClaw Docs Guide

`03_openclaw_docs`는 이제 `current / reference / archive` 관점으로 읽는다.

## Current

지금 운영과 개발의 기준으로 직접 쓰는 문서다.

- [flora-orchestration-service-master-plan.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-master-plan.ko.md)
- [flora-orchestration-service-prd.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-prd.ko.md)
- [flora-frontdoor-task-ledger-phase1-spec.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-task-ledger-phase1-spec.ko.md)
- [flora-frontdoor-executive-brief.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-executive-brief.ko.md)
- [flora-frontdoor-local-dev-worker-setup.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-local-dev-worker-setup.ko.md)
- [flora-frontdoor-tuning-log.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-tuning-log.ko.md)

권장 읽기 순서:

1. 마스터 플랜
2. 통합 PRD
3. Phase 1 스펙
4. 운영 브리프
5. 설치/튜닝 문서

## Reference

현행 기준은 아니지만 현재 설계를 이해하거나 확장할 때 참고하는 문서다.

- 회사 구조/정책/상태 모델
  - `company-*`
- 플로라 라우팅/운영 가이드
  - [flora-specialist-routing-policy.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-specialist-routing-policy.ko.md)
  - [flora-operating-modes-guide.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-operating-modes-guide.ko.md)
- 기존 OpenClaw Project B 문서
  - `openclaw-project-b-*`
  - [openclaw-flora-mac-copilot-harness-prd.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/openclaw-flora-mac-copilot-harness-prd.ko.md)
- 중앙상품마스터/원가 정책 문서
  - `openclaw-pressco21-*`
- 실험 보류 중인 자동화 참고
  - [kakaotalk-local-send-automation-architecture.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/kakaotalk-local-send-automation-architecture.ko.md)
  - [kakaotalk-open-window-send-guide.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/kakaotalk-open-window-send-guide.ko.md)

## Archive

현재 운영 기준에서 빠진 문서다. 삭제하지 않고 보관만 한다.

- legacy Flora/Telegram 운영 문서
  - [archive/legacy-flora/](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/archive/legacy-flora)
- 과거 설문 원본과 RTF
  - [archive/questionnaires/](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/archive/questionnaires)

원칙:

- 새 기준 문서는 root `03_openclaw_docs`에 둔다
- 과거 문서를 다시 살릴 일이 생기면 `archive`에서 꺼내 검토하되, 바로 current로 복귀시키지 않는다
- 새 기능 문서는 통합 PRD의 하위 `phase spec` 또는 `feature spec`으로만 추가한다
