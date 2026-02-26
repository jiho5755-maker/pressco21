# NocoDB 필드 추가 완료 기록 (Task 294)

> 작성일: 2026-02-26

---

## 추가된 필드 목록

### tbl_Partners

| 필드명 | 타입 | Column ID | 비고 |
|-------|------|-----------|------|
| `instagram_url` | URL | csenj11yssiott0 | 기존 (Phase 2에서 추가됨) |
| `phone` | PhoneNumber | crr3pd3wzuge80u | 기존 (Phase 2에서 추가됨) |
| `kakao_channel` | URL | csbuvbja87i8opmy | **Task 294에서 신규 추가** |

### tbl_Classes

| 필드명 | 타입 | Column ID | 비고 |
|-------|------|-----------|------|
| `contact_instagram` | URL | cf6lzcj4196k5iz5 | **Task 294에서 신규 추가** |
| `contact_phone` | PhoneNumber | cjshgjb8zeyi0dou | **Task 294에서 신규 추가** |
| `contact_kakao` | URL | calaiulorrm48o58 | **Task 294에서 신규 추가** |

### tbl_Reviews

| 필드명 | 타입 | Column ID | 비고 |
|-------|------|-----------|------|
| `is_admin_created` | Checkbox | cuiyk64y29wmwz56 | **Task 294에서 신규 추가** |

---

## 검증 결과

NocoDB API로 필드 노출 확인:
```
tbl_Partners.kakao_channel: ✅ (None - 초기값)
tbl_Classes.contact_instagram: ✅ (None - 초기값)
tbl_Classes.contact_phone: ✅ (None - 초기값)
tbl_Classes.contact_kakao: ✅ (None - 초기값)
tbl_Reviews.is_admin_created: ✅ (None - 초기값)
```

---

## 추가 방법 요약 (SQLite 직접 수정)

NocoDB v0.301.2에서는 REST API로 column 추가가 불가 (404 에러).
아래 3단계로 SQLite 직접 수정:

1. **ALTER TABLE** — 실제 데이터 테이블에 컬럼 추가
2. **nc_columns_v2 INSERT** — 컬럼 메타데이터 등록 (source_id, base_id, pk, rqd, un, ai, dtx, fk_workspace_id, order 필드 필수)
3. **nc_grid_view_columns_v2 INSERT** — 그리드 뷰에 컬럼 표시 등록

수정 후 반드시:
```bash
docker restart nocodb && sleep 12
docker network connect n8n_n8n-network nocodb
```
