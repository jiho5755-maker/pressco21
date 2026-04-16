# PRD: PRESSCO21 운영 기억장치 + AI Wiki + NAS 활용 체계 v1

> 버전: v1.0  
> 작성일: 2026-04-15  
> 완료일: 2026-04-15  
> 상태: Approved / Implementation Started  
> 성격: 사내 자료 체계, AI 지식베이스, NAS 활용, 자동 분류/보관 PRD  
> 관련 시스템: 미니 PC NAS, Nextcloud, File Browser, Syncthing, n8n, NocoDB, Customer OS Core, MinIO/이미지호스팅

## 1. 프로젝트 정의

### 1.1 한 줄 정의

PRESSCO21 운영 기억장치는 회사 자료, 원본 데이터, 공식 기준, AI 지식, 배포 자산을 미니 PC NAS 중심으로 체계화해 작은 회사도 큰 회사처럼 자료를 찾고, 검증하고, 재사용할 수 있게 만드는 내부 운영 기반이다.

### 1.2 왜 지금 필요한가

현재 PRESSCO21에는 이미 많은 운영 자산이 있다.

- Nextcloud 기반 사내 공유드라이브
- File Browser 기반 관리자 보관소
- Syncthing 기반 영상/대용량 자료 동기화
- n8n 자동화 워크플로우
- NocoDB 운영 테이블
- Customer OS PRD와 오픈마켓/CRM/정부지원/이미지호스팅 자동화 계획
- 회사 지식 문서와 PRD, 매뉴얼, 직원 가이드

하지만 자료가 늘어날수록 아래 문제가 생긴다.

- 자료가 어디에 있는지 찾기 어렵다.
- 원본, 작업본, 최종본, 공식 기준이 섞인다.
- AI가 읽어도 되는 문서와 민감 문서가 섞일 수 있다.
- 이미지호스팅에 불필요한 파일이 쌓일 위험이 있다.
- n8n 자동화가 처리한 원본 증거가 일관되게 남지 않는다.
- 작은 회사 특성상 운영 기준이 사람 머릿속에 남기 쉽다.

이 PRD의 목적은 단순 폴더 정리가 아니라, 회사의 운영 경험과 기준을 축적하는 구조를 만드는 것이다.

### 1.3 핵심 문장

`직원은 쉽게 올리고, 시스템은 분류를 돕고, 관리자는 공식 기준만 승격하며, AI와 직원 서비스는 그 기준을 재사용한다.`

## 2. 목표

### 2.1 제품 목표

1. 미니 PC NAS를 사내 운영 기억장치로 승격한다.
2. 자료를 원본, 작업본, 공식본, AI 지식, 공개 배포물, 민감자료로 분리한다.
3. AI Wiki는 장지호 관리자만 편집/승격할 수 있게 한다.
4. 직원들은 AI Wiki를 직접 수정하지 않지만, 검색/가이드/자동화/업무 지원을 통해 간접 혜택을 받는다.
5. n8n 자동화의 원본 입력/출력과 운영 증거를 NAS에 날짜별로 남긴다.
6. 이미지호스팅은 승인된 최종 공개 자산만 올라가도록 한다.
7. Customer OS 원본 보관소를 만들어 DB 정합성 문제를 추적할 수 있게 한다.
8. 정부지원사업, 계약/증빙, 회의/결정, SOP를 재사용 가능한 회사 지식으로 축적한다.

### 2.2 비목표

- 전사 ERP를 새로 만드는 것
- 시놀로지 DSM 같은 통합 웹 관리 UI를 직접 만드는 것
- 직원이 AI Wiki 원문을 자유롭게 수정하게 하는 것
- 모든 파일을 AI가 자동으로 마음대로 이동하게 하는 것
- 모든 자료를 이미지호스팅/공개 URL로 올리는 것
- 개인정보/계약/세무 자료를 AI 일반 지식으로 섞는 것

## 3. 운영 원칙

1. 원본 보존
   - API 응답, 엑셀, CSV, 제출본, 수집 파일은 수정하지 않고 raw archive에 보관한다.

2. 공식 기준 분리
   - 회사가 현재 기준으로 인정하는 문서만 official 영역에 둔다.

3. AI Wiki 관리자 단일화
   - AI Wiki의 편집, 삭제, 공식 승격 권한은 장지호 관리자만 가진다.

