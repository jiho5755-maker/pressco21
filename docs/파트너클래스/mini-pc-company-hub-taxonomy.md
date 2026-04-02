# PRESSCO21 Company Hub 분류 체계

작성일: 2026-03-19

이 문서는 회사 공용 자료를 장기적으로 쌓아도 헷갈리지 않게 하기 위한 표준 폴더 체계를 정리한다.

핵심 원칙은 세 가지다.

1. 개인 작업물과 공용 자산을 섞지 않는다.
2. 최상위 카테고리는 적게, 하위 표준 폴더는 명확하게 둔다.
3. 같은 종류의 문서는 항상 같은 경로에 넣는다.

기본 경로:

- Desktop shortcut: `PRESSCO21_STORAGE`
- 실제 로컬 작업 경로: `PRESSCO21_MASTER_SYNC/company-hub`
- 미니PC active: `active-sync/shared/company-hub`
- 미니PC archive: `archive-sync/shared/company-hub`
- File Browser 다운로드 뷰: `archive-sync/shared/company-hub` 또는 library 뷰 안의 company-hub

표시 원칙:

- 실제 폴더명은 영어로 유지한다.
- 폴더 설명은 각 영어 폴더 안의 `README.ko.txt` 에 적는다.
- 한국어 alias 폴더는 쓰지 않는다.

관련 규칙:

- 파일명 규칙: `docs/파트너클래스/mini-pc-company-hub-filename-rules.md`

## 1. 최상위 구조

### `internal-docs`

회사 내부에서 읽고 관리해야 하는 문서

### `brand-assets`

브랜드 자산 원본과 재사용 가능한 비주얼 파일

### `brand-system`

브랜드 규칙과 기준 문서

### `templates`

반복 사용되는 템플릿 파일

### `sales-kits`

외부 전달용 세일즈/소개 자료

### `operations`

실무 운영에 필요한 시스템/프로세스 문서

## 2. 권장 세부 구조

### `internal-docs`

- `01-company-profile`
  - 회사 소개
  - 조직 설명
  - 사업 개요
  - 회사 연혁
- `02-policies-sop`
  - 내부 운영 규정
  - 업무 SOP
  - 문서 작성 규칙
  - 승인 절차
- `03-legal-contracts`
  - 계약서 원본
  - 협약서
  - NDA
  - 법무 참고 문서
- `04-meetings-notes`
  - 주간 회의록
  - 의사결정 메모
  - 회의 후속 액션
- `05-finance-admin`
  - 세무 참고 문서
  - 사업자/행정 문서
  - 외부 제출용 관리 문서

### `brand-assets`

- `01-logos`
  - 로고 원본
  - 로고 PNG, SVG, PDF
  - 로고 변형본
- `02-fonts`
  - 폰트 파일
  - 라이선스 문서
  - 사용 가이드
- `03-icons`
  - 아이콘 세트
  - UI 심볼
  - 앱/웹용 아이콘
- `04-photo-video-source`
  - 브랜드 사진 원본
  - 공용 촬영 원본
  - 재사용 가능한 짧은 영상 소스
- `05-illustrations-graphics`
  - 일러스트
  - 그래픽 모티프
  - 배경 요소

### `brand-system`

- `01-brand-guidelines`
  - 브랜드 가이드북
  - 사용 규칙
- `02-colors`
  - 팔레트 기준
  - 색상 코드 문서
- `03-typography`
  - 폰트 조합 기준
  - 제목/본문 규칙
- `04-messaging-tone`
  - 톤앤매너
  - 카피 라이팅 규칙
  - 금지 표현
- `05-reference-examples`
  - 잘된 예시
  - 시안 레퍼런스
  - 벤치마크

### `templates`

- `01-doc-templates`
  - 문서 양식
  - 계약/운영 템플릿
- `02-slide-templates`
  - 회사소개서 템플릿
  - 피치덱 템플릿
- `03-sheet-templates`
  - 스프레드시트 양식
  - 비용/정산 템플릿
- `04-design-templates`
  - PSD/AI 기본 템플릿
  - 소셜 시안 템플릿
- `05-video-templates`
  - 오프닝/엔딩
  - 자막 틀
  - 모션 템플릿

### `sales-kits`

- `01-company-overview`
  - 회사소개서
  - 서비스 소개서
- `02-one-pagers`
  - 원페이저
  - 핵심 요약 자료
- `03-proposals`
  - 제안서 템플릿
  - 실제 제출본
- `04-case-studies`
  - 성공사례
  - 포트폴리오 설명 자료
- `05-client-facing-assets`
  - 브로셔
  - 전달용 이미지/문서

### `operations`

- `01-automation`
  - 자동화 설계 문서
  - n8n/스크립트 설명
- `02-checklists`
  - 오픈 체크리스트
  - 배포 체크리스트
  - 마감 체크리스트
- `03-manuals`
  - 사용 매뉴얼
  - 관리자 가이드
  - 장애 대응 문서
- `04-vendors-tools`
  - 외부 서비스 사용 가이드
  - 계정 발급 절차
  - 도구별 운영 메모
- `05-system-maps`
  - 시스템 구조도
  - 정보 구조
  - 데이터 흐름도

## 3. 넣지 말아야 하는 것

아래는 `company-hub`에 넣지 않는 것이 좋다.

- 개인 작업 중간본
- 프로젝트별 원본 영상
- 프로젝트별 PSD 작업본
- 임시 다운로드 파일
- 단순 공유용 카톡 저장본

이런 자료는 각 개인 작업 경로에 두는 것이 맞다.

## 4. 운영 규칙

1. 개인 작업물은 `editors/*`, `designers/*`
2. 공용 문서와 자산은 `company-hub`
3. 웹 공개 준비물은 `publish-*`
4. 모바일/단발성 업로드만 `inbox`
5. 폴더가 애매하면 새 최상위 폴더를 만들지 말고 기존 카테고리 안에서 해결
6. 파일명은 가능하면 `날짜 + 문서명 + 버전` 규칙으로 맞춘다.
7. 웹 공개용 파일만 영어 파일명을 쓴다.

## 5. 가장 먼저 쌓으면 좋은 자료

처음부터 모든 걸 정리하려 하지 말고, 아래부터 넣는 게 가장 효율적이다.

1. `brand-assets/01-logos`
2. `brand-system/01-brand-guidelines`
3. `templates/02-slide-templates`
4. `sales-kits/01-company-overview`
5. `operations/03-manuals`
6. `internal-docs/02-policies-sop`

이 여섯 개만 먼저 채워도 회사 보관소 체계가 빠르게 잡힌다.

## 6. 파일명 규칙 요약

공용자료는 아래 방식으로 이름을 붙이는 것을 권장한다.

- 내부 문서: `20260319_문서이름_v01`
- 브랜드 자산: `로고_기본형_국문`
- 템플릿: `회사소개서_기본템플릿_v02`
- 세일즈 자료: `20260319_고객명_제안서_v01`
- 웹 공개용 파일: `pressco21-logo-primary-v01`

자세한 기준은 `mini-pc-company-hub-filename-rules.md` 를 따른다.
