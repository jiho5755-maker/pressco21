# PRESSCO21 Company Vault v2 — 회사 디지털 자산 관리 시스템

작성일: 2026-04-02
상태: v2.1로 개정 — 15개→9개 카테고리 최적화
실무 가이드: `docs/company-vault-guide.md` (직원 배포용)

> 주의: 이 파일은 기술 설계서입니다. 직원에게는 company-vault-guide.md를 공유하세요.

## 1. 이 시스템이 해결하는 문제

> "자료를 어디다 뒀는지 모르겠다"

현재 회사 자료가 흩어져 있는 곳:
- 대표 맥북 바탕화면/다운로드
- 카카오톡 대화방
- 구글 드라이브 (여러 계정)
- 인스타그램 DM/저장
- USB/외장하드
- 직원 개인 PC

이 시스템 도입 후: **미니 PC 한 곳에 모든 회사 자료가 분류되어 보관됨.**

전문 용어: DAM (Digital Asset Management, 디지털 자산 관리)

---

## 2. 전체 구조

```
미니 PC (Company Vault)
━━━━━━━━━━━━━━━━━━━━━━

/srv/pressco21-vault/                    ← 최상위 보관소
│
│  핵심 업무 자료 (매일 쓰는 것)
│  ─────────────────────────
├── products/                            상품 사진·정보
├── classes/                             파트너클래스 강의 자료
├── marketing/                           광고·SNS·캠페인 소재
├── customer-gallery/                    수강생 작품·고객 UGC
├── product-dev/                         신제품 기획·레시피
│
│  회사 운영 자료 (필요할 때 찾는 것)
│  ─────────────────────────
├── brand-assets/                        로고·폰트·아이콘
├── brand-system/                        브랜드 가이드·색상
├── templates/                           문서·슬라이드 양식
├── sales-kits/                          회사소개서·제안서
├── sourcing/                            거래처·소싱·통관
│
│  관리/법적 자료 (보관 의무, 경영진 전용)
│  ─────────────────────────
├── accounting/                          세무·증빙 (5년 보관)
├── hr/                                  근로계약·4대보험
├── licenses/                            상표·사업자·인허가
├── internal-docs/                       사규·회의록·법무
├── operations/                          매뉴얼·시스템 문서
│
│  시스템 영역
│  ─────────────────────────
├── _inbox/                              업로드 대기 (자동 분류)
├── _views/                              역할별 접근 뷰 (symlink)
└── _archive/                            장기 보관 (HDD)
```

---

## 3. 카테고리별 상세 구조

### 3-1. products/ — 상품 자료

PRESSCO21의 가장 큰 자료 덩어리. 1,500+ SKU, 8개 채널.

```
products/
├── forever-love/                        브랜드별 최상위
│   ├── rose-oil-100ml/                  상품별 폴더
│   │   ├── originals/                   촬영 원본 (RAW/고해상도)
│   │   ├── edited/                      보정 완료본
│   │   ├── channel/                     채널별 규격 이미지
│   │   │   ├── makeshop/                자사몰 (860x860 등)
│   │   │   ├── smartstore/              스마트스토어
│   │   │   ├── coupang/                 쿠팡 (780x780 등)
│   │   │   └── 11st/                    11번가
│   │   ├── detail-page/                 상세페이지 이미지
│   │   └── info.txt                     상품 정보 메모
│   └── ...
├── resiners/                            레지너스 브랜드
├── no-brand/                            자체 브랜드 없는 상품
├── _catalog/                            전체 상품 목록 (자동 생성)
└── _templates/                          상세페이지 템플릿
```

### 3-2. classes/ — 파트너클래스

```
classes/
├── active/                              진행 중인 강의
│   └── {class-id}_{강의명}/
│       ├── curriculum/                  교안, 커리큘럼
│       ├── video/                       강의 영상
│       ├── kit-photos/                  키트 구성 사진
│       ├── materials/                   수강생 배포 자료
│       └── instructor/                  강사 프로필
├── archive/                             종료된 강의
├── _shared/                             공통 자료
│   ├── certificate-template/            수료증 양식
│   ├── class-intro-template/            강의 소개 양식
│   └── evaluation-forms/                평가지
└── _instructor-pool/                    강사 풀 관리
    └── {강사명}/
        ├── profile/                     프로필 사진, 소개
        ├── portfolio/                   포트폴리오
        └── contract/                    계약서 (경영진 전용)
```