4. 직원 혜택은 서비스로 제공
   - 직원은 AI Wiki를 직접 고치지 않아도, 검색, 자동 답변, 문서 추천, 업무 가이드, 체크리스트 형태로 혜택을 받는다.

5. 자동 이동보다 자동 추천
   - 초기에는 AI가 분류와 민감도, 추천 위치를 제안하고 관리자가 승인한다.

6. 공개 배포는 승인 후 실행
   - 이미지호스팅/MinIO에는 `검수완료` 또는 `승인완료` 상태의 파일만 올라간다.

7. 민감정보 우선 보호
   - 개인정보, 계약, 계좌, 세무, 직원자료는 AI Wiki 일반 영역과 분리한다.

8. 작은 회사에 맞는 단순성
   - 직원이 복잡한 분류 체계를 외우게 하지 않는다. 업로드함은 단순하게, 정리는 시스템과 관리자가 담당한다.

## 4. 전체 정보 구조

NAS 최상위 운영 구조는 아래를 기준으로 한다.

```text
PRESSCO21-NAS/
├── 00_INBOX_업로드함
├── 10_RAW_원본보관
├── 20_WORK_진행중
├── 30_OFFICIAL_공식자료
├── 40_AI_WIKI_AI지식베이스
├── 50_PUBLISH_배포대기
├── 60_ARCHIVE_장기보관
├── 70_PRIVATE_민감자료
└── 90_SYSTEM_시스템백업
```

### 4.1 00_INBOX_업로드함

직원, 관리자, 자동화가 일단 자료를 넣는 곳이다.

```text
00_INBOX_업로드함/
├── 직원업로드
├── 관리자검토
├── 자동수집
├── 분류실패
└── 폐기대기
```

역할:

- 직원은 어디에 넣을지 모르겠으면 여기 넣는다.
- n8n/AI가 문서 유형, 민감도, 추천 위치를 붙인다.
- 관리자는 공식 영역, AI Wiki, 민감자료, archive로 승격/이동한다.

### 4.2 10_RAW_원본보관

수집 당시 원본 증거를 저장하는 영역이다. 사람이 직접 수정하지 않는다.

```text
10_RAW_원본보관/
├── customer-os
├── n8n-runs
├── makeshop
├── sabangnet
├── smartstore
├── coupang
├── 11st
├── offline-crm
├── accounting
├── government
└── system-logs
```

날짜 경로 규칙:

```text
10_RAW_원본보관/{domain}/{source}/{type}/YYYY/MM/DD/{filename}
```

예시:

```text
10_RAW_원본보관/customer-os/makeshop/orders/2026/04/15/orders_20260415_030000.csv
10_RAW_원본보관/n8n-runs/daily-sales-report/2026/04/15/execution_20260415_080000.json
```

### 4.3 20_WORK_진행중

현재 작업 중인 자료를 둔다.

```text
20_WORK_진행중/
├── 디자인
├── 상품
├── 마케팅
├── 파트너클래스
├── 오픈마켓
├── 고객운영
├── 정부지원사업
└── 내부문서
```

### 4.4 30_OFFICIAL_공식자료

현재 회사 기준으로 인정된 최종 문서만 둔다.

```text
30_OFFICIAL_공식자료/
├── 회사소개
├── 브랜드
├── 상품기준
├── 고객응대
├── 운영SOP
├── 직원가이드
├── 템플릿
└── 의사결정
```

공식자료 승격 기준:

- 담당자가 확인했다.
- 현재 기준으로 사용 가능하다.
- 민감도 등급이 정해졌다.
- 문서 owner가 지정됐다.
- AI Wiki로 승격할지 여부가 결정됐다.

### 4.5 40_AI_WIKI_AI지식베이스

AI가 기준으로 삼아도 되는 정제된 회사 지식이다.

```text
40_AI_WIKI_AI지식베이스/
├── 00_회사정체성
├── 01_브랜드기준
├── 02_상품지식
├── 03_고객응대기준
├── 04_운영SOP
├── 05_마케팅전략
├── 06_파트너클래스
├── 07_오픈마켓운영
├── 08_의사결정기록
├── 09_직원역할과권한
└── 99_폐기된기준
```

AI Wiki 관리 원칙:

