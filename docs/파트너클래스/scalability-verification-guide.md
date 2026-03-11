# S3-4 서버 확장성 검증 가이드

작성일: 2026-03-11

## 목적

Oracle Cloud Free Tier 기준 현재 파트너클래스 읽기 트래픽이 어디까지 버티는지 확인하고, 파트너 300명+ 운영을 가정했을 때 먼저 손봐야 할 병목을 문서화한다.

## 검증 범위

- live 서버 스냅샷 수집
- live NocoDB 주요 테이블 row 수 확인
- live `class-api` 읽기 부하 테스트
- 같은 서버에서 synthetic SQLite 10만 row benchmark 실행

검증 스크립트:

- `scripts/partnerclass-s3-4-scalability-runner.js`

산출물:

- `output/playwright/s3-4-scalability/scalability-results.json`

## 측정 환경

- 서버: Oracle Cloud Free Tier
- 스펙: 2 OCPU / 12GB RAM
- n8n: `https://n8n.pressco21.com/webhook/class-api`
- NocoDB: live 운영 DB
- 측정 시각: 2026-03-11

## 시작 시점 서버 상태

- 메모리: 총 11GiB 중 사용 1.4GiB, 사용 가능 9.9GiB
- 디스크: `/` 45G 중 24G 사용
- docker memory
  - `n8n`: 384.9MiB
  - `nocodb`: 239.2MiB
  - `n8n-postgres`: 180.6MiB

해석:

- idle 상태 기준 RAM 부족 징후는 없다.
- 병목은 메모리 부족보다 request 처리 레이어에서 먼저 발생할 가능성이 높다.

## live 데이터 규모

| 테이블 | row 수 |
|------|------:|
| `tbl_Partners` | 11 |
| `tbl_Classes` | 26 |
| `tbl_Schedules` | 36 |
| `tbl_Settlements` | 114 |
| `tbl_Reviews` | 32 |
| `tbl_Subscriptions` | 0 |

해석:

- 현재 운영 row 수는 아직 작다.
- 지금 보이는 성능 한계는 대용량 DB보다 `n8n webhook + NocoDB 조회 조합` 구조의 한계에 가깝다.

## 부하 테스트 시나리오

모든 시나리오는 live `class-api` 읽기 웹훅을 직접 호출했다.

| 시나리오 | 동시성 | 시간 | 성공률 | avg | p95 | rps |
|------|------:|------:|------:|------:|------:|------:|
| `catalog_read_10c_5s` | 10 | 5s | 100% | 1733.03ms | 2283ms | 6.4 |
| `catalog_read_50c_5s` | 50 | 5s | 100% | 6845.9ms | 7287ms | 10.0 |
| `catalog_read_100c_10s` | 100 | 10s | 1.00% | 12007.7ms | 12014ms | 10.0 |
| `detail_read_100c_10s` | 100 | 10s | 0.00% | 12010.66ms | 12024ms | 10.0 |
| `mixed_read_100c_10s` | 100 | 10s | 0.00% | 12011.52ms | 12016ms | 10.0 |

실패 유형:

- 대부분 `This operation was aborted`
- 로컬 abort timeout 12초 근처에서 집중 발생

해석:

- 10 동시 접속은 통과하지만 응답이 이미 1.7초대다.
- 50 동시 접속도 성공률은 유지되지만 평균 6초 후반대로 올라간다.
- 100 동시 접속에서는 사실상 대부분 요청이 timeout에 걸린다.
- 병목은 여전히 메모리보다 `public read queue + upstream query chain` 이 먼저 드러난다.

## 부하 후 서버 상태

- load average: `0.03 -> 2.35`
- `n8n` 메모리: `320.7MiB -> 717.1MiB`
- `nocodb` 메모리: `247.3MiB -> 340.2MiB`

추가 관찰:

- 재측정 post-load 시 `docker stats` 기준 `n8n` CPU `83.31%`, `nocodb` CPU `89.29%`

해석:

- 메인 병목은 NocoDB보다 n8n 쪽 CPU/queue 레이어다.
- RAM이 아직 남아 있어도 public read burst 는 안정적이지 않다.

## SQLite 10만 row synthetic benchmark

실제 서버 하드웨어에서 SQLite 단일 파일로 10만 row를 만들어 비교했다.

### insert

- 100,000 row insert: `402.69ms`

### index 전

| 쿼리 | avg |
|------|------:|
| catalog query | 15.88ms |
| detail query | 7.79ms |
| partner query | 9.3ms |

### index 후

| 쿼리 | avg |
|------|------:|
| catalog query | 0.04ms |
| detail query | 0.03ms |
| partner query | 0.03ms |

해석:

- 같은 하드웨어에서 indexed query 자체는 충분히 빠르다.
- 따라서 10만 row 자체가 바로 문제라기보다, 현재 public read path 가 `webhook orchestration + multiple HTTP nodes` 에 과하게 묶여 있는 것이 더 큰 문제다.

## 결론

현재 구조는 다음 수준으로 판단한다.

1. 현재 운영 규모와 소규모 마케팅 유입은 버틸 수 있다.
2. 50 동시 읽기까지는 서비스는 유지되지만 응답이 느리다.
3. 100 동시 burst 를 엔터프라이즈급 기준으로 안정 운영한다고 보기는 어렵다.
4. Oracle Free Tier 자체가 즉시 한계인 것은 아니다.
5. 먼저 고쳐야 할 것은 인프라 이전보다 read path 구조와 캐시/인덱스 전략이다.

## 우선순위별 대응안

### P1. 지금 바로 필요한 것

- `WF-01` public read path 에서 hot action 을 더 aggressively cache 한다.
- `getClasses / getClassDetail / getContentHub` 용 precomputed payload 또는 read-optimized path 를 만든다.
- NocoDB hot query 필드에 맞는 index/view 전략을 점검한다.
- 100 동시성 가정을 그대로 n8n 단일 webhook 에 태우지 않는다.

### P2. 파트너 30~100명 구간에서 필요한 것

- public read 전용 n8n instance 또는 read worker 분리를 검토한다.
- 무거운 집계 응답은 request-time 계산 대신 배치/캐시 갱신형으로 바꾼다.
- CDN은 이미지/정적 자산에만 쓰고 API 병목 해결 수단으로 과신하지 않는다.

### P3. 파트너 300명+ 전 준비

- Oracle 상위 스펙 업그레이드 또는 read/write 분리 구조를 준비한다.
- NocoDB 직접 조회 대신 read DB 또는 materialized payload 전략을 검토한다.
- burst traffic 허용 기준을 `100 concurrent read stable` 로 다시 측정한다.

## 운영 판단

- 현재 단계에서 바로 인프라를 갈아엎을 필요는 없다.
- 다만 `엔터프라이즈급` 이라는 표현을 쓰려면 public read layer 분리 전에는 과장이다.
- 다음 확장 전제는 `캐시 강화 -> read path 분리 -> CPU 여유 확보` 순서가 맞다.

## 재실행 방법

```bash
node scripts/partnerclass-s3-4-scalability-runner.js
```

검증 완료 후 확인 파일:

```bash
cat output/playwright/s3-4-scalability/scalability-results.json
```