### 3-3. marketing/ — 마케팅 소재

```
marketing/
├── campaigns/                           기획전/이벤트별
│   └── {YYYYMM}_{캠페인명}/
│       ├── banners/                     배너 이미지
│       ├── sns-posts/                   SNS 게시물
│       ├── ad-creatives/                광고 소재
│       └── results/                     성과 기록
├── sns/                                 일상 SNS 콘텐츠
│   ├── instagram/
│   ├── youtube-thumbnails/
│   └── blog/
├── email-templates/                     이메일/알림톡 템플릿
└── _archive/                            지난 캠페인
```

### 3-4. customer-gallery/ — 고객 작품/UGC

```
customer-gallery/
├── by-class/                            강의별 수강생 작품
│   └── {강의명}/
│       └── {YYYYMM}_{수강생명}_작품설명.jpg
├── by-product/                          상품 활용 사진
│   └── {상품명}/
├── reviews/                             포토 리뷰 모음
│   └── {YYYYMM}/
├── supporters/                          서포터즈 활동 자료
│   └── {기수}_{YYYY}/
└── sns-mentions/                        SNS 태그/멘션 캡처
```

### 3-5. product-dev/ — 제품 개발/레시피

```
product-dev/
├── recipes/                             배합비, 제조법, 기법
│   ├── resin/                           레진 관련
│   ├── flower-drying/                   꽃 건조 기법
│   ├── coloring/                        착색 기법
│   ├── finishing/                       마감 처리
│   └── _tips/                           원장님 팁 모음
├── ideas/                               아이디어/기획 메모
├── prototypes/                          시제품 사진, 테스트 결과
│   └── {YYYYMM}_{상품명}/
│       ├── photos/
│       └── notes.txt
├── supplier-samples/                    거래처 샘플 비교
└── launched/                            출시 확정 (→ products/로 복사)
```

### 3-6. sourcing/ — 거래처/소싱

```
sourcing/
├── suppliers/                           거래처별 폴더
│   └── {거래처명}/
│       ├── catalogs/                    카탈로그
│       ├── quotes/                      견적서
│       ├── contracts/                   계약서 (경영진 전용)
│       └── samples/                     샘플 사진
├── 1688/                                해외 소싱 자료
│   ├── search-results/                  검색 결과 캡처
│   └── orders/                          발주 기록
├── customs/                             통관 서류
│   └── {YYYYMM}/
└── _price-comparison/                   가격 비교표
```

### 3-7. accounting/ — 세무/증빙 (5년 보관)

```
accounting/
├── {YYYY}/                              연도별
│   ├── {MM}/                            월별
│   │   ├── sales/                       매출 증빙
│   │   ├── purchase/                    매입 증빙
│   │   ├── payroll/                     급여 관련
│   │   ├── insurance/                   보험료 납부
│   │   └── tax-filing/                  세무 신고 서류
│   └── annual/                          연간 결산
├── certificates/                        사업자등록증, 인감
└── _for-accountant/                     세무사 전달용 공유 폴더
```

### 3-8. hr/ — 인사/직원

```
hr/
├── employees/                           직원별 (이름 이니셜)
│   └── {이니셜}_{입사년}/
│       ├── contract/                    근로계약서
│       ├── insurance/                   4대보험 가입서류
│       └── training/                    교육 이수 기록
├── policies/                            취업규칙, 복무규정
└── organization/                        조직도, 업무 분장
```

### 3-9. licenses/ — 지식재산/인허가

```
licenses/
├── trademarks/                          상표등록증, 출원 서류
│   ├── forever-love/
│   ├── resiners/
│   └── pressco21/
├── business-registration/               사업자등록증, 변경 이력
├── ecommerce-permits/                   통신판매업, 채널 입점 계약
│   ├── makeshop/
│   ├── smartstore/
│   ├── coupang/
│   └── 11st/
└── import-export/                       수입 관련 인허가
```

### 3-10~15. 기존 카테고리 (유지)

