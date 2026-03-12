# 파트너 등급체계 변경 플레이북

작성일: 2026-03-12

## 목적

파트너 등급체계가 리뉴얼되거나 등급명, 단계 수, 수수료율, 저장 방식이 바뀔 때 수정 누락으로 live 장애가 다시 나지 않도록 변경 포인트를 한 곳에 고정한다.

## 현재 live 기준선

- 저장 등급: `tbl_Partners.grade`는 legacy enum `SILVER / GOLD / PLATINUM`
- 표시 등급: UI와 파트너 커뮤니케이션은 `BLOOM / GARDEN / ATELIER / AMBASSADOR`
- 수수료율: `commission_rate`를 표시 등급 해석의 보조 기준으로 사용
- 리스크: 저장 enum과 표시 등급을 혼용하면 승인/승급 workflow가 중간 실패할 수 있다

## 변경 시 가장 먼저 확인할 것

1. 저장 등급이 바뀌는가
2. 표시 등급만 바뀌는가
3. 등급 단계 수가 바뀌는가
4. 등급별 `commission_rate`, `reserve_rate`가 바뀌는가
5. 교육 퀴즈/안내문/이메일 카피에 등급명이 직접 들어가 있는가

## 소스 오브 트루스

현재 구조에서는 한 파일이 단일 진실원본이 아니다. 아래 3개를 같이 봐야 한다.

- 저장 규칙: `tbl_Partners.grade` enum과 partner write workflow
- 표시 규칙: UI alias, badge copy, 대시보드 메타
- 보조 판정: `commission_rate` 기반 alias fallback

## 필수 수정 지점

### 1. 저장 계층

- `파트너클래스/n8n-workflows/WF-08-partner-approve.json`
  - 신규 파트너 생성 시 저장 등급과 표시 등급을 분리하는지 확인
- `파트너클래스/n8n-workflows/WF-13-grade-update.json`
  - 표시 등급 -> 저장 등급 매핑
  - `GRADE_ORDER`, `COMMISSION_RATES`, `STORAGE_GRADE_MAP`, `GRADE_ALIAS`, `RATE_ALIAS`
- NocoDB `tbl_Partners.grade`
  - enum 옵션 자체가 바뀌면 workflow 수정 전에 schema부터 맞춰야 한다

### 2. 조회/인증 계층

- `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json`
  - `getPartnerAuth`, `getPartnerApplicationStatus`, `getPartnerDashboard` 응답의 grade alias 확인
- `scripts/partnerclass-s2-7-patch-partner-auth.js`
  - workflow 재생성 시 legacy 기본값과 alias 로직이 재주입되므로 같이 수정

### 3. UI 계층

- `파트너클래스/파트너/js.js`
  - 대시보드 배지, 진행률, 다음 등급 목표, 교육 게이트
- `파트너클래스/목록/js.js`
  - 목록 배지, 추천 우선순위, 등급 chip
- `파트너클래스/콘텐츠허브/js.js`
  - 파트너 등급 노출과 정렬 기준

### 4. 교육/운영 카피

- `파트너클래스/교육/js.js`
  - 퀴즈 문항에 등급명이 직접 들어가면 리뉴얼 때 바로 깨질 수 있다
- `파트너클래스/n8n-workflows/WF-10-education-complete.json`
  - 서버사이드 정답 키는 UI 문항 순서와 같이 움직여야 한다
- 승인 메일/텔레그램
  - `WF-08-partner-approve.json` 내부 카피와 등급 안내 문구 확인

## 안전한 변경 순서

1. 새 등급 정책 확정
2. 저장 enum 유지 여부 결정
3. `commission_rate`와 표시 등급 매핑표 확정
4. NocoDB schema가 바뀌면 먼저 반영
5. `WF-08`, `WF-13`, `WF-02` 수정
6. `파트너/js.js`, `목록/js.js`, `콘텐츠허브/js.js`, `교육/js.js` 수정
7. 메일/문서 카피 수정
8. live 승인 테스트
9. live 로그인 파트너로 `2608 -> 2610 -> 8009` 회귀 확인

## 변경 후 최소 검증

- 신규 신청 승인 후 `tbl_Partners` row 생성 성공
- `getPartnerAuth`에서 기대한 grade와 `commission_rate`가 함께 반환
- `2608` 대시보드 배지와 수수료/혜택 UI 일관성 확인
- `2610` 교육 퀴즈 문항과 서버 정답 키 일치
- `8009` 강의등록 접근 조건 정상

## 감사 명령

등급 관련 하드코딩은 아래 스크립트로 먼저 찾는다.

```bash
node scripts/partnerclass-grade-change-audit.js
```

이 스크립트는 `파트너클래스/`, `scripts/`, `docs/파트너클래스/`를 스캔해 저장 등급, 표시 등급, 매핑/수수료, 교육 퀴즈 결합 지점을 출력한다.

## 이번 장애에서 확인된 교훈

- 표시 등급 `BLOOM`을 저장 enum 컬럼에 그대로 쓰면 row 생성이 실패할 수 있다
- 메이크샵 회원그룹 변경만 성공해도 파트너 row 생성이 실패하면 `2608` 인증은 막힌다
- 등급명 변경은 UI만의 문제가 아니라 승인, 인증, 승급, 교육, 카피를 함께 건드리는 운영 변경이다