- 장지호 관리자만 직접 편집, 삭제, 공식 승격 가능
- 직원은 원본 제안이나 자료 업로드만 가능
- AI는 분류/요약/초안 생성만 가능
- official 상태의 문서만 직원 서비스와 AI 자동화에 사용

AI Wiki 문서 메타데이터:

```markdown
---
status: official
owner: 장지호
updated: 2026-04-15
sensitivity: ai-readable
scope: brand/customer/product/operation
source: meeting/manual/prd/n8n
review_cycle: quarterly
---
```

### 4.6 50_PUBLISH_배포대기

공개 배포 후보와 승인된 배포물을 관리한다.

```text
50_PUBLISH_배포대기/
├── 00_후보
├── 10_검수중
├── 20_검수완료
├── 30_배포완료
├── 40_교체됨
└── 90_반려
```

이미지호스팅/MinIO 업로드 기준:

- `20_검수완료`에 있는 파일만 업로드 대상
- 원본 사진, 시안, PSD/AI 작업파일, 참고 이미지는 업로드 금지
- 업로드 후 NocoDB에 asset record를 남긴다.
- 배포 후 파일은 `30_배포완료`로 이동한다.

### 4.7 60_ARCHIVE_장기보관

종료된 프로젝트와 과거 자료를 둔다.

```text
60_ARCHIVE_장기보관/
├── 프로젝트
├── 캠페인
├── 정부지원사업
├── 과거제안서
├── 종료강의
└── 이전기준
```

### 4.8 70_PRIVATE_민감자료

AI 일반 지식과 직원 공유에서 분리해야 하는 자료다.

```text
70_PRIVATE_민감자료/
├── 계약
├── 세무
├── 회계
├── 직원
├── 고객개인정보
├── 계정권한
└── 법무분쟁
```

원칙:

- 기본적으로 AI Wiki로 승격하지 않는다.
- 필요한 경우 요약본만 비식별화해서 AI Wiki에 반영한다.
- 원본은 관리자 전용으로 유지한다.

### 4.9 90_SYSTEM_시스템백업

시스템 복구에 필요한 설정과 백업을 저장한다.

```text
90_SYSTEM_시스템백업/
├── nextcloud
├── n8n
├── nocodb
├── oracle
├── minipc
├── systemd
├── docker-compose
├── credentials-metadata
└── restore-guides
```

### 4.10 현재 NAS 대체 시스템 폴더 체계 검토

현재 미니 PC NAS 대체 시스템은 이미 두 계층으로 나뉘어 있다.

1. 직원이 보는 Nextcloud 계층
   - `브랜드`
   - `디자인`
   - `사진`
   - `내부문서`
   - `영상자료`
   - `관리자문서함`

2. 관리자/자동화가 쓰는 실제 저장 계층
   - `/home/pressbackup/pressco21/nextcloud/shared`
   - `/mnt/pressco21-ssd/PRESSCO21_ACTIVE`
   - `/mnt/pressco21-hdd/PRESSCO21_ARCHIVE`
   - `/mnt/pressco21-hdd/PRESSCO21_BACKUP`
   - `/srv/pressco21-backup-ext4-mirror`

이 방향은 맞다. 비전공자 직원에게는 한국어 업무명 중심의 단순한 입구를 보여주고, 자동화와 관리자는 정교한 내부 경로를 쓰는 방식이기 때문이다.

#### 4.10.1 직원용 폴더 체계 평가

현재 직원용 6개 루트는 비전공자 기준으로 비교적 잘 쓸 수 있다.

| 직원에게 보이는 폴더 | 평가 | 유지 여부 |
| --- | --- | --- |
| `브랜드` | 로고, 브랜드가이드, 템플릿, 소개서가 모이는 곳이라 직관적 | 유지 |
| `디자인` | 진행중, 최종본, 배포대기 흐름을 담기 좋음 | 유지 |
| `사진` | 상품, 수업/행사, 후기, 선별원본으로 나누기 좋음 | 유지 |
| `내부문서` | 매뉴얼, 회의, 양식, 체크리스트를 담기 좋음 | 유지 |
| `영상자료` | Syncthing 대용량 영상 자료를 읽는 용도라 명확함 | 유지, 읽기 중심 |
| `관리자문서함` | 민감자료 격리 역할로 필요함 | 관리자 전용 유지 |

