// 프레스코21 시그니처 디자인 시스템
// 컨셉: "눌려서 영원해진 것들" — Pressed, Preserved, Crafted

// ─── 브랜드 6색 (시맨틱 의미 부여) ─────────────────
export const COLORS = {
  // 브랜드 코어
  sage: '#b4c6ab',       // 성장 — 진행 중, 활동 중, 성장 배지
  mist: '#e5eae3',       // 안정 — 배경, 여백, 읽기 편한 영역
  forest: '#597051',     // 전문 — 네비게이션, 핵심 UI, 브랜드 기조
  deep: '#2b3d2f',       // 깊이 — 텍스트, 헤더, 중요 정보
  cream: '#fff9f0',      // 따뜻함 — 카드 배경, 입력 필드, 콘텐츠
  warm: '#d4a373',       // 주목 — CTA 버튼, 알림, 할인, 가격

  // UI 확장
  white: '#ffffff',
  black: '#1a1a1a',
  gray50: '#fafaf8',
  gray100: '#f5f4f0',
  gray200: '#e8e6e1',
  gray300: '#d4d1ca',
  gray400: '#a8a49c',
  gray500: '#7a766e',
  gray600: '#5a564f',
  gray700: '#3d3a35',

  // 상태색 (브랜드 톤 유지)
  success: '#597051',
  error: '#c45c4a',
  warning: '#d4a373',
  info: '#7a9cb0',

  // 등급색 (파트너클래스)
  bloom: '#b4c6ab',
  garden: '#7fa874',
  atelier: '#597051',
  ambassador: '#d4a373',
} as const;

// ─── 타이포그래피 ─────────────────
// 명조(NanumMyeongjo): 브랜드/감성/타이틀 — "시간의 축적"
// 산세리프(Pretendard): 본문/UI — "현대적 전문성"
export const FONTS = {
  // 폰트 패밀리
  serif: {
    regular: 'NanumMyeongjo',
    bold: 'NanumMyeongjoBold',
  },
  sans: {
    light: 'Pretendard-Light',
    regular: 'Pretendard-Regular',
    medium: 'Pretendard-Medium',
    semibold: 'Pretendard-SemiBold',
    bold: 'Pretendard-Bold',
  },
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    hero: 32,
  },
} as const;

// ─── 타이포그래피 프리셋 ─────────────────
export const TYPOGRAPHY = {
  // 브랜드/감성 (명조)
  heroTitle: { fontFamily: FONTS.serif.bold, fontSize: 32, lineHeight: 42 },
  brandTitle: { fontFamily: FONTS.serif.regular, fontSize: 24, lineHeight: 34 },
  sectionSerif: { fontFamily: FONTS.serif.regular, fontSize: 18, lineHeight: 26 },
  // UI/정보 (산세리프)
  sectionTitle: { fontFamily: FONTS.sans.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: FONTS.sans.regular, fontSize: 15, lineHeight: 24 },
  bodyMedium: { fontFamily: FONTS.sans.medium, fontSize: 15, lineHeight: 24 },
  caption: { fontFamily: FONTS.sans.regular, fontSize: 13, lineHeight: 20 },
  captionLight: { fontFamily: FONTS.sans.light, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: FONTS.sans.medium, fontSize: 11, lineHeight: 16 },
  price: { fontFamily: FONTS.sans.bold, fontSize: 16, lineHeight: 22 },
  priceSmall: { fontFamily: FONTS.sans.semibold, fontSize: 14, lineHeight: 20 },
} as const;

// ─── 간격 ─────────────────
// "넉넉한(Generous)" 원칙: 다른 커머스 앱보다 20~30% 넓은 여백
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  section: 44,  // 섹션 간 여백
  page: 24,     // 좌우 패딩
} as const;

// ─── 모서리 ─────────────────
// "Pressed" 원칙: 과하게 둥글지 않게. 압화처럼 절제
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  card: 14,
  button: 10,
  full: 9999,
} as const;

// ─── 그림자 ─────────────────
// "눌림" 원칙: 요소가 떠있지 않고 놓여있는 느낌. 그림자 극소화
import { Platform } from 'react-native';
export const SHADOWS = {
  none: {},
  subtle: Platform.select({
    ios: { shadowColor: '#2b3d2f', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
    android: { elevation: 1 },
  }) ?? {},
  card: Platform.select({
    ios: { shadowColor: '#2b3d2f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 2 },
  }) ?? {},
  lifted: Platform.select({
    ios: { shadowColor: '#2b3d2f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
    android: { elevation: 4 },
  }) ?? {},
} as const;

// ─── 시맨틱 토큰 ─────────────────
export const SEMANTIC = {
  background: {
    primary: COLORS.cream,
    secondary: COLORS.mist,
    card: COLORS.white,
    dark: COLORS.deep,
  },
  text: {
    primary: COLORS.deep,
    secondary: COLORS.forest,
    muted: COLORS.gray500,
    inverse: COLORS.cream,
    accent: COLORS.warm,
  },
  border: {
    default: COLORS.gray200,
    subtle: 'rgba(89, 112, 81, 0.1)',
    focus: COLORS.sage,
  },
  cta: {
    primary: COLORS.forest,
    secondary: COLORS.warm,
    ghost: 'transparent',
  },
} as const;
