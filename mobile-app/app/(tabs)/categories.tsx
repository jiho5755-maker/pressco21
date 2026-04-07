import {
  View, Text, TextInput, ScrollView, FlatList, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator, Dimensions, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  { id: '', name: '전체', icon: 'grid-outline' as const },
  { id: '019', name: '압화', icon: 'flower-outline' as const },
  { id: '056', name: '드라이플라워', icon: 'leaf-outline' as const },
  { id: '024', name: '레진', icon: 'diamond-outline' as const },
  { id: '028', name: '하바리움', icon: 'flask-outline' as const },
  { id: '031', name: '캔들/비누', icon: 'flame-outline' as const },
  { id: '043', name: '도구', icon: 'construct-outline' as const },
  { id: '048', name: '포장재', icon: 'gift-outline' as const },
];

const SORT_OPTIONS = [
  { key: 'regdt', label: '최신순' },
  { key: 'lowprice', label: '낮은가격' },
  { key: 'highprice', label: '높은가격' },
  { key: 'sellcnt', label: '판매순' },
];

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(params.category || '');
  const [sort, setSort] = useState('regdt');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (p: number, reset: boolean) => {
    try {
      let url = API.products.list + '?limit=20&page=' + p + '&sort=' + sort;
      if (query.trim()) {
        url = url + '&search=' + encodeURIComponent(query.trim());
      }
      if (activeCategory) {
        url = url + '&category=' + activeCategory;
      }
      const res = await apiGet<ProductsResponse>(url);
      if (res.success && res.data) {
        setProducts(prev => reset ? res.data : [...prev, ...res.data]);
        setTotal(res.total || 0);
        setHasMore(res.data.length >= 20);
      } else {
        if (reset) setProducts([]);
        setHasMore(false);
      }
    } catch (e) {
      console.log('상품 검색 실패:', e);
      if (reset) setProducts([]);
    }
  }, [query, activeCategory, sort]);

  // 초기 로드 + 필터 변경 시
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchProducts(1, true).finally(() => setLoading(false));
  }, [activeCategory, sort]);

  // 검색 디바운스
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setPage(1);
      fetchProducts(1, true).finally(() => setLoading(false));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, false);
  }, [page, hasMore, loading, fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchProducts(1, true);
    setRefreshing(false);
  }, [fetchProducts]);

  const renderProduct = useCallback(({ item: p }: { item: ProductItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push('/product/' + p.id)}
    >
      <View style={styles.cardImg}>
        {p.imageUrl ? (
          <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        {p.isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
        {!p.isSoldOut && p.isNew && (
          <View style={[styles.badge, styles.badgeNew]}><Text style={styles.badgeText}>NEW</Text></View>
        )}
        {!p.isSoldOut && p.isBest && !p.isNew && (
          <View style={[styles.badge, styles.badgeBest]}><Text style={styles.badgeText}>BEST</Text></View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
        <View style={styles.priceRow}>
          {p.discount > 0 && <Text style={styles.discount}>{p.discount}%</Text>}
          <Text style={styles.price}>{formatPrice(p.salePrice)}원</Text>
        </View>
        {p.discount > 0 && (
          <Text style={styles.originalPrice}>{formatPrice(p.price)}원</Text>
        )}
      </View>
    </TouchableOpacity>
  ), [router]);

  return (
    <View style={styles.container}>
      {/* 헤더 + 검색 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop</Text>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="상품명으로 검색"
            placeholderTextColor={COLORS.gray400}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 카테고리 칩 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, isActive && styles.catChipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={isActive ? COLORS.white : COLORS.forest}
              />
              <Text style={[styles.catText, isActive && styles.catTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 정렬 + 결과 수 */}
      <View style={styles.sortBar}>
        <Text style={styles.resultCount}>
          {total > 0 ? total + '개 상품' : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortChip, sort === opt.key && styles.sortChipActive]}
              onPress={() => setSort(opt.key)}
            >
              <Text style={[styles.sortText, sort === opt.key && styles.sortTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 상품 그리드 */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.forest} style={{ marginTop: 60 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyText}>
            {query ? '\'' + query + '\' 검색 결과가 없습니다' : '상품이 없습니다'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListFooterComponent={
            hasMore && products.length > 0 ? (
              <ActivityIndicator size="small" color={COLORS.forest} style={{ paddingVertical: 20 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    paddingTop: 56, paddingHorizontal: SPACING.page, paddingBottom: SPACING.md,
    backgroundColor: COLORS.cream,
  },
  headerTitle: {
    fontFamily: FONTS.serif.regular, fontSize: 24, color: COLORS.deep,
    letterSpacing: -0.3, marginBottom: SPACING.md,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: RADIUS.button, borderWidth: 1, borderColor: COLORS.gray200,
    paddingHorizontal: SPACING.md, height: 44, gap: SPACING.sm,
  },
  searchInput: {
    flex: 1, fontFamily: FONTS.sans.regular, fontSize: 14, color: COLORS.deep,
    paddingVertical: 0,
  },
  catScroll: {
    paddingHorizontal: SPACING.page, paddingBottom: SPACING.md, gap: SPACING.sm,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  catChipActive: {
    backgroundColor: COLORS.forest, borderColor: COLORS.forest,
  },
  catText: { fontFamily: FONTS.sans.medium, fontSize: 13, color: COLORS.forest },
  catTextActive: { color: COLORS.white },
  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.page, paddingBottom: SPACING.sm,
  },
  resultCount: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray500 },
  sortChip: { paddingVertical: 4, paddingHorizontal: 10, marginLeft: 4 },
  sortChipActive: {
    backgroundColor: COLORS.mist, borderRadius: 4,
  },
  sortText: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray400 },
  sortTextActive: { fontFamily: FONTS.sans.semibold, color: COLORS.forest },
  gridRow: { paddingHorizontal: SPACING.page, gap: SPACING.md },
  gridContent: { paddingTop: SPACING.sm, paddingBottom: 100 },
  card: {
    width: CARD_W, backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.gray200, marginBottom: SPACING.md,
  },
  cardImg: { width: '100%', height: CARD_W * 1.1, backgroundColor: COLORS.mist, position: 'relative' },
  cardInfo: { padding: SPACING.md },
  cardName: {
    fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.deep,
    lineHeight: 19, marginBottom: SPACING.sm,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  discount: { fontFamily: FONTS.sans.bold, fontSize: 15, color: COLORS.warm },
  price: { fontFamily: FONTS.sans.bold, fontSize: 15, color: COLORS.deep },
  originalPrice: {
    fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray400,
    textDecorationLine: 'line-through', marginTop: 2,
  },
  badge: { position: 'absolute', top: 8, left: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  badgeNew: { backgroundColor: COLORS.deep },
  badgeBest: { backgroundColor: COLORS.warm },
  badgeText: { fontFamily: FONTS.sans.semibold, fontSize: 9, color: COLORS.white, letterSpacing: 0.5 },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  soldOutText: { fontFamily: FONTS.sans.bold, fontSize: 12, color: COLORS.white, letterSpacing: 1 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.lg, paddingTop: 80 },
  emptyText: { fontFamily: FONTS.sans.regular, fontSize: 15, color: COLORS.gray500, textAlign: 'center' },
});
