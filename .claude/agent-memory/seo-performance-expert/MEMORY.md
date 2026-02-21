# SEO/퍼포먼스 전문가 메모리

## 프로젝트 Schema.org 현황 (2026-02-21)
- Phase 1a: 메인페이지 Organization+WebSite Schema.org 적용됨
- OG 태그: 메인/간편 구매 적용됨
- Task 211: 클래스 목록 페이지 ItemList + Course Schema 적용 완료 (파트너클래스/목록/js.js injectSchemaOrg)
- Task 212: 클래스 상세 페이지 Course + BreadcrumbList Schema 설계 완료 (미구현)
- Lighthouse baseline 미측정
- Core Web Vitals 현재 수치 미확인

## Task 212 Schema.org 설계 결정 사항 (2026-02-21)
- 타입: Course (주) + BreadcrumbList (보조) -- @graph 배열로 단일 script 태그 통합
- `hasCourseInstance.courseMode: "onsite"` 로 오프라인 현장 수업 명시
- `timeRequired`: minutesToIso8601() 헬퍼로 ISO 8601 변환 (120분 -> "PT2H")
- `aggregateRating`: reviewCount > 0 조건부 추가 (0개 리뷰 허위 데이터 방지)
- OG type: "product" (KakaoTalk 상품 미리보기 카드 + 가격 표시)
- `product:price:amount/currency` OG 태그 추가 (향후 Facebook 픽셀 연동 대비)
- JS 함수: injectSchemaOrg(classData), updateMetaTags(classData), setMetaContent()
- 헬퍼: stripHtmlTags(), minutesToIso8601(), parseLocation()
- Index.html head에 id="schemaClassDetail" script 태그 미리 배치 필요
- class_count(수강횟수) vs review_count(후기수) 분리 필요 -- 현재 GAS API에 review_count 필드 없음
