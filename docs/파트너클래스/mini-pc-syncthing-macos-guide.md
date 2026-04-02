# PRESSCO21 Mac Syncthing 설치 가이드

작성일: 2026-03-19

이 문서는 맥북 사용자가 회사 보관소 자동 동기화를 붙이는 방법을 비전공자 기준으로 정리한다.

이 문서는 두 경우를 같이 다룬다.

1. 현재 관리자 맥북처럼 내가 이미 대신 설치해줄 수 있는 경우
2. 다른 맥 작업자가 직접 따라 해야 하는 경우

## 1. 먼저 이해해야 할 것

맥북은 네트워크 드라이브처럼 회사 보관소를 직접 열어서 작업하는 구조가 아니다.

실제 흐름은 이렇다.

1. 내 맥북 로컬 폴더에서 작업
2. Syncthing 이 자동으로 미니PC에 복사
3. 미니PC가 회사 보관소 역할
4. `archive-sync` 에 파일이 보이면 그때부터 로컬 삭제 가능
5. 다시 필요하면 보관소에서 다운로드

즉:

- 작업은 맥북에서 한다
- 업로드는 자동이다
- 보관은 미니PC가 한다

## 2. 현재 master 맥북 상태

현재 이 맥북은 이미 아래까지 완료되어 있다.

- Syncthing 설치 완료
- 로그인 시 자동 시작 설정 완료
- mini PC 와 직접 연결 완료
- `master` 영상/디자인 폴더 6개 연결 완료
- 테스트 파일이 mini PC `active-sync` 와 `archive-sync` 까지 들어가는 것 확인 완료

현재 이 맥북 device ID:

- `A5ZX5K6-TNPVENS-T7UEIOR-UBG52BU-ZYHYTRD-P3KLJSJ-LOSXD6D-ZIA5IQ5`

현재 이 맥북 로컬 작업 폴더:

- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/video/raw`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/video/project`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/video/export`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/design/source`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/design/export`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/design/publish`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/company-hub/internal-docs`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/company-hub/brand-assets`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/company-hub/brand-system`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/company-hub/templates`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/company-hub/sales-kits`
- `/Users/jangjiho/PRESSCO21_MASTER_SYNC/company-hub/operations`

즉 현재 관리자 맥북은 추가 설치가 아니라, 바로 이 폴더를 쓰면 된다.

## 3. 맥 작업자가 직접 설치해야 할 때

공식 다운로드 페이지 기준으로, 새 사용자는 user friendly integration 부터 고르라고 안내한다.

권장:

- 공식 다운로드 페이지에서 `syncthing-macos` 사용

링크:

- https://syncthing.net/downloads/

### 가장 쉬운 설치 순서

1. Safari 를 연다.
2. `https://syncthing.net/downloads/` 로 들어간다.
3. `syncthing-macos` 를 클릭한다.
4. 다운로드된 앱 또는 설치 파일을 연다.
5. `Applications` 로 옮기거나 안내대로 설치한다.
6. Syncthing 을 한 번 실행한다.
7. 브라우저가 자동으로 뜨면 그대로 둔다.

처음 실행하면 Syncthing 이:

- 설정 파일 생성
- 암호키 생성
- 로컬 관리 화면 실행

을 자동으로 한다.

공식 getting started 문서도 첫 실행 시 GUI 가 `127.0.0.1:8384` 에 열린다고 안내한다.

## 4. 설치가 잘 됐는지 확인하는 방법

브라우저 주소창에 아래를 넣는다.

- `http://127.0.0.1:8384`

정상이라면 Syncthing 관리 화면이 열린다.

화면에서 확인할 것:

- 오른쪽에 `This Device` 또는 `현재 기기`
- 아래쪽에 `Add Remote Device` 또는 `다른 기기 추가`
- 왼쪽에 `Add Folder` 또는 `폴더 추가`

## 5. 내 맥북 device ID 확인 방법

1. Syncthing 화면 오른쪽 위 `Actions`
2. `Show ID`
3. 나오는 긴 영문/숫자/대시 조합을 복사

중요:

- device ID 는 비밀번호가 아니다
- 공식 FAQ 기준으로 device ID 자체는 민감 정보가 아니다
- 하지만 엉뚱한 사람에게 마구 뿌릴 필요는 없다

## 6. mini PC 를 원격 장치로 추가하는 방법

mini PC device ID:

- `3XE4MY5-RZZL5WU-2LQMH2Z-7MGQWLU-IUZVOIL-3WJXJEW-LWEQDA2-4MHRAAC`

추가 순서:

1. `Add Remote Device` 클릭
2. Device ID 칸에 위 값을 붙여넣기
3. Device Name 은 `PRESSCO21 Backup` 으로 입력
4. 저장

여기까지 하면 맥북은 mini PC 를 알게 된다.

## 7. 맥북 로컬 폴더 만들기

맥북 Finder 에서 홈 폴더 아래에 아래 구조를 만든다.

### 영상 편집자

- `PRESSCO21_SYNC/raw`
- `PRESSCO21_SYNC/project`
- `PRESSCO21_SYNC/export`

### 웹디자이너

