/**
 * PRESSCO21 x 꽃공예 협회 파트너십 제안서 PPT 생성
 * 색상 팔레트: Berry & Cream (프리미엄 플로럴 테마)
 *   - 딥 베리:  6D2E46
 *   - 더스트 로즈: A26769
 *   - 크림:     ECE2D0
 *   - 오프화이트: F7F3EF
 *   - 진한 텍스트: 2C1810
 *   - 포인트 골드: C9A96E
 */

const pptxgen = require("pptxgenjs");
const pres = new pptxgen();

pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
pres.author = "PRESSCO21";
pres.title = "PRESSCO21 x 꽃공예 협회 파트너십 제안서";
pres.subject = "협회 제휴 제안";

// ─── 공통 색상 상수 ────────────────────────────────────────────
const C = {
  berry:    "6D2E46",
  rose:     "A26769",
  cream:    "ECE2D0",
  offwhite: "F7F3EF",
  dark:     "2C1810",
  mid:      "5C3D35",
  gold:     "C9A96E",
  white:    "FFFFFF",
  light:    "F9F5F1",
};

// ─── 공통 그림자 팩토리 ─────────────────────────────────────────
const makeShadow = () => ({
  type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.12
});

// ─── 슬라이드 1: 타이틀 슬라이드 ─────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.berry };

  // 상단 장식 골드 라인
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.05, fill: { color: C.gold }, line: { color: C.gold }
  });

  // 왼쪽 크림 세로 블록 (시각적 분할)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.05, w: 3.8, h: 5.575, fill: { color: "5A2438" }, line: { color: "5A2438" }
  });

  // 왼쪽 패널: 회사명 + 연도
  s.addText("PRESSCO21", {
    x: 0.3, y: 0.8, w: 3.2, h: 0.8,
    fontFace: "Georgia", fontSize: 22, bold: true, color: C.gold,
    align: "left", valign: "middle", margin: 0
  });
  s.addText("Forever and ever and Blooming", {
    x: 0.3, y: 1.6, w: 3.2, h: 0.4,
    fontFace: "Calibri", fontSize: 10, italic: true, color: C.cream,
    align: "left", valign: "middle", margin: 0
  });

  // 왼쪽 패널 구분선
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 2.1, w: 2.8, h: 0.03, fill: { color: C.gold }, line: { color: C.gold }
  });

  // 왼쪽 패널: 주요 숫자
  const leftStats = [
    { label: "창업", val: "1999년" },
    { label: "업력", val: "27년" },
    { label: "회원", val: "4,000명" },
    { label: "강사회원", val: "1,200명" },
  ];
  leftStats.forEach((stat, i) => {
    const yBase = 2.3 + i * 0.7;
    s.addText(stat.val, {
      x: 0.3, y: yBase, w: 3.2, h: 0.4,
      fontFace: "Georgia", fontSize: 18, bold: true, color: C.cream,
      align: "left", valign: "middle", margin: 0
    });
    s.addText(stat.label, {
      x: 0.3, y: yBase + 0.35, w: 3.2, h: 0.25,
      fontFace: "Calibri", fontSize: 9, color: "C4A0A8",
      align: "left", valign: "top", margin: 0
    });
  });

  // 오른쪽: 메인 타이틀 영역
  s.addText("꽃공예 협회", {
    x: 4.1, y: 0.9, w: 5.6, h: 0.6,
    fontFace: "Georgia", fontSize: 20, color: C.rose,
    align: "left", valign: "middle", margin: 0
  });
  s.addText("파트너십 제안서", {
    x: 4.1, y: 1.45, w: 5.6, h: 1.1,
    fontFace: "Georgia", fontSize: 40, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0
  });

  // 서브타이틀
  s.addText("비용은 없고, 혜택만 있습니다", {
    x: 4.1, y: 2.7, w: 5.6, h: 0.5,
    fontFace: "Calibri", fontSize: 16, italic: true, color: C.cream,
    align: "left", valign: "middle", margin: 0
  });

  // 구분선
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.1, y: 3.3, w: 5.1, h: 0.03, fill: { color: C.gold }, line: { color: C.gold }
  });

  // 제안 요소 3가지 아이콘 텍스트
  const proposals = ["할인 쿠폰 제공", "적립금 풀 운영", "플랫폼 무료 게시"];
  proposals.forEach((text, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: 4.1 + i * 1.75, y: 3.5, w: 0.28, h: 0.28,
      fill: { color: C.gold }, line: { color: C.gold }
    });
    s.addText(String(i + 1), {
      x: 4.1 + i * 1.75, y: 3.5, w: 0.28, h: 0.28,
      fontFace: "Georgia", fontSize: 10, bold: true, color: C.berry,
      align: "center", valign: "middle", margin: 0
    });
    s.addText(text, {
      x: 4.45 + i * 1.75, y: 3.52, w: 1.3, h: 0.25,
      fontFace: "Calibri", fontSize: 10, color: C.cream,
      align: "left", valign: "middle", margin: 0
    });
  });

  // 날짜
  s.addText("2026년 3월", {
    x: 4.1, y: 4.9, w: 5.6, h: 0.35,
    fontFace: "Calibri", fontSize: 11, color: "886070",
    align: "left", valign: "middle", margin: 0
  });

  // 하단 골드 라인
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.gold }, line: { color: C.gold }
  });
}

