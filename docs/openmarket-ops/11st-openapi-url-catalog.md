# 11번가 Open API URL Catalog

> 공식 11번가 Open API 개발가이드를 로그인 브라우저 세션에서 크롤링해 생성한 카탈로그입니다.

- 생성일: 2026-04-28
- API 수: 150
- 원본 크롤링: `docs/openmarket-ops/11st-openapi-guide-crawl-2026-04-28.json`

## 카탈로그 품질 요약

- Method 분포: {'GET': 108, 'POST': 28, 'PUT': 12, 'DELETE': 2}
- 활성 API URL 미확인: 0개 (없음)
- 활성 API Method 미표기: 0개 (없음)
- 공식 문서상 Content does not exist/API TEST URL 빈 값: 5개 (1316, 1318, 1319, 6705, 6706)
- payload_type 빈 값: 114개
- 쓰기성/상태변경 추정 API: 71개
- GET이지만 쓰기성으로 취급해 수동 검수할 API: 31개

## 사용 원칙

- `method`와 `payload_type`을 반드시 함께 확인합니다. 11번가는 같은 URL이라도 GET이 아닌 POST/XML인 경우가 많습니다.
- `mutation=true`인 API는 기본 dry-run 이후 execute로만 호출합니다.
- `GET`이어도 API명이 처리/승인/거부/발송/수정/등록이면 쓰기성 API로 취급합니다.
- 상세 파라미터/오류/응답 표는 원본 크롤링 JSON의 `tables`를 기준으로 확인합니다.

## 위험 API 인덱스

