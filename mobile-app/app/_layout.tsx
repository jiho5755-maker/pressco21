import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { COLORS, FONTS } from '../src/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [FONTS.serif.regular]: require('../assets/fonts/NanumMyeongjo.ttf'),
    [FONTS.serif.bold]: require('../assets/fonts/NanumMyeongjoBold.ttf'),
    [FONTS.sans.light]: require('../assets/fonts/Pretendard-Light.otf'),
    [FONTS.sans.regular]: require('../assets/fonts/Pretendard-Regular.otf'),
    [FONTS.sans.medium]: require('../assets/fonts/Pretendard-Medium.otf'),
    [FONTS.sans.semibold]: require('../assets/fonts/Pretendard-SemiBold.otf'),
    [FONTS.sans.bold]: require('../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.cream },
          headerTintColor: COLORS.deep,
          headerTitleStyle: { fontFamily: FONTS.sans.semibold, fontSize: 17 },
          contentStyle: { backgroundColor: COLORS.cream },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: '주문 상세' }} />
        <Stack.Screen name="order/list" options={{ headerShown: false }} />
        <Stack.Screen name="order/checkout" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="auth/login" options={{ title: '', presentation: 'modal', headerShadowVisible: false }} />
        <Stack.Screen name="auth/register" options={{ title: '', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
