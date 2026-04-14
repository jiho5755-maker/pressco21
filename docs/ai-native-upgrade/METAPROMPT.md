<!-- ANU-META: v1.0 | 2026-04-13 | Claude Opus 4.6 (1M) | 대표 지시 -->
# 메타프롬프트 — PRESSCO21 AI Native Upgrade (ANU)

> **이 파일의 존재 이유**: 다음 세션의 Claude Code가 이 한 파일만 읽고도 프로젝트를 정확히 이어서 시작할 수 있는 자기완결형 지시서.
> **프로젝트 코드**: `anu`
> **상위 문서**: `docs/PRD-하네스-종합고도화-v2.md` (이 프로젝트는 PRD v2의 **Phase 2~3 사이를 채우는 실행 브랜치**)
> **작성일**: 2026-04-13
> **기간 목표**: 2026-04-13 ~ 2026-05-04 (3주, 라이브 무중단)
> **소유자**: Claude Code (실행) + 장지호 대표 (승인)
> **예산**: 0원 (Oracle Free 한도 내, 추가 유료 SaaS 금지)

---

## 0. TL;DR — 30초 요약

PRESSCO21은 8명 회사를 AI 에이전트 28명이 보조하는 **AI 네이티브 회사**로 전환 중이다. 기존 하네스 PRD v2의 Phase 0/1/1.5/2까지 완료되었으나, 실제 운영에서 다음 3가지 구조적 문제가 드러났다.

1. **텔레그램 봇 카오스** — 봇 3개 + 그룹 1개 + 텔레그램을 쓰는 n8n WF 수십 개가 역할 분리 없이 혼재
2. **서버·프로젝트 부풀림** — pressco21/ 하위 29개 폴더, n8n 활성 WF **129개**, 본진 `/home/ubuntu` 루트 잔재, 금고 4TB HDD 미마운트, SSOT 파편화 5곳
3. **하네스 v2와의 정합성 불안** — 위 정리 작업이 기존 PRD v2 로드맵(Phase 2.5 미니앱 → Phase 3 자율운영)과 충돌 없이 "보완"으로 흡수되어야 함

**이 프로젝트의 단일 목적**: 위 3가지를 **엔터프라이즈급**으로 정리해서 PRD v2의 Phase 3 (L5 자율운영) 진입 전에 하부 구조를 단단하게 만든다.

**다음 세션의 사용법**:
1. 이 파일 **전체**를 읽는다 (§13의 READ-FIRST 리스트를 먼저 소화한 뒤)
2. `§14 작업 시작 전 체크리스트`를 통과시킨다
3. Phase 순서(P0 → P1 → P2 → P3 → P4)대로 진행한다
4. 각 Phase의 **완료 기준**을 만족해야만 다음 Phase로 넘어간다
5. Phase 완료 시마다 `AI_SYNC.md`·`MEMORY.md`·텔레그램 보고 3종 세트 갱신

---

## 1. 프로젝트 정의

| 항목 | 값 |
|------|-----|
| 이름 | PRESSCO21 AI Native Upgrade |
| 약어 | ANU |
| 목적 | 텔레그램 봇·서버·프로젝트의 중복/오류/비효율 제거 + AI 네이티브 운영 리듬 정착 |
| 대상 시스템 | 본진(Oracle) · 플로라(Oracle) · 금고(미니PC) · 로컬 워크스페이스 · 텔레그램 봇 · n8n · 에이전트·훅·스킬 하네스 |
| 비대상 | 신규 서비스 개발, 신규 매출원, 디자인 리뉴얼, 파트너클래스 E3 이후 로직, 모바일 앱 기능 추가 |
| 기간 | 3주 (2026-04-13 ~ 2026-05-04) — 단 라이브 무중단일 때만 |
| 예산 | 0원 |
| 상위 PRD | `docs/PRD-하네스-종합고도화-v2.md` |
| 선행 메타프롬프트 | `docs/meta-prompt-infra-harness-audit.md` (2026-04-04, 일부 TODO 미완) |
| 이 문서 | `docs/ai-native-upgrade/METAPROMPT.md` (여기) |

---

## 2. 왜 지금 하는가

### 2.1 외부 동력
- PRD v2 Phase 2까지 완료 → Phase 2.5 미니앱 진행 중 → **Phase 3 자율운영(L5) 진입 직전**
- 한 번 자율 트리거가 켜지면 지저분한 상태를 고치기가 훨씬 어려워진다
- 지금이 "깊은 청소"를 할 수 있는 **마지막 여유 구간**

### 2.2 내부 동력
- 2026-04-13 인프라 실측 조사에서 드러난 것들:
  - 본진 n8n 활성 WF가 **129개** (공식 기록은 20여 개)
  - 본진 `/home/ubuntu` 루트에 `all-workflows-fresh.json` 1.6MB 등 **작업 잔재 11개 파일 + 4개 중복 폴더**
  - 금고 **4TB HDD(Seagate Backup Plus)가 연결만 되고 마운트 안 됨** — 백업 여력의 절반이 놀고 있음
  - SSOT가 `pressco21-infra.md` + `HARNESS.md` + `OPS_STATE.md` + `AI_SYNC.md` + `MEMORY.md` 5군데로 파편화되어 "현재 상태"를 한눈에 파악 불가
- 대표 피드백: "텔레그램 봇이 너무 많아져서 목표와 프로젝트별로 깔끔하게 안내·사용을 못하고 있다"

### 2.3 전략적 의미
이 정리를 마쳐야 PRD v2 §5 (자율운영 프로토콜)의 "CFO 마진 경보 → CSO 에스컬레이션", "CTO WF 실패 감지 → 자동 수정 제안" 같은 에이전트 간 자율 에스컬레이션이 **신뢰할 수 있는 데이터 위에서** 돌 수 있다. 지금 상태에서 자율 트리거를 켜면 129개 WF 중 어떤 것이 진짜 운영용인지 모르는 상태로 AI가 판단을 내리는 셈.

---

## 3. 현재 상태 스냅샷 (2026-04-13 실측)

> 이 섹션은 **실측 시점 고정값**이다. 새 세션에서 이 파일을 읽을 때 일부 값이 달라져 있을 수 있으니, Phase P0에서 반드시 재검증한다.

### 3.1 서버 3대 실측 스펙

| 항목 | 본진 (운영) | 플로라 (AI/테스트) | 금고 (백업/파일) |
|------|------------|-------------------|------------------|
| 호스트명 | `pressco21-automation` | `openclaw` | `pressco21-backup` |
| 플랫폼 | Oracle Cloud Free ARM | Oracle Cloud Free ARM | 자체 미니PC (Intel N100) |
| CPU | aarch64 Neoverse-N1 **2코어** | aarch64 Neoverse-N1 **2코어** | x86_64 **4코어** |
| RAM | 11.65 GiB (≈12GB) | 11.65 GiB (≈12GB) | 15.6 GiB (≈16GB) |
| 메인 디스크 | `/dev/sda` 200GB, 29GB 사용 (15%) | `/dev/sda` 200GB, 24GB 사용 (12%) | `/dev/nvme0n1` **512GB**, 20GB 사용 (5%) |
| 외장 1 | — | — | `/dev/sda` **2TB SSD** (ASMedia USB, exfat, LABEL=Pressco21, /mnt/pressco21-ssd, 394GB 사용 22%) |
| 외장 2 | — | — | `/dev/sdb` **4TB HDD** (Seagate Backup Plus, NTFS) **★ 미마운트 상태 ★** |
| SSH alias | `ssh oracle` | `ssh openclaw` | `ssh minipc` |
| Tailscale IP | `100.122.49.15` | `100.114.150.34` | `100.76.25.105` |
| 업타임 | 48일 (2026-02-23 부팅) | 14일 (2026-03-29 부팅) | 6일 (2026-04-06 부팅) |

### 3.2 실행 중인 컨테이너 (실측)

**본진 (4개, 전부 127.0.0.1 바인딩)**
- `n8n` (`n8nio/n8n:latest`) → `127.0.0.1:5678`, RAM 380 MiB, **활성 WF 129개**
- `n8n-postgres` (`postgres:15`) → 내부 5432, RAM 162 MiB
- `nocodb` (`nocodb/nocodb:latest`) → `127.0.0.1:8080`, RAM 379 MiB
- `minio` (`quay.io/minio/minio:latest`) → `127.0.0.1:9000-9001`, RAM 209 MiB

**플로라 (4개, 2개는 0.0.0.0)**
- `flora-todo-mvp` (로컬 빌드) → `0.0.0.0:3001`, RAM 106 MiB (Next.js 15)
- `flora-todo-mvp-postgres` (`postgres:16-alpine`) → `127.0.0.1:5433`, RAM 29 MiB
- `n8n-staging` (`n8nio/n8n:latest`) → `0.0.0.0:5679`, RAM 295 MiB, **활성 WF 0개** (깨끗)
- `n8n-staging-postgres` → 내부 5432, RAM 35 MiB
- **추가**: `openclaw-gateway` 프로세스 (PID 2593078, `127.0.0.1:18789/18791/18792`, RAM 720 MiB VSZ 21.5GB)

**금고 (3개 + 시스템 서비스)**
- `pressco21-nextcloud-app` (`nextcloud:31-apache`) → `0.0.0.0:18080`
- `pressco21-nextcloud-db` (`mariadb:11`) → 내부 3306
- `pressco21-nextcloud-redis` (`redis:7-alpine`) → 내부 6379
- systemd: `filebrowser` (`*:8090`, `/srv/pressco21-content`), `syncthing` (`127.0.0.1:8384`, `*:22000`), `smbd` (LAN), `nextcloud-oracle-reverse-tunnel.service` (**금고→본진 SSH 역터널, backup.pressco21.com의 진짜 백엔드**)

### 3.3 Nginx 사이트 → 실제 서비스 매핑

