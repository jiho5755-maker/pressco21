# PRESSCO21 회사 자료 보관 시스템 운영 가이드

작성일: 2026-03-19

관련 문서:

- `docs/파트너클래스/mini-pc-content-upload-guide.md`
- `docs/파트너클래스/mini-pc-creator-sync-strategy.md`
- `docs/파트너클래스/mini-pc-creator-sync-onboarding-guide.md`
- `docs/파트너클래스/mini-pc-syncthing-macos-guide.md`
- `docs/파트너클래스/mini-pc-syncthing-windows-guide.md`
- `docs/파트너클래스/mini-pc-company-hub-taxonomy.md`
- `docs/파트너클래스/mini-pc-company-hub-filename-rules.md`

이 문서는 비전공자 기준으로 현재 구축된 회사 자료 보관 시스템을 어떻게 써야 하는지 정리한다.

## 1. 이 시스템이 하는 일

현재 구조는 두 대의 장비로 나뉜다.

- Oracle 서버
  - 회사 서비스가 실제로 돌아가는 서버
  - `n8n`, `NocoDB`, `CRM` 관련 프로그램이 여기서 동작한다.
  - 최신 운영 백업을 잠깐 보관한다.
- 미니PC
  - 회사 자료와 장기 백업을 모아두는 저장소
  - 브라우저로 파일을 올리고 받는 창구 역할을 한다.
  - Oracle 서버에서 백업을 자동으로 받아 저장한다.

쉽게 말하면:

- Oracle 서버 = 일하는 서버
- 미니PC = 자료 창고

자료를 넣는 방법은 두 갈래다.

- 자동 동기화: 영상 편집자, 웹디자이너의 메인 경로
- 수동 업로드: 모바일, 외부 협력자, 단발성 파일의 예외 경로

## 2. 지금 자동으로 돌아가는 것

사람이 매번 손대지 않아도 아래 작업은 자동으로 돌아간다.

### Oracle 서버

- 매일 백업 생성
- 오래된 백업 정리
- 디스크 사용량 점검

### 미니PC

- 매일 밤 Oracle 서버 백업을 자동으로 가져옴
- 자료 업로드 폴더(`inbox`)를 자동 정리
- creator sync 기본 폴더 구조 유지
- 상태 이상이 있으면 알림 전송
- 브라우저 업로드 서비스 상시 실행

## 3. 꼭 알아야 할 운영 원칙

1. 회사 자료는 미니PC에 올린다.
2. 큰 작업 파일은 가능하면 `자동 동기화` 로 넣는다.
3. `inbox` 는 예외 업로드일 때만 사용한다.
4. 최종 폴더는 직접 만지지 않는다.
5. 미니PC는 가능하면 계속 켜둔다.
6. 모니터와 키보드는 평소 연결하지 않아도 된다.
7. 외장 SSD/HDD를 연결한 뒤에는 가능하면 계속 꽂아둔다.

## 4. 접속 주소

### 같은 공간의 같은 네트워크일 때

- `http://192.168.0.54:8090/login`

### 외부에서 접속할 때

외부에서는 `Tailscale` 이 필요하다.

1. 맥북 또는 아이폰에 `Tailscale` 앱 설치
2. 회사에서 쓰는 같은 Tailscale 계정으로 로그인
3. 아래 주소 중 하나로 접속

- `http://100.76.25.105:8090/login`
- `http://pressco21-backup.tailee581a.ts.net:8090/login`

주의:

- `.local` 주소는 쓰지 않는다.
- 외부에서는 반드시 Tailscale 을 켠 상태여야 한다.

## 5. 현재 계정 구조

이 시스템에는 역할이 다른 계정이 있다.

### File Browser 관리자 계정

- 아이디: `pressco21`
- 용도: 전체 폴더 보기, 관리, 점검
- 권한: 전체 접근 가능
- 사용 대상: 관리자만

### File Browser 직원 업로드 계정

- 아이디: `pressco21-upload`
- 용도: 직원 업로드 전용
- 권한: `/inbox` 중심 업로드
- 사용 대상: 직원

### File Browser 작업자 라이브러리 계정

- 아이디: `pressco21-library`
- 용도: 작업자가 보관소에서 자료를 다시 내려받을 때 사용
- 권한: library view 읽기/다운로드 전용
- 사용 대상: 영상 편집자, 웹디자이너

### 미니PC 운영 계정

