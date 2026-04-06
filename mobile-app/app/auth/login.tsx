import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS, TYPOGRAPHY } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* 브랜드 영역 */}
        <View style={styles.brand}>
          <Text style={styles.brandName}>PRESSCO 21</Text>
          <View style={styles.divider} />
          <Text style={styles.brandTagline}>꽃으로 노는 모든 방법</Text>
        </View>

        {/* 폼 */}
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>아이디</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={COLORS.gray300}
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.gray300}
            />
          </View>

          <TouchableOpacity style={styles.loginBtn} activeOpacity={0.85}>
            <Text style={styles.loginBtnText}>로그인</Text>
          </TouchableOpacity>

          <View style={styles.links}>
            <TouchableOpacity><Text style={styles.linkText}>아이디 찾기</Text></TouchableOpacity>
            <View style={styles.linkDot} />
            <TouchableOpacity><Text style={styles.linkText}>비밀번호 찾기</Text></TouchableOpacity>
            <View style={styles.linkDot} />
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.linkText}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 하단 브랜드 메시지 */}
        <Text style={styles.footer}>Preserving Your Moments</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.page + SPACING.lg,
  },
  brand: {
    alignItems: 'center',
    marginBottom: SPACING.section,
  },
  brandName: {
    fontFamily: FONTS.serif.regular,
    fontSize: 28,
    color: COLORS.deep,
    letterSpacing: 2,
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: COLORS.gray300,
    marginVertical: SPACING.lg,
  },
  brandTagline: {
    fontFamily: FONTS.sans.regular,
    fontSize: 14,
    color: COLORS.gray500,
  },
  form: { gap: SPACING.lg },
  inputWrap: { gap: SPACING.xs },
  inputLabel: {
    fontFamily: FONTS.sans.medium,
    fontSize: 12,
    color: COLORS.gray500,
    letterSpacing: 0.3,
  },
  input: {
    fontFamily: FONTS.sans.regular,
    fontSize: 15,
    color: COLORS.deep,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    paddingVertical: SPACING.md,
  },
  loginBtn: {
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.button,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  loginBtnText: {
    fontFamily: FONTS.sans.semibold,
    fontSize: 15,
    color: COLORS.cream,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  linkText: {
    fontFamily: FONTS.sans.regular,
    fontSize: 12,
    color: COLORS.gray400,
  },
  linkDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gray300,
  },
  footer: {
    fontFamily: FONTS.serif.regular,
    fontSize: 13,
    color: COLORS.gray300,
    textAlign: 'center',
    marginTop: SPACING.section + SPACING.xl,
    letterSpacing: 0.5,
  },
});
