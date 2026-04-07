import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';
import { API } from '../../src/constants/api';
import { apiGet } from '../../src/api/client';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - SPACING.page * 2 - SPACING.md) / 2;

interface ProductItem {
  id: string;
  name: string;
  price: number;
  salePrice: number;
  discount: number;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  isSoldOut: boolean;
  isNew: boolean;
  isBest: boolean;
}

interface ProductsResponse {
  success: boolean;
  data: ProductItem[];
  total: number;
}

const CATEGORIES = [
  { id: '019', name: '압화', icon: 'flower-outline' as const },
  { id: '056', name: '드라이플라워', icon: 'leaf-outline' as const },
  { id: '024', name: '레진', icon: 'diamond-outline' as const },
  { id: '028', name: '하바리움', icon: 'flask-outline' as const },
  { id: '031', name: '캔들/비누', icon: 'flame-outline' as const },
];

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}

export default function HomeScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<ProductsResponse>(API.products.list + '?limit=20');
        if (res.success && res.data) {
          setProducts(res.data);
        }
      } catch (e) {
        console.log('상품 로딩 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const newArrivals = products.filter(p => !p.isSoldOut).slice(0, 10);
  const bestSellers = products.filter(p => p.isBest && !p.isSoldOut).slice(0, 8);
  const fallbackBest = bestSellers.length > 0 ? bestSellers : products.filter(p => !p.isSoldOut).slice(0, 4);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.brandName}>PRESSCO 21</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity><Ionicons name="notifications-outline" size={22} color={COLORS.deep} /></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/cart')}>
            <Ionicons name="bag-outline" size={22} color={COLORS.deep} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 히어로 */}
      <View style={styles.hero}>
        <View style={styles.heroTextArea}>
          <Text style={styles.heroEyebrow}>FOREVER BLOOMING</Text>
          <Text style={styles.heroTitle}>{'꽃으로 노는\n모든 방법'}</Text>
          <Text style={styles.heroDesc}>{'26년 전통, 압화 국내 최다 보유\n재료부터 클래스까지'}</Text>
        </View>
        <View style={styles.heroDecor}>
          <View style={styles.heroCircle} />
        </View>
      </View>

      {/* 검색바 */}
      <TouchableOpacity style={styles.searchBar} activeOpacity={0.7} onPress={() => router.push('/(tabs)/categories')}>
        <Ionicons name="search" size={18} color={COLORS.gray400} />
        <Text style={styles.searchText}>어떤 재료를 찾으시나요?</Text>
      </TouchableOpacity>

      {/* 카테고리 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.catChip} activeOpacity={0.7}>
            <View style={styles.catIconCircle}>
              <Ionicons name={cat.icon} size={20} color={COLORS.forest} />
            </View>
            <Text style={styles.catName}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.forest} style={{ marginVertical: 40 }} />
      ) : (
        <>
          {/* New Arrival */}
          <SectionHeader title="New Arrival" subtitle="새로운 재료를 만나보세요" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {newArrivals.map((p) => (
              <ProductCardH key={p.id} product={p} onPress={() => router.push('/product/' + p.id)} />
            ))}
          </ScrollView>

          {/* Weekly Best */}
          <SectionHeader title="Weekly Best" subtitle="이번 주 가장 사랑받은" />
          <View style={styles.gridWrap}>
            {fallbackBest.slice(0, 4).map((p, i) => (
              <ProductCardV key={p.id} product={p} rank={i + 1} onPress={() => router.push('/product/' + p.id)} />
            ))}
          </View>
        </>
      )}

      {/* Learn & Shop */}
      <View style={styles.learnBanner}>
        <Text style={styles.learnEyebrow}>LEARN & SHOP</Text>
        <Text style={styles.learnTitle}>{'만들면서 배우는\n꽃 공예 클래스'}</Text>
        <Text style={styles.learnDesc}>재료 키트 + 영상 강의가 함께</Text>
        <TouchableOpacity style={styles.learnBtn}>
          <Text style={styles.learnBtnText}>클래스 보러가기</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.cream} />
        </TouchableOpacity>
      </View>

      {/* Partner Class */}
      <View style={styles.partnerBanner}>
        <View style={styles.partnerLeft}>
          <Text style={styles.partnerEyebrow}>PARTNER CLASS</Text>
          <Text style={styles.partnerTitle}>{'꽃 공예 강사\n파트너 모집'}</Text>
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

      {/* 클로징 */}
      <View style={styles.closing}>
        <View style={styles.closingLine} />
        <Text style={styles.closingQuote}>Preserving Your Moments</Text>
        <Text style={styles.closingDesc}>꽃의 아름다움을, 함께 전해요</Text>
        <Text style={styles.closingEst}>est. 1999</Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

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

