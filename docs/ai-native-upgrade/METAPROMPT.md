<!-- AI-NATIVE-META | v2.0 | 2026-04-14 | Claude Opus 4.6 | 장지호 대표 지시 -->
# 메타프롬프트 — PRESSCO21 AI Native

> **이 파일의 존재 이유**: 다음 세션의 Claude Code가 이 한 파일만 읽고도 프로젝트를 정확히 이어서 시작할 수 있는 자기완결형 지시서.
> **프로젝트 이름**: **AI Native** (2026-04-14 대표 확정, 이전 코드네임 "ANU"는 폐기)
> **업계 용어 맥락**: AI-Native Transformation (AX) 계열. AgentOps · Agentic Workflow · HITL(Human-in-the-Loop)과 같은 범주.
> **폴더 경로**: `pressco21/docs/ai-native-upgrade/` (폴더명은 유지, 대화·보고는 "AI Native")
> **상위 PRD**: `pressco21/docs/PRD-하네스-종합고도화-v2.md` (이 프로젝트는 Phase 2.8로 정식 흡수 예정)
> **작성일**: 2026-04-13 (v1.0) → **2026-04-14 (v2.0 전면 재작성)**
> **기간 목표**: 2026-04-13 ~ 2026-05-04 (3주, 라이브 무중단)
> **소유자**: Claude Code (실행) + 장지호 대표 (승인)
> **예산**: 0원 (Oracle Free 한도 내, 추가 유료 SaaS 금지)
> **v1.0 원본**: `archive/METAPROMPT-v1.0.md` (초안 이력 보존, 운영 사용 금지)

---

## 0. TL;DR — 30초 요약

PRESSCO21(8명 회사)을 **AI 에이전트 25명이 보조하는 AI 네이티브 회사**로 전환하는 3주 프로젝트. 하네스 PRD v2의 Phase 0~2까지 완료됐으나 실제 운영에서 3가지 구조 문제가 드러났다.

1. **텔레그램 봇 카오스** — 실측 봇 **5개** + 그룹 **5개** + 장지호 DM, n8n credential **2개가 같은 봇(B2)을 가리키는 중복**이 근본 원인
2. **서버·프로젝트 부풀림** — 본진 n8n **142개 WF(활성 113)** 분류 불가, `/home/ubuntu` 루트 잔재, 금고 4TB HDD 미마운트, SSOT 5곳 파편화
3. **하네스 v2 정합성 불안** — 위 정리가 v2 로드맵(Phase 2.5 미니앱 → Phase 3 자율운영)과 충돌 없이 흡수되어야 함

**v2.0에서 달라진 점 (v1.0 대비)**
- ✅ 프로젝트 이름: **ANU → AI Native** (업계 용어 AI-Native Transformation 정렬)
- ✅ 실측 수치 전면 갱신: 봇 3개 → 5개, n8n WF 129 → **142(활성 113)**, 그룹 1개 → 5개
- ✅ 봇 구조 확정: 5개 유지 + credential 통합만 + alert_bot 완전 분리 + 은행 알림 보호(재무 허브 씨앗)
- ✅ **Wave 1 완료 + Wave 2 완료** 상태 §9에 명시 반영
- ✅ §7.1 텔레그램 봇 타겟 모델을 §19 부록 A 실측 기준으로 통합 (v1.0의 자체 모순 해소)
- ✅ §15.6 **문서 기반 작업 원칙** 신설 — 대화 요약만으로 작업 시작 금지
- ✅ Phase P1 상세는 `P1-telegram-bot-reorganization.md v2.1`로 정식 위임
- ✅ 1189줄 → ~700줄 축소 (중복 제거)

**단일 목적**: PRD v2 Phase 3(L5 자율운영) 진입 전에 하부 구조를 단단하게 만든다.

---

## 1. 프로젝트 정의

| 항목 | 값 |
|------|-----|
| 이름 | PRESSCO21 **AI Native** |
| 업계 범주 | AI-Native Transformation (AX) |
| 목적 | 텔레그램 봇·서버·프로젝트의 중복/오류/비효율 제거 + AI 네이티브 운영 리듬 정착 |
| 대상 시스템 | 본진(Oracle) · 플로라(Oracle) · 금고(미니PC) · 로컬 워크스페이스 · 텔레그램 봇 5개 · n8n 142개 WF · 에이전트·훅·스킬 하네스 |
| 비대상 | 신규 서비스 개발, 신규 매출원, 디자인 리뉴얼, 파트너클래스 E3 이후 로직, 모바일 앱 기능 추가 |
| 기간 | 3주 (2026-04-13 ~ 2026-05-04), 라이브 무중단 조건부 |
| 예산 | 0원 |
| 상위 PRD | `docs/PRD-하네스-종합고도화-v2.md` |
| 이 문서 | `docs/ai-native-upgrade/METAPROMPT.md` (v2.0) |

---

## 2. 왜 지금 하는가

### 2.1 외부 동력
- PRD v2 Phase 2 완료 → Phase 2.5 미니앱 진행 중 → **Phase 3 자율운영(L5) 진입 직전**
- 한 번 자율 트리거가 켜지면 지저분한 상태를 고치기가 훨씬 어렵다
- 지금이 "깊은 청소"를 할 수 있는 **마지막 여유 구간**

### 2.2 내부 동력
- 2026-04-13 인프라 실측에서 드러난 것:
  - 본진 n8n **142개 WF**(활성 113) — 공식 기록은 20여 개로 남아 있었음
  - 본진 `/home/ubuntu` 루트에 작업 잔재 11개 파일 + 중복 폴더 4개
  - 금고 4TB HDD 미마운트 — 백업 여력의 절반이 놀고 있음
  - SSOT 파편화 5곳 → "현재 상태"를 한눈에 파악 불가
- 2026-04-14 추가 실측: **봇 5개 + 그룹 5개** 확정, n8n credential 중복 2개 발견
- 대표 피드백: "텔레그램 봇이 너무 많아져서 목표·프로젝트별로 깔끔하게 안내·사용을 못한다"

### 2.3 전략적 의미
이 정리 후에야 PRD v2 §5(자율운영 프로토콜)의 "CFO 마진 경보 → CSO 에스컬레이션" 같은 에이전트 간 자율 체인이 **신뢰할 수 있는 데이터 위에서** 돈다. 지금 상태에서 자율 트리거를 켜면 113개 활성 WF 중 어떤 것이 진짜 운영용인지 모르는 채 AI가 판단하게 된다.

---

## 3. 현재 상태 스냅샷 (2026-04-14 실측 고정)

> 이 섹션은 **실측 시점 고정값**이다. 새 세션에서 이 파일을 읽을 때 일부 값이 달라져 있을 수 있으니, Phase P0에서 반드시 재검증한다.

### 3.1 서버 3대 실측 스펙

| 항목 | 본진 (운영) | 플로라 (AI/테스트) | 금고 (백업/파일) |
|------|------------|-------------------|------------------|
| 호스트명 | `pressco21-automation` | `openclaw` | `pressco21-backup` |
| 플랫폼 | Oracle Cloud Free ARM | Oracle Cloud Free ARM | 자체 미니PC (Intel N100) |
| CPU | aarch64 Neoverse-N1 **2코어** | aarch64 Neoverse-N1 **2코어** | x86_64 **4코어** |
| RAM | 11.65 GiB (≈12GB) | 11.65 GiB (≈12GB) | 15.6 GiB (≈16GB) |
| 메인 디스크 | `/dev/sda` 200GB, 29GB 사용 (15%) | `/dev/sda` 200GB, 24GB 사용 (12%) | `/dev/nvme0n1` **512GB**, 20GB (5%) |
| 외장 1 | — | — | `/dev/sda` **2TB SSD** (exfat, /mnt/pressco21-ssd, 394GB 22%) |
| 외장 2 | — | — | `/dev/sdb` **4TB HDD** NTFS ★미마운트★ |
| SSH alias | `ssh oracle` | `ssh openclaw` | `ssh minipc` |
| Tailscale IP | `100.122.49.15` | `100.114.150.34` | `100.76.25.105` |

### 3.2 본진 컨테이너 & n8n 실측 (2026-04-14)

**본진 4개 컨테이너, 전부 127.0.0.1 바인딩**
- `n8n` → `127.0.0.1:5678`, RAM ~380 MiB, **WF 142개 (활성 113 / 비활성 29)**
- `n8n-postgres` → 내부 5432, RAM ~162 MiB
- `nocodb` → `127.0.0.1:8080`, RAM ~379 MiB
- `minio` → `127.0.0.1:9000-9001`, RAM ~209 MiB

