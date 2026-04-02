# PRESSCO21 미니PC 장기 백업 노드 가이드

작성일: 2026-03-17

## 목적

Oracle Cloud 서버는 서비스 실행과 최근 7일 hot backup만 유지한다.
미니PC는 장기 백업 저장소 역할만 맡는다.

핵심 목표:

- 사람이 수동으로 옮기지 않아도 Oracle 백업이 미니PC로 자동 이동
- Oracle 디스크는 가볍게 유지
- 향후 서비스가 늘어나도 저장소와 실행 서버를 분리
- OpenClaw 없이도 백업 파이프라인이 독립적으로 동작
- 성공/실패와 stale 상태를 n8n `backup-notify` webhook 으로 자동 알림

## 현재 미니PC 판단

사용자가 제공한 사진 라벨 기준:

- 모델 표기: `W6`
- CPU: `Intel Alder Lake N100`
- Memory: `16GB`
- Storage: `512GB`

이 사양이면 백업 저장 노드로 시작하기에 충분하다.
다만 장기적으로 여러 서비스를 계속 백업할 계획이면, 내장 512GB만으로는 언젠가 한계가 온다.
권장 방향은 다음과 같다.

- 1단계: 내장 SSD로 시작
- 2단계: 외장 SSD 1TB 이상을 `/srv/pressco21-backup-node` 쪽으로 확장

## 권장 아키텍처

```text
Oracle VM
  └─ /home/ubuntu/backups
     ├─ 최근 7일 hot backup
     └─ monthly

Mini PC
  └─ /srv/pressco21-backup-node/oracle
     ├─ daily
     ├─ monthly
     └─ state
```

동작 방식:

1. Oracle 서버가 매일 백업을 만든다.
2. 미니PC가 매일 밤 Oracle 서버에서 새 백업만 pull 한다.
3. 미니PC는 daily 180일, monthly 12개월 보관한다.
4. Oracle 서버는 최근 7일만 유지한다.

이 구조를 택한 이유:

- push 가 아니라 pull 이라 미니PC가 잠깐 꺼져도 다음 실행 때 밀린 백업을 가져올 수 있다.
- Oracle 서버에 미니PC 저장소 로그인 정보를 넣지 않아도 된다.
- OpenClaw 유무와 무관하게 계속 동작한다.

## OpenClaw 역할 경계

OpenClaw는 이 파이프라인의 핵심 구성요소가 아니다.
5개월만 쓸 수 있다면 더더욱 백업 경로에 넣지 않는 것이 맞다.

권장:

- 백업 파이프라인: `SSH + rsync + systemd timer`
- OpenClaw: 필요하면 알림/운영 질의용 보조 수단

## 설치 순서

### 1. 미니PC OS

권장 OS:

- Ubuntu Server 24.04 LTS

권장 기본 패키지:

- `openssh-server`
- `tailscale`
- `rsync`

### 2. Oracle 서버 접속 키 준비

미니PC에 Oracle 서버 접속 키를 둔다.

