# 미니 PC BIOS 전원복구 + RAID1 시행 계획

작성일: 2026-04-15

## 목표

미니 PC를 시놀로지 NAS에 가깝게 운영하기 위해 두 가지를 시행한다.

1. 전원 복구 자동화
   - 정전이나 멀티탭 차단 후 전기가 돌아오면 미니 PC가 자동으로 켜진다.
2. 디스크 고장 대응
   - RAID1 미러를 구성해 디스크 1개가 고장나도 백업 보관소가 바로 죽지 않게 한다.

RAID는 백업이 아니다. RAID1은 디스크 1개 고장에 대한 보험이고, 삭제/랜섬웨어/오염 파일 복구는 별도의 버전 백업과 스냅샷이 필요하다.

## 현재 상태

- OS: 내장 NVMe 512GB ext4
- 외장 SSD: 약 2TB exFAT, `/mnt/pressco21-ssd`
- 외장 HDD: 약 4TB NTFS, `/mnt/pressco21-hdd`
- HDD에는 개인/미디어 데이터가 약 2.4TB 있으므로 포맷 금지
- Oracle 백업은 현재 HDD에 저장되고, 내장 NVMe ext4에도 보조 미러가 있다.

현재 디스크만으로 RAID를 만들면 기존 데이터가 지워진다. 따라서 RAID용 새 디스크 2개가 필요하다.

## 차후 작업으로 보류한 항목

아래 항목은 하드웨어 연결 또는 현장 BIOS 조작이 필요하므로 지금은 계획으로만 둔다.

- BIOS `Power On after AC loss` 실제 적용
  - 현장에서 모니터와 키보드가 필요하다.
  - 적용 후 전원 차단/복구 테스트를 한다.
- 4TB급 HDD 추가 구매 및 연결
  - 현재 HDD와 같은 용량 또는 더 큰 용량을 권장한다.
  - 가능하면 같은 모델 4TB HDD가 가장 깔끔하다.
- 기존 4TB NTFS HDD 데이터 이전
  - 현재 HDD에는 개인/미디어 데이터가 있으므로 바로 포맷하지 않는다.
  - RAID 구성 전에 필요한 데이터를 다른 곳으로 옮기거나 삭제 확정한다.
- HDD 2개 RAID1 생성
  - SSD는 RAID에 섞지 않고 빠른 작업공간으로 유지한다.
  - HDD 2개만 장기보관/중요자료용 RAID1로 묶는다.
- 백업 루트 RAID 이전
  - RAID 생성 후 `/srv/pressco21-backup-node`를 RAID 쪽으로 옮긴다.
- btrfs snapshot 정책 적용
  - RAID1은 디스크 고장 대응이고, snapshot은 삭제/덮어쓰기 대응이다.
  - RAID 생성 후 일/주/월 snapshot retention을 별도로 적용한다.
- 복구 리허설
  - 백업 파일 하나를 실제로 풀어보고, Nextcloud/Oracle 백업 복구 절차를 확인한다.

## 최종 권장 구조

현재 장비를 최대한 살리는 최적 구조는 다음과 같다.

```text
내장 NVMe 512GB
  - Ubuntu OS
  - Docker / Nextcloud DB / 설정
  - 긴급 ext4 미러

외장 SSD 약 2TB
  - 빠른 작업공간
  - Syncthing inbox
  - 업로드/분류/편집 staging

외장 HDD 4TB x 2
  - mdadm RAID1
  - btrfs
  - 장기보관
  - Oracle 백업
  - 회사 중요 자료 원본 보관소
```

즉, SSD와 HDD를 섞어서 RAID1로 묶지 않는다. SSD는 빠른 작업대, HDD 2개는 튼튼한 창고로 쓴다.

RAID1의 실제 사용 가능 용량은 작은 디스크 1개 기준이다.

```text
4TB HDD + 4TB HDD = 실제 사용 가능 약 4TB
```

남는 4TB는 낭비가 아니라 디스크 1개 고장에 대비한 실시간 복제 공간이다.

## 권장 하드웨어

최소 권장:

- 현재 4TB HDD와 같거나 더 큰 HDD 1개 추가
- 가능하면 같은 4TB 모델
- 더 안정적으로 새 4TB HDD 2개를 같은 모델로 준비
- 가능하면 같은 모델/제조사
- USB 외장 사용 시 각각 안정적인 전원 공급 필요
- 더 안정적으로는 2베이 USB DAS/JBOD 인클로저 사용

주의:

- 하드웨어 RAID 모드가 아니라 JBOD 모드로 연결한다.
- Linux에서 디스크 2개가 각각 보여야 한다.
- 기존 4TB NTFS HDD는 현재 데이터가 보관되어 있으므로 바로 RAID 생성용으로 쓰지 않는다. 먼저 데이터 이전이 끝난 뒤에만 재활용한다.