**텔레그램 사용 WF 집계**: 142개 중 **92개** (활성 67 / 비활성 25)

**플로라 (4 컨테이너 + openclaw-gateway)**
- `flora-todo-mvp` → `0.0.0.0:3001`, Next.js 15
- `n8n-staging` → `0.0.0.0:5679`, **활성 WF 0개** (Staging 전용, 깨끗)
- `flora-todo-mvp-postgres`, `n8n-staging-postgres` (내부)
- `openclaw-gateway` 프로세스 (PID ~2593078, 18789~18792 포트, Flora AI)

**금고 (3 컨테이너 + 시스템 서비스)**
- `pressco21-nextcloud-app/db/redis`, `filebrowser`(8090), `syncthing`(8384), `smbd`(LAN)
- `nextcloud-oracle-reverse-tunnel.service` — backup.pressco21.com 진짜 백엔드

### 3.3 Nginx 사이트 → 실제 서비스 매핑

**본진 Nginx (7 사이트)**
| 도메인 | upstream | 실제 서비스 |
|--------|----------|------------|
| `n8n.pressco21.com` | `127.0.0.1:5678` | n8n 운영 |
| `nocodb.pressco21.com` | `127.0.0.1:8080` | NocoDB |
| `minio.pressco21.com` | `127.0.0.1:9001` | MinIO 콘솔 |
| `img.pressco21.com` | `127.0.0.1:9000` | MinIO S3 API (CDN) |
| `crm.pressco21.com` | Python + n8n webhook | 오프라인 CRM |
| `hub.pressco21.com` | 정적 + n8n webhook | 정부지원사업 서류허브 |
| `backup.pressco21.com` | `127.0.0.1:18081` | 금고 Nextcloud (SSH 역터널) |

**플로라 Nginx (3 사이트)**
- `n8n-staging.pressco21.com` (Staging)
- `mini.pressco21.com` (텔레그램 미니앱 v3.1, Phase 2.5 산출물)
- default (빈 페이지)

### 3.4 텔레그램 봇·톡방 실측 (2026-04-14 n8n 전수 덤프 + getMe/getChat)

> **이 섹션이 v1.0 대비 가장 큰 변경**. v1.0의 "봇 3개" 가정은 완전 오류였고, 실측 결과 봇 5개 + 그룹 5개였다.

#### 봇 5개 (Telegram getMe 확정)

| # | 봇 ID | @username | n8n credential | WF 수 | 용도 |
|---|------|----------|---------------|------|------|
| B1 | 8759562724 | `@Pressco21_alert_bot` | 없음 (로컬 훅) | 0 | Claude Code 개발 알림 전용 — **완전 분리 유지** |
| B2 | 8643940504 | `@Pressco21_makeshop_bot` | `RdFu3nsFuuO5NCff`(47) + `eS5YwFGpbJht6uCB`(75) **[중복!]** | **122** | 팀 운영 — FA·Flora·매출·재고·INFRA |
| B3 | 8521920006 | `@Pressco21_bot` | `1` (Telegram Bot API) | 17 | 장지호 개인 알림 전용 |
| B4 | 8672368507 | `@pressco21_openclaw_bot` | `O6qwF7Pup3u1Zc1O` | 10+ | Flora 양방향 대화 (openclaw-gateway 경유) |
| B5 | 8773710534 | `@Pressco_Bank_bot` | `RQvOiScJ4KjbJcsS` | 4 | 은행 알림 전용 — **유지 (재무 허브 씨앗)** |

#### 그룹·DM 5개 + 1 (getChat 확정)

| chat_id | 이름 | 멤버 | 현재 용도 |
|---------|-----|-----|----------|
| `7713811206` | 장지호 개인 DM | 1명 | 대부분 WF 수신 |
| `-5154731145` | 프레스코21 → T2 운영실 | 장지호 + 원장님(2026-04-14 초대) + 봇 2개 | FA 시리즈, 마감 알림 → Topic 모드 예정 |
| `-5275298126` | 은행 알림 | 원장님 + 장지호 + 이재혁 + B5 | 농협 입금 — **변경 없음 (재무 허브 씨앗)** |
| `-5043778307` | 플로라 클로드 코드 개발실 → T5 Flora↔Claude | 장지호 + 봇 3개 | PRD-SAVE 유지 (INFRA 3개는 Wave 2에서 이전됨) |
| `-5198284773` | 플로라 코덱스 개발실 → T6 Flora↔Codex | 장지호 + 봇 2개 | Codex 실행 로그 |
| **`-5251214343`** | **PRESSCO21 매출 공유** ⭐ 2026-04-14 신규 | 장지호 + 원장님 + 이재혁 + B2 + Flora봇 (사장님 대기) | 매출 리포트 전용 (Wave 3에서 재배선) |

#### ⭐ 핵심 발견 4가지

1. **n8n credential 중복 등록** — `RdFu3nsFuuO5NCff`(47 WF) + `eS5YwFGpbJht6uCB`(75 WF)는 **같은 봇 B2(8643940504)** 를 가리킨다. B2 혼자 **122개 WF**를 떠안고 있는데 n8n UI에서 두 개로 보이는 게 "봇이 뭘 하는지 모르겠다"의 근본 원인. **Wave 3에서 `eS5Y...` 삭제 + 75개 WF 참조를 `RdFu...`로 통합 예정**.

2. **INFRA 오배선 수정 완료 (Wave 2)** — INFRA 3개 WF(`DSIqF4w42WNUghWs` 아침 건강, `0OFtnB5b4XmT8uqL` WF 헬스, `OnHX4w8xTBDgnTUK` API 비용)가 Flora 개발실 그룹으로 발송 중이었음. **2026-04-14 Wave 2에서 credential `RdFu` → `1`(B3), chat_id `-5043778307` → `7713811206` 재배선 완료**. Sanity check 메시지 수신 검증 통과. 24시간 관찰 중(실제 cron 08시 수신 확인 대기).

3. **B1 alert_bot 완전 분리 유지** — 대표 결정 2026-04-14: Claude Code 개발 알림은 대표가 능동 확인하는 고빈도 푸시. 다른 알림과 섞이면 시그널이 묻힘. 별도 DM 유지.

4. **은행 알림 그룹 불변 보호** — 향후 "PRESSCO21 재무 통합 허브" 프로젝트(AI Native 종료 후 별도 PRD)의 Level 1 "운영 레벨" 씨앗. 상세: `~/.claude/projects/-Users-jangjiho-workspace/memory/financial-hub-plan.md`.

#### 확보된 텔레그램 User ID (Wave 1)

| 이름 | ID | 언어 | 용도 |
|------|-----|-----|-----|
| 장지호 대표 | `7713811206` | ko | B3 DM 수신, HR-001 파일럿 |
| 원장님 이진선 (Jinsun Lee) | `8606163783` | ko | HR-001 파일럿 후보 |
| 이재혁 과장 | 미확보 | — | Wave 3 착수 전 확보 필요 |
| 장다경·조승해 | 미확보 | — | 직원 배분 자동화 |
| 장준혁 사장 | 미확보 | — | 텔레그램 앱 설치 대기 |

#### B3 웹훅 충돌 해결 (2026-04-14 완료)
- B3 `@Pressco21_bot`의 웹훅 `govt-support-hub-webhook/webhook`을 `deleteWebhook`으로 삭제 완료
- B2 `@Pressco21_makeshop_bot`이 해당 웹훅의 단독 소유자로 정리됨 (정부사업 허브 `HxskyYvTbFvRzgaa` + FA-001b 콜백 Trigger)
- MEMORY의 "3개 Trigger WF 충돌 블로커" 근본 치료 완료

### 3.5 n8n 142개 WF 분포 (샘플 네이밍)

P2-2에서 전수 분류 필요. 식별된 카테고리:

| prefix | 대략 수 | 용도 |
|--------|--------|-----|
| `WF-*` | 30~40 | 파트너클래스·CRM·리뷰 핵심 API |
| `[F0]~[F26]` / `Flora-*` | 25~30 | Flora 업무 허브 |
| `FA-*` | 5~6 | 강사 신청·등업 |
| `정부지원사업_*` / `GS-*` | 7~8 | 정부사업 자동화 |
| `INFRA *` | 3~5 | 모니터링 |
| `[APP] *` | 4 | 모바일 앱 백엔드 |
| `[OM-*]` / `[OMX-*]` | 5~7 | 오픈마켓 통합 |
| `WF-YT-*` | 5 | 유튜브 |
| `HR-*` | 2 | 근태 |
| `F050*` | 3 | AI 챗봇 |
| `S3A-*` | 2 | BI |
| `WF-CHURN-*` | 2 | 이탈 감지 |
| 기타·레거시 | 10~15 | 혼재 |

