# openclaw-project-hub Canonical Source 정책 v1

_대상: 지호님, 플로라, Claude Code, Codex, 향후 개발 에이전트_

## 1. 목적

이 문서는 PRESSCO21의 공통 설계 문서, AI 운영 기준 문서, 상위 아키텍처 문서의 **기준 저장소(canonical source)** 를 어디로 둘지 명확히 정한다.

결론:

> `openclaw-project-hub`를 회사 공통 설계 자산의 기준 저장소로 사용한다.

---

## 2. 기본 원칙

### 2.1 canonical source
- **맥북의 `~/workspace/pressco21/openclaw-project-hub`를 기준 저장소로 본다.**
- 공통 정책, 상위 설계, 에이전트 운영 기준, 통합 아키텍처 문서는 여기서 관리한다.

### 2.2 runtime mirror
- OpenClaw 서버 워크스페이스는 **실행 환경용 미러**로 본다.
- 플로라/OpenClaw가 참조해야 하는 문서는 서버에도 복제 가능하다.
- 단, 장기적으로는 허브본이 원본이다.

### 2.3 project-local documents
- 각 프로젝트 고유 문서는 각 프로젝트 저장소에 둔다.
- 단, 회사 공통 원칙 문서는 프로젝트별로 흩어놓지 않는다.

---

## 3. 어떤 문서를 허브에 두는가

다음 유형은 기본적으로 `openclaw-project-hub`에 둔다.

- 회사 공통 아키텍처 문서
- DB 의사결정 문서
- 원천데이터 정책
- 플로라 운영 정책
- specialist 라우팅 정책
- AI 개발 에이전트 공통 지침
- 동기화/검증/설치 스크립트
- 공통 참조 JSON / 정책 스키마 / 매핑 파일

---

## 4. 어떤 문서를 프로젝트에 두는가

다음 유형은 각 프로젝트에 둔다.

- CRM 세부 구현 문서
- 메이크샵 전용 개발 문서/스킬
- 파트너클래스 도메인 문서/PRD
- 개별 앱의 README, AGENTS, roadmap
- 기능별 스키마, UI/배포/테스트 문서

단, 프로젝트 문서가 회사 공통 원칙과 충돌하면 허브 문서를 우선한다.

---

## 5. 폴더 역할 원칙

`openclaw-project-hub` 내 권장 역할:

- `03_openclaw_docs/` → 공통 설계 문서, 정책 문서, 상위 운영 기준
- `04_reference_json/` → 정책 JSON, 스키마, 매핑 테이블, 참조 데이터
- `06_scripts/` → 설치/검증/동기화/생성 스크립트
- `07_openclaw_skills/` → OpenClaw skill 문서

---

## 6. 충돌 시 우선순위

문서 충돌 시 우선순위는 아래와 같다.

1. 최신 허브 canonical 문서
2. 서버 미러 문서
3. 프로젝트 로컬 문서의 공통정책 해석본

즉, 서버에서 임시 수정이 발생해도 장기 기준은 허브본이다.

---

## 7. 운영 원칙

- 공통 기준 문서의 신규 생성은 가능하면 허브본부터 만든다.
- 서버 워크스페이스에는 필요 문서만 미러링한다.
- 미러 문서를 수정했다면 허브본 반영 여부를 바로 판단한다.
- Claude Code / Codex / 플로라는 공통 설계 질문에서 허브 문서를 우선 읽는다.

---

## 8. 최종 운영 문장

> `openclaw-project-hub`는 PRESSCO21의 공통 설계 자산과 AI 운영 기준 문서의 canonical source다.  
> OpenClaw 서버 워크스페이스는 runtime mirror다.  
> 공통 원칙은 허브에서 관리하고, 프로젝트 세부 실행 문서는 각 프로젝트에서 관리한다.
