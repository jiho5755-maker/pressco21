# PRESSCO21 미니PC SNS 자료 저장소 계획

작성일: 2026-03-18

관련 문서:

- `docs/파트너클래스/mini-pc-external-storage-setup-guide.md`
- `docs/파트너클래스/mini-pc-content-upload-guide.md`

## 목표

미니PC를 백업 노드로 안정화한 뒤, 유튜브/릴스/쇼츠 같은 SNS 원본과 편집 산출물을 따로 보관하는 저장소로 확장한다.

핵심 원칙:

- 운영 백업과 SNS 자료를 같은 폴더에 섞지 않는다.
- `raw / project / export / archive` 를 분리한다.
- 처음에는 파일 저장소로 시작하고, 나중에 브라우저 UI와 오브젝트 저장소를 붙인다.

## 권장 디렉토리 구조

```text
/srv/pressco21-content
  ├─ inbox
  ├─ youtube
  │  ├─ raw
  │  ├─ project
  │  ├─ export
  │  └─ archive
  ├─ reels
  │  ├─ raw
  │  ├─ project
  │  ├─ export
  │  └─ archive
  ├─ shared
  │  ├─ brand-assets
  │  ├─ subtitles
  │  └─ thumbnails
  └─ catalog
```

의미:

- `inbox`: 핸드폰, 드라이브, 다운로드 폴더에서 임시로 들어오는 파일
- `raw`: 원본 영상/음원/촬영본
- `project`: CapCut, Premiere, Final Cut 같은 편집 파일
- `export`: 업로드 직전 완성본
- `archive`: 업로드 완료 후 장기 보관본
- `shared`: 썸네일 템플릿, BGM, 자막, 폰트 외 공용 자산
- `catalog`: 메타데이터 CSV/JSON, 업로드 로그, 썸네일 목록

## 자동 운영 구조

지금 기준 권장 흐름은 다음과 같다.

```text
Mac/iPhone/File Browser upload
  -> /srv/pressco21-content/inbox/*
  -> pressco21-content-curator.timer
  -> /srv/pressco21-content/{youtube,reels,shared,quarantine}
  -> /srv/pressco21-content/catalog/content-index.csv
```

핵심 동작:

- 사람이 직접 건드리는 곳은 `inbox` 만 쓴다.
- 정리 스크립트가 `inbox` 안 파일을 목적 폴더로 자동 이동한다.
- 파일이 완전히 올라온 뒤에만 옮기도록 `settle time` 을 둔다.
- 이동 이력은 `catalog/content-index.csv`, `catalog/content-index.jsonl` 로 남긴다.
- 분류 규칙에 맞지 않는 파일은 `quarantine` 으로 보낸다.

## inbox 업로드 규칙

업로드 위치만 맞추면 자동으로 정리된다.

- `inbox/youtube/raw`: 촬영 원본
- `inbox/youtube/project`: 편집 프로젝트 파일
- `inbox/youtube/export`: 업로드 전 완성본
- `inbox/reels/raw`: 릴스 원본
- `inbox/reels/project`: 릴스 편집 프로젝트
- `inbox/reels/export`: 릴스 최종본
- `inbox/shared/brand-assets`: 로고, 폰트, 템플릿
- `inbox/shared/subtitles`: 자막 파일
- `inbox/shared/thumbnails`: 썸네일 PSD/PNG/JPG

자동 정리 후에는 각 파일이 다음처럼 이동한다.

- `youtube/raw/2026/2026-03/...`
- `reels/export/2026/2026-03/...`
- `shared/thumbnails/2026/2026-03/...`

업로드한 파일명이 겹치면 자동으로 `__dup1`, `__dup2` 식으로 바꿔서 보관한다.

## 단계별 확장

### 1단계: 파일 저장소

- 미니PC 디렉토리와 `content curator` timer 를 먼저 만든다.
- 맥북, 아이폰, File Browser 에서 `inbox` 로만 올린다.
- 정리 스크립트가 hourly 로 자동 분류한다.

### 2단계: 브라우저 관리

- `File Browser` 를 붙여 브라우저에서 폴더를 볼 수 있게 만든다.
- 비전공자도 업로드/다운로드/이동이 쉬워진다.
- 로컬 기본 URL: `http://192.168.123.105:8090/login`
- Tailscale URL: `http://pressco21-backup.tailee581a.ts.net:8090/login`
- 첫 계정은 설치 시 자동 생성하고, 비밀번호는 미니PC의 `~/pressco21/content-browser-credentials.txt` 에 저장한다.

### 3단계: 앱 연동용 저장소

- `MinIO` 를 붙여 S3 호환 오브젝트 저장소로 쓴다.
- 앞으로 자동 업로드 스크립트, 썸네일 생성, AI 편집 파이프라인이 붙기 쉬워진다.

## 백업과 분리해야 하는 이유

- 백업은 복구를 위해 덜 건드리는 데이터다.
- SNS 자료는 자주 읽고 옮기고 지우는 작업 데이터다.
- 둘을 섞으면 폴더가 금방 지저분해지고, 보관 정책도 충돌한다.

그래서 권장 루트는 다음과 같다.

- 백업: `/srv/pressco21-backup-node`
- SNS 자료: `/srv/pressco21-content`

## 다음 작업 제안

1. `pressco21-content-curator.timer` 를 설치해 `inbox -> catalog` 자동화를 켠다.
2. File Browser 에서 `inbox` 만 주로 사용하도록 운영 규칙을 고정한다.
3. 외장 SSD 1TB 이상이 생기면 SNS 자료 루트를 그쪽으로 옮기기
4. MinIO 설치
5. 유튜브/릴스 업로드 이력 CSV 또는 Notion DB와 연결
