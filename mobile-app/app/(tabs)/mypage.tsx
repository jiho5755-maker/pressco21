import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/constants/theme';
import { useAuth } from '../../src/hooks/useAuth';

export default function MyPageScreen() {
  const router = useRouter();
  const { user, isLoggedIn, isPartner, logout } = useAuth();

  return (
    <ScrollView style={styles.container}>
      {/* 유저 프로필 또는 로그인 유도 */}
      {isLoggedIn && user ? (
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color={COLORS.forest} />
          </View>
          <View style={styles.profileTextArea}>
            <Text style={styles.profileName}>{user.name || user.id}</Text>
            {isPartner && user.partnerGrade && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{user.partnerGrade}</Text>
              </View>
            )}
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.loginCard} onPress={() => router.push('/auth/login')}>
          <Ionicons name="person-circle-outline" size={48} color={COLORS.sage} />
          <View style={styles.loginTextArea}>
            <Text style={styles.loginTitle}>로그인해주세요</Text>
            <Text style={styles.loginSubtitle}>주문내역, 파트너 혜택을 확인하세요</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
        </TouchableOpacity>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>쇼핑</Text>
        <MenuItem icon="receipt-outline" label="주문 내역" onPress={() => router.push('/order/list')} />
        <MenuItem icon="heart-outline" label="관심 상품" />
        <MenuItem icon="gift-outline" label="쿠폰/적립금" />
      </View>

      {isPartner && (
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>파트너</Text>
          <MenuItem icon="ribbon-outline" label="파트너 대시보드" />
          <MenuItem icon="school-outline" label="내 클래스" />
          <MenuItem icon="stats-chart-outline" label="정산 내역" />
        </View>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>고객센터</Text>
        <MenuItem icon="chatbubble-ellipses-outline" label="AI 상담" />
        <MenuItem icon="call-outline" label="전화 문의" />
        <MenuItem icon="notifications-outline" label="알림 설정" />
        <MenuItem icon="settings-outline" label="앱 설정" />
      </View>

      {isLoggedIn && (
        <TouchableOpacity style={styles.logoutBtn} onPress={() => {
          logout();
          router.replace('/(tabs)');
        }}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon as any} size={22} color={COLORS.forest} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream, paddingTop: 56 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', margin: SPACING.lg,
    padding: SPACING.lg, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, gap: SPACING.md,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.mist,
    alignItems: 'center', justifyContent: 'center',
  },
  profileTextArea: { flex: 1 },
  profileName: { fontFamily: FONTS.sans.semibold, fontSize: 17, color: COLORS.deep },
  gradeBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(89,112,81,0.1)',
    paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, marginTop: 4,
  },
  gradeText: { fontFamily: FONTS.sans.semibold, fontSize: 10, color: COLORS.forest, letterSpacing: 0.5 },
  profileEmail: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  loginCard: {
    flexDirection: 'row', alignItems: 'center', margin: SPACING.lg,
    padding: SPACING.lg, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, gap: SPACING.md,
  },
  loginTextArea: { flex: 1 },
  loginTitle: { fontFamily: FONTS.sans.semibold, fontSize: 16, color: COLORS.deep },
  loginSubtitle: { fontFamily: FONTS.sans.regular, fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  menuSection: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.xl,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden',
  },
  menuSectionTitle: {
    fontFamily: FONTS.sans.semibold, fontSize: 12, color: COLORS.forest,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, gap: SPACING.md,
  },
  menuLabel: { flex: 1, fontFamily: FONTS.sans.regular, fontSize: 15, color: COLORS.deep },
  logoutBtn: { alignItems: 'center', marginVertical: SPACING.xl },
  logoutText: { fontFamily: FONTS.sans.regular, fontSize: 14, color: COLORS.gray400 },
});
