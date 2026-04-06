import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY, SEMANTIC } from '../../src/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - SPACING.page * 2 - SPACING.md) / 2;

// ─── 카테고리 데이터 (커스텀 라인 아이콘은 Phase 2에서 SVG로 교체) ───
const CATEGORIES = [
  { id: '1', name: '압화', sub: '700+', icon: 'flower-outline' },
  { id: '2', name: '드라이플라워', sub: '200+', icon: 'leaf-outline' },
  { id: '3', name: '레진', sub: '120+', icon: 'diamond-outline' },
  { id: '4', name: '하바리움', sub: '80+', icon: 'flask-outline' },
  { id: '5', name: '리부케', sub: '60+', icon: 'rose-outline' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ─── 헤더 ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandName}>PRESSCO 21</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity><Ionicons name="notifications-outline" size={22} color={COLORS.deep} /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="bag-outline" size={22} color={COLORS.deep} /></TouchableOpacity>
        </View>
      </View>

      {/* ─── 히어로: 브랜드 스토리 ─── */}
      <View style={styles.hero}>
        <View style={styles.heroTextArea}>
          <Text style={styles.heroEyebrow}>FOREVER BLOOMING</Text>
          <Text style={styles.heroTitle}>꽃으로 노는{'\n'}모든 방법</Text>
          <Text style={styles.heroDesc}>26년 전통, 압화 국내 최다 보유{'\n'}재료부터 클래스까지</Text>
        </View>
        {/* 우측 장식 — 실제 압화 이미지로 교체 예정 */}
        <View style={styles.heroDecor}>
          <View style={styles.heroCircle} />
          <View style={styles.heroCircleSm} />
        </View>
      </View>

      {/* ─── 검색바 ─── */}
      <TouchableOpacity style={styles.searchBar} activeOpacity={0.7}>
        <Ionicons name="search" size={18} color={COLORS.gray400} />
        <Text style={styles.searchText}>어떤 재료를 찾으시나요?</Text>
      </TouchableOpacity>

      {/* ─── 카테고리 ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.catChip} activeOpacity={0.7}>
            <View style={styles.catIconCircle}>
              <Ionicons name={cat.icon as any} size={20} color={COLORS.forest} />
            </View>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catSub}>{cat.sub}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ─── New Arrival 섹션 (자사몰 동일) ─── */}
      <SectionHeader title="New Arrival" subtitle="새로운 재료를 만나보세요" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScroll}
      >
        <ProductCardH name="프리미엄 압화 벚꽃 세트" price="18,000" discount="20" badge="NEW" />
        <ProductCardH name="레지너스 UV레진 하드 500g" price="32,000" />
        <ProductCardH name="미니 하바리움 DIY 키트" price="24,000" discount="15" />
        <ProductCardH name="유칼립투스 드라이 번들" price="12,000" badge="BEST" />
      </ScrollView>

      {/* ─── Weekly Best 섹션 (자사몰 동일) ─── */}
      <SectionHeader title="Weekly Best" subtitle="이번 주 가장 사랑받은" />
      <View style={styles.gridWrap}>
        <ProductCardV rank={1} name="압화 안개꽃 믹스 (20종)" price="15,000" discount="10" />
        <ProductCardV rank={2} name="실리콘 레진 몰드 풀세트" price="28,500" />
        <ProductCardV rank={3} name="프리저브드 장미 3송이" price="9,800" discount="20" />
        <ProductCardV rank={4} name="하바리움 전용 오일 500ml" price="18,000" />
      </View>

      {/* ─── Learn & Shop 배너 (자사몰 동일 섹션) ─── */}
      <View style={styles.learnBanner}>
        <Text style={styles.learnEyebrow}>LEARN & SHOP</Text>
        <Text style={styles.learnTitle}>만들면서 배우는{'\n'}꽃 공예 클래스</Text>
        <Text style={styles.learnDesc}>재료 키트 + 영상 강의가 함께</Text>
        <TouchableOpacity style={styles.learnBtn}>
          <Text style={styles.learnBtnText}>클래스 보러가기</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.cream} />
        </TouchableOpacity>
      </View>

      {/* ─── Partner Class 배너 (자사몰 동일 섹션) ─── */}
      <View style={styles.partnerBanner}>
        <View style={styles.partnerLeft}>
          <Text style={styles.partnerEyebrow}>PARTNER CLASS</Text>
          <Text style={styles.partnerTitle}>꽃 공예 강사{'\n'}파트너 모집</Text>
          <Text style={styles.partnerDesc}>등급에 따라 최대 25% 할인</Text>
        </View>
        <View style={styles.partnerGrades}>
          {['BLOOM', 'GARDEN', 'ATELIER', 'AMB.'].map((g, i) => (
            <View key={g} style={[styles.gradeChip, { opacity: 1 - i * 0.15 }]}>
              <Text style={styles.gradeText}>{g}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ─── 브랜드 클로징 (자사몰의 "Preserving Your Moments") ─── */}
      <View style={styles.closing}>
        <View style={styles.closingLine} />
        <Text style={styles.closingQuote}>Preserving Your Moments</Text>
        <Text style={styles.closingDesc}>꽃의 아름다움을, 함께 전해요</Text>
        <Text style={styles.closingEst}>est. 1999 · 가락동</Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─── 섹션 헤더 ───
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHead}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSub}>{subtitle}</Text>
      </View>
      <TouchableOpacity>
        <Ionicons name="arrow-forward" size={18} color={COLORS.gray400} />
      </TouchableOpacity>
    </View>
  );
}

