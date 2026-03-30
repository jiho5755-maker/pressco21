# 수동 코드 추출 절차서

> 편집기 코드를 로컬 `makeshop-skin/` 폴더로 가져오는 수동 절차.
> Claude Code가 없을 때 디자이너/대표가 직접 수행할 수 있다.

---

## 방법 1: Claude Code에 요청 (권장)

1. 메이크샵 편집기에서 원하는 페이지를 연다
2. Claude Code에 요청: **"이 페이지 pull 해줘"**
3. Claude가 Chrome MCP로 코드를 자동 추출하여 로컬 파일 업데이트

---

## 방법 2: 수동 추출 (Chrome 콘솔)

### 단일 탭 추출

1. 메이크샵 편집기에서 원하는 페이지 열기
2. 원하는 탭(HTML/CSS/JS) 클릭
3. F12 → Console 탭 열기
4. 아래 명령어 실행:

```javascript
// 현재 보이는 CodeMirror 에디터의 내용 추출
copy(document.querySelector('.CodeMirror').CodeMirror.getValue())
```

5. 클립보드에 복사된 코드를 해당 로컬 파일에 붙여넣기

### 전체 탭 한번에 추출

```javascript
// 모든 탭의 코드를 JSON으로 추출
(function() {
  var tabs = [];
  document.querySelectorAll('.CodeMirror').forEach(function(el, i) {
    var cm = el.CodeMirror;
    if (cm) tabs.push({ tab: i, code: cm.getValue() });
  });
  copy(JSON.stringify(tabs, null, 2));
  console.log(tabs.length + '개 탭 추출 완료 (클립보드에 복사됨)');
})();
```

---

## 추출 후 필수 작업

1. 로컬 파일에 코드 저장
2. git에 변경 커밋:
   ```bash
   cd pressco21
   git add makeshop-skin/
   git commit -m "sync: 편집기에서 코드 pull (디자이너 변경 반영)"
   ```
3. `_sync/SYNC-STATUS.md`의 `마지막 pull 시각` 업데이트

---

## 파일 매핑 확인

로컬 파일과 편집기 위치의 매핑은 `_sync/editor-map.json` 참조.

| 편집기 위치 | 로컬 경로 |
|------------|----------|
| 공통 CSS-js > CSS | `_common/common.css` |
| 공통 CSS-js > JS | `_common/common.js` |
| 중앙 디자인 > 메인 > HTML | `main/main.html` |
| 중앙 디자인 > 메인 > CSS | `main/main.css` |
| 개별 페이지 (id=2606) | `pages/partnerclass-list/` |

전체 매핑: `editor-map.json` (538개 파일)

---

## 주의사항

- 추출한 코드에서 `\${variable}` 이스케이프가 `${variable}`로 표시될 수 있음
  → 로컬에 저장할 때는 이스케이프 유지 확인
- 가상태그 `<!-- -->`, `{$치환코드}` 등은 절대 수정하지 않는다
- 추출 시 편집기에 저장되지 않은 변경이 있으면 먼저 편집기에서 저장 후 추출
