# PRESSCO21 mini PC Nextcloud 운영 가이드

작성일: 2026-04-10
최종 갱신: 2026-04-11
상태: 운영 중

## 목적

- 웹디자이너와 일반 직원이 `브라우저 기반 공유드라이브`처럼 mini PC 저장소를 사용하도록 만든다.
- 영상팀장과 대표는 기존 Syncthing 라인을 유지한다.
- File Browser는 관리자 점검/비상용으로만 남긴다.

## 접속 주소

- 공개 도메인: `https://backup.pressco21.com`
- LAN: `http://192.168.0.54:18080`
- Tailscale: `http://100.76.25.105:18080`

## 공개 진입 구조

- 직원 공개 URL은 Oracle 서버가 먼저 받는다.
- Oracle Nginx가 mini PC Nextcloud로 reverse proxy 한다.
- Oracle에서 mini PC로 가는 백엔드 경로는 `reverse SSH tunnel`을 사용한다.
- mini PC는 공개 인터넷에 직접 노출하지 않는다.
- 대용량 업로드 최적화를 위해 Oracle Nginx는 `proxy_request_buffering off`, `proxy_buffering off`, `client_max_body_size 20G`로 설정한다.
- reverse tunnel 서비스:
  - systemd unit: `/etc/systemd/system/nextcloud-oracle-reverse-tunnel.service`
  - Oracle localhost backend: `127.0.0.1:18081`

## 계정 정책

- 공용 계정은 더 이상 쓰지 않는다.
- 사람별 계정을 발급하고 권한은 그룹으로 묶는다.
- 관리자 계정 정보는 mini PC의 `/home/pressbackup/pressco21/nextcloud-admin-credentials.txt`에서 확인한다.
- 직원 계정 정보는 mini PC의 `/home/pressbackup/pressco21/nextcloud-user-credentials.txt`에서 확인한다.
- 전체 계정 매트릭스는 `/home/pressbackup/pressco21/nextcloud-company-credentials.txt`에 저장한다.

## 현재 사용자 역할

- 관리자
  - `pressco21` (장지호)
  - `envyco` (이진선)
  - `브랜드`, `디자인`, `사진`, `내부문서`, `영상자료`, `관리자문서함` 접근 가능
- 직원
  - `cardboardwindow` (장다경)
  - `tmdgo1993` (조승해)
  - `jhl9464` (이재혁)
  - `브랜드`, `디자인`, `사진`, `내부문서`, `영상자료` 접근 가능

## 현재 폴더 구조

- `브랜드`
  - 카테고리 루트이며 직접 업로드하지 않는다.
  - `로고`
  - `브랜드가이드`
  - `템플릿`
  - `소개서-제안서`
  - 실제 원본 경로: `/home/pressbackup/pressco21/nextcloud/shared/library/brand`
- `디자인`
  - 카테고리 루트이며 직접 업로드하지 않는다.
  - `진행중-공유본`
  - `최종본`
  - `배포대기`
  - `캠페인별`
  - 실제 원본 경로: `/home/pressbackup/pressco21/nextcloud/shared/library/design`
- `사진`
  - 카테고리 루트이며 직접 업로드하지 않는다.
  - `상품`
  - `수업-행사`
  - `고객후기`
  - `선별원본`
  - 실제 원본 경로: `/home/pressbackup/pressco21/nextcloud/shared/library/photos`
- `내부문서`
  - 카테고리 루트이며 직접 업로드하지 않는다.
  - `회사기본`
  - `운영매뉴얼`
  - `회의-결정`
  - `양식-체크리스트`
  - 실제 원본 경로: `/home/pressbackup/pressco21/nextcloud/shared/library/internal-docs`
- `영상자료`
  - Syncthing으로 수집된 영상 자료를 읽기 전용으로 열람/다운로드
  - `장다경/촬영원본`
  - `장다경/편집프로젝트`
  - `장다경/완성본`
  - `장지호/촬영원본`
  - `장지호/편집프로젝트`
  - `장지호/완성본`
  - 실제 원본 경로: `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/editors`
- `관리자문서함`
  - 카테고리 루트이며 직접 업로드하지 않는다.
  - `매출-재무`
  - `계약-법무`
  - `인사-기밀`
  - 실제 원본 경로: `/home/pressbackup/pressco21/nextcloud/shared/admin-vault`

## 폴더 업로드 규칙

- `브랜드`, `디자인`, `사진`, `내부문서`, `관리자문서함`의 루트는 카테고리 입구다.
- 사용자는 루트 바로 아래에 파일을 올리지 않고, 반드시 한 단계 들어간 하위 폴더에 업로드한다.
- 루트가 read-only로 보이는 것은 정상이다.
- `영상자료`는 읽기/다운로드 용도다. 수동 업로드 라인으로 쓰지 않는다.

## 팀별 사용 방식

### 영상팀장/대표

- 기존 Syncthing 유지
- 대용량 `raw/project/export`는 Syncthing으로 업로드
- 필요 시 Nextcloud로 공용 문서와 에셋 열람

### 웹디자이너/일반 직원

- 본인 계정으로 Nextcloud 브라우저 로그인
- 파일 성격에 맞는 폴더에 바로 업로드/다운로드
- 로컬에서 작업 후 다시 같은 성격의 폴더로 정리
- 대용량 영상은 직접 업로드하지 않고 `영상자료`에서 내려받아 사용

### 관리자

- `pressco21` 또는 `envyco`로 Nextcloud 로그인
- 직원용 폴더를 모두 확인 가능
- 추가로 `관리자문서함`에서 매출자료, 계약서, 비밀 내부 문서를 보관

## 운영 원칙

- mini PC는 계속 `원청 보관소`로 본다.
- 대용량 영상 원본 주 저장은 Syncthing과 ACTIVE/ARCHIVE 흐름을 유지한다.
- Nextcloud는 `공용드라이브 포털` 역할에 집중한다.
- File Browser는 계속 `관리자 점검/비상 포털`로 유지한다.

## 다음 권장 작업

1. 직원용/관리자용 첫 로그인 테스트
2. 각 라이브러리 폴더 하위 구조를 실제 업무 기준으로 정리
3. 직원용 파일 분류 기준 문서화
4. 필요 시 Tailscale Serve HTTPS 검토
5. 필요 시 신규 직원 개인 계정 추가
