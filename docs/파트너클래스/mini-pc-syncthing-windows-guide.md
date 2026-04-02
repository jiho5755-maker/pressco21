# PRESSCO21 Windows Syncthing 설치 가이드

작성일: 2026-03-19

이 문서는 윈도우 작업자가 회사 보관소 자동 동기화를 붙이는 방법을 비전공자 기준으로 정리한다.

## 1. 이 방식이 왜 필요한가

회사의 목표는 이것이다.

1. 작업자가 자기 컴퓨터에서 편집한다
2. 회사 보관소로 자동 업로드된다
3. 나중에 다시 필요하면 보관소에서 다운로드한다

즉:

- 카톡으로 원본/최종본을 보관하지 않는다
- 브라우저에 매번 대용량 파일을 수동 업로드하지 않는다
- 작업 폴더만 잘 지키면 자동으로 회사 자료가 쌓인다

## 2. 먼저 알아둘 것

윈도우 PC 는 네트워크 드라이브 위에서 직접 편집하는 구조가 아니다.

실제 방식:

1. 내 PC 로컬 디스크에서 작업
2. Syncthing 이 백그라운드에서 mini PC 로 동기화
3. mini PC 가 회사 보관소 역할
4. `archive-sync` 에 보인 뒤 로컬 삭제

## 3. 설치 파일 받는 방법

공식 다운로드 페이지 기준으로, 새 사용자는 user friendly integration 부터 고르라고 안내한다.

권장:

- `Syncthing Windows Setup`

링크:

- https://syncthing.net/downloads/

설치 순서:

1. Edge 또는 Chrome 을 연다.
2. `https://syncthing.net/downloads/` 로 들어간다.
3. `Syncthing Windows Setup` 를 클릭한다.
4. 다운로드된 설치 파일 `.exe` 를 실행한다.

## 4. 설치할 때 보통 이렇게 선택하면 된다

설치창에서 큰 문제 없으면 아래 원칙으로 간다.

1. 설치 계속
2. 현재 사용자 기준 설치 또는 일반 설치 선택
3. 시작 메뉴 바로가기 허용
4. 윈도우 시작 시 자동 시작 허용
5. 방화벽 허용 창이 뜨면 허용

핵심:

- Syncthing 이 부팅 후 자동 시작되게 두는 게 좋다
- 방화벽 차단을 하면 다른 장치와 연결이 안 될 수 있다

## 5. 설치가 끝난 뒤 확인

설치가 끝나면 보통 브라우저가 자동으로 열리거나, 작업표시줄에 Syncthing 관련 아이콘이 생긴다.

브라우저에서 직접 열고 싶으면:

- `http://127.0.0.1:8384`

정상이라면 Syncthing 관리 화면이 보인다.

## 6. 내 윈도우 PC device ID 확인 방법

1. Syncthing 화면 오른쪽 위 `Actions`
2. `Show ID`
3. 나오는 긴 영문/숫자/대시 조합을 복사

이 값을 관리자에게 전달하면 된다.

공식 FAQ 기준으로 device ID 자체는 비밀 정보가 아니다. 다만 회사 장치 정보이니 업무 범위 안에서만 공유하면 된다.

## 7. mini PC 를 원격 장치로 추가하는 방법

mini PC device ID:

- `3XE4MY5-RZZL5WU-2LQMH2Z-7MGQWLU-IUZVOIL-3WJXJEW-LWEQDA2-4MHRAAC`

추가 순서:

1. `Add Remote Device` 클릭
2. Device ID 칸에 위 값 붙여넣기
3. Device Name 은 `PRESSCO21 Backup`
4. 저장

## 8. 내 PC 폴더를 어떻게 만들면 되는가

가장 쉬운 방식은 `문서` 또는 `D:` 같은 작업용 드라이브 아래에 전용 폴더를 만드는 것이다.

### 영상 편집자

- `D:\\PRESSCO21_SYNC\\raw`
- `D:\\PRESSCO21_SYNC\\project`
- `D:\\PRESSCO21_SYNC\\export`

### 웹디자이너

- `D:\\PRESSCO21_SYNC\\source`
- `D:\\PRESSCO21_SYNC\\export`
- `D:\\PRESSCO21_SYNC\\publish`

만약 `D:` 드라이브가 없으면 `내 문서` 아래에 만들어도 된다.

예:

- `C:\\Users\\내이름\\Documents\\PRESSCO21_SYNC\\raw`

## 9. Syncthing 에 폴더 등록하는 방법

각 폴더마다 아래를 반복한다.

1. `Add Folder` 클릭
2. `Folder ID` 입력
3. `Folder Label` 입력
4. `Path` 에 실제 폴더 선택
5. `Folder Type` 을 `Send Only` 로 선택
6. `Sharing` 탭에서 `PRESSCO21 Backup` 체크
7. 저장

### 영상 편집자 권장 Folder ID

- `editor-youtube-editor-raw`
- `editor-youtube-editor-project`
- `editor-youtube-editor-export`

### 웹디자이너 권장 Folder ID

- `designer-web-designer-source`
- `designer-web-designer-export`
- `designer-web-designer-publish`

중요:

- `youtube-editor`, `web-designer` 는 회사에서 정한 slug 예시다
- 실제 작업자별 slug 는 관리자가 정해줄 수 있다

## 10. 실제 작업 방법

### 영상 편집자

- 받은 원본은 `raw`
- 편집 프로젝트 파일은 `project`
- 최종 렌더본은 `export`

### 웹디자이너

- PSD, AI, 원본은 `source`
- 납품 또는 전달용 파일은 `export`
- 웹 게시 후보 이미지는 `publish`

원칙:

- 카톡은 리뷰용 저용량 파일만
- 실제 원본/작업본/최종본은 Syncthing 폴더에 둔다

## 11. 언제 로컬 파일을 지워도 되는가

절대 기준:

1. Syncthing 상에서 동기화 완료
2. mini PC `archive-sync` 에 자료가 보임
3. 그 뒤 로컬 삭제

즉, 회사 보관소에 확정 복사되기 전에는 지우지 않는다.

## 12. 다시 자료를 받고 싶을 때

작업자는 File Browser 다운로드 전용 계정을 쓴다.

경로:

- `worker-library/active-sync`
- `worker-library/archive-sync`
- `worker-library/legacy-ssd-by-role`
- `worker-library/publish-ready`
- `worker-library/publish-minio-ready`

여기서 필요한 자료를 다시 내려받으면 된다.

## 13. 속도가 느릴 때 가장 먼저 볼 것

공식 FAQ 기준으로 느린 동기화는 아래를 먼저 본다.

1. 연결 타입이 relay 인지
2. 네트워크 속도 자체가 느린지
3. 장치 CPU 가 너무 약한지

회사 운영 기준 추가 권장:

1. 가능하면 편집 PC 도 유선랜
2. mini PC 는 유선랜
3. 초기 대용량 동기화는 야간에
4. 윈도우 절전 모드로 PC 가 잠들지 않게 설정

## 14. 설치 후 관리자에게 무엇을 보내야 하는가

딱 세 가지만 보내면 된다.

1. 역할
   - `editor` 또는 `designer`
2. slug
   - 예: `youtube-editor`, `web-designer`
3. 내 Syncthing device ID

그러면 관리자가 mini PC 보관소와 최종 연결을 이어서 처리할 수 있다.