// ─── 공통 헤더 함수 ─────────────────────────────────────────────
function addHeader(slide, title, subtitle) {
  // 헤더 배경
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.berry }, line: { color: C.berry }
  });
  // 골드 라인
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 1.05, w: 10, h: 0.04, fill: { color: C.gold }, line: { color: C.gold }
  });
  // 타이틀
  slide.addText(title, {
    x: 0.4, y: 0.1, w: 8, h: 0.55,
    fontFace: "Georgia", fontSize: 22, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 0.62, w: 8, h: 0.36,
      fontFace: "Calibri", fontSize: 12, italic: true, color: C.cream,
      align: "left", valign: "middle", margin: 0
    });
  }
  // 슬라이드 번호 영역 (오른쪽)
  slide.addText("PRESSCO21", {
    x: 8.5, y: 0.3, w: 1.4, h: 0.4,
    fontFace: "Georgia", fontSize: 9, color: C.gold,
    align: "right", valign: "middle", margin: 0
  });
}

// 공통 하단 라인
function addFooter(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.gold }, line: { color: C.gold }
  });
}

// ─── 슬라이드 2: PRESSCO21 소개 ──────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.light };
  addHeader(s, "PRESSCO21은 이런 회사입니다", "꽃 공예 재료 분야 국내 선두 업체 · 업력 27년");
  addFooter(s);

  // 회사 소개 카드 4개 (2×2 그리드)
  const cards = [
    { icon: "🏭", title: "사업 분야", body: "압화·플로리스트·레진·캔들\n꽃 공예 재료 제조·유통" },
    { icon: "📅", title: "역사와 신뢰", body: "1982년 압화 연구 시작\n1999년 창업 · 현재 27년 업력" },
    { icon: "👥", title: "회원 규모", body: "총 회원 약 4,000명\n강사 회원 약 1,200명" },
    { icon: "🏆", title: "핵심 역량", body: "다수 특허 보유\n방송·전시·국제 교류 경력" },
  ];

  const cardW = 4.4, cardH = 1.6;
  const positions = [
    { x: 0.3, y: 1.35 }, { x: 5.25, y: 1.35 },
    { x: 0.3, y: 3.1 },  { x: 5.25, y: 3.1 },
  ];

  cards.forEach((card, i) => {
    const pos = positions[i];
    // 카드 배경
    s.addShape(pres.shapes.RECTANGLE, {
      x: pos.x, y: pos.y, w: cardW, h: cardH,
      fill: { color: C.white }, line: { color: "E8D8CC", pt: 1 },
      shadow: makeShadow()
    });
    // 왼쪽 베리 강조 바
    s.addShape(pres.shapes.RECTANGLE, {
      x: pos.x, y: pos.y, w: 0.07, h: cardH,
      fill: { color: C.berry }, line: { color: C.berry }
    });
    // 아이콘 텍스트
    s.addText(card.icon, {
      x: pos.x + 0.15, y: pos.y + 0.1, w: 0.7, h: 0.7,
      fontSize: 26, align: "center", valign: "middle", margin: 0
    });
    // 제목
    s.addText(card.title, {
      x: pos.x + 0.9, y: pos.y + 0.12, w: 3.3, h: 0.42,
      fontFace: "Georgia", fontSize: 13, bold: true, color: C.berry,
      align: "left", valign: "middle", margin: 0
    });
    // 내용
    s.addText(card.body, {
      x: pos.x + 0.9, y: pos.y + 0.55, w: 3.3, h: 0.95,
      fontFace: "Calibri", fontSize: 11, color: C.dark,
      align: "left", valign: "top", margin: 0
    });
  });

  // 하단 핵심 메시지
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 4.85, w: 9.4, h: 0.5,
    fill: { color: "F0E8E2" }, line: { color: "E8D8CC", pt: 1 }
  });
  s.addText("\"재료를 판매하는 데 그치지 않고, 꽃 공예를 하는 모든 분이 더 쉽고 즐겁게 활동할 수 있는 환경을 만들어갑니다\"", {
    x: 0.5, y: 4.88, w: 9, h: 0.44,
    fontFace: "Georgia", fontSize: 11, italic: true, color: C.mid,
    align: "center", valign: "middle", margin: 0
  });
}

