import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';
import { useCart } from '../../src/hooks/useCart';

// 메이크샵 결제 페이지를 WebView로 로드
// 결제 완료 시 사방넷이 평소처럼 주문 수집 — 기존 프로세스 유지
const CHECKOUT_URL = 'https://foreverlove.co.kr/shop/order.html';
const COMPLETE_PATTERN = /order_result|order_complete|order_ok/;

export default function CheckoutScreen() {
  const router = useRouter();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('주문/결제');
  const webViewRef = useRef<WebView>(null);

  const handleNavigationChange = (navState: { url: string; title: string }) => {
    setTitle(navState.title || '주문/결제');

    // 결제 완료 페이지 감지
    if (COMPLETE_PATTERN.test(navState.url)) {
      clearCart();
      Alert.alert('주문 완료', '주문이 정상적으로 접수되었습니다!', [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert('결제 취소', '결제를 취소하시겠습니까?', [
            { text: '계속 결제', style: 'cancel' },
            { text: '취소', style: 'destructive', onPress: () => router.back() },
          ]);
        }}>
          <Ionicons name="close" size={24} color={COLORS.deep} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: CHECKOUT_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        startInLoadingState={true}
        allowsBackForwardNavigationGestures={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.forest} />
          <Text style={styles.loadingText}>결제 페이지 로딩 중...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: SPACING.page, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  headerTitle: { fontFamily: FONTS.sans.semibold, fontSize: 16, color: COLORS.deep },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,249,240,0.9)',
    justifyContent: 'center', alignItems: 'center', top: 90,
  },
  loadingText: { fontFamily: FONTS.sans.regular, fontSize: 14, color: COLORS.gray500, marginTop: 12 },
});
