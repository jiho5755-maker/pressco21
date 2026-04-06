import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../src/constants/theme';

export default function CategoriesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>카테고리 (Phase 1에서 구현)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream },
  text: { fontSize: FONTS.sizes.md, color: COLORS.gray500 },
});
