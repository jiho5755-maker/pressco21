# PRESSCO21 회사 보관소 사용 가이드

작성일: 2026-04-02
대상: 전 직원

---

## 이 보관소가 뭔가요?

회사의 모든 디지털 자료를 **한 곳에 모아서**, 누구든 **찾고 싶을 때 바로 찾을 수 있게** 만든 시스템입니다.

브라우저에서 접속합니다:
- 사무실: `http://192.168.123.105:8090`
- 외부 (Tailscale): `http://100.76.25.105:8090`

---

## 폴더 9개, 이것만 기억하세요

```
1. products      상품 관련 전부
2. classes       교육/강의 관련 전부
3. brand         회사 브랜드 관련 전부
4. marketing     광고/홍보 관련 전부
5. craft-lab     연구/레시피/신제품 개발
6. sourcing      거래처/소싱/수입
7. finance       돈/세금/계약/인허가
8. hr        직원/인사
9. operations    업무 매뉴얼/시스템/회의록
```

---

## 각 폴더에 뭘 넣나요?

### 1. products — "팔고 있는 것"

```
products/
├── forever-love/                     브랜드별
│   └── 로즈오일-100ml/               상품별
│       ├── originals/                촬영 원본
│       ├── edited/                   보정본
│       ├── channel/                  채널별 규격 이미지
│       │   ├── makeshop/
│       │   ├── smartstore/
│       │   ├── coupang/
│       │   └── 11st/
│       └── detail-page/              상세페이지 이미지
├── resiners/
├── no-brand/                         자체 브랜드 없는 상품
└── _templates/                       상세페이지 템플릿
```

| 넣는 것 | 안 넣는 것 |
|---------|-----------|
| 상품 사진 원본/보정본 | 개발 중인 시제품 사진 → craft-lab |
| 채널별 규격 이미지 | 상품 홍보용 배너 → marketing |
| 상세페이지 이미지 | 상품 원가표 → finance |
| 상품 정보 메모 | 거래처 카탈로그 → sourcing |

---

### 2. classes — "가르치는 것"

```
classes/
├── active/                           진행 중인 강의
│   └── CL001_레진플라워기초/
│       ├── curriculum/               교안, PPT
│       ├── video/                    강의 영상
│       ├── kit-photos/               키트 구성 사진
│       ├── materials/                수강생 배포 자료
│       └── student-works/            수강생 작품 사진
├── archive/                          종료된 강의
├── instructors/                      강사 풀
│   └── {강사명}/
│       ├── profile/                  프로필, 소개
│       └── portfolio/                포트폴리오
├── certificates/                     수료증 양식
└── _shared/                          공통 자료
```

| 넣는 것 | 안 넣는 것 |
|---------|-----------|
| 교안, 커리큘럼 | 강의 홍보 배너 → marketing |
| 강의 영상 | 유튜브 콘텐츠 → marketing |
| 수강생 작품 사진 | 마케팅용 고객 후기 → marketing |
| 키트 구성 사진 | 키트 레시피/배합비 → craft-lab |
| 수료증 양식 | 강사 근로계약서 → hr |

---

### 3. brand — "회사가 어떻게 보이는가"

기존 brand-assets + brand-system + templates + sales-kits 통합.

```
brand/
├── logos/                            로고 파일 (AI, PNG, SVG)
├── colors-fonts/                     팔레트, 폰트 파일
├── guidelines/                       브랜드 가이드북, 톤앤매너
├── templates/                        문서/슬라이드/디자인 양식
│   ├── docs/                         문서 양식
│   ├── slides/                       회사소개서, 피치덱
│   ├── sheets/                       엑셀 양식
│   └── design/                       배너/SNS 템플릿
├── icons-graphics/                   아이콘, 일러스트, 그래픽
├── company-intro/                    회사소개서, 원페이저
│   ├── current/                      현재 버전
│   └── archive/                      이전 버전
└── reference/                        벤치마크, 잘된 예시
```

| 넣는 것 | 안 넣는 것 |
|---------|-----------|
| 로고 파일 전 포맷 | 특정 캠페인 배너 → marketing |
| 브랜드 가이드북 | 상품 상세페이지 이미지 → products |
| 회사소개서 | 거래처 제안서 → sourcing |
| 디자인 템플릿 | 수료증 양식 → classes |
| 폰트 파일 | 세무 양식 → finance |

