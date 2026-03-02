# PRESSCO21 수수료 정책 (확정판)

> 작성일: 2026-02-26 | Task 294 산출물

---

## 파트너 등급별 수수료 정책

| 등급 | 수수료율 | 적립금 전환율 | 예시 (10만원 수강료 기준) |
|------|---------|------------|-------------------------|
| SILVER | 20% | 80% | 수수료 2만원 → 적립금 1.6만원 |
| GOLD | 25% | 80% | 수수료 2.5만원 → 적립금 2만원 |
| PLATINUM | 30% | 80% | 수수료 3만원 → 적립금 2.4만원 |

**계산식:**
- `commission_amount = order_amount × commission_rate / 100`
- `reserve_amount = commission_amount × reserve_rate / 100`

**적립금 지급 일정:** 수강 완료 D+3 영업일 이내

---

## n8n WF-05 상수 (확인됨)

```javascript
// WF-05 주문 폴링 - 수수료 계산 상수
const COMMISSION_RATES = {
    SILVER: 20,
    GOLD: 25,
    PLATINUM: 30
};
const DEFAULT_RESERVE_RATE = 80;
```

## n8n WF-13 등급 업그레이드 기준 (확인됨)

| 등급 | 누적 매출 기준 |
|------|-------------|
| SILVER (초기) | 파트너 승인 시 자동 부여 |
| GOLD | 누적 매출 500만원 이상 |
| PLATINUM | 누적 매출 2000만원 이상 |

**참고:** 등급 강등 없음 (상위 등급만 변경)

---

## NocoDB 필드 구성 (Task 294 완료)

### tbl_Partners 추가 필드
| 필드명 | 타입 | 용도 |
|-------|------|------|
| `instagram_url` | URL | 파트너 인스타그램 (기존) |
| `phone` | PhoneNumber | 파트너 전화번호 (기존) |
| `kakao_channel` | URL | 파트너 카카오톡 채널 (신규 추가) |

### tbl_Classes 추가 필드 (신규)
| 필드명 | 타입 | 용도 |
|-------|------|------|
| `contact_instagram` | URL | 강의별 인스타그램 연락처 |
| `contact_phone` | PhoneNumber | 강의별 전화번호 |
| `contact_kakao` | URL | 강의별 카카오톡 채널 |

### tbl_Reviews 추가 필드 (신규)
| 필드명 | 타입 | 용도 |
|-------|------|------|
| `is_admin_created` | Checkbox | 관리자 생성 후기 표시 (내부 추적용, 프론트 미노출) |

---

## NocoDB 필드 추가 방법 (향후 참고)

현재 NocoDB v0.301.2는 REST API를 통한 column 추가가 불가능합니다.
(POST /api/v1/db/meta/projects/.../columns → 404)

대신 두 가지 방법 사용 가능:

### 방법 1: NocoDB GUI (권장)
1. `https://nocodb.pressco21.com` 로그인
2. 테이블 선택 → `+` 버튼으로 필드 추가

### 방법 2: SQLite 직접 수정 (Task 294에서 사용한 방법)
```bash
# 서버에 SSH 접속
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201

# SQLite 수정 (sudo 필요)
sudo python3 << 'EOF'
import sqlite3, random, string, time

DB_PATH = '/home/ubuntu/nocodb/nocodb_data/noco.db'
# ... (ALTER TABLE + nc_columns_v2 INSERT + nc_grid_view_columns_v2 INSERT)
EOF

# NocoDB 재시작 + 네트워크 재연결
docker restart nocodb && sleep 12
docker network connect n8n_n8n-network nocodb
```

> ⚠️ SQLite 직접 수정 후 반드시 NocoDB 재시작 + n8n 네트워크 재연결 필요

---

## 정책 적용 확인

| 항목 | 적용 위치 | 상태 |
|------|----------|------|
| SILVER 20% | WF-05, tbl_Partners | ✅ 확인됨 |
| GOLD 25% | WF-05, tbl_Partners | ✅ 확인됨 |
| PLATINUM 30% | WF-05, tbl_Partners | ✅ 확인됨 |
| reserve_rate 80% | WF-05 | ✅ 확인됨 |
| D+3 정산 | WF-05 스케줄 | ✅ 확인됨 |
| tbl_Partners 연락처 필드 | NocoDB | ✅ 추가 완료 |
| tbl_Classes 연락처 필드 | NocoDB | ✅ 추가 완료 |
| tbl_Reviews is_admin_created | NocoDB | ✅ 추가 완료 |