**본진 Nginx (6 사이트)**
| 도메인 | upstream | 실제 서비스 |
|--------|----------|------------|
| `n8n.pressco21.com` | `127.0.0.1:5678` | n8n 운영 |
| `nocodb.pressco21.com` | `127.0.0.1:8080` | NocoDB |
| `minio.pressco21.com` | `127.0.0.1:9001` | MinIO 콘솔 |
| `img.pressco21.com` | `127.0.0.1:9000` | MinIO S3 API (CDN) |
| `crm.pressco21.com` | `127.0.0.1:9100` (Python) + `127.0.0.1:5678/webhook/crm-proxy` | 오프라인 CRM 대시보드 (Python+n8n 혼용) |
| `hub.pressco21.com` | `/var/www/gov-hub` 정적 + `127.0.0.1:5678/webhook/gov-docs/` | 정부지원사업 서류허브 |
| `backup.pressco21.com` | `127.0.0.1:18081` | **금고 Nextcloud (SSH 역터널)** |

**플로라 Nginx (3 사이트)**
| 도메인 | upstream | 용도 |
|--------|----------|------|
| `n8n-staging.pressco21.com` | `127.0.0.1:5679` | 스테이징 n8n |
| `mini.pressco21.com` | `127.0.0.1:3001` + `/var/www/mini-pressco21/` | **텔레그램 미니앱 v3.1** |
| default | `/var/www/html` | 빈 페이지 |

### 3.4 텔레그램 봇 현황 (2026-04-14 n8n 전수 덤프 + getMe/getChat 실측)

**봇 5개 + 그룹 4개 + 장지호 DM** — 초기 가정(봇 3개 + 그룹 1개)은 오류로 판명, 실측 전면 수정

#### 봇 5개 (Telegram getMe로 ID·username 확정)

| # | 봇 ID | @username | n8n credential | 담당 WF | 특이사항 |
|---|------|----------|---------------|--------|---------|
| B1 | 8759562724 | `@Pressco21_alert_bot` | 없음 (로컬 훅 전용) | 0 | Claude Code 개발 알림 — **완전 분리 유지** (대표 결정 2026-04-14) |
| B2 | 8643940504 | `@Pressco21_makeshop_bot` | `RdFu3nsFuuO5NCff` + `eS5YwFGpbJht6uCB` **[중복!]** | **122** | 중복 credential 통합 필수 |
| B3 | 8521920006 | `@Pressco21_bot` | `1` (Telegram Bot API) | 17 | 장지호 개인 DM 위주 |
| B4 | 8672368507 | `@pressco21_openclaw_bot` | `O6qwF7Pup3u1Zc1O` (Flora-OpenClaw-Bot) | 10+ | Flora 양방향 대화, openclaw-gateway 경유 |
| B5 | 8773710534 | `@Pressco_Bank_bot` | `RQvOiScJ4KjbJcsS` | 4 | 은행 알림 그룹 전용 — **유지 (재무 허브 씨앗)** |

#### 그룹·DM (getChat로 확정)

| chat_id | 그룹 이름 | 멤버 | 현재 용도 |
|---------|----------|-----|----------|
| `7713811206` | 장지호 개인 DM | 1명 | 대부분 WF 수신 |
| `-5154731145` | 프레스코21 | 3명 (장지호 + 봇 2) | FA 시리즈, [F11] 마감 알림 → Topic 모드로 확장 예정 |
| `-5275298126` | 은행 알림 | 4명 (원장님+장지호+이재혁+B5) | 농협 입금 — **변경 없음 (재무 허브 씨앗)** |
| `-5043778307` | 플로라 클로드 코드 개발실 | 4명 (장지호 + 봇 3) | Claude 기획안 + ⚠️ **INFRA 3개 오배선** |
| `-5198284773` | 플로라 코덱스 개발실 | 3명 (장지호 + 봇 2) | Codex CLI 실행 로그 |

#### ⭐ 핵심 발견 4가지

1. **n8n credential 중복 등록** — `PRESSCO21-Telegram-Bot`(75 WF) + `Pressco메이크샵봇`(47 WF) = 같은 봇(B2 8643940504). B2 혼자 **122개 WF**를 떠안고 있는데 n8n UI에서 두 개처럼 보이는 게 "봇이 뭘 하는지 모르겠다"의 근본 원인. P1 Wave 2에서 `eS5Y...` credential 삭제 + 모든 WF를 `RdFu...`로 통합 필수.

2. **INFRA 오배선** — `INFRA 아침 시스템 건강 리포트`, `WF 헬스 모니터`, `API 사용량 + 비용 트래커` 3개 WF가 "플로라 클로드 코드 개발실" 그룹으로 발송 중. 원래 장지호 DM으로 가야 할 시스템 알림이 개발실에 떨어지고 있음. Wave 3에서 B3 @Pressco21_bot 경유 장지호 DM으로 이전.

3. **B1 alert_bot 완전 분리 유지** — 대표가 Claude Code 개발 알림을 타 알림과 섞지 않기 위해 전용 DM으로 유지 결정 (2026-04-14). legacy 전환 취소.

4. **은행 알림 그룹 유지** — 향후 "PRESSCO21 재무 통합 허브" 프로젝트(별도 PRD, 종료 후 진행)의 Level 1 씨앗. ANU P1에서 절대 건드리지 않음. 상세: `memory/financial-hub-plan.md`.

#### 텔레그램 사용 WF 집계 (실측)

- 전체 n8n WF: **142개** (활성 113 / 비활성 29)
- 텔레그램 사용 WF: **92개** (활성 67 / 비활성 25)
- 봇별 분포: B2 122개(중복 합산) / B3 17개 / B4 10+개 / B5 4개 / B1 0개(로컬 훅)
- chat_id 유니크값 (숫자형): `7713811206`, `-5154731145`, `-5275298126`, `-5043778307`, `-5198284773`
- 동적 chat_id (`$env`, `$json`): 약 75개 WF에서 사용 (대부분 Flora 시리즈)

### 3.5 n8n 활성 워크플로우 129개 분포 (샘플 네이밍)

**식별된 카테고리 (P2-2에서 전수 분류 필요)**
| 네이밍 prefix | 대략 수 | 예시 | 용도 |
|--------------|--------|------|------|
| `WF-*` | 30~40 | `WF-01 Class API`, `WF-05 Order Polling`, `WF-CRM-01 입금자동반영` | 파트너클래스·CRM·리뷰 등 핵심 비즈니스 API |
| `Flora-*`, `[F0]~[F26]` | 25~30 | `[F3] 모닝 브리핑`, `[F9] 출고 태스크 동기화`, `[F12] Flora → 미니앱 태스크 등록` | 플로라 업무 허브 |
| `FA-*` | 5~6 | `FA-001` 강사 등급, `FA-004b` 신청 조회 | 강사 신청·등업 |
| `정부지원사업_*` | 7~8 | `자동수집`, `월간리포트`, `텔레그램허브`, `이벤트기반탐색`, `행정서류자동생성`, `마감임박재알림`, `HWPX서식자동채움`, `GS-805 TOP5` | 정부사업 자동화 |
| `INFRA *` | 3~5 | `아침 시스템 건강 리포트`, `API 사용량·비용 트래커`, `WF 헬스 모니터` | 인프라 모니터링 |
| `[APP] *` | 4 | `상품 API`, `주문 API`, `인증 API`, `푸시 토큰 등록` | 모바일 앱 백엔드 |
| `[OM-*]`, `[OMX-*]` | 5~7 | 메이크샵·스마트스토어 adapter, 신규 문의 알림 | 오픈마켓 통합 |
| `WF-YT-*` | 5 | YT Catalog, Sync, Comments, AI Match | 유튜브 자동화 |
| `HR-*` | 2 | `HR-001 출퇴근봇`, `HR-002 미기록 리마인더` | 근태 |
| `F050*` | 3 | AI 챗봇 백엔드/피드백/상품검색 | 챗봇 |
| `S3A-*` | 2 | 주간 리포트, RFM 세그먼테이션 | BI |
| `WF-CHURN-*` | 2 | 이탈 감지, 파트너 리스크 모니터 | 이탈 |
| 기타·레거시 | 10~15 | `WF-YT-AI-MATCH`, `Flora Law Lookup`, `Flora GDrive List/Search` 등 | 혼재 |

**미확정**: 총 129개 중 이름 일부만 캡처됨. P2-2에서 **100% 덤프 + 실행 빈도 측정 + 분류**가 필요.

### 3.6 로컬 워크스페이스 구조

**루트 14폴더**: `pressco21/`, `korean-law-mcp/`, `notion-cms/`, `pdp-maker-201/`, `블로그자동화/`, `OMX(오_마이_코덱스)/`, `codex/`, `archive/`, `output/`, `tax-automation/`, `tmp/`, `_recovery_test/`, `personal/`, `직원-공유드라이브-가이드-2026-04-10/`

**pressco21/ 하위 29폴더** (A~G 그룹)
- **A. 개발 중 (4)**: `mobile-app/`, `mini-app-v2/`, `offline-crm-v2/`, `flora-todo-mvp/`
- **B. 운영 정본 (6)**: `makeshop-skin/`, `n8n-automation/`, `mcp-shrimp-task-manager/`, `homepage-automation/`, `ops/`, `tools/`
- **C. 참조 전용 구 스킨 (6)**: `메인페이지/`, `파트너클래스/`, `간편 구매/`, `브랜드스토리/`, `파트너맵/`, `레지너스 화이트페이퍼/` ← **CLAUDE.md에 "수정 금지"로 명시**
- **D. 문서/지식 (5)**: `docs/`, `company-knowledge/`, `codex-skills/`, `openclaw-project-hub/`, `tasks/`
- **E. 작업 보조 (4)**: `scripts/`, `_tools/`, `shrimp_data/`, `tests/`
- **F. 정리 대상 (3)**: `archive/` (내부), `output/`, `1초 로그인(킵그로우)/`
- **G. 홈페이지 관련 (1)**: 위와 겹침

### 3.7 문서 파편화 지도 (SSOT 후보 5곳)

| 파일 | 역할 | 마지막 대폭 갱신 | 문제 |
|------|------|-----------------|------|
| `~/.claude/pressco21-infra.md` | 인프라 레퍼런스 (글로벌) | 2026-04-02 | WF 개수 14개로 기록, 실제 129개 — **현행화 시급** |
| `pressco21/HARNESS.md` | 하네스 거버넌스 v3.2 | 2026-03-29 | 에이전트 28개 조직도 v2 반영, 인프라 실측과 불일치 (본진 14 WF 기록) |
| `pressco21/OPS_STATE.md` | 장기 운영 사실 | (수시) | Flora Todo·CRM·서버모니터링 등 일부 사실만 기록, 봇·폴더 현황 미반영 |
| `pressco21/AI_SYNC.md` | Claude Code·Codex 인수인계 | 2026-04-11 | Session Lock 보드 + Last Changes 대량 누적 (39KB) |
| `MEMORY.md` + 토픽 25개 | 자동 메모리 | 수시 | 200줄 제한 내, 토픽 파일에 상세. 가장 "살아있는" 문서 |