`00_INBOX`는 직원에게 노출해도 된다. 접수함이라는 의미만 한 번 설명하면 충분히 이해 가능하고, 구어체 폴더명보다 회사 문서 체계처럼 보인다. 다만 `10_RAW`, `40_AI_WIKI`, `50_PUBLISH`, `90_SYSTEM` 같은 시스템 폴더는 관리자/자동화 내부 기준으로 두고, 직원용 Nextcloud 화면은 한국어 업무명 중심으로 유지한다.

#### 4.10.2 권장 직원 노출 구조

직원에게는 아래 정도만 보이는 것이 가장 적절하다.

```text
사내공유드라이브/
├── 00_INBOX
├── 브랜드
├── 디자인
├── 사진
├── 내부문서
├── 영상자료
└── 업무가이드

관리자전용/
└── 관리자문서함
```

운영 원칙:

- 직원은 어디에 넣을지 모르겠으면 `00_INBOX`에 넣는다.
- `AI Wiki`라는 원본 폴더명은 직원에게 편집 가능 폴더로 노출하지 않는다.
- 직원에게는 `업무가이드`, `자주 묻는 질문`, `표준 답변`, `체크리스트` 형태로 AI Wiki의 결과만 제공한다.
- `관리자문서함`은 직원 기본 화면에서 보이지 않게 유지한다.

#### 4.10.3 현재 실제 경로와 PRD 구조 매핑

| 현재 실제 경로 | 현재 역할 | PRD 기준 역할 |
| --- | --- | --- |
| `nextcloud/shared/library/brand` | 브랜드 자료 | `30_OFFICIAL_공식자료/브랜드`, `40_AI_WIKI_AI지식베이스/01_브랜드기준` |
| `nextcloud/shared/library/design` | 디자인 진행/최종/배포대기 | `20_WORK_진행중/디자인`, `50_PUBLISH_배포대기` |
| `nextcloud/shared/library/photos` | 사진 보관 | `10_RAW_원본보관`, `20_WORK_진행중`, `50_PUBLISH_배포대기` |
| `nextcloud/shared/library/internal-docs` | 매뉴얼, 회의, 양식 | `30_OFFICIAL_공식자료/운영SOP`, `30_OFFICIAL_공식자료/직원가이드` |
| `nextcloud/shared/admin-vault` | 관리자 민감자료 | `70_PRIVATE_민감자료` |
| `PRESSCO21_ACTIVE/editors` | 영상 원본/프로젝트/완성본 | `20_WORK_진행중/영상`, 일부 `10_RAW_원본보관` |
| `PRESSCO21_ACTIVE/designers` | 디자인 소스/출력/배포 후보 | `20_WORK_진행중/디자인`, `50_PUBLISH_배포대기` |
| `PRESSCO21_ACTIVE/publish` | MinIO/메이크샵 배포 후보 | `50_PUBLISH_배포대기` |
| `PRESSCO21_ARCHIVE` | 확정/장기 보관 | `60_ARCHIVE_장기보관` |
| `PRESSCO21_BACKUP` | Oracle/시스템 백업 | `90_SYSTEM_시스템백업` |
| `pressco21-backup-ext4-mirror` | 내부 SSD 백업 미러 | `90_SYSTEM_시스템백업`, 복구 보조 |

이 매핑을 기준으로 보면 새 PRD 구조는 기존 NAS 대체 시스템을 갈아엎는 계획이 아니라, 기존 구조 위에 더 명확한 운영 기준을 얹는 계획이다.

#### 4.10.4 현재 체계의 좋은 점

- 직원용 폴더명이 한국어라 비전공자도 의미를 바로 이해할 수 있다.
- `브랜드`, `디자인`, `사진`, `내부문서`, `영상자료`는 실제 업무 구분과 잘 맞는다.
- 대용량 영상은 Syncthing/SSD active 영역으로 분리되어 있어 Nextcloud가 무거워지는 것을 막는다.
- `PRESSCO21_ACTIVE`와 `PRESSCO21_ARCHIVE`가 나뉘어 있어 작업중 자료와 장기 보관 자료를 구분할 수 있다.
- `publish` 흐름이 이미 있어 이미지호스팅/MinIO 자동화와 연결하기 좋다.
- 백업 영역이 별도라 운영 자료와 시스템 복구 자료를 분리할 수 있다.

