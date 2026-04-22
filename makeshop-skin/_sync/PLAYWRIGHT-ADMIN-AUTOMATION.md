# Playwright 관리자 자동화 가이드 (MakeShop)

> 목적: 메이크샵 관리자 수정 작업을 `Playwright`로 안정적으로 수행하기 위한 **실전 기준**을 정리한다.
> 결론부터 말하면, **메이크샵 관리자 작업은 `전용 Playwright용 Chrome 창`을 먼저 띄우고 그 창에서 로그인한 뒤 같은 세션을 계속 붙는 방식이 가장 안정적이다.**

---

## 핵심 결론

### 1) 공개몰 검증
- **Playwright 우선**
- 이유: 빠르고, 반복 가능하고, 가격/중복/모바일 스크롤 검증에 가장 적합함

### 2) 관리자 수정/저장
- **Playwright 우선이 가장 효율적**
- 단, 성공 방식은 아무 Chrome 세션이 아니라 아래 방식이어야 함:
  - **Playwright가 관리하는 전용 Chrome 창을 먼저 띄움**
  - **그 창에서 직접 관리자 로그인**
  - 이후 **같은 세션에 Playwright가 계속 붙어서 탐색/수정**
- 이 전제가 깨지면 AGENT 세션 만료가 발생하고, 그 순간엔 **Computer Use가 fallback**임

---

## 이번 세션에서 실제로 테스트한 결과

### 테스트 A — Playwright 기본 격리 세션
- 방식: Playwright 기본 브라우저 컨텍스트로 관리자 페이지 접근
- 결과: **실패**
- 관찰:
  - `로그인 세션이 만료되었습니다. (AGENT)` 발생
  - 관리자 수정 불가

### 테스트 B — 쿠키 주입 / requests 접근
- 방식: Chrome 쿠키를 추출해 requests / Playwright 쪽에 주입
- 결과: **실패**
- 관찰:
  - 쿠키가 있어도 동일하게 `AGENT` 세션 만료 발생
  - 단순 쿠키 복사만으로는 관리자 세션을 재현하지 못함

### 테스트 C — Chrome 프로필 복제 + 실제 Chrome + CDP 연결
- 방식:
  1. 사용자 `Profile 2` 를 `/tmp/makeshop-playwright-profile` 로 복제
  2. 복제 프로필로 Chrome 을 `--remote-debugging-port=9222` 로 실행
  3. Playwright `connect_over_cdp()` 로 연결
- 결과: **실패**
- 관찰:
  - 관리자 URL 요청 후 `https://www.makeshop.co.kr/` 로 밀려남
  - 다이얼로그:
    - `로그인 세션이 만료되었습니다. (AGENT)`
    - `로그아웃되었습니다.`
- 결론:
  - **복제 프로필만으로는 관리자 로그인 세션 재사용이 안 됨**

### 테스트 D — 사용자 로그인 상태 Chrome + Computer Use
- 방식: 사용자가 로그인해 둔 실제 Chrome 관리자 탭을 Computer Use 로 조작
- 결과: **성공**
- 관찰:
  - 실제 상품 수정/저장 완료
  - `수정되었습니다.` 확인 가능

### 테스트 E — 전용 게스트 Chrome 창 + 로그인 + Playwright 재접속
- 방식:
  1. 전용 Chrome 게스트 창을 띄운다
  2. 그 창을 메이크샵 관리자 URL로 연다
  3. 사용자가 그 **전용 창 안에서** 로그인한다
  4. Playwright가 같은 persistent context / CDP 세션으로 재접속한다
- 결과: **성공**
- 관찰:
  - 관리자 메인 프레임 텍스트 읽기 성공
    - 예: `프레스코21`, `번호 : 10244`, `쇼핑몰 운영 현황`
  - 관리자 내부 이동 성공
    - `product_search_keyword.html` 접근 후 `상품 키워드 검색`, `상품 수정` 등 메뉴 텍스트 읽기 성공
  - 실제 상품 수정 페이지 접근 성공
    - `neoproduct_registry.html?type=upd&prod_uid=337159&popup=YES`
    - 상품번호, 상품명, 가격설정 본문 텍스트 읽기 성공