| API | Method | URL | Risk | apiSeq | 검증 전략 |
|---|---:|---|---:|---:|---|
| 상품재고수량변경처리 | PUT | `http://api.11st.co.kr/rest/prodservices/stockqty/[prdStckNo]` | high | 1625 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품QnA답변처리 | PUT | `http://api.11st.co.kr/rest/prodqnaservices/prodqnaanswer/[brdInfoNo]/[prdNo]` | medium | 1885 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 판매중지처리 | PUT | `http://api.11st.co.kr/rest/prodstatservice/stat/stopdisplay/[prdNo]` | critical | 1631 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 판매중지해제처리 | PUT | `http://api.11st.co.kr/rest/prodstatservice/stat/restartdisplay/[prdNo]` | critical | 1632 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 출고지조건부배송비 입력/수정 | POST | `http://api.11st.co.kr/rest/areaservice/addOutAddrBasiDlvCst` | medium | 1078 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 출고지 등록(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/registerOutAddress` | medium | 6701 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 반품/교환지 등록(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/registerRtnAddress` | high | 6702 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 출고지 수정(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/updateOutAddress` | medium | 6703 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 반품/교환지 수정(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/updateRtnAddress` | high | 6704 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 발송마감 템플릿 등록 | POST | `http://api.11st.co.kr/rest/prodservices/sendCloseTemplate` | high | 6736 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 발송마감 템플릿 수정 | PUT | `http://api.11st.co.kr/rest/prodservices/sendCloseTemplate/344801` | high | 6737 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 배송지연 공지 등록 | POST | `http://api.11st.co.kr/rest/prodservices/deliveryDelay` | medium | 6757 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 배송지연 공지 해제 | POST | `http://api.11st.co.kr/rest/prodservices/deliveryDelay` | medium | 6758 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 방문수령지등록 | POST | `http://api.11st.co.kr/rest/areaservice/visit/registerVisitAddress` | medium | 6760 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 방문수령지수정 | POST | `http://api.11st.co.kr/rest/areaservice/visit/updateVisitAddress` | medium | 6761 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 해외출고지 등록 | POST | `http://api.11st.co.kr/rest/areaservice/global/registerGlobalOutAddress` | medium | 6793 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 해외출고지 수정 | POST | `http://api.11st.co.kr/rest/areaservice/global/updateGlobalOutAddress` | medium | 6794 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 상품등록/신규상품등록 | POST | `http://api.11st.co.kr/rest/prodservices/product` | medium | 1003 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품수정/신규상품수정 | PUT | `http://api.11st.co.kr/rest/prodservices/product/[prdNo]` | medium | 1619 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품가격수정 | GET | `http://api.11st.co.kr/rest/prodservices/product/price/[prdNo]/[selPrc]` | critical | 1752 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품 추가구성상품  수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductComponent/[prdNo]` | medium | 1849 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품상세설명 수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductDetailCont/[prdNo]` | medium | 1850 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품 옵션 수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductOption/[prdNo]` | medium | 1851 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품가격/즉시할인 수정 | POST | `http://api.11st.co.kr/rest/prodservices/product/priceCoupon/[prdNo]` | critical | 1855 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 상품 판매기간 연장 | PUT | `http://api.11st.co.kr/rest/prodservices/sellterm/[prdNo]/[selPrdClfCd]` | medium | 1856 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 발주확인처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | medium | 1634 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 발송지연안내 처리 | POST | `https://api.11st.co.kr/rest/ordservices/deliveryDelayGuide` | high | 6728 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 부분발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]/[partDlvYn]/[ordNo]/[ordPrdSeq]` | critical | 1636 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 판매불가처리 | GET | `https://api.11st.co.kr/rest/claimservice/reqrejectorder/[ordNo]/[ordPrdSeq]/[ordCnRsnCd]/[ordCnDtlsRsn]` | critical | 1638 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 발송처리(배송중_처리) | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | critical | 1888 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 수량 분리발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/{sendDt}/{dlvMthdCd}/{dlvEtprsCd}/{invcNo}/{dlvNo}/{dlvQty}/{ordNo}/{ordPrdSeq}/{invcAddData}` | critical | 6791 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 방문배송완료 처리 | POST | `https://api.11st.co.kr/rest/ordservices/visitdlvend/[dlvNo]/[ordNo]/[visitDlvCertCode]` | medium | 7052 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 상품미도착 처리 | PUT | `https://api.11st.co.kr/rest/nondeliverys/nondeliverystatus/[ordNo]/[ordPrdSeq]` | medium | 6734 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 입고완료 처리 | GET | `https://api.11st.co.kr/rest/ordservices/saleconfirm/[ordNo]/[ordPrdSeq]` | medium | 1773 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 판매불가처리 | GET | `https://api.11st.co.kr/rest/claimservice/reqrejectorder/[ordNo]/[ordPrdSeq]/[ordCnRsnCd]/[ordCnDtlsRsn]` | critical | 1638 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 취소승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqconf/[ordPrdCnSeq]/[ordNo]/[ordPrdSeq]` | critical | 1640 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 취소거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqreject/[ordNo]/[ordPrdSeq]/[ordPrdCnSeq]/[dlvMthdCd]/[sendDt]/[dlvEtprsCd]/[invcNo]` | high | 1641 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 주문취소 거부처리(책임사유 오류) | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqrejectNEW/[ordNo]/[ordPrdSeq]/[ordPrdCnSeq]/[dlvMthdCd]/[sendDt]/[dlvEtprsCd]/[invcNo]/[ordCnRefsRsnCd]/[ordCnReqRsn]` | high | 1745 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 교환승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/exchangereqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]/[dlvEtprsCd]/[invcNo]` | critical | 1649 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 교환거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/exchangereqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | high | 1650 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 반품승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]` | critical | 1644 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 반품거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | high | 1645 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 반품신청 및 완료 | GET | `http://api.11st.co.kr/rest/claimservice/sellerclaimfix/[ordNo]/[ordPrdSeq]/[clmReqRsn]/[claimProcess]/[dlvEtprsCd]/[invcNo]/[dlvMthdCd]/[clmReqCont]/[clmDlvCstMthd]` | high | 1653 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 반품보류 처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnclaimdefer/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[deferRefsRsnCd]/[deferRefsRsn]` | high | 1654 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 반품완료보류 처리 | GET | `http://api.11st.co.kr/rest/claimservice/returncompletedefer/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[deferRefsRsnCd]/[deferRefsRsn]` | high | 1655 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 반품송장입력 | GET | `https://api.11st.co.kr/rest/claimservice/claimservice/returninvc/[sendDt]/[dlvNo]/[dlvEtprsCd]/[invcNo]/[dlvMthdCd]/[clmReqSeq]` | high | 6747 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 셀러기획전등록 | POST | `http://api.11st.co.kr/rest/exhibitionservice/target` | medium | 1505 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 셀러기획전수정 | PUT | `http://api.11st.co.kr/rest/exhibitionservice/target/[기획전번호]` | medium | 1778 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 셀러기획전취소 | DELETE | `http://api.11st.co.kr/rest/exhibitionservice/target/[기획전번호]` | high | 1780 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 셀러기획전그룹등록 | POST | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]` | medium | 1782 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 셀러기획전그룹수정 | PUT | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]/[그룹번호]` | medium | 1783 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 셀러기획전그룹삭제 | DELETE | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]/[그룹번호]` | medium | 1784 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 긴급알리미확인답변처리_내용순번별 (Deprecated) | GET | `http://api.11st.co.kr/rest/alimi/alimianswer/[emerNtceSeq]/[confimYn]/[answerCtnt]` | medium | 1869 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 긴급알리미확인답변처리_PUT | PUT | `http://api.11st.co.kr/rest/alimi/alimianswer` | medium | 6982 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 상품재고무게변경처리_PUT방식 | PUT | `http://api.11st.co.kr/rest/prodservices/stockwght/[prdStckNo]` | high | 1718 | 상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인 |
| 해외배송상태처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqordstat/[ordNo]/[ordPrdSeq]/[dlvNo]/[abrdOrdPrdStat]` | medium | 1720 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 해외현지 內 발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqabrdIndelv/[dlvNo]/[ordNo]/[ordPrdSeq]/[abrdInCd]/[combineStckCd]/[dollarAmt]/[abrdShopId]` | critical | 1721 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 발주확인처리(글로벌셀러) | GET | `https://api.11st.co.kr/rest/ordservices/reqabrdpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | medium | 1722 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| 발송처리(KGL) | GET | `https://api.11st.co.kr/rest/ordservices/reqabrddelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | critical | 1723 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 반품승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]` | critical | 1644 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| 반품거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | high | 1645 | 클레임 목록/상태 조회로 처리 결과 재확인 |
| [전세계배송]30kg 초과 주문건 무게 업데이트 | GET | `https://api.11st.co.kr/rest/claimservice/gblstockwght/[ordNo]/[ordPrdSeq]/[totalOptWght]/[updateDt]` | high | 1736 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 전세계배송 해외배송상태 업데이트 | GET | `https://api.11st.co.kr/rest/ordservices/reqgblordstat/[ordNo]/[ordPrdSeq]/[abrdOrdPrdStat]` | medium | 1750 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 발주확인처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | medium | 1634 | 공식 조회 API 또는 API TEST로 변경 전후 상태 재확인 |
| [전세계배송]반품/교환업데이트 | GET | `https://api.11st.co.kr/rest/claimservice/returnexchangeupdate/[ordNo]/[ordPrdSeq]/[clmReqSeq][dlvMthdCd]/[dlvEtprsCd]/[invcNo]` | high | 1739 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| [전세계배송]30kg초과 주문건 처리 지시 | GET | `https://api.11st.co.kr/rest/claimservice/gblordstockwght/[ordNo]/[ordPrdSeq]/[prdNo]` | high | 1740 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| [전세계배송]국내 통관거부 | GET | `https://api.11st.co.kr/rest/claimservice/gbldenyclm/[ordNo]/[ordPrdSeq]/[gblRsnCd]/[updateDt]` | high | 1741 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| [전세계배송]반송주문 처리방법 전송 | GET | `https://api.11st.co.kr/rest/claimservice/gblretordermthd/[ordNo]/[ordPrdSeq]` | high | 1743 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 전세계배송 해외송장입력 | GET | `https://api.11st.co.kr/rest/ordservices/reqgbldlvinvc/[ordNo]/[etprsCd]/[invcNo]` | high | 1751 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| [전세계배송]해외배송상태 배송완료처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqgbldlvend/[ord_no]/[abrdOrdPrdStat]` | medium | 1831 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |
| 발송처리(배송중_처리) | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | critical | 1888 | 주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인 |

## 카테고리 조회 (`categoryNo=38`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 전체카테고리조회 | GET | `http://api.11st.co.kr/rest/cateservice/category` | N | low | active | 1001 |
| 하위카테고리조회 | GET | `http://api.11st.co.kr/rest/cateservice/category/[dispCtgrNo]` | N | low | active | 1617 |

## 상품조회 (`categoryNo=39`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 다중상품조회 | POST | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket` | N | low | active | 1007 |
| 신규상품조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/[prdNo]` | N | low | active | 1620 |
| 셀러상품조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/sellerprodcode/[sellerprdcd]` | N | low | active | 1621 |

## 재고처리 (`categoryNo=40`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 다중상품재고정보조회 | POST | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/stocks` | N | low | active | 1009 |
| 신규상품재고정보조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/stck/[prdNo]` | N | low | active | 1623 |
| 상품재고수량변경처리 | PUT | `http://api.11st.co.kr/rest/prodservices/stockqty/[prdStckNo]` | Y | high | active | 1625 |

## 상품Q&A (`categoryNo=41`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 상품QnA목록조회 | GET | `http://api.11st.co.kr/rest/prodqnaservices/prodqnalist/[startTime]/[endTime]/[answerStatus]` | N | low | active | 1626 |
| 상품QnA답변처리 | PUT | `http://api.11st.co.kr/rest/prodqnaservices/prodqnaanswer/[brdInfoNo]/[prdNo]` | Y | medium | active | 1885 |

## 판매중지 (`categoryNo=42`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 판매중지처리 | PUT | `http://api.11st.co.kr/rest/prodstatservice/stat/stopdisplay/[prdNo]` | Y | critical | active | 1631 |
| 판매중지해제처리 | PUT | `http://api.11st.co.kr/rest/prodstatservice/stat/restartdisplay/[prdNo]` | Y | critical | active | 1632 |

## 배송 (`categoryNo=43`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 출고지주소조회 | GET | `http://api.11st.co.kr/rest/areaservice/outboundarea` | N | medium | active | 1014 |
| 반품교환지주소조회 | GET | `http://api.11st.co.kr/rest/areaservice/inboundarea` | N | medium | active | 1015 |
| 출고지조건부배송비 입력/수정 | POST | `http://api.11st.co.kr/rest/areaservice/addOutAddrBasiDlvCst` | Y | medium | active | 1078 |
| 출고지조회 | POST | `http://api.11st.co.kr/rest/areaservice/getOutAddressInfo/[addrSeq]` | N | low | active | 1691 |
| 반품/교환지조회 | GET | `http://api.11st.co.kr/rest/areaservice/getRtnAddressInfo/[addrSeq]` | N | low | active | 1692 |
| 출고지조건부배송비정책조회. | GET | `http://api.11st.co.kr/rest/areaservice/getOutAddrBasiDlvCst/[addrSeq]/[mbAddrLocation]` | N | medium | active | 1694 |
| 출고지 등록(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/registerOutAddress` | Y | medium | active | 6701 |
| 반품/교환지 등록(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/registerRtnAddress` | Y | high | active | 6702 |
| 출고지 수정(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/updateOutAddress` | Y | medium | active | 6703 |
| 반품/교환지 수정(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/updateRtnAddress` | Y | high | active | 6704 |
| 발송마감 템플릿 조회 | GET | `http://api.11st.co.kr/rest/prodservices/sendCloseList` | N | low | active | 6735 |
| 발송마감 템플릿 등록 | POST | `http://api.11st.co.kr/rest/prodservices/sendCloseTemplate` | Y | high | active | 6736 |
| 발송마감 템플릿 수정 | PUT | `http://api.11st.co.kr/rest/prodservices/sendCloseTemplate/344801` | Y | high | active | 6737 |
| 배송지연 공지 등록 | POST | `http://api.11st.co.kr/rest/prodservices/deliveryDelay` | Y | medium | active | 6757 |
| 배송지연 공지 해제 | POST | `http://api.11st.co.kr/rest/prodservices/deliveryDelay` | Y | medium | active | 6758 |
| 방문수령지조회 | GET | `http://api.11st.co.kr/rest/areaservice/visit/getVisitAddress/{addrSeq}` | N | low | active | 6759 |
| 방문수령지등록 | POST | `http://api.11st.co.kr/rest/areaservice/visit/registerVisitAddress` | Y | medium | active | 6760 |
| 방문수령지수정 | POST | `http://api.11st.co.kr/rest/areaservice/visit/updateVisitAddress` | Y | medium | active | 6761 |
| 해외출고지 조회 | GET | `http://api.11st.co.kr/rest/areaservice/global/getGlobalOutAddress/{addrSeq}` | N | low | active | 6792 |
| 해외출고지 등록 | POST | `http://api.11st.co.kr/rest/areaservice/global/registerGlobalOutAddress` | Y | medium | active | 6793 |
| 해외출고지 수정 | POST | `http://api.11st.co.kr/rest/areaservice/global/updateGlobalOutAddress` | Y | medium | active | 6794 |

## 우편번호 (`categoryNo=44`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 도로명주소 추천검색 | POST | `http://api.11st.co.kr/rest/commonservices/roadAddrSuggest` | N | medium | active | 1987 |
| 주소 검색(신규) | POST | `http://api.11st.co.kr/rest/commonservices/v2/searchAddr` | N | medium | active | 6700 |

## 취소처리 (`categoryNo=48`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 판매불가처리 | GET | `https://api.11st.co.kr/rest/claimservice/reqrejectorder/[ordNo]/[ordPrdSeq]/[ordCnRsnCd]/[ordCnDtlsRsn]` | Y | critical | active | 1638 |
| 취소신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/cancelorders/[startTime]/[endTime]` | N | low | active | 1639 |
| 취소승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqconf/[ordPrdCnSeq]/[ordNo]/[ordPrdSeq]` | Y | critical | active | 1640 |
| 취소거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqreject/[ordNo]/[ordPrdSeq]/[ordPrdCnSeq]/[dlvMthdCd]/[sendDt]/[dlvEtprsCd]/[invcNo]` | Y | high | active | 1641 |
| 취소완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/canceledorders/[startTime]/[endTime]` | N | low | active | 1642 |
| 취소철회완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/withdrawcanceledorders/[startTime]/[endTime]` | N | low | active | 1724 |
| 구매확정후직권취소목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/officecancellist/[startTime]/[endTime]` | N | low | active | 1726 |
| 주문취소 거부처리(책임사유 오류) | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqrejectNEW/[ordNo]/[ordPrdSeq]/[ordPrdCnSeq]/[dlvMthdCd]/[sendDt]/[dlvEtprsCd]/[invcNo]/[ordCnRefsRsnCd]/[ordCnReqRsn]` | Y | high | active | 1745 |

## 교환처리 (`categoryNo=49`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 교환신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/exchangeorders/[startTime]/[endTime]` | N | low | active | 1648 |
| 교환승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/exchangereqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]/[dlvEtprsCd]/[invcNo]` | Y | critical | active | 1649 |
| 교환거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/exchangereqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | Y | high | active | 1650 |
| 교환완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/exchangedorders/[startTime]/[endTime]` | N | low | active | 1651 |
| 교환철회목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/retractexcorders/[startTime]/[endTime]` | N | low | active | 1652 |

## 반품처리 (`categoryNo=50`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 반품신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnorders/[startTime]/[endTime]` | N | low | active | 1643 |
| 반품승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]` | Y | critical | active | 1644 |
| 반품거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | Y | high | active | 1645 |
| 반품완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnedorders/[startTime]/[endTime]` | N | low | active | 1646 |
| 반품철회목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/retractretorders/[startTime]/[endTime]` | N | low | active | 1647 |
| 반품신청 및 완료 | GET | `http://api.11st.co.kr/rest/claimservice/sellerclaimfix/[ordNo]/[ordPrdSeq]/[clmReqRsn]/[claimProcess]/[dlvEtprsCd]/[invcNo]/[dlvMthdCd]/[clmReqCont]/[clmDlvCstMthd]` | Y | high | active | 1653 |
| 반품보류 처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnclaimdefer/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[deferRefsRsnCd]/[deferRefsRsn]` | Y | high | active | 1654 |
| 반품완료보류 처리 | GET | `http://api.11st.co.kr/rest/claimservice/returncompletedefer/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[deferRefsRsnCd]/[deferRefsRsn]` | Y | high | active | 1655 |
| 반품송장입력 | GET | `https://api.11st.co.kr/rest/claimservice/claimservice/returninvc/[sendDt]/[dlvNo]/[dlvEtprsCd]/[invcNo]/[dlvMthdCd]/[clmReqSeq]` | Y | high | active | 6747 |

## 기획전조회관리 (`categoryNo=54`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 셀러기획전목록조회 | POST | `http://api.11st.co.kr/rest/exhibitionservice/exhibition` | N | low | active | 1504 |
| 셀러기획전등록 | POST | `http://api.11st.co.kr/rest/exhibitionservice/target` | Y | medium | active | 1505 |
| 셀러기획전수정 | PUT | `http://api.11st.co.kr/rest/exhibitionservice/target/[기획전번호]` | Y | medium | active | 1778 |
| 셀러기획전취소 | DELETE | `http://api.11st.co.kr/rest/exhibitionservice/target/[기획전번호]` | Y | high | active | 1780 |
| 셀러기획전그룹조회 | GET | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]` | N | low | active | 1781 |
| 셀러기획전그룹등록 | POST | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]` | Y | medium | active | 1782 |
| 셀러기획전그룹수정 | PUT | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]/[그룹번호]` | Y | medium | active | 1783 |
| 셀러기획전그룹삭제 | DELETE | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]/[그룹번호]` | Y | medium | active | 1784 |