- `PRESSCO21_SYNC/source`
- `PRESSCO21_SYNC/export`
- `PRESSCO21_SYNC/publish`

### 관리자 master 용 권장 구조

- `PRESSCO21_MASTER_SYNC/video/raw`
- `PRESSCO21_MASTER_SYNC/video/project`
- `PRESSCO21_MASTER_SYNC/video/export`
- `PRESSCO21_MASTER_SYNC/design/source`
- `PRESSCO21_MASTER_SYNC/design/export`
- `PRESSCO21_MASTER_SYNC/design/publish`
- `PRESSCO21_MASTER_SYNC/company-hub/internal-docs`
- `PRESSCO21_MASTER_SYNC/company-hub/brand-assets`
- `PRESSCO21_MASTER_SYNC/company-hub/brand-system`
- `PRESSCO21_MASTER_SYNC/company-hub/templates`
- `PRESSCO21_MASTER_SYNC/company-hub/sales-kits`
- `PRESSCO21_MASTER_SYNC/company-hub/operations`

## 8. 폴더를 Syncthing 에 등록하는 방법

각 폴더마다 아래를 반복한다.

1. `Add Folder` 클릭
2. `Folder ID` 입력
3. `Folder Label` 입력
4. `Path` 에 실제 폴더 선택
5. `Folder Type` 을 `Send Only` 로 선택
6. `Sharing` 탭에서 `PRESSCO21 Backup` 체크
7. 저장

### master 기준 권장 Folder ID

영상:

- `editor-master-raw`
- `editor-master-project`
- `editor-master-export`

디자인:

- `designer-master-source`
- `designer-master-export`
- `designer-master-publish`

공용 허브:

- `shared-master-company-hub`

## 9. 실제 작업 방법

### 영상

- 원본은 `raw`
- 편집 프로젝트 파일은 `project`
- 최종 렌더본은 `export`

### 디자인

- 소스는 `source`
- 내보낸 파일은 `export`
- 웹 공개 후보는 `publish`

### 회사 공용 자료

- 내부문서는 `company-hub/internal-docs`
- 브랜드 자산은 `company-hub/brand-assets`
- 브랜드 가이드는 `company-hub/brand-system`
- 템플릿은 `company-hub/templates`
- 회사소개서/제안서는 `company-hub/sales-kits`
- 운영 문서는 `company-hub/operations`

실제로는 아래 세부 폴더까지 나눠서 넣는 것이 좋다.

- `company-hub/internal-docs/01-company-profile`
- `company-hub/internal-docs/02-policies-sop`
- `company-hub/brand-assets/01-logos`
- `company-hub/brand-system/01-brand-guidelines`
- `company-hub/templates/02-slide-templates`
- `company-hub/sales-kits/01-company-overview`
- `company-hub/operations/03-manuals`

상세 기준:

- `docs/파트너클래스/mini-pc-company-hub-taxonomy.md`

중요:

- 카톡은 리뷰용 저용량 파일만
- 원본, 프로젝트 파일, 최종 마스터는 Syncthing 폴더에 둔다

## 10. 언제 로컬 파일을 지워도 되는가

바로 지우면 안 된다.

안전한 기준:

1. Syncthing 에서 동기화 완료 표시
2. 관리자 또는 본인이 File Browser 에서 `archive-sync` 확인
3. 그 뒤 로컬 삭제

즉:

- `active-sync` 보임 = 아직 작업 중
- `archive-sync` 보임 = 회사 보관소 확정

## 11. 다시 파일을 받고 싶을 때

작업자는 File Browser 의 다운로드 전용 계정을 사용한다.

보는 경로:

- `worker-library/active-sync`
- `worker-library/archive-sync`
- `worker-library/legacy-ssd-by-role`
- `worker-library/publish-ready`
- `worker-library/publish-minio-ready`

## 12. 업로드 속도가 느릴 때

공식 FAQ 기준으로 먼저 볼 것은 세 가지다.

1. `Relay` 연결인지 확인
2. 네트워크 속도 자체 확인
3. 느린 장치나 CPU 병목인지 확인

현재 회사 운영 기준 추가 권장:

1. 미니PC 는 유선랜 사용
2. 큰 파일은 휴대폰보다 맥북 사용
3. 동기화 중에는 맥북 덮개를 닫아 절전시키지 않기
4. 초기 대량 동기화는 밤에 돌리기

## 13. 내가 직접 해줄 수 있는 것

현재 관리자 맥북처럼 이 대화가 열린 맥북은 내가 직접 할 수 있다.

내가 직접 가능한 일:

- Syncthing 설치
- 자동 시작 설정
- 로컬 작업 폴더 생성
- mini PC 장치 등록
- `master` 폴더 연결

내가 직접 못 하는 일:

- 다른 사람 맥북에 원격 접속 권한 없이 앱 설치
- 다른 사람 맥북의 Finder 폴더를 대신 선택
- 다른 사람 맥북의 first-run 보안 팝업 승인

즉 다른 맥 작업자는:

1. 설치
2. 첫 실행
3. 자기 device ID 전달

까지만 해주면, 나머지 mini PC 쪽 연결은 내가 이어서 맞춰줄 수 있다.
