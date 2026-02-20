# Task 202: 메이크샵 클래스 상품 등록 체계 구축

> **상태**: 코드 완료 (배포/테스트 대기)
> **규모**: M
> **예상 기간**: 3~5일
> **의존성**: Task 201 (GAS 백엔드 완성)
> **우선순위**: Phase 2-A 최우선 (Phase 2-B UI 착수 전 완료 필수)

## 목표

파트너 클래스 플랫폼에서 클래스를 메이크샵 D4 "상품"으로 등록하는 전체 프로세스를 설계하고,
GAS에 상품-Sheets 동기화 배치 함수를 추가한다.

Phase 2-B (클래스 목록/상세 UI)와 Phase 2-C (정산 자동화)가 이 체계를 기반으로 동작한다.

## 대상 파일

- `파트너클래스/class-platform-gas.gs` (기존 파일 확장 - syncClassProducts_() 추가)
- `docs/phase2/class-product-registration.md` (신규 생성 - 관리자 가이드)
- `docs/phase2/member-group-management.md` (신규 생성 - 회원그룹 관리 가이드)

## 기술 전제조건 (검증 완료)

### 메이크샵 상품/옵션 체계 (Task 151 확인)
- 옵션 개수 제한: **제한 없음** (실측 확인)
- 옵션별 개별 재고 설정 가능
- 회원그룹 가상태그: `<!--/group_level/-->` = "2" (강사회원 확인)

### 기존 GAS 백엔드 (Task 201 완료)
- `파트너클래스/class-platform-gas.gs` 2,700여 줄
- pollOrders: 10분 간격 주문 폴링 엔드포인트 이미 구현
- "클래스 메타" 시트 B열: makeshop_product_id (branduid) 컬럼 설계됨

## 클래스-상품 매핑 체계

### 핵심 개념
```
메이크샵 상품 1개 = 클래스 1개
┌─────────────────────────────────┐
│ 상품명: [강사명] 봄꽃 압화 원데이   │
│ 카테고리: 파트너 클래스             │
│ 가격: 65,000원                   │
│                                  │
│ 옵션 (날짜/시간 슬롯):            │
│  - 3월 15일 오후 2시 | 재고: 8    │
│  - 3월 22일 오전 10시 | 재고: 8   │
│  - 3월 29일 오후 2시 | 재고: 8   │
└─────────────────────────────────┘
branduid (상품 코드) → class_id (CLS001~)
```

### 옵션 = 예약 슬롯
- 형식: "M월 D일 HH시 mm분" (예: "3월 15일 오후 2시")
- 재고 = 정원 (8명이면 재고 8, 예약 완료 시 재고 0)
- 수강 완료 후 정원 리셋 불필요 (신규 옵션 추가)

### 상품 등록 템플릿
- **카테고리**: 파트너 클래스 (메이크샵 카테고리 신규 생성)
- **상품명**: `[파트너명] {클래스명}`
- **판매가**: 수강료 (파트너 설정)
- **상품 코드 (branduid)**: 자동 부여 → Sheets "클래스 메타" B열에 기입
- **상세 설명**: GAS에서 가져오는 Sheets 데이터 (HTML)
- **재고 관리**: 옵션별 개별 재고

## 회원그룹 관리 체계

### 그룹 구조
| 그룹명 | group_level | 용도 |
|--------|-------------|------|
| 일반회원 | 1 | 기본 수강생 |
| 강사회원 | 2 | 파트너 (검증 완료) |

### 파트너 인증 플로우 (확정)
```
1. HTML: <span id="ptn-user-id" style="display:none"><!--/user_id/--></span>
2. JS: memberId = document.getElementById('ptn-user-id').textContent.trim()
3. GAS: memberId → "파트너 상세" 시트 B열(member_id) 매칭
4. 비파트너 → NOT_PARTNER 에러, 파트너 → 대시보드 데이터 반환
```

## GAS 추가 함수 설계

### syncClassProducts_()
```
목적: 메이크샵 클래스 상품 정보를 일 1회 Sheets에 동기화
트리거: 매일 오전 3시 GAS 시간 트리거

로직:
1. 메이크샵 상품 목록 API 호출 (카테고리 = "파트너 클래스" 필터)
2. Sheets "클래스 메타" 전체 조회
3. branduid 기준으로 매칭:
   - 신규 상품 → 새 행 추가 (class_id 자동 부여: CLS001~)
   - 기존 상품 → 가격/상태 업데이트
   - 메이크샵에서 삭제된 상품 → 상태 INACTIVE 처리
4. 동기화 결과 관리자 이메일 발송 (추가/변경/삭제 건수)

재사용: callMakeshopApi_() 유틸, jsonResponse()
코드 위치: GAS 파일 하단 "섹션 6: 배치/동기화 함수"
```

### getOrdersByClass_() (pollOrders 보완)
```
목적: 기존 pollOrders에서 클래스 상품 주문만 필터링
로직:
1. 메이크샵 주문 조회 API 호출
2. 상품 카테고리 = "파트너 클래스"인 주문만 필터
3. Sheets "클래스 메타" B열(branduid)로 class_id 역매핑
4. recordBooking 플로우 연결
```

