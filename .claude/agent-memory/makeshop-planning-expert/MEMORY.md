# 메이크샵 기획 전문가 메모리

## Phase 1.5 완료 상태 (2026-02-21)

### Task 150: 적립금 API (완료)
- Plan A 확정: `process_reserve` 기본 적립금 API
- 지급/차감/조회 모두 정상, 즉시 반영, 에러 처리 명확
- `datas` 배열로 배치 처리 가능
- 상세: `docs/api-verification/reserve-api-result.md`

### Task 151: 가상태그/옵션 (완료)
- `<!--/user_id/-->`: 개별 페이지에서 로그인 시 "jihoo5755" 치환 성공
- `<!--/group_name/-->`: "강사회원", `<!--/group_level/-->`: "2" 확인
- `{$member_id}` 형식은 메이크샵에서 사용하지 않음 (v1 실패 원인)
- 옵션 제한 없음, 옵션별 개별 재고 가능
- 상세: `docs/api-verification/substitution-options-result.md`

### Task 152: API 예산/캐싱 (완료)
- 현재 메이크샵 API 사용량: **0회/시간** (유튜브/파트너맵은 Sheets 기반)
- Phase 2 추가 후: 조회 ~28회(5.6%), 처리 ~10회(2.0%) -- 한도의 10% 미만
- Phase 2+3 전체: 한도의 7~10% -- 500회/시간은 충분히 여유
- 주문 폴링: 10분 간격 확정 (6회/시간)
- 2계층 캐싱: GAS CacheService + localStorage 조합
- 파트너 인증: Sheets 매칭 (메이크샵 API 호출 불필요)
- 정합성 검증: 새벽 3시 배치
- 상세: `docs/api-budget-caching-strategy.md`

### Phase 2 착수 전제조건: 모두 충족
- 적립금 API, 가상태그 인증, API 예산 -- 모두 검증 완료

## Phase 2 진행 상태

### Task 201: Sheets+GAS 백엔드 (완료)
- GAS 2,700줄, 16개 엔드포인트, Critical 5건 수정 완료

### Task 202: 클래스 상품 등록 체계 (코드 완료, 2026-02-21)
- `docs/phase2/class-product-registration.md`: 관리자 가이드
  - 상품명 규칙: `[파트너명] 클래스명`
  - 옵션 형식: `YYYY-MM-DD HH:mm 요일` (GAS 파싱에 필수)
  - 등록 체크리스트 포함
- `docs/phase2/member-group-management.md`: 회원그룹 관리
  - 파트너 승인 4단계 절차, 비활성화/재활성화
  - GAS 3단계 인증 아키텍처 상세 설명
- GAS 확장 (2,748줄 -> 3,140줄): 기존 코드 무수정
  - syncClassProducts_(): 메이크샵 -> Sheets 일일 동기화
  - triggerSyncClassProducts(): 오전 3시 트리거 래퍼
  - fetchClassProducts_(): 카테고리별 상품 목록 API 호출
  - getClassCategoryId_(): 시스템 설정에서 카테고리 ID
  - pollOrders 보완: Task 201에서 이미 구현 확인 (getClassProductIdMap_)
- 다음: makeshop-code-reviewer 검수, 이후 Task 211 (목록 UI)

## 핵심 패턴

### API 아키텍처 핵심 원칙
- 프론트 -> GAS -> (캐시 미스 시) 메이크샵 API
- 프론트는 메이크샵 API를 직접 호출하지 않음 (CORS + 보안)
- 정적 데이터는 Sheets에 배치 동기화 (일 1회)
- 파트너 인증은 가상태그 + Sheets 매칭 (API 호출 0회)

### 캐싱 TTL 기준
- 정적(24h): 카테고리, 파트너 목록, 등급 정보
- 반정적(1h): 클래스 목록, 클래스 상세, 메타데이터
- 실시간(캐시 불가): 주문 폴링, 적립금 지급, 회원그룹 변경
- 짧은 캐시(5m): 재고(정원), YouTube 영상

## 2026-03-11 S2-3 IA 확장 설계 메모

- 파트너클래스 IA 1차 확장 구조는 `전체 클래스 / 협회·세미나 / 혜택·이벤트` 3탭으로 고정한다.
- `전체 클래스` 내부에서 다시 `리스트 보기 / 지도 보기` 를 둬서 오프라인 탐색만 파트너맵으로 확장한다.
- `협회·세미나` 는 협회 소개가 아니라 일정/세미나/회원용 클래스 허브로 다뤄야 한다.
- `혜택·이벤트` 는 회원 전용 할인, 시그니처 제품 유입, 재료 재구매, 이벤트성 클래스 노출을 묶는 락인 레이어다.
- 상세는 `content_type` 분기 UX를 먼저 완성하고, 실데이터가 늦더라도 `type/tags/affiliation_code` 폴백으로 계속 동작하게 설계한다.
