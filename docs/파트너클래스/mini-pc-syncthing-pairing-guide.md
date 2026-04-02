# PRESSCO21 Syncthing 실제 페어링 가이드

작성일: 2026-03-19

이 문서는 영상 편집자와 웹디자이너가 실제로 Syncthing 을 붙여서 회사 보관소와 연결하는 방법을 정리한다.

설치 단계가 필요한 경우 아래 문서를 먼저 본다.

- 맥 사용자: `docs/파트너클래스/mini-pc-syncthing-macos-guide.md`
- 윈도우 사용자: `docs/파트너클래스/mini-pc-syncthing-windows-guide.md`

## 1. 먼저 이해해야 할 구조

작업자는 `자기 컴퓨터 로컬 폴더`에서 일한다.

즉:

- 작업은 항상 내 컴퓨터에서 함
- Syncthing 이 백그라운드에서 미니PC로 자동 복사
- 미니PC는 회사 보관소 역할

중요:

- 네트워크 드라이브 위에서 직접 편집하는 구조가 아니다.
- 내 컴퓨터에서 편집하면서, 동시에 미니PC로 자동 업로드되는 구조다.

## 2. 실제 작업 흐름

### 영상 편집자

1. 촬영 원본을 `raw` 폴더에 넣는다.
2. 편집 프로젝트 파일은 `project` 폴더에 저장한다.
3. 최종 렌더본은 `export` 폴더에 저장한다.
4. Syncthing 이 자동으로 미니PC에 복사한다.
5. 나중에 `archive-sync` 에 보이면 그때부터 로컬에서 지워도 된다.
6. 다시 필요하면 보관소에서 다시 다운로드한다.

즉, 질문하신 방식 그대로 맞다.

- 원본은 먼저 `raw`
- 편집하면서 프로젝트는 `project`
- 편집본은 `export`

다만 `로컬 삭제`는 바로 하지 말고, 관리자나 본인이 `archive-sync` 쪽에 보이는 걸 확인한 뒤에 하는 것이 맞다.

### 웹디자이너

1. 원본 소스는 `source`
2. 내보낸 산출물은 `export`
3. 외부 게시 후보는 `publish`
4. Syncthing 이 자동으로 미니PC에 복사한다.
5. `archive-sync` 에 들어간 뒤부터 로컬 삭제 가능
6. 다시 필요하면 다운로드 가능

## 3. 작업자 입장에서 가장 쉬운 결론

- 작업은 내 컴퓨터에서 한다.
- 저장 위치만 Syncthing 폴더로 맞춘다.
- 업로드 버튼은 누르지 않는다.
- 지우기 전에는 `archive-sync` 확인
- 다시 필요하면 `pressco21-library` 계정으로 다운로드

## 4. mini PC 정보

현재 mini PC Syncthing device ID:

- `3XE4MY5-RZZL5WU-2LQMH2Z-7MGQWLU-IUZVOIL-3WJXJEW-LWEQDA2-4MHRAAC`

mini PC 기록 파일:

- `/home/pressbackup/pressco21/syncthing-mini-pc-info.txt`

## 5. 실제 페어링 순서

가장 쉬운 실제 운영 방식은 아래다.

### 작업자가 할 일

1. 자기 컴퓨터에 Syncthing 설치
2. Syncthing 실행
3. `Add Remote Device` 또는 `원격 장치 추가`를 누름
4. mini PC device ID 입력
5. 장치 이름을 `PRESSCO21 Backup` 정도로 저장
6. 자기 폴더를 만든 뒤 `Add Folder`
7. 그 폴더를 mini PC 장치와 공유

### 관리자가 할 일

1. mini PC에서 공유 요청 수락
2. 해당 폴더를 올바른 경로에 연결
3. mini PC 쪽은 `receive-only` 로 유지

즉, 실제로는:

- 작업자는 자기 PC에서 mini PC를 추가
- 관리자는 mini PC에서 승인

이렇게 2단계로 끝난다.

## 6. 작업자 PC에서 폴더를 어떻게 만들면 되는가

### 영상 편집자 권장 구조

예:

- `D:/PRESSCO21_SYNC/raw`
- `D:/PRESSCO21_SYNC/project`
- `D:/PRESSCO21_SYNC/export`