- 아이디: `pressbackup`
- 용도: 서버 설정 변경, 서비스 점검
- 사용 대상: 관리자만

### Oracle 서버 운영 계정

- 아이디: `ubuntu`
- 용도: Oracle 서버 점검
- 사용 대상: 관리자만

## 6. 비밀번호를 확인하는 위치

이 문서에는 비밀번호 평문을 적지 않는다.

이유:

- 문서에 남기면 나중에 복사되거나 공유될 수 있다.
- 채팅이나 문서에 남는 비밀번호는 장기적으로 보안에 불리하다.

현재 비밀번호 확인 위치:

- 관리자 계정 정보:
  - `/home/pressbackup/pressco21/content-browser-admin-credentials.txt`
- 직원 업로드 계정 정보:
  - `/home/pressbackup/pressco21/content-browser-upload-credentials.txt`
- 작업자 라이브러리 계정 정보:
  - `/home/pressbackup/pressco21/content-browser-library-credentials.txt`
- 기본 안내 파일:
  - `/home/pressbackup/pressco21/content-browser-credentials.txt`

운영 원칙:

- 직원에게는 `pressco21-upload` 정보만 전달한다.
- 작업자에게는 `pressco21-library` 정보만 전달한다.
- `pressco21` 관리자 계정은 관리자만 쓴다.
- 관리자 비밀번호는 나중에 한 번 더 변경하는 것이 좋다.

## 7. 자료를 넣는 방식

### 1. 자동 동기화

자동 동기화는 아래 직군의 기본 경로다.

- 영상 편집자
- 웹디자이너

원칙:

- 자기 PC의 전용 작업 폴더를 사용한다.
- 작업 파일을 File Browser에 직접 올리지 않는다.
- Syncthing이 미니PC로 자동 반영한다.
- `archive-sync` 에 자료가 보이면 그때부터 로컬 파일을 지워도 된다.
- 다시 필요할 때는 `pressco21-library` 계정으로 보관소에서 다운로드한다.

관리자가 File Browser에서 보는 핵심 경로:

- `active-sync`
- `archive-sync`
- `company-hub`
- `publish-queue`

작업자가 다운로드할 때도 기본 기준은 영어 canonical 폴더다.

- `active-sync`
- `archive-sync`
- `company-hub`
- `publish-ready`

## 7-1. 작업자와 관리자가 실제로 보는 보관소 구조

이제 보관소는 영어 폴더명을 기준으로 쓴다.

Desktop 에서는 `PRESSCO21_STORAGE` 바로가기 하나만 열면 된다.

루트 구조:

- `video`
  - `raw`
  - `project`
  - `export`
- `design`
  - `source`
  - `export`
  - `publish`
- `company-hub`
  - `internal-docs`
  - `brand-assets`
  - `brand-system`
  - `templates`
  - `sales-kits`
  - `operations`

각 영어 폴더 안에는 `README.ko.txt` 가 있어서 한국어 설명을 바로 볼 수 있다.

의미는 이렇게 보면 된다.

- `video`: 영상 원본, 프로젝트, 최종 편집본
- `design`: 디자인 원본, 산출물, 게시 후보
- `company-hub`: 공용 문서, 브랜드 자산, 운영 문서

### 2. 수동 업로드

수동 업로드는 아래 상황에만 쓴다.

- 모바일에서 짧은 파일을 올릴 때
- 외부 협력자에게 받은 단발성 자료
- 예외적으로 브라우저 업로드가 더 간단한 경우

## 8. 수동 업로드를 하는 직원이 자료를 올리는 방법

직원은 아래 순서만 기억하면 된다.

1. 브라우저에서 File Browser 로그인
2. `inbox` 폴더로 이동
3. 맞는 하위 폴더 선택
4. 파일 업로드
5. 기다리기

### 업로드 위치

#### 유튜브

- 촬영 원본: `inbox/youtube/raw`
- 편집 프로젝트: `inbox/youtube/project`
- 최종 업로드본: `inbox/youtube/export`

#### 릴스

- 촬영 원본: `inbox/reels/raw`
- 편집 프로젝트: `inbox/reels/project`
- 최종 업로드본: `inbox/reels/export`

#### 공용 자료

- 로고, 폰트, 템플릿: `inbox/shared/brand-assets`
- 자막 파일: `inbox/shared/subtitles`
- 썸네일 파일: `inbox/shared/thumbnails`

중요:

