# 행정 서류 자동화 에이전트 메모리

## WF#5 현재 구조 (Phase 7 완료 기준)
- 워크플로우 ID: `TsJQE6BxL3HQM6Ax`
- 트리거: 매 4시간 (`0 */4 * * *`)
- Gemini 2회 호출: 서류분석(1차) + 사업계획서(2차)
- Google Docs: HTTP Request + predefinedCredentialType: `googleDocsOAuth2Api`
- 회사정보: **하드코딩** (고도화 필요 → Phase 8에서 NocoDB 동적 조회로 전환)
- NocoDB 정부지원공고 서류 관련 필드: `문서_링크`, `서류_진행상태`, `문서_생성일시`

## NocoDB 핵심 참조
- 정부지원공고: `m9pvnifrpmwmbvs`
- 회사_프로파일: `mptlhf2fqskxwkk` (필드 보강 필요)
- 서류_체크리스트: **아직 미생성** (Phase 8-A GS-1001에서 생성 예정)

## Google Docs API 패턴
- 문서 생성: `POST https://docs.googleapis.com/v1/documents` (body: `{title: "..."}`)
- 본문 삽입: `POST .../documents/{id}:batchUpdate` (insertText at index 1)
- 서식: batchUpdate의 `updateParagraphStyle` 요청으로 HEADING_1/2 적용 가능
- Credential: Google Docs OAuth2 `49ff74cd-f8de-48b4-bbfd-1b0bd8333e75`

## 서류 유형 4분류 체계 (PRD-v4에서 정의)
- A: 공통필수 (보유확인만) -- 사업자등록증, 신분증, 재무제표 등
- B: AI 생성 가능 -- 사업계획서, 참여인력현황, 자금사용계획, 고용현황
- C: 반자동 (템플릿+채움) -- 확약서, 동의서
- D: 수동 필수 -- 인감증명, 납세증명, 건강보험완납

## 고도화 설계서 위치
- `/Users/jangjiho/Desktop/n8n-main/pressco21/govt-support/PRD-v4-admin-docs.md`
