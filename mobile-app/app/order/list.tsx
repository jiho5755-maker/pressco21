import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';
import { API } from '../../src/constants/api';
import { apiGet } from '../../src/api/client';
import { useAuth } from '../../src/hooks/useAuth';

interface OrderItem {
  id: string;
  orderNo: string;
  date: string;
  status: string;
  totalPrice: number;
  productName: string;
  productImage: string;
  trackingNumber: string;
  trackingUrl: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '주문접수',
  confirmed: '결제확인',
  preparing: '상품준비',
  shipped: '출고완료',
  delivered: '배송완료',
  cancelled: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.gray500,
  confirmed: COLORS.forest,
  preparing: COLORS.warm,
  shipped: '#4A90D9',
  delivered: COLORS.sage,
  cancelled: '#D94A4A',
};

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}

export default function OrderListScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: OrderItem[] }>(API.orders.list);
        if (res.success && res.data) {
          setOrders(res.data);
        }
      } catch (e) {
        console.log('주문 로딩 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>로그인 후 확인 가능합니다</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.loginBtnText}>로그인</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.deep} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주문 내역</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.forest} style={{ marginTop: 60 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyText}>주문 내역이 없습니다</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderDate}>{order.date}</Text>
                <Text style={[styles.statusBadge, { color: STATUS_COLORS[order.status] || COLORS.gray500 }]}>
                  {STATUS_LABELS[order.status] || order.status}
                </Text>
              </View>
              <View style={styles.orderBody}>
                {order.productImage ? (
                  <Image source={{ uri: order.productImage }} style={styles.orderImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.orderImage, { backgroundColor: COLORS.mist }]} />
                )}
                <View style={styles.orderInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{order.productName}</Text>
                  <Text style={styles.orderPrice}>{formatPrice(order.totalPrice)}원</Text>
                  <Text style={styles.orderNo}>주문번호: {order.orderNo}</Text>
                </View>
              </View>
              {order.trackingNumber && (
                <TouchableOpacity style={styles.trackingBtn}>
                  <Ionicons name="location-outline" size={16} color={COLORS.forest} />
                  <Text style={styles.trackingText}>배송 조회</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: SPACING.page, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  headerTitle: { fontFamily: FONTS.sans.semibold, fontSize: 18, color: COLORS.deep },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.lg, backgroundColor: COLORS.cream },
  emptyText: { fontFamily: FONTS.sans.regular, fontSize: 15, color: COLORS.gray500 },
  loginBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: RADIUS.button, borderWidth: 1, borderColor: COLORS.forest },
  loginBtnText: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.forest },
  list: { flex: 1, paddingHorizontal: SPACING.page, paddingTop: SPACING.md },
  orderCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.gray200,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  orderDate: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.gray500 },
  statusBadge: { fontFamily: FONTS.sans.semibold, fontSize: 13 },
  orderBody: { flexDirection: 'row', gap: SPACING.md },
  orderImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: COLORS.mist },
  orderInfo: { flex: 1 },
  productName: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.deep, lineHeight: 20, marginBottom: 4 },
  orderPrice: { fontFamily: FONTS.sans.bold, fontSize: 15, color: COLORS.deep, marginBottom: 4 },
  orderNo: { fontFamily: FONTS.sans.regular, fontSize: 11, color: COLORS.gray400 },
  trackingBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
    marginTop: SPACING.sm, gap: 4, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.forest,
  },
  trackingText: { fontFamily: FONTS.sans.medium, fontSize: 12, color: COLORS.forest },
});