// ─── 슬라이드 3: 파트너클래스 플랫폼 ─────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.light };
  addHeader(s, "파트너클래스 플랫폼", "PRESSCO21이 자체 개발·운영하는 클래스 예약 플랫폼");
  addFooter(s);

  // 플로우 다이어그램 (5단계)
  const steps = [
    { icon: "📝", label: "클래스\n등록" },
    { icon: "🔍", label: "검색·\n예약" },
    { icon: "💳", label: "온라인\n결제" },
    { icon: "⚙️", label: "자동\n정산" },
    { icon: "🛍️", label: "재료\n구매" },
  ];

  const stepW = 1.6, stepH = 1.4, startX = 0.5, stepY = 1.5;
  steps.forEach((step, i) => {
    const xPos = startX + i * (stepW + 0.3);

    // 원형 배경
    const isKey = i === 4; // 마지막 '재료 구매' 강조
    s.addShape(pres.shapes.OVAL, {
      x: xPos + 0.2, y: stepY, w: 1.2, h: 1.2,
      fill: { color: isKey ? C.berry : C.rose },
      line: { color: isKey ? C.gold : "FFFFFF", pt: isKey ? 2 : 0 },
      shadow: makeShadow()
    });
    // 아이콘
    s.addText(step.icon, {
      x: xPos + 0.2, y: stepY, w: 1.2, h: 1.2,
      fontSize: 28, align: "center", valign: "middle", margin: 0
    });
    // 레이블
    s.addText(step.label, {
      x: xPos, y: stepY + 1.3, w: stepW, h: 0.55,
      fontFace: "Calibri", fontSize: 10.5, bold: true, color: C.dark,
      align: "center", valign: "middle", margin: 0
    });

    // 화살표 (마지막 제외)
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: xPos + stepW - 0.05, y: stepY + 0.56, w: 0.3, h: 0.06,
        fill: { color: C.rose }, line: { color: C.rose }
      });
      // 화살표 삼각형 머리
      s.addText("▶", {
        x: xPos + stepW + 0.18, y: stepY + 0.47, w: 0.2, h: 0.22,
        fontSize: 10, color: C.rose, align: "center", valign: "middle", margin: 0
      });
    }
  });

  // 강사(파트너)가 얻는 것 → 3개 항목
  const benefits = [
    "홈페이지 없이도\n전문 클래스 페이지 보유",
    "PRESSCO21 회원 4,000명에게\n자연스러운 홍보 효과",
    "수강료 정산금을 적립금으로 전환\n재료 할인 구매",
  ];

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 3.2, w: 9.4, h: 0.3,
    fill: { color: C.cream }, line: { color: C.cream }
  });
  s.addText("강사(파트너)가 얻는 것", {
    x: 0.4, y: 3.22, w: 4, h: 0.28,
    fontFace: "Georgia", fontSize: 11, bold: true, color: C.berry,
    align: "left", valign: "middle", margin: 0
  });

  benefits.forEach((b, i) => {
    const xPos = 0.3 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, {
      x: xPos, y: 3.55, w: 3.0, h: 1.65,
      fill: { color: C.white }, line: { color: "E8D8CC", pt: 1 },
      shadow: makeShadow()
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: xPos, y: 3.55, w: 3.0, h: 0.07,
      fill: { color: C.gold }, line: { color: C.gold }
    });
    s.addText(b, {
      x: xPos + 0.15, y: 3.65, w: 2.7, h: 1.45,
      fontFace: "Calibri", fontSize: 11, color: C.dark,
      align: "left", valign: "middle", margin: 0
    });
  });
}

