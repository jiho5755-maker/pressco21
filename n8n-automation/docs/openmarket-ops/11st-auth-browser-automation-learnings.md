# 11번가 Open API 인증 브라우저 자동화 학습 노트

- 작성일: 2026-04-27
- 목적: 11번가 Open API처럼 로그인/추가인증이 필요한 문서·관리 화면을 자동화로 확인할 때 반복 가능한 절차와 안전장치를 남긴다.

## 브라우저 자동화 절차

1. 사용자가 로그인 창을 열거나 로그인 완료를 알려주면 기존 Playwright 세션을 재사용한다.
   - 로그인 이후에는 새 `open`으로 세션을 덮어쓰지 말고 `tab-list`, `tab-select`, `goto`, `eval` 중심으로 이동한다.
   - 세션이 닫히면 로그인 쿠키가 사라질 수 있으므로 다시 사용자에게 로그인 창을 띄워 달라고 요청한다.
2. API 관리/KEY 화면은 스냅샷보다 마스킹된 `eval`을 우선 사용한다.
   - API KEY, 긴 토큰, IP는 출력 전에 마스킹한다.
   - 추가인증 후 KEY가 보일 수 있으므로 `.playwright-cli` 산출물은 커밋하지 않는다.
3. API TEST는 새 탭으로 열린다.
   - `tab-list`로 새 탭 번호를 확인한 뒤 `tab-select`로 이동한다.
   - TEST 버튼은 실제 API 호출이므로, 쓰기 API에서는 정확한 대상 상품번호/가격/승인 없이는 누르지 않는다.

## 11번가 API 관리 화면에서 확인한 구조

- 메뉴: `https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall`
- 화면 구성:
  - API KEY 관리
  - 접속권한
  - 셀링툴 업체 선택
  - IP 직접 입력
  - 개발자 이메일 주소
- 현재 확인된 특징:
  - 권한별 체크박스 목록은 보이지 않았다.
  - IP 직접 입력은 사용 상태였고, n8n/Oracle 서버 IP가 등록되어 있었다.
  - KEY 확인/이메일 수정은 추가인증 후 가능하다.

## 기본즉시할인 제거에 필요한 공식 API

공식 개발가이드 경로:

- `https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?categoryNo=81&apiSeq=1855&apiSpecType=1`

상품가격/즉시할인 수정 API:

- Method: `POST`
- URL: `http://api.11st.co.kr/rest/prodservices/product/priceCoupon/[prdNo]`
- Payload: XML
- 필수 Path Parameter: `prdNo`
- 필수 Request Parameter:
  - `selPrc`: 판매가, 콤마 없이 숫자만 입력
  - `cuponcheck`: 쿠폰 사용 여부

기본즉시할인을 끌 때의 최소 XML 형태:

```xml
<?xml version="1.0" encoding="euc-kr" standalone="yes"?>
<Product>
  <selPrc>현재판매가</selPrc>
  <cuponcheck>N</cuponcheck>
</Product>
```

주의:

- `cuponcheck=N`이면 할인수치(`dscAmtPercnt`), 할인단위(`cupnDscMthdCd`), 할인기간(`cupnUseLmtDyYn`, `cupnIssEndDy`)은 입력하지 않아도 된다고 공식 API TEST/가이드에서 확인했다.
- 판매가를 기존의 높은 금액 그대로 두고 `cuponcheck=N`만 적용하면 소비자가가 높게 노출될 수 있다. 실운영 자동화는 `현재 판매가`, `옵션가 한도`, `기존 할인 후 실판매가`를 함께 계산해야 한다.
- 옵션가 한도 때문에 `selPrc`를 낮출 수 없는 상품은 별도 예외 큐로 분리해야 한다.

## 다음 자동화 설계 메모

1. 상품 식별 단계
   - `prodmarketservice/prodmarket` 또는 Seller Office export/API로 전체 `prdNo`와 현재 가격/할인 상태를 확보한다.
2. 감사 단계
   - `selPrc` 대비 과도한 기본즉시할인 상품을 추출한다.
   - 예: 판매가 26,000원, 즉시할인 25,600원, 실판매 400원.
3. 수정 단계
   - 안전 모드: 대상별 변경 전/후 예상가를 CSV로 저장한다.
   - 실행 모드: `priceCoupon/[prdNo]`에 `selPrc`와 `cuponcheck=N`을 POST한다.
   - 옵션가 한도 오류 또는 가격 정책 오류는 재시도하지 말고 예외 리포트로 남긴다.

## 2026-04-27 읽기 감사에서 새로 확인한 점

- 과거 `prodmarketservice/prodmarket` 조회가 실패했던 주요 원인은 URL이 없어서가 아니라 호출 방식이 달랐기 때문이다.
  - 공식 문서상 다중상품조회는 `GET`이 아니라 `POST` + XML body이다.
  - `GET /rest/prodmarketservice/prodmarket` 호출 결과만 보고 권한 없음으로 단정하면 안 된다.
- 다중상품조회 공식 경로:
  - 문서: `https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?categoryNo=39&apiSpecType=1`
  - API: `POST http://api.11st.co.kr/rest/prodmarketservice/prodmarket`
  - 최소 XML: `<SearchProduct><limit>500</limit><start>1</start><end>500</end></SearchProduct>`
- 다중상품조회 응답에는 `prdNo`, `prdNm`, `sellerPrdCd`, `selPrc`, `cuponcheck`, `selStatCd`, `selStatNm`이 포함된다.
- 상세 상품조회(`GET /rest/prodmarketservice/prodmarket/[prdNo]`)에서는 `dscAmtPercnt`, `cupnDscMthdCd`, `cupnUseLmtDyYn`, `cupnIssEndDy`까지 확인 가능하다.
- 읽기 감사 결과 파일:
  - `n8n-automation/backups/20260427-11st-instant-discount-audit/audit-readonly.json`
  - `n8n-automation/backups/20260427-11st-instant-discount-audit/discount-products-readonly.csv`
  - `n8n-automation/backups/20260427-11st-instant-discount-audit/SUMMARY.md`