- 직원은 `youtube`, `reels`, `shared` 최종 폴더에 직접 올리지 않는다.
- 항상 `inbox` 로만 올린다.

## 8-1. 회사 내부문서와 브랜드 에셋은 어디에 넣는가

회사 공용 자료는 `inbox` 가 아니라 `company-hub` 체계로 관리하는 게 맞다.

이 자료는 자동 정리 대상이 아니라, 장기적으로 계속 꺼내 보고 업데이트해야 하는 자료이기 때문이다.

권장 구조:

- `company-hub/internal-docs`
  - `01-company-profile`
  - `02-policies-sop`
  - `03-legal-contracts`
  - `04-meetings-notes`
  - `05-finance-admin`
- `company-hub/brand-assets`
  - `01-logos`
  - `02-fonts`
  - `03-icons`
  - `04-photo-video-source`
  - `05-illustrations-graphics`
- `company-hub/brand-system`
  - `01-brand-guidelines`
  - `02-colors`
  - `03-typography`
  - `04-messaging-tone`
  - `05-reference-examples`
- `company-hub/templates`
  - `01-doc-templates`
  - `02-slide-templates`
  - `03-sheet-templates`
  - `04-design-templates`
  - `05-video-templates`
- `company-hub/sales-kits`
  - `01-company-overview`
  - `02-one-pagers`
  - `03-proposals`
  - `04-case-studies`
  - `05-client-facing-assets`
- `company-hub/operations`
  - `01-automation`
  - `02-checklists`
  - `03-manuals`
  - `04-vendors-tools`
  - `05-system-maps`

현재 Finder 기준 실사용 경로는 아래처럼 영어 canonical 폴더를 그대로 쓴다.

예:

- `PRESSCO21_STORAGE/company-hub/internal-docs`
- `PRESSCO21_STORAGE/company-hub/brand-assets`
- `PRESSCO21_STORAGE/company-hub/sales-kits`

설명이 필요하면 각 폴더 안의 `README.ko.txt` 를 본다.

## 8-2. 회사 공용자료 파일명은 어떻게 짓는가

공용자료는 폴더 정리만큼 파일명도 중요하다.

권장 기본 형식:

- `YYYYMMDD_문서이름_v01`
- `문서이름_v01`

예:

- `20260319_회사소개서_v01.pdf`
- `20260319_주간회의록_v01.docx`
- `브랜드가이드_v03.pdf`
- `회사소개서_기본템플릿_v02.pptx`

웹 공개용 파일만 예외적으로 영어 파일명을 쓴다.

예:

- `pressco21-logo-primary-v01.svg`
- `foreverlove-product-detail-rose-oil-v02.jpg`

상세 기준은 아래 문서를 따른다.

- `docs/파트너클래스/mini-pc-company-hub-filename-rules.md`

원칙:

- 공용 문서와 브랜드 자산은 `company-hub`
- 개인 작업물은 `editors/*`, `designers/*`
- 모바일이나 단발성 자료만 `inbox`

이름이 애매한 자료는 새 최상위 폴더를 만들지 말고, 먼저 [mini-pc-company-hub-taxonomy.md](/Users/jangjiho/workspace/pressco21/docs/파트너클래스/mini-pc-company-hub-taxonomy.md) 기준으로 가장 가까운 카테고리에 넣는 것이 좋다.

## 9. 업로드 후 무슨 일이 일어나는지

업로드한 파일은 바로 최종 폴더로 가지 않는다.

흐름은 이렇다.

1. 사람이 `inbox` 에 파일 업로드
2. 시스템이 파일 업로드가 끝났는지 기다림
3. 자동 정리기가 파일을 목적 폴더로 이동
4. 이동 기록을 `catalog` 에 남김

예:

- 업로드: `inbox/youtube/raw/interview-01.mp4`
- 자동 정리 후:
  - `youtube/raw/2026/2026-03/interview-01.mp4`

보통은 `20분~1시간` 정도 기다리면 된다.

## 10. 파일이 안 보일 때

아래 순서대로 확인한다.

1. `inbox` 에서 사라졌는지 본다.
2. 최종 폴더를 본다.
3. 없으면 `quarantine` 폴더를 본다.
4. 그래도 없으면 관리자에게 알린다.

관리자에게 전달할 정보:

1. 파일명
2. 어느 폴더에 올렸는지
3. 대략 몇 시에 올렸는지

## 11. 관리자가 평소에 확인할 것

