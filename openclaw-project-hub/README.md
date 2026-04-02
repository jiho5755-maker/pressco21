# PRESSCO21 OpenClaw Project Hub

이 폴더는 PRESSCO21의 OpenClaw/원가/중앙상품마스터 프로젝트 관련 자료를 `복사본 기준`으로 한 곳에 모아둔 허브다.

원본 파일은 그대로 두었고, 이 폴더는 `참고/정리/작업 시작점`으로 쓰면 된다.

## 어디부터 보면 되는가

가장 먼저 열 파일:

- 작업용 중앙 마스터: [05_workbooks/pressco21-central-product-master.working.xlsx](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/05_workbooks/pressco21-central-product-master.working.xlsx)
- 중앙 마스터 운영 설계: [03_openclaw_docs/openclaw-pressco21-central-product-master-plan.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/openclaw-pressco21-central-product-master-plan.ko.md)
- 원가 정책 기준: [03_openclaw_docs/openclaw-pressco21-cost-policy.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/openclaw-pressco21-cost-policy.ko.md)
- 원산지증명/관세 점검: [03_openclaw_docs/openclaw-pressco21-import-duty-origin-audit.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/openclaw-pressco21-import-duty-origin-audit.ko.md)

## 폴더 구조

- `01_raw_sources`
  - 원시 자료 복사본
  - 중국 사입 샘플리스트, 2025 수입서류, 사방넷 자료, 기존 통합 엑셀
- `02_pressco21_docs`
  - 회사 내부 기획/전략/운영 문서 복사본
- `03_openclaw_docs`
  - OpenClaw 설계, 원가정책, 중앙 마스터 설계, 감사 문서
- `04_reference_json`
  - OpenClaw 예시 입력/기준 JSON
- `05_workbooks`
  - 실제 작업용 엑셀
- `06_scripts`
  - 원가 계산, 마스터 생성, OpenClaw 연동 스크립트

## 문서 읽기 원칙

직원이나 외부 협업자가 `03_openclaw_docs`를 볼 때는 아래 순서만 따르면 된다.

1. `current`: 지금 기준으로 실제 운영/개발에 쓰는 문서
2. `reference`: 아직 참고 가치가 있는 설계/정책 문서
3. `archive`: 과거 실험, 복구 메모, 설문 원본

문서 분류표:

- [03_openclaw_docs/README.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/README.md)

중요:

- 직원은 기본적으로 `current` 문서만 보면 된다
- `archive` 문서는 과거 판단 배경을 남겨두기 위한 보관본이지, 현재 기준 문서가 아니다

## 현재 권장 Telegram 구조

- 메인 비서 `@pressco21_openclaw_bot`는 서버 `flora-frontdoor`가 받는다
- 개발 요청은 서버 dispatcher가 로컬 `flora-local-dev-worker` 큐로 넘긴다
- 로컬 `run-flora-telegram-room-router.js`는 메인 플로라 복구 경로가 아니라 `전용 dev bot용 legacy 도구`로 본다

관련 문서:

- [flora-frontdoor-local-dev-worker-setup.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-local-dev-worker-setup.ko.md)
- [flora-specialist-routing-policy.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-specialist-routing-policy.ko.md)
- [flora-frontdoor-executive-brief.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-executive-brief.ko.md)
- [flora-frontdoor-tuning-log.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-tuning-log.ko.md)
- [flora-orchestration-service-master-plan.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-master-plan.ko.md)
- [flora-orchestration-service-prd.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-prd.ko.md)
- [flora-frontdoor-task-ledger-phase1-spec.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-task-ledger-phase1-spec.ko.md)

## 플로라 기획 기준 문서

플로라를 `대표 비서 -> 팀 업무 오케스트레이터 -> Telegram Mini App 기반 운영실장 서비스`로 키우는 현재 상위 기준 문서는 아래다.

- [flora-orchestration-service-master-plan.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-master-plan.ko.md)
- [flora-orchestration-service-prd.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-prd.ko.md)
- [flora-frontdoor-task-ledger-phase1-spec.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-task-ledger-phase1-spec.ko.md)

이 문서는 기존 OpenClaw Project B 문서, frontdoor 운영 문서, Mac harness PRD, todo 확장 방향을 한 번에 교통정리하는 목적의 마스터 플랜이다.  
현재 구현은 `마스터 플랜 -> PRD -> Phase 1 구현 스펙` 순서로 읽는 것을 기준으로 한다.

문서 운영 원칙:

- 플로라 제품 PRD는 [flora-orchestration-service-prd.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-prd.ko.md) 하나를 기준으로 유지한다
- 모바일 중심 운영, 메일 자동화, Mini App, 개발 지휘는 모두 이 통합 PRD 안에서 다룬다
- 추가 문서가 필요하면 새 PRD를 만드는 대신 `Phase spec` 또는 `Feature spec`으로만 내린다

Phase 1 개발 시작점:

- frontdoor 적재 릴레이 스크립트: [relay-flora-frontdoor-intake.py](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/06_scripts/relay-flora-frontdoor-intake.py)

## 실무용 시작 순서

1. [05_workbooks/pressco21-central-product-master.working.xlsx](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/05_workbooks/pressco21-central-product-master.working.xlsx) 열기
2. `입력설명` 시트 읽기
3. `상품마스터_작업` 시트에서 노란칸만 수정
4. 초록칸 `예상COGS / 예상원가율 / 예상마진율 / 판정` 확인
5. 확정되면 `검증완료`를 `Y`로 변경

## 중요한 기준

- `드라이 리프`는 현재 2025 서류 기준 `3.6%`
- `드라이 컷 플라워`는 현재 2025 서류 기준 `25%`
- 쿠팡 광고비는 현재 `15%` 고정
- 자사몰/스마트스토어 광고비는 아직 고정하지 않음

## 원본 출처

이 허브에 복사한 주요 원본 위치:

- `/Users/jangjiho/Downloads/SKU마스터_통합데이터.xlsx`
- `/Users/jangjiho/Downloads/1688-SKU-메이크샵_연계마스터.xlsx`
- `/Users/jangjiho/Downloads/품번코드매핑관리_수정파일.xlsx`
- `/Users/jangjiho/Desktop/프레스코21/제품 단가 샘플리스트`
- `/Users/jangjiho/Desktop/프레스코21/우리무역/2025년서류`
- `/Users/jangjiho/Desktop/프레스코21/사방넷`
- `/Users/jangjiho/workspace/pressco21/docs`
- `/Users/jangjiho/workspace/pressco21/company-knowledge`
- `/Users/jangjiho/workspace/OMX(오_마이_코덱스)/oh-my-codex/docs`
- `/Users/jangjiho/workspace/OMX(오_마이_코덱스)/oh-my-codex/output/spreadsheet`
- `/Users/jangjiho/workspace/OMX(오_마이_코덱스)/oh-my-codex/scripts`

## 메모

이 허브는 앞으로 계속 확장하면 된다. 새 문서나 새 엑셀이 생기면 원본 위치에만 두지 말고, 이 허브에도 복사본을 추가하는 운영이 맞다.