---

### 4. marketing — "알리는 것"

```
marketing/
├── campaigns/                        기획전/이벤트
│   └── {YYYYMM}_{캠페인명}/
│       ├── banners/
│       ├── sns/
│       ├── ads/
│       └── results/                  성과 기록
├── sns/                              일상 SNS
│   ├── instagram/
│   ├── youtube/
│   └── blog/
├── ugc/                              고객 콘텐츠 (UGC)
│   ├── reviews/                      포토 리뷰
│   ├── supporters/                   서포터즈 활동
│   │   └── {기수}_{YYYY}/
│   └── sns-mentions/                 고객 SNS 태그
├── email-alimtalk/                   이메일/알림톡 템플릿
└── _archive/                         지난 캠페인
```

| 넣는 것 | 안 넣는 것 |
|---------|-----------|
| 광고 배너/소재 | 로고 원본 → brand |
| SNS 게시물 이미지 | 상품 사진 원본 → products |
| 기획전 자료 | 교안 → classes |
| 서포터즈 활동 자료 | 수강생 작품 → classes |
| 포토 리뷰 모음 | 강사 프로필 사진 → classes |

---

### 5. craft-lab — "만드는 것 / 연구하는 것"

원장님의 연구, 레시피, 제조 노하우, 신제품 개발 과정.

```
craft-lab/
├── recipes/                          배합비, 제조법, 기법
│   ├── resin/                        레진 관련
│   ├── flower-drying/                꽃 건조 기법
│   ├── coloring/                     착색 기법
│   ├── finishing/                    마감 처리
│   └── tips/                         원장님 팁 모음
├── prototypes/                       시제품
│   └── {YYYYMM}_{이름}/
│       ├── photos/
│       └── notes.txt
├── ideas/                            아이디어/기획 메모
├── supplier-samples/                 거래처 샘플 비교 사진
└── launched/                         출시 확정 (→ products/ 복사)
```

| 넣는 것 | 안 넣는 것 |
|---------|-----------|
| 레진 배합비 | 완성된 상품 사진 → products |
| 원장님 제조 팁 | 강의 교안 → classes |
| 시제품 사진 | 거래처 카탈로그 → sourcing |
| 새 기법 테스트 기록 | 마케팅용 과정 사진 → marketing |
| 아이디어 메모 | 원가 계산 → finance |

---

### 6. sourcing — "사오는 것"

```
sourcing/
├── suppliers/                        거래처별
│   └── {거래처명}/
│       ├── catalogs/                 카탈로그
│       ├── quotes/                   견적서
│       └── samples/                  샘플 사진
├── overseas/                         해외 소싱 (1688 등)
│   ├── search/                       검색 결과 캡처
│   └── orders/                       발주 기록
├── customs/                          통관 서류
│   └── {YYYYMM}/
├── contracts/                        거래처 계약서
└── price-comparison/                 가격 비교표
```

| 넣는 것 | 안 넣는 것 |
|---------|-----------|
| 거래처 카탈로그 | 상품 사진 → products |
| 견적서, 단가표 | 세금계산서 → finance |
| 거래처 계약서 | 직원 계약서 → hr |
| 수입 통관 서류 | 사업자등록증 → finance |
| 샘플 비교 사진 | 시제품 개발 기록 → craft-lab |

---

### 7. finance — "돈과 법"

경영진만 접근 가능. 5년 보관.

```
finance/
├── tax/                              세무 증빙
│   └── {YYYY}/
│       └── {MM}/
│           ├── sales/                매출 증빙
│           ├── purchase/             매입 증빙
│           ├── payroll/              급여 관련
│           └── filing/               세무 신고 서류
├── annual/                           연간 결산
├── licenses/                         인허가/상표
│   ├── trademarks/                   상표등록증
│   │   ├── forever-love/
│   │   ├── resiners/
│   │   └── pressco21/
│   ├── business-registration/        사업자등록증
│   ├── ecommerce-permits/            통신판매업, 입점 계약
│   └── import-export/                수입 인허가
├── insurance/                        보험 서류
├── certificates/                     사업자등록증, 인감
└── _for-accountant/                  세무사 전달 폴더
```

