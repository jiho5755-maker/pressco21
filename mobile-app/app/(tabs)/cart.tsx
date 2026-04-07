import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';
import { useCart } from '../../src/hooks/useCart';
import { useAuth } from '../../src/hooks/useAuth';

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}

export default function CartScreen() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalCount } = useCart();
  const { isLoggedIn } = useAuth();

  const handleCheckout = () => {
    if (!isLoggedIn) {
      Alert.alert('로그인 필요', '주문하려면 로그인이 필요합니다', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    if (items.length === 0) {
      Alert.alert('알림', '장바구니가 비어있습니다');
      return;
    }
    router.push('/order/checkout');
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyHeader}>
          <Text style={styles.headerTitle}>장바구니</Text>
        </View>
        <View style={styles.emptyContent}>
          <Ionicons name="bag-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyText}>장바구니가 비어있습니다</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.shopBtnText}>쇼핑하러 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>장바구니</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('장바구니 비우기', '모든 상품을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: clearCart },
          ]);
        }}>
          <Text style={styles.clearText}>전체삭제</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <View key={item.productId + (item.option || '')} style={styles.cartItem}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.itemImage}
              resizeMode="cover"
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              {item.option && <Text style={styles.itemOption}>{item.option}</Text>}
              <Text style={styles.itemPrice}>{formatPrice(item.price)}원</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.productId, item.quantity - 1, item.option)}
                >
                  <Ionicons name="remove" size={16} color={COLORS.deep} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.productId, item.quantity + 1, item.option)}
                >
                  <Ionicons name="add" size={16} color={COLORS.deep} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeItem(item.productId, item.option)}
            >
              <Ionicons name="close" size={18} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* 하단 결제 바 */}
      <View style={styles.bottomBar}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>총 {totalCount}개</Text>
          <Text style={styles.totalPrice}>{formatPrice(totalPrice)}원</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutBtnText}>주문하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  emptyContainer: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: SPACING.page, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  emptyHeader: {
    paddingTop: 60, paddingHorizontal: SPACING.page, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  headerTitle: { fontFamily: FONTS.sans.semibold, fontSize: 18, color: COLORS.deep },
  clearText: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.gray400 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.lg },
  emptyText: { fontFamily: FONTS.sans.regular, fontSize: 15, color: COLORS.gray500 },
  shopBtn: {
    paddingVertical: 10, paddingHorizontal: 24, borderRadius: RADIUS.button,
    borderWidth: 1, borderColor: COLORS.forest,
  },
  shopBtnText: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.forest },
  list: { flex: 1, paddingHorizontal: SPACING.page, paddingTop: SPACING.md },
  cartItem: {
    flexDirection: 'row', paddingVertical: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  itemImage: { width: 80, height: 80, borderRadius: RADIUS.card, backgroundColor: COLORS.mist },
  itemInfo: { flex: 1, marginLeft: SPACING.md },
  itemName: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.deep, lineHeight: 20, marginBottom: 4 },
  itemOption: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray400, marginBottom: 4 },
  itemPrice: { fontFamily: FONTS.sans.bold, fontSize: 15, color: COLORS.deep, marginBottom: SPACING.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: COLORS.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontFamily: FONTS.sans.semibold, fontSize: 14, color: COLORS.deep, minWidth: 24, textAlign: 'center' },
  removeBtn: { padding: 4, marginLeft: 8 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.page, paddingVertical: 12, paddingBottom: 36,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray200,
  },
  totalSection: {},
  totalLabel: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray500 },
  totalPrice: { fontFamily: FONTS.sans.bold, fontSize: 20, color: COLORS.deep },
  checkoutBtn: {
    paddingVertical: 14, paddingHorizontal: 40, borderRadius: RADIUS.button,
    backgroundColor: COLORS.forest,
  },
  checkoutBtnText: { fontFamily: FONTS.sans.semibold, fontSize: 16, color: COLORS.cream },
});
