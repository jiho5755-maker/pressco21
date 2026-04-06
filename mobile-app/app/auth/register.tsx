import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>회원가입 (메이크샵 웹 연동 예정)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream },
  text: { fontSize: FONTS.sizes.md, color: COLORS.gray500 },
});
