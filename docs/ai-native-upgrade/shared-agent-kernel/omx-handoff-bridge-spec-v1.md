# OMX Handoff Bridge Spec v1

> 목적: `team/handoffs/latest.md` 같은 최신 handoff artifact를 founder-facing continuity 브리핑으로 변환하는 adapter-local bridge 규격을 정의한다.

## 왜 필요한가
현재 Claude `latest.md`는 Stop 훅 자동 생성본일 수 있으며, 다음 특징을 가진다.
- `owner_agent_id`가 canonical id가 아닐 수 있음 (`Explore` 등)
- `contributors`가 adapter-local label일 수 있음
- summary / next_step / open_risks가 placeholder일 수 있음

따라서 OMX는 shared-kernel contract를 건드리지 않고, **adapter-local normalization**을 거쳐 founder-facing 브리핑으로 바꿔야 한다.

---

## bridge 역할
1. handoff frontmatter 읽기
2. adapter-local agent label 정규화
3. canonical roster display_name 조회
4. placeholder 필드 감지
5. founder-facing continuity 브리핑 렌더링

---

## 입력
- markdown handoff file (`team/handoffs/latest.md`)
- YAML frontmatter 필드

## 출력
- founder-facing markdown briefing
  - 담당
  - 참여
  - 작업실
  - 요약
  - 다음
  - 리스크
  - 확인
  - 승격 후보
  - 주의(정규화/placeholder 감지 시)

---

## normalization 원칙
- shared-kernel contract는 수정하지 않는다
- adapter-local identifier mapping은 bridge 안에서만 처리한다
- canonical id를 알 수 없으면 `세션 owner 미정`처럼 founder-facing fallback을 사용한다

---

## 현재 known adapter-local mappings
- `chief-strategy-officer` -> `han-jihoon-cso`
- `chief-financial-officer` -> `park-seoyeon-cfo`
- `chief-marketing-officer` -> `jung-yuna-cmo`
- `chief-operating-officer` -> `kim-dohyun-coo`
- `chief-technology-officer` -> `choi-minseok-cto`
- `project-manager` -> `yoon-haneul-pm`
- `compliance-advisor` -> `cho-hyunwoo-legal`
- `hr-coach`, `staff-development-coach` -> `kang-yerin-hr`
- `vibe-coder-buddy`, `pair-coder` -> `yoo-junho-paircoder`
- `Explore` -> unknown (fallback)

---

## 목적
이 bridge는 live wrapper 연결 전에도 Claude가 남긴 latest handoff를 founder 관점에서 읽을 수 있게 해준다. 또한 `/save`가 아직 안 돌았을 때 placeholder 상태를 명시적으로 드러내 continuity 품질 리스크를 보여준다.