- 결론:
  - **지금까지 테스트한 방식 중 Playwright 관리자 자동화의 실제 성공 경로는 이 방식 하나**

---

## 따라서 얻은 운영 원칙

### 원칙 1
**"관리자 페이지를 그냥 열어만 둔다" = Playwright가 그 세션을 쓰는 것**은 아니다.

즉,
- 사용자가 일반 Chrome 창에 관리자 페이지를 열어둔 것만으로는 부족할 수 있음
- Playwright는 자기 컨텍스트로 접근하면 여전히 `AGENT` 세션 만료가 날 수 있음

### 원칙 2
Playwright 관리자 자동화는 아래처럼 해야 성공 확률이 높다.

1. **Playwright가 붙을 전용 Chrome 창을 먼저 띄운다**
2. **그 창 안에서 직접 로그인한다**
3. **같은 세션으로 Playwright가 재접속한다**

이번 세션에서는 **복제 프로필 재사용은 실패**했고,  
**전용 게스트 창 로그인 후 재접속만 성공**했다.

---

## 권장 운영 방식

### 가장 현실적인 현재 전략
1. **전용 Playwright용 Chrome 창 실행**
2. **그 창에서 관리자 로그인**
3. **Playwright로 관리자 수정 진행**
4. **공개몰 검증도 Playwright로 이어서 수행**
5. **불가피하게 세션이 깨질 때만 Computer Use fallback**

---

## Playwright 관리자 작업 성공 조건

아래가 모두 맞아야 한다.

- [ ] Playwright가 붙는 브라우저가 **전용으로 띄운 관리자 로그인 세션**임
- [ ] 접근 즉시 `AGENT` 세션 만료가 뜨지 않음
- [ ] `상품 키워드 검색`, `상품 수정`, `쇼핑몰 운영 현황` 같은 관리자 텍스트가 실제 프레임 DOM 에 잡힘
- [ ] 저장 후 `수정되었습니다.` 까지 자동 확인 가능

이 중 하나라도 깨지면, 관리자 구간은 Computer Use fallback 이 더 빠르다.

---

## 재사용용 스모크 테스트 스크립트

파일:
- `makeshop-skin/_sync/makeshop_admin_cdp_smoke.py`

역할:
- Playwright가 현재 CDP 세션으로 메이크샵 관리자에 실제 접근 가능한지 빠르게 판정

예시:

```bash
python3 makeshop-skin/_sync/makeshop_admin_cdp_smoke.py \
  --cdp http://127.0.0.1:9222 \
  --url 'https://special397.makeshop.co.kr/makeshop/newmanager/product_search_keyword.html'
```

성공 기준:
- `success: true`
- `final_url` 이 `special397.makeshop.co.kr/makeshop/newmanager/` 아래에 남아 있음
- `frame_matches` 에 관리자 프레임 텍스트가 잡힘
- dialogs 에 `AGENT` 문구가 없음

실패 기준:
- `success: false`
- `AGENT` 다이얼로그 발생
- 메이크샵 메인/로그아웃 페이지로 이탈

---

## 이 세션에서 남긴 산출물

- `makeshop-skin/_sync/makeshop_admin_cdp_smoke.py`
- `output/playwright/makeshop_admin_cdp_smoke_result.json`
- `output/playwright/makeshop_admin_method_test.md`

---

## 최종 판단 문장

> **메이크샵 관리자 자동화는 Playwright가 가장 효율적이다.**  
> 단, 아무 Chrome 세션이 아니라 **전용 Playwright용 창을 띄우고 그 창에서 로그인한 같은 세션**이어야 한다.  
> 이 방식이 깨질 때만 Computer Use를 fallback 으로 쓴다.