**파편화의 결과**: 새 세션이 "현재 상태"를 알려면 위 5곳 + 서버 3대 + `/home/ubuntu/scripts/` 주석까지 읽어야 함. ANU 종료 시 이 5곳이 **상호 참조 링크로 연결된 단일 SSOT 레이어**가 되어야 한다.

### 3.8 Claude 하네스 (~/.claude/)

- 전역 에이전트 25개 (`agents/`) — PRD v2 목표 28개와 차이 3개
- 전역 스킬 7개 (`skills/`: hwpx, makeshop-developer, n8n-reference, orchestration, pptx-ko-to-zh, bulk-product-edit, gov-doc-writer)
- 전역 훅 5개 (`hooks/`: agent-logger, bash-guard, makeshop-edit-guard, notify-telegram, 로그 파일)
- 전역 룰 2개 (`rules/`: agent-routing, n8n-reference)
- `CLAUDE.md` 72줄, `pressco21-infra.md` 5052 바이트

---

## 4. 제약 & 원칙 (절대 원칙)

1. **비용 0원**: 유료 SaaS 추가 금지. Oracle Free 두 계정 + 미니PC + 텔레그램 + n8n + NocoDB + MinIO 한도 내에서만 해결
2. **라이브 무중단**: 운영 n8n·쇼핑몰·메이크샵·파트너클래스·CRM은 절대 중단 없음. 모든 위험 작업은 **Staging(플로라 `n8n-staging.pressco21.com`) 먼저 → 검증 → 운영**
3. **메이크샵 `${var}` 이스케이프**: 템플릿 리터럴은 **반드시** `\${var}`로. 편집기 저장 실패의 근원. `makeshop-edit-guard.sh` 훅이 감지하나 AI가 먼저 지키는 게 원칙
4. **가상 태그 보존**: `<!--/user_id/-->`, `{$치환코드}` 등 메이크샵 서버사이드 태그는 **절대** 삭제·수정 금지
5. **CSS 스코핑**: 컨테이너 ID/class로 범위 제한 필수 (기존 상점 스타일 충돌 방지)
6. **IIFE 격리**: JS 전역 오염 방지, 즉시실행함수 패턴
7. **SSH는 SSOT 위반**: 서버에서 직접 파일 편집 금지. 항상 로컬 정본 → `deploy.sh` → 서버 반영
8. **git 안전**: `--no-verify`, `--force`, `reset --hard`, 브랜치 강제 삭제 **금지**. 사용자가 명시적으로 요청할 때만
9. **금전 관련**: 어떤 가격·정산·세금 결정도 **CFO 에이전트를 반드시 경유**
10. **2인 체제 존중**: Claude Code(주도) + Codex CLI(보조/독립). 같은 서브디렉터리에서 동시 WRITE 금지. `AI_SYNC.md` 먼저 확인
11. **금고 HDD 데이터 존중**: 4TB HDD NTFS 안에 이미 다른 데이터가 있을 수 있음. 마운트 전 **read-only 먼저** 확인
12. **n8n WF 비활성화 ≠ 삭제**: 129개 중 "죽은 것"으로 판단되는 WF도 우선 **비활성화**만. 30일 관찰 후 삭제
13. **텔레그램 봇 토큰 고정**: 현재 봇 토큰은 절대 폐기 금지. 역할만 재정의. 신규 봇 추가도 최소화

---

## 5. 해결 대상 3가지 문제 (사용자 요구사항 그대로)

### 문제 P — 텔레그램 봇 카오스
**증상**: 봇 3개가 역할 혼재, `@Pressco21_bot`은 3개 Trigger WF 충돌 블로커, 직원들은 "어느 봇과 대화해야 할지" 혼동
**근본 원인**: 초기에 봇 역할 분리 설계 없이 필요할 때마다 즉흥 추가
**목표**: **1허브 · N알림 · 1게이트** 모델로 정리 (§7.1 참조)

### 문제 S — 서버·프로젝트 부풀림
**증상**:
- n8n 129개 WF 중 운영 필수·실험·죽은 것 구분 불가
- 본진 `/home/ubuntu` 루트에 작업 잔재 11개 파일 + 중복 폴더 4개
- pressco21/ 하위 29폴더 구조가 카테고리 분리 없이 평면
- 금고 4TB HDD 미마운트 (백업 여력의 50%+ 놀고 있음)
- SSOT 파편화 5곳 (§3.7)

**근본 원인**: 빠른 개발 + 실측과 기록의 괴리 + SSOT 관리 주기 없음
**목표**: **엔터프라이즈급 정렬** — 분류 체계 + 이동 정리 + SSOT 통합 (§7.2, §7.3)

### 문제 C — 하네스 v2와의 정합성 불안
**증상**: PRD v2 Phase 2까지 완료되었지만, 위 P·S를 건드리면 이미 계획된 Phase 2.5/3와 충돌할 수 있음. 특히:
- PRD v2 §3.6 "텔레그램 + 카톡 전략"과 봇 재편이 충돌할 수 있음
- PRD v2 §6 "인프라 정리" 항목 4개가 이 프로젝트와 일부 겹침
- PRD v2 §7 "기초 체력" (CLAUDE.md 경량화, AI_SYNC 트리밍)은 이미 완료됐으나 ANU가 다시 건드릴 가능성

**근본 원인**: PRD v2 작성 시점(2026-04-04) 이후 실측 데이터가 업데이트되지 않음
**목표**: **§6 충돌 방지 매핑표**로 역할 분담 + PRD v2 로드맵 부록에 ANU 흡수

---

## 6. 기존 PRD v2와의 충돌 방지 매핑

**원칙**: PRD v2가 "무엇을 할지"를 정한다. ANU는 "어떻게 구체적으로 할지 + 누락된 것"을 채운다. 중복 시 PRD v2의 전략 우선, 실행 상세는 ANU 우선.

| PRD v2 섹션 | ANU 대응 | 관계 | ANU의 역할 |
|------------|---------|------|-----------|
| §2 에이전트 조직도 (28개, T1/T2/T3) | — | **그대로 수용** | ANU는 에이전트 재설계 안 함. 현재 25개 상태를 v2 28개 목표에 맞추는 것도 v2 범위 |
| §3.1~3.5 업무 허브 (Flora + "메모해줘") | P1 (봇 정리) | **보완** | Flora 봇이 **유일한 사람↔시스템 인터페이스**임을 ANU가 구조로 고정 (설정/WF/권한) |
| §3.6 사내 메신저 (텔레그램 주력 + 카톡 보조) | P1 (봇 정리) | **실행 상세** | PRD v2가 "텔레그램을 쓴다" 결정 → ANU가 **봇 몇 개를 어떤 역할로 쓸지** 구체화 |
| §3.6.1 텔레그램 미니앱 | — | **그대로 수용** | 미니앱은 Phase 2.5 범위. ANU는 건드리지 않음 |
| §5 자율운영 프로토콜 (L5 트리거) | — | **선행 조건 제공** | ANU가 P2에서 n8n 129개 분류를 끝내야 v2의 자율 트리거가 신뢰 가능한 데이터 위에서 돎 |
| §6 인프라 정리 (hwpx 삭제, flora-todo 이전, n8n-staging 이전, 100GB 볼륨) | P2 (인프라 클린업) | **부분 완료 + 확장** | v2의 4가지 TODO 중 3가지는 완료됨(`MEMORY.md` 확인). ANU는 **남은 것 + 신규 발견(4TB HDD, /home 루트 정리)** 추가 |
| §7 기초 체력 (CLAUDE.md 80줄, AI_SYNC 200줄, 훅 5개) | — | **유지** | 완료된 것 재작업 안 함. 단 AI_SYNC 200줄 기준은 ANU 종료 시 재검증 |
| §8 MakeShop SDK 스크립트 8개 | — | **범위 밖** | 메이크샵 SDK는 v2 Phase 1 범위. ANU 건드리지 않음 |
| §10 실행 일정 Phase 0~3 | **ANU = Phase 2.5~3 사이의 브리지** | **흡수** | ANU 종료 시 PRD v2 §10 표에 "Phase 2.8: ANU" 행 추가하여 정식 흡수 (P3-1에서 실행) |

**충돌 경보 신호**: Phase 진행 중에 다음 상황이 생기면 **즉시 멈추고 대표에게 확인**:
- PRD v2 §2의 에이전트 조직도 변경이 필요해짐
- PRD v2 §5의 자율 트리거 조건을 만져야 함
- `CLAUDE.md` 3계층(`~/.claude/` + `workspace/` + `pressco21/`) 중 어느 하나라도 **80줄 이상 늘리는** 변경이 필요
- 본진 cron 9개 중 어느 것이라도 삭제·변경이 필요

---

## 7. 목표 아키텍처 (3주 후 모습)

### 7.1 텔레그램 봇 타겟 모델 — 1허브·N알림·1게이트

```
사람 ↔ 시스템 인터페이스 (Flora 봇, 유일한 양방향)
  @pressco21_openclaw_bot
    ├─ 입력: 장지호 + 직원 "메모해줘", "/출근", "/일정", 자연어 요청
    └─ 출력: 브리핑, 체크인, 태스크 확인, 에이전트 응답
    └─ 백엔드: 플로라 서버 openclaw-gateway + n8n [F0~F26]

시스템 → 사람 알림 (알림 봇, 단방향)
  @Pressco21_bot  (역할 재정의)
    ├─ 정부지원사업 공고 알림
    ├─ 서버 건강 리포트 (아침/저녁)
    ├─ WF 헬스 경보
    ├─ API 사용량·비용 알림
    └─ 기타 일반 운영 알림
    ※ 장지호가 직접 대화하지 않음. 읽기 전용 피드 역할

게이트 봇 (특정 비즈니스 게이트)
  @Pressco21_makeshop_bot  (역할 재정의)
    ├─ FA-001~004 강사 신청/등업/반려 흐름
    ├─ 콜백 버튼 처리 (FA-001b)
    └─ 강사 1:1 응대 채널 (확장 여지)
    ※ 장지호가 직접 대화하지 않음. 강사↔시스템 사이 게이트

수신 그룹
  프레스코21 그룹 (-5154731145)
    → 직원 공용 알림 채널로 재정의 (향후 분리 가능)
```