// ─── 슬라이드 4: 제안 개요 ───────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.berry };

  // 골드 상하 라인
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.gold }, line: { color: C.gold }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.565, w: 10, h: 0.06, fill: { color: C.gold }, line: { color: C.gold }
  });

  // 타이틀
  s.addText("협회와 함께하면", {
    x: 0.5, y: 0.5, w: 9, h: 0.7,
    fontFace: "Georgia", fontSize: 28, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("이렇게 좋습니다", {
    x: 0.5, y: 1.1, w: 9, h: 0.7,
    fontFace: "Georgia", fontSize: 28, bold: true, color: C.gold,
    align: "center", valign: "middle", margin: 0
  });

  // 4개 제안 박스
  const props = [
    { num: "1", title: "협회원\n할인 쿠폰", desc: "10~20% 재료 구매 할인" },
    { num: "2", title: "공동\n적립금 풀", desc: "연간 구매 실적 → 협회 인센티브" },
    { num: "3", title: "플랫폼\n홍보 채널", desc: "협회 행사 무료 게시" },
    { num: "4", title: "등급\n우선 부여", desc: "협회 인증 강사 심사 간소화" },
  ];

  props.forEach((p, i) => {
    const xPos = 0.4 + i * 2.3;
    // 카드 배경
    s.addShape(pres.shapes.RECTANGLE, {
      x: xPos, y: 2.0, w: 2.0, h: 2.8,
      fill: { color: "5A2438" }, line: { color: C.gold, pt: 1 },
      shadow: makeShadow()
    });
    // 숫자 원형
    s.addShape(pres.shapes.OVAL, {
      x: xPos + 0.6, y: 2.1, w: 0.8, h: 0.8,
      fill: { color: C.gold }, line: { color: C.gold }
    });
    s.addText(p.num, {
      x: xPos + 0.6, y: 2.1, w: 0.8, h: 0.8,
      fontFace: "Georgia", fontSize: 20, bold: true, color: C.berry,
      align: "center", valign: "middle", margin: 0
    });
    // 제목
    s.addText(p.title, {
      x: xPos + 0.1, y: 3.05, w: 1.8, h: 0.8,
      fontFace: "Georgia", fontSize: 14, bold: true, color: C.cream,
      align: "center", valign: "middle", margin: 0
    });
    // 설명
    s.addText(p.desc, {
      x: xPos + 0.1, y: 3.85, w: 1.8, h: 0.8,
      fontFace: "Calibri", fontSize: 10, color: "C4A0A8",
      align: "center", valign: "middle", margin: 0
    });
  });

  s.addText("별도의 비용 부담 없이, 협회원에게 실질적인 혜택을 제공할 수 있습니다", {
    x: 0.5, y: 5.1, w: 9, h: 0.36,
    fontFace: "Calibri", fontSize: 11, italic: true, color: C.cream,
    align: "center", valign: "middle", margin: 0
  });
}

// ─── 슬라이드 5: 제안 1 - 할인 쿠폰 ─────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.light };
  addHeader(s, "제안 1 · 협회원 전용 할인 쿠폰 제공", "PRESSCO21 자사몰에서 사용할 수 있는 재료 구매 할인 쿠폰");
  addFooter(s);

  // 쿠폰 시각화 (카드 형태)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 1.25, w: 5.2, h: 3.2,
    fill: { color: C.white }, line: { color: "E8D8CC", pt: 1.5 },
    shadow: makeShadow()
  });
  // 쿠폰 좌측 베리 섹션
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 1.25, w: 1.8, h: 3.2,
    fill: { color: C.berry }, line: { color: C.berry }
  });
  s.addText("COUPON", {
    x: 0.3, y: 1.25, w: 1.8, h: 1.6,
    fontFace: "Georgia", fontSize: 16, bold: true, color: C.gold,
    align: "center", valign: "bottom", margin: 0
  });
  s.addText("협회원\n전용", {
    x: 0.3, y: 2.85, w: 1.8, h: 1.6,
    fontFace: "Calibri", fontSize: 12, color: C.cream,
    align: "center", valign: "top", margin: 0
  });
  // 쿠폰 내용
  s.addText("10 ~ 20%", {
    x: 2.3, y: 1.5, w: 3.0, h: 0.8,
    fontFace: "Georgia", fontSize: 32, bold: true, color: C.berry,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("PRESSCO21 자사몰 재료 할인", {
    x: 2.3, y: 2.25, w: 3.0, h: 0.35,
    fontFace: "Calibri", fontSize: 12, color: C.mid,
    align: "center", valign: "middle", margin: 0
  });

  // 상세 항목
  const details = [
    "할인율: 10~20% (협회별 협의)",
    "대상: 자사몰 전 상품 또는 특정 카테고리",
    "방식: 협회 전용 쿠폰 코드 발급",
    "갱신: 연간 계약, 반기별 조건 검토",
  ];
  details.forEach((d, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: 2.2, y: 2.75 + i * 0.41, w: 0.18, h: 0.18,
      fill: { color: C.rose }, line: { color: C.rose }
    });
    s.addText(d, {
      x: 2.45, y: 2.73 + i * 0.41, w: 2.9, h: 0.28,
      fontFace: "Calibri", fontSize: 10.5, color: C.dark,
      align: "left", valign: "middle", margin: 0
    });
  });

  // 협회가 얻는 것 (오른쪽 패널)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.7, y: 1.25, w: 4.0, h: 3.2,
    fill: { color: "F0E8E2" }, line: { color: "E0CABB", pt: 1 },
    shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.7, y: 1.25, w: 4.0, h: 0.45,
    fill: { color: C.rose }, line: { color: C.rose }
  });
  s.addText("협회가 얻는 것", {
    x: 5.8, y: 1.27, w: 3.8, h: 0.41,
    fontFace: "Georgia", fontSize: 13, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0
  });

  const gains = [
    "협회원에게 즉시 체감 가능한 혜택 제공",
    "재료비 부담 경감 → 협회 활동 참여율 향상",
    "\"우리 협회에 가입하면 이런 혜택이\" 가입 유인 효과",
  ];
  gains.forEach((g, i) => {
    s.addText("✓", {
      x: 5.9, y: 1.85 + i * 0.75, w: 0.35, h: 0.45,
      fontFace: "Georgia", fontSize: 14, bold: true, color: C.berry,
      align: "center", valign: "middle", margin: 0
    });
    s.addText(g, {
      x: 6.3, y: 1.82 + i * 0.75, w: 3.2, h: 0.55,
      fontFace: "Calibri", fontSize: 11, color: C.dark,
      align: "left", valign: "middle", margin: 0
    });
  });
}