#### 4.10.5 보완해야 할 점

1. `INBOX`는 회사식 접수함 이름으로 유지한다.
   - 권장명: `00_INBOX`
   - 내부 시스템명: `00_INBOX_업로드함`

2. `AI Wiki`는 직원 편집 폴더로 보이면 안 된다.
   - 직원에게는 `업무가이드` 또는 AI 챗봇/검색 서비스로 제공한다.
   - 원본 AI Wiki는 관리자 전용 또는 시스템 전용으로 둔다.

3. `내부문서` 안의 민감자료 경계를 더 엄격히 해야 한다.
   - 계약, 회계, 세무, 인사, 고객 개인정보는 모두 `관리자문서함` 아래로 보낸다.
   - 내부 시스템 기준으로는 `관리자문서함`이 `70_PRIVATE_민감자료`의 직원 비노출 UI 역할을 한다.
   - 직원 공유용 내부문서에는 SOP, 체크리스트, 회의 공유본, 양식만 둔다.

4. 실제 HDD 최상위에는 예전 개인/미디어 폴더가 많다.
   - Nextcloud/File Browser에서는 회사용 루트만 노출하면 즉시 문제는 아니다.
   - RAID 전환 전에는 개인/과거 자료를 별도 `_LEGACY_개인자료_비노출` 같은 보관 영역으로 격리하는 것이 좋다.

5. 일부 실제 경로에 중복 의미가 있다.
   - 예: `brand-guide`와 `brand-system`, `contracts`와 `contracts-legal`, `internal-docs/internal-docs`
   - 바로 삭제하지 말고, 새 기준 경로로 복사/이동 후 일정 기간 `legacy`로 둔다.

#### 4.10.6 최종 권장안

비전공자 직원에게는 `현재 6개 루트 + 00_INBOX + 업무가이드`만 보여준다.

관리자와 자동화에는 이 PRD의 번호형 구조를 기준으로 둔다.

```text
직원 화면: 쉽고 짧은 한국어 업무 폴더
관리자 화면: 민감자료, 승인, 폐기, 장기보관
자동화 화면: 00_INBOX / 10_RAW / 40_AI_WIKI / 50_PUBLISH / 90_SYSTEM
```

이 방식이면 직원은 복잡한 시스템 구조를 몰라도 되고, 회사는 체계적인 분류와 AI 활용, 원본 보존, 배포 승인 흐름을 모두 가져갈 수 있다.

#### 4.10.7 한눈에 보는 권장 폴더 구조도

최종 구조는 `직원용`, `관리자용`, `자동화/시스템용` 세 화면으로 나눈다.

```text
PRESSCO21 NAS 대체 시스템
├── 직원용 Nextcloud 화면
│   ├── 00_INBOX
│   │   ├── 직원업로드
│   │   ├── 관리자검토
│   │   └── 분류실패
│   ├── 브랜드
│   │   ├── 로고
│   │   ├── 브랜드가이드
│   │   ├── 템플릿
│   │   └── 소개서-제안서
│   ├── 디자인
│   │   ├── 진행중-공유본
│   │   ├── 최종본
│   │   ├── 배포대기
│   │   └── 캠페인별
│   ├── 사진
│   │   ├── 상품
│   │   ├── 수업-행사
│   │   ├── 고객후기
│   │   └── 선별원본
│   ├── 내부문서
│   │   ├── 회사기본
│   │   ├── 운영매뉴얼
│   │   ├── 회의-결정
│   │   └── 양식-체크리스트
│   ├── 영상자료
│   │   ├── 촬영원본
│   │   ├── 편집프로젝트
│   │   └── 완성본
│   └── 업무가이드
│       ├── 자주묻는질문
│       ├── 표준답변
│       ├── 업무체크리스트
│       └── AI_Wiki_공식요약본
│
├── 관리자전용 화면
│   └── 관리자문서함
│       ├── 매출-재무
│       ├── 세무-증빙
│       ├── 계약-법무
│       ├── 인사-기밀
│       ├── 고객개인정보
│       ├── 계정-권한
│       ├── AI_Wiki_관리원본
│       └── 폐기-보류
│
└── 자동화/시스템 내부 경로
    ├── 10_RAW_원본보관
    │   ├── customer-os
    │   ├── n8n-runs
    │   ├── makeshop
    │   ├── openmarket
    │   ├── accounting
    │   └── government
    ├── 40_AI_WIKI_AI지식베이스
    │   ├── official
    │   ├── draft
    │   ├── retired
    │   └── index
    ├── 50_PUBLISH_배포대기
    │   ├── 00_후보
    │   ├── 10_검수중
    │   ├── 20_검수완료
    │   ├── 30_배포완료
    │   └── 90_반려
    ├── 60_ARCHIVE_장기보관
    └── 90_SYSTEM_시스템백업
        ├── oracle
        ├── nextcloud
        ├── n8n
        ├── nocodb
        ├── minipc
        └── restore-guides
```