## 알림조회관리 (`categoryNo=58`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 긴급알리미조회_기간별 | GET | `https://api.11st.co.kr/rest/alimi/getalimilist/[startTime]/[endTime]/[emerNtceCrntCd]/[orderNo]` | N | low | active | 1796 |
| 긴급알리미확인답변처리_내용순번별 (Deprecated) | GET | `http://api.11st.co.kr/rest/alimi/alimianswer/[emerNtceSeq]/[confimYn]/[answerCtnt]` | Y | medium | active | 1869 |
| 긴급알리미조회_구분코드별 | GET | `https://api.11st.co.kr/rest/alimi/getalimilist/[startTime]/[endTime]/[emerNtceCrntCd]/[orderNo]` | N | low | active | 1870 |
| 긴급알리미조회_구분코드_주문번호별 | GET | `https://api.11st.co.kr/rest/alimi/getalimilist/[startTime]/[endTime]/[emerNtceCrntCd]/[orderNo]` | N | medium | active | 1871 |
| 긴급알리미 게시물분류코드목록 조회 | GET | `https://api.11st.co.kr/rest/alimi/getalimiclflist` | N | low | active | 6738 |
| 긴급알리미확인답변처리_PUT | PUT | `http://api.11st.co.kr/rest/alimi/alimianswer` | Y | medium | active | 6982 |