## BIOS 설정 계획

현장에서 모니터와 키보드를 연결한다.

1. 전원을 켠 직후 `Delete`를 여러 번 누른다.
2. 안 되면 재부팅 후 `F2`를 여러 번 누른다.
3. BIOS에서 아래 이름 중 하나를 찾는다.
   - `Restore on AC/Power Loss`
   - `Restore AC Power Loss`
   - `AC Back`
   - `AC Power Recovery`
   - `After Power Failure`
   - `State After G3`
4. 값을 `Power On`, `Always On`, 또는 `S0`로 바꾼다.
5. 가능하면 아래도 같이 설정한다.
   - `ErP` 또는 `EuP`: `Disabled`
   - `Wake on LAN`, `Resume by LAN`, `PME Wake`: `Enabled`
   - `Resume by RTC Alarm`, `RTC Wake`: `Enabled`
6. `F10`으로 저장하고 재부팅한다.

검증:

```bash
sudo poweroff
```

완전히 꺼진 뒤 전원 어댑터나 멀티탭 전원을 껐다가 다시 켠다. 전원 버튼 없이 미니 PC가 켜지면 성공이다.

## RAID1 생성 계획

새 디스크 2개를 연결한 뒤 먼저 audit만 실행한다.

```bash
sudo bash /home/pressbackup/pressco21/scripts/server/mini-pc-raid-audit.sh
```

출력에서 `/dev/disk/by-id/...` 형식의 안정적인 디스크 ID 2개를 고른다. `/dev/sda`, `/dev/sdb` 같은 이름은 재부팅 뒤 바뀔 수 있으므로 직접 사용하지 않는다.

실제 생성은 아래 형식으로만 진행한다.

```bash
sudo DISK1="/dev/disk/by-id/첫번째-새디스크" \
DISK2="/dev/disk/by-id/두번째-새디스크" \
I_UNDERSTAND_THIS_WIPES_DATA="YES" \
bash /home/pressbackup/pressco21/scripts/server/mini-pc-raid1-create.sh
```

생성 결과:

- mdadm RAID1: `/dev/md/pressco21_raid1`
- mount point: `/mnt/pressco21-raid`
- filesystem: btrfs
- label: `PRESSCO21_RAID1`
- company folders:
  - `/mnt/pressco21-raid/PRESSCO21_BACKUP`
  - `/mnt/pressco21-raid/PRESSCO21_ARCHIVE`
  - `/mnt/pressco21-raid/PRESSCO21_SNAPSHOTS`

## 운영 서비스

RAID 상태 확인과 scrub 타이머를 설치한다.

```bash
sudo bash /home/pressbackup/pressco21/scripts/server/install-mini-pc-raid-services.sh
```

설치되는 서비스:

- `pressco21-raid-healthcheck.timer`
  - 6시간마다 RAID degraded, mount, btrfs device stats 확인
- `pressco21-raid-scrub.timer`
  - 매월 btrfs scrub 실행

RAID 생성 전에도 타이머는 설치해둘 수 있다. RAID가 없으면 healthcheck는 실패가 아니라 `RAID not configured yet; skipping`으로 종료한다.

## 현재 미리 적용한 NAS 보강

새 HDD가 오기 전까지 아래 항목은 미리 적용해둔다.

- `pressco21-wol.service`
  - 유선랜 Wake-on-LAN 유지
- `pressco21-rtc-wake.timer`
  - 하루 4회 RTC 자동 기상 예약 갱신
- `pressco21-disk-alert.timer`
  - 외장 SSD/HDD 마운트와 용량 확인
- `pressco21-backup-ext4-mirror.timer`
  - Oracle 백업을 내장 NVMe ext4에 보조 미러링
- `pressco21-smart-healthcheck.timer`
  - SMART 상태 확인
  - USB 브리지가 SMART를 숨기면 그 사실을 warning으로 기록
- `pressco21-nas-config-backup.timer`
  - systemd, Nextcloud compose/env, tunnel key, PRESSCO21 운영 설정을 root-only tar.gz로 백업
- `pressco21-nas-status`
  - NAS 상태를 CLI에서 한 번에 확인하는 리포트 명령

## 백업 경로 이전 계획

RAID 생성 후 기존 백업 루트만 RAID로 옮긴다.

먼저 dry-run:

```bash
sudo bash /home/pressbackup/pressco21/scripts/server/mini-pc-raid-migrate-backup-root.sh
```

실제 적용:

```bash
sudo APPLY=1 bash /home/pressbackup/pressco21/scripts/server/mini-pc-raid-migrate-backup-root.sh
```