해석:

- 직원은 `직원용 Nextcloud 화면`만 알면 된다.
- 민감자료는 전부 `관리자문서함` 아래로 모은다.
- `AI_Wiki_관리원본`은 관리자전용에 두고, 직원은 `업무가이드` 또는 AI 서비스로 결과만 본다.
- `10_RAW`, `40_AI_WIKI`, `50_PUBLISH`, `90_SYSTEM`은 직원이 직접 관리하는 폴더가 아니라 n8n, NocoDB, 관리자 검토가 쓰는 내부 체계다.

## 5. AI Wiki 권한 모델

### 5.1 역할

| 역할 | 권한 |
| --- | --- |
| 장지호 관리자 | AI Wiki 편집, 삭제, official 승격, 민감도 결정 |
| 직원 | 자료 업로드, 수정 요청, 검색/가이드 이용 |
| n8n 자동화 | 분류 추천, 요약 생성, 메타데이터 초안 생성 |
| AI 서비스 | official 지식 조회, 직원용 답변/가이드 생성 |

### 5.2 직원 수혜 방식

직원은 AI Wiki를 직접 관리하지 않지만 아래 기능의 혜택을 받는다.

- 업무 질문 답변
- 폴더 위치 추천
- 고객응대 문구 추천
- 상품 설명 기준 제공
- 디자인/브랜드 가이드 확인
- SOP 체크리스트 제공
- 정부지원사업 제출서류 체크리스트 생성
- 오픈마켓/메이크샵 운영 가이드 제공

예시:

```text
직원 질문:
  "포토리뷰 이벤트 배너는 어디 올려요?"

AI Wiki 기반 답변:
  "작업 중이면 20_WORK_진행중/마케팅,
   최종 검수 대상이면 50_PUBLISH_배포대기/00_후보,
   공개 업로드는 검수완료 후 자동 처리됩니다."
```

## 6. 자동 분류/승격 흐름

### 6.1 기본 흐름

```text
파일 업로드
  -> 00_INBOX_업로드함
  -> n8n 감지
  -> AI 분류/민감도/추천 위치 생성
  -> NocoDB 검토 큐 생성
  -> 장지호 관리자 승인
  -> 공식 위치 이동
  -> 필요 시 AI Wiki 요약/색인 생성
```

### 6.2 분류 태그

```text
doc_type:
  raw / sop / policy / prd / report / asset / contract / customer-data / gov-doc / meeting / template

sensitivity:
  public / internal / confidential / personal / secret

status:
  inbox / working / review / official / archived / rejected / superseded

domain:
  brand / product / customer / finance / hr / marketing / class / ops / system / government / openmarket

owner:
  담당자
```

### 6.3 자동 이동 제한

초기 단계에서는 AI가 자동으로 official 또는 AI Wiki로 이동하지 않는다.

허용:

- 태그 생성
- 추천 경로 생성
- 요약 생성
- 중복 후보 탐지
- 민감정보 의심 표시

금지:

- official 승격 자동 실행
- 민감자료 공개 영역 이동
- 이미지호스팅 자동 업로드
- 원본 파일 삭제

### 6.4 직원 파일명/분류 규칙

직원별로 흩어진 자료를 모으는 초기 단계에서는 자동분류보다 파일명/폴더 기준을 먼저 통일한다.

기준 문서:

- `docs/nextcloud-file-classification-rules-2026-04-15.md`

직원용 최소 파일명 규칙:

```text
날짜_무슨자료인지_상태_v번호
```

AI 일괄분류에 가장 좋은 권장 형식:

