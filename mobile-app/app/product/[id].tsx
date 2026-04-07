import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';
import { API } from '../../src/constants/api';
import { apiGet } from '../../src/api/client';
import { useCart } from '../../src/hooks/useCart';

const { width: SCREEN_W } = Dimensions.get('window');

interface ProductDetail {
  id: string;
  name: string;
  price: number;
  salePrice: number;
  discount: number;
  imageUrl: string;
  images: string[];
  description: string;
  category: string;
  brand: string;
  isSoldOut: boolean;
  options: { name: string; values: string[] }[];
  quantity: number;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [imageIdx, setImageIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: ProductDetail }>(
          API.products.detail + '?id=' + id
        );
        if (res.success && res.data) {
          setProduct(res.data);
        }
      } catch (e) {
        console.log('상품 상세 로딩 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: product.salePrice,
      quantity: qty,
    });
    Alert.alert('장바구니', product.name + ' 장바구니에 담았습니다', [
      { text: '계속 쇼핑', style: 'cancel' },
      { text: '장바구니 보기', onPress: () => router.push('/(tabs)/cart') },
    ]);
  };

  const handleBuyNow = () => {
    if (!product) return;
    handleAddToCart();
    router.push('/(tabs)/cart');
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.forest} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.errorText}>상품을 찾을 수 없습니다</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.deep} />
        </TouchableOpacity>

        {/* 상품 이미지 */}
        <View style={styles.imageWrap}>
          {product.images.length > 0 ? (
            <Image source={{ uri: product.images[imageIdx] }} style={styles.mainImage} resizeMode="contain" />
          ) : (
            <View style={styles.noImage}><Text style={styles.noImageText}>이미지 없음</Text></View>
          )}
          {product.images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {product.images.map((img, i) => (
                <TouchableOpacity key={i} onPress={() => setImageIdx(i)}>
                  <Image
                    source={{ uri: img }}
                    style={[styles.thumb, i === imageIdx && styles.thumbActive]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 상품 정보 */}
        <View style={styles.infoSection}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceSection}>
            {product.discount > 0 && (
              <>
                <Text style={styles.originalPrice}>{formatPrice(product.price)}원</Text>
                <Text style={styles.discountBadge}>{product.discount}%</Text>
              </>
            )}
            <Text style={styles.salePrice}>{formatPrice(product.salePrice)}원</Text>
          </View>

          {product.isSoldOut && (
            <View style={styles.soldOutBadge}><Text style={styles.soldOutText}>품절</Text></View>
          )}
        </View>

        {/* 수량 */}
        {!product.isSoldOut && (
          <View style={styles.qtySection}>
            <Text style={styles.qtyLabel}>수량</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => qty > 1 && setQty(qty - 1)}>
                <Ionicons name="remove" size={18} color={COLORS.deep} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(qty + 1)}>
                <Ionicons name="add" size={18} color={COLORS.deep} />
              </TouchableOpacity>
            </View>
            <Text style={styles.totalPrice}>{formatPrice(product.salePrice * qty)}원</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 하단 고정 버튼 */}
      {!product.isSoldOut && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart}>
            <Ionicons name="bag-outline" size={22} color={COLORS.forest} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow}>
            <Text style={styles.buyBtnText}>바로 구매</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream },
  errorText: { fontFamily: FONTS.sans.regular, fontSize: 16, color: COLORS.gray500, marginBottom: 12 },
  backLink: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.forest },
  backBtn: { position: 'absolute', top: 56, left: SPACING.page, zIndex: 10, padding: 8 },
  imageWrap: { width: SCREEN_W, height: SCREEN_W, backgroundColor: COLORS.white },
  mainImage: { width: '100%', height: '100%' },
  noImage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.mist },
  noImageText: { fontFamily: FONTS.sans.regular, color: COLORS.gray400 },
  thumbRow: { position: 'absolute', bottom: 12, left: 0, right: 0, paddingHorizontal: SPACING.page },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: COLORS.gray200 },
  thumbActive: { borderColor: COLORS.forest, borderWidth: 2 },
  infoSection: { padding: SPACING.page, paddingTop: SPACING.xl },
  category: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray400, marginBottom: 4 },
  productName: { fontFamily: FONTS.sans.semibold, fontSize: 18, color: COLORS.deep, lineHeight: 26, marginBottom: SPACING.md },
  priceSection: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  originalPrice: { fontFamily: FONTS.sans.regular, fontSize: 14, color: COLORS.gray400, textDecorationLine: 'line-through' },
  discountBadge: { fontFamily: FONTS.sans.bold, fontSize: 18, color: COLORS.warm },
  salePrice: { fontFamily: FONTS.sans.bold, fontSize: 22, color: COLORS.deep },
  soldOutBadge: { marginTop: SPACING.md, alignSelf: 'flex-start', backgroundColor: COLORS.gray200, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  soldOutText: { fontFamily: FONTS.sans.semibold, fontSize: 13, color: COLORS.gray500 },
  qtySection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.page, paddingVertical: SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.gray200, marginTop: SPACING.md,
  },
  qtyLabel: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.deep },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: COLORS.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontFamily: FONTS.sans.semibold, fontSize: 16, color: COLORS.deep, minWidth: 30, textAlign: 'center' },
  totalPrice: { fontFamily: FONTS.sans.bold, fontSize: 16, color: COLORS.deep },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: SPACING.page, paddingVertical: 12, paddingBottom: 36,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray200, gap: SPACING.md,
  },
  cartBtn: {
    width: 52, height: 52, borderRadius: RADIUS.button, borderWidth: 1, borderColor: COLORS.forest,
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtn: {
    flex: 1, height: 52, borderRadius: RADIUS.button, backgroundColor: COLORS.forest,
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtnText: { fontFamily: FONTS.sans.semibold, fontSize: 16, color: COLORS.cream },
});