### 3.6 로컬 워크스페이스 & 문서 파편화

- 워크스페이스 루트 14폴더, pressco21/ 하위 29폴더 (평면 구조)
- **SSOT 후보 5곳**: `pressco21-infra.md`, `HARNESS.md`, `OPS_STATE.md`, `AI_SYNC.md`, `MEMORY.md`
- 문제: 새 세션이 "현재 상태"를 알려면 위 5곳 + 서버 3대 + `/home/ubuntu/scripts/` 주석까지 읽어야 함
- 목표 (Phase P2-6): 2곳(`workspace/INFRA.md`, `workspace/PROJECTS.md`)으로 통합

### 3.7 Claude 하네스 (~/.claude/)

- 전역 에이전트 **25개** (PRD v2 목표 28개와 차이 3개)
- 전역 스킬 7개, 훅 5개, 룰 2개
- `CLAUDE.md` 80줄, `pressco21-infra.md` 5KB

---

## 4. 제약 & 원칙 (절대 원칙 16조)

1. **비용 0원**: 유료 SaaS 추가 금지. Oracle Free 두 계정 + 미니PC + 텔레그램 + n8n + NocoDB + MinIO 한도 내에서만 해결
2. **라이브 무중단**: 운영 n8n·쇼핑몰·메이크샵·파트너클래스·CRM 절대 중단 없음. 모든 위험 작업은 **Staging(`n8n-staging.pressco21.com`) 먼저 → 검증 → 운영**
3. **메이크샵 `${var}` 이스케이프**: 템플릿 리터럴은 **반드시** `\${var}`로. 편집기 저장 실패의 근원. `makeshop-edit-guard.sh` 훅이 감지
4. **가상 태그 보존**: `<!--/user_id/-->`, `{$치환코드}` 등 메이크샵 서버사이드 태그 절대 삭제·수정 금지
5. **CSS 스코핑**: 컨테이너 ID/class로 범위 제한 필수 (기존 상점 스타일 충돌 방지)
6. **IIFE 격리**: JS 전역 오염 방지, 즉시실행함수 패턴
7. **SSH는 SSOT 위반**: 서버 직접 편집 금지. 항상 로컬 정본 → `deploy.sh` → 서버 반영
8. **git 안전**: `--no-verify`, `--force`, `reset --hard`, 브랜치 강제 삭제 금지 (사용자가 명시 요청할 때만)
9. **금전 관련**: 어떤 가격·정산·세금 결정도 **CFO 에이전트를 반드시 경유**
10. **2인 체제 존중**: Claude Code(주도) + Codex CLI(보조/독립). 같은 서브디렉터리 동시 WRITE 금지. `AI_SYNC.md` 먼저 확인
11. **금고 HDD 데이터 존중**: 4TB HDD NTFS 안에 기존 데이터가 있을 수 있음. 마운트 전 **read-only 먼저** 확인
12. **n8n WF 비활성화 ≠ 삭제**: 142개 중 "죽은 것"도 우선 **비활성화**만. 30일 관찰 후 삭제
13. **텔레그램 봇 토큰 고정**: 현재 5개 봇 토큰 절대 폐기 금지. 역할만 재정의. 신규 봇 추가 금지
14. **은행 알림 그룹 불가침**: chat_id `-5275298126`, `@Pressco_Bank_bot`, WF-CRM-01/02/03 전부 AI Native 작업 중 건드리지 않음 (재무 허브 씨앗)
15. **alert_bot 완전 격리**: 다른 봇 알림이 B1 `@Pressco21_alert_bot`으로 합쳐지면 안 됨
16. **문서 기반 작업 원칙 (v2.0 신설)**: 작업 시작 전 이 METAPROMPT + 관련 Wave 실행 지침을 반드시 **Read**한다. 대화 요약(compact summary)만 보고 실행 금지 (§15.6 참조)

---

## 5. 해결 대상 3가지 문제

### 문제 P — 텔레그램 봇 카오스
**실측 증상**: 봇 **5개**가 역할 혼재. n8n credential 중복 2개(같은 봇 B2를 가리킴)로 UI상 6개처럼 보임. INFRA 3개 WF 오배선(Flora 개발실로 발송 — Wave 2에서 수정 완료). B3 Trigger WF 충돌은 2026-04-14 `deleteWebhook`으로 해결됨.
**근본 원인**: 초기에 봇 역할 분리 설계 없이 필요할 때마다 즉흥 추가, credential 이름 관리 부재
**목표**: 봇 5개 유지 + credential 통합 + Topic 모드 + 톡방 재배선 (§7.1)

### 문제 S — 서버·프로젝트 부풀림
**증상**:
- n8n 142개 WF(활성 113) 중 운영 필수·실험·죽은 것 구분 불가
- 본진 `/home/ubuntu` 루트 잔재 11개 + 중복 폴더 4개
- pressco21/ 하위 29폴더 평면 구조
- 금고 4TB HDD 미마운트 (백업 여력 50%+ 놀음)
- SSOT 파편화 5곳
**근본 원인**: 빠른 개발 + 실측과 기록의 괴리
**목표**: 엔터프라이즈급 정렬 (§7.2, §7.3)

### 문제 C — 하네스 v2 정합성 불안
**증상**: PRD v2 Phase 2까지 완료, P·S를 건드리면 Phase 2.5/3와 충돌 가능성
**근본 원인**: PRD v2 작성(2026-04-04) 이후 실측 업데이트 없음
**목표**: §6 충돌 방지 매핑 + PRD v2 로드맵에 "Phase 2.8: AI Native" 흡수

---

## 6. PRD v2 충돌 방지 매핑

**원칙**: PRD v2가 "무엇을 할지"를 정한다. AI Native는 "어떻게 구체적으로 할지 + 누락된 것"을 채운다. 중복 시 PRD v2 전략 우선, 실행 상세는 AI Native 우선.

| PRD v2 섹션 | AI Native 대응 | 관계 |
|------------|---------------|------|
| §2 에이전트 조직도 (28개) | — | **그대로 수용**. 에이전트 재설계 안 함 |
| §3.1~3.5 Flora 업무 허브 | P1 | **보완**. Flora가 유일한 사람↔시스템 인터페이스임을 구조로 고정 |
| §3.6 텔레그램+카톡 메신저 | P1 | **실행 상세**. PRD가 "텔레그램 쓴다" 결정 → AI Native가 "봇 5개 어떤 역할" 구체화 |
| §3.6.1 텔레그램 미니앱 | — | **그대로 수용**. Phase 2.5 범위 |
| §5 자율운영 L5 프로토콜 | — | **선행 조건 제공**. P2의 n8n 분류가 끝나야 자율 트리거가 신뢰 데이터 위에서 돎 |
| §6 인프라 정리 (hwpx 삭제, flora-todo 이전 등) | P2 | **부분 완료 + 확장**. 4TB HDD + /home 정리 추가 |
| §7 기초 체력 (CLAUDE.md 80줄) | — | **유지**. 완료된 것 재작업 안 함 |
| §8 MakeShop SDK | — | **범위 밖** |
| §10 실행 일정 | **AI Native = Phase 2.8** | **흡수**. P3-1에서 PRD v2 §10에 "Phase 2.8" 행 추가 |

**충돌 경보**: 아래 상황 발생 시 **즉시 멈추고 대표 확인**
- 에이전트 조직도 변경 필요
- PRD v2 §5 자율 트리거 조건 수정 필요
- 3계층 CLAUDE.md 중 하나라도 80줄 초과 변경
- 본진 cron 9개 중 삭제·변경 필요

---

## 7. 목표 아키텍처 (2026-05-04 기준)

### 7.1 텔레그램 봇·톡방 타겟 (§19 부록 A와 일치, 실측 기반)

**봇 5개 전부 유지** (초기 "봇 3개 축소" 계획은 2026-04-14 실측 후 철회)