이 작업은 다음을 수행한다.

1. 백업 관련 타이머를 잠시 멈춘다.
2. 현재 `/srv/pressco21-backup-node` 내용을 RAID로 복사한다.
3. `/srv/pressco21-backup-node` symlink를 RAID 경로로 바꾼다.
4. 백업 서비스가 RAID 마운트 뒤 실행되도록 drop-in을 추가한다.
5. 타이머를 다시 켠다.

## 완료 검증

```bash
systemctl --failed --no-pager
findmnt /mnt/pressco21-raid
cat /proc/mdstat
sudo mdadm --detail /dev/md/pressco21_raid1
sudo btrfs filesystem usage /mnt/pressco21-raid
sudo systemctl start pressco21-raid-healthcheck.service
sudo systemctl start pressco21-mini-pc-backup-healthcheck.service
curl -sS https://backup.pressco21.com/status.php
```

정상 기준:

- 실패 유닛 0개
- RAID 상태가 `[UU]`
- `Active Devices`가 `Raid Devices`와 같음
- btrfs device stats 에러 0
- Nextcloud status 정상
- 백업 healthcheck 통과

## 장애 시 기대 동작

디스크 1개가 죽으면:

- RAID1은 degraded 상태로 계속 동작한다.
- n8n webhook으로 RAID 알림이 간다.
- 새 디스크를 교체하고 RAID에 다시 붙이면 재동기화한다.

전원이 끊기면:

- BIOS `Power On after AC loss`가 켜져 있으면 전기 복구 후 자동 부팅한다.
- Ubuntu가 올라오면 RAID, Nextcloud, reverse tunnel, 백업 타이머가 자동 복구된다.
- OS의 RTC wake와 Wake-on-LAN 설정은 보조 안전망으로 남는다.

## 시놀로지 NAS 대체 수준 평가

아래 항목까지 완료하면, PRESSCO21 내부 용도 기준으로는 통상적인 2베이 시놀로지 NAS의 핵심 역할을 상당히 대체한 것으로 본다.

완료 기준:

- 전원 복구
  - BIOS `Power On after AC loss`
  - RTC wake 보조
  - Wake-on-LAN 보조
- 저장소 안정성
  - HDD 2개 RAID1
  - btrfs 파일시스템
  - btrfs scrub
  - RAID degraded healthcheck
- 원격 파일 보관소
  - Nextcloud
  - File Browser
  - Syncthing
  - Oracle reverse tunnel
- 백업
  - Oracle backup pull
  - 내장 NVMe ext4 보조 미러
  - 주간 backup verify
  - NAS 설정 백업
- 운영 감시
  - disk mount/usage alert
  - SMART healthcheck
  - RAID healthcheck
  - `pressco21-nas-status` 상태 리포트

이 상태의 의미:

```text
시놀로지의 핵심 NAS 기능
  - 파일 보관
  - 원격 접근
  - 디스크 1개 고장 대응
  - 서비스 자동 복구
  - 기본 상태 알림
  - 백업 검증

위 항목은 직접 구현한 상태로 본다.
```

단, 상용 시놀로지와 완전히 같은 것은 아니다.

남는 차이:

- DSM 같은 통합 웹 관리 UI는 없다.
- 패키지 설치/업데이트 UI는 없다.
- Synology Drive, Photos 같은 완성형 앱 생태계는 없다.
- UPS 연동은 사용하지 않는다.
- 제조사 지원, 자동 펌웨어 호환성 검증, 하드웨어 보증은 없다.
- RAID1은 삭제/랜섬웨어를 막지 못한다.
- 장비 전체 고장, 도난, 화재에 대비한 오프사이트 백업은 별도로 필요하다.

따라서 최종 평가는 다음과 같다.

```text
사내 원격 보관소 / 백업 저장소 / Nextcloud 기반 파일 서버:
  충분히 시놀로지 NAS 대체 가능

비전문가가 웹 UI만으로 관리하는 상용 NAS:
  완전 동일하지 않음

디스크 1개 고장 대응:
  HDD 2개 RAID1 완료 후 가능

실수 삭제 / 랜섬웨어 대응:
  btrfs snapshot 또는 versioned backup 적용 후 가능

재난 복구:
  별도 오프사이트 백업까지 있어야 가능
```

PRESSCO21 운영 기준으로는 BIOS 전원복구, HDD 2개 RAID1, btrfs snapshot, 복구 리허설까지 끝나면 “실사용 가능한 시놀로지 NAS 대체 시스템”으로 간주한다. 다만 “상용 시놀로지와 100% 동일”이 아니라, CLI와 systemd 중심으로 직접 운영하는 DIY NAS다.
