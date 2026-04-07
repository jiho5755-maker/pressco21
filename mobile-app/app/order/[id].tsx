import {
  View, Text, ScrollView, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';
import { API } from '../../src/constants/api';
import { apiGet } from '../../src/api/client';

interface OrderDetail {
  id: string;
  orderNo: string;
  date: string;
  status: string;
  totalPrice: number;
  shippingFee: number;
  paymentMethod: string;
  productName: string;
  productImage: string;
  productPrice: number;
  quantity: number;
  trackingNumber: string;
  trackingUrl: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  memo: string;
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

// 주문 진행 단계 (cancelled 제외)
const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: OrderDetail }>(
          API.orders.list + '?orderId=' + id
        );
        if (res.success && res.data) {
          setOrder(res.data);
        }
      } catch (e) {
        console.log('주문 상세 로딩 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.forest} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingWrap}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray300} />
        <Text style={styles.errorText}>주문 정보를 불러올 수 없습니다</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 주문 상태 헤더 */}
        <View style={styles.statusHeader}>
          <Text style={[styles.statusLabel, { color: STATUS_COLORS[order.status] || COLORS.gray500 }]}>
            {STATUS_LABELS[order.status] || order.status}
          </Text>
          <Text style={styles.orderDate}>{order.date}</Text>
          <Text style={styles.orderNo}>주문번호 {order.orderNo}</Text>
        </View>

        {/* 진행 단계 바 (취소가 아닐 때만) */}
        {!isCancelled && (
          <View style={styles.stepsWrap}>
            {STATUS_STEPS.map((step, i) => {
              const isDone = i <= currentStep;
              const isLast = i === STATUS_STEPS.length - 1;
              return (
                <View key={step} style={styles.stepItem}>
                  <View style={styles.stepDotRow}>
                    <View style={[styles.stepDot, isDone && styles.stepDotActive]} />
                    {!isLast && (
                      <View style={[styles.stepLine, isDone && i < currentStep && styles.stepLineActive]} />
                    )}
                  </View>
                  <Text style={[styles.stepText, isDone && styles.stepTextActive]}>
                    {STATUS_LABELS[step]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 상품 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주문 상품</Text>
          <View style={styles.productRow}>
            {order.productImage ? (
              <Image source={{ uri: order.productImage }} style={styles.productImg} resizeMode="cover" />
            ) : (
              <View style={[styles.productImg, { backgroundColor: COLORS.mist }]} />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{order.productName}</Text>
              <Text style={styles.productQty}>{order.quantity}개</Text>
              <Text style={styles.productPrice}>{formatPrice(order.productPrice)}원</Text>
            </View>
          </View>
        </View>

        {/* 배송 조회 */}
        {order.trackingNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>배송 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>운송장 번호</Text>
              <Text style={styles.infoValue}>{order.trackingNumber}</Text>
            </View>
            <TouchableOpacity
              style={styles.trackingBtn}
              onPress={() => {
                if (order.trackingUrl) {
                  Linking.openURL(order.trackingUrl);
                }
              }}
            >
              <Ionicons name="location-outline" size={18} color={COLORS.white} />
              <Text style={styles.trackingBtnText}>배송 조회</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 배송지 정보 */}
        {order.recipientName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>배송지</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>받는 분</Text>
              <Text style={styles.infoValue}>{order.recipientName}</Text>
            </View>
            {order.recipientPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>연락처</Text>
                <Text style={styles.infoValue}>{order.recipientPhone}</Text>
              </View>
            )}
            {order.recipientAddress && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>주소</Text>
                <Text style={[styles.infoValue, { flex: 1 }]}>{order.recipientAddress}</Text>
              </View>
            )}
            {order.memo && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>메모</Text>
                <Text style={[styles.infoValue, { flex: 1 }]}>{order.memo}</Text>
              </View>
            )}
          </View>
        )}

        {/* 결제 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>상품 금액</Text>
            <Text style={styles.infoValue}>{formatPrice(order.productPrice * order.quantity)}원</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>배송비</Text>
            <Text style={styles.infoValue}>{order.shippingFee > 0 ? formatPrice(order.shippingFee) + '원' : '무료'}</Text>
          </View>
          {order.paymentMethod && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>결제 수단</Text>
              <Text style={styles.infoValue}>{order.paymentMethod}</Text>
            </View>
          )}
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>총 결제금액</Text>
            <Text style={styles.totalValue}>{formatPrice(order.totalPrice)}원</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream, gap: SPACING.md },
  errorText: { fontFamily: FONTS.sans.regular, fontSize: 15, color: COLORS.gray500 },
  backLink: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.forest },

  statusHeader: {
    paddingTop: SPACING.xl, paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.page,
    backgroundColor: COLORS.white, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  statusLabel: { fontFamily: FONTS.sans.bold, fontSize: 22, marginBottom: SPACING.sm },
  orderDate: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.gray500 },
  orderNo: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray400, marginTop: 2 },

  stepsWrap: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.page, paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white, marginBottom: SPACING.sm,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDotRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.gray300, zIndex: 1,
  },
  stepDotActive: { backgroundColor: COLORS.forest },
  stepLine: {
    position: 'absolute', left: '50%', right: 0, top: 4,
    height: 2, backgroundColor: COLORS.gray200,
  },
  stepLineActive: { backgroundColor: COLORS.forest },
  stepText: { fontFamily: FONTS.sans.regular, fontSize: 10, color: COLORS.gray400, marginTop: 6 },
  stepTextActive: { fontFamily: FONTS.sans.semibold, color: COLORS.forest },

  section: {
    backgroundColor: COLORS.white, marginTop: SPACING.sm,
    paddingHorizontal: SPACING.page, paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.sans.semibold, fontSize: 15, color: COLORS.deep, marginBottom: SPACING.md,
  },

  productRow: { flexDirection: 'row', gap: SPACING.md },
  productImg: { width: 72, height: 72, borderRadius: 8, backgroundColor: COLORS.mist },
  productInfo: { flex: 1 },
  productName: { fontFamily: FONTS.sans.medium, fontSize: 14, color: COLORS.deep, lineHeight: 20, marginBottom: 4 },
  productQty: { fontFamily: FONTS.sans.regular, fontSize: 12, color: COLORS.gray500, marginBottom: 4 },
  productPrice: { fontFamily: FONTS.sans.bold, fontSize: 15, color: COLORS.deep },

  trackingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.forest, borderRadius: RADIUS.button,
  },
  trackingBtnText: { fontFamily: FONTS.sans.semibold, fontSize: 14, color: COLORS.white },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoLabel: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.gray500, minWidth: 80 },
  infoValue: { fontFamily: FONTS.sans.medium, fontSize: 13, color: COLORS.deep, textAlign: 'right' },
  totalRow: {
    borderTopWidth: 1, borderTopColor: COLORS.gray200,
    marginTop: SPACING.sm, paddingTop: SPACING.md,
  },
  totalLabel: { fontFamily: FONTS.sans.semibold, fontSize: 15, color: COLORS.deep },
  totalValue: { fontFamily: FONTS.sans.bold, fontSize: 18, color: COLORS.deep },
});
