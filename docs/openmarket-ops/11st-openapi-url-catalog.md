# 11번가 Open API URL Catalog

> 공식 11번가 Open API 개발가이드를 로그인 브라우저 세션에서 크롤링해 생성한 카탈로그입니다.

- 생성일: 2026-04-28
- API 수: 150
- 원본 크롤링: `docs/openmarket-ops/11st-openapi-guide-crawl-2026-04-28.json`

## 사용 원칙

- `method`와 `payload_type`을 반드시 함께 확인합니다. 11번가는 같은 URL이라도 GET이 아닌 POST/XML인 경우가 많습니다.
- `mutation=true`인 API는 기본 dry-run 이후 execute로만 호출합니다.
- 상세 파라미터/오류/응답 표는 원본 크롤링 JSON의 `tables`를 기준으로 확인합니다.

## 카테고리 조회 (`categoryNo=38`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 전체카테고리조회 | GET | `http://api.11st.co.kr/rest/cateservice/category` | N | 1001 |
| 하위카테고리조회 | GET | `http://api.11st.co.kr/rest/cateservice/category/[dispCtgrNo]` | N | 1617 |

## 상품조회 (`categoryNo=39`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 다중상품조회 | POST | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket` | N | 1007 |
| 신규상품조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/[prdNo]` | N | 1620 |
| 셀러상품조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/sellerprodcode/[sellerprdcd]` | N | 1621 |

## 재고처리 (`categoryNo=40`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 다중상품재고정보조회 | POST | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/stocks` | N | 1009 |
| 신규상품재고정보조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/stck/[prdNo]` | N | 1623 |
| 상품재고수량변경처리 | PUT | `http://api.11st.co.kr/rest/prodservices/stockqty/[prdStckNo]` | Y | 1625 |

## 상품Q&A (`categoryNo=41`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 상품QnA목록조회 | GET | `http://api.11st.co.kr/rest/prodqnaservices/prodqnalist/[startTime]/[endTime]/[answerStatus]` | N | 1626 |
| 상품QnA답변처리 | PUT | `http://api.11st.co.kr/rest/prodqnaservices/prodqnaanswer/[brdInfoNo]/[prdNo]` | Y | 1885 |

## 판매중지 (`categoryNo=42`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 판매중지처리 | PUT | `http://api.11st.co.kr/rest/prodstatservice/stat/stopdisplay/[prdNo]` | Y | 1631 |
| 판매중지해제처리 | PUT | `http://api.11st.co.kr/rest/prodstatservice/stat/restartdisplay/[prdNo]` | Y | 1632 |