예시:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cp oracle-n8n.key ~/.ssh/oracle-n8n.key
chmod 600 ~/.ssh/oracle-n8n.key
```

### 3. 네트워크 연결

가장 좋은 방식:

- Oracle 서버와 미니PC 모두 `Tailscale` 연결
- `SOURCE_HOST`는 Tailscale hostname 또는 Tailscale IP 사용

### 4. 설치 스크립트 실행

미니PC에서 저장소를 받은 뒤:

```bash
cd pressco21
bash scripts/server/install-mini-pc-backup-node.sh
```

설치되면 다음 파일이 생성된다.

- 실행 스크립트: `/usr/local/bin/pressco21-mini-pc-backup.sh`
- 헬스체크 스크립트: `/usr/local/bin/pressco21-mini-pc-backup-healthcheck.sh`
- 환경 파일: `/etc/pressco21/mini-pc-backup-node.env`
- systemd service: `pressco21-mini-pc-backup.service`
- systemd timer: `pressco21-mini-pc-backup.timer`
- systemd service: `pressco21-mini-pc-backup-healthcheck.service`
- systemd timer: `pressco21-mini-pc-backup-healthcheck.timer`

기본 타이머 일정:

- `23:30 Asia/Seoul`
- systemd 표기: `*-*-* 23:30:00`
- `RandomizedDelaySec=10m` 이라 실제 실행은 23:30~23:40 사이가 될 수 있다.
- `Persistent=true` 라 미니PC가 꺼져 있다가 켜져도 놓친 실행을 따라잡는다.
- 헬스체크는 `hourly` 로 돌아가며 마지막 성공 동기화 시각, 타이머 활성 상태, 디스크 여유를 점검한다.

### 5. 환경 파일 수정

```bash
sudo nano /etc/pressco21/mini-pc-backup-node.env
```

기본 예시:

```bash
SOURCE_HOST="ubuntu@pressco21-automation"
SSH_KEY="/home/ubuntu/.ssh/oracle-n8n.key"
SOURCE_BACKUP_ROOT="/home/ubuntu/backups"
LOCAL_ROOT="/srv/pressco21-backup-node/oracle"
MIN_BACKUP_AGE_MINUTES="90"
LOCAL_RETENTION_DAYS="180"
LOCAL_MONTHLY_RETENTION_MONTHS="12"
MIN_FREE_GB="30"
MAX_SYNC_AGE_HOURS="36"
ALERT_REPEAT_HOURS="6"
BACKUP_NOTIFY_WEBHOOK="https://n8n.pressco21.com/webhook/backup-notify"
LOG_DIR="/var/log/pressco21"
```

### 6. 수동 테스트

```bash
sudo systemctl start pressco21-mini-pc-backup.service
journalctl -u pressco21-mini-pc-backup.service -n 100 --no-pager
cat /srv/pressco21-backup-node/oracle/state/last-sync.txt
```

### 7. 자동 실행 확인

```bash
systemctl status pressco21-mini-pc-backup.timer
systemctl list-timers | grep pressco21-mini-pc-backup
systemctl status pressco21-mini-pc-backup-healthcheck.timer
systemctl list-timers | grep pressco21-mini-pc-backup-healthcheck
```

예상 next run 이 `23:30` 부근으로 보이면 정상이다.

## 보관 정책

Oracle 서버:

- daily: 7일
- monthly: 3개월

미니PC:

- daily: 180일
- monthly: 12개월

나중에 외장 SSD를 추가하면 다음 방향으로 키운다.

- daily: 365일
- monthly: 24개월

## 로그와 상태 파일

- 실행 로그: `/var/log/pressco21/mini-pc-backup-pull.log`
- 헬스체크 로그: `/var/log/pressco21/mini-pc-backup-healthcheck.log`
- 마지막 동기화 상태: `/srv/pressco21-backup-node/oracle/state/last-sync.txt`

## 장애 시 확인 순서

1. Oracle SSH 접속 확인
2. Tailscale 연결 확인
3. 미니PC 디스크 여유 확인
4. service 로그 확인

예시:

```bash
df -h /srv/pressco21-backup-node/oracle
ssh -i ~/.ssh/oracle-n8n.key ubuntu@pressco21-automation 'hostname'
journalctl -u pressco21-mini-pc-backup.service -n 200 --no-pager
journalctl -u pressco21-mini-pc-backup-healthcheck.service -n 200 --no-pager
```

## 다음 확장 단계

이 가이드는 장기 백업 저장 노드까지만 다룬다.
향후 다음을 같은 미니PC에 추가할 수 있다.

- MinIO: 일반 파일 저장소
- File Browser: 브라우저 기반 파일 확인
- restic: 암호화/중복제거 백업 저장소
- Telegram 알림: 실패 알림 자동화
- SNS 자료 저장소: `raw / project / export / archive` 분리 구조