```
B1 @Pressco21_alert_bot          ━━━━━━━━━━━━━━━━━━━━━━━━━━
                                   Claude Code 개발 알림 전용
                                   수신: D1 장지호 DM (완전 분리)
                                   n8n 미사용, 로컬 훅(`~/.claude/hooks/notify-telegram.sh`)

B2 @Pressco21_makeshop_bot       ━━━━━━━━━━━━━━━━━━━━━━━━━━
                                   ★ Display Name "Pressco21 운영" (Wave 3 예정)
                                   credential 통합 (eS5Y 삭제, RdFu 유지)
                                   담당 WF: 122개 (통합 후)
                                   수신: T2 운영실(3 Topic) + T3 매출 + T5 Claude 브릿지

B3 @Pressco21_bot                ━━━━━━━━━━━━━━━━━━━━━━━━━━
                                   ★ Display Name "Pressco21 개인" ✅ 2026-04-14 변경 완료
                                   장지호 개인 DM 전용
                                   담당 WF: 17개 + INFRA 3개 (Wave 2 이관 완료)
                                   수신: T1 장지호 DM만

B4 @pressco21_openclaw_bot       ━━━━━━━━━━━━━━━━━━━━━━━━━━
                                   Flora 양방향 대화
                                   수신: T1 + T5 + T6 + (향후 직원 DM)
                                   담당: 브리핑·체크인·메모·자연어 응답

B5 @Pressco_Bank_bot             ━━━━━━━━━━━━━━━━━━━━━━━━━━
                                   은행 알림 (재무 허브 씨앗)
                                   수신: T4 은행 알림 그룹만
                                   AI Native P1 변경 없음
```

**톡방 6개 + 1 DM** (4개 재편 + 2개 신규 + 1개 불변)

```
T1 👤 장지호 개인 DM (7713811206)
    ├─ B4 Flora 대화 (메모, 브리핑, 체크인)
    └─ B3 개인 알림 (정부사업, INFRA 3개 ← Wave 2 완료, HR, 개인 매출)

D1 👨‍💻 장지호 ↔ B1 alert_bot DM
    └─ Claude Code 개발 알림만 (완전 분리)

T2 🏢 PRESSCO21 운영실 (기존 -5154731145 확장, Wave 3)
    멤버: 장지호 + 이재혁 + 원장님 + B2
    Topic 모드 ON, Topic 3개:
    ├─ 🚨 긴급 (P0 이슈)
    ├─ 🛒 주문·출고·재고
    └─ 🎓 강사·파트너

T3 💼 PRESSCO21 매출 공유 (-5251214343, 2026-04-14 생성 완료)
    멤버: 원장님 + 장지호 + 이재혁 + 장준혁 사장(대기) + B2 + Flora봇
    Wave 3에서 매출 WF 4~5개 재배선

T4 🏦 은행 알림 (-5275298126, 변경 없음)
    멤버: 원장님 + 장지호 + 이재혁 + B5
    재무 허브 v1 씨앗

T5 🌸 Flora ↔ Claude 브릿지 (-5043778307, 이름 변경 Wave 3)
    INFRA 3개 제거 완료 (Wave 2)
    남는 것: PRD-SAVE + Claude 작업 로그

T6 🤖 Flora ↔ Codex 브릿지 (-5198284773, 이름 변경 Wave 3)
    기능 유지
```

**규칙**:
- Flora 봇(B4)은 장지호·직원과 **자연어 대화만** 처리. n8n WF 알림 목적으로 쓰지 않음
- B3 `Pressco21_bot`은 **일방향 알림만**. Trigger 역할 금지 (어제 웹훅 삭제로 이미 정리됨)
- B2 `Pressco21_makeshop_bot`은 팀 운영 알림 + FA + 매출 + 재고 + INFRA(단 INFRA는 B3로 이관됨). 개인 DM 발송 금지
- 신규 봇 추가 금지. 기능 추가 시 위 5개 중 하나에 배치
- 각 봇의 Credential ID·담당 WF는 `pressco21-infra.md`에 단일 표로 기록 (P3-4)

### 7.2 서버 역할 정식 명문화

```
본진 (oracle, 158.180.77.201) = 운영면 [고정]
  책임: 공개 도메인, n8n 운영, NocoDB, MinIO, CRM 백엔드
  금지: 실험·테스트·임시·개인 도구
  한도: 디스크 150GB(여유 50GB), RAM 경보 80%/긴급 90%

플로라 (openclaw, 158.179.193.173) = AI·테스트면 [고정]
  책임: Flora AI, n8n-staging, flora-todo-mvp, 미니앱, 자동화 실험
  금지: 공개 서비스 운영 (mini.pressco21.com은 예외)
  한도: 디스크 150GB, RAM 경보 80%

금고 (minipc, LAN+Tailscale) = 백업·장기보관면 [고정]
  책임: Nextcloud, Syncthing, Samba(LAN), 파일보관, 백업 수신
  금지: 공개 서비스 직접 노출 (본진 SSH 역터널 경유만 허용)
  외장 디스크 정책:
    - 2TB SSD: 운영 중 자료 (design/classes/PRIVATE)
    - 4TB HDD: P2-3에서 마운트 + 장기 아카이브 전용으로 편입
    - 512GB NVMe: OS + Nextcloud DB + bind-mount 뷰
```

### 7.3 프로젝트 트리 타겟 (Wave 1만 실행 결정)

> **중요 결정 (2026-04-14 CTO·PM·makeshop-expert 팀미팅)**: 폴더 재편은 **Wave 1만 AI Native 범위**, Wave 2·3은 별도 스프린트로 연기
> **이유**: `makeshop-skin/_sync/` 6개 스크립트에 경로 하드코딩 있어 운영 사고 리스크 높음
> **대안**: `workspace/PROJECTS.md`를 SSOT로, 폴더는 평면 유지

**Wave 1 (AI Native P2-4 범위)**: `legacy-skins/` 신설 + 구 스킨 6개 이동 (0.5일)

```
pressco21/
├── legacy-skins/   ← ★ 신설: 참조 전용 (수정 금지)
│   ├── 메인페이지/
│   ├── 파트너클래스/
│   ├── 간편 구매/
│   ├── 브랜드스토리/
│   ├── 파트너맵/
│   └── 레지너스 화이트페이퍼/
└── (나머지는 현행 유지)
```

**Wave 2·3 (별도 스프린트로 연기)**: `apps/`, `skins/`, `automation/`, `services/` 그룹 재편은 메이크샵 스크립트 영향 분석 후 추진

### 7.4 n8n 142개 목표 분류 체계

**네이밍 표준** (2026-04-14 이후 신규 WF)
```
[DOMAIN]-NN 기능명 vN
예: [PARTNER]-01, [CRM]-03, [GOV]-01, [FLORA]-03, [INFRA]-01,
    [APP]-02, [OMX]-01, [HR]-01, [FA]-01, [BI]-01, [LEGACY]-XX
```

**태그 체계** (P2-2에서 일괄 적용)
- `env:prod / staging / dead`
- `owner:claude / codex / flora`
- `criticality:P0 / P1 / P2 / P3`
- `trigger:webhook / cron / manual / error-handler`

**생명주기**
- `active + env:prod` = 운영 필수
- `active + env:staging` = 테스트 중 (플로라 이전 검토)
- `inactive + env:dead` = 폐기 대기 (30일 후 삭제)

**도메인 리스트**: `PARTNER`, `CRM`, `APP`, `OMX`, `FLORA`, `GOV`, `INFRA`, `HR`, `FA`, `BI`, `YT`, `BOT`, `STOCK`, `LEGACY`

**이름 변경 규칙**: P2-2에서는 태깅만 함. 이름 변경은 신규 WF 생성 시(P3 이후)부터 적용. 기존 WF 이름 유지 + tag로만 분류.

---

## 8. Phase 구조 (P0~P4, 12.5 영업일)

| Phase | 기간 | 목적 |
|------|------|-----|
| **P0** 진단 & 고정 | 0.5일 | 베이스라인 실측 + AI_SYNC Lock |
| **P1** 텔레그램 봇 정리 | 3일 | 봇 5개 역할 명확화, credential 통합, Topic 모드, 재배선 |
| **P2** 인프라 클린업 | 5일 | n8n 142 분류, /home 정리, 4TB HDD, legacy-skins 신설 |
| **P3** 하네스 흡수 | 2일 | PRD v2 §10에 Phase 2.8 추가, HARNESS v3.3, 문서 통합 |
| **P4** 운영 리듬 정착 | 2일 | 주간·월간 자가진단 자동화, env:dead 관찰 종료 |

**합계**: 12.5 영업일 (약 3주, 라이브 무중단 조건)

---

## 9. ★ 진행 상태 (2026-04-14 기준) — v2.0 신설