## 배송 (`categoryNo=43`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 출고지주소조회 | GET | `http://api.11st.co.kr/rest/areaservice/outboundarea` | N | 1014 |
| 반품교환지주소조회 | GET | `http://api.11st.co.kr/rest/areaservice/inboundarea` | N | 1015 |
| 출고지조건부배송비 입력/수정 | POST | `http://api.11st.co.kr/rest/areaservice/addOutAddrBasiDlvCst` | Y | 1078 |
| 출고지조회 | POST | `http://api.11st.co.kr/rest/areaservice/getOutAddressInfo/[addrSeq]` | N | 1691 |
| 반품/교환지조회 | GET | `http://api.11st.co.kr/rest/areaservice/getRtnAddressInfo/[addrSeq]` | N | 1692 |
| 출고지조건부배송비정책조회. | GET | `http://api.11st.co.kr/rest/areaservice/getOutAddrBasiDlvCst/[addrSeq]/[mbAddrLocation]` | N | 1694 |
| 출고지 등록(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/registerOutAddress` | Y | 6701 |
| 반품/교환지 등록(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/registerRtnAddress` | Y | 6702 |
| 출고지 수정(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/updateOutAddress` | Y | 6703 |
| 반품/교환지 수정(신규) | POST | `http://api.11st.co.kr/rest/areaservice/v2/updateRtnAddress` | Y | 6704 |
| 발송마감 템플릿 조회 | GET | `http://api.11st.co.kr/rest/prodservices/sendCloseList` | N | 6735 |
| 발송마감 템플릿 등록 | POST | `http://api.11st.co.kr/rest/prodservices/sendCloseTemplate` | Y | 6736 |
| 발송마감 템플릿 수정 | PUT | `http://api.11st.co.kr/rest/prodservices/sendCloseTemplate/344801` | Y | 6737 |
| 배송지연 공지 등록 | POST | `http://api.11st.co.kr/rest/prodservices/deliveryDelay` | Y | 6757 |
| 배송지연 공지 해제 | POST | `http://api.11st.co.kr/rest/prodservices/deliveryDelay` | N | 6758 |
| 방문수령지조회 | GET | `http://api.11st.co.kr/rest/areaservice/visit/getVisitAddress/{addrSeq}` | N | 6759 |
| 방문수령지등록 | POST | `http://api.11st.co.kr/rest/areaservice/visit/registerVisitAddress` | Y | 6760 |
| 방문수령지수정 | POST | `http://api.11st.co.kr/rest/areaservice/visit/updateVisitAddress` | Y | 6761 |
| 해외출고지 조회 | GET | `http://api.11st.co.kr/rest/areaservice/global/getGlobalOutAddress/{addrSeq}` | N | 6792 |
| 해외출고지 등록 | POST | `http://api.11st.co.kr/rest/areaservice/global/registerGlobalOutAddress` | Y | 6793 |
| 해외출고지 수정 | POST | `http://api.11st.co.kr/rest/areaservice/global/updateGlobalOutAddress` | Y | 6794 |

## 우편번호 (`categoryNo=44`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 도로명주소 추천검색 | POST | `http://api.11st.co.kr/rest/commonservices/roadAddrSuggest` | N | 1987 |
| 주소 검색(신규) | POST | `http://api.11st.co.kr/rest/commonservices/v2/searchAddr` | N | 6700 |

## 취소처리 (`categoryNo=48`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 판매불가처리 | GET | `https://api.11st.co.kr/rest/claimservice/reqrejectorder/[ordNo]/[ordPrdSeq]/[ordCnRsnCd]/[ordCnDtlsRsn]` | N | 1638 |
| 취소신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/cancelorders/[startTime]/[endTime]` | N | 1639 |
| 취소승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqconf/[ordPrdCnSeq]/[ordNo]/[ordPrdSeq]` | N | 1640 |
| 취소거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqreject/[ordNo]/[ordPrdSeq]/[ordPrdCnSeq]/[dlvMthdCd]/[sendDt]/[dlvEtprsCd]/[invcNo]` | N | 1641 |
| 취소완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/canceledorders/[startTime]/[endTime]` | N | 1642 |
| 취소철회완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/withdrawcanceledorders/[startTime]/[endTime]` | N | 1724 |
| 구매확정후직권취소목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/officecancellist/[startTime]/[endTime]` | N | 1726 |
| 주문취소 거부처리(책임사유 오류) | GET | `http://api.11st.co.kr/rest/claimservice/cancelreqrejectNEW/[ordNo]/[ordPrdSeq]/[ordPrdCnSeq]/[dlvMthdCd]/[sendDt]/[dlvEtprsCd]/[invcNo]/[ordCnRefsRsnCd]/[ordCnReqRsn]` | N | 1745 |

## 교환처리 (`categoryNo=49`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 교환신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/exchangeorders/[startTime]/[endTime]` | N | 1648 |
| 교환승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/exchangereqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]/[dlvEtprsCd]/[invcNo]` | N | 1649 |
| 교환거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/exchangereqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | N | 1650 |
| 교환완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/exchangedorders/[startTime]/[endTime]` | N | 1651 |
| 교환철회목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/retractexcorders/[startTime]/[endTime]` | N | 1652 |

## 반품처리 (`categoryNo=50`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 반품신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnorders/[startTime]/[endTime]` | N | 1643 |
| 반품승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]` | N | 1644 |
| 반품거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | N | 1645 |
| 반품완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnedorders/[startTime]/[endTime]` | N | 1646 |
| 반품철회목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/retractretorders/[startTime]/[endTime]` | N | 1647 |
| 반품신청 및 완료 | GET | `http://api.11st.co.kr/rest/claimservice/sellerclaimfix/[ordNo]/[ordPrdSeq]/[clmReqRsn]/[claimProcess]/[dlvEtprsCd]/[invcNo]/[dlvMthdCd]/[clmReqCont]/[clmDlvCstMthd]` | N | 1653 |
| 반품보류 처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnclaimdefer/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[deferRefsRsnCd]/[deferRefsRsn]` | N | 1654 |
| 반품완료보류 처리 | GET | `http://api.11st.co.kr/rest/claimservice/returncompletedefer/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[deferRefsRsnCd]/[deferRefsRsn]` | N | 1655 |
| 반품송장입력 | GET | `https://api.11st.co.kr/rest/claimservice/claimservice/returninvc/[sendDt]/[dlvNo]/[dlvEtprsCd]/[invcNo]/[dlvMthdCd]/[clmReqSeq]` | N | 6747 |