function ProductCardH({ product: p, onPress }: { product: ProductItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cardH} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.cardHImg}>
        {p.imageUrl ? (
          <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        {p.isNew && (
          <View style={[styles.badge, styles.badgeNew]}><Text style={styles.badgeText}>NEW</Text></View>
        )}
        {p.isBest && !p.isNew && (
          <View style={[styles.badge, styles.badgeBest]}><Text style={styles.badgeText}>BEST</Text></View>
        )}
      </View>
      <View style={styles.cardHInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
        <View style={styles.priceRow}>
          {p.discount > 0 && <Text style={styles.discount}>{p.discount}%</Text>}
          <Text style={styles.price}>{formatPrice(p.salePrice)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ProductCardV({ product: p, rank, onPress }: { product: ProductItem; rank: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cardV} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.cardVImg}>
        {p.imageUrl ? (
          <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        <View style={styles.rankBadge}><Text style={styles.rankText}>{rank}</Text></View>
      </View>
      <View style={styles.cardVInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
        <View style={styles.priceRow}>
          {p.discount > 0 && <Text style={styles.discount}>{p.discount}%</Text>}
          <Text style={styles.price}>{formatPrice(p.salePrice)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: SPACING.page, paddingBottom: SPACING.md,
  },
  brandName: { fontFamily: FONTS.serif.regular, fontSize: 20, color: COLORS.deep, letterSpacing: 1.5 },
  headerIcons: { flexDirection: 'row', gap: SPACING.lg },
  hero: {
    marginHorizontal: SPACING.page, marginBottom: SPACING.xl, paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xxl, backgroundColor: COLORS.deep, borderRadius: RADIUS.xl,
    flexDirection: 'row', overflow: 'hidden', position: 'relative',
  },
  heroTextArea: { flex: 1, zIndex: 2 },
  heroEyebrow: { fontFamily: FONTS.sans.medium, fontSize: 10, letterSpacing: 3, color: COLORS.sage, marginBottom: SPACING.md },
  heroTitle: { fontFamily: FONTS.serif.bold, fontSize: 26, color: COLORS.cream, lineHeight: 36, marginBottom: SPACING.sm },
  heroDesc: { fontFamily: FONTS.sans.regular, fontSize: 12, color: 'rgba(229,234,227,0.5)', lineHeight: 19 },
  heroDecor: { position: 'absolute', right: -20, top: -20 },
  heroCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(180,198,171,0.12)' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.page, marginBottom: SPACING.xxl,
    paddingVertical: 13, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.white,
    borderRadius: RADIUS.button, borderWidth: 1, borderColor: COLORS.gray200, gap: SPACING.sm,
  },
  searchText: { fontFamily: FONTS.sans.regular, fontSize: 14, color: COLORS.gray400 },
  catScroll: { paddingHorizontal: SPACING.page, paddingBottom: SPACING.section, gap: SPACING.md },
  catChip: { alignItems: 'center', width: 72 },
  catIconCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.mist,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  catName: { fontFamily: FONTS.sans.medium, fontSize: 12, color: COLORS.deep },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.page, marginBottom: SPACING.lg,
  },
  sectionTitle: { fontFamily: FONTS.serif.regular, fontSize: 20, color: COLORS.deep, letterSpacing: -0.3 },
  sectionSub: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  hScroll: { paddingHorizontal: SPACING.page, paddingBottom: SPACING.section, gap: SPACING.md },
  cardH: {
    width: 150, backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.gray200,
  },
  cardHImg: { width: 150, height: 150, backgroundColor: COLORS.mist, position: 'relative' },
  cardHInfo: { padding: SPACING.md },
  gridWrap: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.page,
    gap: SPACING.md, marginBottom: SPACING.section,
  },
  cardV: {
    width: CARD_W, backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.gray200,
  },
  cardVImg: { width: '100%', height: CARD_W * 1.1, backgroundColor: COLORS.mist, position: 'relative' },
  cardVInfo: { padding: SPACING.md },
  cardName: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.deep, lineHeight: 19, marginBottom: SPACING.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  discount: { fontFamily: FONTS.sans.bold, fontSize: 15, color: COLORS.warm },
  price: { fontFamily: FONTS.sans.bold, fontSize: 15, color: COLORS.deep },
  badge: { position: 'absolute', top: 10, left: 10, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  badgeNew: { backgroundColor: COLORS.deep },
  badgeBest: { backgroundColor: COLORS.warm },
  badgeText: { fontFamily: FONTS.sans.semibold, fontSize: 9, color: COLORS.white, letterSpacing: 0.5 },
  rankBadge: {
    position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: 6,
    backgroundColor: COLORS.deep, alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontFamily: FONTS.sans.bold, fontSize: 11, color: COLORS.cream },
  learnBanner: {
    marginHorizontal: SPACING.page, marginBottom: SPACING.section,
    padding: SPACING.xxl, backgroundColor: COLORS.sage, borderRadius: RADIUS.xl,
  },
  learnEyebrow: { fontFamily: FONTS.sans.medium, fontSize: 10, letterSpacing: 2, color: COLORS.deep, opacity: 0.6, marginBottom: SPACING.sm },
  learnTitle: { fontFamily: FONTS.serif.bold, fontSize: 22, color: COLORS.deep, lineHeight: 30, marginBottom: SPACING.sm },
  learnDesc: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.forest, marginBottom: SPACING.lg },
  learnBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: COLORS.forest, paddingVertical: 10, paddingHorizontal: 18, borderRadius: RADIUS.button, gap: 6,
  },
  learnBtnText: { fontFamily: FONTS.sans.semibold, fontSize: 13, color: COLORS.cream },
  partnerBanner: {
    marginHorizontal: SPACING.page, marginBottom: SPACING.section, padding: SPACING.xxl,
    backgroundColor: COLORS.deep, borderRadius: RADIUS.xl, flexDirection: 'row', justifyContent: 'space-between',
  },
  partnerLeft: { flex: 1 },
  partnerEyebrow: { fontFamily: FONTS.sans.medium, fontSize: 10, letterSpacing: 2, color: COLORS.sage, marginBottom: SPACING.sm },
  partnerTitle: { fontFamily: FONTS.serif.bold, fontSize: 20, color: COLORS.cream, lineHeight: 28, marginBottom: SPACING.sm },
  partnerDesc: { fontFamily: FONTS.sans.regular, fontSize: 12, color: 'rgba(229,234,227,0.5)' },
  partnerGrades: { justifyContent: 'center', gap: 6 },
  gradeChip: { backgroundColor: 'rgba(180,198,171,0.2)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  gradeText: { fontFamily: FONTS.sans.semibold, fontSize: 9, color: COLORS.sage, letterSpacing: 1 },
  closing: { alignItems: 'center', paddingVertical: SPACING.section, paddingHorizontal: SPACING.page },
  closingLine: { width: 40, height: 1, backgroundColor: COLORS.gray300, marginBottom: SPACING.xl },
  closingQuote: { fontFamily: FONTS.serif.regular, fontSize: 18, color: COLORS.deep, letterSpacing: -0.3, marginBottom: SPACING.sm },
  closingDesc: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.gray500, marginBottom: SPACING.xs },
  closingEst: { fontFamily: FONTS.sans.light, fontSize: 11, color: COLORS.gray400, letterSpacing: 1 },
});
