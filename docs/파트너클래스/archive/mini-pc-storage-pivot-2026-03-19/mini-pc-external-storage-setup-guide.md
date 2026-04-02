# PRESSCO21 미니PC 외장 저장소 연결 가이드

작성일: 2026-03-18

## 목적

미니PC의 내장 512GB는 운영체제와 프로그램만 맡기고, 외장 SSD/HDD를 회사 자료 저장소로 확장한다.

현재 권장 방향:

- `1TB 외장 SSD`: 자주 열고 수정하는 회사 자료
- `4TB 외장 HDD`: Oracle 백업과 장기 보관 자료

## 가장 중요한 원칙

1. 외장디스크에 개인 자료가 있으면 포맷하지 않는다.
2. 디스크 전체를 회사용으로 쓰지 말고, 회사 전용 최상위 폴더만 새로 만든다.
3. 미니PC에 상시 연결해 둔다.
4. 가능하면 미니PC는 유선랜으로 운영한다.

## 권장 최종 역할

### SSD

- 회사 현재 작업 자료
- `PRESSCO21_CONTENT`
  - `inbox`
  - `shared`
  - `catalog`
  - `youtube/project`
  - `youtube/export`
  - `reels/project`
  - `reels/export`

### HDD

- 회사 장기 자료와 서버 백업
- `PRESSCO21_BACKUP`
  - Oracle daily/monthly backup
  - 오래된 `raw`
  - 오래된 `archive`
  - 복구 전용 자료

## 내일 실제 진행 순서

### 1. 물리 연결

1. 미니PC를 종료한다.
2. `1TB 외장 SSD` 와 `4TB 외장 HDD` 를 미니PC 본체 USB 포트에 직접 연결한다.
3. 가능하면 USB 허브는 쓰지 않는다.
4. 외장 HDD 전원 어댑터가 따로 있으면 반드시 연결한다.
5. 유선랜도 연결한다.
6. 미니PC 전원을 켠다.

### 2. 자료 보존 원칙

외장디스크 안 개인 자료를 지울 수 없다면:

- SSD 안에 `PRESSCO21_CONTENT` 폴더만 새로 만든다.
- HDD 안에 `PRESSCO21_BACKUP` 폴더만 새로 만든다.
- 개인 자료는 그대로 둔다.

이 경우에도 자동화는 가능하다.
다만 디스크 전체를 회사 운영에 쓰는 것보다 관리 난이도는 조금 올라간다.

### 3. 연결 후 해야 할 말

드라이브를 꽂고 미니PC를 켠 뒤, Codex에게 다음처럼 말하면 된다.

```text
연결했어
```

그러면 다음을 원격으로 확인한다.

- 어떤 장치가 SSD인지, HDD인지
- 파일시스템이 무엇인지
- 현재 남은 용량이 얼마나 되는지
- 포맷 없이 병행 가능한지

### 4. 파일시스템 판단 기준

- `ext4`: 가장 좋음
- `exfat`: 병행 사용 가능
- `ntfs`: 병행 사용 가능하지만 Linux 서버용으로는 다소 덜 깔끔함
- `apfs`: 먼저 확인 필요. Ubuntu 운영 저장소로 바로 쓰는 것은 권장하지 않음

## 준비된 스크립트

### 1. 디스크 확인

```bash
bash scripts/server/mini-pc-storage-audit.sh
```

이 스크립트는:

- 외장디스크 목록
- 파일시스템
- 마운트 상태
- UUID
- 현재 사용량

을 한 번에 보여준다.

### 2. 경로 전환 드라이런

```bash
sudo BACKUP_TARGET_ROOT="/mnt/hdd/PRESSCO21_BACKUP" \
CONTENT_TARGET_ROOT="/mnt/ssd/PRESSCO21_CONTENT" \
bash scripts/server/mini-pc-storage-migrate.sh
```

기본값은 `dry-run` 이다.
즉 실제로 옮기지 않고 무엇을 할지만 보여준다.

### 3. 실제 전환

```bash
sudo BACKUP_TARGET_ROOT="/mnt/hdd/PRESSCO21_BACKUP" \
CONTENT_TARGET_ROOT="/mnt/ssd/PRESSCO21_CONTENT" \
APPLY=1 \
bash scripts/server/mini-pc-storage-migrate.sh
```

이 스크립트는:

1. 백업/콘텐츠 관련 서비스를 멈춘다.
2. 기존 `/srv/pressco21-backup-node`, `/srv/pressco21-content` 를 외장디스크의 회사 폴더로 복사한다.
3. 내부 경로를 백업본으로 바꾸고 외장디스크 폴더를 symlink 로 연결한다.
4. 타이머와 File Browser 를 다시 켠다.

## 왜 symlink 방식을 쓰는가

- 기존 자동화 스크립트 경로를 바꾸지 않아도 된다.
- 실수로 내부 디스크에 다시 쓰는 일을 줄일 수 있다.
- 외장디스크가 빠지면 서비스가 바로 에러를 내므로 문제를 빨리 발견할 수 있다.

## 최종 목표

외장디스크 연결이 끝나면:

- Oracle 백업은 미니PC HDD 쪽에 자동 저장
- SNS 자료는 SSD/HDD 로 역할 분리 저장
- 직원들은 File Browser 에서 `inbox` 로만 업로드
- 관리자는 Tailscale 로 외부에서도 확인 가능

이 구조가 완성되면 회사 자료를 미니PC 한 곳에서 원격으로 운영할 수 있다.
