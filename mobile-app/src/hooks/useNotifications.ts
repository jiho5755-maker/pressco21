// 푸시 알림 인프라
// Expo Push Token → n8n에 등록 → Firebase FCM으로 발송
// Firebase 프로젝트 설정 후 app.json에 projectId 추가 필요

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiPost } from '../api/client';

const N8N_BASE = 'https://n8n.pressco21.com/webhook';
const REGISTER_TOKEN_URL = N8N_BASE + '/app/push/register';

// 앱 포그라운드에서 알림 수신 시 표시 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationState {
  expoPushToken: string | null;
  permission: boolean;
  lastNotification: Notifications.Notification | null;
}

export function useNotifications(userId?: string) {
  const [state, setState] = useState<NotificationState>({
    expoPushToken: null,
    permission: false,
    lastNotification: null,
  });

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // 푸시 토큰 등록
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      // 시뮬레이터에서는 푸시 불가
      console.log('푸시 알림: 실제 기기에서만 동작합니다');
      return null;
    }

    // 권한 확인
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('푸시 알림 권한 거부됨');
      setState(prev => ({ ...prev, permission: false }));
      return null;
    }

    setState(prev => ({ ...prev, permission: true }));

    // Expo Push Token 발급
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '', // EAS projectId — 앱스토어 배포 시 설정
      });
      const token = tokenData.data;
      setState(prev => ({ ...prev, expoPushToken: token }));

      // 서버에 토큰 등록 (유저 로그인 상태일 때)
      if (userId) {
        try {
          await apiPost(REGISTER_TOKEN_URL, {
            userId: userId,
            pushToken: token,
            platform: Platform.OS,
          });
        } catch (e) {
          console.log('푸시 토큰 서버 등록 실패:', e);
        }
      }

      return token;
    } catch (e) {
      console.log('푸시 토큰 발급 실패:', e);
      return null;
    }
  }, [userId]);

  // Android 채널 설정
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#597051',
      });

      Notifications.setNotificationChannelAsync('order', {
        name: '주문/배송',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });

      Notifications.setNotificationChannelAsync('promotion', {
        name: '프로모션',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  }, []);

  // 알림 리스너 등록
  useEffect(() => {
    // 알림 수신 리스너
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setState(prev => ({ ...prev, lastNotification: notification }));
      }
    );

    // 알림 탭 리스너 (딥링크 처리)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        // 딥링크 데이터가 있으면 해당 화면으로 이동
        // 예: { screen: 'product', id: '123' }
        // 실제 네비게이션은 _layout.tsx에서 처리
        console.log('알림 탭:', data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    ...state,
    registerForPushNotifications,
  };
}