**규칙**:
- Flora 봇(`openclaw_bot`)은 장지호·직원과 **자연어 대화**만 처리. n8n WF 알림 목적으로 쓰지 않는다
- `Pressco21_bot`은 n8n WF가 **일방향 알림만**. Trigger 역할 금지(충돌 원인이었음)
- `Pressco21_makeshop_bot`은 FA 시리즈 + 강사 응대만. 다른 목적 금지
- 신규 봇 추가 금지. 기능 추가 시 위 3개 중 하나에 배치
- 각 봇의 `.env`·Credential ID·담당 WF는 `pressco21-infra.md`에 단일 표로 기록

### 7.2 서버 역할 정식 명문화

```
본진 (oracle, 158.180.77.201) = 운영면 [고정]
  책임: 공개 도메인, n8n 운영, NocoDB, MinIO, CRM 백엔드
  금지: 실험, 테스트, 임시 작업, 개인 도구
  접근: SSH(22) + HTTPS(443)
  디스크 한도: 150GB (여유 50GB 유지)
  RAM 한도: 경보선 80%, 긴급선 90%

플로라 (openclaw, 158.179.193.173) = AI·테스트면 [고정]
  책임: Flora AI, n8n-staging, flora-todo-mvp, 미니앱, 자동화 실험
  금지: 공개 서비스 운영 (mini.pressco21.com은 예외 — Phase 2.5 산출물)
  접근: SSH(22) + HTTPS(443) + Tailscale
  디스크 한도: 150GB
  RAM 한도: 경보선 80%

금고 (minipc, 집 LAN + Tailscale) = 백업·장기보관면 [고정]
  책임: Nextcloud, Syncthing, Samba(LAN), 파일보관, 백업 수신
  금지: 공개 서비스 직접 노출 (본진 SSH 역터널 경유만 허용)
  외장 디스크 정책:
    - 2TB SSD: 운영 중 자료 (design, classes, PRIVATE 등)
    - 4TB HDD: **ANU P2-3에서 마운트 + 장기 아카이브 전용**으로 편입
    - 내장 512GB NVMe: OS + Nextcloud DB + bind-mount 뷰
```

### 7.3 프로젝트 트리 타겟 구조

```
/Users/jangjiho/workspace/
├── pressco21/                    ← 메인 프로젝트 (구조 재편)
│   ├── apps/                     ← ★ 신설: 활발히 개발 중인 앱
│   │   ├── mobile-app/
│   │   ├── mini-app-v2/
│   │   ├── offline-crm-v2/
│   │   └── flora-todo-mvp/
│   ├── skins/                    ← ★ 신설: 메이크샵 스킨 (정본)
│   │   └── makeshop-skin/
│   ├── legacy-skins/              ← ★ 신설: 참조 전용 구 폴더 (수정 금지 표식)
│   │   ├── 메인페이지/
│   │   ├── 파트너클래스/
│   │   ├── 간편 구매/
│   │   ├── 브랜드스토리/
│   │   ├── 파트너맵/
│   │   └── 레지너스 화이트페이퍼/
│   ├── automation/               ← ★ 신설
│   │   ├── n8n-automation/
│   │   └── homepage-automation/
│   ├── services/                 ← ★ 신설
│   │   ├── mcp-shrimp-task-manager/
│   │   └── ops/
│   ├── docs/                     (유지)
│   ├── company-knowledge/        (유지)
│   ├── tools/, scripts/, _tools/ (유지)
│   ├── CLAUDE.md, AI_SYNC.md, HARNESS.md, OPS_STATE.md, ROADMAP.md, README.md (유지)
│   └── docs/ai-native-upgrade/   ← 이 프로젝트 산출물
├── korean-law-mcp/               (독립 유지)
├── notion-cms/                   (독립 유지)
├── 블로그자동화/                   → archive/
├── pdp-maker-201/                 (독립 유지 또는 archive 판단)
├── tax-automation/                → archive/ (역할 불명, P2-4에서 확인)
├── OMX(오_마이_코덱스)/             (Codex 전용, 유지)
├── codex/                         → 삭제 또는 archive (빈 npm 프로젝트)
├── tmp/, _recovery_test/          → 삭제
├── output/                        (세션 출력, 유지)
├── archive/                       (비활성 보관, 유지)
├── personal/                      (개인용, 유지)
├── INFRA.md                       ← ★ 신설: 워크스페이스 SSOT (§8 참조)
├── PROJECTS.md                    ← ★ 신설: 프로젝트 카탈로그 (§8 참조)
├── CLAUDE.md, AI-OPERATIONS.md, AGENTS.md (유지)
└── 직원-온보딩 가이드 4개           → pressco21/docs/onboarding/ 이동
```

**주의**:
- pressco21 내부 재편은 **git mv**로 이력 보존
- 폴더 경로 변경은 `CLAUDE.md`·`HARNESS.md`·`_tools/git-hooks/*`·`deploy.sh`의 하드코딩 경로를 **전부** 업데이트해야 함
- git 이력 보존 + 기존 import 경로·배포 스크립트 영향이 커서, **P2-4에서 단독으로** 처리

### 7.4 n8n 129개 목표 분류 체계

**네이밍 표준** (P2-2 이후 신규 WF는 반드시 따름)
```
[도메인]-[순번] 기능명 v버전
예: [PARTNER]-01 Class API v2
    [CRM]-03 Gmail 입금알림
    [GOV]-01 자동수집
    [FLORA]-03 모닝 브리핑
    [INFRA]-01 시스템 건강
    [APP]-02 주문 API
    [OMX]-01 신규 문의 알림
    [HR]-01 출퇴근봇
    [FA]-01 강사 등급 자동 변경 v4.0
    [BI]-01 RFM 세그먼테이션
    [LEGACY]-XX (곧 폐기)
```

**분류 태그 (n8n tag 기능 사용)**
- `env:prod`, `env:staging`, `env:dead`
- `owner:claude`, `owner:codex`, `owner:flora`
- `criticality:P0`, `P1`, `P2`, `P3`
- `trigger:webhook`, `cron`, `manual`, `error-handler`

**WF 생명주기**
- `active + tag env:prod` = 운영 필수
- `active + tag env:staging` = 테스트 중 (플로라로 이동 검토)
- `inactive + tag env:dead` = 폐기 대기 (30일 후 삭제)

---

## 8. Phase 구조 (P0~P4)

### P0 — 진단 & 고정 (0.5일)
현재 상태를 실측으로 다시 확인하고, 이 프로젝트의 베이스라인을 고정한다. 이후 Phase가 작업할 수 있는 "출발선"을 만든다.

### P1 — 텔레그램 봇 정리 (3일)
봇 3개의 역할을 §7.1 타겟 모델로 재정의하고, 관련 WF를 재배선한다.

### P2 — 인프라 클린업 (5일)
n8n 129개 분류, 본진 `/home/ubuntu` 정리, 금고 4TB HDD 마운트, pressco21/ 폴더 재구성, SSOT 통합.

### P3 — 하네스 흡수 (2일)
ANU 결과를 기존 하네스 문서(HARNESS.md, PRD v2 로드맵, MEMORY, pressco21-infra.md)에 흡수.

### P4 — 운영 리듬 정착 (2일)
주간·월간 자가진단 자동화, ANU 유지보수 체계 가동.

**합계**: 12.5 영업일 (약 3주, 라이브 무중단 고려)

---

## 9. Phase P0 — 진단 & 고정 (상세)

### P0.1 재실측 — 이 파일 §3 값 검증
**실행**:
- `ssh oracle`, `ssh openclaw`, `ssh minipc` 각각 접속 가능 확인
- `docker ps` 각 서버 → §3.2 값과 비교
- 본진: `docker exec n8n n8n list:workflow --active true | wc -l` → 129 확인 (±5 허용)
- 금고: `lsblk` → `/dev/sdb` 4TB HDD 존재·미마운트 확인
- Nginx 사이트 개수 각 서버 일치 확인

**산출물**: `docs/ai-native-upgrade/P0-baseline-{YYYYMMDD}.md` (실측 스냅샷)

### P0.2 AI_SYNC Lock 선언
- `AI_SYNC.md`의 `Session Lock` 블록 갱신: Owner=Claude Code, Mode=WRITE, Working Scope=`docs/ai-native-upgrade/*`, Active Subdirectory=`pressco21/docs/ai-native-upgrade`
- Codex가 현재 WRITE 중이면 대기하거나, 다른 서브디렉터리인지 확인

### P0.3 텔레그램 봇 토큰 존재 확인
- `~/.claude/hooks/.env` 또는 `pressco21/.secrets.env`에서 3개 봇 토큰 존재 확인
- 봇별 테스트 메시지 1건씩 발송 → 수신 확인 (`@Pressco21_bot` → 장지호 DM, `@Pressco21_makeshop_bot` → 그룹 수신 확인, `@pressco21_openclaw_bot` → Flora 대화 확인)

### P0.4 PRD v2 로드맵의 현재 위치 재확인
- `docs/PRD-하네스-종합고도화-v2.md` §10 실행 일정 표와 현재 완료 상태 대조
- PRD v2 Phase 2까지 완료, Phase 2.5 진행 중 확인 → ANU가 "Phase 2.5와 병행 또는 직후"에 끼어들어가는 것이 맞는지 대표 확인

### P0 완료 기준
- [ ] `P0-baseline-*.md` 파일 생성됨
- [ ] `AI_SYNC.md` Session Lock에 ANU 표시됨
- [ ] 3개 봇 전부 수신 확인
- [ ] §3 스냅샷 값과 실측 오차 ±5% 이내
- [ ] 대표에게 P0 완료 + P1 착수 동의 요청 발송

---

## 10. Phase P1 — 텔레그램 봇 정리 (상세)