// ─── 슬라이드 6: 제안 2 - 협회 공동 적립금 풀 ───────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.light };
  addHeader(s, "제안 2 · 협회 공동 적립금 풀", "협회원 연간 누적 구매액 달성 시 → 협회에 인센티브 적립금 지급");
  addFooter(s);

  // 인센티브 테이블
  const tiers = [
    { range: "500만원 이상", reward: "25만원", level: 0.4, color: "D4A5B0" },
    { range: "1,000만원 이상", reward: "50만원", level: 0.7, color: C.rose },
    { range: "2,000만원 이상", reward: "120만원", level: 1.0, color: C.berry },
  ];

  tiers.forEach((tier, i) => {
    const xPos = 0.3 + i * 2.85;
    const barH = tier.level * 2.0;

    // 배경 카드
    s.addShape(pres.shapes.RECTANGLE, {
      x: xPos, y: 1.25, w: 2.55, h: 3.5,
      fill: { color: C.white }, line: { color: "E8D8CC", pt: 1 },
      shadow: makeShadow()
    });

    // 바 그래프
    s.addShape(pres.shapes.RECTANGLE, {
      x: xPos + 0.7, y: 3.3 - barH, w: 1.1, h: barH,
      fill: { color: tier.color }, line: { color: tier.color }
    });

    // 금액 레이블
    s.addText(tier.reward, {
      x: xPos + 0.15, y: 1.35, w: 2.25, h: 0.55,
      fontFace: "Georgia", fontSize: 20, bold: true, color: tier.color === C.berry ? C.berry : C.mid,
      align: "center", valign: "middle", margin: 0
    });
    s.addText("인센티브 적립금", {
      x: xPos + 0.15, y: 1.85, w: 2.25, h: 0.28,
      fontFace: "Calibri", fontSize: 9, color: C.mid,
      align: "center", valign: "middle", margin: 0
    });

    // 구매액 레이블
    s.addText(tier.range, {
      x: xPos + 0.1, y: 3.4, w: 2.35, h: 0.4,
      fontFace: "Calibri", fontSize: 10, bold: true, color: C.dark,
      align: "center", valign: "middle", margin: 0
    });
  });

  // 적립금 활용 방안
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 4.85, w: 9.4, h: 0.06,
    fill: { color: C.gold }, line: { color: C.gold }
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 4.78, w: 9.4, h: 0.0
  });

  const uses = ["세미나·워크숍 재료비", "협회 행사 운영비", "회원 대상 경품", "전시회 부스 재료"];

  s.addText("적립금 활용 방안:", {
    x: 0.35, y: 4.9, w: 2.1, h: 0.38,
    fontFace: "Georgia", fontSize: 11, bold: true, color: C.berry,
    align: "left", valign: "middle", margin: 0
  });

  uses.forEach((u, i) => {
    s.addText("· " + u, {
      x: 2.35 + i * 1.9, y: 4.9, w: 1.8, h: 0.38,
      fontFace: "Calibri", fontSize: 10, color: C.dark,
      align: "left", valign: "middle", margin: 0
    });
  });
}