| Phase | 단계 | 상태 | 완료일 | 비고 |
|------|------|------|--------|-----|
| P0 | 진단·고정 | **대기** | — | v2.0 재작성 완료와 동시에 P0.1 재실측 처리 가능 |
| **P1 Wave 1** | 준비 & 인벤토리 | ✅ **완료** | 2026-04-14 | n8n 전수 덤프(142개), 봇 5개·그룹 5개 실측, T3 `-5251214343` 생성, 원장님 `8606163783` 확보, B3 웹훅 삭제, 이름 `Pressco21 개인` 변경 |
| **P1 Wave 2** | B3 개인 알림 확장 | ✅ **완료** | 2026-04-14 | INFRA 3개 WF (`DSIqF4w42WNUghWs`, `0OFtnB5b4XmT8uqL`, `OnHX4w8xTBDgnTUK`) credential `RdFu→1(B3)`, chat_id `-5043778307→7713811206` 재배선. Sanity check 발송 검증 통과. **24시간 관찰 중** (내일 08시 아침 건강 리포트 수신 대기) |
| P1 Wave 3 | B2 통합 + T2 Topic + T3·T5·T6 재배선 | **준비 중** | — | 75개 WF credential 치환 (⭐ 최대 기술 작업), Topic 3개 생성, 매출 WF 4~5개 재배선, T5·T6 이름 변경 |
| P1 Wave 4 | 문서화·72시간 관찰·완료 | 대기 | — | `pressco21-infra.md`, `HARNESS.md`, `MEMORY.md` 갱신 |
| P2 | 인프라 클린업 | 대기 | — | P1 완료 후 착수 |
| P3 | 하네스 흡수 | 대기 | — | |
| P4 | 운영 리듬 | 대기 | — | |

**블로커 (현재)**
- 이재혁 과장 텔레그램 User ID 미확보 (Wave 3 진행 전 필요)
- 장준혁 사장님 텔레그램 앱 설치 대기 (Wave 4까지 여유)

**Wave 2 24시간 관찰 체크포인트 (2026-04-15 08:00)**
- [ ] `INFRA: 아침 시스템 건강 리포트` cron 발송 → B3 DM 수신 확인
- [ ] Flora 개발실 그룹(`-5043778307`)에 INFRA 알림 미수신 확인
- [ ] 이상 없으면 Wave 3 착수 가능

---

## 10. Phase P0 — 진단 & 고정 (상세)

### P0.1 재실측 — §3 값 검증
- `ssh oracle`, `ssh openclaw`, `ssh minipc` 각각 접속 가능 확인
- `docker ps` 각 서버 → §3.2 값과 비교
- 본진: `docker exec n8n n8n list:workflow --active true | wc -l` → **113 ±5** 허용
- 금고: `lsblk` → `/dev/sdb` 4TB HDD 존재·미마운트 확인
- Nginx 사이트 개수 일치 확인

**산출물**: `docs/ai-native-upgrade/P0-baseline-{YYYYMMDD}.md`

### P0.2 AI_SYNC Lock 선언
- `AI_SYNC.md` Session Lock 블록 갱신: Owner=Claude Code, Mode=WRITE, Working Scope=`docs/ai-native-upgrade/**`

### P0.3 텔레그램 봇 토큰 존재 확인
- `~/.claude/hooks/.env`(B1) + `pressco21/.secrets.env`(B5) + n8n credential(B2~B4) 존재 확인
- 각 봇 `getMe` 응답 확인 (5개 전부)

### P0.4 PRD v2 로드맵 위치 재확인
- `docs/PRD-하네스-종합고도화-v2.md` §10 실행 일정과 현재 완료 상태 대조
- PRD v2 Phase 2 완료, Phase 2.5 진행 중 확인

### P0 완료 기준
- [ ] `P0-baseline-*.md` 파일 생성
- [ ] `AI_SYNC.md` Session Lock 갱신
- [ ] 5개 봇 전부 `getMe` 응답
- [ ] §3 스냅샷 오차 ±5% 이내
- [ ] 대표에게 P0 완료 + 다음 단계 착수 동의 요청

---

## 11. Phase P1 — 텔레그램 봇 정리 (위임)

**P1 전체 실행 지침은 별도 문서로 위임**:
- **정본**: `docs/ai-native-upgrade/P1-telegram-bot-reorganization.md v2.1`
- **실측 매핑**: `docs/ai-native-upgrade/P1-bot-wf-matrix.md v1.2`

P1은 4 Wave 구조:
- **Wave 1** — 준비 & 인벤토리 (0.5일) ✅ **완료 (2026-04-14)**
- **Wave 2** — B3 확장 + INFRA 재배선 (0.5일) ✅ **완료 (2026-04-14)**
- **Wave 3** — B2 credential 통합 + T2 Topic + T3·T5·T6 재배선 (1.5일) ← **다음**
- **Wave 4** — 문서화 + 72시간 관찰 + 완료 선언 (0.5일)

### P1 완료 기준
- [ ] 봇 5개 전부 역할 명확화 (B1 분리, B2 운영, B3 개인, B4 대화, B5 은행)
- [ ] B2 credential 중복 제거 (`eS5Y` 삭제, 75개 WF 참조 일괄 치환)
- [ ] T2 운영실 Topic 3개 생성 + 재배선 (🚨/🛒/🎓)
- [ ] T3 매출 공유 그룹 재배선 완료 ([F22]~[F25])
- [ ] INFRA 3개 WF 장지호 DM 수신 검증 (Wave 2 완료 상태 유지)
- [ ] T5·T6 이름 변경 (`Flora ↔ Claude/Codex 브릿지`)
- [ ] `pressco21-infra.md` 텔레그램 섹션 현행화
- [ ] 대표가 체감 테스트 통과 ("어느 봇이 뭘 담당하는지 3초 내 답변")

---

## 12. Phase P2 — 인프라 클린업 (상세)

### P2-1 본진 `/home/ubuntu` 정리 (0.5일)
- 루트 파일 11개 → `/home/ubuntu/archive/202604-cleanup/` 이동
- 중복 폴더 정리 (`flora-n8n-backup-*`, `n8n-delete-backups/`, `workflows/` vs `pressco21-workflows/` 등)
- 디스크 사용량 29GB → 최소 2GB 감소 목표

### P2-2 n8n 142개 WF 전수 분류 (2일) — **max effort**
- `docker exec n8n n8n list:workflow` + n8n API로 메타데이터 수집
- 각 WF를 §7.4 분류 체계로 태깅 (`env/owner/criticality/trigger`)
- 30일 실행 0회 + Trigger 없음 → `env:dead` 후보, **비활성화만** (삭제 금지)
- **산출물**: `P2-n8n-full-inventory.md` + `P2-n8n-classification.md`

### P2-3 금고 4TB HDD 마운트 (0.5일)
1. **Read-only 먼저** 마운트하여 기존 데이터 확인
2. 기존 데이터 있으면 대표 확인
3. 비어있으면 `ntfs-3g` rw 마운트 + `/etc/fstab` 등재 (UUID, nofail)
4. MinIO 백업 목적지 변경 + Nextcloud 장기보관 바인드 마운트

### P2-4 legacy-skins/ 신설 (0.5일) — Wave 1만
- `legacy-skins/` 폴더 신설 + 구 스킨 6개 `git mv`
- 하드코딩 경로 영향 없음 (legacy는 수정 금지 선언된 상태)
- Wave 2·3은 별도 스프린트로 연기 (§7.3 참조)

### P2-5 workspace 루트 정리 (0.5일)
- `tmp/`, `_recovery_test/`, `codex/`(빈 npm), `tax-automation/` → `archive/202604-cleanup/`
- `블로그자동화/` → `archive/`
- `직원-온보딩-*.md` 4개 → `pressco21/docs/onboarding/`

### P2-6 SSOT 통합 — `workspace/INFRA.md` + `workspace/PROJECTS.md` 신설 (1일)
**목적**: 새 세션이 **2개 파일만 읽으면** 전체 상태 파악

**`INFRA.md` 내용**:
- 서버 3대 실측 스펙 (§3.1) + 주기적 갱신
- 각 서버의 컨테이너·nginx·cron·외장 디스크 현황
- 도메인 → 서비스 매핑 전체
- 텔레그램 봇 5개 역할 (P1 결과)
- 장애 복구 순서 (auto-heal.sh 전후)

**`PROJECTS.md` 내용**:
- 워크스페이스 루트 14폴더 + 각 폴더 1줄 설명 + 상태
- `pressco21/` 하위 구조 + 각 그룹 역할
- 각 프로젝트의 기술 스택 + 시작 명령 + 배포 경로 + 담당 에이전트
- 개발 중 vs 운영 정본 vs 참조 전용 vs 아카이브 구분

**기존 5개 SSOT와의 관계**:
- `pressco21-infra.md`: 인프라 상세 레퍼런스 유지, `INFRA.md`가 "요약 + 최신화"
- `HARNESS.md`: 거버넌스 문서 유지
- `OPS_STATE.md`: 장기 운영 사실만 남김 (중복 제거)
- `AI_SYNC.md`: 운영 보드 유지
- `MEMORY.md`: 세션 메모리 유지