## 기획전조회관리 (`categoryNo=54`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 셀러기획전목록조회 | POST | `http://api.11st.co.kr/rest/exhibitionservice/exhibition` | N | 1504 |
| 셀러기획전등록 | POST | `http://api.11st.co.kr/rest/exhibitionservice/target` | Y | 1505 |
| 셀러기획전수정 | PUT | `http://api.11st.co.kr/rest/exhibitionservice/target/[기획전번호]` | Y | 1778 |
| 셀러기획전취소 | DELETE | `http://api.11st.co.kr/rest/exhibitionservice/target/[기획전번호]` | Y | 1780 |
| 셀러기획전그룹조회 | GET | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]` | N | 1781 |
| 셀러기획전그룹등록 | POST | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]` | Y | 1782 |
| 셀러기획전그룹수정 | PUT | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]/[그룹번호]` | Y | 1783 |
| 셀러기획전그룹삭제 | DELETE | `http://api.11st.co.kr/rest/exhibitionservice/group/[기획전번호]/[그룹번호]` | Y | 1784 |

## 알림조회관리 (`categoryNo=58`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 긴급알리미조회_기간별 | GET | `https://api.11st.co.kr/rest/alimi/getalimilist/[startTime]/[endTime]/[emerNtceCrntCd]/[orderNo]` | N | 1796 |
| 긴급알리미확인답변처리_내용순번별 (Deprecated) | GET | `http://api.11st.co.kr/rest/alimi/alimianswer/[emerNtceSeq]/[confimYn]/[answerCtnt]` | N | 1869 |
| 긴급알리미조회_구분코드별 | GET | `https://api.11st.co.kr/rest/alimi/getalimilist/[startTime]/[endTime]/[emerNtceCrntCd]/[orderNo]` | N | 1870 |
| 긴급알리미조회_구분코드_주문번호별 | GET | `https://api.11st.co.kr/rest/alimi/getalimilist/[startTime]/[endTime]/[emerNtceCrntCd]/[orderNo]` | N | 1871 |
| 긴급알리미 게시물분류코드목록 조회 | GET | `https://api.11st.co.kr/rest/alimi/getalimiclflist` | N | 6738 |
| 긴급알리미확인답변처리_PUT | PUT | `http://api.11st.co.kr/rest/alimi/alimianswer` | Y | 6982 |

## 상품 (`categoryNo=63`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 무게 포함 신규상품조회 | GET | `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/wght/[prdNo]` | N | 1717 |
| 상품재고무게변경처리_PUT방식 | PUT | `http://api.11st.co.kr/rest/prodservices/stockwght/[prdStckNo]` | Y | 1718 |

## 발주발송 (`categoryNo=64`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 해외배송상태처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqordstat/[ordNo]/[ordPrdSeq]/[dlvNo]/[abrdOrdPrdStat]` | N | 1720 |
| 해외현지 內 발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqabrdIndelv/[dlvNo]/[ordNo]/[ordPrdSeq]/[abrdInCd]/[combineStckCd]/[dollarAmt]/[abrdShopId]` | N | 1721 |
| 발주확인처리(글로벌셀러) | GET | `https://api.11st.co.kr/rest/ordservices/reqabrdpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | N | 1722 |
| 발송처리(KGL) | GET | `https://api.11st.co.kr/rest/ordservices/reqabrddelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | N | 1723 |
| 상품준비중_목록_요청(해외쇼핑API) | GET | `https://api.11st.co.kr/rest/ordservices/packaging/[startTime]/[endTime]/[abrdDlvYn]` | N | 1889 |