## 상품 (`categoryNo=63`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 무게 포함 신규상품조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/wght/[prdNo]` | N | low | active | 1717 |
| 상품재고무게변경처리_PUT방식 | PUT | `http://api.11st.co.kr/rest/prodservices/stockwght/[prdStckNo]` | Y | high | active | 1718 |

## 발주발송 (`categoryNo=64`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 해외배송상태처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqordstat/[ordNo]/[ordPrdSeq]/[dlvNo]/[abrdOrdPrdStat]` | Y | medium | active | 1720 |
| 해외현지 內 발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqabrdIndelv/[dlvNo]/[ordNo]/[ordPrdSeq]/[abrdInCd]/[combineStckCd]/[dollarAmt]/[abrdShopId]` | Y | critical | active | 1721 |
| 발주확인처리(글로벌셀러) | GET | `https://api.11st.co.kr/rest/ordservices/reqabrdpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | Y | medium | active | 1722 |
| 발송처리(KGL) | GET | `https://api.11st.co.kr/rest/ordservices/reqabrddelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | Y | critical | active | 1723 |
| 상품준비중_목록_요청(해외쇼핑API) | GET | `https://api.11st.co.kr/rest/ordservices/packaging/[startTime]/[endTime]/[abrdDlvYn]` | N | low | active | 1889 |