### P2 완료 기준
- [ ] 본진 `/home/ubuntu` 루트 파일 10개 이하
- [ ] n8n 142개 전부 태깅, `env:dead` 후보 리스트 확정
- [ ] 4TB HDD 마운트 + 첫 백업 파일 기록
- [ ] `legacy-skins/` 신설 완료 + 빌드·테스트 통과
- [ ] workspace 루트 정리
- [ ] `INFRA.md`·`PROJECTS.md` 생성

---

## 13. Phase P3 — 하네스 흡수 (상세)

### P3-1 PRD v2 §10에 Phase 2.8 추가
```
| Phase 2.8 | 4/13~5/4 | AI Native — 봇 정리, n8n 분류, /home·HDD·폴더 클린업, SSOT 통합 |
```
- PRD v2 §6 인프라 정리의 "4TB HDD" 항목에 AI Native 결과 참조 추가

### P3-2 HARNESS.md v3.3 갱신
- `<!-- HARNESS-META -->` 블록 v3.2 → v3.3, 날짜 2026-04-14
- §1 컴포넌트 맵에 "텔레그램 봇 5개 역할" 블록 추가
- §5 파일 인벤토리에 `INFRA.md`·`PROJECTS.md` 추가
- §6 유지보수 일정에 "AI Native 월간 자가진단" 추가

### P3-3 MEMORY.md 최신화
- `MEMORY.md`에 "AI Native 완료" 블록 추가
- `memory/ai-native-upgrade.md` P1~P4 완료 표시
- 봇·프로젝트·n8n 분류 결과 요약 반영

### P3-4 pressco21-infra.md 실측 반영
- WF 개수 14 → 113(활성) 갱신
- n8n credentials 섹션 5개 + 중복 통합 기록
- 플로라·금고 cron 목록 추가
- 봇 5개 역할 재정의 + chat_id 5개 + 장지호 DM

### P3 완료 기준
- [ ] PRD v2 §10에 Phase 2.8 행 추가
- [ ] HARNESS.md v3.3 배포
- [ ] MEMORY.md 반영
- [ ] pressco21-infra.md 전면 현행화
- [ ] 새 세션이 위 4개 파일만으로 "현재 상태"를 말할 수 있는지 대표 체감 테스트

---

## 14. Phase P4 — 운영 리듬 정착 (상세)

### P4-1 주간 자가진단 자동화
- 매주 월요일 09:00 KST `[INFRA]-02 주간 자가진단` 실행
- 본진·플로라·금고 `df`/`free`/`docker stats`, 컨테이너 상태, 활성 WF 수(113 ±), 각 봇 7일 메시지 수, SSL 잔여일, auto-heal 발동 횟수
- 결과를 B3 `@Pressco21_bot`으로 장지호 DM 전송

### P4-2 월간 하네스 리뷰 자동화
- 매월 1일 `[INFRA]-03 월간 하네스 리뷰` 실행
- MEMORY 사용률, 에이전트 호출 통계 (`~/.claude/hooks/agent-usage.log` 집계)
- `env:dead` 재검토 목록 (30일 이상 실행 0회)
- 하네스 문서 최종 갱신일 체크
- PM 에이전트가 리포트 생성 → Flora 봇 전달

### P4-3 `env:dead` 30일 관찰 종료 & 삭제 실행
- 2026-05-13 P2-2 태깅한 `env:dead` WF 관찰 만료
- 최종 리스트 대표 승인
- n8n `deactivate` → 30일 → 삭제

### P4-4 AI Native 완료 회고
- `docs/ai-native-upgrade/RETRO.md` 작성
- 발견한 추가 문제, 다음 프로젝트 후보 기록
- PRD v2 Phase 3 진입 준비 완료 선언

### P4 완료 기준
- [ ] 주간·월간 자가진단 WF 배포 + 첫 실행 성공
- [ ] `env:dead` 삭제 기한 자동 리마인드 등록
- [ ] RETRO.md 작성
- [ ] 대표 "AI Native 완료" 선언 → 이 METAPROMPT를 `archive/METAPROMPT-v2.0.md`로 이동

---

## 15. 작업 시작 전 체크리스트 (매 세션)

새 Claude Code 세션이 AI Native를 이어서 하기 전 이 체크리스트를 **반드시** 통과해야 한다.

### 15.1 문서 통독 순서 (READ-FIRST)

1. `docs/ai-native-upgrade/METAPROMPT.md` (이 파일, **전체**) ← **생략 금지**
2. `docs/ai-native-upgrade/P1-telegram-bot-reorganization.md` v2.1
3. `docs/ai-native-upgrade/P1-bot-wf-matrix.md` v1.2
4. `docs/ai-native-upgrade/` 하위의 가장 최근 산출물 (P{n}-*.md)
5. `docs/PRD-하네스-종합고도화-v2.md` §10 (Phase 2.8 흡수 여부)
6. `AI_SYNC.md` Session Lock + Last Changes 최근 3건
7. `MEMORY.md` + `memory/ai-native-upgrade.md` + `memory/financial-hub-plan.md`
8. `HARNESS.md` §1, §5
9. `CLAUDE.md` 3계층 (`~/.claude/`, `workspace/`, `pressco21/`)

### 15.2 환경 확인
- [ ] `git status --short` 클린
- [ ] `git log --oneline -5`
- [ ] `ssh oracle "docker ps"` 정상
- [ ] `ssh openclaw "docker ps"` 정상
- [ ] `ssh minipc "docker ps"` 정상
- [ ] `~/.claude/hooks/.env` 봇 토큰 존재 (B1)
- [ ] `pressco21/.secrets.env` N8N_API_KEY 존재
- [ ] Tailscale 메시 활성

### 15.3 진행할 Phase 선언
- [ ] `AI_SYNC.md` Session Lock에 `[AI-Native P{n}]` 블록 기록
- [ ] 현재 Phase의 완료 기준 재확인
- [ ] 이전 Phase 미완료면 이어서, 완료면 다음 Phase
- [ ] 병렬 작업 필요 시 Codex CLI 위임 범위 명시 (`[CODEX]` prefix)

### 15.4 Effort 레벨 자동 안내
- P0, P2-5, P3-*, P4-4: **medium**
- P1-Wave1·2·4, P2-1, P2-3, P2-4(Wave1만): **high**
- **P1 Wave 3** (75 WF 일괄 치환), **P2-2** (n8n 142 분류), **P2-6** (SSOT 통합): **max**

### 15.5 중단 조건
- 봇 테스트 수신 실패 → P1 중단
- n8n `list:workflow` 실패 → P2-2 중단
- `/dev/sdb2` 마운트 시 기존 데이터 발견 → P2-3 중단, 대표 확인
- `git mv` 후 빌드 실패 → P2-4 즉시 rollback
- 본진 `auto-heal.sh` 5회 이상 발동 → 전체 작업 중단
- Wave 3 75 WF 치환 중 5개 이상 실패 → 즉시 중단, 전체 롤백

### 15.6 ★ 문서 기반 작업 원칙 (v2.0 신설)

**대화 요약(compact summary)만 보고 작업 시작 금지**. 반드시:
1. 이 METAPROMPT를 Read부터 (전체 또는 관련 섹션)
2. Wave별 실행 지침(`P1-telegram-bot-reorganization.md`)을 Read
3. 이전 세션의 실행 결과가 문서에 반영되어 있는지 확인
4. 불일치 발견 시 작업 진행 전 대표에게 먼저 보고

**이유**: v1.0 운영 중 Wave 2 작업을 대화 요약만 보고 실행한 사례가 발생. 결과는 맞았으나 "문서 기반 자율 운영" 원칙 위반. 이 원칙은 v2.0부터 강제된다. AI Native 프로젝트의 최종 목표는 **다음 세션 Claude Code가 문서만 보고 혼자 돌아가게 하는 것**이기 때문에, 현재 세션이 문서를 건너뛰면 그 목표 자체가 무너진다.

---

## 16. 진행 보고 프로토콜

각 Phase/Wave 종료 시 3종 세트:

1. **`AI_SYNC.md` Last Changes**:
   ```
   - YYYY-MM-DD [AI-Native P{n}] {요약} (claude)
     - 산출물: docs/ai-native-upgrade/P{n}-*.md
     - 검증: {완료 기준 확인 방법}
     - 다음: P{n+1} {첫 작업}
   ```

2. **`memory/ai-native-upgrade.md` 토픽 갱신**:
   - Phase 상태 표 업데이트
   - 주요 산출물·결정 사항 추가