## 취소교환반품 (`categoryNo=65`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 취소신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/cancelorders/[startTime]/[endTime]` | N | 1639 |
| 취소완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/canceledorders/[startTime]/[endTime]` | N | 1642 |
| 반품신청목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnorders/[startTime]/[endTime]` | N | 1643 |
| 반품승인처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqconf/[clmReqSeq]/[ordNo]/[ordPrdSeq]` | N | 1644 |
| 반품거부처리 | GET | `http://api.11st.co.kr/rest/claimservice/returnreqreject/[ordNo]/[ordPrdSeq]/[clmReqSeq]/[refsRsnCd]/[refsRsn]` | N | 1645 |
| 반품완료목록조회 | GET | `http://api.11st.co.kr/rest/claimservice/returnedorders/[startTime]/[endTime]` | N | 1646 |

## 조회 (`categoryNo=67`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 전세계배송 주문리스트 | ? | `(문서 URL 미확인)` | N | 1316 |
| 전세계배송 발송처리리스트 | ? | `(문서 URL 미확인)` | N | 1318 |
| 전세계배송 수취인주소조회 | ? | `(문서 URL 미확인)` | N | 1319 |
| [전세계배송]현재상태값요청 | GET | `https://api.11st.co.kr/rest/claimservice/ordclmstat/[ordNo]/[ordPrdSeq]` | N | 1732 |
| [전세계배송]현재상태값요청-리스트형 | GET | `https://api.11st.co.kr/rest/claimservice/ordclmstatlist/[ordNoArr]` | N | 1733 |
| [전세계배송]invoice증빙 조회 | GET | `https://api.11st.co.kr/rest/claimservice/invoicepubl/[ordNo]` | N | 1734 |
| [전세계배송]반출시 판매자 정보 | GET | `https://api.11st.co.kr/rest/claimservice/returnsellerinfo/[ordNo]/[ordPrdSeq]` | N | 1735 |
| 전세계배송 주문리스트 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvlist/[startTime]/[endTime]` | N | 1746 |
| 전세계배송 주문확인 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvorder/[ordNo]/[ordPrdSeq]` | N | 1747 |
| 전세계배송 발송처리리스트 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvsndlist/[startTime]/[endTime]` | N | 1748 |
| 전세계배송 수취인주소조회 | GET | `https://api.11st.co.kr/rest/ordservices/gbldlvaddress/[ordNo]` | N | 1749 |
| [전세계배송]현재상태값요청-기간의리스트형 | GET | `https://api.11st.co.kr/rest/claimservice/ordclmstatlist/[startTime]/[endTime]` | N | 1925 |
| SF주문조회 | ? | `(문서 URL 미확인)` | N | 6705 |
| SF주문조회 | ? | `(문서 URL 미확인)` | N | 6706 |

## 상태처리 (`categoryNo=68`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| [전세계배송]30kg 초과 주문건 무게 업데이트 | GET | `https://api.11st.co.kr/rest/claimservice/gblstockwght/[ordNo]/[ordPrdSeq]/[totalOptWght]/[updateDt]` | N | 1736 |
| [전세계배송]통합ID 주문번호별 무게 | GET | `https://api.11st.co.kr/rest/claimservice/gblitgstockwght/[ordNo]/[totalOptWght]/[updateDt]` | N | 1737 |
| 전세계배송 해외배송상태 업데이트 | GET | `https://api.11st.co.kr/rest/ordservices/reqgblordstat/[ordNo]/[ordPrdSeq]/[abrdOrdPrdStat]` | N | 1750 |