// ─── 슬라이드 7: 제안 3&4 (합쳐서) ──────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.light };
  addHeader(s, "제안 3 & 4 · 플랫폼 홍보 + 등급 우선 부여", "협회의 행사·교육을 플랫폼에 무료 게시 + 협회 인증 강사 혜택 강화");
  addFooter(s);

  // 제안 3 (왼쪽)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 1.2, w: 4.5, h: 3.8,
    fill: { color: C.white }, line: { color: "E8D8CC", pt: 1 },
    shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 1.2, w: 4.5, h: 0.5,
    fill: { color: C.rose }, line: { color: C.rose }
  });
  s.addText("제안 3  클래스 플랫폼 홍보 채널", {
    x: 0.4, y: 1.22, w: 4.2, h: 0.46,
    fontFace: "Georgia", fontSize: 12, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0
  });

  const items3 = [
    { icon: "🆓", text: "게시 비용: 무료" },
    { icon: "🏅", text: "협회 공식 배지 + 로고와 함께 노출" },
    { icon: "📲", text: "플랫폼 통해 예약 시 수강생 적립금 추가 제공" },
    { icon: "👥", text: "PRESSCO21 회원 4,000명에게 노출" },
    { icon: "🌐", text: "온라인 예약·결제 인프라 무료 활용" },
  ];
  items3.forEach((item, i) => {
    s.addText(item.icon, {
      x: 0.4, y: 1.85 + i * 0.56, w: 0.4, h: 0.46,
      fontSize: 16, align: "center", valign: "middle", margin: 0
    });
    s.addText(item.text, {
      x: 0.85, y: 1.85 + i * 0.56, w: 3.75, h: 0.46,
      fontFace: "Calibri", fontSize: 11, color: C.dark,
      align: "left", valign: "middle", margin: 0
    });
  });

  // 제안 4 (오른쪽)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.0, y: 1.2, w: 4.7, h: 3.8,
    fill: { color: C.white }, line: { color: "E8D8CC", pt: 1 },
    shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.0, y: 1.2, w: 4.7, h: 0.5,
    fill: { color: C.berry }, line: { color: C.berry }
  });
  s.addText("제안 4  파트너스 등급 우선 부여", {
    x: 5.15, y: 1.22, w: 4.4, h: 0.46,
    fontFace: "Georgia", fontSize: 12, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0
  });

  // 비교 테이블
  const tableHeaders = [["구분", "일반 강사", "협회 인증 강사"]];
  const tableRows = [
    ["파트너 심사", "개별 심사\n(1~3 영업일)", "협회 인증으로\n간소화 심사"],
    ["초기 등급", "인스트럭터 (기본)", "인스트럭터\n+ 추가 혜택"],
    ["재료 할인", "기본 등급 할인", "협회원 할인\n중복 적용"],
    ["플랫폼 노출", "일반 노출", "협회 배지 부착\n우선 노출"],
  ];

  const allRows = [...tableHeaders, ...tableRows];
  const tableData = allRows.map((row, ri) =>
    row.map((cell, ci) => ({
      text: cell,
      options: {
        fontFace: ri === 0 ? "Georgia" : "Calibri",
        fontSize: ri === 0 ? 10 : 9.5,
        bold: ri === 0 || ci === 0,
        color: ri === 0 ? C.white : (ci === 2 ? C.berry : C.dark),
        fill: { color: ri === 0 ? C.berry : (ri % 2 === 0 ? "FAF5F2" : C.white) },
        align: "center", valign: "middle",
      }
    }))
  );

  s.addTable(tableData, {
    x: 5.1, y: 1.82, w: 4.5, h: 2.95,
    rowH: 0.51,
    border: { pt: 0.5, color: "E0CABB" },
    colW: [1.1, 1.6, 1.8]
  });
}