### P1-1 봇·WF 인벤토리 전수조사
**실행**:
- `ssh oracle "docker exec n8n n8n list:workflow" > /tmp/all-wf-snapshot.txt`
- 모든 WF 중 `telegram` 노드를 사용하는 것 추출 (n8n API 또는 로컬 JSON 저장소 `pressco21/n8n-automation/workflows/` 검색)
- 각 WF의 봇 토큰/Credential ID 식별 → 어느 봇에 물려 있는지 3그룹으로 분류
- Flora 시리즈·정부사업 시리즈·FA 시리즈·HR 시리즈·INFRA 시리즈 우선 확인

**산출물**: `docs/ai-native-upgrade/P1-bot-wf-matrix.md` — 표 형식
| WF ID | 이름 | 현재 봇 | 트리거 유형 | 타겟 봇 | 마이그레이션 필요 |
|-------|------|--------|------------|--------|-----------------|

### P1-2 타겟 모델 확정 (§7.1 적용)
- §7.1 모델을 대표에게 재확인 (변경 가능성 열어둠)
- 확정 후 `docs/ai-native-upgrade/P1-target-model.md`에 고정

### P1-3 마이그레이션 계획 수립
- 각 WF의 이동 순서 결정 (읽기 전용 알림 → 게이트 → Flora 허브 순)
- **테스트 순서**: n8n-staging(플로라)에 먼저 복제 → 새 봇 연결 → 수신 확인 → 운영 전환
- 충돌 WF (`@Pressco21_bot` 3개 Trigger) 우선 해결 순서 결정

### P1-4 마이그레이션 실행 (1회 1 WF)
- 한 번에 **1개 WF만** 변경
- 변경 → 비활성화 → 새 봇 Credential로 재활성화 → 수신 테스트 → AI_SYNC 기록
- 실패 시 즉시 롤백 (n8n 이전 버전 복원)

### P1-5 레거시 정리
- 역할 변경 후 쓰이지 않는 봇 토큰·Credential·그룹 Chat ID는 **삭제가 아니라 `legacy-` prefix로 이름 변경**
- 30일 관찰 후 실제 삭제 판단

### P1-6 봇별 `.env` 및 문서 갱신
- `pressco21-infra.md`의 텔레그램 섹션 갱신 (새 역할 기준)
- `HARNESS.md` §1 피드백 루프에 "봇별 역할" 표 추가
- `MEMORY.md` 해당 토픽 갱신

### P1 완료 기준
- [ ] `P1-bot-wf-matrix.md` 에 모든 텔레그램 연동 WF 등재 (예상 25~50개)
- [ ] Flora 봇(`openclaw_bot`)은 오직 사람↔시스템 대화만 처리
- [ ] `Pressco21_bot`은 **Trigger 0개** (전부 단방향 알림)
- [ ] `Pressco21_makeshop_bot`은 FA-* 시리즈만 담당
- [ ] 3개 봇 모두 수신·발신 테스트 통과
- [ ] `pressco21-infra.md` 텔레그램 섹션 현행화
- [ ] 대표가 각 봇에 테스트 메시지를 보내 "어떤 역할"인지 체감 확인

---

## 11. Phase P2 — 인프라 클린업 (상세)

### P2-1 본진 `/home/ubuntu` 정리 (0.5일)
**실행**:
- 루트 파일 11개 (`F010_workflow.json`, `WF-YT-*.json` 5개, `all-workflows-fresh.json` 1.6MB, `google-calendar-todo.json`, `fix_parsing_code.py`, `get-docker.sh`, `install-minio-backup-cron.sh`) → `/home/ubuntu/archive/202604-cleanup/`로 이동
- 중복 폴더 정리:
  - `flora-n8n-backup-20260402/`, `flora-n8n-import/`, `n8n-delete-backups/` → `archive/` 이동
  - `workflows/` vs `pressco21-workflows/` 중복 해소 (최신만 남기고 구 것 archive)
  - `flora-todo-mvp/` (1.1MB, 플로라 이전 완료된 잔재) → 삭제 OK (git에 원본 있음)
- `eolmaeyo-rebuild/` (39MB, "얼마에요" 리브랜드 흔적) — 용도 확인 후 판단

**완료 기준**:
- `/home/ubuntu`에 직접 놓인 파일은 `.bash*`, `.profile`, `.ssh/`, `scripts/`, `backups/`, `nocodb/`, `n8n/`만 남음
- 디스크 사용량 29GB → 최소 2GB 감소

### P2-2 n8n 129개 WF 전수 분류 (2일)
**실행**:
- `ssh oracle "docker exec n8n n8n list:workflow"` 전체 출력 캡처 → `P2-n8n-full-inventory.md`로 정리
- n8n API로 각 WF 메타데이터 가져오기 (활성 여부, 마지막 실행, 실행 빈도, tag, 크기)
  - 엔드포인트: `n8n.pressco21.com/api/v1/workflows` (API key 필요, `.secrets.env`에서)
- 각 WF를 §7.4 분류 체계로 태깅:
  - `env:prod/staging/dead`
  - `criticality:P0~P3`
  - `trigger:*`
  - `owner:*`
- 판단 기준:
  - 최근 30일 실행 0회 + Trigger 없음 → `env:dead` 후보
  - 최근 30일 실행 0회지만 webhook/manual → 유지, 관찰
  - 매일 실행 + 실패 없음 → `env:prod, criticality:P0`
  - 중복·유사 WF 병합 후보 목록 별도 작성

**산출물**:
- `P2-n8n-full-inventory.md` (129행 표)
- `P2-n8n-classification.md` (카테고리별 집계 + 삭제/병합 후보)
- n8n 태그 적용 (서버 상태 변경)

**완료 기준**:
- 129개 전부 태깅 완료
- `env:dead` 후보는 **비활성화**만 (삭제 금지)
- 30일 관찰 윈도우 시작 (2026-05-13에 재검토)

### P2-3 금고 4TB HDD 마운트 (0.5일)
**실행**:
1. 먼저 **read-only로 마운트** 해서 기존 데이터 확인: `sudo mount -o ro -t ntfs /dev/sdb2 /mnt/pressco21-hdd-check`
2. 내용 리스트 → 보존할 데이터 있는지 판단
3. 기존 데이터 있음 → 대표 확인 후 결정
4. 기존 데이터 없거나 보존 불필요 → read-write 마운트:
   - `/mnt/pressco21-hdd` (경로는 `system-health.md` 규칙)
   - `ntfs-3g`로 rw 마운트, uid/gid 명시
   - `/etc/fstab`에 등재 (UUID 기반, nofail 옵션)
5. 용도 배정:
   - MinIO 장기 아카이브 백업 대상 변경 (본진 cron `minio-backup-to-vault.sh`의 `DEST_DIR` 업데이트)
   - Nextcloud "장기보관" 카테고리를 바인드 마운트로 이 디스크로 이전 (선택)
6. 첫 백업 실행 → 용량 증가 확인

**완료 기준**:
- 4TB HDD가 `/mnt/pressco21-hdd`에 마운트됨
- `/etc/fstab` 재부팅 검증 통과
- 첫 아카이브 파일 1개 이상 기록됨
- `system-health.md`·`OPS_STATE.md` 갱신

### P2-4 pressco21/ 폴더 재구성 (1.5일)
**⚠ 주의**: 가장 위험한 작업. 경로 변경은 훅·배포 스크립트·CLAUDE.md·AI_SYNC.md 전부에 영향.

**실행 (단계별 커밋)**:
1. `apps/`·`skins/`·`legacy-skins/`·`automation/`·`services/` 폴더 생성
2. 각 그룹 1개씩만 `git mv` 실행 → **커밋 → 훅 통과 확인 → push 검증 확인**
3. 하드코딩 경로 수정:
   - `pressco21/CLAUDE.md` (정본/참조 매핑 표)
   - `pressco21/HARNESS.md` §5 파일 인벤토리
   - `_tools/git-hooks/*` (메이크샵 경로 체크)
   - `deploy.sh` 류
   - `SYNC-STATUS.md` (있다면)
4. 각 git mv 후 `npm run build` 또는 `pytest` 실행 가능한 프로젝트는 빌드 검증
5. 5개 그룹 전부 이동 완료 후 **전체 통합 테스트**

**완료 기준**:
- `pressco21/` 직속 최상위는 `apps/`, `skins/`, `legacy-skins/`, `automation/`, `services/`, `docs/`, `company-knowledge/`, `tools/`, `scripts/`, `_tools/`, `tests/`, `tasks/`, `output/`, `shrimp_data/`, `archive/` + md 파일 5~7개만
- git log에서 이동된 파일의 이력 보존 확인
- 메이크샵 스킨 push 검증 (`makeshop-skin` → `skins/makeshop-skin`) 1건 성공
- 모든 빌드·테스트 통과

**롤백 계획**: `git reset --hard HEAD~N` 또는 특정 커밋 지점으로 복원 (사용자 승인 후)

### P2-5 workspace 루트 정리 (0.5일)
- `tmp/`, `_recovery_test/`, `codex/`(빈 npm), `tax-automation/`(역할 불명) → `archive/202604-cleanup/` 이동 또는 삭제 (사용자 확인)
- `블로그자동화/` → `archive/` (5주 이상 미수정)
- `직원-온보딩-*.md` 4개 → `pressco21/docs/onboarding/` 이동
- `backup.pressco21.com-Namecheap-DNS-연결가이드-*.md` → `pressco21/docs/infra/` 이동

### P2-6 SSOT 통합 — `workspace/INFRA.md` + `workspace/PROJECTS.md` 신설 (1일)
**목적**: 새 세션이 **2개 파일만 읽으면** 전체 상태를 파악할 수 있게

**`INFRA.md` 내용**:
- 서버 3대 실측 스펙 (§3.1 값 + 주기적 갱신)
- 각 서버의 컨테이너·nginx·cron·외장 디스크 현황
- 도메인 → 서비스 매핑 전체
- 텔레그램 봇 3개 역할 (P1 결과)
- 장애 복구 순서 (`auto-heal.sh`는 무엇을, 실패하면 무엇을)

**`PROJECTS.md` 내용**:
- 워크스페이스 루트 14폴더 + 각 폴더의 1줄 설명 + 상태
- `pressco21/` 하위 재편된 구조 + 각 그룹 역할
- 각 프로젝트의 기술 스택 + 시작 명령 + 배포 경로 + 담당 에이전트
- 개발 중 vs 운영 정본 vs 참조 전용 vs 아카이브 구분