3. **텔레그램 보고** (Flora 봇 경유):
   - 1~3줄 요약
   - 다음 단계 예고
   - 블로커 있으면 명시

---

## 17. 리스크 & 대응

| 리스크 | 확률 | 영향 | 대응 |
|-------|-----|-----|-----|
| 75 WF credential 일괄 치환 중 일부 실패 | 중 | 대 | Wave 3-1: 1개씩 처리 + 전체 백업(`pre-wave3.tar.gz`). 5개 이상 실패 시 즉시 롤백 |
| Topic 모드 ON 후 chat_id 변경 | 저 | 대 | chat_id는 그대로 유지됨(검증). `message_thread_id`만 추가 |
| 은행 알림 그룹 실수로 건드림 | 저 | 최대 | §4 원칙 14 + §15.5 중단 조건 + 재무 허브 씨앗 보호 명시 |
| 폴더 재편 중 배포 스크립트 깨짐 | 고 | 중 | Wave 2·3은 연기, Wave 1(legacy-skins만)만 실행 |
| Codex CLI 동시 WRITE 충돌 | 중 | 중 | `AI_SYNC.md` Lock 확인 습관 |
| n8n 서버 재시작 필요 | 저 | 중 | Phase 작업은 운영 시간 외 (22시~익일 08시) |
| 대표 장기 부재 | 저 | 중 | 각 Wave 완료 기준을 명확히 해서 무승인 영역 최소화 |
| 대화 요약 기반 작업 재발 | 중 | 중 | §15.6 문서 기반 원칙 + 세션 시작 시 `P{n}-*.md` Read 습관 |

---

## 18. 완료 정의 (Definition of Done)

AI Native 프로젝트는 **대표가 다음 7가지를 체감**했을 때 완료된다:

1. **봇**: "어느 봇이 뭘 담당하는지 아무 때나 말할 수 있다"
2. **톡방**: "어느 톡방에서 뭘 보는지, 왜 그 멤버인지 안다"
3. **n8n**: "142개 중 운영 필수는 ~개, 실험은 ~개, 죽은 건 ~개라고 바로 답한다"
4. **서버**: "본진/플로라/금고 중 어디에 뭐가 있는지 혼동 없다"
5. **폴더**: "어떤 파일을 만들 때 어디에 둘지 3초 안에 결정한다"
6. **SSOT**: "새 세션 열고 `INFRA.md` + `PROJECTS.md` 두 개만 읽으면 파악된다"
7. **자율운영 준비**: "PRD v2 Phase 3(L5)로 넘어갈 수 있는 하부 구조가 됐다"

**완료 선언 절차**:
- [ ] 위 7가지 체감 테스트 통과
- [ ] `docs/ai-native-upgrade/RETRO.md` 작성
- [ ] PRD v2 §10에 "Phase 2.8 AI Native — 완료" 행 표기
- [ ] 주간·월간 자가진단 WF 배포 + 첫 실행 성공
- [ ] 대표의 "AI Native 완료" 공식 선언

---

## 19. 부록 A — 텔레그램 봇·톡방 상세 카드

### A.0 구조 요약

| 봇 | 톡방 | 역할 |
|---|-----|-----|
| B1 `@Pressco21_alert_bot` | D1 전용 DM | Claude Code 개발 알림 (완전 분리) |
| B2 `@Pressco21_makeshop_bot` | T2 + T3 + T5 | 팀 운영 알림 (credential 통합) |
| B3 `@Pressco21_bot` | T1 | 장지호 개인 알림 |
| B4 `@pressco21_openclaw_bot` | T1 + T5 + T6 | Flora 양방향 대화 |
| B5 `@Pressco_Bank_bot` | T4 | 은행 알림 (재무 허브 씨앗) |

### A.1 B1 `@Pressco21_alert_bot` — Claude Code 개발 알림 전용

- **봇 ID**: 8759562724
- **토큰 위치**: `~/.claude/hooks/.env` 의 `CLAUDE_TELEGRAM_BOT_TOKEN`
- **n8n 연결**: 없음 (로컬 훅 `~/.claude/hooks/notify-telegram.sh` 전용)
- **수신 대상**: 장지호 DM 1명 (chat_id `7713811206`)
- **담당**: "workspace 완료", "빌드 성공", "파일 저장", "세션 종료" 등 Claude Code 세션/작업 알림
- **격리 이유**: 대표가 개발 진행 상황을 **능동 수시 확인**하는 고빈도 푸시. 다른 알림과 섞이면 시그널이 묻힘 (2026-04-14 대표 결정)
- **절대 금지**: 다른 WF·운영 알림 추가, 그룹 발송

### A.2 B2 `@Pressco21_makeshop_bot` — 팀 공용 운영 알림

- **봇 ID**: 8643940504
- **Display Name 변경**: `Pressco메이크샵봇` → **`Pressco21 운영`** (Wave 3 예정)
- **n8n credential**: **중복 통합 필수** — `RdFu3nsFuuO5NCff` 유지 + `eS5YwFGpbJht6uCB` 삭제
- **통합 후 담당 WF**: 122개 (기존 중복 합산)
- **수신 대상**: T2 운영실(Topic 3개) + T3 매출 공유 + T5 Claude 브릿지
- **담당 범주**:
  - FA 시리즈 (FA-001, FA-001b, FA-002, FA-003) → T2 🎓 Topic
  - Flora 시리즈 일부 (팀 공유 가치 있는 것)
  - 주문·출고·재고 ([F9], STOCK-ALERT, OMX-NOTIFY, OM-ADAPTER) → T2 🛒 Topic
  - 매출 리포트 ([F22]~[F25]) → T3
  - PRD-SAVE → T5
  - WF-CHURN-DETECT, [F11] 마감 알림
- **절대 금지**: 장지호 개인 DM 발송(→ B3 또는 B4), 양방향 대화, Telegram Trigger

### A.3 B3 `@Pressco21_bot` — 장지호 개인 알림

- **봇 ID**: 8521920006
- **Display Name 변경**: `Pressco_bot` → **`Pressco21 개인`** ✅ **2026-04-14 완료**
- **n8n credential**: `1` (Telegram Bot API)
- **담당 WF**: 17개 + **INFRA 3개 Wave 2 이관 완료**
- **수신 대상**: 장지호 DM 1명만 (chat_id `7713811206`) = T1
- **담당 범주**:
  - 정부지원사업 시리즈 (정부사업_*, GS-805, WF-GOV-TG-NOTIFY)
  - **INFRA 시리즈 3개**:
    - `DSIqF4w42WNUghWs` INFRA: 아침 시스템 건강 리포트
    - `0OFtnB5b4XmT8uqL` INFRA: WF 헬스 모니터
    - `OnHX4w8xTBDgnTUK` INFRA: API 사용량 + 비용 트래커
  - HR 시리즈 (HR-001/002)
  - WF-BACKUP Backup Notify
  - 대표가 혼자 봐야 하는 민감 정보
- **웹훅 상태**: 2026-04-14 `deleteWebhook` 완료 (이전 정부사업 허브 웹훅 → B2 단독 소유 이전)
- **절대 금지**: 그룹 발송, Telegram Trigger

### A.4 B4 `@pressco21_openclaw_bot` — Flora 양방향 대화

- **봇 ID**: 8672368567
- **n8n credential**: `O6qwF7Pup3u1Zc1O` (Flora-OpenClaw-Bot)
- **백엔드**: 플로라 서버 openclaw-gateway (PID ~2593078)
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
- **AI Native P1 변경 사항**: **없음 — 그대로 유지**
- **이유**: 향후 "PRESSCO21 재무 통합 허브" 프로젝트(종료 후 별도 PRD)의 Level 1 "운영 레벨" 역할. 상세: `memory/financial-hub-plan.md`

### A.6 톡방 상세 (6 + 1 DM)

#### T1 — 장지호 개인 DM (`7713811206`)
- 수신 봇: B3 (개인 알림) + B4 (Flora 대화)
- 담당: Flora 양방향, 정부사업, INFRA 3개(Wave 2 완료), HR, 개인 매출
- 예상 일일 수신: 20~30건

#### D1 — Claude Code 개발 알림 DM
- chat_id: `7713811206` (장지호 개인, 봇만 B1 차이)
- 수신 봇: B1 alert_bot 전용
- 담당: 개발 진행 상황, 파일 저장, 빌드 결과
- 분리 이유: 수시 확인 대상이라 타 알림과 섞이면 안 됨

