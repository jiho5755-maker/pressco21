# 직접거래 CRM 거버넌스 고도화 실행 프롬프트

- 작성일: 2026-04-30
- 대상 워크트리: `/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-shipment-payment-governance-prd`
- 대상 브랜치: `work/offline-crm/shipment-payment-governance-prd`
- 핵심 PRD: `offline-crm-v2/docs/PRD-direct-trade-governance-2026-04-30.md`

---

## 복사용 시작 문구

아래 문구를 새 작업 세션에 그대로 붙여넣어 사용한다.

```text
현재 워크트리에서 PRD 기준 직접거래 CRM 고도화 작업을 끝까지 진행해줘.

작업 위치:
- /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-shipment-payment-governance-prd
- 브랜치: work/offline-crm/shipment-payment-governance-prd

반드시 먼저 읽을 문서:
- AGENTS.md
- offline-crm-v2/AGENTS.md
- offline-crm-v2/docs/PRD-direct-trade-governance-2026-04-30.md
- offline-crm-v2/docs/prompts/direct-trade-governance-omx-execution-prompt-2026-04-30.md

핵심 목표:
- PRD 기준으로 직접거래 CRM 고도화 기능을 구현한다.
- 단순 구현이 아니라 build/lint/E2E/브라우저 실검증까지 AI가 끝까지 맡는다.
- 각 작업 단위마다 handoff를 남겨, 중간에 오류/충돌/실패가 생겨도 다음 세션이나 다른 전문가가 바로 이어받아 해결할 수 있게 한다.

진행 방식:
1. 먼저 PRD를 기준으로 작업을 세부 태스크로 나눈다.
2. 각 태스크는 반드시 다음 순서로 진행한다.
   - 목표 정의
   - 관련 파일 확인
   - 구현
   - 로컬 검증
   - 브라우저 실검증 또는 검증 불가 사유 기록
   - 문제/리스크 기록
   - 작업별 handoff 작성
   - 필요 시 커밋
3. 한 번에 너무 많은 기능을 섞지 말고, 문제 추적이 가능하도록 태스크별로 작게 완결한다.
4. 각 태스크 완료 후 `team/handoffs/**` 아래에 추적 가능한 handoff를 남긴다.
5. 문제가 생긴 태스크는 “실패/보류 handoff”를 남기고, 원인/시도한 해결/다음 해결책을 구체적으로 기록한다.

전문가 팀 운영:
- 한지훈님: 요구사항/우선순위/누락 기능 검토
- 박서연님: 수금, 예치금, 환불, 세금계산서 금액 기준 검토
- 김도현님: 실제 운영자 업무 흐름/월말정리 관점 검토
- 최민석님: 아키텍처, 상태 모델, 데이터 안정성 검토
- 정유나님: UX/UI, 상태 배지, 업무함, 입금수집함 처리 흐름 검토
- 조현우님: 돈/세금/감사로그/롤백/보안 리스크 검토
- 유준호님: 단위/통합/E2E/브라우저 검증 설계 및 실행

가능하면 전문가 역할을 병렬로 활용해라.
단, 같은 파일을 동시에 수정하지 말고, 역할별로 읽기 검토/구현/검증 범위를 분리해라.
최종 판단과 통합 책임은 현재 작업 세션이 가진다.

권장 작업 분해:
- Task 0: 현재 구현 상태와 PRD 차이 분석
- Task A: 공통 상태 모델/tradeGovernance 보강
- Task B: 명세표 화면 상태 배지/완납 미확정 dry-run 고도화
- Task C: 출고확정 apply/verify 설계 및 승인 대기형 구현
- Task D: 후속입금 예정/출고완료 미수 상태 표시 강화
- Task E: 직접거래 업무함 기초 화면 구현
- Task F: 입금수집함 수동 완료/제외/보류 UX 및 안전장치 구현
- Task G: 월말점검 기초 화면 구현
- Task H: 감사 이벤트/governanceEvents 보존 및 표시 검토
- Task I: Playwright E2E/브라우저 실검증
- Task J: 최종 handoff, 커밋, push, main 병합 가능성 보고

각 Task handoff 필수 내용:
- handoff_id
- branch
- task_name
- task_goal
- changed_artifacts
- decisions
- verification
- browser_evidence
- open_risks
- blockers
- next_step
- files_to_inspect_next
- rollback_or_recovery_note
- learn_to_save

handoff 작성 방식:
- 각 태스크 완료 또는 실패 시 아래 방식 중 하나로 handoff를 남긴다.
  - 권장 helper:
    bash _tools/pressco21-handoff.sh "<요약>" "<다음 작업>" --risk "<리스크>" --label "<태스크명>"
  - 또는 직접 `team/handoffs/**/latest.md`와 태스크별 archive 파일을 작성한다.
- helper를 사용하더라도 task별 상세 내용이 부족하면 별도 md 파일을 추가한다.
- handoff는 output/ 폴더만 쓰지 말고 반드시 git 추적 가능한 `team/handoffs/**` 아래에 남긴다.

문제 발생 시 규칙:
1. 빌드 실패:
   - 실패 로그 요약
   - 원인 후보
   - 수정한 파일
   - 재검증 결과
   - 아직 실패하면 blocker handoff 작성
2. E2E 실패:
   - 실패 테스트명
   - 재현 경로
   - 스크린샷/trace 위치
   - 원인
   - 수정 또는 보류 사유
3. 브라우저 실검증 실패:
   - URL
   - 클릭 경로
   - 기대 결과
   - 실제 결과
   - 캡처/로그 위치
4. 데이터 write가 필요한 경우:
   - 실제 apply 금지
   - dry-run 리포트까지만 작성
   - apply 승인 대기 handoff 작성
5. 세금/돈 관련 애매함:
   - 자동 처리 금지
   - 조현우님/박서연님 관점으로 리스크 정리
   - 승인 필요 상태로 보류

절대 지켜야 할 안전 원칙:
- secrets 파일 수정 금지
- `.secrets`, `.secrets.env`, `.env.local` 값 출력 금지
- 강제 push/reset hard 금지
- main 직접 커밋 금지
- 운영 데이터 대량 변경 금지
- 돈/세금/출고 상태 변경은 반드시:
  fresh read → dry-run → confirm → apply → verify
- 실제 운영 데이터 apply는 별도 사용자 승인 전까지 하지 않는다.
- 초과입금은 매출이 아니라 예치금/환불대기로 분리한다.
- 세금계산서 금액은 입금액이 아니라 명세표 품목/공급가액/세액/합계 기준이다.
- 동명이인/가족명의/플랫폼 정산 입금은 자동반영 금지다.

검증 필수:
- npm run build
- npm run lint
- 필요한 Playwright E2E 작성/수정 후 실행
- 브라우저에서 핵심 화면 실검증
  - 명세표 목록
  - 완납 미확정 점검
  - 후속입금 상태
  - 직접거래 업무함
  - 입금수집함
  - 월말점검
- 검증 결과는 각 Task handoff와 최종 보고에 남긴다.

커밋 규칙:
- 큰 작업 하나로 몰아 커밋하지 말고, 의미 있는 태스크 단위로 커밋한다.
- 커밋 전:
  - git status --short
  - bash _tools/pressco21-check.sh
  - 관련 build/lint/test 확인
- 커밋 메시지는 한국어로 간결하게 작성한다.
- 커밋 후 push한다.

최종 보고 형식:
- 구현 완료 기능
- 변경 파일
- 태스크별 handoff 경로
- build/lint/E2E/브라우저 검증 결과
- 실제 운영 데이터 apply 대기 항목
- 남은 리스크
- branch
- commit 목록
- push 여부
- main 병합 가능 여부
- 다음 세션이 바로 시작할 작업
```

---

## 터미널 이동 명령어

```bash
cd /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-shipment-payment-governance-prd
git branch --show-current
git status --short
```

브랜치가 다르게 보이면 다음을 확인한다.

```bash
git fetch origin
git switch work/offline-crm/shipment-payment-governance-prd
git pull --ff-only
```

---

## 운영 참고

이 프롬프트의 핵심은 “한 번에 끝내라”가 아니라 “작업 단위마다 복구 가능한 기록을 남기며 끝까지 검증하라”이다. 특히 돈/세금/출고/입금 처리 기능은 실제 운영 데이터 변경 전 반드시 dry-run과 승인 대기 handoff를 남겨야 한다.