관리자는 아래 정도만 보면 된다.

### 1. 브라우저 접속 확인

- 로그인 화면이 열리는지
- 직원 계정으로 `inbox` 만 보이는지
- 작업자 라이브러리 계정으로 `worker-library` 만 보이는지
- 관리자 계정으로 `active-sync`, `publish-queue`, `archive-sync` 가 보이는지

### 2. 백업이 최근에도 들어왔는지 확인

백업은 미니PC 안에 자동으로 저장된다.

관리자가 터미널을 볼 수 있으면 아래 파일을 보면 된다.

- `/srv/pressco21-backup-node/oracle/state/last-sync.txt`

이 파일에는 마지막 동기화 시각과 개수가 기록된다.

### 3. 자동 정리기가 최근에도 돌았는지 확인

- `/srv/pressco21-content/catalog/latest-run.txt`

### 4. creator sync 경로가 보이는지 확인

- `/srv/pressco21-content/active-sync`
- `/srv/pressco21-content/publish-queue`
- `/srv/pressco21-content/archive-sync`
- `/srv/pressco21-content/worker-library`
- `/srv/pressco21-content/publish-minio-ready`

### 5. archive 확정이 최근에도 돌았는지 확인

- `/var/lib/pressco21/creator-archive-sync.latest`

### 6. 디스크가 너무 차지 않았는지 확인

현재 구조의 권장 역할은 아래와 같다.

- `1TB SSD`
  - 현재 작업 중인 자동 동기화 자료
- `4TB HDD`
  - Oracle 장기 백업
  - 완료 프로젝트 archive

운영 기준:

- 70% 이하: 정상
- 75%: 경고
- 80% 이상: 정리 시작
- 90% 이상: 긴급 대응

## 12. 미니PC를 어떻게 두면 되는지

평소 운영은 아래 상태가 좋다.

- 미니PC 본체: 켜둠
- 전원: 계속 연결
- 인터넷: 가능하면 유선 연결
- 모니터: 평소에는 없어도 됨
- 키보드: 평소에는 없어도 됨
- 외장 SSD/HDD: 연결 후 가능하면 상시 연결

즉, 최종적으로는 모니터와 키보드 없이도 운영 가능하다.

다만 아래 상황에서는 모니터/키보드가 필요할 수 있다.

- 부팅 문제
- 인터넷 문제
- 외장 디스크 인식 문제
- 비밀번호 입력이 필요한 작업

## 13. 외장 SSD/HDD 역할

- `1TB SSD`
  - 자주 열고 수정하는 creator sync 자료
  - `PRESSCO21_ACTIVE`
- `4TB HDD`
  - Oracle 백업
  - 완료 프로젝트 archive
  - `PRESSCO21_ARCHIVE`

다만 외장 디스크 안에 개인 자료가 있다면 전체 포맷 대신 회사 전용 폴더를 따로 만드는 방식으로 간다.

예:

- `PRESSCO21_CONTENT`
- `PRESSCO21_BACKUP`

## 14. 이 시스템으로 최종적으로 가능한 것

이 시스템은 단순 외장하드 보관이 아니라 아래 기능을 목표로 한다.

- Oracle 서버 운영 백업 자동 수집
- 회사 자료 원격 보관
- 직원 브라우저 업로드
- 자동 폴더 정리
- 외부에서도 접속 가능
- 나중에 SSD/HDD 확장 가능

즉, 최종 목표는:

- 회사 자료를 한 곳에 모으고
- 밖에서도 안전하게 보고
- 사람이 자주 개입하지 않아도
- 자동 백업과 자동 정리가 되게 하는 것

## 15. 관리자 빠른 요약

관리자 입장에서 핵심만 다시 정리하면:

1. File Browser 에 접속한다.
2. 영상 편집자와 웹디자이너는 자동 동기화 경로를 메인으로 쓴다.
3. 직원은 `pressco21-upload` 계정으로 예외 업로드만 하게 한다.
4. 작업자가 자료를 다시 내려받을 때는 `pressco21-library` 계정을 쓰게 한다.
5. 로컬 삭제는 `archive-sync` 에 자료가 잡힌 뒤에만 하게 한다.
6. 미니PC는 계속 켜둔다.
7. 관리자 계정으로 `active-sync`, `publish-queue`, `archive-sync` 를 확인한다.
8. 중요한 자료는 나중에 월 1회 외부 사본도 남긴다.