## 배송 (`categoryNo=69`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 발주확인처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | N | 1634 |
| [전세계배송]입고시 오프라인 보류처리 내역 | GET | `https://api.11st.co.kr/rest/claimservice/gblofflinehold/[ordNo]/[ordPrdSeq]/[holdRsnNm]` | N | 1738 |
| [전세계배송]반품/교환업데이트 | GET | `https://api.11st.co.kr/rest/claimservice/returnexchangeupdate/[ordNo]/[ordPrdSeq]/[clmReqSeq][dlvMthdCd]/[dlvEtprsCd]/[invcNo]` | N | 1739 |
| [전세계배송]30kg초과 주문건 처리 지시 | GET | `https://api.11st.co.kr/rest/claimservice/gblordstockwght/[ordNo]/[ordPrdSeq]/[prdNo]` | N | 1740 |
| [전세계배송]국내 통관거부 | GET | `https://api.11st.co.kr/rest/claimservice/gbldenyclm/[ordNo]/[ordPrdSeq]/[gblRsnCd]/[updateDt]` | N | 1741 |
| [전세계배송]반송주문내역 전송 | GET | `https://api.11st.co.kr/rest/claimservice/gblretorder/[ordNo]/[ordPrdSeq]/[gblRsnCd]/[gblRetCst]/[gblRetDt]` | N | 1742 |
| [전세계배송]반송주문 처리방법 전송 | GET | `https://api.11st.co.kr/rest/claimservice/gblretordermthd/[ordNo]/[ordPrdSeq]` | N | 1743 |
| [전세계배송]크레임 사유코드 전송 | GET | `https://api.11st.co.kr/rest/claimservice/gblcode/[grpCd]/[DtlsCd]/[DtlsComNm]` | N | 1744 |
| 전세계배송 해외송장입력 | GET | `https://api.11st.co.kr/rest/ordservices/reqgbldlvinvc/[ordNo]/[etprsCd]/[invcNo]` | N | 1751 |
| [전세계배송]해외배송상태 배송완료처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqgbldlvend/[ord_no]/[abrdOrdPrdStat]` | N | 1831 |
| 발송처리(배송중_처리) | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | N | 1888 |

## 상품관리 (`categoryNo=81`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 상품등록/신규상품등록 | POST | `http://api.11st.co.kr/rest/prodservices/product` | Y | 1003 |
| 상품수정/신규상품수정 | PUT | `http://api.11st.co.kr/rest/prodservices/product/[prdNo]` | Y | 1619 |
| 상품가격수정 | GET | `http://api.11st.co.kr/rest/prodservices/product/price/[prdNo]/[selPrc]` | N | 1752 |
| 상품 추가 구성상품 조회 | GET | `http://api.11st.co.kr/rest/prodservices/getProductComponent/[prdNo]` | N | 1845 |
| 상품상세설명 조회 | GET | `http://api.11st.co.kr/rest/prodservices/getProductDetailCont/[prdNo]` | N | 1846 |
| 상품 판매기간 조회. | POST | `http://api.11st.co.kr/rest/prodservices/sellterm/` | N | 1848 |
| 상품 추가구성상품  수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductComponent/[prdNo]` | Y | 1849 |
| 상품상세설명 수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductDetailCont/[prdNo]` | Y | 1850 |
| 상품 옵션 수정 | POST | `http://api.11st.co.kr/rest/prodservices/updateProductOption/[prdNo]` | Y | 1851 |
| 상품가격/즉시할인 수정 | POST | `http://api.11st.co.kr/rest/prodservices/product/priceCoupon/[prdNo]` | Y | 1855 |
| 상품 판매기간 연장 | PUT | `http://api.11st.co.kr/rest/prodservices/sellterm/[prdNo]/[selPrdClfCd]` | Y | 1856 |
| 실재고체크를 통한 옵션품절 리스트 조회 | GET | `(문서 URL 미확인)` | N | 6732 |