맥이면 예:

- `/Users/이름/PRESSCO21_SYNC/raw`
- `/Users/이름/PRESSCO21_SYNC/project`
- `/Users/이름/PRESSCO21_SYNC/export`

### 웹디자이너 권장 구조

예:

- `D:/PRESSCO21_SYNC/source`
- `D:/PRESSCO21_SYNC/export`
- `D:/PRESSCO21_SYNC/publish`

## 7. 작업자 PC에서 Syncthing 설정할 때 중요한 점

### 폴더 타입

작업자 PC는 가능하면 `send-only`

이유:

- 작업자는 자기 컴퓨터에서 파일을 만들고 올리는 역할
- 서버 쪽 변화가 작업자 PC를 덮어쓰지 않게 하는 편이 안전

### 파일 저장 위치

- 항상 로컬 SSD/HDD
- 외장 저장소나 네트워크 드라이브 위에서 직접 편집하지 않기

### 삭제 시점

- `active-sync` 에 보인다고 바로 삭제하지 않기
- `archive-sync` 까지 들어간 뒤 삭제

## 8. 누가 어떤 경로를 쓰는가

### 영상 편집자

- mini PC active:
  - `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/editors/{slug}/raw`
  - `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/editors/{slug}/project`
  - `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/editors/{slug}/export`

### 웹디자이너

- mini PC active:
  - `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/designers/{slug}/source`
  - `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/designers/{slug}/export`
  - `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/designers/{slug}/publish`

## 9. 다시 다운로드할 때

작업자는 File Browser 에서 아래 계정을 쓴다.

- 계정: `pressco21-library`
- 용도: 다운로드 전용

여기서 보는 경로:

- `worker-library/active-sync`
- `worker-library/archive-sync`
- `worker-library/legacy-ssd-by-role`
- `worker-library/publish-ready`
- `worker-library/publish-minio-ready`

즉 작업자가 예전 파일을 다시 받고 싶으면:

1. File Browser 로그인
2. `worker-library` 이동
3. 필요한 폴더에서 다운로드

## 10. 관리자가 mini PC 쪽에서 실제 승인하는 방법

이 부분은 내가 원격으로 처리할 수 있다.

즉 실제 운영은 이렇게 하는 것이 가장 쉽다.

1. 작업자가 Syncthing 설치
2. 작업자가 자기 device ID 를 관리자에게 전달
3. 관리자가 mini PC 에서 승인/연결
4. 작업자는 폴더만 계속 사용

비전공자 기준으로는 이 방식이 가장 단순하다.

## 11. 지금 당장 필요한 정보

작업자 1명을 붙이려면 아래 3개만 있으면 된다.

1. 작업자 역할
   - `editor` 또는 `designer`
2. slug
   - 예: `mina-video`, `brand-design`
3. 작업자 컴퓨터 Syncthing device ID

이 3개가 있으면 mini PC 쪽 준비를 바로 할 수 있다.

## 12. master, youtube-editor, web-designer 를 어떻게 쓰는가

현재 회사 권장 이름은 아래다.

- 관리자 본인: `master`
- 영상 편집자: `youtube-editor`
- 웹디자이너: `web-designer`

중요:

- Syncthing 내부 역할 타입은 `editor`, `designer` 두 가지다.
- `master` 는 역할 이름이 아니라 slug 다.
- 즉 `master` 는 아래 두 세트를 같이 가진다.
  - `editors/master/*`
  - `designers/master/*`

예:

- `youtube-editor` 는 보통 `editor` 역할로 등록
- `web-designer` 는 보통 `designer` 역할로 등록
- `master` 는 두 역할을 둘 다 생성

## 13. 현재 master 는 이미 연결 완료 상태

현재 관리자 맥북은 이미 아래까지 끝났다.

- Syncthing 설치 완료
- mini PC device 등록 완료
- `master` 영상 폴더 3개 연결 완료
- `master` 디자인 폴더 3개 연결 완료
- 테스트 파일이 mini PC `active-sync`, `archive-sync` 까지 들어가는 것 확인 완료

즉 현재 관리자 본인은 추가 설치보다 아래 로컬 폴더를 바로 쓰면 된다.

- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/video/raw`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/video/project`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/video/export`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/design/source`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/design/export`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/design/publish`