`brand-assets/`, `brand-system/`, `templates/`, `sales-kits/`, `internal-docs/`, `operations/`
→ 기존 company-hub-taxonomy.md 구조 그대로 유지.

---

## 4. 접근 권한 체계

### 4-1. 역할 정의

| 역할 | 계정명 | 대상 | 핵심 권한 |
|------|--------|------|----------|
| **경영진** | `pressco21` | 대표, 원장님 | 전체 관리자. 모든 폴더 접근·수정·삭제 |
| **직원-일반** | `staff` | 일반 직원 | 업무용 자료만 열람·다운로드. 민감 정보 접근 불가 |
| **직원-업로드** | `staff-upload` | 직원 업로드용 | inbox에 파일 올리기만 가능 |
| **작업자** | `creator` | 편집자, 디자이너 | 작업물 동기화 영역 + 브랜드 자산 다운로드 |
| **강사** | `instructor` | 파트너클래스 강사 | 본인 강의 자료만 열람·다운로드 |

### 4-2. 폴더별 접근 매트릭스

```
                        경영진  직원   작업자  강사
                        ━━━━━  ━━━━  ━━━━━  ━━━━
products/                 ✅     ✅     ✅     ❌
classes/                  ✅     ✅     ❌     본인만
marketing/                ✅     ✅     ✅     ❌
customer-gallery/         ✅     ✅     ✅     ❌
product-dev/              ✅     ❌     ❌     ❌
brand-assets/             ✅     ✅     ✅     ❌
brand-system/             ✅     ✅     ✅     ❌
templates/                ✅     ✅     ✅     ❌
sales-kits/               ✅     ✅     ❌     ❌
sourcing/                 ✅     ❌     ❌     ❌
accounting/               ✅     ❌     ❌     ❌
hr/                       ✅     ❌     ❌     ❌
licenses/                 ✅     ❌     ❌     ❌
internal-docs/            ✅     일부   ❌     ❌
operations/               ✅     ✅     ❌     ❌
```

### 4-3. 기술 구현: symlink 기반 View 폴더

File Browser는 사용자당 하나의 root scope만 지정 가능.
→ 역할별 "뷰" 폴더를 만들고, 허용된 카테고리만 symlink로 연결.

```
/srv/pressco21-vault/_views/

staff-view/                              직원 접근 뷰
├── products → /srv/pressco21-vault/products
├── classes → /srv/pressco21-vault/classes
├── marketing → /srv/pressco21-vault/marketing
├── customer-gallery → /srv/pressco21-vault/customer-gallery
├── brand-assets → /srv/pressco21-vault/brand-assets
├── brand-system → /srv/pressco21-vault/brand-system
├── templates → /srv/pressco21-vault/templates
├── sales-kits → /srv/pressco21-vault/sales-kits
├── operations → /srv/pressco21-vault/operations
└── internal-docs-public → .../internal-docs/01-company-profile  (일부만)

creator-view/                            작업자 접근 뷰
├── products → /srv/pressco21-vault/products
├── marketing → /srv/pressco21-vault/marketing
├── customer-gallery → /srv/pressco21-vault/customer-gallery
├── brand-assets → /srv/pressco21-vault/brand-assets
├── brand-system → /srv/pressco21-vault/brand-system
└── templates → /srv/pressco21-vault/templates

inbox-view/                              업로드 전용 뷰
└── inbox → /srv/pressco21-vault/_inbox
```

### 4-4. File Browser 계정 설정

| 계정 | scope | create | modify | delete | download | admin |
|------|-------|--------|--------|--------|----------|-------|
| `pressco21` | `/` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `staff` | `/staff-view` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `staff-upload` | `/inbox-view` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `creator` | `/creator-view` | ❌ | ❌ | ❌ | ✅ | ❌ |

경영진(pressco21) = 전체 관리자. 나머지는 읽기/다운로드만.
업로드는 staff-upload 계정으로 inbox에만 가능.

---

## 5. 자동화 연동

### 5-1. 이미지 자동 처리 (4-B)