---

### 8. hr — "함께 일하는 사람"

경영진만 접근 가능.

```
hr/
├── employees/                        직원별
│   └── {이름이니셜}_{입사년}/
│       ├── contract/                 근로계약서
│       ├── insurance/                4대보험
│       └── training/                 교육 이수 기록
├── policies/                         취업규칙, 복무규정
└── organization/                     조직도, 업무 분장
```

---

### 9. operations — "일하는 방법"

```
operations/
├── manuals/                          업무 매뉴얼
│   ├── shipping/                     배송/출고
│   ├── cs/                           고객 응대
│   ├── product-registration/         상품 등록
│   └── tools/                        도구 사용법
├── meetings/                         회의록
│   └── {YYYY}/
├── policies/                         사규, 운영 규정
├── checklists/                       업무 체크리스트
└── system/                           시스템 구조도, 데이터 흐름
```

---

## "어디에 넣지?" 판단법

파일을 들고 아래 질문을 순서대로 따라가세요:

```
Q1. 이 파일은 돈/세금/계약/인허가 관련인가?
    → YES → finance/
    → NO → 다음

Q2. 이 파일은 직원 인사 관련인가? (계약서, 급여, 4대보험)
    → YES → hr/
    → NO → 다음

Q3. 이 파일은 특정 상품의 사진/정보인가?
    → YES → products/{브랜드}/{상품명}/
    → NO → 다음

Q4. 이 파일은 특정 강의/교육 관련인가?
    → YES → classes/
    → NO → 다음

Q5. 이 파일은 제조법/레시피/시제품/연구 기록인가?
    → YES → craft-lab/
    → NO → 다음

Q6. 이 파일은 거래처/소싱/수입 관련인가?
    → YES → sourcing/
    → NO → 다음

Q7. 이 파일은 광고/SNS/홍보/고객 후기 관련인가?
    → YES → marketing/
    → NO → 다음

Q8. 이 파일은 로고/폰트/템플릿/회사소개서인가?
    → YES → brand/
    → NO → 다음

Q9. 그 외 업무 매뉴얼/회의록/시스템 문서인가?
    → YES → operations/
    → NO → inbox/ 에 넣고 관리자에게 문의
```

---

## 자주 헷갈리는 것 정리

| 이 파일은... | 여기에 넣으세요 | 이유 |
|-------------|---------------|------|
| 강의 홍보용 배너 | marketing/ | 홍보 목적 = 마케팅 |
| 수강생 작품 사진 | classes/{강의}/student-works/ | 교육 성과 = 교육 |
| 고객이 보낸 후기 사진 | marketing/ugc/reviews/ | 마케팅 소재 |
| 서포터즈 활동 자료 | marketing/ugc/supporters/ | 마케팅 소재 |
| 강사 자격증 | classes/instructors/{강사명}/ | 강사 관리 = 교육 |
| 강사 근로계약서 | hr/ | 인사 문서 = 인사 |
| 키트 원가표 | finance/ | 돈 관련 = 재무 |
| 키트 배합 레시피 | craft-lab/recipes/ | 제조 노하우 = 연구 |
| 거래처 계약서 | sourcing/contracts/ | 거래처 관련 = 소싱 |
| 거래처 세금계산서 | finance/tax/{YYYY}/{MM}/purchase/ | 세무 증빙 = 재무 |
| 수료증 양식 | classes/certificates/ | 교육 관련 = 교육 |
| 문서 템플릿 | brand/templates/ | 회사 양식 = 브랜드 |
| 메이크샵 작업 파일 | operations/system/ | 시스템 관련 = 운영 |
| 유튜브 영상 | marketing/sns/youtube/ | 홍보 목적 = 마케팅 |
| 회의록 | operations/meetings/ | 업무 기록 = 운영 |

---

## 파일 이름 짓는 법

### 하나만 기억하세요: 날짜_내용_용도

```
날짜_내용_용도.확장자

예시:
  20260402_로즈오일_쿠팡.jpg
  20260402_봄맞이배너_인스타.png
  20260402_한진택배_세금계산서.pdf
  20260402_투명레진_기포제거팁.txt
  20260402_김영희_장미레진코스터.jpg
```