## 취소교환반품 (`categoryNo=65`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 취소신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/cancelorders/[startTime]/[endTime]` | N | low | active | 1639 |
| 취소완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/canceledorders/[startTime]/[endTime]` | N | low | active | 1642 |
| 반품신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnorders/[startTime]/[endTime]` | N | low | active | 1643 |
| 반품승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]` | Y | critical | active | 1644 |
| 반품거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | Y | high | active | 1645 |
| 반품완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnedorders/[startTime]/[endTime]` | N | low | active | 1646 |

## 조회 (`categoryNo=67`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 전세계배송 주문리스트 | GET | `(공식 문서 URL 없음)` | N | low | official_no_content | 1316 |
| 전세계배송 발송처리리스트 | GET | `(공식 문서 URL 없음)` | N | low | official_no_content | 1318 |
| 전세계배송 수취인주소조회 | GET | `(공식 문서 URL 없음)` | N | low | official_no_content | 1319 |
| [전세계배송]현재상태값요청 | GET | `https://api.11st.co.kr/rest/claimservice/ordclmstat/[ordNo]/[ordPrdSeq]` | N | medium | active | 1732 |
| [전세계배송]현재상태값요청-리스트형 | GET | `https://api.11st.co.kr/rest/claimservice/ordclmstatlist/[ordNoArr]` | N | medium | active | 1733 |
| [전세계배송]invoice증빙 조회 | GET | `https://api.11st.co.kr/rest/claimservice/invoicepubl/[ordNo]` | N | medium | active | 1734 |
| [전세계배송]반출시 판매자 정보 | GET | `https://api.11st.co.kr/rest/claimservice/returnsellerinfo/[ordNo]/[ordPrdSeq]` | N | medium | active | 1735 |
| 전세계배송 주문리스트 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvlist/[startTime]/[endTime]` | N | medium | active | 1746 |
| 전세계배송 주문확인 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvorder/[ordNo]/[ordPrdSeq]` | N | medium | active | 1747 |
| 전세계배송 발송처리리스트 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvsndlist/[startTime]/[endTime]` | N | medium | active | 1748 |
| 전세계배송 수취인주소조회 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvaddress/[ordNo]` | N | medium | active | 1749 |
| [전세계배송]현재상태값요청-기간의리스트형 | GET | `https://api.11st.co.kr/rest/claimservice/ordclmstatlist/[startTime]/[endTime]` | N | medium | active | 1925 |
| SF주문조회 | GET | `(공식 문서 URL 없음)` | N | low | official_no_content | 6705 |
| SF주문조회 | GET | `(공식 문서 URL 없음)` | N | low | official_no_content | 6706 |