## 결제완료 (`categoryNo=110`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 발주확인할내역(주문번호별 결제완료_목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/complete/[ordNo]` | N | 1633 |
| 결제대기 내역 | GET | `https://api.11st.co.kr/rest/ordservices/standby/[startTime]/[endTime]` | N | 1728 |
| 배송지 입력대기 목록 요청 | GET | `https://api.11st.co.kr/rest/ordservices/delvplacestandby/[startTime]/[endTime]` | N | 1800 |
| 발주확인할내역(기간별 결제완료_목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/complete/[startTime]/[endTime]` | N | 1876 |
| 오늘발송 요청내역 (결제완료 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/todaydelivery/completes` | N | 6741 |
| 발송기한경과 요청내역 (결제완료 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/delaydelivery/completes` | N | 6743 |

## 발주처리 (`categoryNo=111`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 발주확인처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqpackaging/[ordNo]/[ordPrdSeq]/[addPrdYn]/[addPrdNo]/[dlvNo]` | N | 1634 |
| 발송처리할_내역(배송준비중_목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/packaging/[startTime]/[endTime]` | N | 1635 |
| 발송지연안내 처리 | POST | `https://api.11st.co.kr/rest/ordservices/deliveryDelayGuide` | Y | 6728 |
| 오늘발송 요청내역 (배송준비중 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/todaydelivery/packagings` | N | 6742 |
| 발송기한경과 요청내역 (배송준비중 목록조회) | GET | `https://api.11st.co.kr/rest/ordservices/delaydelivery/packagings` | N | 6744 |

## 발송처리 (`categoryNo=112`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 부분발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]/[partDlvYn]/[ordNo]/[ordPrdSeq]` | N | 1636 |
| 판매불가처리 | GET | `https://api.11st.co.kr/rest/claimservice/reqrejectorder/[ordNo]/[ordPrdSeq]/[ordCnRsnCd]/[ordCnDtlsRsn]` | N | 1638 |
| 발송처리(배송중_처리) | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/[sendDt]/[dlvMthdCd]/[dlvEtprsCd]/[invcNo]/[dlvNo]` | N | 1888 |
| 수량 분리발송처리 | GET | `https://api.11st.co.kr/rest/ordservices/reqdelivery/{sendDt}/{dlvMthdCd}/{dlvEtprsCd}/{invcNo}/{dlvNo}/{dlvQty}/{ordNo}/{ordPrdSeq}/{invcAddData}` | N | 6791 |
| 방문배송완료 처리 | POST | `https://api.11st.co.kr/rest/ordservices/visitdlvend/[dlvNo]/[ordNo]/[visitDlvCertCode]` | Y | 7052 |

## 완료조회 (`categoryNo=113`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 판매완료내역 | GET | `https://api.11st.co.kr/rest/ordservices/completed/[startTime]/[endTime]` | N | 1637 |
| 배송완료내역 | GET | `https://api.11st.co.kr/rest/ordservices/dlvcompleted/[startTime]/[endTime]` | N | 1727 |
| 상품미도착 조회 | GET | `https://api.11st.co.kr/rest/nondeliverys/nondeliverylist/[shDateType]/[shDateFrom]/[shDateTo]` | N | 6733 |
| 상품미도착 처리 | PUT | `https://api.11st.co.kr/rest/nondeliverys/nondeliverystatus/[ordNo]/[ordPrdSeq]` | Y | 6734 |
| 배송중내역 | GET | `https://api.11st.co.kr/rest/ordservices/shipping/{startTime}/{endTime}` | N | 6897 |

## 예약판매 (`categoryNo=114`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 예약판매목록조회 | GET | `https://api.11st.co.kr/rest/ordservices/reservatecomplete/[startTime]/[endTime]` | N | 1772 |
| 입고완료 처리 | GET | `https://api.11st.co.kr/rest/ordservices/saleconfirm/[ordNo]/[ordPrdSeq]` | N | 1773 |

## 조회 (`categoryNo=115`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 주문별 상태조회 | GET | `https://api.11st.co.kr/rest/claimservice/orderlistalladdr/[ordNo]` | N | 1725 |
| 주문번호별 배송정보 조회 | GET | `http://api.11st.co.kr/rest/claimservice/orderlistall/[ordNo]` | N | 1774 |

## 정산조회 (`categoryNo=151`)

| API | Method | URL | Write | apiSeq |
|---|---:|---|---:|---:|
| 정산내역조회 | GET | `https://api.11st.co.kr/rest/settlement/settlementList/[startTime]/[endTime]` | N | 1281 |