```
트리거: _inbox/products/{상품폴더}/ 에 원본 이미지 업로드
  → 자동 처리 스크립트 실행:
    1. 배경 제거 (rembg)
    2. 채널별 리사이즈
       - makeshop: 860x860
       - smartstore: 1000x1000
       - coupang: 780x780
       - 11st: 640x640
    3. WebP 변환 (용량 최적화)
    4. products/{brand}/{product}/channel/ 각 폴더에 자동 배치
    5. MinIO에 자동 업로드 (CDN)
```

### 5-2. 교육 자료 자동 생성 (classes)

```
트리거: NocoDB 파트너클래스에 신규 강의 등록
  → n8n 워크플로우:
    1. classes/active/{class-id}_{강의명}/ 폴더 자동 생성
    2. 하위 구조 (curriculum, video, kit-photos 등) 자동 생성
    3. 강사에게 업로드 안내 알림톡 발송
```

### 5-3. 세무 증빙 자동 보관 (accounting)

```
트리거: 주문 발생 시 (전 채널)
  → n8n 워크플로우:
    1. 거래명세표 PDF 생성 (HWPX 스킬)
    2. accounting/{YYYY}/{MM}/sales/ 에 자동 저장
    3. 월말에 _for-accountant/ 폴더에 월간 요약 생성
```

### 5-4. 고객 작품 수집 자동화

```
트리거: 수동 (직원이 inbox에 업로드) 또는 자동 (SNS 태그 감지)
  → 자동 분류:
    1. 파일명에 강의명 포함 → customer-gallery/by-class/
    2. 파일명에 상품명 포함 → customer-gallery/by-product/
    3. 판별 불가 → customer-gallery/reviews/{YYYYMM}/
```

### 5-5. 재해복구 핫스탠바이 (4-D)

```
준비물 (미리 설치):
  - Docker + docker-compose
  - 최신 Postgres pg_dump (매일 자동)
  - NocoDB SQLite 백업 (매일 자동, 기존)
  - docker-compose 설정 파일 (매일 자동, 기존)

복구 절차 (비상시):
  1. 미니 PC에서 docker compose up
  2. pg_dump에서 DB 복원
  3. Tailscale로 도메인 전환
  4. 예상 복구 시간: 30분 이내
```

---

## 6. 물리 저장소 배치

```
내장 512GB SSD (OS + 시스템)
├── /srv/pressco21-vault/          ← Company Vault 메인
├── /srv/pressco21-backup-node/    ← Oracle 백업 수신
└── /var/lib/pressco21-*/          ← 서비스 데이터

외장 1TB SSD (활성 작업물)
└── /mnt/pressco21-ssd/
    ├── PRESSCO21_ACTIVE/          ← Creator Sync (영상/디자인)
    └── vault-overflow/            ← Vault 용량 초과 시

외장 4TB HDD (장기 보관)
└── /mnt/pressco21-hdd/
    ├── PRESSCO21_ARCHIVE/         ← 완료 프로젝트 아카이브
    ├── PRESSCO21_BACKUP/          ← Oracle 장기 백업
    └── vault-archive/             ← Vault 오래된 자료 이동
```

---

## 7. 파일 찾기를 쉽게 만드는 규칙

### 7-1. 파일명 규칙

```
상품 사진:   {브랜드}_{상품명}_{용도}.확장자
             forever-love_로즈오일_상세메인.jpg

마케팅:      {YYYYMM}_{캠페인}_{매체}_{사이즈}.확장자
             202604_봄맞이_인스타_1080x1080.jpg

증빙:        {YYYYMMDD}_{거래처}_{문서종류}.확장자
             20260401_한진택배_세금계산서.pdf

레시피:      {분야}_{기법명}_v{버전}.확장자
             resin_투명레진_기포제거_v02.txt

고객작품:    {YYYYMM}_{수강생명}_{작품설명}.확장자
             202604_김영희_장미레진코스터.jpg
```

### 7-2. 폴더 안 README

모든 최상위 폴더에 `README.ko.txt` 배치.
내용: 이 폴더에 뭘 넣는지, 파일명 규칙, 예시.

### 7-3. File Browser 검색

File Browser 내장 검색으로 파일명 검색 가능.
경영진 계정: 전체 검색. 직원 계정: 허용된 폴더 내에서만 검색.

---

## 8. 실행 계획