#### T2 — PRESSCO21 운영실 (기존 `-5154731145` 확장)
- 현재 이름: `프레스코21` → Wave 3에서 `PRESSCO21 운영실`로 변경 예정
- **Topic 모드 ON, Topic 3개**:
  - 🚨 **긴급** — 전원 멘션, 특별 알림음, P0 이슈만
  - 🛒 **주문·출고·재고** — 이재혁 중심, [F9]·STOCK-ALERT·OMX
  - 🎓 **강사·파트너** — FA 시리즈·마감·WF-CHURN
- 멤버: 장지호 + 이재혁 + 원장님(2026-04-14 초대 완료) + B2
- **💰 입금·정산 Topic 만들지 않음** — T4 은행 알림 그룹이 그 역할

#### T3 — PRESSCO21 매출 공유 (`-5251214343`, 2026-04-14 신규 생성)
- Topic: 없음 (매출 리포트 단일 용도)
- 멤버: 원장님 + 장지호 + 이재혁 + 장준혁 사장(대기) + B2 + Flora
- 담당 WF (Wave 3 재배선 대상): [F22] 일일 매출, [F23] 통합 매출, [F24] 리치 리포트, [F25] 주간/월간, (옵션) S3A-001
- **이전 대상**: 현재 카카오톡으로 받는 4명 매출 리포트 → 텔레그램 이전

#### T4 — 은행 알림 (`-5275298126`, 변경 없음)
- 멤버: 원장님 + 장지호 + 이재혁 + B5
- 담당 WF: WF-CRM-01/02/03
- **AI Native P1 작업: 없음**
- 향후 역할: 재무 통합 허브 Level 1 "운영 레벨"

#### T5 — Flora ↔ Claude 브릿지 (`-5043778307`, 이름 변경 Wave 3)
- 이름 변경: `플로라 클로드 코드 개발실` → **`Flora ↔ Claude 브릿지`** (대표 승인)
- 멤버: 장지호 + B2 + B3 + B4
- 담당: Claude Code 기획안 저장, PRD-SAVE, Claude ↔ Flora AI-to-AI 협업 로그
- **Wave 2 완료**: INFRA 3개 WF(아침 건강/WF 헬스/API 사용량) → T1으로 이전
- 남는 것: PRD-SAVE + 향후 Claude 작업 로그

#### T6 — Flora ↔ Codex 브릿지 (`-5198284773`, 이름 변경 Wave 3)
- 이름 변경: `플로라 코덱스 개발실` → **`Flora ↔ Codex 브릿지`** (대표 승인)
- 멤버: 장지호 + B4 + openclaw-gateway 경유
- 담당: Codex CLI 실행·응답·에러, E2E 테스트 결과
- **AI Native P1 작업**: 이름 변경만, 기능 불변

---

## 20. 부록 B — 참고 파일 (새 세션 READ-FIRST 확장)

**우선순위 A (반드시 읽음)**:
1. `docs/ai-native-upgrade/METAPROMPT.md` ← 이 파일
2. `docs/ai-native-upgrade/P1-telegram-bot-reorganization.md` v2.1
3. `docs/ai-native-upgrade/P1-bot-wf-matrix.md` v1.2
4. `AI_SYNC.md` Session Lock + Last Changes 최근 3건

**우선순위 B (진행 중 Phase 따라)**:
5. `docs/PRD-하네스-종합고도화-v2.md` §10 실행 일정, §6 인프라, §3 업무 허브
6. `HARNESS.md` §1 컴포넌트 맵, §5 파일 인벤토리
7. `MEMORY.md` + `memory/ai-native-upgrade.md` + `memory/financial-hub-plan.md`
8. `OPS_STATE.md`

**우선순위 C (참고)**:
9. `~/.claude/pressco21-infra.md` (글로벌 인프라)
10. `~/.claude/rules/agent-routing.md`, `rules/n8n-reference.md`
11. `pressco21/CLAUDE.md` (프로젝트 규칙)
12. `workspace/AI-OPERATIONS.md` (서버면 분리 원칙)
13. `workspace/CLAUDE.md`

**아카이브 (이력 확인용)**:
14. `docs/ai-native-upgrade/archive/METAPROMPT-v1.0.md` (초안 이력, 운영 사용 금지)

---

## 21. 부록 C — 자주 쓸 명령어 모음

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

# 특정 WF 상세 (n8n API)
source pressco21/.secrets.env
curl -sS -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.pressco21.com/api/v1/workflows/<WF_ID>"

# credential 복호화 (서버에서)
ssh oracle "docker exec n8n n8n export:credentials --all --decrypted --output=/tmp/creds.json"
ssh oracle "cat /tmp/creds.json"

# 백업
ssh oracle "docker exec n8n n8n export:workflow --backup --output=/tmp/pre-wave/"
```

### 텔레그램 테스트
```bash
# getMe (토큰 유효성)
curl -s "https://api.telegram.org/bot<TOKEN>/getMe"

# getChat
curl -s "https://api.telegram.org/bot<TOKEN>/getChat?chat_id=<CHAT_ID>"

# sendMessage 테스트
curl -s "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>&text=[AI-Native P<n>] 테스트"

# Webhook 정보/삭제
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
curl -s "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

### 금고 디스크 (P2-3)
```bash
# 상태
ssh minipc "lsblk && sudo blkid /dev/sdb2"

# Read-only 탐색
ssh minipc "sudo mkdir -p /mnt/check && sudo mount -o ro -t ntfs /dev/sdb2 /mnt/check && ls /mnt/check"

# 언마운트
ssh minipc "sudo umount /mnt/check"

# 정식 마운트 (확인 후)
ssh minipc "sudo mkdir -p /mnt/pressco21-hdd && sudo mount -t ntfs-3g /dev/sdb2 /mnt/pressco21-hdd"
```

### 본진 /home 정리 (P2-1)
```bash
ssh oracle "mkdir -p /home/ubuntu/archive/202604-cleanup"
ssh oracle "cd /home/ubuntu && mv *.json *.py *.sh archive/202604-cleanup/ 2>/dev/null; true"
ssh oracle "ls /home/ubuntu/"
```

---

## 22. 변경 이력

| 날짜 | 버전 | 작성자 | 변경 |
|------|------|--------|------|
| 2026-04-13 | v1.0 | Claude Opus 4.6 | 최초 작성 (코드네임 ANU, 봇 3개 가정, 초기 스냅샷) |
| 2026-04-14 | v2.0 | Claude Opus 4.6 | **전면 재작성**. ①이름 ANU→**AI Native** 확정(업계 용어 정렬) ②봇 3개→**5개** 실측 반영 ③n8n WF 129→**142(활성 113)** ④그룹 1개→**5개** ⑤§7.1과 §18(부록A) 통합하여 자체 모순 해소 ⑥**§9 진행 상태 신설** (Wave 1·2 완료 반영) ⑦**§15.6 문서 기반 작업 원칙 신설** ⑧P1 상세는 `P1-telegram-bot-reorganization.md v2.1`로 정식 위임 ⑨1189줄→~700줄 축소. v1.0은 `archive/METAPROMPT-v1.0.md`로 이동 |

---

## 23. 마지막 지시 — 이 파일을 받은 Claude Code에게

1. **§15 작업 시작 전 체크리스트를 전부 돌려라**. 특히 §15.1 READ-FIRST와 **§15.6 문서 기반 작업 원칙**
2. 막히면 즉시 대표에게 보고해라 — 혼자 해결 금지
3. 어느 Phase든 시작 전 `AI_SYNC.md`에 Lock 걸어라
4. 각 Phase의 **완료 기준**을 만족하지 못하면 다음으로 넘어가지 마라
5. §4 제약 **16조를 한 조도 위반하지 마라**
6. 이 파일의 §3 스냅샷 값이 실측과 달라지면 P0에서 수정하고 기록해라
7. 3주 안에 못 끝나면 일정 재협상해라 — 억지로 밀어붙이지 마라
8. 종료 시 §18 완료 정의를 대표 앞에서 체크리스트로 검증하고 선언해라
9. **v1.0 초안(`archive/METAPROMPT-v1.0.md`)을 다시 운영에 사용하지 마라**. 실측 불일치가 있다. 이력 보존용

**이 프로젝트의 최종 의미**: PRESSCO21은 8명으로 11.6억 매출을 만드는 회사다. 대표 장지호는 마케팅·CS·기획·IT·재무·영업을 혼자 감당하고 있다. AI Native가 끝나면 AI 에이전트 25명이 더 단단한 하부 구조 위에서 장지호의 부담을 대신 지게 된다. 이건 단순한 정리 작업이 아니다 — **AI가 회사의 실질 운영을 맡기 위한 마지막 기초 공사**다.

끝.
