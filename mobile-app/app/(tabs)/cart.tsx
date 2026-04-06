import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function CartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>장바구니 (Phase 1에서 구현)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream },
  text: { fontSize: FONTS.sizes.md, color: COLORS.gray500 },
});
