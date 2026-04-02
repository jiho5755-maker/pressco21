# Pressco21 자동화 시스템 — 전체 가이드

> **운영 가이드**: FA 강사 시스템 운영법, 서버 관리, WF 재설치 절차를 다룹니다.
>
> - **새 환경 세팅 (처음 시작)** → `pressco21/GETTING-STARTED.md`
> - **프로젝트 전체 현황/WF 목록** → `pressco21/PROJECT-INDEX.md`
>
> 최종 업데이트: 2026-04-02

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [현재 운영 중인 워크플로우 전체 목록](#2-현재-운영-중인-워크플로우-전체-목록)
3. [FA 강사 시스템 운영 방법](#3-fa-강사-시스템-운영-방법)
4. [필요한 계정 및 API 키 목록](#4-필요한-계정-및-api-키-목록)
5. [새 서버에서 처음부터 세팅하기](#5-새-서버에서-처음부터-세팅하기)
6. [각 프로젝트 워크플로우 재설치 방법](#6-각-프로젝트-워크플로우-재설치-방법)
7. [일상 운영 가이드](#7-일상-운영-가이드)
8. [문제 해결](#8-문제-해결)

---

## 1. 시스템 개요

서버 1대에서 모든 자동화가 돌아갑니다.

```
pressco21/
├── GETTING-STARTED.md     ← 처음 시작하는 사람을 위한 가이드
├── PROJECT-INDEX.md       ← 전체 프로젝트 현황 + WF 목록
├── PRESSCO21-GUIDE.md     ← 이 파일 (운영 가이드)
├── secrets.example.env    ← API 키 템플릿 (.secrets 파일 생성 기준)
├── _tools/                ← 배포 스크립트 모음
│   ├── README.md
│   └── deploy.sh          ← 안전한 WF 배포 스크립트
├── automation-project/    ← [그룹 1] 업무 일정 자동화
│   └── workflows/         ← 워크플로우 JSON (F2~F5)
├── govt-support/          ← [그룹 2] 정부지원사업 자동수집
│   ├── _archive/          ← 구버전 PRD 보관 (PRD-v1, v2)
│   ├── PRD-v3.md          ← 최신 요구사항
│   └── workflows/         ← 워크플로우 JSON (WF#1~7)
└── homepage-automation/   ← [그룹 3] 쇼핑몰 + 강사 시스템
    └── workflows/         ← 워크플로우 JSON (FA-001~003, F050/F050b)
```

### 그룹 1 — 업무 일정 자동화

텔레그램, 구글 캘린더, Flora 대시보드에서 들어온 업무를 Flora DB로 운영하고, 매일 아침 할 일 브리핑을 받는 시스템.

| 항목 | 내용 |
|------|------|
| 봇 | @Pressco21_bot |
| 주요 기능 | Flora task 적재, 구글캘린더 동기화, 모닝브리핑, 밀린업무 알림 |
| 상세 문서 | `automation-project/PRD.md`, `USAGE-GUIDE.md` |

### 그룹 2 — 정부지원사업 자동수집

기업마당/K-Startup/보조금24에서 매일 새 공고를 수집하고 AI가 분석해서 텔레그램으로 알려주는 시스템.

| 항목 | 내용 |
|------|------|
| 봇 | @Pressco21_bot |
| 주요 기능 | 공고 자동수집, 마감임박 재알림, 월간 리포트 |
| 상세 문서 | `govt-support/PRD.md` |

### 그룹 3 — 쇼핑몰 + 강사 시스템

쇼핑몰 강사회원 신청 자동화 + AI 챗봇 운영.

| 항목 | 내용 |
|------|------|
| 봇 | @Pressco21_makeshop_bot |
| 주요 기능 | FA-001(등급자동변경), FA-002(신청알림), FA-003(반려이메일), F050(AI 챗봇) |
| 데이터 | NocoDB (nocodb.pressco21.com) |
| 상세 문서 | `homepage-automation/ACTION-GUIDE.md` |

---

## 2. 현재 운영 중인 워크플로우 전체 목록

총 41개 워크플로우가 자동 실행 중입니다 (2026-04-02 기준).
전체 WF 목록과 n8n ID는 `pressco21/PROJECT-INDEX.md` 참조.

### 그룹 1 — 업무 일정 (5개)

| 워크플로우 | 실행 조건 | 하는 일 |
|-----------|----------|--------|
| F2 구글캘린더 등록 | 캘린더 이벤트 생성 시 | 구글 캘린더 일정 → Flora task 적재 |
| F3 모닝브리핑 | 매일 08:00 | 오늘 할 일 + 밀린 일 텔레그램 요약 |
| F4 밀린업무알림 | 매일 10:00 | 기한 지난 할 일 텔레그램 알림 |
| F5 캘린더 동기화 | 5분마다 | Flora task → 구글캘린더 동기화 |
| F5 텔레그램 Callback | Webhook | 텔레그램 버튼 상태변경 → Flora patch |

### 그룹 2 — 정부지원사업 (7개)

| 워크플로우 | n8n ID | 실행 조건 | 하는 일 |
|-----------|--------|----------|--------|
| WF#1 자동수집+AI분석 | `7MXN1lNCR3b7VcLF` | 매일 09:00 | API 3개 수집 → Gemini 배치 분석 → 텔레그램 |
| WF#2 마감임박 재알림 | `3TXzJ9AADTf9oNL6` | 매일 09:30 | 마감 3일 전 공고 알림 |
| WF#3 월간리포트 | `oeIOcnDYpSDmbkKp` | 매월 1일 | 지난달 공고 요약 |
| WF#4 이벤트기반탐색 | `Is13frkTT5USFXyI` | 매주 월요일 | 회사 상황 기반 공고 탐색 |
| WF#5 행정서류자동생성 | `TsJQE6BxL3HQM6Ax` | 매 4시간 | 신청의향=true 감지 → Google Docs 생성 |
| WF#6 텔레그램허브 | `HxskyYvTbFvRzgaa` | 텔레그램 명령어 | /검색 /요약 /이벤트 /상태 /신청 /서류 |
| WF#7 주간TOP5 | `FedVm1QWsvUeUjUn` | 매주 금요일 17:00 | 관련도 TOP5 리포트 |

### 그룹 3 — 쇼핑몰 + 강사 (5개)

| 워크플로우 | n8n ID | 실행 조건 | 하는 일 |
|-----------|--------|----------|--------|
| FA-001 강사 등급변경 | `jaTfiQuY35DjgrxN` | 5분마다 | 승인대기 → 메이크샵 등급변경 → 이메일 |
| FA-002 강사 신청알림 | `ovWkhq7E0ZqvjBIZ` | 1시간마다 | 새 신청 텔레그램 알림 |
| FA-003 강사 반려이메일 | `Ks4JvBC06cEj6b8b` | 5분마다 | 반려 → 고객 이메일 자동 발송 |
| F050 AI 챗봇 | `krItUablejX8YLNV` | Webhook | FAQ매칭+의도분류+Gemini응답 |
| F050b 피드백 수집 | `C3VQdprEjzQiiEW9` | Webhook | 챗봇 피드백 NocoDB 기록 |

---

## 3. FA 강사 시스템 운영 방법

> 강사 신청이 들어오면 어떻게 처리하는지 단계별로 설명합니다.

### 강사 신청 전체 흐름

```
1. 고객이 신청 폼 작성
   → https://nocodb.pressco21.com/apply

2. FA-002가 1시간 내 텔레그램으로 알림 발송
   → @Pressco21_makeshop_bot 으로 수신

3. 관리자가 NocoDB에서 증빙서류 확인
   → https://nocodb.pressco21.com
   → '강사공간' 테이블 클릭

4a. 승인하는 경우
    → '진행 상태' 를 [승인대기] 로 변경 후 저장
    → FA-001이 5분 이내 자동으로:
       - 메이크샵에서 강사그룹으로 등급 변경
       - NocoDB '진행 상태'를 [승인완료]로 자동 변경
       - 텔레그램으로 완료 알림
       - 고객 이메일로 승인 축하 이메일 발송

4b. 반려하는 경우
    → '반려 사유' 칸에 구체적인 사유 입력 (예: "사업자등록증에 원예 업종 없음")
    → '진행 상태'를 [반려] 로 변경 후 저장
    → FA-003이 5분 이내 자동으로:
       - 고객 이메일로 반려 안내 + 재신청 링크 발송
       - 텔레그램으로 발송 완료 알림
```

> **중요**: 반려할 때는 반드시 '반려 사유'를 먼저 입력한 뒤 상태를 변경하세요.
> 이메일이나 사유가 없으면 발송이 보류되고 텔레그램으로 "보류 알림"이 옵니다.

### NocoDB '진행 상태' 옵션 설명

| 상태값 | 언제 사용 |
|--------|---------|
| 신청완료 | 고객이 폼 제출 시 자동 설정 (건드릴 필요 없음) |
| 승인대기 | 관리자가 서류 확인 후 승인 결정 시 직접 변경 |
| 승인완료 | FA-001이 등급 변경 성공 후 자동 설정 (건드릴 필요 없음) |
| 반려 | 관리자가 부적격 판단 시 직접 변경 |
| 대기중 | 서류 보완 요청 등 임시 보류 시 사용 |

---

## 4. 필요한 계정 및 API 키 목록

새 환경에서 세팅할 때 아래 항목들이 모두 준비되어야 합니다.

### 필수 서비스 계정

| 서비스 | 용도 | 비용 |
|--------|------|------|
| **Oracle Cloud** | 서버 (n8n 실행) | 무료 (Free Tier) |
| **텔레그램** | 알림 수신 + 업무 입력 | 무료 |
| **구글 계정** | 구글 캘린더 | 무료 |
| **NocoDB** | 강사 신청 DB | 무료 (self-hosted) |
| **네이버 메일 (SMTP)** | 강사 이메일 발송 | 무료 |
| **메이크샵** | 쇼핑몰 (이미 운영 중) | 별도 |
| **공공데이터포털** | 정부지원사업 API | 무료 |
| **Google AI Studio** | Gemini AI 분석 | 무료 |

### n8n Credentials 목록

새 서버에 재설치할 때 n8n에 등록해야 하는 자격증명 목록입니다.

| 서비스 | n8n Credential 이름 | 타입 | 용도 |
|--------|-------------------|------|------|
| 텔레그램 봇 1 | `Pressco21_bot` | Telegram | 업무 일정 + 정부지원사업 |
| 텔레그램 봇 2 | `Pressco메이크샵봇` | Telegram | FA 강사 신청, 쇼핑몰 알림 |
| 구글 캘린더 | `Google Calendar` | OAuth2 | 캘린더 연동 |
| 네이버 SMTP | `PRESSCO21-SMTP-Naver` | SMTP | 강사 승인/반려 이메일 발송 |
| 메이크샵 API | (헤더에 직접 입력) | - | 회원 조회/등급 변경 |

> 메이크샵 API 키와 NocoDB API 토큰은 각 워크플로우 HTTP Request 노드의 헤더에 직접 입력되어 있습니다.

### 주요 API 키 값 (참조용)

| 서비스 | 키 값 |
|--------|-------|
| NocoDB API 토큰 | 서버 `.env` 파일 참조 (GitHub에 저장 금지) |
| NocoDB Project ID | `poey1yrm1r6sthf` |
| NocoDB 강사공간 테이블 ID | `mcafm2yyeaupdnt` |
| 텔레그램 Chat ID | `7713811206` |

> 메이크샵 Shopkey/Licensekey는 FA-001 워크플로우 안에 저장되어 있습니다.
> 정부지원사업 API 키들은 각 워크플로우 노드 안에 직접 입력되어 있습니다.

---

## 5. 새 서버에서 처음부터 세팅하기

> 현재 서버(n8n.pressco21.com)가 정상 운영 중이라면 이 섹션은 건너뛰세요.
> 서버를 교체하거나 새로 시작할 때만 필요합니다.

### Step 1 — 서버 준비

**Oracle Cloud Free Tier 인스턴스 생성:**

1. [cloud.oracle.com](https://cloud.oracle.com) 로그인
2. Compute > Instances > Create Instance
3. Shape: `VM.Standard.A1.Flex` (ARM, 무료)
4. OCPU: 2, Memory: 12GB (무료 한도 최대)
5. OS: Ubuntu 22.04 LTS
6. SSH 키 다운로드 후 안전한 곳에 보관 (분실 시 서버 접근 불가)
7. 생성 후 외부 IP 확인 → DNS에 `n8n.pressco21.com` A레코드 추가

> **"Out of Host Capacity" 오류 시**: 새벽 2~6시에 재시도하거나 다른 리전 선택

### Step 2 — 서버 기본 설정

```bash
# 서버 접속
ssh -i [다운로드한_키.key] ubuntu@[서버_IP]

# 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Docker Compose 설치
sudo apt install docker-compose-plugin -y

# 방화벽 설정 (Oracle Cloud는 인바운드 규칙도 별도 설정 필요)
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw enable
```

### Step 3 — n8n 설치

```bash
# docker-compose.yml 서버로 복사 (로컬 PC에서 실행)
scp -i [키.key] automation-project/server-config/docker-compose.yml ubuntu@[서버IP]:~/
scp -i [키.key] automation-project/server-config/.env.example ubuntu@[서버IP]:~/.env

# 서버에서 환경변수 수정
nano ~/.env
# 아래 값들을 실제 값으로 변경:
#   N8N_HOST=n8n.pressco21.com
#   POSTGRES_PASSWORD=강력한비밀번호
#   N8N_ENCRYPTION_KEY=32자이상의랜덤문자열

# n8n 실행
docker compose up -d

# 실행 확인 (ok 응답이 오면 정상)
curl localhost:5678/healthz
```

### Step 4 — 도메인 + HTTPS 설정

```bash
# Nginx + Certbot 설치
sudo apt install nginx certbot python3-certbot-nginx -y

# 설정 파일 복사 (로컬 PC에서)
scp -i [키.key] automation-project/server-config/nginx-n8n.conf ubuntu@[서버IP]:/etc/nginx/sites-available/n8n

# Nginx 활성화
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL 인증서 발급
sudo certbot --nginx -d n8n.pressco21.com
```

### Step 5 — NocoDB 설치 (강사 시스템용)

```bash
# NocoDB 설치 (Docker)
docker run -d \
  --name nocodb \
  --restart unless-stopped \
  -p 8080:8080 \
  -v ~/nocodb:/usr/app/data \
  nocodb/nocodb:latest

# Nginx에 nocodb 서브도메인 추가 설정 필요
# nocodb.pressco21.com → localhost:8080
```

---

## 6. 각 프로젝트 워크플로우 재설치 방법

> 기존 서버가 살아있다면 이미 설치되어 있으므로 필요 없습니다.
> 새 서버나 워크플로우가 사라진 경우에만 따라하세요.

### 공통 절차 — n8n 자격증명 등록

**n8n 접속 → 왼쪽 메뉴 Credentials → Add Credential**

#### 텔레그램 봇 등록

```
타입: Telegram
이름: Pressco21_bot (또는 Pressco메이크샵봇)
Access Token: [BotFather에서 발급받은 토큰]
```

#### 네이버 SMTP 등록 (이메일 발송용)

```
타입: SMTP
이름: PRESSCO21-SMTP-Naver
Host: smtp.naver.com
Port: 465
User: pressco5755@naver.com
Password: [네이버 앱 비밀번호]
SSL: true
```

#### 구글 캘린더 등록

n8n의 Google Calendar OAuth2 방식으로 등록 (`automation-project/DEPLOYMENT-GUIDE.md` 참조)

---

### 그룹 1 — 업무 일정 자동화 설치

**파일 위치:** `automation-project/workflows/`

1. `google-calendar-todo.json` import
2. `morning-briefing.json` import
3. `overdue-alert.json` import
4. `flora-to-gcal-sync.json` import
5. `flora-telegram-callback.json` import

각 파일 import 후:
- Telegram 노드 → 자격증명 선택
- Flora 자동화 호출 → `ADMIN_API_TOKEN` 환경변수 사용
- Google Calendar 노드 → Google Calendar OAuth2 자격증명 선택
- Active 토글 ON

### 그룹 2 — 정부지원사업 설치

**파일 위치:** `govt-support/workflows/`

1. `정부지원사업_Pressco21.json` import (WF#1)
2. `정부지원사업_마감임박_재알림.json` import (WF#2)
3. `정부지원사업_텔레그램허브.json` import (WF#6)
4. `정부지원사업_행정서류자동생성.json` import (WF#5)
5. 나머지 WF 파일들 import

Import 후 각 WF:
- Google OAuth2 Credential 재연결 (Google Drive, Docs)
- Gemini Credential 선택
- Active 토글 ON

> NocoDB 토큰, Telegram Bot, MSIT API 키는 노드 안에 설정되어 있음

---

### 그룹 3 — 쇼핑몰 + 강사 시스템 설치

**파일 위치:** `homepage-automation/workflows/`

**Import 순서:**

1. `FA-002_강사_신청_알림.json` — 신청 알림
2. `FA-001_강사회원_등급_자동변경.json` — 등급 자동 변경 + 승인 이메일
3. `FA-003_강사_반려_이메일_자동발송.json` — 반려 이메일
4. `F050_AI_chatbot.json` — AI 챗봇 백엔드
5. `F050b_피드백_수집.json` — 챗봇 피드백 수집

Import 후 각 워크플로우:
- Telegram 노드 → `Pressco메이크샵봇` 자격증명 선택
- FA-001, FA-003 의 emailSend 노드 → `PRESSCO21-SMTP-Naver` 자격증명 선택
- F050 → NocoDB, Gemini Credential 선택
- Active 토글 ON

> NocoDB, 메이크샵 API 키는 노드 안에 직접 입력되어 있음

---

## 7. 일상 운영 가이드

### n8n 서버 상태 확인

```bash
# 서버 접속
ssh -i [키.key] ubuntu@158.180.77.201

# n8n 컨테이너 상태 확인
docker ps

# 정상: "Up X hours" 상태
# 비정상: 재시작 명령 실행
docker compose restart

# 재시작 후 정상 확인
curl localhost:5678/healthz
# 응답: {"status":"ok"}
```

### 워크플로우 실행 로그 확인

1. `https://n8n.pressco21.com` 접속
2. 왼쪽 메뉴 **Executions** 클릭
3. 빨간색 `Error` 항목 클릭 → 오류 노드 확인

## 8. 문제 해결

### 에러 코드별 원인과 해결

| 에러 | 원인 | 해결 |
|------|------|------|
| `401 Unauthorized` | API 키 오류/만료 | n8n Credentials에서 해당 키 업데이트 |
| `403 Forbidden` | 메이크샵 IP 차단 | 메이크샵 관리자 → 오픈API → 허용IP에 `158.180.77.201` 추가 |
| `Connection refused` | n8n 서버 다운 | `docker compose restart` |
| `rate limit exceeded` | API 호출 초과 | 메이크샵: 시간당 500회 제한. 1시간 후 자동 재실행 대기 |

### 자주 묻는 것들

**Q. 텔레그램 알림이 안 옵니다.**
A. 순서대로 확인:
1. `docker ps` — n8n 컨테이너 실행 중인지 확인
2. n8n UI → 해당 워크플로우 → Active 상태인지 확인
3. n8n UI → Executions → 빨간 에러 항목 확인

**Q. 강사 승인했는데 메이크샵 등급이 바뀌지 않았습니다.**
A. 확인 순서:
1. NocoDB에서 '진행 상태'가 실제로 `승인대기`로 되어 있는지 확인
2. n8n Executions에서 FA-001 실행 결과 확인 (5분 내 실행되었는지)
3. 메이크샵 관리자 → 오픈API → 허용IP에 서버 IP(`158.180.77.201`) 있는지, 수정 권한 허용인지 확인

**Q. 반려 이메일이 발송되지 않았습니다.**
A. 확인 순서:
1. NocoDB에서 '반려 사유' 칸이 비어있지 않은지 확인
2. NocoDB에서 '이메일 주소' 칸에 `@` 포함한 올바른 이메일인지 확인
3. 텔레그램으로 "보류 알림"이 왔다면 → NocoDB에서 해당 항목 수정 후 `n8n_반려알림` 체크박스를 해제하면 재시도

**Q. 새 서버로 이전하면 API 키를 다시 발급해야 하나요?**
A. 메이크샵 오픈API 허용IP만 새 서버 IP로 업데이트하면 됩니다. 나머지 API 키는 그대로 재사용 가능합니다.

**Q. n8n 업그레이드 방법은?**
A.
```bash
docker compose pull
docker compose up -d
```

---

## 부록 — 인프라 정보

| 항목 | 값 |
|------|-----|
| 서버 | Oracle Cloud Free Tier ARM (2 OCPU / 12GB RAM) |
| 서버 IP | 158.180.77.201 |
| n8n 주소 | https://n8n.pressco21.com |
| NocoDB 주소 | https://nocodb.pressco21.com |
| 텔레그램 봇 1 | @Pressco21_bot (Chat ID: 7713811206) |
| 텔레그램 봇 2 | @Pressco21_makeshop_bot |
| 강사 신청 폼 | https://nocodb.pressco21.com/apply |
| SSH 키 위치 | `~/.ssh/oracle-n8n.key` (로컬 PC) |

> **프로젝트 전체 현황 및 WF ID 목록** → `pressco21/PROJECT-INDEX.md`
> **새 환경 세팅 가이드** → `pressco21/GETTING-STARTED.md`
