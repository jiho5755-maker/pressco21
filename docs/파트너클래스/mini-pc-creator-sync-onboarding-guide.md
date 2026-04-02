# PRESSCO21 Creator Sync Onboarding Guide

작성일: 2026-03-19

이 문서는 영상 편집자와 웹디자이너를 자동 동기화 체계에 등록할 때 쓰는 관리자용 가이드다.

작업자에게 바로 전달할 문서는 아래를 참고한다.

- `docs/파트너클래스/mini-pc-syncthing-pairing-guide.md`
- `docs/파트너클래스/mini-pc-syncthing-macos-guide.md`
- `docs/파트너클래스/mini-pc-syncthing-windows-guide.md`

## 1. 원칙

- 작업자는 자기 PC에서 작업한다.
- 작업 PC는 Syncthing `send-only`
- 미니PC는 `receive-only`
- 큰 파일은 File Browser `inbox` 대신 자동 동기화를 메인으로 쓴다.

## 2. 등록 순서

### 1. 미니PC에서 작업자 폴더를 먼저 만든다

미니PC에서 아래 스크립트를 실행한다.

#### 영상 편집자

```bash
ROLE=editor CREATOR_SLUG=editor-name bash ~/pressco21/scripts/server/mini-pc-creator-sync-onboard.sh
```

#### 웹디자이너

```bash
ROLE=designer CREATOR_SLUG=designer-name bash ~/pressco21/scripts/server/mini-pc-creator-sync-onboard.sh
```

권장 slug 규칙:

- 영문 소문자
- 숫자 가능
- `-`, `_`, `.`

예:

- `mina-video`
- `brand-design`
- `youtube-editor`
- `web-designer`
- `master`

### 2. 작업자 PC에 Syncthing 설치

- Windows 또는 Mac에 Syncthing 설치
- 관리자에게 받은 mini PC device ID 추가

mini PC device ID 확인 위치:

- `/home/pressbackup/pressco21/syncthing-mini-pc-info.txt`

### 3. 역할별 폴더를 등록한다

#### 영상 편집자

- `raw`
- `project`
- `export`

권장 folder id:

- `editor-{slug}-raw`
- `editor-{slug}-project`
- `editor-{slug}-export`

#### 웹디자이너

- `source`
- `export`
- `publish`

권장 folder id:

- `designer-{slug}-source`
- `designer-{slug}-export`
- `designer-{slug}-publish`

## 3. 미니PC 경로

### 영상 편집자

- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/editors/{slug}/raw`
- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/editors/{slug}/project`
- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/editors/{slug}/export`

### 웹디자이너

- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/designers/{slug}/source`
- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/designers/{slug}/export`
- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/designers/{slug}/publish`

## 4. 작업자 PC 운영 규칙

- 네트워크 드라이브 위에서 직접 편집하지 않는다.
- 항상 작업자 PC 로컬 디스크에서 편집한다.
- 최종 저장 위치가 Syncthing 동기화 폴더이도록 맞춘다.
- 카톡은 리뷰용 저용량 파일만 쓴다.
- 원본, 프로젝트, 최종본은 카톡으로 보관하지 않는다.
- 미니PC `archive-sync` 에 자료가 보이면 로컬 파일을 지워도 된다.
- 다시 필요할 때는 File Browser `pressco21-library` 계정으로 다운로드한다.

## 5. 관리자 점검 포인트

- mini PC `Syncthing` 서비스가 켜져 있는지
- 작업자 폴더가 `PRESSCO21_ACTIVE` 아래에 있는지
- File Browser 관리자 계정에서 `active-sync` 아래 자료가 보이는지
- 작업자 라이브러리 계정에서 `worker-library` 아래 자료가 보이는지
- publish 대상은 `publish-queue` 와 `publish-ready` 로 분리되는지
- MinIO 대상은 `publish-minio-ready` 로 별도 분리되는지

## 6. 예외 상황

- 모바일에서 잠깐 올리는 짧은 파일: `inbox`
- 외부 협력자가 Syncthing 설치를 못 하는 경우: `inbox`
- 대용량 정식 작업 파일: Syncthing

## 7. 현재 master 상태

현재 관리자 맥북은 `master` slug 로 아래 두 역할이 모두 연결되어 있다.

- `editor/master`
- `designer/master`

즉 다음 작업자는 아래처럼 붙이면 된다.

- 영상 편집자: `ROLE=editor CREATOR_SLUG=youtube-editor`
- 웹디자이너: `ROLE=designer CREATOR_SLUG=web-designer`