## API 활용 계획

### 메이크샵 API 사용
| API | 용도 | 호출 빈도 |
|-----|------|----------|
| 상품 목록 조회 | syncClassProducts_ | 일 1회 (오전 3시) |
| 주문 조회 | pollOrders (기존) | 10분 간격 |

### API 예산 영향
- 기존: 28회/시간 (Task 152 확정)
- syncClassProducts_ 추가: +0.04회/시간 (일 1회)
- **총합: 28.04회/시간 → 한도의 5.6% (여유 충분)**

## 구현 단계

- [x] 1단계: 메이크샵 클래스 상품 등록 가이드 작성 (`docs/phase2/class-product-registration.md`)
  - 상품 카테고리 생성 방법
  - 상품명/설명/가격 설정 템플릿
  - 옵션(날짜/시간) 등록 방법
  - branduid -> Sheets 연결 방법
- [x] 2단계: 회원그룹 관리 가이드 작성 (`docs/phase2/member-group-management.md`)
  - 강사회원 그룹 설정 방법
  - 파트너 승인 절차
  - GAS 파트너 인증 연동 설명
  - 파트너 계정 비활성화/재활성화 방법
- [x] 3단계: GAS syncClassProducts_() 함수 구현
  - 기존 GAS 파일 하단에 "추가 섹션: 배치/동기화 함수" 추가
  - fetchClassProducts_() API 호출 함수 구현
  - 신규/업데이트/비활성 3방향 동기화 로직
  - 에러 처리 + 관리자 이메일 알림
  - triggerSyncClassProducts() 트리거 래퍼
  - getClassCategoryId_() 카테고리 ID 조회
  - extractClassName_(), parseProductName_(), padNumber_() 유틸
- [x] 4단계: GAS pollOrders 클래스 필터 보완 (기존 구현으로 충분)
  - Task 201에서 이미 구현: getClassProductIdMap_()로 클래스 상품 필터링
  - branduid -> class_id 역매핑 이미 동작 중
  - 추가 구현 불필요 확인
- [ ] 5단계: makeshop-code-reviewer 코드 검수
- [x] 6단계: ROADMAP.md + Task 파일 업데이트

## 테스트 체크리스트

- [ ] 샘플 클래스 상품 메이크샵에 등록 (수동)
- [ ] syncClassProducts_() GAS 에디터에서 수동 실행 → Sheets 동기화 확인
- [ ] 동기화 후 "클래스 메타" 시트 B열 branduid 기입 확인
- [ ] 클래스 상품 주문 → pollOrders 감지 → 정산 내역 기록 확인
- [ ] API 호출 횟수 한도 초과 없음 확인

## 수락 기준

- [ ] 클래스 상품 등록 절차가 가이드 문서에 명확히 정의됨
- [ ] syncClassProducts_() 함수가 GAS에 추가되고 정상 실행됨
- [ ] 메이크샵 상품 branduid → Sheets class_id 매핑이 동작함
- [ ] 기존 pollOrders 주문 감지가 클래스 상품에 대해 정상 동작함
- [ ] 코드 리뷰 통과 (makeshop-code-reviewer)

## 에이전트 투입

- **주도**: makeshop-planning-expert (상품 등록 체계 설계, 가이드 문서)
- **협업**: gas-backend-expert (GAS 함수 구현)
- **협업**: ecommerce-business-expert (가격 책정/수수료 체계 확인)

## 변경 사항 요약

- 2026-02-21: Task 202 파일 생성, Shrimp Task Manager 등록 완료
- 2026-02-21: Task 202 코드 구현 완료 (makeshop-planning-expert)
  - `docs/phase2/class-product-registration.md` 생성 (관리자 가이드)
    - 카테고리 생성, 상품 등록, 옵션(일정) 등록, branduid-Sheets 연결, 수정/삭제 관리
    - 상품명 규칙: `[파트너명] 클래스명`, 옵션 형식: `YYYY-MM-DD HH:mm 요일`
    - 등록 체크리스트 포함
  - `docs/phase2/member-group-management.md` 생성 (회원그룹 관리 가이드)
    - 강사회원(group_level=2) 설정, 파트너 승인 4단계 절차
    - GAS 3단계 인증 아키텍처 상세 설명
    - 비활성화/재활성화 절차, 등급 체계(SILVER/GOLD/PLATINUM)
    - 운영 시나리오 5가지 대응 가이드
  - `파트너클래스/class-platform-gas.gs` 확장 (2,748줄 -> 3,140줄)
    - syncClassProducts_(): 메이크샵 -> Sheets 상품 동기화 (신규/업데이트/비활성)
    - triggerSyncClassProducts(): GAS 시간 트리거 래퍼
    - getClassCategoryId_(): 시스템 설정에서 카테고리 ID 조회
    - fetchClassProducts_(): 메이크샵 상품 목록 API 호출
    - extractClassName_(), parseProductName_(), padNumber_(): 유틸리티
    - var만 사용, 템플릿 리터럴 없음, 기존 코드 무수정
  - 4단계(pollOrders 보완): Task 201에서 이미 구현 확인 (추가 불필요)
