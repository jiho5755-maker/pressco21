import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../src/constants/theme';

// 메이크샵 회원가입 페이지를 WebView로 로드
const REGISTER_URL = 'https://foreverlove.co.kr/shop/member.html';
// 가입 완료 후 리다이렉트 감지 패턴
const COMPLETE_PATTERN = /member_ok|login\.html|index\.html/;

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationChange = (navState: { url: string }) => {
    // 가입 완료 → 로그인 페이지로 안내
    if (COMPLETE_PATTERN.test(navState.url)) {
      router.replace('/auth/login');
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.deep} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원가입</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: REGISTER_URL }}
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
          <Text style={styles.loadingText}>회원가입 페이지 로딩 중...</Text>
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