**기존 5개 SSOT와의 관계**:
- `pressco21-infra.md`: 인프라 상세 레퍼런스는 여기 유지, INFRA.md가 "요약 + 최신화"
- `HARNESS.md`: 거버넌스 문서 유지. INFRA.md가 §1 컴포넌트 맵의 실측 현황 보충
- `OPS_STATE.md`: 장기 운영 사실만 남김, INFRA.md와 중복 제거
- `AI_SYNC.md`: 운영 보드 유지
- `MEMORY.md`: 세션 메모리 유지

### P2 완료 기준
- [ ] 본진 `/home/ubuntu` 루트 파일 10개 이하
- [ ] n8n 129개 전부 태깅됨, `env:dead` 후보 리스트 확정
- [ ] 4TB HDD 마운트 + 첫 백업 파일 기록
- [ ] pressco21/ 폴더 재편 완료 + 빌드·테스트 통과
- [ ] workspace 루트 불필요 폴더 정리
- [ ] `INFRA.md`·`PROJECTS.md` 생성됨

---

## 12. Phase P3 — 하네스 흡수 (상세)

### P3-1 PRD v2 로드맵에 ANU 흡수
- `docs/PRD-하네스-종합고도화-v2.md` §10 실행 일정 표 하단에 "Phase 2.8: ANU" 행 추가
- 추가 내용:
  ```
  | Phase 2.8 | 4/13~5/4 | AI Native Upgrade — 봇 정리, n8n 분류, 서버/폴더 클린업, SSOT 통합 |
  ```
- PRD v2 §6 인프라 정리의 "4TB HDD" 항목 ANU 결과 참조 추가

### P3-2 `HARNESS.md` v3.3 갱신
- `<!-- HARNESS-META -->` 블록 버전 업: v3.2 → v3.3, 날짜 2026-04-13
- §1 컴포넌트 맵에 "텔레그램 봇 3개 역할" 블록 추가
- §5 파일 인벤토리에 `INFRA.md`·`PROJECTS.md` 추가
- §6 유지보수 일정에 "ANU 월간 자가진단" 추가
- 변경 이력에 v3.3 행 추가

### P3-3 `MEMORY.md` 최신화
- `MEMORY.md` 본문에 ANU 블록 추가 (§Ai Native Upgrade 진행 상황)
- 필요시 토픽 파일 신설: `ai-native-upgrade.md`
- 텔레그램 봇·프로젝트 재편·n8n 분류 결과 요약 반영

### P3-4 `pressco21-infra.md` 실측 반영
- WF 개수 14 → 129 갱신
- n8n Credentials 섹션 실측 기준 갱신
- 플로라·금고 cron 목록 추가
- 봇 역할 재정의 반영

### P3 완료 기준
- [ ] PRD v2 §10에 Phase 2.8 행 추가됨
- [ ] HARNESS.md v3.3 배포됨
- [ ] MEMORY.md에 ANU 블록 반영됨
- [ ] pressco21-infra.md 전면 현행화
- [ ] 새 세션에서 위 4개 파일만 읽고 "현재 상태"를 말할 수 있는지 대표가 체감 테스트

---

## 13. Phase P4 — 운영 리듬 정착 (상세)

### P4-1 주간 자가진단 자동화
- 매주 월요일 09:00 KST에 n8n WF `[INFRA]-02 주간 자가진단` 실행
  - 본진·플로라·금고 `df`, `free`, `docker stats`, 컨테이너 상태
  - n8n 활성 WF 수 (129 기준 ±)
  - 각 봇의 최근 7일 메시지 수
  - SSL 잔여일
  - auto-heal 발동 횟수
- 결과를 `@Pressco21_bot`으로 장지호에게 전송

### P4-2 월간 하네스 리뷰 자동화
- 매월 1일 n8n WF `[INFRA]-03 월간 하네스 리뷰` 실행
  - MEMORY 사용률·토픽 개수
  - 에이전트 호출 통계 (`~/.claude/hooks/agent-usage.log` 집계)
  - `env:dead` 후보 WF 재검토 목록 (30일 이상 실행 0회)
  - 하네스 문서 최종 갱신일 체크
- PM 에이전트가 리포트 생성 → Flora 봇으로 전달

### P4-3 `env:dead` 30일 관찰 종료 & 삭제 실행
- P2-2에서 태깅한 `env:dead` WF의 관찰 기간 만료 (2026-05-13)
- 실제 삭제 전 최종 리스트 대표 승인
- n8n `deactivate` → 30일 → 삭제

### P4-4 ANU 완료 회고
- `docs/ai-native-upgrade/RETRO.md` 작성
- 발견한 추가 문제, 다음 프로젝트 후보 기록
- PRD v2 Phase 3 진입 준비 완료 선언

### P4 완료 기준
- [ ] 주간·월간 자가진단 WF 둘 다 배포되고 첫 실행 성공
- [ ] `env:dead` 삭제 기한이 명확히 기록됨 (자동 리마인드 포함)
- [ ] RETRO.md 작성됨
- [ ] 대표가 "ANU 완료"를 선언하면 이 메타프롬프트는 `docs/ai-native-upgrade/archive/METAPROMPT-v1.0.md`로 아카이브

---

## 14. 작업 시작 전 체크리스트 (매 세션)

새로운 Claude Code 세션이 ANU를 이어서 하기 전 이 체크리스트를 **반드시** 통과해야 한다.

### 14.1 문서 통독 순서 (READ-FIRST)
1. `docs/ai-native-upgrade/METAPROMPT.md` (이 파일, 전체)
2. `docs/ai-native-upgrade/` 하위의 가장 최근 산출물 파일 (P{n}-*.md)
3. `docs/PRD-하네스-종합고도화-v2.md` §10 실행 일정 (ANU 흡수 여부 확인)
4. `AI_SYNC.md` Session Lock + 최근 3개 Last Changes
5. `MEMORY.md` (자동 로드됨)
6. `HARNESS.md` §1, §5 (파일 인벤토리)
7. `CLAUDE.md` 3계층 (`~/.claude/`, `workspace/`, `pressco21/`)
8. `OPS_STATE.md`

### 14.2 환경 확인
- [ ] `git status --short` 클린 확인
- [ ] `git log --oneline -5` 확인
- [ ] `ssh oracle "docker ps"` 접속·컨테이너 정상
- [ ] `ssh openclaw "docker ps"` 접속·컨테이너 정상
- [ ] `ssh minipc "docker ps"` 접속·컨테이너 정상
- [ ] `~/.claude/hooks/.env` 봇 토큰 존재 확인
- [ ] Tailscale 메시 활성 확인

### 14.3 진행할 Phase 선언
- [ ] `AI_SYNC.md` Session Lock에 `[ANU P{n}]` 블록 기록
- [ ] 현재 Phase의 완료 기준 재확인
- [ ] 이전 Phase가 완료되지 않았으면 **이어서**, 완료됐으면 **다음 Phase**
- [ ] 병렬 작업 필요 시 Codex CLI에게 위임 범위 명시 (`[CODEX]` prefix)

### 14.4 Effort 레벨 자동 안내
- P0, P2-5, P3-*, P4-4: **medium**
- P1-*, P2-1, P2-2, P2-3: **high**
- P2-4 (폴더 재편): **max** (되돌리기 어렵고 다중 시스템 영향)

### 14.5 안 되면 중단할 조건
- 봇 테스트 메시지 수신 실패 → P1 중단
- n8n `list:workflow` 실패 → P2-2 중단
- `/dev/sdb2` 마운트 시 기존 데이터 발견 → P2-3 중단, 대표 확인
- `git mv` 후 빌드 실패 → P2-4 즉시 rollback
- 본진 auto-heal.sh가 5회 이상 발동 → 전체 작업 중단

---

## 15. 진행 보고 프로토콜

각 Phase 종료 시 3종 세트:

1. **`AI_SYNC.md` Last Changes**에 아래 형식으로 추가
   ```
   - YYYY-MM-DD [ANU P{n}] {요약} (claude)
     - 산출물: docs/ai-native-upgrade/P{n}-*.md
     - 검증: {어떻게 완료 기준 확인했는지}
     - 다음: P{n+1} {첫 작업}
   ```

2. **`MEMORY.md`** 해당 토픽 (`ai-native-upgrade.md`) 갱신

3. **텔레그램 완료 보고**:
   - P0, P1, P2-1/2/3/4/5, P2-6, P3, P4 각 종료마다 Flora 봇(`@pressco21_openclaw_bot`)에게 단일 메시지
   - 포맷: `[ANU P{n}] 완료\n- 시간: HH:MM\n- 산출물: {파일명}\n- 다음: P{n+1}`

4. **커밋 메시지**:
   ```
   [harness] ANU P{n}: {1줄 요약}

   {무엇을 왜}

   산출물: docs/ai-native-upgrade/P{n}-*.md
   검증: {요약}
   ```
   **커밋 prefix는 `[harness]`** (CLAUDE.md 규정)

---

## 16. 리스크 & 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|-----|------|------|
| P1 봇 재배선 중 n8n Credential 꼬임 → WF 대량 실패 | 중 | 높음 | 1회 1 WF 원칙 + staging 먼저 + 즉시 롤백 |
| P2-2에서 "죽은 줄 알았던 WF"가 실은 월 1회 실행이어서 정지 시 장애 | 중 | 중 | 태그만 `env:dead` + 30일 관찰, 삭제는 P4-3 |
| P2-3에서 4TB HDD NTFS 데이터가 실은 회사 공용 자료 | 낮음 | 매우 높음 | **read-only 선마운트 필수**, 데이터 확인 후 대표 승인 |
| P2-4 폴더 재편으로 메이크샵 스킨 편집기 push 경로가 꼬임 | 중 | 매우 높음 | 1 그룹씩 이동 + push 검증 + `SYNC-STATUS.md` 즉시 갱신 |
| ANU 중 Codex가 같은 서브디렉터리 WRITE → 충돌 | 낮음 | 중 | `AI_SYNC.md` Lock 철저, 매 Phase 시작 전 확인 |
| PRD v2 Phase 2.5 (미니앱)이 ANU와 동시 진행되면서 서로 건드림 | 중 | 중 | P1·P2에서 `mini-app-v2/`는 건드리지 않음, Phase 2.5 완료 후 P2-4에서만 경로 이동 |
| 라이브 도메인 중 하나 (n8n/crm/hub/backup) 다운 | 낮음 | 매우 높음 | 모든 위험 작업은 staging → 운영 순. auto-heal.sh 발동 2회 이상 = 즉시 중단 |
| ANU 종료 후 새 메타프롬프트·파일들이 또 다른 파편화 | 중 | 중 | P3에서 5개 SSOT 파일에 흡수하고 ANU 폴더는 아카이브 |