// ─── 슬라이드 8: 제안 조건 요약 ──────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.light };
  addHeader(s, "제안 조건 요약", "모든 비용은 PRESSCO21이 부담합니다");
  addFooter(s);

  const terms = [
    { label: "계약 형태", value: "업무 협약 (MOU)" },
    { label: "계약 기간", value: "1년 단위, 자동 갱신 (쌍방 1개월 전 해지 통보)" },
    { label: "협회 비용", value: "없음 — PRESSCO21이 플랫폼 운영비 전액 부담" },
    { label: "할인 조건", value: "협회별 개별 협의 (10~20% 범위)" },
    { label: "인센티브 기준", value: "협회 규모에 따라 맞춤 설계" },
    { label: "데이터 관리", value: "PRESSCO21 개인정보 처리방침에 따라 안전 관리" },
    { label: "중도 해지 시", value: "기발급 쿠폰 유효기간까지 사용, 미지급 인센티브는 협의 후 정산" },
  ];

  terms.forEach((t, i) => {
    const yPos = 1.3 + i * 0.55;
    const isEven = i % 2 === 0;

    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.3, y: yPos, w: 9.4, h: 0.5,
      fill: { color: isEven ? C.white : "F7F1EE" },
      line: { color: "E8D8CC", pt: 0.5 }
    });
    // 라벨 배경
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.3, y: yPos, w: 2.0, h: 0.5,
      fill: { color: C.berry }, line: { color: C.berry }
    });
    s.addText(t.label, {
      x: 0.35, y: yPos, w: 1.9, h: 0.5,
      fontFace: "Georgia", fontSize: 11, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0
    });
    s.addText(t.value, {
      x: 2.45, y: yPos, w: 7.1, h: 0.5,
      fontFace: "Calibri", fontSize: 11, color: C.dark,
      align: "left", valign: "middle", margin: 0
    });
  });
}

// ─── 슬라이드 9: 다음 단계 ───────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.light };
  addHeader(s, "다음 단계", "본 제안에 관심이 있으시다면 아래 순서로 진행합니다");
  addFooter(s);

  const steps = [
    { num: "1", title: "상세 조건 협의", desc: "미팅을 통한 세부 조건 논의", period: "1~2주" },
    { num: "2", title: "MOU 초안 작성", desc: "양측 검토 및 수정", period: "1주" },
    { num: "3", title: "MOU 체결", desc: "서명 및 파트너십 공식 시작", period: "즉시" },
    { num: "4", title: "쿠폰 코드 발급", desc: "협회원 대상 안내 및 배포", period: "1주" },
    { num: "5", title: "플랫폼 게시 시작", desc: "협회 행사 등록 및 노출", period: "수시" },
  ];

  // 타임라인 바
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 2.9, w: 9.0, h: 0.08,
    fill: { color: C.rose }, line: { color: C.rose }
  });

  steps.forEach((step, i) => {
    const xPos = 0.5 + i * 1.8;

    // 원형 노드
    s.addShape(pres.shapes.OVAL, {
      x: xPos + 0.4, y: 2.68, w: 0.5, h: 0.5,
      fill: { color: i < 3 ? C.berry : C.rose },
      line: { color: C.gold, pt: 2 },
      shadow: makeShadow()
    });
    s.addText(step.num, {
      x: xPos + 0.4, y: 2.68, w: 0.5, h: 0.5,
      fontFace: "Georgia", fontSize: 14, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0
    });

    // 제목 (위)
    s.addText(step.title, {
      x: xPos, y: 1.4, w: 1.65, h: 0.5,
      fontFace: "Georgia", fontSize: 11, bold: true, color: C.berry,
      align: "center", valign: "middle", margin: 0
    });

    // 설명 (위)
    s.addText(step.desc, {
      x: xPos, y: 1.9, w: 1.65, h: 0.65,
      fontFace: "Calibri", fontSize: 10, color: C.mid,
      align: "center", valign: "middle", margin: 0
    });

    // 기간 (아래)
    s.addShape(pres.shapes.RECTANGLE, {
      x: xPos + 0.15, y: 3.35, w: 1.35, h: 0.38,
      fill: { color: C.cream }, line: { color: "E0CABB", pt: 1 }
    });
    s.addText(step.period, {
      x: xPos + 0.15, y: 3.35, w: 1.35, h: 0.38,
      fontFace: "Calibri", fontSize: 11, bold: true, color: C.berry,
      align: "center", valign: "middle", margin: 0
    });
  });

  // 마무리 메시지
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 4.1, w: 9.4, h: 0.9,
    fill: { color: "F0E8E2" }, line: { color: "E0CABB", pt: 1 }
  });
  s.addText("관심 있으신 협회라면, 가벼운 미팅부터 시작해도 좋습니다.\n언제든지 연락 주세요.", {
    x: 0.5, y: 4.12, w: 9.0, h: 0.88,
    fontFace: "Georgia", fontSize: 13, italic: true, color: C.berry,
    align: "center", valign: "middle", margin: 0
  });
}