### Phase 1: 기반 구축 (미니 PC 기동일)

우선순위: 폴더 생성 + 권한 설정 + 기존 백업 연결

```
□ 1-1. 미니 PC 기동 및 SSH 접속 확인
□ 1-2. /srv/pressco21-vault/ 15개 카테고리 폴더 생성
□ 1-3. README.ko.txt 전 폴더 배치
□ 1-4. _views/ symlink 뷰 생성 (staff, creator, inbox)
□ 1-5. File Browser 계정 추가 (staff, staff-upload, creator)
□ 1-6. File Browser 바인딩 127.0.0.1로 변경 (보안)
□ 1-7. logrotate 설정 추가
□ 1-8. Oracle 백업 스크립트에 pg_dump 추가
□ 1-9. install-mini-pc-backup-node.sh 실행 + 테스트
□ 1-10. NocoDB 버전 pinning 재확인
```

### Phase 2: 자료 1차 이관 (Phase 1 완료 후 1주)

대표/원장님이 직접 올리는 것부터 시작.

```
□ 2-1. brand-assets/01-logos/ — 로고 파일 수집
□ 2-2. licenses/trademarks/ — 상표등록증 스캔 보관
□ 2-3. products/ — 주력 상품 10개 사진 정리 (테스트)
□ 2-4. product-dev/recipes/_tips/ — 원장님 팁 3개 기록 (테스트)
□ 2-5. customer-gallery/supporters/ — 서포터즈 자료 이관
```

### Phase 3: 자동화 연동 (Phase 2 완료 후)

```
□ 3-1. 이미지 자동 처리 스크립트 (rembg + 리사이즈)
□ 3-2. content-curator 스크립트를 vault 구조에 맞게 수정
□ 3-3. 재해복구용 Docker + pg_dump 복원 스크립트 준비
□ 3-4. n8n 강의 폴더 자동 생성 워크플로우
```

### Phase 4: 직원 온보딩 (Phase 3 완료 후)

```
□ 4-1. 직원용 사용 가이드 작성 (스크린샷 포함)
□ 4-2. 직원 계정 비밀번호 전달
□ 4-3. 업로드 테스트 (직원 1명과 함께)
□ 4-4. 피드백 수집 및 구조 조정
```

---

## 9. v1 대비 변경 요약

| 항목 | v1 (기존) | v2 (신규) |
|------|----------|----------|
| 최상위 카테고리 | 6개 (일반적) | 15개 (PRESSCO21 맞춤) |
| 상품 자료 | 없음 | products/ (채널별 이미지 분류) |
| 교육 자료 | 없음 | classes/ (강의별 체계) |
| 마케팅 소재 | 없음 | marketing/ (캠페인별) |
| 고객 UGC | 없음 | customer-gallery/ |
| 레시피/노하우 | 없음 | product-dev/recipes/ |
| 소싱/거래처 | 없음 | sourcing/ |
| 세무 증빙 | finance-admin (약함) | accounting/ (5년 보관 체계) |
| 인사 | 없음 | hr/ |
| 지식재산 | 없음 | licenses/ |
| 접근 권한 | 3단계 (admin/upload/library) | 5단계 (경영진/직원/업로드/작업자/강사) |
| 이미지 자동처리 | 없음 | inbox → 채널별 자동 변환 |
| 재해복구 | 없음 | Docker + pg_dump 핫스탠바이 |

---

## 10. 관련 문서

| 문서 | 위치 | 관계 |
|------|------|------|
| Company Hub 분류 체계 v1 | `docs/파트너클래스/mini-pc-company-hub-taxonomy.md` | 이 문서로 대체 |
| 파일명 규칙 | `docs/파트너클래스/mini-pc-company-hub-filename-rules.md` | 유지, 보강 예정 |
| 보관 시스템 운영 가이드 | `docs/파트너클래스/mini-pc-company-storage-operations-guide.md` | v2 기준으로 갱신 예정 |
| 백업 노드 가이드 | `docs/파트너클래스/archive/.../mini-pc-backup-node-guide.md` | 유지 |
| 사방넷 졸업 프로젝트 | memory/sabangnet-graduation.md | 연관 (고객운영OS 데이터 보관) |