이 세 덩어리만 지키면 충분합니다.

추가 규칙:
- 버전이 있으면 끝에 `_v01`, `_v02`
- 공백 대신 언더바: `봄맞이_배너` (O), `봄맞이 배너` (X)
- 카메라 기본 파일명(`IMG_4023.jpg`)은 가능하면 바꿔주세요

---

## 파일 올리는 법 — inbox 폴더에 던져넣기

파일명을 완벽하게 못 지어도 괜찮습니다.
**inbox 안의 맞는 폴더에 넣기만 하면** 시스템이 자동으로 분류합니다.

### inbox 폴더 구조

```
inbox/
├── 상품사진/          → products/ 로 자동 이동
├── 교육자료/          → classes/ 로 자동 이동
├── 마케팅소재/        → marketing/ 로 자동 이동
├── 고객후기/          → marketing/ugc/ 로 자동 이동
├── 세무증빙/          → finance/ 로 자동 이동
├── 거래처자료/        → sourcing/ 로 자동 이동
├── 브랜드자료/        → brand/ 로 자동 이동
└── 기타/              → 관리자가 수동 분류
```

### 사용법

```
1. File Browser 로그인
2. inbox 폴더 열기
3. 맞는 한국어 폴더 선택 (모르겠으면 "기타")
4. 파일 업로드
5. 끝! (자동 분류가 처리)
```

### 자동 분류가 되는 원리

```
파일명에 힌트가 있으면:
  "로즈오일" "상세메인" → 상품 사진이구나 → products/
  "세금계산서" "영수증" → 세무 증빙이구나 → finance/
  "배너" "인스타" → 마케팅 소재구나 → marketing/

파일명에 힌트가 없어도:
  inbox/상품사진/ 에 넣었으면 → products/ 로 이동
  inbox/세무증빙/ 에 넣었으면 → finance/ 로 이동
  (폴더가 힌트 역할)

둘 다 판단 불가:
  inbox/기타/ 에 넣었거나 IMG_4023.jpg 같은 파일
  → unsorted/ 에 보관, 관리자에게 텔레그램 알림
  → 관리자가 직접 분류
```

### 자동 분류 후 관리자 알림 예시

```
📁 자동 분류 완료 (3건)

✅ 20260402_로즈오일_쿠팡.jpg
   → products/forever-love/로즈오일/channel/coupang/

✅ 20260402_한진택배_세금계산서.pdf
   → finance/tax/2026/04/purchase/

⚠️ IMG_4023.jpg (inbox/기타/)
   → unsorted/ (판별 불가, 수동 분류 필요)
```

관리자가 확인해서 틀린 건 직접 옮기면 됩니다.

---

## 접근 권한

| 누가 | 볼 수 있는 폴더 | 못 보는 폴더 |
|------|----------------|-------------|
| 대표, 원장님 | 전부 (9개) | 없음 |
| 일반 직원 | products, classes, brand, marketing, operations | craft-lab, sourcing, finance, hr |
| 영상편집자/디자이너 | products, brand, marketing | 나머지 전부 |

민감한 자료(재무, 인사, 거래처 계약, 연구 레시피)는 경영진만 접근 가능합니다.

---

## 처음에 뭐부터 넣나요?

모든 걸 한꺼번에 정리하려 하지 마세요. 이것부터 시작하세요:

```
1주차:  brand/logos/          ← 로고 파일 모으기
        finance/licenses/    ← 상표등록증, 사업자등록증 스캔

2주차:  products/             ← 주력 상품 10개 사진 정리
        craft-lab/recipes/   ← 원장님 팁 3개 기록

3주차:  marketing/ugc/       ← 서포터즈 자료 이관
        classes/             ← 진행 중인 강의 1개 정리

4주차:  나머지 자연스럽게 쌓이기 시작
```

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1 | 2026-03-19 | 6개 카테고리 (일반적) |
| v2 | 2026-04-02 | 15개 카테고리 (PRESSCO21 맞춤, 과다) |
| v2.1 | 2026-04-02 | 9개 카테고리 (최적화, 본 문서) |