// ─── 슬라이드 10: 연락처 (마무리) ───────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.berry };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.gold }, line: { color: C.gold }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.565, w: 10, h: 0.06, fill: { color: C.gold }, line: { color: C.gold }
  });

  // 마무리 메시지
  s.addText("꽃의 아름다움을, 함께 전해요", {
    x: 0.5, y: 0.6, w: 9, h: 0.7,
    fontFace: "Georgia", fontSize: 26, bold: true, color: C.gold,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("꽃 공예를 사랑하는 모든 분이 더 편하게, 더 즐겁게 활동할 수 있도록.", {
    x: 0.5, y: 1.25, w: 9, h: 0.5,
    fontFace: "Calibri", fontSize: 13, italic: true, color: C.cream,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("PRESSCO21은 협회와 함께 그 환경을 만들어가고 싶습니다.", {
    x: 0.5, y: 1.7, w: 9, h: 0.45,
    fontFace: "Calibri", fontSize: 13, italic: true, color: C.cream,
    align: "center", valign: "middle", margin: 0
  });

  // 구분선
  s.addShape(pres.shapes.RECTANGLE, {
    x: 2.5, y: 2.3, w: 5.0, h: 0.04,
    fill: { color: C.gold }, line: { color: C.gold }
  });

  // 연락처 카드
  s.addShape(pres.shapes.RECTANGLE, {
    x: 2.0, y: 2.5, w: 6.0, h: 2.5,
    fill: { color: "5A2438" }, line: { color: C.gold, pt: 1 },
    shadow: makeShadow()
  });

  const contacts = [
    { icon: "🏢", label: "PRESSCO21 (프레스코21)", sub: "foreverlove.co.kr" },
    { icon: "👤", label: "담당자: 장지호" },
    { icon: "📞", label: "010-9848-5520" },
    { icon: "✉️", label: "pressco5755@naver.com" },
  ];

  contacts.forEach((c, i) => {
    s.addText(c.icon, {
      x: 2.2, y: 2.65 + i * 0.54, w: 0.45, h: 0.44,
      fontSize: 16, align: "center", valign: "middle", margin: 0
    });
    s.addText(c.label, {
      x: 2.75, y: 2.67 + i * 0.54, w: 5.0, h: 0.3,
      fontFace: "Calibri", fontSize: 13, color: C.cream,
      align: "left", valign: "middle", margin: 0
    });
    if (c.sub) {
      s.addText(c.sub, {
        x: 2.75, y: 2.93 + i * 0.54, w: 5.0, h: 0.22,
        fontFace: "Calibri", fontSize: 10, color: "C4A0A8",
        align: "left", valign: "middle", margin: 0
      });
    }
  });
}

// ─── 파일 저장 ───────────────────────────────────────────────────
pres.writeFile({ fileName: "docs/파트너클래스/PRESSCO21_협회파트너십제안서.pptx" })
  .then(() => {
    console.log("✅ PPT 생성 완료: docs/파트너클래스/PRESSCO21_협회파트너십제안서.pptx");
  })
  .catch(err => {
    console.error("❌ PPT 생성 실패:", err);
    process.exit(1);
  });
