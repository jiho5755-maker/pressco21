# PRESSCO21 Creator Sync Strategy

작성일: 2026-03-19

## 1. 목표

이 문서는 회사 자료 보관소를 `자동화 중심`으로 운영하기 위한 최종 추천 구조를 정리한다.

핵심 목표는 세 가지다.

- 영상 편집자와 웹디자이너의 작업물이 자동으로 모이게 만들기
- Oracle 운영 백업과 회사 작업 자료를 한곳에서 체계적으로 보관하기
- `내부 보관소`와 `외부 게시용 이미지`를 분리해서 운영하기

## 2. 최종 추천 구조

### Oracle 서버

- 실제 운영 서비스 실행
- `n8n`, `NocoDB`, `CRM` 운영
- 최근 hot backup 생성

### 미니PC

- 회사 자료 중앙 저장소
- Oracle 장기 백업 저장소
- Syncthing 수신 노드
- active -> archive 확정 자동화 노드
- File Browser 관리/예외 업로드 포털

### 저장 장치 역할

- `1TB SSD`
  - 현재 작업 중인 자료
  - 자동 동기화 대상의 active storage
- `4TB HDD`
  - Oracle 장기 백업
  - 오래된 프로젝트와 장기 archive

## 3. 자료 입구를 어떻게 나누는가

### 자동 동기화

자동 동기화는 `정식 작업 라인`이다.

- 영상 편집자: Syncthing
- 웹디자이너: Syncthing

이 방식의 장점:

- 업로드 버튼을 누르지 않아도 됨
- 누락 가능성이 크게 줄어듦
- 대용량 파일에서 브라우저 업로드보다 안정적임
- 작업 PC에서 저장하는 순간 회사 보관소와 연결됨

### 수동 업로드

수동 업로드는 `예외 처리 라인`이다.

- 모바일 업로드
- 급한 단발성 파일
- 외부 협력자 전달 자료
- 관리자 수동 분류 자료

즉, `File Browser inbox`는 없애지 않고 남겨두되 메인 경로로 쓰지 않는다.

## 4. 왜 둘 다 자동 동기화가 맞는가

디자이너 자료가 앞으로 계속 늘어날 가능성이 높다면, 처음부터 자동화 기준으로 설계하는 편이 낫다.

이유:

- 나중에 다시 업무 습관을 바꾸는 비용이 큼
- PSD, AI, 원본 이미지, export 이미지가 계속 누적됨
- 수동 업로드는 사람이 바쁠 때 가장 먼저 누락됨

따라서 추천 기본값은:

- 디자이너도 자동 동기화
- 편집자도 자동 동기화
- File Browser는 예외와 관리자 확인용

## 5. 내부 보관소와 공개 이미지 서버는 다른 문제다

내부 보관소는 `원본과 작업본을 안전하게 보관하는 시스템`이다.

공개 이미지 서버는 `웹에 노출할 파일을 빠르게 전달하는 시스템`이다.

둘은 같지 않다.

권장 방향:

- 내부 원본/작업본: 미니PC 보관소
- 웹 공개용 이미지: 메이크샵 이미지뱅크 또는 이후 별도 publish 레이어

즉, 당장은 `내부 저장소`와 `공개 게시`를 분리해서 운영하는 것이 맞다.

## 6. 추천 폴더 구조

### SSD active storage

`/mnt/pressco21-ssd/PRESSCO21_ACTIVE`

- `editors/{name}/raw`
- `editors/{name}/project`
- `editors/{name}/export`
- `designers/{name}/source`
- `designers/{name}/export`
- `designers/{name}/publish`
- `shared/company-hub/internal-docs`
- `shared/company-hub/brand-assets`
- `shared/company-hub/brand-system`
- `shared/company-hub/templates`
- `shared/company-hub/sales-kits`
- `shared/company-hub/operations`
- `shared/publish-queue`
- `publish/reviewed`
- `publish/makeshop-ready`

### HDD archive storage

`/mnt/pressco21-hdd/PRESSCO21_ARCHIVE`

- `editors/{name}`
- `designers/{name}`
- `shared`
- `publish`

### Oracle backup storage

Oracle 장기 백업은 별도 경로에 유지한다.

- `/mnt/pressco21-hdd/PRESSCO21_BACKUP/backup-node`

### MinIO placeholder publish storage

향후 자체 이미지호스팅 서버와 연결할 경로를 미리 분리한다.

- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/publish/minio-stage`
- `/mnt/pressco21-ssd/PRESSCO21_ACTIVE/publish/minio-ready`
- `/mnt/pressco21-hdd/PRESSCO21_ARCHIVE/publish/minio-history`

## 7. Syncthing 운영 원칙

### 작업자 PC

- 각 작업자 폴더를 `send-only`로 사용
- 작업은 항상 자기 PC 로컬 저장소에서 수행
- 네트워크 드라이브 위에서 직접 편집하지 않음

### 미니PC

- 대응 폴더는 `receive-only`
- 중앙 보관소 역할만 수행
- 관리자만 전체 구조를 점검
- 별도 archive sync 가 active 자료를 HDD archive 로 확정 보관한다

### 중요한 주의

Syncthing 폴더를 현재 File Browser `inbox`와 겹치게 잡으면 안 된다.

이유:

- `inbox`는 자동 정리기가 파일을 이동시키는 구조
- Syncthing은 같은 폴더를 계속 동기화하는 구조
- 두 시스템을 같은 경로에 두면 충돌 가능성이 높다

그래서:

- `inbox` = 수동 업로드 전용
- `PRESSCO21_ACTIVE` = 자동 동기화 전용
- `PRESSCO21_ARCHIVE` = 로컬 삭제와 무관하게 남는 확정 보관 전용

## 8. 운영 시나리오

### 영상 편집자

1. 자기 PC의 Syncthing 폴더에 원본 저장
2. 프로젝트 파일 저장
3. export 저장
4. 미니PC에 자동 반영

### 웹디자이너

1. 자기 PC의 Syncthing 폴더에 source 저장
2. export 이미지 저장
3. publish 대상 파일 정리
4. 미니PC에 자동 반영

### 관리자

1. File Browser 관리자 계정으로 active-sync 확인
2. `company-hub` 아래 공용 문서와 브랜드 자산을 관리
2. archive-sync 에 자료가 확정 복사됐는지 확인
3. publish-queue 와 MinIO placeholder 경로를 검토
4. 필요 시 메이크샵 이미지뱅크로 업로드

## 8-1. 회사 공용 자료는 어떻게 넣는가

회사 공용 자료는 `company-hub` 를 메인 보관소로 쓴다.

상세 분류 기준은 별도 문서를 본다.

- `docs/파트너클래스/mini-pc-company-hub-taxonomy.md`

권장 분류:

- `internal-docs`
  - 회사 프로필
  - 정책/SOP
  - 법무/계약
  - 회의/의사결정
  - 관리/세무 참고
- `brand-assets`
  - 로고
  - 폰트
  - 아이콘
  - 사진/영상 소스
  - 그래픽 원본
- `brand-system`
  - 브랜드 가이드
  - 컬러
  - 타이포
  - 톤앤매너
  - 레퍼런스
- `templates`
  - 문서
  - 슬라이드
  - 시트
  - 디자인
  - 영상 템플릿
- `sales-kits`
  - 회사소개서
  - 원페이저
  - 제안서
  - 사례집
  - 외부 전달 자료
- `operations`
  - 자동화
  - 체크리스트
  - 매뉴얼
  - 외부 도구 가이드
  - 시스템 맵

즉, 작업자 개인 산출물은 `editors/*`, `designers/*` 에 두고, 회사 공용 자산은 `company-hub` 에 둔다.

## 9. 지금 단계에서 세팅할 것

이번 단계의 목표:

- 미니PC에 Syncthing 설치
- creator sync 기본 폴더 구조 생성
- active -> archive 자동 확정 타이머 생성
- File Browser에서 `active-sync`, `publish-queue`, `archive-sync` 확인 가능하게 연결
- 향후 MinIO publish 경로를 미리 분리

이번 단계에서 아직 남는 것:

- 실제 디자이너/편집자 PC 페어링
- 작업자별 폴더 등록
- publish 레이어 자동화
- MinIO 실제 업로드 로직 연결

## 10. 권장 운영 결론

가장 추천하는 구조는 아래와 같다.

- Oracle 운영 백업: 현재 자동화 유지
- 편집자: 자동 동기화
- 디자이너: 자동 동기화
- File Browser: 모바일/예외 업로드 + 관리자 점검
- 메이크샵 이미지호스팅: 당분간 publish 대상

즉, `회사 내부 보관소는 자동화 중심`, `외부 공개 이미지는 별도 publish 레이어`로 가는 것이 최적안이다.