```text
YYYYMMDD_분류_대상_내용_상태_v01_작성자.ext
```

예시:

```text
20260415_디자인_레지너스오일_상세페이지_시안_v01_승해.psd
20260415_사진_부케클래스_수업현장_원본_v01_다경.jpg
20260415_내부문서_오픈마켓_운영체크리스트_공유본_v01_지호.xlsx
```

운영 원칙:

- 알겠는 자료는 직원이 직접 해당 폴더에 넣는다.
- 애매한 자료는 `00_INBOX/직원업로드`에 넣는다.
- 계약, 세무, 매출, 인사, 고객 개인정보, 계정 정보는 공용 폴더에 넣지 않고 관리자에게 전달한다.
- AI/n8n은 초기에는 파일명, 폴더 위치, 확장자, 상태 단어를 기준으로 검토 큐를 만드는 수준부터 시작한다.

## 7. 이미지 배포대기 자동화

### 7.1 목적

이미지호스팅/MinIO에는 실제 외부에 쓰는 최종 공개 파일만 올린다.

### 7.2 흐름

```text
20_WORK_진행중/디자인
  -> 작업
50_PUBLISH_배포대기/00_후보
  -> 배포 후보 업로드
50_PUBLISH_배포대기/20_검수완료
  -> 관리자/담당자 승인
n8n
  -> 이미지 최적화
  -> MinIO/이미지호스팅 업로드
  -> NocoDB asset record 생성
  -> Telegram 알림
50_PUBLISH_배포대기/30_배포완료
  -> 업로드 완료 파일 이동
```

### 7.3 업로드 허용

- 상세페이지 실제 사용 이미지
- 자사몰/스마트스토어/쿠팡/11번가 등록 이미지
- 이메일/알림톡/랜딩페이지 공개 이미지
- 광고 소재 최종본
- SNS 공개 최종본

### 7.4 업로드 금지

- 촬영 원본
- PSD/AI/Figma 작업파일
- 시안
- 참고 이미지
- 내부 검수용 캡처
- 중복 리사이즈 파일
- 직원/고객 개인정보가 포함된 이미지

### 7.5 Asset record 필드

```text
asset_id
original_path
public_url
file_hash
title
domain
channel
usage
approved_by
approved_at
published_at
status
replaced_by
expires_at
```

## 8. Customer OS 원본 보관소

### 8.1 목적

Customer OS DB는 현재 보기 좋은 데이터이고, NAS raw archive는 나중에 검증할 수 있는 원본 증거다.

### 8.2 구조

```text
10_RAW_원본보관/customer-os/
├── makeshop
│   ├── orders
│   ├── members
│   ├── products
│   └── points
├── sabangnet
│   ├── orders
│   ├── shipments
│   └── inventory
├── smartstore
├── coupang
├── 11st
├── offline-crm
│   ├── deposits
│   ├── statements
│   └── customers
├── consultation
└── normalized-exports
```

### 8.3 저장 규칙

- 수집 원본은 수정하지 않는다.
- 각 n8n 실행은 원본 입력, 변환 결과, 오류 로그를 남긴다.
- 개인정보 포함 파일은 `70_PRIVATE_민감자료` 또는 암호화 보관 대상이다.
- DB 적재 후에도 raw file은 retention 기간 동안 보관한다.

## 9. 정부지원사업 자료실

### 9.1 구조

```text
60_ARCHIVE_장기보관/정부지원사업/
├── 2026
│   └── 202604_사업명
│       ├── 00_공고문
│       ├── 01_검토메모
│       ├── 02_작성중
│       ├── 03_제출본
│       ├── 04_증빙자료
│       ├── 05_결과통보
│       └── 06_정산보고
```

### 9.2 자동화

```text
공고 수집
  -> 공고문 NAS 저장
  -> AI 요약 생성
  -> 지원 가능성 점수화
  -> 제출 필요서류 체크리스트 생성
  -> Google Calendar 마감일 등록
  -> Telegram 알림
```

## 10. NocoDB 관리 화면

NocoDB에는 파일 자체가 아니라 목록과 상태를 저장한다.

권장 테이블:

```text
nas_documents
nas_ai_wiki_entries
nas_publish_assets
nas_raw_archives
nas_review_queue
nas_retention_rules
```