## 상태처리 (`categoryNo=68`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| [전세계배송]30kg 초과 주문건 무게 업데이트 | GET | `https://api.11st.co.kr/rest/claimservice/gblstockwght/[ordNo]/[ordPrdSeq]/[totalOptWght]/[updateDt]` | Y | high | active | 1736 |
| [전세계배송]통합ID 주문번호별 무게 | GET | `https://api.11st.co.kr/rest/claimservice/gblitgstockwght/[ordNo]/[totalOptWght]/[updateDt]` | N | medium | active | 1737 |
| 전세계배송 해외배송상태 업데이트 | GET | `https://api.11st.co.kr/rest/ordservices/reqgblordstat/[ordNo]/[ordPrdSeq]/[abrdOrdPrdStat]` | Y | medium | active | 1750 |

## 배송 (`categoryNo=69`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 발주확인처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | Y | medium | active | 1634 |
| [전세계배송]입고시 오프라인 보류처리 내역 | GET | `https://api.11st.co.kr/rest/claimservice/gblofflinehold/[ordNo]/[ordPrdSeq]/[holdRsnNm]` | N | medium | active | 1738 |
| [전세계배송]반품/교환업데이트 | GET | `https://api.11st.co.kr/rest/claimservice/returnexchangeupdate/[ordNo]/[ordPrdSeq]/[clmReqSeq][dlvMthdCd]/[dlvEtprsCd]/[invcNo]` | Y | high | active | 1739 |
| [전세계배송]30kg초과 주문건 처리 지시 | GET | `https://api.11st.co.kr/rest/claimservice/gblordstockwght/[ordNo]/[ordPrdSeq]/[prdNo]` | Y | high | active | 1740 |
| [전세계배송]국내 통관거부 | GET | `https://api.11st.co.kr/rest/claimservice/gbldenyclm/[ordNo]/[ordPrdSeq]/[gblRsnCd]/[updateDt]` | Y | high | active | 1741 |
| [전세계배송]반송주문내역 전송 | GET | `https://api.11st.co.kr/rest/claimservice/gblretorder/[ordNo]/[ordPrdSeq]/[gblRsnCd]/[gblRetCst]/[gblRetDt]` | N | medium | active | 1742 |
| [전세계배송]반송주문 처리방법 전송 | GET | `https://api.11st.co.kr/rest/claimservice/gblretordermthd/[ordNo]/[ordPrdSeq]` | Y | high | active | 1743 |
| [전세계배송]크레임 사유코드 전송 | GET | `https://api.11st.co.kr/rest/claimservice/gblcode/[grpCd]/[DtlsCd]/[DtlsComNm]` | N | medium | active | 1744 |
| 전세계배송 해외송장입력 | GET | `https://api.11st.co.kr/rest/ordservices/reqgbldlvinvc/[ordNo]/[etprsCd]/[invcNo]` | Y | high | active | 1751 |
| [전세계배송]해외배송상태 배송완료처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqgbldlvend/[ord_no]/[abrdOrdPrdStat]` | Y | medium | active | 1831 |
| 발송처리(배송중_처리) | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | Y | critical | active | 1888 |

## 상품관리 (`categoryNo=81`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 상품등록/신규상품등록 | POST | `http://api.11st.co.kr/rest/prodservices/product` | Y | medium | active | 1003 |
| 상품수정/신규상품수정 | PUT | `http://api.11st.co.kr/rest/prodservices/product/[prdNo]` | Y | medium | active | 1619 |
| 상품가격수정 | GET | `http://api.11st.co.kr/rest/prodservices/product/price/[prdNo]/[selPrc]` | Y | critical | active | 1752 |
| 상품 추가 구성상품 조회 | GET | `http://api.11st.co.kr/rest/prodservices/getProductComponent/[prdNo]` | N | low | active | 1845 |
| 상품상세설명 조회 | GET | `http://api.11st.co.kr/rest/prodservices/getProductDetailCont/[prdNo]` | N | low | active | 1846 |
| 상품 판매기간 조회. | POST | `http://api.11st.co.kr/rest/prodservices/sellterm/` | N | low | active | 1848 |
| 상품 추가구성상품  수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductComponent/[prdNo]` | Y | medium | active | 1849 |
| 상품상세설명 수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductDetailCont/[prdNo]` | Y | medium | active | 1850 |
| 상품 옵션 수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductOption/[prdNo]` | Y | medium | active | 1851 |
| 상품가격/즉시할인 수정 | POST | `http://api.11st.co.kr/rest/prodservices/product/priceCoupon/[prdNo]` | Y | critical | active | 1855 |
| 상품 판매기간 연장 | PUT | `http://api.11st.co.kr/rest/prodservices/sellterm/[prdNo]/[selPrdClfCd]` | Y | medium | active | 1856 |
| 실재고체크를 통한 옵션품절 리스트 조회 | GET | `https://api.11st.co.kr/rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt}` | N | low | active | 6732 |

