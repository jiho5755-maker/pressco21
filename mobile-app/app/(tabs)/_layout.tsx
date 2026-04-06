import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../../src/constants/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.tabIconWrap}>
      {focused && <View style={styles.tabDot} />}
      <Ionicons
        name={name as any}
        size={22}
        color={focused ? COLORS.forest : COLORS.gray400}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.forest,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarLabelStyle: {
          fontFamily: FONTS.sans.medium,
          fontSize: 10,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.gray200,
          height: 84,
          paddingBottom: 28,
          paddingTop: 6,
          ...SHADOWS.subtle,
        },
        headerStyle: { backgroundColor: COLORS.cream },
        headerTintColor: COLORS.deep,
        headerTitleStyle: { fontFamily: FONTS.sans.semibold, fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerTitle: '',
          headerShown: false,
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: '',
          tabBarLabel: '',
          headerTitle: 'Shop',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: '',
          tabBarLabel: '',
          headerTitle: 'Cart',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'bag' : 'bag-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '',
          tabBarLabel: '',
          headerTitle: 'My',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    paddingTop: 4,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.forest,
    marginBottom: 4,
  },
});