---

## 17. 완료 정의 (Definition of Done)

ANU 전체가 끝났다고 말할 수 있는 단일 기준:

**"새 Claude Code 세션이 이 파일(`METAPROMPT.md`)과 `INFRA.md`·`PROJECTS.md` 3개만 읽으면, 3주 뒤에도 PRESSCO21의 서버·프로젝트·봇·워크플로우 상태를 정확히 말할 수 있고, PRD v2 Phase 3 (L5 자율운영) 진입을 시작할 수 있다."**

구체 측정:
- [ ] §10~§13 모든 Phase 완료 기준 체크
- [ ] 텔레그램 봇 3개가 §7.1 역할대로 동작
- [ ] n8n 129개 → `env:dead` 분류 완료, 활성 WF는 전부 태깅됨
- [ ] 본진 `/home/ubuntu` 루트 파일 10개 이하
- [ ] 금고 4TB HDD 마운트 + 첫 아카이브 성공
- [ ] pressco21/ 폴더 재편 완료, 모든 빌드·배포 통과
- [ ] `workspace/INFRA.md`·`workspace/PROJECTS.md` 신설
- [ ] PRD v2 §10 Phase 2.8 행 추가
- [ ] HARNESS.md v3.3 갱신
- [ ] 주간·월간 자가진단 WF 배포 + 첫 실행 성공
- [ ] 대표의 "ANU 완료" 선언

---

## 18. 부록 A — 텔레그램 봇·톡방 타겟 스테이트 (2026-04-14 실측 반영)

### A.0 구조 요약

**봇 5개 전부 유지** + **톡방 6개** (4개 재편 + 2개 신규 + 1개 불변) + **장지호 DM**

| 봇 | 톡방 | 역할 |
|---|-----|-----|
| B1 `@Pressco21_alert_bot` | D1 전용 DM | Claude Code 개발 알림 (완전 분리) |
| B2 `@Pressco21_makeshop_bot` | T2 + T3 + T5 | 팀 운영 알림 (중복 credential 통합) |
| B3 `@Pressco21_bot` | T1 | 장지호 개인 알림 (개인 DM 전용) |
| B4 `@pressco21_openclaw_bot` | T1 + T5 + T6 | Flora 양방향 대화 |
| B5 `@Pressco_Bank_bot` | T4 | 은행 알림 (재무 허브 씨앗) |

### A.1 B1 `@Pressco21_alert_bot` — Claude Code 개발 알림 전용

- **봇 ID**: 8759562724
- **토큰 위치**: `~/.claude/hooks/.env` 의 `CLAUDE_TELEGRAM_BOT_TOKEN`
- **n8n 연결**: 없음 (로컬 훅 `~/.claude/hooks/notify-telegram.sh` 전용)
- **수신 대상**: 장지호 DM 1명 (chat_id `7713811206`)
- **담당**: "workspace 완료", "빌드 성공", "파일 저장", "세션 종료" 등 Claude Code 세션/작업 알림
- **격리 이유**: 대표가 개발 진행 상황을 **능동적으로 수시 확인**하는 푸시. 다른 알림과 섞이면 시그널이 묻힘 (2026-04-14 대표 결정)
- **절대 금지**: 다른 WF·운영 알림 추가, 그룹 발송

### A.2 B2 `@Pressco21_makeshop_bot` — 팀 공용 운영 알림

- **봇 ID**: 8643940504
- **Display Name 변경**: `Pressco메이크샵봇` → **`Pressco21 운영`** (대표 승인 2026-04-14)
- **n8n credential**: **중복 통합 필수** — `RdFu3nsFuuO5NCff` 유지 + `eS5YwFGpbJht6uCB` 삭제
- **통합 후 담당 WF**: 122개 (기존 중복 합산)
- **수신 대상**: T2 운영실(Topic 3개) + T3 매출 공유 + T5 Claude 브릿지
- **담당 범주**:
  - FA 시리즈 (FA-001, FA-001b, FA-002, FA-003) — T2 🎓 강사·파트너 Topic
  - Flora 시리즈 일부 (팀 공유 가치 있는 것)
  - 주문·출고·재고 ([F9], STOCK-ALERT, OMX-NOTIFY, OM-ADAPTER) — T2 🛒 Topic
  - 매출 리포트 ([F22]~[F25]) — T3 매출 공유
  - PRD-SAVE — T5 Claude 브릿지
  - WF-CHURN-DETECT, [F11] 마감 알림 등
- **절대 금지**: 장지호 개인 DM 발송(→ B3 또는 B4), 양방향 대화, Telegram Trigger 노드

### A.3 B3 `@Pressco21_bot` — 장지호 개인 알림

- **봇 ID**: 8521920006
- **Display Name 변경**: `Pressco_bot` → **`Pressco21 개인`** (대표 승인 2026-04-14)
- **n8n credential**: `1` (Telegram Bot API)
- **담당 WF**: 17개 + Wave 2에서 INFRA 3개 추가 이전
- **수신 대상**: 장지호 DM 1명만 (chat_id `7713811206`) = T1
- **담당 범주**:
  - 정부지원사업 시리즈 (정부사업_*, GS-805, WF-GOV-TG-NOTIFY)
  - INFRA 시리즈 3개 (Wave 2에서 -5043778307 → 7713811206 재배선)
  - HR 시리즈 (HR-001/002, 대표 개인 확인용)
  - WF-BACKUP Backup Notify
  - 대표가 혼자 봐야 하는 민감 정보
- **절대 금지**: 그룹 발송, Telegram Trigger

### A.4 B4 `@pressco21_openclaw_bot` — Flora 양방향 대화

- **봇 ID**: 8672368507
- **n8n credential**: `O6qwF7Pup3u1Zc1O` (Flora-OpenClaw-Bot)
- **백엔드**: 플로라 서버 openclaw-gateway (PID 2593078)
- **담당 WF**: 10개 (n8n 경유) + openclaw-gateway 직접 통신 다수
- **수신 대상**: T1 장지호 DM + T5 Flora↔Claude + T6 Flora↔Codex + 향후 직원 DM (이재혁·다경·승해)
- **담당 범주**:
  - 자연어 대화 ("메모해줘", "/출근", "/일정")
  - 아침 브리핑(08:00), 점심 체크인(12:30), 저녁 리포트(18:00)
  - Claude Code 에이전트 응답 전달 → T5
  - Codex 실행 로그 전달 → T6

### A.5 B5 `@Pressco_Bank_bot` — 은행 알림 (재무 허브 씨앗)

- **봇 ID**: 8773710534
- **n8n credential**: `RQvOiScJ4KjbJcsS` (PRESSCO_BANK_BOT)
- **담당 WF**: 4개 (WF-CRM-01 입금자동반영, WF-CRM-02 Gmail 수집, WF-CRM-03 정합성 감사 등)
- **수신 대상**: T4 은행 알림 (chat_id `-5275298126`) 전용
- **ANU P1 변경 사항**: **없음 — 그대로 유지**
- **이유**: 향후 "PRESSCO21 재무 통합 허브" 프로젝트(종료 후 별도 PRD)의 Level 1 "운영 레벨" 역할. 상세: `memory/financial-hub-plan.md`

### A.6 톡방 구조 (6개 + 1 DM)

#### T1 — 장지호 DM (Flora 대화 + 개인 알림)

- **chat_id**: `7713811206`
- **수신 봇**: B3 (개인 알림) + B4 (Flora 대화)
- **담당**: Flora 양방향, 정부사업, INFRA 3개, HR, 개인 매출 요약
- **예상 일일 수신량**: 20~30건

#### D1 — Claude Code 개발 알림 DM (완전 분리)

- **chat_id**: `7713811206` (장지호 개인)
- **수신 봇**: B1 alert_bot 전용
- **담당**: 개발 진행 상황, 파일 저장, 빌드 결과
- **분리 이유**: 수시 확인 대상이라 타 알림과 섞이면 안 됨

#### T2 — PRESSCO21 운영실 (기존 `-5154731145` 확장)

- **현재 이름**: 프레스코21 → **변경 검토 중** (Topic 모드 켠 뒤 결정)
- **Topic 모드 ON, Topic 3개**:
  - 🚨 **긴급** — 전원 멘션, 특별 알림음, P0 이슈만
  - 🛒 **주문·출고·재고** — 이재혁 중심, [F9]·STOCK-ALERT·OMX 등
  - 🎓 **강사·파트너클래스** — FA 시리즈·마감 알림·WF-CHURN
- **멤버**: 장지호 + 이재혁 + 원장님 + B2
- **💰 입금·정산 Topic은 만들지 않음** — T4 은행 알림 그룹이 그 역할

#### T3 — PRESSCO21 매출 공유 (신규 생성)

- **chat_id**: 미정 (대표가 직접 생성 후 첫 메시지로 확인)
- **Topic**: 없음 (매출 리포트 단일 용도)
- **멤버**: 원장님 + 장지호 + 이재혁 + 장준혁 사장 + B2
- **담당 WF**: [F22] 일일 매출, [F23] 통합 매출, [F24] 리치 리포트, [F25] 주간/월간, (옵션) S3A-001 주간 비즈니스
- **이전 대상**: 현재 카카오톡으로 받는 4명 매출 리포트 → 텔레그램 이전

#### T4 — 은행 알림 (기존 `-5275298126`, 변경 없음)

- **멤버**: 원장님 + 장지호 + 이재혁 + B5
- **담당 WF**: WF-CRM-01/02/03
- **ANU P1 작업**: 없음 (유지 확인만)
- **향후 역할**: 재무 통합 허브 Level 1 "운영 레벨"

#### T5 — Flora ↔ Claude 브릿지 (기존 `-5043778307`, 이름 변경)