## 결제완료 (`categoryNo=110`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 발주확인할내역(주문번호별 결제완료_목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/complete/[ordNo]` | N | medium | active | 1633 |
| 결제대기 내역 | GET | `https://api.11st.co.kr/rest/ordservices/standby/[startTime]/[endTime]` | N | low | active | 1728 |
| 배송지 입력대기 목록 요청 | GET | `https://api.11st.co.kr/rest/ordservices/delvplacestandby/[startTime]/[endTime]` | N | medium | active | 1800 |
| 발주확인할내역(기간별 결제완료_목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/complete/[startTime]/[endTime]` | N | low | active | 1876 |
| 오늘발송 요청내역 (결제완료 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/todaydelivery/completes` | N | low | active | 6741 |
| 발송기한경과 요청내역 (결제완료 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/delaydelivery/completes` | N | low | active | 6743 |

## 발주처리 (`categoryNo=111`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 발주확인처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | Y | medium | active | 1634 |
| 발송처리할_내역(배송준비중_목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/packaging/[startTime]/[endTime]` | N | medium | active | 1635 |
| 발송지연안내 처리 | POST | `https://api.11st.co.kr/rest/ordservices/deliveryDelayGuide` | Y | high | active | 6728 |
| 오늘발송 요청내역 (배송준비중 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/todaydelivery/packagings` | N | medium | active | 6742 |
| 발송기한경과 요청내역 (배송준비중 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/delaydelivery/packagings` | N | medium | active | 6744 |

## 발송처리 (`categoryNo=112`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 부분발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]/[partDlvYn]/[ordNo]/[ordPrdSeq]` | Y | critical | active | 1636 |
| 판매불가처리 | GET | `https://api.11st.co.kr/rest/claimservice/reqrejectorder/[ordNo]/[ordPrdSeq]/[ordCnRsnCd]/[ordCnDtlsRsn]` | Y | critical | active | 1638 |
| 발송처리(배송중_처리) | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | Y | critical | active | 1888 |
| 수량 분리발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/{sendDt}/{dlvMthdCd}/{dlvEtprsCd}/{invcNo}/{dlvNo}/{dlvQty}/{ordNo}/{ordPrdSeq}/{invcAddData}` | Y | critical | active | 6791 |
| 방문배송완료 처리 | POST | `https://api.11st.co.kr/rest/ordservices/visitdlvend/[dlvNo]/[ordNo]/[visitDlvCertCode]` | Y | medium | active | 7052 |

## 완료조회 (`categoryNo=113`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 판매완료내역 | GET | `https://api.11st.co.kr/rest/ordservices/completed/[startTime]/[endTime]` | N | low | active | 1637 |
| 배송완료내역 | GET | `https://api.11st.co.kr/rest/ordservices/dlvcompleted/[startTime]/[endTime]` | N | medium | active | 1727 |
| 상품미도착 조회 | GET | `https://api.11st.co.kr/rest/nondeliverys/nondeliverylist/[shDateType]/[shDateFrom]/[shDateTo]` | N | low | active | 6733 |
| 상품미도착 처리 | PUT | `https://api.11st.co.kr/rest/nondeliverys/nondeliverystatus/[ordNo]/[ordPrdSeq]` | Y | medium | active | 6734 |
| 배송중내역 | GET | `https://api.11st.co.kr/rest/ordservices/shipping/{startTime}/{endTime}` | N | medium | active | 6897 |

## 예약판매 (`categoryNo=114`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 예약판매목록조회 | GET | `https://api.11st.co.kr/rest/ordservices/reservatecomplete/[startTime]/[endTime]` | N | low | active | 1772 |
| 입고완료 처리 | GET | `https://api.11st.co.kr/rest/ordservices/saleconfirm/[ordNo]/[ordPrdSeq]` | Y | medium | active | 1773 |

## 조회 (`categoryNo=115`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 주문별 상태조회 | GET | `https://api.11st.co.kr/rest/claimservice/orderlistalladdr/[ordNo]` | N | medium | active | 1725 |
| 주문번호별 배송정보 조회 | GET | `http://api.11st.co.kr/rest/claimservice/orderlistall/[ordNo]` | N | medium | active | 1774 |

## 정산조회 (`categoryNo=151`)

| API | Method | URL | Write | Risk | Availability | apiSeq |
|---|---:|---|---:|---:|---:|---:|
| 정산내역조회 | GET | `https://api.11st.co.kr/rest/settlement/settlementList/[startTime]/[endTime]` | N | medium | active | 1281 |
