import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';

export default function MyPageScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      {/* 로그인 유도 영역 (비로그인 시) */}
      <TouchableOpacity
        style={styles.loginCard}
        onPress={() => router.push('/auth/login')}
      >
        <Ionicons name="person-circle-outline" size={48} color={COLORS.sage} />
        <View style={styles.loginTextArea}>
          <Text style={styles.loginTitle}>로그인해주세요</Text>
          <Text style={styles.loginSubtitle}>주문내역, 파트너 혜택을 확인하세요</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
      </TouchableOpacity>

      {/* 메뉴 리스트 */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>쇼핑</Text>
        <MenuItem icon="receipt-outline" label="주문 내역" />
        <MenuItem icon="heart-outline" label="관심 상품" />
        <MenuItem icon="star-outline" label="리뷰 관리" />
        <MenuItem icon="gift-outline" label="쿠폰/적립금" />
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>파트너</Text>
        <MenuItem icon="ribbon-outline" label="파트너 대시보드" />
        <MenuItem icon="school-outline" label="내 클래스" />
        <MenuItem icon="stats-chart-outline" label="정산 내역" />
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>고객센터</Text>
        <MenuItem icon="chatbubble-ellipses-outline" label="AI 상담" />
        <MenuItem icon="call-outline" label="전화 문의" />
        <MenuItem icon="notifications-outline" label="알림 설정" />
        <MenuItem icon="settings-outline" label="앱 설정" />
      </View>

      <View style={{ height: SPACING.xxxl }} />
    </ScrollView>
  );
}

function MenuItem({ icon, label }: { icon: string; label: string }) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <Ionicons name={icon as any} size={22} color={COLORS.forest} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  loginTextArea: {
    flex: 1,
  },
  loginTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.deep,
  },
  loginSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },
  menuSection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  menuSectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.forest,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.gray700,
  },
});