- **이름 변경**: `플로라 클로드 코드 개발실` → **`Flora ↔ Claude 브릿지`** (대표 승인)
- **멤버**: 장지호 + B2 + B3 + B4
- **담당**: Claude Code 기획안 저장, PRD-SAVE, Claude ↔ Flora AI-to-AI 협업 로그
- **Wave 3 작업**: **INFRA 3개 WF(아침 건강/WF 헬스/API 사용량) → T1으로 이전**. 남는 것: PRD-SAVE + 향후 Claude 작업 로그

#### T6 — Flora ↔ Codex 브릿지 (기존 `-5198284773`, 이름 변경)

- **이름 변경**: `플로라 코덱스 개발실` → **`Flora ↔ Codex 브릿지`** (대표 승인)
- **멤버**: 장지호 + B4 + openclaw-gateway 경유
- **담당**: Codex CLI 실행·응답·에러, E2E 테스트 결과
- **ANU P1 작업**: 이름 변경만, 기능 불변

---

## 19. 부록 B — 프로젝트 카탈로그 Before/After

### Before (2026-04-13)
워크스페이스 루트 14폴더, pressco21 하위 29폴더, 평면 구조

### After (2026-05-04 목표)

**워크스페이스 루트 (10 폴더로 축소)**
```
pressco21/           ← 메인, 내부 재편됨
korean-law-mcp/      ← 독립 유지
notion-cms/          ← 독립 유지
OMX(오_마이_코덱스)/    ← Codex 전용
pdp-maker-201/       ← 독립 유지 또는 archive (P2-5 판단)
archive/             ← 비활성 보관
output/              ← 세션 출력
personal/            ← 개인
INFRA.md             ← ★ 신설 SSOT
PROJECTS.md          ← ★ 신설 SSOT
CLAUDE.md, AI-OPERATIONS.md, AGENTS.md  ← 유지
```

**pressco21/ 하위 (재편)**
```
pressco21/
├── apps/
│   ├── mobile-app/
│   ├── mini-app-v2/
│   ├── offline-crm-v2/
│   └── flora-todo-mvp/
├── skins/
│   └── makeshop-skin/
├── legacy-skins/
│   ├── 메인페이지/ (수정 금지)
│   ├── 파트너클래스/ (수정 금지)
│   ├── 간편 구매/ (수정 금지)
│   ├── 브랜드스토리/ (수정 금지)
│   ├── 파트너맵/ (수정 금지)
│   └── 레지너스 화이트페이퍼/ (수정 금지)
├── automation/
│   ├── n8n-automation/
│   └── homepage-automation/
├── services/
│   ├── mcp-shrimp-task-manager/
│   └── ops/
├── docs/
│   └── ai-native-upgrade/    ← 이 프로젝트
├── company-knowledge/
├── tools/, scripts/, _tools/, tests/, tasks/, output/, shrimp_data/, archive/
└── (md) CLAUDE.md, AI_SYNC.md, HARNESS.md, OPS_STATE.md, ROADMAP.md, README.md, AGENTS.md, company-profile.md, company-staff-profiles.md, shrimp-rules.md
```

---

## 20. 부록 C — n8n 129개 분류의 상세 정책

### C.1 판정 기준
| 상태 | 기준 | 처리 |
|------|------|------|
| `env:prod criticality:P0` | 매일 1회 이상 실행 + 실패율 <1% + 사람/돈 영향 있음 | 이름 표준화, 문서화 |
| `env:prod criticality:P1` | 주 1회 이상 실행 + 비즈니스 중요 | 이름 표준화 |
| `env:prod criticality:P2` | 월 1회 이상 실행 | 유지 |
| `env:prod criticality:P3` | 유지 가치 있지만 비정기 | 유지 |
| `env:staging` | 플로라 n8n-staging에만 있어야 하는 테스트 | 본진에 있으면 플로라 이전 |
| `env:dead` 후보 | 30일 실행 0회 + trigger 없음 | **비활성화만**, 30일 후 삭제 |

### C.2 이름 표준 (2026-04-14 이후 신규 WF)
- 프리픽스 대괄호: `[DOMAIN]-NN` (대문자, 2글자 이상)
- 도메인 리스트 (ANU 종결 시점 기준):
  - `PARTNER` 파트너클래스 (WF-01~20 흡수)
  - `CRM` 고객관계 (WF-CRM-*, WF-CHURN-*)
  - `APP` 모바일 앱 백엔드
  - `OMX` 오픈마켓 통합 (메이크샵+스마트스토어)
  - `FLORA` Flora 업무 허브 ([F0]~[F26] 흡수)
  - `GOV` 정부지원사업
  - `INFRA` 시스템 모니터링
  - `HR` 근태
  - `FA` 강사 신청·등업
  - `BI` 비즈니스 인텔리전스 (S3A-*, RFM 등)
  - `YT` 유튜브
  - `BOT` 챗봇 (F050 계열)
  - `STOCK` 재고·품절
  - `LEGACY` 폐기 예정

### C.3 이름 변경 시 규칙
- **이름 변경은 P2-2에서 일괄 금지**. 태깅만 함
- 이름 변경은 **새 WF 생성 시**만 적용 (P3 이후)
- 기존 WF 이름 유지, 단 tag로만 분류

---

## 21. 부록 D — 참고 파일 (새 세션 READ-FIRST)

**우선순위 A (반드시 읽음)**:
1. `docs/ai-native-upgrade/METAPROMPT.md` ← 이 파일
2. `docs/ai-native-upgrade/P{최근}-*.md` (최근 산출물)
3. `AI_SYNC.md` Session Lock + Last Changes 최근 3건

**우선순위 B (진행 중 Phase에 따라)**:
4. `docs/PRD-하네스-종합고도화-v2.md` §10 실행 일정, §6 인프라, §3 업무 허브
5. `HARNESS.md` §1 컴포넌트 맵, §5 파일 인벤토리
6. `MEMORY.md` + `memory/ai-native-upgrade.md` (P3-3 이후)
7. `OPS_STATE.md`

**우선순위 C (참고)**:
8. `~/.claude/pressco21-infra.md` (글로벌)
9. `~/.claude/rules/agent-routing.md`, `rules/n8n-reference.md`
10. `pressco21/CLAUDE.md` (프로젝트 규칙)
11. `workspace/AI-OPERATIONS.md` (서버면 분리 원칙)
12. `workspace/CLAUDE.md`

**Phase 2.x에서만 참고**:
- `n8n-automation/_tools/deploy.sh` (n8n 배포)
- `_tools/git-hooks/*` (경로 수정 시)
- `company-profile.md`, `company-staff-profiles.md` (직원 정보)

---

## 22. 부록 E — 자주 쓸 명령어 모음

### 서버 접근
```bash
ssh oracle     # 본진 (운영)
ssh openclaw   # 플로라 (AI/테스트)
ssh minipc     # 금고 (백업)
```

### n8n 조작
```bash
# 전체 활성 WF 수
ssh oracle "docker exec n8n n8n list:workflow --active true" | wc -l

# 특정 WF 상세
ssh oracle "docker exec n8n n8n list:workflow" | grep -i "keyword"

# WF 비활성화 (신중)
ssh oracle "docker exec n8n n8n update:workflow --id <WF_ID> --active false"

# 백업
ssh oracle "docker exec n8n n8n export:workflow --backup --output=/tmp/backup/"
```

### 금고 디스크 (P2-3)
```bash
# 현재 상태
ssh minipc "lsblk"
ssh minipc "sudo blkid /dev/sdb2"

# Read-only 첫 탐색
ssh minipc "sudo mkdir -p /mnt/pressco21-hdd-check && sudo mount -o ro -t ntfs /dev/sdb2 /mnt/pressco21-hdd-check && ls /mnt/pressco21-hdd-check"

# 언마운트
ssh minipc "sudo umount /mnt/pressco21-hdd-check"

# 정식 마운트 (확인 후)
ssh minipc "sudo mkdir -p /mnt/pressco21-hdd && sudo mount -t ntfs-3g /dev/sdb2 /mnt/pressco21-hdd"
```

### 본진 /home 정리
```bash
ssh oracle "mkdir -p /home/ubuntu/archive/202604-cleanup"
ssh oracle "cd /home/ubuntu && mv *.json *.py *.sh archive/202604-cleanup/ 2>/dev/null; true"
ssh oracle "ls /home/ubuntu/"
```

### 텔레그램 테스트
```bash
# Flora 봇 (openclaw 쪽에서)
ssh openclaw "curl -s 'https://api.telegram.org/bot<TOKEN>/getMe'"

# 알림 봇 테스트 발송
curl -s "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>&text=[ANU P0] 테스트"
```

---

## 23. 변경 이력

| 날짜 | 버전 | 작성자 | 변경 |
|------|------|--------|------|
| 2026-04-13 | v1.0 | Claude Opus 4.6 | 최초 작성 — 2026-04-13 실측 기반 |

---

## 24. 마지막 지시 — 이 파일을 받은 Claude Code에게

이 파일을 읽은 네가 해야 할 첫 행동:

1. `§14 작업 시작 전 체크리스트`를 전부 돌려라
2. 막히면 즉시 대표에게 보고해라 — 혼자 해결 금지
3. 어느 Phase든 시작 전에 `AI_SYNC.md`에 Lock 걸어라
4. 각 Phase의 **완료 기준**을 만족하지 못하면 다음으로 넘어가지 마라
5. 위 제약 12조 (§4)는 **한 조도 위반하지 마라**
6. 이 파일의 `§3 현재 상태 스냅샷` 값이 실측과 달라지면 P0에서 수정하고 기록해라
7. 3주 안에 못 끝나면 일정 재협상해라 — 억지로 밀어붙이지 마라
8. 종료 시 `§17 완료 정의`를 대표 앞에서 체크리스트로 검증하고 선언해라

**이 프로젝트의 최종 의미**: PRESSCO21은 8명으로 11.6억 매출을 만드는 회사다. 대표 장지호는 마케팅·CS·기획·IT·재무·영업을 혼자 감당하고 있다. ANU가 끝나면 AI 에이전트들이 더 단단한 하부 구조 위에서 장지호의 부담을 대신 지게 된다. 이건 단순한 정리 작업이 아니다 — **AI가 회사의 실질 운영을 맡기 위한 마지막 기초 공사**다.

끝.