// ─── 가로 스크롤 상품 카드 ───
function ProductCardH({ name, price, discount, badge }: {
  name: string; price: string; discount?: string; badge?: string;
}) {
  return (
    <TouchableOpacity style={styles.cardH} activeOpacity={0.8}>
      <View style={styles.cardHImg}>
        {badge && (
          <View style={[styles.badge, badge === 'BEST' ? styles.badgeBest : styles.badgeNew]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn}>
          <Ionicons name="heart-outline" size={16} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardHInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
        <View style={styles.priceRow}>
          {discount && <Text style={styles.discount}>{discount}%</Text>}
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── 2열 그리드 상품 카드 ───
function ProductCardV({ rank, name, price, discount }: {
  rank: number; name: string; price: string; discount?: string;
}) {
  return (
    <TouchableOpacity style={styles.cardV} activeOpacity={0.8}>
      <View style={styles.cardVImg}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        <TouchableOpacity style={styles.heartBtn}>
          <Ionicons name="heart-outline" size={16} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardVInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
        <View style={styles.priceRow}>
          {discount && <Text style={styles.discount}>{discount}%</Text>}
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── 스타일 ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },

  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.md,
  },
  brandName: {
    fontFamily: FONTS.serif.regular,
    fontSize: 20,
    color: COLORS.deep,
    letterSpacing: 1.5,
  },
  headerIcons: { flexDirection: 'row', gap: SPACING.lg },

  // 히어로
  hero: {
    marginHorizontal: SPACING.page,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xxl,
    backgroundColor: COLORS.deep,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  heroTextArea: { flex: 1, zIndex: 2 },
  heroEyebrow: {
    fontFamily: FONTS.sans.medium,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.sage,
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontFamily: FONTS.serif.bold,
    fontSize: 26,
    color: COLORS.cream,
    lineHeight: 36,
    marginBottom: SPACING.sm,
  },
  heroDesc: {
    fontFamily: FONTS.sans.regular,
    fontSize: 12,
    color: 'rgba(229,234,227,0.5)',
    lineHeight: 19,
  },
  heroDecor: { position: 'absolute', right: -20, top: -20 },
  heroCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(180,198,171,0.12)',
  },
  heroCircleSm: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(212,163,115,0.08)',
    position: 'absolute',
    bottom: -30,
    right: 50,
  },

  // 검색바
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.page,
    marginBottom: SPACING.xxl,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: SPACING.sm,
  },
  searchText: {
    fontFamily: FONTS.sans.regular,
    fontSize: 14,
    color: COLORS.gray400,
  },

  // 카테고리
  catScroll: {
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.section,
    gap: SPACING.md,
  },
  catChip: {
    alignItems: 'center',
    width: 72,
  },
  catIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.mist,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  catName: {
    fontFamily: FONTS.sans.medium,
    fontSize: 12,
    color: COLORS.deep,
    marginBottom: 2,
  },
  catSub: {
    fontFamily: FONTS.sans.regular,
    fontSize: 10,
    color: COLORS.gray400,
  },

  // 섹션 헤더
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.page,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.serif.regular,
    fontSize: 20,
    color: COLORS.deep,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontFamily: FONTS.sans.regular,
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // 가로 스크롤
  hScroll: {
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.section,
    gap: SPACING.md,
  },

  // 가로 카드
  cardH: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardHImg: {
    width: 150,
    height: 150,
    backgroundColor: COLORS.mist,
    position: 'relative',
  },
  cardHInfo: {
    padding: SPACING.md,
  },

  // 그리드
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.page,
    gap: SPACING.md,
    marginBottom: SPACING.section,
  },

  // 세로 카드
  cardV: {
    width: CARD_W,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardVImg: {
    width: '100%',
    height: CARD_W * 1.1,
    backgroundColor: COLORS.mist,
    position: 'relative',
  },
  cardVInfo: {
    padding: SPACING.md,
  },

  // 공통 카드 요소
  cardName: {
    fontFamily: FONTS.sans.regular,
    fontSize: 13,
    color: COLORS.deep,
    lineHeight: 19,
    marginBottom: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  discount: {
    fontFamily: FONTS.sans.bold,
    fontSize: 15,
    color: COLORS.warm,
  },
  price: {
    fontFamily: FONTS.sans.bold,
    fontSize: 15,
    color: COLORS.deep,
  },

  // 배지
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeNew: { backgroundColor: COLORS.deep },
  badgeBest: { backgroundColor: COLORS.warm },
  badgeText: {
    fontFamily: FONTS.sans.semibold,
    fontSize: 9,
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  // 랭킹 배지
  rankBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: FONTS.sans.bold,
    fontSize: 11,
    color: COLORS.cream,
  },

  // 하트 버튼
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Learn & Shop 배너
  learnBanner: {
    marginHorizontal: SPACING.page,
    marginBottom: SPACING.section,
    padding: SPACING.xxl,
    backgroundColor: COLORS.sage,
    borderRadius: RADIUS.xl,
  },
  learnEyebrow: {
    fontFamily: FONTS.sans.medium,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.deep,
    opacity: 0.6,
    marginBottom: SPACING.sm,
  },
  learnTitle: {
    fontFamily: FONTS.serif.bold,
    fontSize: 22,
    color: COLORS.deep,
    lineHeight: 30,
    marginBottom: SPACING.sm,
  },
  learnDesc: {
    fontFamily: FONTS.sans.regular,
    fontSize: 13,
    color: COLORS.forest,
    marginBottom: SPACING.lg,
  },
  learnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.forest,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.button,
    gap: 6,
  },
  learnBtnText: {
    fontFamily: FONTS.sans.semibold,
    fontSize: 13,
    color: COLORS.cream,
  },

  // Partner Class 배너
  partnerBanner: {
    marginHorizontal: SPACING.page,
    marginBottom: SPACING.section,
    padding: SPACING.xxl,
    backgroundColor: COLORS.deep,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partnerLeft: { flex: 1 },
  partnerEyebrow: {
    fontFamily: FONTS.sans.medium,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.sage,
    marginBottom: SPACING.sm,
  },
  partnerTitle: {
    fontFamily: FONTS.serif.bold,
    fontSize: 20,
    color: COLORS.cream,
    lineHeight: 28,
    marginBottom: SPACING.sm,
  },
  partnerDesc: {
    fontFamily: FONTS.sans.regular,
    fontSize: 12,
    color: 'rgba(229,234,227,0.5)',
  },
  partnerGrades: {
    justifyContent: 'center',
    gap: 6,
  },
  gradeChip: {
    backgroundColor: 'rgba(180,198,171,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  gradeText: {
    fontFamily: FONTS.sans.semibold,
    fontSize: 9,
    color: COLORS.sage,
    letterSpacing: 1,
  },

  // 클로징
  closing: {
    alignItems: 'center',
    paddingVertical: SPACING.section,
    paddingHorizontal: SPACING.page,
  },
  closingLine: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.gray300,
    marginBottom: SPACING.xl,
  },
  closingQuote: {
    fontFamily: FONTS.serif.regular,
    fontSize: 18,
    color: COLORS.deep,
    letterSpacing: -0.3,
    marginBottom: SPACING.sm,
  },
  closingDesc: {
    fontFamily: FONTS.sans.regular,
    fontSize: 13,
    color: COLORS.gray500,
    marginBottom: SPACING.xs,
  },
  closingEst: {
    fontFamily: FONTS.sans.light,
    fontSize: 11,
    color: COLORS.gray400,
    letterSpacing: 1,
  },
});
