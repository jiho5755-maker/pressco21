# Task 231: 파트너 교육 아카데미 (필수교육 + 인증)

> **상태**: ✅ 완료
> **규모**: S
> **의존성**: Task 223
> **에이전트**: `주도` brand-planning-expert | `협업` gas-backend-expert

## 목표

파트너(강사/공방)가 플랫폼에 합류하기 전에 반드시 이수해야 하는 교육 시스템을 구축한다.
PRESSCO21 브랜드 가이드라인, 안전 수칙, 플랫폼 사용법을 교육하고,
퀴즈 합격 시 자동으로 교육 이수 인증서를 발급한다.

## 현재 상태

- Task 223에서 파트너 등급 체계(SILVER/GOLD/PLATINUM) 정의 완료
- GAS의 파트너 상세 시트에 `education_completed` 컬럼 존재 (Task 201)
- 교육 이수 상태에 따라 등급 반영 (`triggerUpdatePartnerGrades`)

## 대상

- YouTube unlisted 영상 (스크립트 + 구성 설계)
- Google Forms 퀴즈 (설계 + 항목 정의)
- `파트너클래스/class-platform-gas.gs` (교육 인증 관련 함수 추가)
- `docs/phase2/partner-academy-guide.md` (신규 생성)

## 구현 단계

### 1단계: 교육 콘텐츠 설계 (brand-planning-expert 주도)

- [ ] 필수 교육 3개 모듈 커리큘럼 설계
  - 모듈 1: PRESSCO21 브랜드 가이드라인 (브랜드 가치, 압화/보존화 전문성, 품질 기준)
  - 모듈 2: 안전 수칙 (재료 취급, 수업 환경, 응급 대처)
  - 모듈 3: 플랫폼 사용법 (강의 등록, 예약 관리, 정산 확인)
- [ ] 각 모듈별 YouTube 스크립트 작성 (5~10분 분량)
- [ ] 모듈당 Google Forms 퀴즈 5문항 설계 (객관식, 70점 합격)
- [ ] 선택 교육 주제 목록 (트렌드, 신상품 활용, 교육 기법)

### 2단계: 교육 인증 GAS 함수 추가 (gas-backend-expert 주도)

- [ ] `handleEducationComplete(data)` - POST 엔드포인트
  - Google Forms 응답 연결 (Apps Script Trigger)
  - 합격(70점+) 시 파트너 상세 시트 `education_completed` = 'Y'로 업데이트
  - 인증서 발급 이메일 자동 발송 (PDF 첨부 또는 HTML 인증서)

- [ ] `getEducationStatus(params)` - GET 엔드포인트
  - member_id → partner_code → education_completed 상태 반환
  - 대시보드에서 교육 이수 여부 표시용

### 3단계: 관리자/파트너 가이드 문서 작성

- [ ] `docs/phase2/partner-academy-guide.md` 작성
  - 교육 이수 안내 (파트너 대상)
  - YouTube 영상 업로드 가이드 (관리자 대상)
  - Google Forms 퀴즈 연결 설정 방법
  - 인증서 발급 이메일 커스터마이징

## 수락 기준

- [ ] 3개 모듈 교육 커리큘럼이 설계되어 있다
- [ ] 각 모듈의 YouTube 스크립트가 초안 작성되어 있다
- [ ] Google Forms 퀴즈 항목이 상세히 정의되어 있다
- [ ] GAS `handleEducationComplete` 함수가 구현되어 있다
- [ ] 교육 합격 시 인증서 발급 이메일이 자동 발송된다
- [ ] `getEducationStatus` API로 이수 여부 조회 가능하다

## 테스트 체크리스트

- [ ] Google Forms 제출 → GAS Trigger → education_completed 업데이트 확인
- [ ] 합격 시 인증서 이메일 자동 발송 확인
- [ ] 불합격 시 재응시 안내 이메일 발송 확인
- [ ] `getEducationStatus` API 응답 정상 확인
- [ ] 교육 이수 → 파트너 등급 반영 확인 (triggerUpdatePartnerGrades)

## 변경 사항 요약

### 교육 콘텐츠 설계 (brand-planning-expert)
- `docs/phase2/partner-academy-guide.md` 신규 생성 (약 950줄)
- 필수 교육 3모듈: 브랜드 가이드라인(7분) / 안전 수칙(6분) / 플랫폼 사용법(9분)
- 각 모듈별 YouTube 스크립트 초안 (오프닝 후크 포함, 따뜻한 강사 어투)
- 통합 퀴즈 15문항 4지선다 (11/15 = 73% 합격), 오답 피드백 멘트 포함
- 합격/불합격 이메일 카피 + 인증서 HTML 템플릿
- 선택 교육 주제 6개 + 관리자 운영 가이드

### GAS 교육 인증 구현 (class-platform-gas.gs: 5,271줄 기준)
- `handleGetEducationStatus` (GET): member_id → 교육 이수 상태 반환
- `handleEducationComplete` (POST): 점수 저장 + 합격/불합격 이메일 자동 발송
  - PASS_THRESHOLD, TOTAL_QUESTIONS 서버 고정 상수 (클라이언트 조작 불가)
  - `education_date`, `education_score` 컬럼 자동 추가 (멱등)
  - 이메일 발송은 LockService 해제 후 실행 (저장 실패 독립)
- `sendCertificateEmail_`: 합격 인증서 이메일 (골드 보더 HTML, 학사모 엔티티)
- `sendRetryEmail_`: 불합격 재응시 안내 이메일 (격려 톤)
- ERROR_CODES: `INVALID_SCORE`, `EDUCATION_SAVE_FAIL` 추가
