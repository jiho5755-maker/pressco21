# 협회 B2B 영업 도구 가이드

작성일: 2026-03-11

## 목적

S2-2의 목표는 협회 제휴 제안서를 `정적 문서`가 아니라 `맞춤 URL로 바로 보여줄 수 있는 디지털 영업 도구`로 바꾸는 것이다.

- 협회명, 로고, 할인율, 인센티브 구간을 URL 파라미터로 주입할 수 있어야 한다.
- 제안서 안에서 ROI 시뮬레이터가 바로 계산되어야 한다.
- 관리자 협회 탭에서 별도 API 추가 없이 제안서 URL을 조합할 수 있어야 한다.

## 구현 범위

### 제안서 페이지 자산

- `파트너클래스/협회제안서/Index.html`
- `파트너클래스/협회제안서/css.css`
- `파트너클래스/협회제안서/js.js`

### 관리자 생성기

- `파트너클래스/어드민/Index.html`
- `파트너클래스/어드민/css.css`
- `파트너클래스/어드민/js.js`

### 테스트 자산

- `scripts/build-partnerclass-playwright-fixtures.js`
  - `affiliation-proposal.html` fixture 추가

## 협회 제안서 페이지 구조

1. 헤더
   - PRESSCO21 브랜드 + 제안 코드
2. 히어로
   - 협회명, 로고, 할인율, 1단계 인센티브, 제안 핵심 메시지
3. 가치 4카드
   - 협회원 혜택
   - 일정/세미나 홍보
   - 협회원 운영 확장
   - 구매 락인 구조
4. 패키지 3영역
   - 협회원 혜택 레이어
   - 협회 홍보 레이어
   - 성장 레이어
5. ROI 시뮬레이터
   - 입력: 협회원 수 / 월 예상 수강 인원 / 평균 재료 구매액
   - 출력: 예상 연간 구매액 / 예상 인센티브 / 달성 단계
6. 진행 프로세스
   - 미팅 -> 전용 혜택 오픈 -> 일정 게시 -> 성과 확대

## URL 파라미터

제안서 페이지는 아래 값을 쿼리스트링으로 받는다.

- `code`
- `name`
- `contact`
- `logo`
- `discountRate`
- `members`
- `monthlyStudents`
- `avgOrderAmount`
- `target1`, `target2`, `target3`
- `incentive1`, `incentive2`, `incentive3`

로고는 `https://` 또는 `http://` URL만 반영하고, 나머지 문자열은 `<` `>` 제거 후 사용한다.

## 관리자 협회 탭 동작

- `getAffiliations` 응답을 기반으로 협회 목록과 제안서 생성기 셀렉트를 동시에 채운다.
- 선택한 협회의 할인율, 담당자, 인센티브 구간을 생성기 기본값으로 반영한다.
- 생성기는 아래 입력을 가진다.
  - 협회 선택
  - 협회명
  - 실배포 페이지 ID
  - 로고 URL
  - 협회원 수
  - 월 예상 수강 인원
  - 평균 재료 구매액
- 로컬 preview 환경(`127.0.0.1`, `localhost`)에서는 fixture URL을 생성한다.
- 실서버에서는 `실배포 페이지 ID` 입력 시 `/shop/page.html?id=...` 형식 URL을 생성한다.

## 검증 결과

### 정적 검증

- `node --check 파트너클래스/협회제안서/js.js`
- `node --check 파트너클래스/어드민/js.js`
- `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`

### Playwright 로컬 검증

fixture:

- `output/playwright/fixtures/partnerclass/affiliation-proposal.html`
- `output/playwright/fixtures/partnerclass/admin.html`

결과:

- 관리자 생성기
  - 협회 셀렉트 옵션 3개(placeholder 포함)
  - 협회 행 2개 렌더링
  - 선택 협회 기준 URL 자동 생성
  - `제안서 미리보기`로 새 탭 오픈 정상
- 제안서 페이지
  - 협회명 `부케디자인협회` 커스터마이징 반영
  - 할인율 `15%` 반영
  - ROI 초기값 `19,200,000원 / 3단계`
  - 입력 변경 후 `28,800,000원 / 3단계`로 즉시 갱신
  - 로고 이미지 표시 확인

산출물:

- `output/playwright/s2-2-affiliation-proposal/affiliation-proposal-results.json`
- `output/playwright/s2-2-affiliation-proposal/*.png`

## 후속 메모

- 실배포 시에는 협회 제안서가 연결될 MakeShop 페이지 ID를 확정해 어드민 생성기의 `실배포 페이지 ID` 기본값으로 넣는 편이 좋다.
- 다음 IA 확장(S2-3)에서 협회/세미나 레이어가 생기면, 제안서의 가치 설명을 실제 협회 허브 UI와 1:1로 맞춰야 한다.