### 10.1 nas_review_queue

```text
id
source_path
detected_doc_type
detected_sensitivity
recommended_domain
recommended_target_path
summary
owner_candidate
review_status
reviewed_by
reviewed_at
decision_note
```

### 10.2 nas_ai_wiki_entries

```text
id
title
path
domain
owner
status
sensitivity
source_path
summary
last_reviewed_at
next_review_at
supersedes
```

## 11. 단계별 구현 계획

### Phase 0. 기준 확정

- NAS 최상위 구조 확정
- AI Wiki 관리자 단일 원칙 확정
- 민감도 기준 확정
- 이미지 배포 승인 기준 확정

### Phase 1. 폴더 체계 반영

- Nextcloud/File Browser에 새 루트 구조 생성
- 기존 `브랜드`, `디자인`, `사진`, `내부문서`, `영상자료`, `관리자문서함`과 매핑
- 직원 업로드 동선 단순화

### Phase 2. Raw Archive 자동 저장

- n8n 주요 workflow에 raw 저장 step 추가
- Customer OS, 회계, 오픈마켓, CRM, 정부지원사업부터 적용
- 실패 로그와 실행 결과 저장

### Phase 3. AI Wiki 검토 큐

- `00_INBOX` 감지
- AI 분류/요약
- NocoDB review queue 생성
- 관리자 승인 후 official/AI Wiki 승격

### Phase 4. 이미지 배포대기 자동화

- `50_PUBLISH/20_검수완료` 감지
- 이미지 최적화
- MinIO/이미지호스팅 업로드
- asset record 생성
- 배포완료 이동

### Phase 5. 정부지원사업/운영자료 자동화

- 공고/제출본/증빙/결과 자료실 자동화
- 마감일 캘린더/텔레그램 연동

### Phase 6. RAID/snapshot 이후 안정화

- HDD 2개 RAID1 전환
- btrfs snapshot retention
- 복구 리허설
- 장기 보관 정책 정리

## 12. 성공 기준

1. 직원은 업로드 위치를 몰라도 `00_INBOX`에 넣으면 된다.
2. 관리자는 검토 큐에서 official/AI Wiki 승격 여부를 결정할 수 있다.
3. AI Wiki는 관리자만 수정한다.
4. 직원 서비스는 AI Wiki official 지식을 활용한다.
5. 이미지호스팅에는 승인된 최종 파일만 올라간다.
6. Customer OS 원본 파일이 날짜별로 NAS에 남는다.
7. 정부지원사업 자료가 공고부터 제출/결과까지 한 폴더에 모인다.
8. `pressco21-nas-status`로 시스템 상태를 빠르게 확인할 수 있다.

## 13. 주요 위험과 대응

| 위험 | 대응 |
| --- | --- |
| AI가 민감자료를 잘못 분류 | 자동 이동 금지, 관리자 승인 필수 |
| 이미지호스팅이 쓰레기장화 | 검수완료 폴더만 업로드 |
| 직원이 폴더 체계를 어려워함 | 직원은 INBOX 중심, 관리자가 승격 |
| AI Wiki가 오래되어 틀린 기준 제공 | review_cycle과 폐기된 기준 폴더 운영 |
| 원본 보관소 용량 증가 | domain별 retention 정책 적용 |
| RAID를 백업으로 오해 | RAID1 + snapshot + raw archive 역할 분리 교육 |
| 민감정보가 AI에 노출 | sensitivity 태그와 PRIVATE 분리 |

## 14. 최종 그림

```text
직원
  -> Nextcloud 업로드/검색/업무 요청

미니 PC NAS
  -> 원본, 공식자료, AI Wiki, 배포대기, 민감자료, 시스템백업 보관

n8n
  -> 감지, 분류, 요약, 저장, 알림, 배포 자동화

NocoDB
  -> 검토 큐, asset 목록, raw archive 목록, AI Wiki 색인

AI 서비스
  -> official AI Wiki만 조회해 직원용 답변과 자동화 품질 개선

Oracle
  -> 공개 웹훅, 외부 도메인, 운영 자동화 실행면
```

이 구조가 자리 잡으면 PRESSCO21는 큰 ERP 없이도 운영 자료, 지식, 원본 증거, 배포 자산을 내부 기준으로 소유하게 된다.
